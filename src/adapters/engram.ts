/**
 * Engram Adapter
 *
 * Uses engram's real extraction pipeline (Haiku) and search.
 * Requires ANTHROPIC_API_KEY. Costs ~$0.001/conversation.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MemoryAdapter, Message, QueryOptions, SessionMeta } from '../types/index.js';

/** Load .env file into process.env (simple key=value parser, no overwrite) */
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
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // No .env file — that's fine
  }
}

// Engram types (reproduced to avoid hard dependency)
interface EngramMemory {
  id: string;
  content: string;
  scope: 'global' | 'project';
  memory_type: 'episodic' | 'semantic';
  /** v3 register — different decay/gist physics per kind; absent on pre-v3 memories */
  register?: 'self' | 'person' | 'craft';
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

// v3 extraction emits register but no memory_type (gist conversion moved to consolidation)
type NewEngramMemory = Omit<EngramMemory, 'id' | 'access_count' | 'last_accessed' | 'created_at' | 'consolidated' | 'generalized' | 'updated_from' | 'memory_type'> & {
  memory_type?: 'episodic' | 'semantic';
  updates: string | null;
};

interface EngramStoreApi {
  loadAll(): Promise<EngramMemory[]>;
  add(memories: EngramMemory[]): Promise<void>;
  search(query: string, limit?: number): Promise<EngramMemory[]>;
  save(scope: 'global' | 'project', memories: EngramMemory[]): Promise<void>;
}

export interface EngramAdapterOptions {
  engramPath?: string;
  tempDataDir?: string;
}

export class EngramAdapter implements MemoryAdapter {
  readonly name = 'engram';
  private _store!: EngramStoreApi;
  private _extractMemories!: (
    input: string,
    existing: EngramMemory[],
    mode: 'summary' | 'transcript',
    weightsHint?: string | null,
  ) => Promise<NewEngramMemory[]>;
  private _generateId!: () => string;
  private ready: Promise<void>;
  private tempDir: string;

  constructor(private options: EngramAdapterOptions = {}) {
    this.tempDir = options.tempDataDir ?? '/tmp/recall-bench-engram';
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

      this._store = storeMod.createStore(this.tempDir) as EngramStoreApi;
      this._extractMemories = salienceMod.extractMemories;
      this._generateId = typesMod.generateId;
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

    // Format as transcript for extraction
    const transcript = messages
      .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const existing = await this._store.loadAll();
    let extracted: NewEngramMemory[];
    try {
      extracted = await this._extractMemories(transcript, existing, 'transcript');
    } catch {
      // One retry: extraction occasionally runs away to max_tokens, and engram
      // fails loudly rather than store a truncated result — without a retry a
      // single flaky call kills a full benchmark run.
      extracted = await this._extractMemories(transcript, existing, 'transcript');
    }

    if (extracted.length === 0) return;

    // Convert NewMemory → full Memory objects and store.
    // Stamp memories with the scenario's virtual time so engram's internal
    // recency/decay logic operates on the benchmark timeline, not wall clock.
    const now = meta.timestamp;
    const memories: EngramMemory[] = extracted.map(m => ({
      id: this._generateId(),
      content: m.content,
      scope: m.scope,
      memory_type: m.memory_type ?? 'episodic',
      register: m.register,
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
