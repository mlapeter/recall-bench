/**
 * RECALL Benchmark — Tier 3: Behavioral Uplift (pilot)
 *
 * Tier 3 measures whether memory CHANGES BEHAVIOR — structure, not record.
 * For each probe, the harness collects two responses from the adapter:
 *
 *   memory arm:  reset → ingest all sessions → respond(probe)
 *   control arm: reset → respond(probe)          (same model, no memory)
 *
 * and scores both mechanically (expected/forbidden keywords over the
 * RESPONSE text). The reported metric is uplift = memory − control, per
 * probe and aggregated. A memoryless adapter has uplift 0 by construction;
 * general model knowledge cancels out because both arms share it.
 *
 * See SPEC.md §5.3. The v1 pilot is a procedural task family with
 * objectively checkable answers (invented systems the control model cannot
 * know), making improvement attributable to memory rather than chance.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import type { MemoryAdapter, Message } from '../types/index.js';

// ─── Tier 3 scenario format ──────────────────────────────────────────────────

export interface Probe {
  /** Short label for reporting */
  label: string;
  /** The live conversation the adapter must respond to */
  messages: Message[];
  /** Virtual time of the live session (ISO 8601) */
  now: string;
  /** Keywords the response SHOULD contain (|-alternates, case-insensitive) */
  expected_keywords: string[];
  /** Keywords the response should NOT contain */
  forbidden_keywords: string[];
}

export interface Tier3Scenario {
  id: string;
  name: string;
  description: string;
  sessions: Array<{ timestamp: string; messages: Message[] }>;
  probes: Probe[];
}

const ISO = z.string().refine(s => !Number.isNaN(Date.parse(s)), { message: 'invalid ISO timestamp' });
const Msg = z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1) });

export const Tier3ScenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  sessions: z.array(z.object({ timestamp: ISO, messages: z.array(Msg).min(1) })).min(1),
  probes: z
    .array(
      z.object({
        label: z.string().min(1),
        messages: z.array(Msg).min(1),
        now: ISO,
        expected_keywords: z.array(z.string()).default([]),
        forbidden_keywords: z.array(z.string()).default([]),
      }),
    )
    .min(1),
});

// ─── Scoring ─────────────────────────────────────────────────────────────────

function entryFound(entry: string, text: string): boolean {
  const lower = text.toLowerCase();
  return entry
    .split('|')
    .map(a => a.toLowerCase())
    .filter(Boolean)
    .some(a => lower.includes(a));
}

/** Score a response in [0,1]: mean of expected-found fraction and forbidden-absent fraction. */
export function scoreResponse(probe: Probe, response: string): number {
  const components: number[] = [];
  if (probe.expected_keywords.length > 0) {
    const found = probe.expected_keywords.filter(k => entryFound(k, response)).length;
    components.push(found / probe.expected_keywords.length);
  }
  if (probe.forbidden_keywords.length > 0) {
    const found = probe.forbidden_keywords.filter(k => entryFound(k, response)).length;
    components.push(1 - found / probe.forbidden_keywords.length);
  }
  if (components.length === 0) return 0;
  return components.reduce((a, b) => a + b, 0) / components.length;
}

// ─── Paired-run harness ──────────────────────────────────────────────────────

export interface ProbeResult {
  label: string;
  memoryScore: number;
  controlScore: number;
  uplift: number;
  memoryResponse: string;
  controlResponse: string;
}

export interface Tier3Result {
  scenarioId: string;
  adapter: string;
  probes: ProbeResult[];
  meanMemoryScore: number;
  meanControlScore: number;
  meanUplift: number;
}

export async function runTier3Scenario(
  adapter: MemoryAdapter,
  scenario: Tier3Scenario,
  options: { verbose?: boolean } = {},
): Promise<Tier3Result> {
  if (!adapter.respond) {
    throw new Error(
      `Adapter "${adapter.name}" does not implement respond() — required for Tier 3`,
    );
  }

  const probes: ProbeResult[] = [];

  for (const probe of scenario.probes) {
    // Memory arm: fresh state, full history ingested
    await adapter.reset();
    for (const [i, session] of scenario.sessions.entries()) {
      await adapter.processConversation(session.messages, {
        timestamp: session.timestamp,
        index: i + 1,
      });
    }
    const memoryResponse = await adapter.respond(probe.messages, { now: probe.now });

    // Control arm: fresh state, no history
    await adapter.reset();
    const controlResponse = await adapter.respond(probe.messages, { now: probe.now });

    const memoryScore = scoreResponse(probe, memoryResponse);
    const controlScore = scoreResponse(probe, controlResponse);

    probes.push({
      label: probe.label,
      memoryScore,
      controlScore,
      uplift: memoryScore - controlScore,
      memoryResponse,
      controlResponse,
    });

    if (options.verbose) {
      console.log(`  [${probe.label}] memory ${memoryScore.toFixed(2)} vs control ${controlScore.toFixed(2)} → uplift ${(memoryScore - controlScore >= 0 ? '+' : '')}${(memoryScore - controlScore).toFixed(2)}`);
    }
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  return {
    scenarioId: scenario.id,
    adapter: adapter.name,
    probes,
    meanMemoryScore: mean(probes.map(p => p.memoryScore)),
    meanControlScore: mean(probes.map(p => p.controlScore)),
    meanUplift: mean(probes.map(p => p.uplift)),
  };
}

export async function loadTier3Scenarios(dir: string): Promise<Tier3Scenario[]> {
  const files = (await readdir(dir)).filter(f => f.endsWith('.json')).sort();
  const scenarios: Tier3Scenario[] = [];
  for (const file of files) {
    const parsed = Tier3ScenarioSchema.safeParse(JSON.parse(await readFile(join(dir, file), 'utf-8')));
    if (!parsed.success) {
      throw new Error(`${file}: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
    }
    scenarios.push(parsed.data);
  }
  return scenarios;
}
