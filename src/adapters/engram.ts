/**
 * Engram Adapter
 *
 * Wraps claude-engram's store directly for benchmarking.
 * Uses engram's native store, strength, consolidation, and search.
 *
 * Requires engram to be installed at a known path (default: ~/claude-engram).
 */

import type {
  MemoryAdapter,
  RecalledMemory,
  StoredMemory,
  StoreInput,
  SystemStatus,
} from '../types/index.js';

// Engram's internal types (reproduced to avoid import dependency)
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

interface EngramStoreApi {
  loadAll(): Promise<EngramMemory[]>;
  add(memories: EngramMemory[]): Promise<void>;
  remove(id: string): Promise<void>;
  update(id: string, updates: Partial<EngramMemory>): Promise<void>;
  search(query: string, limit?: number): Promise<EngramMemory[]>;
  save(scope: 'global' | 'project', memories: EngramMemory[]): Promise<void>;
  load(scope: 'global' | 'project'): Promise<EngramMemory[]>;
  loadMeta(scope: 'global' | 'project'): Promise<{ lastConsolidation: string | null }>;
  saveMeta(scope: 'global' | 'project', meta: unknown): Promise<void>;
}

export interface EngramAdapterOptions {
  /** Path to engram installation (default: ~/claude-engram) */
  engramPath?: string;
  /** Temporary data directory for isolated benchmarking */
  tempDataDir?: string;
}

export class EngramAdapter implements MemoryAdapter {
  readonly name = 'engram';
  private _engram!: EngramStoreApi;
  private _calcStrength!: (memory: EngramMemory) => number;
  private _genId!: () => string;
  private _consolidate: ((store: EngramStoreApi) => Promise<unknown>) | null = null;
  private ready: Promise<void>;
  private tempDir: string;

  constructor(private options: EngramAdapterOptions = {}) {
    this.tempDir = options.tempDataDir ?? '/tmp/recall-bench-engram';
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const engramPath = this.options.engramPath ?? `${process.env.HOME}/claude-engram`;

    // Isolate from real engram data
    process.env.ENGRAM_DATA_DIR = this.tempDir;

    try {
      const storeMod = await import(`${engramPath}/src/core/store.js`);
      const strengthMod = await import(`${engramPath}/src/core/strength.js`);
      const typesMod = await import(`${engramPath}/src/core/types.js`);

      this._engram = storeMod.createStore(this.tempDir) as EngramStoreApi;
      this._calcStrength = strengthMod.calculateStrength;
      this._genId = typesMod.generateId;

      try {
        const consolMod = await import(`${engramPath}/src/core/consolidation.js`);
        this._consolidate = consolMod.runConsolidation;
      } catch {
        // Consolidation not available
      }
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

  async store(input: StoreInput): Promise<string> {
    await this.ensureReady();

    const id = this._genId();
    const salience = { novelty: 0.5, relevance: 0.5, emotional: 0.3, predictive: 0.3 };

    // Boost salience for emotionally-tagged memories
    if (input.tags?.some(t => ['personal', 'relationship', 'insight'].includes(t))) {
      salience.emotional = 0.7;
      salience.relevance = 0.7;
    }
    if (input.tags?.some(t => ['goal'].includes(t))) {
      salience.predictive = 0.7;
      salience.relevance = 0.6;
    }

    const memory: EngramMemory = {
      id,
      content: input.content,
      scope: input.scope ?? 'global',
      memory_type: 'episodic',
      salience,
      tags: input.tags?.length ? input.tags : ['benchmark'],
      access_count: 0,
      last_accessed: null,
      created_at: new Date().toISOString(),
      consolidated: false,
      generalized: false,
      source_session: 'recall-bench',
      updated_from: null,
    };

    await this._engram.add([memory]);
    return id;
  }

  async recall(query: string, limit = 10): Promise<RecalledMemory[]> {
    await this.ensureReady();
    const results = await this._engram.search(query, limit);
    return results.map(m => ({
      id: m.id,
      content: m.content,
      strength: this._calcStrength(m),
      tags: m.tags,
      matchType: 'fuzzy' as const,
    }));
  }

  async reinforce(memoryId: string): Promise<void> {
    await this.ensureReady();
    const all = await this._engram.loadAll();
    const memory = all.find(m => m.id === memoryId);
    if (memory) {
      await this._engram.update(memoryId, {
        access_count: memory.access_count + 1,
        last_accessed: new Date().toISOString(),
      });
    }
  }

  async update(memoryId: string, newContent: string): Promise<void> {
    await this.ensureReady();
    await this._engram.update(memoryId, { content: newContent });
  }

  async forget(memoryId: string): Promise<void> {
    await this.ensureReady();
    await this._engram.remove(memoryId);
  }

  async consolidate(): Promise<void> {
    await this.ensureReady();
    if (this._consolidate) {
      await this._consolidate(this._engram);
    }
  }

  async get(memoryId: string): Promise<StoredMemory | null> {
    await this.ensureReady();
    const all = await this._engram.loadAll();
    const m = all.find(m => m.id === memoryId);
    if (!m) return null;
    return {
      id: m.id,
      content: m.content,
      strength: this._calcStrength(m),
      tags: m.tags,
      createdAt: m.created_at,
      accessCount: m.access_count,
    };
  }

  async getAll(): Promise<StoredMemory[]> {
    await this.ensureReady();
    const all = await this._engram.loadAll();
    return all.map(m => ({
      id: m.id,
      content: m.content,
      strength: this._calcStrength(m),
      tags: m.tags,
      createdAt: m.created_at,
      accessCount: m.access_count,
    }));
  }

  async status(): Promise<SystemStatus> {
    await this.ensureReady();
    const all = await this._engram.loadAll();
    return {
      totalMemories: all.length,
      averageStrength: all.length > 0
        ? all.reduce((s, m) => s + this._calcStrength(m), 0) / all.length
        : 0,
    };
  }

  async reset(): Promise<void> {
    await this.ensureReady();
    await this._engram.save('global', []);
    await this._engram.save('project', []);
  }
}
