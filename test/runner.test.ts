import { describe, it, expect } from 'vitest';
import { runBenchmark, formatReport } from '../src/runner/index.js';
import { NaiveAdapter } from '../src/adapters/naive.js';
import { allTests } from '../src/tests/index.js';

describe('RECALL runner', () => {
  it('runs all tests against naive adapter', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, allTests, {
      allowTimeSimulation: true,
    });

    expect(result.systemName).toBe('naive-baseline');
    expect(result.tests.length).toBeGreaterThan(0);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.version).toBe('0.1.0');
  });

  it('formats a report', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, allTests);
    const report = formatReport(result);

    expect(report).toContain('RECALL Benchmark Results');
    expect(report).toContain('naive-baseline');
    expect(report).toContain('Score:');
  });

  it('filters by category', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, allTests, {
      categories: ['retention'],
    });

    expect(result.categories.length).toBe(1);
    expect(result.categories[0].category).toBe('retention');
  });

  it('filters by test ID', async () => {
    const adapter = new NaiveAdapter();
    const result = await runBenchmark(adapter, allTests, {
      tests: ['retention-hebbian'],
    });

    expect(result.tests.length).toBe(1);
    expect(result.tests[0].testId).toBe('retention-hebbian');
  });
});

describe('NaiveAdapter', () => {
  it('stores and recalls', async () => {
    const adapter = new NaiveAdapter();
    await adapter.store({ content: 'hello world' });
    const results = await adapter.recall('hello');
    expect(results.length).toBe(1);
    expect(results[0].content).toBe('hello world');
  });

  it('forgets', async () => {
    const adapter = new NaiveAdapter();
    const id = await adapter.store({ content: 'secret data' });
    await adapter.forget(id);
    const results = await adapter.recall('secret');
    expect(results.length).toBe(0);
  });

  it('resets', async () => {
    const adapter = new NaiveAdapter();
    await adapter.store({ content: 'item 1' });
    await adapter.store({ content: 'item 2' });
    await adapter.reset();
    const all = await adapter.getAll();
    expect(all.length).toBe(0);
  });
});
