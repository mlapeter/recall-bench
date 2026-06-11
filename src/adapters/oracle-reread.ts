/**
 * Oracle Reread Adapter — validity-battery ceiling, not a contender.
 *
 * The "no memory system needed" strategy: store every session verbatim with
 * its timestamp; at query time, hand the FULL transcript plus the query's
 * virtual "now" to Claude Sonnet and ask it to answer concisely or say
 * UNKNOWN. Returns the answer as a single result; UNKNOWN = abstain.
 *
 * This is an honest ceiling, not a cheat: it answers from a complete reread,
 * the way a context window with no memory system would. Dimensions it still
 * fails are the ones that measure memory as a capability rather than storage.
 *
 * Requires ANTHROPIC_API_KEY (loaded from repo .env if present).
 * Model: claude-sonnet-4-6, temperature 0, prompt caching on the transcript.
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
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
    // no .env — rely on the environment
  }
}

const SYSTEM_PROMPT =
  'You are an assistant answering a question using the complete transcript of all your past conversation sessions with this user. Given the full history and the current date, answer the question concisely (one to three sentences). If the conversations never discussed the topic asked about, reply with exactly UNKNOWN and nothing else.';

interface StoredSession {
  timestamp: string;
  index: number;
  text: string;
}

export class OracleRereadAdapter implements MemoryAdapter {
  readonly name = 'oracle-reread';
  private sessions: StoredSession[] = [];
  private client: import('@anthropic-ai/sdk').default | null = null;
  readonly model = 'claude-sonnet-4-6';
  /** Token usage accumulated across the run, for cost reporting. */
  usage = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };

  private async getClient() {
    if (!this.client) {
      loadDotEnv(resolve(import.meta.dirname ?? '.', '..', '..'));
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('oracle-reread requires ANTHROPIC_API_KEY');
      }
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      this.client = new Anthropic();
    }
    return this.client;
  }

  async processConversation(messages: Message[], meta: SessionMeta): Promise<void> {
    const text = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    this.sessions.push({ timestamp: meta.timestamp, index: meta.index, text });
  }

  async query(question: string, options: QueryOptions): Promise<string[]> {
    if (this.sessions.length === 0) return [];
    const client = await this.getClient();

    const transcript = this.sessions
      .map(s => `=== Session ${s.index} — ${s.timestamp} ===\n${s.text}`)
      .join('\n\n');

    const maxAttempts = 4;
    for (let attempt = 1; ; attempt++) {
      try {
        const response = await client.messages.create({
          model: this.model,
          max_tokens: 300,
          temperature: 0,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Complete conversation history:\n\n${transcript}`,
                  cache_control: { type: 'ephemeral' },
                },
                {
                  type: 'text',
                  text: `Today is ${options.now}.\n\nQuestion: ${question}`,
                },
              ],
            },
          ],
        });

        this.usage.input += response.usage.input_tokens;
        this.usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0;
        this.usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;
        this.usage.output += response.usage.output_tokens;

        const text = response.content
          .map(b => (b.type === 'text' ? b.text : ''))
          .join('')
          .trim();

        if (!text || text.toUpperCase() === 'UNKNOWN') return [];
        return [text];
      } catch (err) {
        if (attempt >= maxAttempts) throw err;
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
  }

  async reset(): Promise<void> {
    this.sessions = [];
  }
}
