/**
 * Vclock follow-up battery — run Tier 1 engram-vclock under a named config.
 *
 * Mirrors battery/run-engram-config.ts but uses the virtual-clock-corrected
 * adapter (src/adapters/engram-vclock.ts). Each named config gets a fresh
 * temp data dir with a config.json that engram's own loadConfig() picks up
 * (ENGRAM_DATA_DIR is set by the adapter). Engram source and the published
 * adapter are untouched.
 *
 * Usage: bun battery/run-engram-vclock.ts <baseline1|baseline2|decay-off|interference-on>
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBenchmark, formatReport } from '../src/runner/index.js';
import { EngramVclockAdapter } from '../src/adapters/engram-vclock.js';

const CONFIGS: Record<string, { config: Record<string, unknown>; interference: boolean }> = {
  // Vclock defaults — run twice for the run-to-run noise bar
  'baseline1': { config: {}, interference: false },
  'baseline2': { config: {}, interference: false },
  // Decay mechanism off (now that decay actually runs, this should matter)
  'decay-off': { config: { decayRate: 0, archiveDecayRate: 0 }, interference: false },
  // Interference on (on-stop hook parity), default factor
  'interference-on': { config: {}, interference: true },
  // Second interference run — confirms/refutes the procedural & sacred-verbatim
  // side-effect dips seen in the first (both ~2× noise, single run)
  'interference-on2': { config: {}, interference: true },
};

const name = process.argv[2];
if (!name || !(name in CONFIGS)) {
  console.error(`Usage: bun battery/run-engram-vclock.ts <${Object.keys(CONFIGS).join('|')}>`);
  process.exit(1);
}

const { config, interference } = CONFIGS[name];
const tempDir = `/tmp/recall-bench-engram-vclock-${name}`;
rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });
writeFileSync(`${tempDir}/config.json`, JSON.stringify(config, null, 2));

const adapter = new EngramVclockAdapter({ tempDataDir: tempDir, interference });
const scenarioDir = resolve(import.meta.dirname, '..', 'scenarios', 'v1');

const result = await runBenchmark(adapter, scenarioDir, {});
console.log(formatReport(result));

const outPath = resolve(import.meta.dirname, 'out', `engram-vclock-${name}.json`);
await writeFile(outPath, JSON.stringify(result, null, 2));
console.log(`Results written to ${outPath}`);
