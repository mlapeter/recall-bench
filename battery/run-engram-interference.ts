/**
 * Validity battery, check 3 addendum — engram with interference applied
 * (the on-stop hook path), default config. See worklog predictions.
 *
 * Usage: bun battery/run-engram-interference.ts
 */

import { mkdirSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBenchmark, formatReport } from '../src/runner/index.js';
import { EngramInterferenceAdapter } from '../src/adapters/engram-interference.js';

const tempDir = '/tmp/recall-bench-engram-battery-interference-on';
rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });

const adapter = new EngramInterferenceAdapter({ tempDataDir: tempDir });
const scenarioDir = resolve(import.meta.dirname, '..', 'scenarios', 'v1');

const result = await runBenchmark(adapter, scenarioDir, {});
console.log(formatReport(result));

const outPath = resolve(import.meta.dirname, 'out', 'engram-interference-on.json');
await writeFile(outPath, JSON.stringify(result, null, 2));
console.log(`Results written to ${outPath}`);
