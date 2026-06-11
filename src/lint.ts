#!/usr/bin/env node
/**
 * RECALL Benchmark — Scenario Linter
 *
 * Mechanical checks on a scenario directory, beyond schema validation:
 *  - id matches filename
 *  - every should_recall entry has ≥1 |-alternate appearing in session text
 *    (within the query's after_session window)
 *  - every must_include_verbatim phrase appears exactly in session text
 *  - every should_forget entry appears somewhere in session text (a forget
 *    trap that never existed tests nothing)
 *  - dimension coverage summary (scenarios + queries per dimension)
 *
 * Usage: bun src/lint.ts [--scenarios <dir>]
 */

import { resolve } from 'node:path';
import { loadScenarios } from './runner/index.js';
import { ALL_DIMENSIONS } from './types/index.js';
import type { QueryDimension, Scenario } from './types/index.js';

function sessionText(scenario: Scenario, upTo: number): string {
  return scenario.sessions
    .slice(0, upTo)
    .map(s => s.messages.map(m => m.content).join('\n'))
    .join('\n')
    .toLowerCase();
}

export interface LintIssue {
  scenarioId: string;
  severity: 'error' | 'warn';
  message: string;
}

export function lintScenarios(scenarios: Scenario[], fileIds?: Map<string, string>): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const scenario of scenarios) {
    const expectedFile = fileIds?.get(scenario.id);
    if (fileIds && expectedFile !== `${scenario.id}.json`) {
      issues.push({
        scenarioId: scenario.id,
        severity: 'error',
        message: `id "${scenario.id}" does not match filename "${expectedFile}"`,
      });
    }

    for (const [qi, query] of scenario.queries.entries()) {
      const window = query.after_session ?? scenario.sessions.length;
      const text = sessionText(scenario, window);

      for (const entry of query.should_recall) {
        const alternates = entry.split('|').map(a => a.trim().toLowerCase()).filter(Boolean);
        if (!alternates.some(a => text.includes(a))) {
          issues.push({
            scenarioId: scenario.id,
            severity: 'error',
            message: `query ${qi + 1} recall anchor "${entry}" not found in session text (first ${window} sessions)`,
          });
        }
        // Anchor leakage: if every alternate appears in the question itself,
        // an adapter that echoes the question earns recall credit for free.
        const question = query.question.toLowerCase();
        if (alternates.length > 0 && alternates.some(a => question.includes(a))) {
          issues.push({
            scenarioId: scenario.id,
            severity: 'warn',
            message: `query ${qi + 1} recall anchor "${entry}" appears in the question text — echoing the question earns credit`,
          });
        }
      }

      for (const entry of query.should_forget) {
        const alternates = entry.split('|').map(a => a.trim().toLowerCase()).filter(Boolean);
        if (!alternates.some(a => text.includes(a))) {
          issues.push({
            scenarioId: scenario.id,
            severity: 'warn',
            message: `query ${qi + 1} forget anchor "${entry}" never appears in session text — trap tests nothing`,
          });
        }
      }

      for (const phrase of query.must_include_verbatim ?? []) {
        if (!text.includes(phrase.toLowerCase())) {
          issues.push({
            scenarioId: scenario.id,
            severity: 'error',
            message: `query ${qi + 1} verbatim phrase "${phrase}" not found exactly in session text`,
          });
        }
      }
    }
  }

  return issues;
}

export function coverageSummary(scenarios: Scenario[]): string {
  const byDim = new Map<QueryDimension, { scenarios: Set<string>; queries: number }>();
  for (const s of scenarios) {
    for (const q of s.queries) {
      const entry = byDim.get(q.dimension) ?? { scenarios: new Set(), queries: 0 };
      entry.scenarios.add(s.id);
      entry.queries++;
      byDim.set(q.dimension, entry);
    }
  }
  const lines = [`${scenarios.length} scenarios, ${scenarios.reduce((n, s) => n + s.queries.length, 0)} queries`];
  for (const dim of ALL_DIMENSIONS) {
    const entry = byDim.get(dim);
    const mark = (entry?.scenarios.size ?? 0) >= 4 ? ' ' : '⚠';
    lines.push(
      `  ${mark} ${dim.padEnd(20)} ${String(entry?.scenarios.size ?? 0).padStart(2)} scenarios, ${String(entry?.queries ?? 0).padStart(3)} queries`,
    );
  }
  return lines.join('\n');
}

const isMain = process.argv[1]?.endsWith('lint.ts') || process.argv[1]?.endsWith('lint.js');
if (isMain) {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--scenarios');
  const dir = resolve(idx !== -1 && args[idx + 1] ? args[idx + 1] : 'scenarios/v1');

  const scenarios = await loadScenarios(dir);
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
  const fileIds = new Map<string, string>();
  for (const f of files) fileIds.set(f.replace(/\.json$/, ''), f);

  const issues = lintScenarios(scenarios, fileIds);
  const errors = issues.filter(i => i.severity === 'error');
  const warns = issues.filter(i => i.severity === 'warn');

  console.log(coverageSummary(scenarios));
  console.log('');
  for (const issue of issues) {
    console.log(`  ${issue.severity === 'error' ? '✗' : '⚠'} [${issue.scenarioId}] ${issue.message}`);
  }
  console.log(`\n${errors.length} errors, ${warns.length} warnings`);
  if (errors.length > 0) process.exit(1);
}
