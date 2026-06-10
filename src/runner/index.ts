/**
 * RECALL Benchmark — Runner
 *
 * Loads scenario JSON files, runs them against an adapter, reports results.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ScenarioSchema } from '../types/index.js';
import { scoreScenario } from '../scorer/index.js';
import type {
  BenchmarkResult,
  MemoryAdapter,
  Scenario,
  ScenarioResult,
  QueryDimension,
} from '../types/index.js';

export interface RunConfig {
  /** Only run this scenario ID */
  scenario?: string;
  /** Print per-query details */
  verbose?: boolean;
}

/**
 * Load and validate all scenario JSON files from a directory.
 */
export async function loadScenarios(dir: string): Promise<Scenario[]> {
  const files = await readdir(dir);
  const jsonFiles = files.filter(f => f.endsWith('.json')).sort();

  const scenarios: Scenario[] = [];
  for (const file of jsonFiles) {
    const raw = await readFile(join(dir, file), 'utf-8');
    const parsed = JSON.parse(raw);
    const validated = ScenarioSchema.parse(parsed);
    scenarios.push(validated);
  }

  return scenarios;
}

/**
 * Run all scenarios against an adapter.
 */
export async function runBenchmark(
  adapter: MemoryAdapter,
  scenarioDir: string,
  config: RunConfig = {},
): Promise<BenchmarkResult> {
  const startTime = Date.now();
  let scenarios = await loadScenarios(scenarioDir);

  if (config.scenario) {
    scenarios = scenarios.filter(s => s.id === config.scenario);
    if (scenarios.length === 0) {
      throw new Error(`Scenario "${config.scenario}" not found`);
    }
  }

  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    await adapter.reset();

    if (config.verbose) {
      console.log(`\n  ─ ${scenario.name} (${scenario.sessions.length} sessions, ${scenario.queries.length} queries)`);
    }

    // Feed all conversation sessions in order
    for (const session of scenario.sessions) {
      await adapter.processConversation(session.messages);
    }

    // Run all queries
    const queryResults: Array<{ query: typeof scenario.queries[0]; results: string[] }> = [];
    for (const query of scenario.queries) {
      const limit = query.top_n ?? 5;
      const queryLimit = query.max_results != null ? Math.max(limit, 1) : limit;
      const results = await adapter.query(query.question, queryLimit);
      queryResults.push({ query, results });

      if (config.verbose) {
        const score = (await import('../scorer/index.js')).scoreQuery(query, results);
        const icon = score.combined_score >= 0.5 ? '✓' : '✗';
        const dim = query.dimension.padEnd(12);
        console.log(`    ${icon} [${dim}] ${query.question}`);
        console.log(`      score: ${score.combined_score.toFixed(2)}  (recall: ${fmt(score.recall_score)}, forget: ${fmt(score.forget_score)}, abstain: ${fmt(score.abstention_score)})`);
        if (results.length > 0) {
          console.log(`      results: ${results.length} returned, first: "${truncate(results[0], 80)}"`);
        } else {
          console.log(`      results: (none)`);
        }
      }
    }

    const scenarioResult = scoreScenario(scenario, queryResults);
    results.push(scenarioResult);

    if (config.verbose) {
      console.log(`    → scenario score: ${(scenarioResult.score * 100).toFixed(0)}%`);
    }
  }

  const overallScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.score, 0) / results.length
    : 0;

  return {
    adapterName: adapter.name,
    scenarios: results,
    overallScore,
    totalDurationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format a benchmark result as a readable report.
 */
export function formatReport(result: BenchmarkResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║                    RECALL Benchmark Results                 ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`  Adapter:  ${result.adapterName}`);
  lines.push(`  Score:    ${(result.overallScore * 100).toFixed(1)}%`);
  lines.push(`  Time:     ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  lines.push('');

  // Scenario table
  lines.push('  ┌──────────────────────────┬───────┬─────────────────────────┐');
  lines.push('  │ Scenario                 │ Score │ Queries                 │');
  lines.push('  ├──────────────────────────┼───────┼─────────────────────────┤');

  for (const s of result.scenarios) {
    const name = s.scenarioName.padEnd(24);
    const score = `${(s.score * 100).toFixed(0)}%`.padStart(4);
    const passed = s.queryResults.filter(q => q.score.combined_score >= 0.5).length;
    const total = s.queryResults.length;
    const queries = `${passed}/${total} passed`.padEnd(23);
    lines.push(`  │ ${name} │ ${score}  │ ${queries} │`);
  }

  lines.push('  └──────────────────────────┴───────┴─────────────────────────┘');
  lines.push('');

  // Dimension breakdown
  const dimScores = new Map<QueryDimension, number[]>();
  for (const s of result.scenarios) {
    for (const qr of s.queryResults) {
      const dim = qr.query.dimension;
      const arr = dimScores.get(dim) ?? [];
      arr.push(qr.score.combined_score);
      dimScores.set(dim, arr);
    }
  }

  if (dimScores.size > 0) {
    lines.push('  By dimension:');
    const sortedDims = [...dimScores.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [dim, scores] of sortedDims) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const bar = '█'.repeat(Math.round(avg * 20)).padEnd(20, '░');
      lines.push(`    ${dim.padEnd(14)} ${bar} ${(avg * 100).toFixed(0)}%`);
    }
    lines.push('');
  }

  // Failed queries
  const failed: string[] = [];
  for (const s of result.scenarios) {
    for (const qr of s.queryResults) {
      if (qr.score.combined_score < 0.5) {
        failed.push(`    ✗ [${s.scenarioId}] ${qr.query.question} (${(qr.score.combined_score * 100).toFixed(0)}%)`);
      }
    }
  }

  if (failed.length > 0) {
    lines.push(`  Failed queries (${failed.length}):`);
    lines.push(...failed);
    lines.push('');
  }

  return lines.join('\n');
}

function fmt(n: number | null): string {
  return n === null ? 'n/a' : n.toFixed(2);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}
