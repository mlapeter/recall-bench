import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { generateVariant } from '../src/generate.js';
import { loadScenarios } from '../src/runner/index.js';
import { ScenarioSchema } from '../src/types/index.js';
import type { Scenario } from '../src/types/index.js';

const SCENARIO_DIR = resolve(import.meta.dirname, '..', 'scenarios', 'v1');

describe('generateVariant', () => {
  it('produces a valid scenario with same structure', async () => {
    const scenarios = await loadScenarios(SCENARIO_DIR);
    const original = scenarios.find(s => s.id === 'promotion-arc')!;
    const variant = generateVariant(original, { seed: 42 });

    expect(() => ScenarioSchema.parse(variant)).not.toThrow();
    expect(variant.id).toBe('promotion-arc-var42');
    expect(variant.sessions.length).toBe(original.sessions.length);
    expect(variant.queries.length).toBe(original.queries.length);
    for (let i = 0; i < original.sessions.length; i++) {
      expect(variant.sessions[i].messages.length).toBe(original.sessions[i].messages.length);
    }
    for (let i = 0; i < original.queries.length; i++) {
      expect(variant.queries[i].dimension).toBe(original.queries[i].dimension);
      expect(variant.queries[i].should_recall.length).toBe(original.queries[i].should_recall.length);
    }
  });

  it('swaps proper-noun anchors consistently between text and keywords', async () => {
    const scenarios = await loadScenarios(SCENARIO_DIR);
    const original = scenarios.find(s => s.id === 'promotion-arc')!;
    const variant = generateVariant(original, { seed: 42 });

    // "Meridian" is a should_recall anchor and proper noun — must be swapped
    const variantText = JSON.stringify(variant);
    expect(variantText).not.toContain('Meridian');

    // Every swapped recall keyword must still appear in the variant's sessions
    const sessionText = variant.sessions.map(s => s.messages.map(m => m.content).join(' ')).join(' ').toLowerCase();
    for (const query of variant.queries) {
      for (const entry of query.should_recall) {
        const found = entry.split('|').some(alt => sessionText.includes(alt.toLowerCase()));
        expect(found, `recall anchor "${entry}" missing from variant sessions`).toBe(true);
      }
    }
  });

  it('is deterministic for the same seed and differs across seeds', async () => {
    const scenarios = await loadScenarios(SCENARIO_DIR);
    const original = scenarios.find(s => s.id === 'two-people')!;
    const a1 = generateVariant(original, { seed: 7 });
    const a2 = generateVariant(original, { seed: 7 });
    const b = generateVariant(original, { seed: 8 });

    expect(JSON.stringify({ ...a1, id: '', name: '' })).toBe(JSON.stringify({ ...a2, id: '', name: '' }));
    expect(JSON.stringify(a1.sessions)).not.toBe(JSON.stringify(b.sessions));
  });

  it('shifts timestamps by a constant offset, preserving intervals', async () => {
    const scenarios = await loadScenarios(SCENARIO_DIR);
    const original = scenarios.find(s => s.id === 'slow-fade')!;
    const variant = generateVariant(original, { seed: 3 });

    const origDeltas = original.sessions.slice(1).map(
      (s, i) => Date.parse(s.timestamp) - Date.parse(original.sessions[i].timestamp),
    );
    const varDeltas = variant.sessions.slice(1).map(
      (s, i) => Date.parse(s.timestamp) - Date.parse(variant.sessions[i].timestamp),
    );
    expect(varDeltas).toEqual(origDeltas);
    expect(variant.sessions[0].timestamp).not.toBe(original.sessions[0].timestamp);
  });

  it('every variant of every v1 scenario validates and keeps anchors derivable', async () => {
    const scenarios = await loadScenarios(SCENARIO_DIR);
    for (const original of scenarios) {
      const variant = generateVariant(original, { seed: 99 });
      expect(() => ScenarioSchema.parse(variant)).not.toThrow();
      const allText = JSON.stringify(variant.sessions).toLowerCase();
      for (const query of variant.queries) {
        for (const entry of query.should_recall) {
          const found = entry.split('|').some(alt => allText.includes(alt.toLowerCase()));
          expect(found, `[${original.id}] anchor "${entry}" not derivable in variant`).toBe(true);
        }
      }
    }
  });
});
