/**
 * RECALL Benchmark
 *
 * Conversation-based evaluation for memory systems.
 */

export { runBenchmark, formatReport, loadScenarios } from './runner/index.js';
export { scoreQuery, scoreScenario } from './scorer/index.js';
export { NaiveAdapter } from './adapters/index.js';
export type {
  MemoryAdapter,
  Message,
  Query,
  QueryDimension,
  Session,
  Scenario,
  QueryScore,
  QueryResult,
  ScenarioResult,
  BenchmarkResult,
} from './types/index.js';
