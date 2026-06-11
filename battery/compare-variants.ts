/**
 * Validity battery, check 5 — variant stability analysis.
 *
 * Compares two results JSON files (original corpus vs seed-42 variants) and
 * reports per-dimension deltas plus the most unstable scenarios (largest
 * |scenario score delta|), with the queries that moved.
 *
 * Usage: bun battery/compare-variants.ts <orig.json> <variant.json>
 */

import { readFileSync } from 'node:fs';

interface QueryResult {
  query: { question: string; dimension: string };
  results: string[];
  score: { combined_score: number };
}
interface ScenarioResult {
  scenarioId: string;
  score: number;
  queryResults: QueryResult[];
}
interface ResultsFile {
  adapter: string;
  headline: number;
  dimensions: Record<string, number>;
  scenarios: ScenarioResult[];
}

const [origPath, varPath] = process.argv.slice(2);
const orig = JSON.parse(readFileSync(origPath, 'utf-8')) as ResultsFile;
const vari = JSON.parse(readFileSync(varPath, 'utf-8')) as ResultsFile;

const pct = (n: number) => (n * 100).toFixed(1);

console.log(`adapter: ${orig.adapter}`);
console.log(`headline: ${pct(orig.headline)} → ${pct(vari.headline)} (Δ ${pct(vari.headline - orig.headline)})`);
console.log('\nper-dimension deltas:');
for (const dim of Object.keys(orig.dimensions).sort()) {
  const a = orig.dimensions[dim];
  const b = vari.dimensions[dim] ?? 0;
  const d = b - a;
  const flag = Math.abs(d) >= 0.05 ? '  <-- unstable' : '';
  console.log(`  ${dim.padEnd(20)} ${pct(a).padStart(5)} → ${pct(b).padStart(5)}  Δ ${(d >= 0 ? '+' : '') + pct(d)}${flag}`);
}

const varById = new Map(vari.scenarios.map(s => [s.scenarioId.replace(/-var\d+$/, ''), s]));
const deltas = orig.scenarios
  .map(s => {
    const v = varById.get(s.scenarioId);
    return v ? { id: s.scenarioId, orig: s, vari: v, delta: v.score - s.score } : null;
  })
  .filter((x): x is NonNullable<typeof x> => x !== null)
  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

console.log('\nmost unstable scenarios (|scenario score delta|):');
for (const d of deltas.slice(0, 10)) {
  console.log(`\n  ${d.id}: ${pct(d.orig.score)} → ${pct(d.vari.score)} (Δ ${(d.delta >= 0 ? '+' : '') + pct(d.delta)})`);
  for (let i = 0; i < d.orig.queryResults.length; i++) {
    const qo = d.orig.queryResults[i];
    const qv = d.vari.queryResults[i];
    if (!qv) continue;
    const qd = qv.score.combined_score - qo.score.combined_score;
    if (Math.abs(qd) >= 0.15) {
      console.log(`    [${qo.query.dimension}] ${qo.query.question.slice(0, 80)}`);
      console.log(`      ${qo.score.combined_score.toFixed(2)} → ${qv.score.combined_score.toFixed(2)}`);
    }
  }
}
