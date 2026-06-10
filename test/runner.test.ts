import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadScenarios, runBenchmark, runScenario, formatReport, defaultNow } from '../src/runner/index.js';
import { NaiveAdapter } from '../src/adapters/naive.js';
import type { MemoryAdapter, Message, QueryOptions, Scenario, SessionMeta } from '../src/types/index.js';

const SCENARIO_DIR = resolve(import.meta.dirname, '..', 'scenarios', 'v1');

/**
 * Scripted mock adapter with known-correct behavior: returns canned results
 * per question and records every call so tests can assert harness behavior
 * (virtual clock, session metadata, interleaving, limits).
 */
class MockAdapter implements MemoryAdapter {
  readonly name = 'mock';
  calls: Array<
    | { type: 'process'; messageCount: number; meta: SessionMeta }
    | { type: 'query'; question: string; options: QueryOptions }
    | { type: 'reset' }
  > = [];
  private canned: Record<string, string[]>;

  constructor(canned: Record<string, string[]> = {}) {
    this.canned = canned;
  }

  async processConversation(messages: Message[], meta: SessionMeta): Promise<void> {
    this.calls.push({ type: 'process', messageCount: messages.length, meta });
  }

  async query(question: string, options: QueryOptions): Promise<string[]> {
    this.calls.push({ type: 'query', question, options });
    return this.canned[question] ?? [];
  }

  async reset(): Promise<void> {
    this.calls.push({ type: 'reset' });
  }
}

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 'mock-scenario',
    name: 'Mock Scenario',
    description: 'test',
    sessions: [
      { timestamp: '2025-01-01T10:00:00Z', messages: [{ role: 'user', content: 'session one' }] },
      { timestamp: '2025-02-01T10:00:00Z', messages: [{ role: 'user', content: 'session two' }] },
      { timestamp: '2025-03-01T10:00:00Z', messages: [{ role: 'user', content: 'session three' }] },
    ],
    queries: [
      {
        question: 'final question',
        should_recall: ['answer'],
        should_forget: [],
        dimension: 'salience',
      },
    ],
    ...overrides,
  };
}

describe('virtual clock', () => {
  it('passes session timestamps and 1-based indices to processConversation', async () => {
    const adapter = new MockAdapter();
    await runScenario(adapter, makeScenario());

    const processes = adapter.calls.filter(c => c.type === 'process');
    expect(processes).toHaveLength(3);
    expect(processes[0]).toMatchObject({ meta: { timestamp: '2025-01-01T10:00:00Z', index: 1 } });
    expect(processes[2]).toMatchObject({ meta: { timestamp: '2025-03-01T10:00:00Z', index: 3 } });
  });

  it('defaults query now to last session + 24h', async () => {
    const adapter = new MockAdapter();
    await runScenario(adapter, makeScenario());

    const query = adapter.calls.find(c => c.type === 'query');
    expect(query).toMatchObject({ options: { now: '2025-03-02T10:00:00.000Z' } });
  });

  it('uses explicit query now when provided', async () => {
    const adapter = new MockAdapter();
    const scenario = makeScenario({
      queries: [
        {
          question: 'final question',
          should_recall: [],
          should_forget: [],
          max_results: 0,
          now: '2025-06-01T00:00:00Z',
          dimension: 'calibration',
        },
      ],
    });
    await runScenario(adapter, scenario);

    const query = adapter.calls.find(c => c.type === 'query');
    expect(query).toMatchObject({ options: { now: '2025-06-01T00:00:00Z' } });
  });

  it('never consults the wall clock for query now', async () => {
    const adapter = new MockAdapter();
    await runScenario(adapter, makeScenario());
    const query = adapter.calls.find(c => c.type === 'query') as { options: QueryOptions };
    // Scenario timeline is 2025; wall clock is later. Virtual now must be scenario-derived.
    expect(query.options.now.startsWith('2025-')).toBe(true);
  });
});

describe('after_session interleaving', () => {
  it('runs a query at its mid-timeline session boundary', async () => {
    const adapter = new MockAdapter();
    const scenario = makeScenario({
      queries: [
        {
          question: 'mid question',
          should_recall: [],
          should_forget: [],
          max_results: 0,
          after_session: 1,
          dimension: 'prospective',
        },
        {
          question: 'final question',
          should_recall: [],
          should_forget: [],
          max_results: 0,
          dimension: 'calibration',
        },
      ],
    });
    await runScenario(adapter, scenario);

    const sequence = adapter.calls.map(c =>
      c.type === 'process' ? `process${c.meta.index}` : c.type === 'query' ? `query:${c.question}` : 'reset',
    );
    expect(sequence).toEqual([
      'reset',
      'process1',
      'query:mid question',
      'process2',
      'process3',
      'query:final question',
    ]);
  });

  it('defaults mid-query now to its boundary session + 24h', async () => {
    const adapter = new MockAdapter();
    const scenario = makeScenario({
      queries: [
        {
          question: 'mid question',
          should_recall: [],
          should_forget: [],
          max_results: 0,
          after_session: 2,
          dimension: 'prospective',
        },
      ],
    });
    await runScenario(adapter, scenario);
    const query = adapter.calls.find(c => c.type === 'query');
    expect(query).toMatchObject({ options: { now: '2025-02-02T10:00:00.000Z' } });
  });

  it('preserves original query order in results regardless of execution order', async () => {
    const adapter = new MockAdapter();
    const scenario = makeScenario({
      queries: [
        { question: 'late', should_recall: [], should_forget: [], max_results: 0, dimension: 'calibration' },
        { question: 'early', should_recall: [], should_forget: [], max_results: 0, after_session: 1, dimension: 'prospective' },
      ],
    });
    const result = await runScenario(adapter, scenario);
    expect(result.queryResults.map(qr => qr.query.question)).toEqual(['late', 'early']);
  });
});

describe('scoring through the runner', () => {
  it('known-correct mock produces exactly the expected scores', async () => {
    const adapter = new MockAdapter({
      'final question': ['the answer is here', 'but stale fact lurks'],
    });
    const scenario = makeScenario({
      queries: [
        {
          question: 'final question',
          should_recall: ['answer'],
          should_forget: ['stale'],
          dimension: 'correction',
        },
      ],
    });
    const result = await runScenario(adapter, scenario);
    const score = result.queryResults[0].score;
    expect(score.recall_score).toBe(1);
    expect(score.forget_score).toBe(0);
    expect(score.combined_score).toBe(0.5);
  });

  it('passes limit derived from top_n', async () => {
    const adapter = new MockAdapter();
    const scenario = makeScenario({
      queries: [
        { question: 'final question', should_recall: ['x'], should_forget: [], top_n: 3, dimension: 'salience' },
      ],
    });
    await runScenario(adapter, scenario);
    const query = adapter.calls.find(c => c.type === 'query');
    expect(query).toMatchObject({ options: { limit: 3 } });
  });
});

describe('loadScenarios (v1 set)', () => {
  it('loads and validates all v1 scenario files', async () => {
    const scenarios = await loadScenarios(SCENARIO_DIR);
    expect(scenarios.length).toBeGreaterThanOrEqual(7);
    for (const s of scenarios) {
      expect(s.id).toBeTruthy();
      expect(s.sessions.length).toBeGreaterThan(0);
      expect(s.queries.length).toBeGreaterThan(0);
      for (const session of s.sessions) {
        expect(Date.parse(session.timestamp)).not.toBeNaN();
      }
    }
  });

  it('rejects scenarios with non-chronological sessions', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'recall-test-'));
    await writeFile(
      join(dir, 'bad.json'),
      JSON.stringify({
        id: 'bad',
        name: 'Bad',
        description: '',
        sessions: [
          { timestamp: '2025-02-01T00:00:00Z', messages: [{ role: 'user', content: 'a' }] },
          { timestamp: '2025-01-01T00:00:00Z', messages: [{ role: 'user', content: 'b' }] },
        ],
        queries: [{ question: 'q', should_recall: [], should_forget: [], max_results: 0, dimension: 'calibration' }],
      }),
    );
    await expect(loadScenarios(dir)).rejects.toThrow(/precedes/);
  });

  it('rejects a query whose now precedes its last ingested session', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'recall-test-'));
    await writeFile(
      join(dir, 'bad-now.json'),
      JSON.stringify({
        id: 'bad-now',
        name: 'Bad Now',
        description: '',
        sessions: [{ timestamp: '2025-02-01T00:00:00Z', messages: [{ role: 'user', content: 'a' }] }],
        queries: [
          {
            question: 'q',
            should_recall: [],
            should_forget: [],
            max_results: 0,
            now: '2025-01-01T00:00:00Z',
            dimension: 'calibration',
          },
        ],
      }),
    );
    await expect(loadScenarios(dir)).rejects.toThrow(/precedes/);
  });
});

describe('runBenchmark', () => {
  it('runs all v1 scenarios against the naive adapter', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, SCENARIO_DIR);

    expect(result.adapter).toBe('naive');
    expect(result.benchmark).toBe('recall-bench');
    expect(result.scenarioSet).toBe('v1');
    expect(result.tier).toBe(1);
    expect(result.headline).toBeGreaterThanOrEqual(0);
    expect(result.headline).toBeLessThanOrEqual(1);
    expect(result.axes.world).not.toBeNull();
    expect(Object.keys(result.dimensions).length).toBeGreaterThan(0);
  });

  it('filters by scenario ID and throws on unknown', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, SCENARIO_DIR, { scenario: 'correction' });
    expect(result.scenarios).toHaveLength(1);

    await expect(runBenchmark(adapter, SCENARIO_DIR, { scenario: 'nope' })).rejects.toThrow('not found');
  });

  it('resets adapter between scenarios', async () => {
    const adapter = new MockAdapter();
    const scenarios = await loadScenarios(SCENARIO_DIR);
    await runBenchmark(adapter, SCENARIO_DIR);
    const resets = adapter.calls.filter(c => c.type === 'reset');
    expect(resets.length).toBe(scenarios.length);
  });
});

describe('formatReport', () => {
  it('reports headline, axis subscores, and dimension breakdown', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, SCENARIO_DIR);
    const report = formatReport(result);

    expect(report).toContain('RECALL Benchmark Results');
    expect(report).toContain('HEADLINE');
    expect(report).toContain('world axis');
    expect(report).toContain('self axis');
    expect(report).toContain('Memory of the world:');
  });
});

describe('defaultNow', () => {
  it('is last ingested session + 24h', () => {
    const scenario = makeScenario();
    expect(defaultNow(scenario, scenario.queries[0])).toBe('2025-03-02T10:00:00.000Z');
    expect(
      defaultNow(scenario, { ...scenario.queries[0], after_session: 1 }),
    ).toBe('2025-01-02T10:00:00.000Z');
  });
});
