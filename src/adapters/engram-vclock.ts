/**
 * Engram Adapter with virtual-clock translation — validity-battery follow-up.
 *
 * The published engram adapter stamps memories with the scenario's virtual
 * timestamps (2025 dates), but engram's calculateStrength() and search
 * recency boost both run on Date.now() — so every memory looks ~a year old,
 * 27% of stored memories sit at strength 0, and within-scenario age
 * differences are nearly flat (VALIDITY.md §3, WORKLOG-BATTERY.md).
 *
 * This adapter fixes the mismatch at query time. Memories are stored with
 * their virtual timestamps exactly as the published adapter does (so
 * extraction context stays comparable). At each query, it projects every
 * memory's created_at onto the wall clock so that wall-age equals virtual
 * age relative to the query's virtual `now` (QueryOptions.now, which the
 * published adapter ignores), runs engram's real search, then restores the
 * virtual stamps. Projection at query time — rather than a constant offset
 * per scenario at ingest — is exact for mid-scenario (after_session)
 * queries as well; a constant offset anchored at the last session would
 * make memories look too old at intermediate boundaries.
 *
 * Safe because engram's store.search() is read-only (no access-count or
 * last_accessed mutation), and applyInterference() is clock-free (pure
 * salience dampening keyed on updated_from), verified 2026-07-02.
 *
 * Optional `interference: true` replicates engram's live on-stop hook by
 * calling applyInterference after each session's store.add, mirroring the
 * battery's engram-interference ablation adapter.
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
type NewEngramMemory = Omit<
  EngramMemory,
  'id' | 'access_count' | 'last_accessed' | 'created_at' | 'consolidated' | 'generalized' | 'updated_from' | 'memory_type'
> & {
  memory_type?: 'episodic' | 'semantic';
  updates: string | null;
};

interface EngramStoreApi {
  load(scope: 'global' | 'project'): Promise<EngramMemory[]>;
  loadAll(): Promise<EngramMemory[]>;
  add(memories: EngramMemory[]): Promise<void>;
  search(query: string, limit?: number): Promise<EngramMemory[]>;
  save(scope: 'global' | 'project', memories: EngramMemory[]): Promise<void>;
}

const SCOPES = ['global', 'project'] as const;

export interface EngramVclockAdapterOptions {
  engramPath?: string;
  tempDataDir?: string;
  /** Also run engram's interference pass after each session (on-stop hook parity) */
  interference?: boolean;
}

export class EngramVclockAdapter implements MemoryAdapter {
  readonly name: string;
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

  constructor(private options: EngramVclockAdapterOptions = {}) {
    this.name = options.interference ? 'engram-vclock-interference' : 'engram-vclock';
    this.tempDir = options.tempDataDir ?? '/tmp/recall-bench-engram-vclock';
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

    if (this.options.interference) {
      await this._applyInterference(memories, existing, this._store);
    }
  }

  async query(question: string, options: QueryOptions): Promise<string[]> {
    await this.ensureReady();

    const virtualNow = Date.parse(options.now);
    if (Number.isNaN(virtualNow)) {
      // No usable virtual clock — behave like the published adapter
      const results = await this._store.search(question, options.limit);
      return results.map(m => m.content);
    }

    // Project virtual timestamps onto the wall clock so engram's decay and
    // recency boost see true relative ages, search, then restore.
    const originals = new Map<string, string>();
    const wallNow = Date.now();
    for (const scope of SCOPES) {
      const memories = await this._store.load(scope);
      if (memories.length === 0) continue;
      for (const m of memories) {
        originals.set(m.id, m.created_at);
        const virtualAgeMs = virtualNow - Date.parse(m.created_at);
        // Clamp: a memory can't be younger than "now" (negative ages would
        // invert the recency boost); unparsable stamps fall back to age 0.
        const safeAge = Number.isFinite(virtualAgeMs) ? Math.max(0, virtualAgeMs) : 0;
        m.created_at = new Date(wallNow - safeAge).toISOString();
      }
      await this._store.save(scope, memories);
    }

    try {
      const results = await this._store.search(question, options.limit);
      return results.map(m => m.content);
    } finally {
      for (const scope of SCOPES) {
        const memories = await this._store.load(scope);
        if (memories.length === 0) continue;
        let changed = false;
        for (const m of memories) {
          const virtual = originals.get(m.id);
          if (virtual && m.created_at !== virtual) {
            m.created_at = virtual;
            changed = true;
          }
        }
        if (changed) await this._store.save(scope, memories);
      }
    }
  }

  async reset(): Promise<void> {
    await this.ensureReady();
    await this._store.save('global', []);
    await this._store.save('project', []);
  }
}
