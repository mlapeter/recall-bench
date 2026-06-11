/**
 * Validity battery, checks 3+4 — run Tier 1 engram under a named config.
 *
 * Each named config gets a fresh temp data dir with a config.json that
 * engram's own loadConfig() picks up (ENGRAM_DATA_DIR is set by the adapter).
 * Engram source and the published adapter are untouched; this only exercises
 * engram's supported configuration surface.
 *
 * Usage: bun battery/run-engram-config.ts <baseline1|baseline2|decay-off|embeddings-off>
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBenchmark, formatReport } from '../src/runner/index.js';
import { EngramAdapter } from '../src/adapters/engram.js';

const CONFIGS: Record<string, Record<string, unknown>> = {
  // Published defaults — run twice for the run-to-run noise bar
  'baseline1': {},
  'baseline2': {},
  // Decay mechanism off
  'decay-off': { decayRate: 0, archiveDecayRate: 0 },
  // Token-only retrieval (no vector search)
  'embeddings-off': { embeddingsEnabled: false },
};

const name = process.argv[2];
if (!name || !(name in CONFIGS)) {
  console.error(`Usage: bun battery/run-engram-config.ts <${Object.keys(CONFIGS).join('|')}>`);
  process.exit(1);
}

const tempDir = `/tmp/recall-bench-engram-battery-${name}`;
rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });
writeFileSync(`${tempDir}/config.json`, JSON.stringify(CONFIGS[name], null, 2));

const adapter = new EngramAdapter({ tempDataDir: tempDir });
const scenarioDir = resolve(import.meta.dirname, '..', 'scenarios', 'v1');

const result = await runBenchmark(adapter, scenarioDir, {});
console.log(formatReport(result));

const outPath = resolve(import.meta.dirname, 'out', `engram-${name}.json`);
await writeFile(outPath, JSON.stringify(result, null, 2));
console.log(`Results written to ${outPath}`);
