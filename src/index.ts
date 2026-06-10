/**
 * RECALL Benchmark
 *
 * Conversation-based evaluation for AI memory systems.
 * Memory for the AI as subject — and forgetting as a feature.
 */

export { runBenchmark, runScenario, formatReport, loadScenarios, defaultNow, BENCHMARK_VERSION } from './runner/index.js';
export { scoreQuery, scoreScenario, aggregateDimensions } from './scorer/index.js';
export { JudgeRunner } from './judge/index.js';
export { NaiveAdapter, VerbatimRagAdapter } from './adapters/index.js';
export type { EmbedFn } from './adapters/index.js';
export {
  ALL_DIMENSIONS,
  WORLD_DIMENSIONS,
  SELF_DIMENSIONS,
  axisOf,
  ScenarioSchema,
} from './types/index.js';
export type {
  MemoryAdapter,
  Message,
  SessionMeta,
  QueryOptions,
  RespondOptions,
  Query,
  QueryDimension,
  Axis,
  Session,
  Scenario,
  JudgeSpec,
  QueryScore,
  QueryResult,
  ScenarioResult,
  BenchmarkResult,
} from './types/index.js';
