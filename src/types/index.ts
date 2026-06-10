/**
 * RECALL Benchmark — Types
 *
 * Conversation-based evaluation for memory systems.
 */

import { z } from 'zod';

// ─── Memory System Adapter Interface ─────────────────────────────────────────
// Any memory system can implement this: 3 methods + a name.

export interface MemoryAdapter {
  /** Human-readable name (e.g., "engram", "mem0", "naive") */
  readonly name: string;

  /** Feed a conversation session — the system stores what it deems important */
  processConversation(messages: Message[]): Promise<void>;

  /** Ask what it remembers — returns relevant content strings */
  query(question: string, limit?: number): Promise<string[]>;

  /** Clear all state between scenarios */
  reset(): Promise<void>;
}

// ─── Conversation Types ──────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Query Types ─────────────────────────────────────────────────────────────

export type QueryDimension =
  | 'salience'     // important facts rise above noise
  | 'decay'        // older info fades appropriately
  | 'correction'   // updated facts replace stale ones
  | 'calibration'  // knows what it doesn't know
  | 'coherence'    // narrative consistency across sessions
  | 'separation'   // keeps distinct entities apart
  | 'pattern'      // recognizes breaks from routine
  | 'emotional';   // emotionally weighted memories persist

export interface Query {
  /** Natural language question */
  question: string;

  /** Keywords that SHOULD appear in results (case-insensitive substring) */
  should_recall: string[];

  /** Keywords that should NOT appear in results */
  should_forget: string[];

  /** If set, system should return at most this many results (0 = abstain) */
  max_results?: number;

  /** If set, only check top N results for recall; check ALL for forget */
  top_n?: number;

  /** Which memory dimension this query tests */
  dimension: QueryDimension;
}

// ─── Scenario Types ──────────────────────────────────────────────────────────

export interface Session {
  messages: Message[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  sessions: Session[];
  queries: Query[];
}

// ─── Result Types ────────────────────────────────────────────────────────────

export interface QueryScore {
  recall_score: number | null;      // null = vacuous (no keywords to check)
  forget_score: number | null;
  abstention_score: number | null;
  combined_score: number;           // average of non-null components
}

export interface QueryResult {
  query: Query;
  results: string[];
  score: QueryScore;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  queryResults: QueryResult[];
  score: number;                    // average of query combined_scores
}

export interface BenchmarkResult {
  adapterName: string;
  scenarios: ScenarioResult[];
  overallScore: number;             // average of scenario scores
  totalDurationMs: number;
  timestamp: string;
}

// ─── Zod Schema for Scenario Validation ──────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

const QuerySchema = z.object({
  question: z.string().min(1),
  should_recall: z.array(z.string()).default([]),
  should_forget: z.array(z.string()).default([]),
  max_results: z.number().int().min(0).optional(),
  top_n: z.number().int().min(1).optional(),
  dimension: z.enum([
    'salience', 'decay', 'correction', 'calibration',
    'coherence', 'separation', 'pattern', 'emotional',
  ]),
});

const SessionSchema = z.object({
  messages: z.array(MessageSchema).min(1),
});

export const ScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  sessions: z.array(SessionSchema).min(1),
  queries: z.array(QuerySchema).min(1),
});
