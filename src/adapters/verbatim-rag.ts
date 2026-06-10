/**
 * Verbatim-RAG Baseline Adapter
 *
 * A competent store-everything retrieval system — the architecture most
 * production memory products use. Chunks every message (user AND assistant),
 * indexes all of it forever, and ranks by BM25 token relevance.
 *
 * This is the benchmark's foil. It should do well on raw recall and visibly
 * fail forgetting, salience, calibration, gist, and the entire self axis:
 * it stores everything and forgets nothing, which is exactly the behavior
 * RECALL is designed to expose.
 *
 * An optional embedding hook is provided for hybrid scoring, but the default
 * runs fully keyless.
 */

import type { MemoryAdapter, Message, QueryOptions, SessionMeta } from '../types/index.js';

interface Chunk {
  content: string;
  tokens: string[];
  sessionIndex: number;
}

/** Optional embedding hook: return a vector per text, used for hybrid scoring. */
export type EmbedFn = (texts: string[]) => Promise<number[][]>;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'do', 'does', 'did', 'have', 'has', 'had', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'them', 'their', 'this', 'that', 'these', 'those', 'what', 'which',
  'who', 'whom', 'how', 'when', 'where', 'why', 'to', 'of', 'in', 'on', 'at',
  'for', 'with', 'about', 'as', 'by', 'from', 'up', 'so', 'if', 'not', 'no',
  'my', 'your', 'his', 'her', 'its', 'our', 'me', 'him', 'us', 'am', 'will',
  'would', 'can', 'could', 'should', 'just', 'than', 'then', 'there', 'here',
  'any', 'some', 'all', 'did', 'tell', 'know', 'get', 'got', 'going', 'been',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$']/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

export class VerbatimRagAdapter implements MemoryAdapter {
  readonly name = 'verbatim-rag';
  private chunks: Chunk[] = [];
  private embed?: EmbedFn;

  constructor(options: { embed?: EmbedFn } = {}) {
    this.embed = options.embed;
  }

  async processConversation(messages: Message[], meta: SessionMeta): Promise<void> {
    // Store every message as a chunk — user and assistant alike.
    // Verbatim systems don't editorialize; that's the point.
    for (const msg of messages) {
      this.chunks.push({
        content: msg.content,
        tokens: tokenize(msg.content),
        sessionIndex: meta.index,
      });
    }
  }

  async query(question: string, options: QueryOptions): Promise<string[]> {
    if (this.chunks.length === 0) return [];

    const queryTokens = tokenize(question);
    if (queryTokens.length === 0) return [];

    // BM25 scoring
    const N = this.chunks.length;
    const avgLen = this.chunks.reduce((s, c) => s + c.tokens.length, 0) / N;
    const k1 = 1.2;
    const b = 0.75;

    // Document frequency per query token
    const df = new Map<string, number>();
    for (const qt of queryTokens) {
      let count = 0;
      for (const chunk of this.chunks) {
        if (chunk.tokens.includes(qt)) count++;
      }
      df.set(qt, count);
    }

    const scored = this.chunks.map(chunk => {
      let score = 0;
      for (const qt of queryTokens) {
        const tf = chunk.tokens.filter(t => t === qt).length;
        if (tf === 0) continue;
        const n = df.get(qt) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * chunk.tokens.length) / avgLen));
      }
      return { chunk, score };
    });

    let ranked = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    // Optional hybrid rerank via embedding hook (opt-in; keyless by default)
    if (this.embed && ranked.length > 1) {
      const top = ranked.slice(0, Math.min(ranked.length, options.limit * 4));
      const [qVec, ...docVecs] = await this.embed([question, ...top.map(s => s.chunk.content)]);
      const cosine = (a: number[], bb: number[]) => {
        let dot = 0, na = 0, nb = 0;
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * bb[i];
          na += a[i] * a[i];
          nb += bb[i] * bb[i];
        }
        return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
      };
      const reranked = top
        .map((s, i) => ({ chunk: s.chunk, score: 0.5 * s.score + 0.5 * cosine(qVec, docVecs[i]) }))
        .sort((a, b) => b.score - a.score);
      ranked = [...reranked, ...ranked.slice(top.length)];
    }

    return ranked.slice(0, options.limit).map(s => s.chunk.content);
  }

  async reset(): Promise<void> {
    this.chunks = [];
  }
}
