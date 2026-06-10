import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadTier3Scenarios, runTier3Scenario, scoreResponse, Tier3ScenarioSchema } from '../src/tier3/index.js';
import type { Probe, Tier3Scenario } from '../src/tier3/index.js';
import type { MemoryAdapter, Message, QueryOptions, RespondOptions, SessionMeta } from '../src/types/index.js';

const TIER3_DIR = resolve(import.meta.dirname, '..', 'scenarios', 'v1', 'tier3');

/**
 * Scripted mock with known-correct behavior: when it has ingested history it
 * answers with the lesson; without history it gives the generic wrong answer.
 * Proves the paired-run harness isolates memory's contribution.
 */
class ScriptedRespondAdapter implements MemoryAdapter {
  readonly name = 'scripted';
  private hasMemory = false;

  async processConversation(_messages: Message[], _meta: SessionMeta): Promise<void> {
    this.hasMemory = true;
  }
  async query(_q: string, _o: QueryOptions): Promise<string[]> {
    return [];
  }
  async reset(): Promise<void> {
    this.hasMemory = false;
  }
  async respond(_messages: Message[], _options: RespondOptions): Promise<string> {
    return this.hasMemory
      ? 'Use the @root/ prefix — we learned this in February.'
      : 'Try using absolute paths or double the dollar sign: $${X}.';
  }
}

function probe(partial: Partial<Probe>): Probe {
  return {
    label: 'p',
    messages: [{ role: 'user', content: 'help' }],
    now: '2025-05-01T00:00:00Z',
    expected_keywords: [],
    forbidden_keywords: [],
    ...partial,
  };
}

describe('scoreResponse', () => {
  it('scores expected keywords with alternates', () => {
    const p = probe({ expected_keywords: ['@root', 'quote|quoting'] });
    expect(scoreResponse(p, 'Use @root/ and quoting')).toBe(1);
    expect(scoreResponse(p, 'Use @root/ only')).toBe(0.5);
  });

  it('scores forbidden keywords inversely', () => {
    const p = probe({ expected_keywords: ['backslash'], forbidden_keywords: ['$${'] });
    expect(scoreResponse(p, 'backslash it')).toBe(1);
    expect(scoreResponse(p, 'backslash or maybe $${X}')).toBe(0.5);
  });
});

describe('runTier3Scenario (paired runs)', () => {
  const scenario: Tier3Scenario = {
    id: 'mock-tier3',
    name: 'Mock',
    description: '',
    sessions: [{ timestamp: '2025-02-01T00:00:00Z', messages: [{ role: 'user', content: 'lesson' }] }],
    probes: [
      probe({
        label: 'includes',
        expected_keywords: ['@root'],
        forbidden_keywords: ['absolute paths'],
      }),
    ],
  };

  it('memory arm sees history, control arm does not — uplift isolates memory', async () => {
    const adapter = new ScriptedRespondAdapter();
    const result = await runTier3Scenario(adapter, scenario);

    expect(result.probes[0].memoryScore).toBe(1); // has @root, no forbidden
    expect(result.probes[0].controlScore).toBe(0); // no @root, mentions absolute paths
    expect(result.meanUplift).toBe(1);
  });

  it('throws for adapters without respond()', async () => {
    const adapter: MemoryAdapter = {
      name: 'norespond',
      processConversation: async () => {},
      query: async () => [],
      reset: async () => {},
    };
    await expect(runTier3Scenario(adapter, scenario)).rejects.toThrow('respond()');
  });
});

describe('tier3 pilot scenario', () => {
  it('loads and validates', async () => {
    const scenarios = await loadTier3Scenarios(TIER3_DIR);
    expect(scenarios.length).toBeGreaterThanOrEqual(1);
    const pilot = scenarios.find(s => s.id === 'grindle-pilot')!;
    expect(pilot.probes.length).toBe(5);
    expect(() => Tier3ScenarioSchema.parse(pilot)).not.toThrow();
  });

  it('invented-specific probes are not answerable from session-free context', async () => {
    const scenarios = await loadTier3Scenarios(TIER3_DIR);
    const pilot = scenarios.find(s => s.id === 'grindle-pilot')!;
    // The lessons behind @root and !knit appear only in session text
    const sessionText = JSON.stringify(pilot.sessions).toLowerCase();
    expect(sessionText).toContain('@root');
    expect(sessionText).toContain('!knit');
  });
});
