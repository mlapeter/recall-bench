#!/usr/bin/env node
/**
 * RECALL Benchmark — Scenario Variant Generator
 *
 * Produces structural variants of a scenario from a seed: invented proper
 * nouns and numbers are swapped consistently everywhere (sessions, queries,
 * keywords, verbatim phrases), timestamps are shifted by a constant offset
 * (preserving every interval), and structure/difficulty are untouched.
 *
 * This is the anti-overfitting mechanism: leaderboard-grade evaluation should
 * use held-out variants generated from a private seed, so a system tuned to
 * the public v1 text gains nothing. See SPEC.md §7.
 *
 * Usage:
 *   bun src/generate.ts --scenario scenarios/v1/promotion-arc.json --seed 42
 *   bun src/generate.ts --scenario <path> --seed <n> --out scenarios/generated/
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { ScenarioSchema } from './types/index.js';
import type { Scenario } from './types/index.js';

// ─── Seeded PRNG (mulberry32) ────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Invented name generation ────────────────────────────────────────────────

const ONSETS = ['b', 'br', 'c', 'cl', 'd', 'dr', 'f', 'g', 'gr', 'h', 'j', 'k', 'kr', 'l', 'm', 'n', 'p', 'pr', 'r', 's', 'sk', 't', 'tr', 'v', 'z'];
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'ai', 'ea', 'or', 'el', 'an'];
const CODAS = ['', '', 'n', 'r', 's', 'l', 'th', 'x', 'm', 'd'];

function inventWord(rand: () => number, syllables: number): string {
  let word = '';
  for (let i = 0; i < syllables; i++) {
    word += ONSETS[Math.floor(rand() * ONSETS.length)];
    word += VOWELS[Math.floor(rand() * VOWELS.length)];
  }
  word += CODAS[Math.floor(rand() * CODAS.length)];
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function inventNumber(rand: () => number, digits: number, avoid: string): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let n = String(1 + Math.floor(rand() * 9));
    for (let i = 1; i < digits; i++) n += String(Math.floor(rand() * 10));
    if (n !== avoid) return n;
  }
  return avoid; // pathological; keep original rather than corrupt
}

// ─── Entity extraction ───────────────────────────────────────────────────────

/**
 * A token from a query anchor is a swappable entity when it is capitalized
 * (not an all-caps acronym), reasonably long, and never appears lowercase in
 * the scenario text (i.e., it behaves like a proper noun everywhere).
 */
function isSwappableEntity(token: string, fullText: string): boolean {
  if (token.length < 4) return false;
  if (!/^[A-Z][a-zA-Z]*$/.test(token)) return false;
  if (token === token.toUpperCase()) return false; // acronym
  const lowercaseUse = new RegExp(`(^|[^A-Za-z])${escapeRegex(token.toLowerCase())}([^A-Za-z]|$)`, 'm');
  // Appears as a lowercase common word somewhere → not a proper noun
  if (lowercaseUse.test(fullText.replace(new RegExp(`\\b${escapeRegex(token)}\\b`, 'g'), ''))) {
    return false;
  }
  return true;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Variant generation ──────────────────────────────────────────────────────

export interface VariantOptions {
  seed: number;
  /** Suffix appended to the scenario id; default `-var<seed>` */
  idSuffix?: string;
}

export function generateVariant(scenario: Scenario, options: VariantOptions): Scenario {
  const rand = mulberry32(options.seed);
  const serialized = JSON.stringify(scenario);

  // 1. Collect anchor tokens from queries
  const anchorPhrases = new Set<string>();
  for (const q of scenario.queries) {
    for (const entry of [...q.should_recall, ...q.should_forget]) {
      for (const alt of entry.split('|')) anchorPhrases.add(alt.trim());
    }
    // Verbatim phrases are not swapped wholesale; entity tokens inside them
    // are covered by the per-token map below if they appear in other anchors.
  }

  // 2. Build the replacement map
  const replacements = new Map<string, string>(); // token -> replacement
  const used = new Set<string>();

  for (const phrase of anchorPhrases) {
    // Number runs (≥2 digits) get number swaps
    for (const numMatch of phrase.matchAll(/\d{2,}/g)) {
      const num = numMatch[0];
      if (replacements.has(num)) continue;
      replacements.set(num, inventNumber(rand, num.length, num));
    }
    // Capitalized proper-noun tokens get invented names
    for (const token of phrase.split(/\s+/)) {
      const clean = token.replace(/[^A-Za-z]/g, '');
      if (!clean || replacements.has(clean)) continue;
      if (!isSwappableEntity(clean, serialized)) continue;
      let invented: string;
      let guard = 0;
      do {
        const syllables = clean.length > 7 ? 3 : 2;
        invented = inventWord(rand, syllables);
        guard++;
      } while ((used.has(invented) || serialized.toLowerCase().includes(invented.toLowerCase())) && guard < 50);
      used.add(invented);
      replacements.set(clean, invented);
    }
  }

  // 3. Apply replacements to every TEXT field (messages, questions, keywords,
  //    verbatim phrases, rubrics) — never to timestamps or ids, which numbers
  //    could otherwise corrupt. Consistency across fields is by construction.
  const apply = (text: string): string => {
    let out = text;
    for (const [from, to] of replacements) {
      if (/^\d+$/.test(from)) {
        out = out.replace(new RegExp(`(?<!\\d)${escapeRegex(from)}(?!\\d)`, 'g'), to);
      } else {
        out = out.replace(new RegExp(`\\b${escapeRegex(from)}\\b`, 'gi'), to);
      }
    }
    return out;
  };

  const variant = JSON.parse(serialized) as Scenario;
  variant.description = apply(variant.description);
  for (const session of variant.sessions) {
    for (const msg of session.messages) {
      msg.content = apply(msg.content);
    }
  }
  for (const query of variant.queries) {
    query.question = apply(query.question);
    query.should_recall = query.should_recall.map(apply);
    query.should_forget = query.should_forget.map(apply);
    if (query.must_include_verbatim) {
      query.must_include_verbatim = query.must_include_verbatim.map(apply);
    }
    if (query.judge) {
      query.judge = { rubric: apply(query.judge.rubric) };
    }
  }

  // 4. Shift all timestamps by a constant seeded offset (1–60 days), which
  //    preserves every inter-session interval and now/session relationship
  const offsetMs = Math.floor(1 + rand() * 59) * 24 * 60 * 60 * 1000;
  for (const session of variant.sessions) {
    session.timestamp = new Date(Date.parse(session.timestamp) + offsetMs).toISOString();
  }
  for (const query of variant.queries) {
    if (query.now) {
      query.now = new Date(Date.parse(query.now) + offsetMs).toISOString();
    }
  }

  // 5. Rename and validate
  const suffix = options.idSuffix ?? `-var${options.seed}`;
  variant.id = `${scenario.id}${suffix}`;
  variant.name = `${scenario.name} (variant ${options.seed})`;

  const validated = ScenarioSchema.safeParse(variant);
  if (!validated.success) {
    throw new Error(
      `Generated variant failed validation:\n${validated.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`,
    );
  }
  return validated.data;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const scenarioPath = getArg('scenario');
  const seed = Number(getArg('seed') ?? '1');
  const outDir = getArg('out') ?? 'scenarios/generated';

  if (!scenarioPath || Number.isNaN(seed)) {
    console.error('Usage: bun src/generate.ts --scenario <path.json> --seed <n> [--out <dir>]');
    process.exit(1);
  }

  const raw = JSON.parse(await readFile(scenarioPath, 'utf-8'));
  const scenario = ScenarioSchema.parse(raw);
  const variant = generateVariant(scenario, { seed });

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${variant.id}.json`);
  await writeFile(outPath, JSON.stringify(variant, null, 2) + '\n');
  console.log(`Variant written to ${outPath}`);
  console.log(`  ${basename(scenarioPath)} → ${variant.id} (seed ${seed})`);
}

const isMain = process.argv[1]?.endsWith('generate.ts') || process.argv[1]?.endsWith('generate.js');
if (isMain) {
  main().catch(err => {
    console.error('Generation failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
