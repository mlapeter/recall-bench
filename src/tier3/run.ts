#!/usr/bin/env node
/**
 * Tier 3 runner CLI — behavioral uplift via paired runs.
 *
 * Usage:
 *   bun src/tier3/run.ts                          # verbatim-rag + LLM respond
 *   bun src/tier3/run.ts --adapter naive
 *   bun src/tier3/run.ts --scenarios scenarios/v1/tier3
 *
 * Requires ANTHROPIC_API_KEY (the respond() wrapper calls Claude; memory and
 * control arms use the identical model and prompt — only memory differs).
 */

import { resolve } from 'node:path';
import { loadTier3Scenarios, runTier3Scenario } from './index.js';
import { withLLMRespond } from './respond.js';
import { NaiveAdapter } from '../adapters/naive.js';
import { VerbatimRagAdapter } from '../adapters/verbatim-rag.js';
import type { MemoryAdapter } from '../types/index.js';

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < args.length && !args[idx + 1].startsWith('--') ? args[idx + 1] : undefined;
};

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Tier 3 requires ANTHROPIC_API_KEY (both arms call the same model; only memory differs).');
    process.exit(1);
  }

  const adapterName = getArg('adapter') ?? 'verbatim-rag';
  let adapter: MemoryAdapter;
  switch (adapterName) {
    case 'naive':
      adapter = withLLMRespond(new NaiveAdapter());
      break;
    case 'verbatim-rag':
      adapter = withLLMRespond(new VerbatimRagAdapter());
      break;
    default:
      console.error(`Unknown adapter: ${adapterName} (tier 3 built-ins: naive, verbatim-rag)`);
      process.exit(1);
  }

  const dir = resolve(getArg('scenarios') ?? resolve(import.meta.dirname ?? '.', '..', '..', 'scenarios', 'v1', 'tier3'));
  const scenarios = await loadTier3Scenarios(dir);

  console.log(`Tier 3 behavioral uplift — adapter "${adapter.name}" (paired runs, ${scenarios.length} scenario(s))\n`);

  for (const scenario of scenarios) {
    console.log(`${scenario.name} (${scenario.sessions.length} history sessions, ${scenario.probes.length} probes)`);
    const result = await runTier3Scenario(adapter, scenario, { verbose: true });
    console.log(`\n  memory arm:  ${(result.meanMemoryScore * 100).toFixed(0)}%`);
    console.log(`  control arm: ${(result.meanControlScore * 100).toFixed(0)}%`);
    console.log(`  UPLIFT:      ${result.meanUplift >= 0 ? '+' : ''}${(result.meanUplift * 100).toFixed(0)} points\n`);
  }
}

main().catch(err => {
  console.error('Tier 3 run failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
