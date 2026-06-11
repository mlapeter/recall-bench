/**
 * Validity battery, check 6 — judge audit sample extraction.
 *
 * Reads Tier 2 results JSONs (one per adapter) and emits a human-review
 * markdown file with judged self-continuity and relational verdicts: question,
 * the adapter's returned memories, the rubric, the judge's score and
 * rationale. Mixes high and low scores across all provided adapters.
 * The point is for a HUMAN to spot-check the judge's attribution calls —
 * this script does not grade the judge.
 *
 * Usage: bun battery/extract-judge-audit.ts out.md tier2-a.json tier2-b.json ...
 */

import { readFileSync, writeFileSync } from 'node:fs';

interface QueryResult {
  query: {
    question: string;
    dimension: string;
    judge?: { rubric: string };
  };
  results: string[];
  score: { judge_score: number | null; judge_rationale?: string; combined_score: number };
}
interface ResultsFile {
  adapter: string;
  scenarios: Array<{ scenarioId: string; queryResults: QueryResult[] }>;
}

const [outPath, ...inputs] = process.argv.slice(2);
if (!outPath || inputs.length === 0) {
  console.error('Usage: bun battery/extract-judge-audit.ts <out.md> <tier2.json>...');
  process.exit(1);
}

const AUDIT_DIMENSIONS = new Set(['self-continuity', 'relational']);
const TARGET = 20;

interface Sample {
  adapter: string;
  scenarioId: string;
  qr: QueryResult;
}

const all: Sample[] = [];
for (const path of inputs) {
  const data = JSON.parse(readFileSync(path, 'utf-8')) as ResultsFile;
  for (const s of data.scenarios) {
    for (const qr of s.queryResults) {
      if (!AUDIT_DIMENSIONS.has(qr.query.dimension)) continue;
      if (qr.score.judge_score == null || !qr.query.judge) continue;
      all.push({ adapter: data.adapter, scenarioId: s.scenarioId, qr });
    }
  }
}

// Stratify: alternate high (≥0.75) / mid / low (≤0.25) scores, round-robin by adapter.
const high = all.filter(s => s.qr.score.judge_score! >= 0.75);
const low = all.filter(s => s.qr.score.judge_score! <= 0.25);
const mid = all.filter(s => s.qr.score.judge_score! > 0.25 && s.qr.score.judge_score! < 0.75);

function roundRobinByAdapter(samples: Sample[]): Sample[] {
  const byAdapter = new Map<string, Sample[]>();
  for (const s of samples) {
    const arr = byAdapter.get(s.adapter) ?? [];
    arr.push(s);
    byAdapter.set(s.adapter, arr);
  }
  const out: Sample[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const arr of byAdapter.values()) {
      const next = arr.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

const picked: Sample[] = [];
const pools = [roundRobinByAdapter(high), roundRobinByAdapter(low), roundRobinByAdapter(mid)];
outer: while (picked.length < TARGET) {
  let any = false;
  for (const pool of pools) {
    const next = pool.shift();
    if (next) {
      picked.push(next);
      any = true;
      if (picked.length >= TARGET) break outer;
    }
  }
  if (!any) break;
}

const lines: string[] = [];
lines.push('# Judge audit sample — self-continuity & relational verdicts');
lines.push('');
lines.push(
  `${picked.length} judged verdicts sampled across ${new Set(picked.map(p => p.adapter)).size} adapters, mixing high and low judge scores. For each: read the question, the memories the adapter returned, and the rubric — then decide whether YOU agree with the judge's score, especially its attribution calls (does the output show the ASSISTANT's own stance/register, or just text about it?). This file was generated mechanically; nobody has graded the judge.`,
);
lines.push('');

picked.sort((a, b) => a.adapter.localeCompare(b.adapter) || a.scenarioId.localeCompare(b.scenarioId));

picked.forEach((s, i) => {
  const { qr } = s;
  lines.push(`---`);
  lines.push('');
  lines.push(`## ${i + 1}. [${qr.query.dimension}] ${s.scenarioId} — adapter: ${s.adapter}`);
  lines.push('');
  lines.push(`**Question:** ${qr.query.question}`);
  lines.push('');
  lines.push(`**Adapter returned (${qr.results.length} memories):**`);
  lines.push('');
  if (qr.results.length === 0) {
    lines.push('> (abstained — no results)');
  } else {
    for (const r of qr.results) {
      lines.push(`> - ${r.replace(/\n/g, ' ').slice(0, 600)}`);
    }
  }
  lines.push('');
  lines.push(`**Rubric:** ${qr.query.judge!.rubric}`);
  lines.push('');
  lines.push(`**Judge score: ${qr.score.judge_score}**`);
  lines.push('');
  lines.push(`**Judge rationale:** ${qr.score.judge_rationale ?? '(none recorded)'}`);
  lines.push('');
  lines.push(`**Human verdict (fill in):** agree / disagree — notes:`);
  lines.push('');
});

writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${picked.length} samples (${high.length} high / ${mid.length} mid / ${low.length} low available) to ${outPath}`);
