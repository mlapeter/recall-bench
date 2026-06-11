/**
 * Engram + interference Adapter — validity-battery ablation, not a contender.
 *
 * Identical to the published engram adapter except that after storing each
 * session's extracted memories it calls engram's own `applyInterference`,
 * replicating what engram's live on-stop hook does. The published adapter
 * never invokes interference (extraction + store.add only), so the published
 * engram scores never exercised that mechanism; this adapter exists to test
 * whether the interference/correction dimensions respond when it IS active.
 *
 * Engram source and the published adapter are untouched.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MemoryAdapter, Message, QueryOptions, SessionMeta } from '../types/index.js';

function loadDotEnv(dir: string): void {
  try {
    const raw = readFileSync(join(dir, '.env'), 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // No .env file — that's fine
  }
}

interface EngramMemory {
  id: string;
  content: string;
  scope: 'global' | 'project';
  memory_type: 'episodic' | 'semantic';
  salience: { novelty: number; relevance: number; emotional: number; predictive: number };
  tags: string[];
  access_count: number;
  last_accessed: string | null;
  created_at: string;
  consolidated: boolean;
  generalized: boolean;
  source_session: string;
  updated_from: string | null;
}

type NewEngramMemory = Omit<
  EngramMemory,
  'id' | 'access_count' | 'last_accessed' | 'created_at' | 'consolidated' | 'generalized' | 'updated_from'
> & {
  updates: string | null;
};

interface EngramStoreApi {
  loadAll(): Promise<EngramMemory[]>;
  add(memories: EngramMemory[]): Promise<void>;
  search(query: string, limit?: number): Promise<EngramMemory[]>;
  save(scope: 'global' | 'project', memories: EngramMemory[]): Promise<void>;
}

export interface EngramInterferenceAdapterOptions {
  engramPath?: string;
  tempDataDir?: string;
}

export class EngramInterferenceAdapter implements MemoryAdapter {
  readonly name = 'engram-interference';
  private _store!: EngramStoreApi;
  private _extractMemories!: (
    input: string,
    existing: EngramMemory[],
    mode: 'summary' | 'transcript',
    weightsHint?: string | null,
  ) => Promise<NewEngramMemory[]>;
  private _applyInterference!: (
    newMemories: EngramMemory[],
    existingMemories: EngramMemory[],
    store: EngramStoreApi,
  ) => Promise<number>;
  private _generateId!: () => string;
  private ready: Promise<void>;
  private tempDir: string;

  constructor(private options: EngramInterferenceAdapterOptions = {}) {
    this.tempDir = options.tempDataDir ?? '/tmp/recall-bench-engram-interference';
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const engramPath = this.options.engramPath ?? `${process.env.HOME}/claude-engram`;

    loadDotEnv(engramPath);
    process.env.ENGRAM_DATA_DIR = this.tempDir;

    try {
      const storeMod = await import(`${engramPath}/src/core/store.js`);
      const salienceMod = await import(`${engramPath}/src/core/salience.js`);
      const typesMod = await import(`${engramPath}/src/core/types.js`);
      const interferenceMod = await import(`${engramPath}/src/core/interference.js`);

      this._store = storeMod.createStore(this.tempDir) as EngramStoreApi;
      this._extractMemories = salienceMod.extractMemories;
      this._generateId = typesMod.generateId;
      this._applyInterference = interferenceMod.applyInterference;
    } catch (err) {
      throw new Error(
        `Failed to load engram from ${engramPath}. ` +
          `Make sure engram is built (bun run build). Error: ${err}`,
      );
    }
  }

  private async ensureReady(): Promise<void> {
    await this.ready;
  }

  async processConversation(messages: Message[], meta: SessionMeta): Promise<void> {
    await this.ensureReady();

    const transcript = messages
      .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const existing = await this._store.loadAll();
    const extracted = await this._extractMemories(transcript, existing, 'transcript');

    if (extracted.length === 0) return;

    const now = meta.timestamp;
    const memories: EngramMemory[] = extracted.map(m => ({
      id: this._generateId(),
      content: m.content,
      scope: m.scope,
      memory_type: m.memory_type,
      salience: m.salience,
      tags: m.tags,
      access_count: 0,
      last_accessed: null,
      created_at: now,
      consolidated: false,
      generalized: false,
      source_session: 'recall-bench',
      updated_from: m.updates,
    }));

    await this._store.add(memories);
    // The one difference from the published adapter: run interference the way
    // engram's live on-stop hook does, so superseding memories dampen the
    // traces they update.
    await this._applyInterference(memories, existing, this._store);
  }

  async query(question: string, options: QueryOptions): Promise<string[]> {
    await this.ensureReady();
    const results = await this._store.search(question, options.limit);
    return results.map(m => m.content);
  }

  async reset(): Promise<void> {
    await this.ensureReady();
    await this._store.save('global', []);
    await this._store.save('project', []);
  }
}
