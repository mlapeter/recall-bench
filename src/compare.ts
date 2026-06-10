#!/usr/bin/env node
/**
 * Side-by-side comparison of benchmark result JSONs.
 *
 * Usage: bun src/compare.ts results/naive-tier1.json results/verbatim-rag-tier1.json [...]
 */

import { readFile } from 'node:fs/promises';
import { WORLD_DIMENSIONS, SELF_DIMENSIONS } from './types/index.js';
import type { BenchmarkResult, QueryDimension } from './types/index.js';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: bun src/compare.ts <result.json> [<result.json> ...]');
  process.exit(1);
}

const results: BenchmarkResult[] = [];
for (const f of files) {
  results.push(JSON.parse(await readFile(f, 'utf-8')) as BenchmarkResult);
}

const pct = (n: number | null | undefined) => (n == null ? '   —' : `${(n * 100).toFixed(0)}%`.padStart(4));
const col = 14;

const header = ['', ...results.map(r => `${r.adapter} (t${r.tier})`.padStart(col))].join(' ');
console.log(header);
console.log('-'.repeat(header.length));

console.log(['HEADLINE'.padEnd(22), ...results.map(r => pct(r.headline).padStart(col))].join(' '));
console.log(['  world axis'.padEnd(22), ...results.map(r => pct(r.axes.world).padStart(col))].join(' '));
console.log(['  self axis'.padEnd(22), ...results.map(r => pct(r.axes.self).padStart(col))].join(' '));

const printDims = (title: string, dims: readonly QueryDimension[]) => {
  console.log(title);
  for (const dim of dims) {
    if (!results.some(r => r.dimensions[dim] != null)) continue;
    console.log([`  ${dim}`.padEnd(22), ...results.map(r => pct(r.dimensions[dim]).padStart(col))].join(' '));
  }
};

printDims('world:', WORLD_DIMENSIONS);
printDims('self:', SELF_DIMENSIONS);
