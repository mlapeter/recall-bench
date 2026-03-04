#!/usr/bin/env node
/**
 * RECALL Benchmark CLI
 *
 * Usage:
 *   bun run src/cli.ts                     # Run all tests against naive baseline
 *   bun run src/cli.ts --adapter naive      # Explicit adapter selection
 *   bun run src/cli.ts --verbose            # Show individual test results
 *   bun run src/cli.ts --category retention # Run specific category
 */

import { allTests } from './tests/index.js';
import { runBenchmark, formatReport } from './runner/index.js';
import { NaiveAdapter } from './adapters/index.js';
import type { BenchmarkConfig, TestCategory } from './types/index.js';

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
  const categoryArg = getArg('category');

  // Select adapter
  let adapter;
  switch (adapterName) {
    case 'naive':
      adapter = new NaiveAdapter();
      break;
    default:
      console.error(`Unknown adapter: ${adapterName}`);
      console.error('Available adapters: naive');
      process.exit(1);
  }

  // Build config
  const config: BenchmarkConfig = {
    verbose,
    allowTimeSimulation: true,
    allowLlmJudge: false,
  };

  if (categoryArg) {
    const valid: TestCategory[] = ['retention', 'encoding', 'consolidation', 'adaptation', 'loss', 'learning'];
    if (!valid.includes(categoryArg as TestCategory)) {
      console.error(`Unknown category: ${categoryArg}`);
      console.error(`Valid categories: ${valid.join(', ')}`);
      process.exit(1);
    }
    config.categories = [categoryArg as TestCategory];
  }

  console.log(`Running RECALL benchmark against "${adapter.name}"...`);
  if (verbose) console.log('');

  const result = await runBenchmark(adapter, allTests, config);
  console.log(formatReport(result));
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
