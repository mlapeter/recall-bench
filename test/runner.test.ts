import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadScenarios, runBenchmark, formatReport } from '../src/runner/index.js';
import { NaiveAdapter } from '../src/adapters/naive.js';

const SCENARIO_DIR = resolve(import.meta.dirname, '..', 'scenarios');

describe('loadScenarios', () => {
  it('loads and validates all scenario files', async () => {
    const scenarios = await loadScenarios(SCENARIO_DIR);

    expect(scenarios.length).toBe(7);
    for (const s of scenarios) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.sessions.length).toBeGreaterThan(0);
      expect(s.queries.length).toBeGreaterThan(0);
    }
  });

  it('has the expected scenario IDs', async () => {
    const scenarios = await loadScenarios(SCENARIO_DIR);
    const ids = scenarios.map(s => s.id).sort();

    expect(ids).toEqual([
      'calibration',
      'correction',
      'emotional-weight',
      'pattern-break',
      'promotion-arc',
      'slow-fade',
      'two-people',
    ]);
  });
});

describe('runBenchmark', () => {
  it('runs all scenarios against naive adapter', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, SCENARIO_DIR);

    expect(result.adapterName).toBe('naive');
    expect(result.scenarios.length).toBe(7);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
    expect(result.totalDurationMs).toBeGreaterThan(0);
    expect(result.timestamp).toBeTruthy();
  });

  it('filters by scenario ID', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, SCENARIO_DIR, {
      scenario: 'correction',
    });

    expect(result.scenarios.length).toBe(1);
    expect(result.scenarios[0].scenarioId).toBe('correction');
  });

  it('throws on unknown scenario', async () => {
    const adapter = new NaiveAdapter();
    await expect(
      runBenchmark(adapter, SCENARIO_DIR, { scenario: 'nonexistent' }),
    ).rejects.toThrow('not found');
  });

  it('resets adapter between scenarios', async () => {
    let resetCount = 0;
    const adapter = new NaiveAdapter();
    const origReset = adapter.reset.bind(adapter);
    adapter.reset = async () => {
      resetCount++;
      await origReset();
    };

    await runBenchmark(adapter, SCENARIO_DIR);
    expect(resetCount).toBe(7); // once per scenario
  });
});

describe('formatReport', () => {
  it('produces readable output', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, SCENARIO_DIR);
    const report = formatReport(result);

    expect(report).toContain('RECALL Benchmark Results');
    expect(report).toContain('naive');
    expect(report).toContain('Score');
    expect(report).toContain('%');
  });
});
