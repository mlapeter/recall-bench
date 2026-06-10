/**
 * Naive In-Memory Adapter
 *
 * Stores every user message verbatim. Searches by token overlap.
 * Ignores the virtual clock entirely — no extraction, no salience, no decay.
 *
 * This is the floor: good at parroting recent text back, bad at everything
 * the benchmark actually measures.
 */

import type { MemoryAdapter, Message, QueryOptions, SessionMeta } from '../types/index.js';

export class NaiveAdapter implements MemoryAdapter {
  readonly name = 'naive';
  private messages: string[] = [];

  async processConversation(messages: Message[], _meta: SessionMeta): Promise<void> {
    for (const msg of messages) {
      if (msg.role === 'user') {
        this.messages.push(msg.content);
      }
    }
  }

  async query(question: string, options: QueryOptions): Promise<string[]> {
    const tokens = question
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2);

    if (tokens.length === 0) return [];

    const scored = this.messages.map(content => {
      const lower = content.toLowerCase();
      let matchCount = 0;
      for (const token of tokens) {
        if (lower.includes(token)) matchCount++;
      }
      return { content, score: matchCount / tokens.length };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit)
      .map(s => s.content);
  }

  async reset(): Promise<void> {
    this.messages = [];
  }
}
