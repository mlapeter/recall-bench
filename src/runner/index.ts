/**
 * RECALL Benchmark Runner
 *
 * Executes test cases against a memory adapter and produces results.
 */

import type {
  BenchmarkConfig,
  BenchmarkResult,
  CategoryScore,
  MemoryAdapter,
  TestCase,
  TestCategory,
  TestResult,
} from '../types/index.js';

const VERSION = '0.1.0';

const ALL_CATEGORIES: TestCategory[] = [
  'retention', 'encoding', 'consolidation', 'adaptation', 'loss', 'learning',
];

export async function runBenchmark(
  adapter: MemoryAdapter,
  tests: TestCase[],
  config: BenchmarkConfig = {},
): Promise<BenchmarkResult> {
  const startTime = Date.now();
  const categories = config.categories ?? ALL_CATEGORIES;

  // Filter tests based on config
  let filtered = tests.filter(t => categories.includes(t.category));

  if (config.tests?.length) {
    filtered = filtered.filter(t => config.tests!.includes(t.id));
  }

  if (!config.allowLlmJudge) {
    filtered = filtered.filter(t => !t.tags?.includes('llm-judge'));
  }

  if (!config.allowTimeSimulation) {
    filtered = filtered.filter(t => !t.tags?.includes('time-simulation'));
  }

  // Run tests sequentially (each test may mutate adapter state)
  const results: TestResult[] = [];

  for (const test of filtered) {
    if (config.verbose) {
      process.stdout.write(`  ${test.category}/${test.id} ... `);
    }

    // Reset adapter between tests for isolation
    await adapter.reset();

    try {
      const result = await test.run(adapter);
      results.push(result);

      if (config.verbose) {
        const icon = result.passed ? '✓' : '✗';
        console.log(`${icon} ${result.score.toFixed(2)}  ${result.details}`);
      }
    } catch (err) {
      const result: TestResult = {
        testId: test.id,
        score: 0,
        passed: false,
        details: `Error: ${err instanceof Error ? err.message : String(err)}`,
        durationMs: 0,
      };
      results.push(result);

      if (config.verbose) {
        console.log(`✗ ERROR  ${result.details}`);
      }
    }
  }

  // Score by category
  const categoryScores = scoreByCategory(results, filtered);

  // Overall score: weighted average of category scores
  const overallScore = categoryScores.length > 0
    ? categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length
    : 0;

  return {
    systemName: adapter.name,
    overallScore,
    categories: categoryScores,
    tests: results,
    totalDurationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    version: VERSION,
  };
}

function scoreByCategory(
  results: TestResult[],
  tests: TestCase[],
): CategoryScore[] {
  const byCategory = new Map<TestCategory, TestResult[]>();

  for (const result of results) {
    const test = tests.find(t => t.id === result.testId);
    if (!test) continue;
    const existing = byCategory.get(test.category) ?? [];
    existing.push(result);
    byCategory.set(test.category, existing);
  }

  return Array.from(byCategory.entries()).map(([category, categoryResults]) => {
    const score = categoryResults.length > 0
      ? categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length
      : 0;

    return {
      category,
      score,
      testsRun: categoryResults.length,
      testsPassed: categoryResults.filter(r => r.passed).length,
      testResults: categoryResults,
    };
  });
}

/** Print a formatted report of benchmark results */
export function formatReport(result: BenchmarkResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║                    RECALL Benchmark Results                 ║');
  lines.push('║  Retention · Encoding · Consolidation · Adaptation ·       ║');
  lines.push('║  Loss · Learning                                           ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`  System:  ${result.systemName}`);
  lines.push(`  Score:   ${(result.overallScore * 100).toFixed(1)}%`);
  lines.push(`  Tests:   ${result.tests.length} run, ${result.tests.filter(t => t.passed).length} passed`);
  lines.push(`  Time:    ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  lines.push('');
  lines.push('  ┌────────────────┬───────┬─────────────────┐');
  lines.push('  │ Category       │ Score │ Tests           │');
  lines.push('  ├────────────────┼───────┼─────────────────┤');

  const categoryLabels: Record<TestCategory, string> = {
    retention: 'R  Retention',
    encoding: 'E  Encoding',
    consolidation: 'C  Consolidation',
    adaptation: 'A  Adaptation',
    loss: 'L  Loss',
    learning: 'L  Learning',
  };

  for (const cat of result.categories) {
    const label = categoryLabels[cat.category].padEnd(14);
    const score = `${(cat.score * 100).toFixed(0)}%`.padStart(4);
    const tests = `${cat.testsPassed}/${cat.testsRun} passed`.padEnd(15);
    lines.push(`  │ ${label} │ ${score}  │ ${tests} │`);
  }

  lines.push('  └────────────────┴───────┴─────────────────┘');
  lines.push('');

  // Show failed tests
  const failed = result.tests.filter(t => !t.passed);
  if (failed.length > 0) {
    lines.push('  Failed tests:');
    for (const t of failed) {
      lines.push(`    ✗ ${t.testId}: ${t.details}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
