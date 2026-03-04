/**
 * RECALL Benchmark
 *
 * Retention · Encoding · Consolidation · Adaptation · Loss · Learning
 *
 * A benchmark for AI memory systems that rewards forgetting as much as remembering.
 */

export { allTests } from './tests/index.js';
export { runBenchmark, formatReport } from './runner/index.js';
export { NaiveAdapter } from './adapters/index.js';
export type {
  MemoryAdapter,
  StoreInput,
  RecalledMemory,
  StoredMemory,
  SystemStatus,
  TestCase,
  TestResult,
  TestCategory,
  CategoryScore,
  BenchmarkResult,
  BenchmarkConfig,
} from './types/index.js';
