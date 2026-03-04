/**
 * Naive In-Memory Adapter
 *
 * A dead-simple baseline: stores memories in an array, searches by substring.
 * No strength, no decay, no consolidation, no tags.
 *
 * This represents the "filesystem + grep" approach that many systems use.
 * Expected RECALL score: ~40-60% (good at basic storage, bad at dynamics).
 */

import type {
  MemoryAdapter,
  RecalledMemory,
  StoredMemory,
  StoreInput,
  SystemStatus,
} from '../types/index.js';

interface NaiveMemory {
  id: string;
  content: string;
  tags: string[];
  createdAt: number;
}

export class NaiveAdapter implements MemoryAdapter {
  readonly name = 'naive-baseline';
  private memories: NaiveMemory[] = [];
  private nextId = 1;

  async store(input: StoreInput): Promise<string> {
    const id = String(this.nextId++);
    this.memories.push({
      id,
      content: input.content,
      tags: input.tags ?? [],
      createdAt: Date.now(),
    });
    return id;
  }

  async recall(query: string, limit = 10): Promise<RecalledMemory[]> {
    const queryLower = query.toLowerCase();
    const tokens = queryLower.split(/\s+/).filter(t => t.length > 2);

    // Score each memory by token overlap
    const scored = this.memories.map(m => {
      const contentLower = m.content.toLowerCase();
      const tagStr = m.tags.join(' ').toLowerCase();
      const combined = contentLower + ' ' + tagStr;

      let matchCount = 0;
      for (const token of tokens) {
        if (combined.includes(token)) matchCount++;
      }

      return { memory: m, score: tokens.length > 0 ? matchCount / tokens.length : 0 };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        id: s.memory.id,
        content: s.memory.content,
        tags: s.memory.tags,
        matchType: 'exact' as const,
      }));
  }

  async forget(memoryId: string): Promise<void> {
    this.memories = this.memories.filter(m => m.id !== memoryId);
  }

  async get(memoryId: string): Promise<StoredMemory | null> {
    const m = this.memories.find(m => m.id === memoryId);
    if (!m) return null;
    return { id: m.id, content: m.content, tags: m.tags, createdAt: new Date(m.createdAt).toISOString() };
  }

  async getAll(): Promise<StoredMemory[]> {
    return this.memories.map(m => ({
      id: m.id,
      content: m.content,
      tags: m.tags,
      createdAt: new Date(m.createdAt).toISOString(),
    }));
  }

  async status(): Promise<SystemStatus> {
    return { totalMemories: this.memories.length };
  }

  async reset(): Promise<void> {
    this.memories = [];
    this.nextId = 1;
  }
}
