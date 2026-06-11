#!/usr/bin/env node
/**
 * RECALL Benchmark CLI
 *
 * Usage:
 *   bun src/cli.ts                              # naive, all v1 scenarios, Tier 1
 *   bun src/cli.ts --adapter verbatim-rag       # the store-everything foil
 *   bun src/cli.ts --adapter engram             # engram (requires ANTHROPIC_API_KEY)
 *   bun src/cli.ts --scenario promotion-arc     # single scenario
 *   bun src/cli.ts --judge                      # Tier 2 (requires ANTHROPIC_API_KEY)
 *   bun src/cli.ts --json results.json          # write machine-readable results
 *   bun src/cli.ts --verbose                    # per-query details
 *   bun src/cli.ts --scenarios path/to/dir      # alternate scenario set
 */

import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { runBenchmark, formatReport } from './runner/index.js';
import { JudgeRunner } from './judge/index.js';
import { NaiveAdapter } from './adapters/naive.js';
import { VerbatimRagAdapter } from './adapters/verbatim-rag.js';
import { EngramAdapter } from './adapters/engram.js';
import type { MemoryAdapter } from './types/index.js';

const args = process.argv.slice(2);

function getFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  const val = args[idx + 1];
  return val.startsWith('--') ? undefined : val;
}

async function main() {
  const adapterName = getArg('adapter') ?? 'naive';
  const verbose = getFlag('verbose');
  const scenario = getArg('scenario');
  const jsonPath = getArg('json');
  const useJudge = getFlag('judge');

  let adapter: MemoryAdapter;
  switch (adapterName) {
    case 'naive':
      adapter = new NaiveAdapter();
      break;
    case 'verbatim-rag':
      adapter = new VerbatimRagAdapter();
      break;
    case 'engram':
      adapter = new EngramAdapter({
        engramPath: getArg('engram-path'),
        tempDataDir: '/tmp/recall-bench-engram',
      });
      break;
    default:
      console.error(`Unknown adapter: ${adapterName}`);
      console.error('Built-in adapters: naive, verbatim-rag.');
      console.error('  engram is also wired up but requires an external ~/claude-engram checkout.');
      process.exit(1);
  }

  let judge: JudgeRunner | undefined;
  if (useJudge) {
    JudgeRunner.assertAvailable();
    judge = new JudgeRunner();
  }

  const scenarioDir = getArg('scenarios')
    ? resolve(getArg('scenarios')!)
    : resolve(import.meta.dirname ?? '.', '..', 'scenarios', 'v1');

  console.log(
    `Running RECALL benchmark against "${adapter.name}" (tier ${useJudge ? 2 : 1})...`,
  );

  const result = await runBenchmark(adapter, scenarioDir, { scenario, verbose, judge });
  console.log(formatReport(result));

  if (jsonPath) {
    await writeFile(jsonPath, JSON.stringify(result, null, 2));
    console.log(`Results written to ${jsonPath}`);
  }
}

main().catch(err => {
  console.error('Benchmark failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
