/**
 * RECALL Benchmark — Types
 *
 * Single source of truth for the adapter interface, scenario format,
 * and results schema. See SPEC.md for semantics.
 */

import { z } from 'zod';

// ─── Memory System Adapter Interface ─────────────────────────────────────────
// Any memory system can be benchmarked by implementing 3 methods + a name.
// `respond` is optional and only used by Tier 3.

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionMeta {
  /** ISO 8601 UTC timestamp — when this session virtually occurred */
  timestamp: string;
  /** 1-based index of this session within the scenario */
  index: number;
}

export interface QueryOptions {
  /** Max results the harness will read; returning more hurts abstention scoring */
  limit: number;
  /** ISO 8601 UTC virtual "current time" at which this query is asked */
  now: string;
}

export interface RespondOptions {
  /** ISO 8601 UTC virtual "current time" of the live session */
  now: string;
}

export interface MemoryAdapter {
  /** Human-readable name (e.g., "engram", "mem0", "naive") */
  readonly name: string;

  /** Ingest one conversation session — store whatever you deem worth keeping */
  processConversation(messages: Message[], meta: SessionMeta): Promise<void>;

  /** Return what you remember relevant to the question, best-first. [] = abstain. */
  query(question: string, options: QueryOptions): Promise<string[]>;

  /** Clear ALL state. Called between scenarios. */
  reset(): Promise<void>;

  /** OPTIONAL — Tier 3 only. Produce the assistant's next reply in a live
   *  conversation, drawing on memory. */
  respond?(messages: Message[], options: RespondOptions): Promise<string>;
}

// ─── Dimension Taxonomy ──────────────────────────────────────────────────────
// Two axes: memory of the world (what every benchmark tests) and memory of
// self (what no other benchmark tests). See SPEC.md §1 for citations.

export const WORLD_DIMENSIONS = [
  'decay',
  'salience',
  'emotional',
  'gist',
  'sacred-verbatim',
  'correction',
  'spacing',
  'interference',
  'separation',
  'calibration',
  'prospective',
  'thread-reactivation',
  'relational',
] as const;

export const SELF_DIMENSIONS = ['self-continuity', 'procedural'] as const;

export const ALL_DIMENSIONS = [...WORLD_DIMENSIONS, ...SELF_DIMENSIONS] as const;

export type QueryDimension = (typeof ALL_DIMENSIONS)[number];
export type Axis = 'world' | 'self';

export function axisOf(dimension: QueryDimension): Axis {
  return (SELF_DIMENSIONS as readonly string[]).includes(dimension) ? 'self' : 'world';
}

// ─── Scenario Types ──────────────────────────────────────────────────────────

export interface Session {
  /** ISO 8601 UTC timestamp; sessions must be in chronological order */
  timestamp: string;
  messages: Message[];
}

export interface JudgeSpec {
  /** Self-contained rubric for the Tier 2 LLM judge (it sees only the
   *  question, the adapter's results, and this rubric). */
  rubric: string;
}

export interface Query {
  /** Natural language question */
  question: string;

  /** Which memory dimension this query tests */
  dimension: QueryDimension;

  /** Virtual "now" for this query (ISO 8601). Default: last ingested session + 24h. */
  now?: string;

  /** Run after only the first N sessions are ingested (1-based). Default: all. */
  after_session?: number;

  /** Keywords that SHOULD appear in results (case-insensitive substring).
   *  An entry may contain `|`-separated alternates — any match counts. */
  should_recall: string[];

  /** Keywords that must NOT appear in ANY returned result */
  should_forget: string[];

  /** Exact contiguous phrases (case-insensitive) that must appear in results */
  must_include_verbatim?: string[];

  /** If set, system must return at most this many results (0 = abstain) */
  max_results?: number;

  /** If set, only check top N results for recall/verbatim; check ALL for forget */
  top_n?: number;

  /** Tier 2 judge rubric (optional) */
  judge?: JudgeSpec;
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
  recall_score: number | null; // null = component not applicable
  forget_score: number | null;
  verbatim_score: number | null;
  abstention_score: number | null;
  judge_score: number | null;
  judge_rationale?: string;
  combined_score: number; // mean of non-null components
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
  score: number; // mean of query combined_scores (drill-down only)
}

export interface BenchmarkResult {
  benchmark: 'recall-bench';
  benchmarkVersion: string;
  scenarioSet: string;
  adapter: string;
  timestamp: string;
  /** Highest tier that ran: 1 (mechanical) or 2 (judged) */
  tier: 1 | 2;
  /** Unweighted mean of dimension scores */
  headline: number;
  /** Unweighted mean of each axis's dimension scores */
  axes: { world: number | null; self: number | null };
  /** Per-dimension mean of query combined_scores (only dimensions present) */
  dimensions: Partial<Record<QueryDimension, number>>;
  scenarios: ScenarioResult[];
  durationMs: number;
}

// ─── Zod Schemas (scenario validation) ───────────────────────────────────────

const ISO_TIMESTAMP = z
  .string()
  .refine(s => !Number.isNaN(Date.parse(s)), { message: 'invalid ISO 8601 timestamp' });

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

const SessionSchema = z.object({
  timestamp: ISO_TIMESTAMP,
  messages: z.array(MessageSchema).min(1),
});

const JudgeSchema = z.object({
  rubric: z.string().min(1),
});

const QuerySchema = z.object({
  question: z.string().min(1),
  dimension: z.enum(ALL_DIMENSIONS),
  now: ISO_TIMESTAMP.optional(),
  after_session: z.number().int().min(1).optional(),
  should_recall: z.array(z.string()).default([]),
  should_forget: z.array(z.string()).default([]),
  must_include_verbatim: z.array(z.string()).optional(),
  max_results: z.number().int().min(0).optional(),
  top_n: z.number().int().min(1).optional(),
  judge: JudgeSchema.optional(),
});

export const ScenarioSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    sessions: z.array(SessionSchema).min(1),
    queries: z.array(QuerySchema).min(1),
  })
  .superRefine((scenario, ctx) => {
    // Sessions must be chronological
    for (let i = 1; i < scenario.sessions.length; i++) {
      if (Date.parse(scenario.sessions[i].timestamp) < Date.parse(scenario.sessions[i - 1].timestamp)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sessions', i, 'timestamp'],
          message: `session ${i + 1} timestamp precedes session ${i}`,
        });
      }
    }
    for (let qi = 0; qi < scenario.queries.length; qi++) {
      const q = scenario.queries[qi];
      const sessionCount = q.after_session ?? scenario.sessions.length;
      if (sessionCount > scenario.sessions.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['queries', qi, 'after_session'],
          message: `after_session ${sessionCount} exceeds session count ${scenario.sessions.length}`,
        });
        continue;
      }
      // Query "now" must not precede the last session it has ingested
      const lastIngested = scenario.sessions[sessionCount - 1].timestamp;
      if (q.now && Date.parse(q.now) < Date.parse(lastIngested)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['queries', qi, 'now'],
          message: `query "now" (${q.now}) precedes last ingested session (${lastIngested})`,
        });
      }
    }
  });
