#!/usr/bin/env node
/**
 * RECALL Benchmark CLI
 *
 * Usage:
 *   bun run src/cli.ts                              # naive, all scenarios
 *   bun run src/cli.ts --adapter engram             # engram, all scenarios
 *   bun run src/cli.ts --scenario promotion-arc     # single scenario
 *   bun run src/cli.ts --verbose                    # show per-query details
 */

import { resolve } from 'node:path';
import { runBenchmark, formatReport } from './runner/index.js';
import { NaiveAdapter } from './adapters/naive.js';
import { EngramAdapter } from './adapters/engram.js';
import type { MemoryAdapter } from './types/index.js';

const args = process.argv.slice(2);

function getFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

async function main() {
  const adapterName = getArg('adapter') ?? 'naive';
  const verbose = getFlag('verbose');
  const scenario = getArg('scenario');

  // Select adapter
  let adapter: MemoryAdapter;
  switch (adapterName) {
    case 'naive':
      adapter = new NaiveAdapter();
      break;
    case 'engram':
      adapter = new EngramAdapter({
        engramPath: getArg('engram-path'),
        tempDataDir: '/tmp/recall-bench-engram',
      });
      break;
    default:
      console.error(`Unknown adapter: ${adapterName}`);
      console.error('Available adapters: naive, engram');
      process.exit(1);
  }

  // Resolve scenarios directory
  const scenarioDir = resolve(import.meta.dirname ?? '.', '..', 'scenarios');

  console.log(`Running RECALL benchmark against "${adapter.name}"...`);

  const result = await runBenchmark(adapter, scenarioDir, { scenario, verbose });
  console.log(formatReport(result));
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
