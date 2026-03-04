/**
 * RECALL Benchmark — Core Types
 *
 * Retention, Encoding, Consolidation, Adaptation, Loss, and Learning
 */

// ─── Memory System Adapter Interface ─────────────────────────────────────────
// Any memory system being benchmarked must implement this interface.

export interface MemoryAdapter {
  /** Human-readable name of the system (e.g., "engram", "mem0", "zep") */
  readonly name: string;

  /** Store a memory with content and optional metadata */
  store(memory: StoreInput): Promise<string>; // returns memory ID

  /** Search/recall memories by query */
  recall(query: string, limit?: number): Promise<RecalledMemory[]>;

  /** Reinforce/strengthen a memory (if supported) */
  reinforce?(memoryId: string): Promise<void>;

  /** Update a memory's content (reconsolidation, if supported) */
  update?(memoryId: string, newContent: string): Promise<void>;

  /** Delete/forget a memory */
  forget?(memoryId: string): Promise<void>;

  /** Trigger consolidation (if supported) */
  consolidate?(): Promise<void>;

  /** Get memory by ID (if supported) */
  get?(memoryId: string): Promise<StoredMemory | null>;

  /** Get all memories (for inspection) */
  getAll?(): Promise<StoredMemory[]>;

  /** Get system status/stats */
  status?(): Promise<SystemStatus>;

  /** Reset the system to empty state */
  reset(): Promise<void>;

  /** Advance simulated time (for systems that support it) */
  advanceTime?(seconds: number): Promise<void>;
}

export interface StoreInput {
  content: string;
  tags?: string[];
  scope?: 'global' | 'project';
  metadata?: Record<string, unknown>;
}

export interface RecalledMemory {
  id: string;
  content: string;
  strength?: number;
  tags?: string[];
  matchType?: 'exact' | 'fuzzy' | 'semantic';
  metadata?: Record<string, unknown>;
}

export interface StoredMemory {
  id: string;
  content: string;
  strength?: number;
  tags?: string[];
  createdAt?: string;
  accessCount?: number;
  metadata?: Record<string, unknown>;
}

export interface SystemStatus {
  totalMemories: number;
  averageStrength?: number;
  oldestMemory?: string;
  newestMemory?: string;
}

// ─── Test Types ──────────────────────────────────────────────────────────────

/** The six axes of RECALL */
export type TestCategory =
  | 'retention'      // R — strength-through-use, decay curves
  | 'encoding'       // E — salience discrimination, emotional asymmetry
  | 'consolidation'  // C — merge quality, episodic→semantic, pattern extraction
  | 'adaptation'     // A — contradiction handling, interference, context-dependent retrieval
  | 'loss'           // L — graceful forgetting, appropriate pruning, memory under load
  | 'learning';      // L — cross-domain transfer, relationship memory, metacognition

export interface TestCase {
  /** Unique test identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Which RECALL category this tests */
  category: TestCategory;

  /** What this test evaluates */
  description: string;

  /** Tags for filtering */
  tags?: string[];

  /** Run the test against a memory adapter */
  run(adapter: MemoryAdapter): Promise<TestResult>;
}

export interface TestResult {
  /** Test ID */
  testId: string;

  /** 0.0 to 1.0 — higher is better */
  score: number;

  /** Whether the test passed (score >= threshold) */
  passed: boolean;

  /** Human-readable explanation of what happened */
  details: string;

  /** Optional structured data for deeper analysis */
  data?: Record<string, unknown>;

  /** How long the test took (ms) */
  durationMs: number;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface CategoryScore {
  category: TestCategory;
  score: number;       // 0.0 to 1.0
  testsRun: number;
  testsPassed: number;
  testResults: TestResult[];
}

export interface BenchmarkResult {
  /** System being benchmarked */
  systemName: string;

  /** Overall composite score */
  overallScore: number;

  /** Per-category breakdown */
  categories: CategoryScore[];

  /** All individual test results */
  tests: TestResult[];

  /** Total time */
  totalDurationMs: number;

  /** When this was run */
  timestamp: string;

  /** Benchmark version */
  version: string;
}

// ─── Runner Config ───────────────────────────────────────────────────────────

export interface BenchmarkConfig {
  /** Which categories to run (default: all) */
  categories?: TestCategory[];

  /** Which specific test IDs to run */
  tests?: string[];

  /** Whether to run tests that require time simulation */
  allowTimeSimulation?: boolean;

  /** Whether to run tests that use an LLM judge */
  allowLlmJudge?: boolean;

  /** Anthropic API key (for LLM-judged tests) */
  anthropicApiKey?: string;

  /** Verbose output */
  verbose?: boolean;
}
