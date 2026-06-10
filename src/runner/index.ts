/**
 * RECALL Benchmark — Runner
 *
 * Loads scenario JSON files, executes them against an adapter on the
 * virtual clock, scores (Tier 1 always; Tier 2 if a judge is provided),
 * aggregates by dimension and axis, and formats reports.
 */

import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ScenarioSchema, axisOf, WORLD_DIMENSIONS, SELF_DIMENSIONS } from '../types/index.js';
import { scoreQuery, scoreScenario, aggregateDimensions } from '../scorer/index.js';
import type { JudgeRunner } from '../judge/index.js';
import type {
  BenchmarkResult,
  MemoryAdapter,
  Query,
  QueryScore,
  Scenario,
  ScenarioResult,
  QueryDimension,
} from '../types/index.js';

export const BENCHMARK_VERSION = '1.0.0';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RunConfig {
  /** Only run this scenario ID */
  scenario?: string;
  /** Print per-query details */
  verbose?: boolean;
  /** Tier 2: judge runner (queries with rubrics get an LLM-judged component) */
  judge?: JudgeRunner;
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(`${file}: invalid JSON — ${err}`);
    }
    const validated = ScenarioSchema.safeParse(parsed);
    if (!validated.success) {
      const issues = validated.error.issues
        .map(i => `  ${i.path.join('.')}: ${i.message}`)
        .join('\n');
      throw new Error(`${file}: scenario validation failed\n${issues}`);
    }
    scenarios.push(validated.data);
  }

  return scenarios;
}

/** Default virtual "now" for a query: 24h after the last session it ingested. */
export function defaultNow(scenario: Scenario, query: Query): string {
  const sessionCount = query.after_session ?? scenario.sessions.length;
  const last = scenario.sessions[sessionCount - 1].timestamp;
  return new Date(Date.parse(last) + DAY_MS).toISOString();
}

/**
 * Run one scenario: ingest sessions chronologically, executing each query at
 * its session boundary (after_session) or after all sessions, at its virtual now.
 */
export async function runScenario(
  adapter: MemoryAdapter,
  scenario: Scenario,
  config: RunConfig = {},
): Promise<ScenarioResult> {
  await adapter.reset();

  // Group queries by the number of sessions they should see
  const byBoundary = new Map<number, Query[]>();
  for (const query of scenario.queries) {
    const boundary = query.after_session ?? scenario.sessions.length;
    const arr = byBoundary.get(boundary) ?? [];
    arr.push(query);
    byBoundary.set(boundary, arr);
  }

  const executed: Array<{ query: Query; results: string[]; score: QueryScore }> = [];

  const runQueries = async (queries: Query[]) => {
    for (const query of queries) {
      const limit = Math.max(query.top_n ?? 5, 1);
      const now = query.now ?? defaultNow(scenario, query);
      const results = await adapter.query(query.question, { limit, now });

      let judgment: { score: number; rationale: string } | undefined;
      if (config.judge && query.judge) {
        judgment = await config.judge.judge(
          scenario.id,
          adapter.name,
          query.question,
          query.judge.rubric,
          results,
        );
      }

      const score = scoreQuery(query, results, judgment);
      executed.push({ query, results, score });

      if (config.verbose) {
        printQueryDetail(query, results, score);
      }
    }
  };

  for (let i = 0; i < scenario.sessions.length; i++) {
    const session = scenario.sessions[i];
    await adapter.processConversation(session.messages, {
      timestamp: session.timestamp,
      index: i + 1,
    });
    const boundaryQueries = byBoundary.get(i + 1);
    if (boundaryQueries) {
      await runQueries(boundaryQueries);
    }
  }

  // Preserve original query order in the result
  const order = new Map(scenario.queries.map((q, i) => [q, i]));
  executed.sort((a, b) => (order.get(a.query) ?? 0) - (order.get(b.query) ?? 0));

  return scoreScenario(scenario, executed);
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
    if (config.verbose) {
      console.log(
        `\n  ─ ${scenario.name} (${scenario.sessions.length} sessions, ${scenario.queries.length} queries)`,
      );
    }

    const scenarioResult = await runScenario(adapter, scenario, config);
    results.push(scenarioResult);

    if (config.verbose) {
      console.log(`    → scenario score: ${(scenarioResult.score * 100).toFixed(0)}%`);
    }
  }

  const { dimensions, axes, headline } = aggregateDimensions(results);

  return {
    benchmark: 'recall-bench',
    benchmarkVersion: BENCHMARK_VERSION,
    scenarioSet: basename(scenarioDir),
    adapter: adapter.name,
    timestamp: new Date().toISOString(),
    tier: config.judge ? 2 : 1,
    headline,
    axes,
    dimensions,
    scenarios: results,
    durationMs: Date.now() - startTime,
  };
}

// ─── Reporting ───────────────────────────────────────────────────────────────

function printQueryDetail(query: Query, results: string[], score: QueryScore): void {
  const icon = score.combined_score >= 0.5 ? '✓' : '✗';
  const dim = query.dimension.padEnd(18);
  console.log(`    ${icon} [${dim}] ${query.question}`);
  const parts = [
    `recall: ${fmt(score.recall_score)}`,
    `forget: ${fmt(score.forget_score)}`,
    `verbatim: ${fmt(score.verbatim_score)}`,
    `abstain: ${fmt(score.abstention_score)}`,
    `judge: ${fmt(score.judge_score)}`,
  ];
  console.log(`      score: ${score.combined_score.toFixed(2)}  (${parts.join(', ')})`);
  if (results.length > 0) {
    console.log(`      results: ${results.length} returned, first: "${truncate(results[0], 80)}"`);
  } else {
    console.log(`      results: (none — abstained)`);
  }
  if (score.judge_rationale) {
    console.log(`      judge: ${truncate(score.judge_rationale, 100)}`);
  }
}

/**
 * Format a benchmark result as a readable report.
 */
export function formatReport(result: BenchmarkResult): string {
  const lines: string[] = [];
  const pct = (n: number | null | undefined) =>
    n == null ? '  n/a' : `${(n * 100).toFixed(1)}%`.padStart(5);

  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║                   RECALL Benchmark Results                   ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`  Adapter:       ${result.adapter}`);
  lines.push(`  Scenario set:  ${result.scenarioSet}  (tier ${result.tier})`);
  lines.push('');
  lines.push(`  HEADLINE       ${pct(result.headline)}`);
  lines.push(`    world axis   ${pct(result.axes.world)}   (memory of the world)`);
  lines.push(`    self axis    ${pct(result.axes.self)}   (memory of self)`);
  lines.push('');

  // Dimension breakdown grouped by axis
  const printDims = (title: string, dims: readonly QueryDimension[]) => {
    const present = dims.filter(d => result.dimensions[d] != null);
    if (present.length === 0) return;
    lines.push(`  ${title}`);
    for (const dim of present) {
      const score = result.dimensions[dim]!;
      const bar = '█'.repeat(Math.round(score * 20)).padEnd(20, '░');
      lines.push(`    ${dim.padEnd(20)} ${bar} ${(score * 100).toFixed(0)}%`);
    }
    lines.push('');
  };

  printDims('Memory of the world:', WORLD_DIMENSIONS);
  printDims('Memory of self:', SELF_DIMENSIONS);

  // Scenario table
  lines.push('  Scenarios:');
  for (const s of result.scenarios) {
    const passed = s.queryResults.filter(q => q.score.combined_score >= 0.5).length;
    const total = s.queryResults.length;
    lines.push(
      `    ${(s.score * 100).toFixed(0).padStart(3)}%  ${s.scenarioName.padEnd(36)} ${passed}/${total} queries passed`,
    );
  }
  lines.push('');

  // Failed queries
  const failed: string[] = [];
  for (const s of result.scenarios) {
    for (const qr of s.queryResults) {
      if (qr.score.combined_score < 0.5) {
        failed.push(
          `    ✗ [${s.scenarioId} · ${qr.query.dimension}] ${qr.query.question} (${(qr.score.combined_score * 100).toFixed(0)}%)`,
        );
      }
    }
  }
  if (failed.length > 0) {
    lines.push(`  Failed queries (${failed.length}):`);
    lines.push(...failed);
    lines.push('');
  }

  lines.push(`  Completed in ${(result.durationMs / 1000).toFixed(1)}s`);
  lines.push('');

  return lines.join('\n');
}

function fmt(n: number | null): string {
  return n === null ? '—' : n.toFixed(2);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}
