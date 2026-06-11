/**
 * Empty Adapter — validity-battery floor, not a contender.
 *
 * Stores nothing, always abstains. Establishes the absolute floor of the
 * benchmark: any score it earns on a non-calibration dimension is credit the
 * scorer gives away for free (abstention/forget credit), not memory.
 */

import type { MemoryAdapter, Message, QueryOptions, SessionMeta } from '../types/index.js';

export class EmptyAdapter implements MemoryAdapter {
  readonly name = 'empty';

  async processConversation(_messages: Message[], _meta: SessionMeta): Promise<void> {}

  async query(_question: string, _options: QueryOptions): Promise<string[]> {
    return [];
  }

  async reset(): Promise<void> {}
}
