/**
 * Naive In-Memory Adapter
 *
 * Stores every user message verbatim. Searches by token overlap.
 * No extraction, no salience, no decay — just substring matching.
 *
 * Expected score: ~30-40% (good at basic retrieval, bad at everything else).
 */

import type { MemoryAdapter, Message } from '../types/index.js';

export class NaiveAdapter implements MemoryAdapter {
  readonly name = 'naive';
  private messages: string[] = [];

  async processConversation(messages: Message[]): Promise<void> {
    for (const msg of messages) {
      if (msg.role === 'user') {
        this.messages.push(msg.content);
      }
    }
  }

  async query(question: string, limit = 5): Promise<string[]> {
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
      .slice(0, limit)
      .map(s => s.content);
  }

  async reset(): Promise<void> {
    this.messages = [];
  }
}
