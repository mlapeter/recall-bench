/**
 * Random Adapter — validity-battery chance floor, not a contender.
 *
 * Stores every message verbatim and answers every query with `limit`
 * uniformly-random stored messages (seeded, deterministic across runs).
 * Establishes the per-dimension chance floor: a dimension a random retriever
 * scores well on is not measuring memory.
 */

import type { MemoryAdapter, Message, QueryOptions, SessionMeta } from '../types/index.js';

/** mulberry32 — same seeded PRNG the variant generator uses. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RandomAdapter implements MemoryAdapter {
  readonly name = 'random';
  private messages: string[] = [];
  private rand: () => number;

  constructor(private seed = 42) {
    this.rand = mulberry32(seed);
  }

  async processConversation(messages: Message[], _meta: SessionMeta): Promise<void> {
    for (const msg of messages) {
      this.messages.push(msg.content);
    }
  }

  async query(_question: string, options: QueryOptions): Promise<string[]> {
    if (this.messages.length === 0) return [];
    const n = Math.min(options.limit, this.messages.length);
    // Partial Fisher–Yates over a copy: n distinct uniform picks
    const pool = [...this.messages];
    const picked: string[] = [];
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(this.rand() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
      picked.push(pool[i]);
    }
    return picked;
  }

  async reset(): Promise<void> {
    this.messages = [];
    // Re-seed so every scenario sequence is reproducible run-to-run
    this.rand = mulberry32(this.seed);
  }
}
