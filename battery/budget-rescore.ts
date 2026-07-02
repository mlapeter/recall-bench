/**
 * Injection-budget rescore — v2 proof-of-concept, $0.
 *
 * Re-scores existing Tier 1 result JSONs with a per-query cap on injected
 * tokens (approx: chars/4). Truncation is whole-result: results are kept in
 * returned order while the running total stays within budget; the first
 * result that would exceed it (and everything after) is dropped. Deployment
 * analogy: discrete memory items injected into a fresh session until the
 * budget is exhausted.
 *
 * Uses the frozen scorer/aggregation as-is (imported, not modified).
 * Scenario objects are loaded from the frozen corpus for scoreScenario.
 *
 * Usage: bun battery/budget-rescore.ts <result.json> [...] --budgets 400,200,100,50
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadScenarios } from '../src/runner/index.js';
import { scoreQuery, scoreScenario, aggregateDimensions } from '../src/scorer/index.js';
import type { BenchmarkResult, Query, QueryScore, Scenario, ScenarioResult } from '../src/types/index.js';

const args = process.argv.slice(2);
const bIdx = args.indexOf('--budgets');
const budgets = bIdx === -1 ? [400, 200, 100, 50] : args[bIdx + 1].split(',').map(Number);
const files = args.filter(a => a.endsWith('.json'));
if (files.length === 0) {
  console.error('Usage: bun battery/budget-rescore.ts <result.json> [...] --budgets 400,200,100,50');
  process.exit(1);
}

const approxTokens = (s: string) => Math.ceil(s.length / 4);

function truncateToBudget(results: string[], budget: number): string[] {
  const kept: string[] = [];
  let total = 0;
  for (const r of results) {
    const t = approxTokens(r);
    if (total + t > budget) break;
    kept.push(r);
    total += t;
  }
  return kept;
}

const scenarioDir = resolve(import.meta.dirname, '..', 'scenarios', 'v1');
const scenarioById = new Map<string, Scenario>();
for (const s of await loadScenarios(scenarioDir)) scenarioById.set(s.id, s);

interface Row {
  adapter: string;
  budget: number | null;
  headline: number;
  meanInjected: number;
  dims: Partial<Record<string, number | null>>;
}
const rows: Row[] = [];

for (const file of files) {
  const original = JSON.parse(await readFile(file, 'utf-8')) as BenchmarkResult;

  for (const budget of [null, ...budgets] as Array<number | null>) {
    const scenarioResults: ScenarioResult[] = [];
    let injectedTotal = 0;
    let queryCount = 0;

    for (const sr of original.scenarios) {
      const scenario = scenarioById.get(sr.scenarioId);
      if (!scenario) throw new Error(`Scenario ${sr.scenarioId} not in frozen corpus`);

      const executed: Array<{ query: Query; results: string[]; score: QueryScore }> = [];
      for (const qr of sr.queryResults) {
        const results = budget === null ? qr.results : truncateToBudget(qr.results, budget);
        injectedTotal += results.reduce((t, r) => t + approxTokens(r), 0);
        queryCount++;
        executed.push({ query: qr.query, results, score: scoreQuery(qr.query, results) });
      }
      scenarioResults.push(scoreScenario(scenario, executed));
    }

    const { dimensions, headline } = aggregateDimensions(scenarioResults);
    rows.push({
      adapter: original.adapter,
      budget,
      headline: headline ?? 0,
      meanInjected: Math.round(injectedTotal / queryCount),
      dims: dimensions,
    });
  }
}

// Sanity: budget=null must reproduce the recorded headline exactly
for (const file of files) {
  const original = JSON.parse(await readFile(file, 'utf-8')) as BenchmarkResult;
  const row = rows.find(r => r.adapter === original.adapter && r.budget === null)!;
  const diff = Math.abs(row.headline - (original.headline ?? 0));
  if (diff > 1e-9) {
    console.error(`WARNING: rescore(∞) ≠ recorded headline for ${original.adapter}: ${row.headline} vs ${original.headline}`);
  }
}

const pct = (n: number | null | undefined) => (n == null ? '   —' : `${(n * 100).toFixed(1)}`.padStart(5));

console.log('\n═══ HEADLINE by injection budget (approx tokens/query) ═══\n');
const adapters = [...new Set(rows.map(r => r.adapter))];
const budgetCols = [null, ...budgets] as Array<number | null>;
console.log(['adapter'.padEnd(16), ...budgetCols.map(b => (b === null ? '∞' : String(b)).padStart(7))].join(''));
for (const a of adapters) {
  const line = budgetCols.map(b => {
    const r = rows.find(x => x.adapter === a && x.budget === b)!;
    return pct(r.headline).padStart(7);
  });
  console.log([a.padEnd(16), ...line].join(''));
}

console.log('\n═══ Mean injected tokens/query (after truncation) ═══\n');
console.log(['adapter'.padEnd(16), ...budgetCols.map(b => (b === null ? '∞' : String(b)).padStart(7))].join(''));
for (const a of adapters) {
  const line = budgetCols.map(b => String(rows.find(x => x.adapter === a && x.budget === b)!.meanInjected).padStart(7));
  console.log([a.padEnd(16), ...line].join(''));
}

console.log('\n═══ Score per 100 injected tokens (headline% ÷ meanInjected × 100; ∞ column) ═══\n');
for (const a of adapters) {
  const r = rows.find(x => x.adapter === a && x.budget === null)!;
  const eff = r.meanInjected === 0 ? null : (r.headline * 100 / r.meanInjected) * 100;
  console.log(`${a.padEnd(16)} ${eff === null ? '— (injects nothing)' : eff.toFixed(1)}`);
}

console.log('\n═══ Key dimensions at each budget ═══');
for (const dim of ['decay', 'calibration', 'salience', 'sacred-verbatim', 'correction']) {
  console.log(`\n${dim}:`);
  console.log(['adapter'.padEnd(16), ...budgetCols.map(b => (b === null ? '∞' : String(b)).padStart(7))].join(''));
  for (const a of adapters) {
    const line = budgetCols.map(b => pct(rows.find(x => x.adapter === a && x.budget === b)!.dims[dim] as number | null).padStart(7));
    console.log([a.padEnd(16), ...line].join(''));
  }
}
