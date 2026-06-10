/**
 * Tier 3 respond() wrapper
 *
 * Gives any MemoryAdapter a respond() method by combining its own query()
 * retrieval with a Claude call: the model answers the live conversation with
 * the adapter's retrieved memories in context. After reset() the adapter has
 * no memories, so the same wrapper serves as the control arm — the model and
 * prompt are identical in both arms; only memory differs.
 *
 * Requires ANTHROPIC_API_KEY. Model: RECALL_RESPOND_MODEL (default
 * claude-sonnet-4-6).
 */

import type { MemoryAdapter, Message, RespondOptions } from '../types/index.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export function withLLMRespond<T extends MemoryAdapter>(adapter: T, options: { model?: string } = {}): T {
  const model = options.model ?? process.env.RECALL_RESPOND_MODEL ?? DEFAULT_MODEL;

  adapter.respond = async (messages: Message[], { now }: RespondOptions): Promise<string> => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Tier 3 respond() requires ANTHROPIC_API_KEY.');
    }
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic();

    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const memories = lastUser ? await adapter.query(lastUser.content, { limit: 6, now }) : [];

    const memoryBlock =
      memories.length > 0
        ? `Relevant memories from your prior sessions with this user:\n${memories.map((m, i) => `${i + 1}. ${m}`).join('\n')}`
        : 'You have no stored memories of prior sessions with this user.';

    const response = await client.messages.create({
      model,
      max_tokens: 700,
      system: `You are an AI assistant in an ongoing working relationship with this user. The current date is ${now}.\n\n${memoryBlock}\n\nAnswer the user's message directly and concretely. If your memories contain hard-won specifics that apply, use them.`,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    return response.content.map(b => (b.type === 'text' ? b.text : '')).join('');
  };

  return adapter;
}
