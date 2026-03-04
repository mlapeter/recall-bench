/**
 * C — Consolidation Tests
 *
 * Tests whether memory systems can merge redundant memories,
 * extract patterns, and transform episodic → semantic knowledge.
 */

import type { MemoryAdapter, TestCase, TestResult } from '../types/index.js';

/** Redundant memories should be merged during consolidation */
const redundancyMerge: TestCase = {
  id: 'consolidation-redundancy-merge',
  name: 'Redundancy merge',
  category: 'consolidation',
  description: 'Consolidation should merge semantically duplicate memories',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    if (!adapter.consolidate) {
      return {
        testId: 'consolidation-redundancy-merge',
        score: 0,
        passed: false,
        details: 'System does not support consolidation',
        durationMs: Date.now() - start,
      };
    }

    // Store redundant memories
    await adapter.store({ content: 'Mike prefers bun over npm for package management' });
    await adapter.store({ content: 'Use bun instead of npm — Mike\'s preference' });
    await adapter.store({ content: 'Mike likes bun, not npm' });
    await adapter.store({ content: 'The API uses REST with JSON responses' }); // non-redundant

    const beforeAll = adapter.getAll ? await adapter.getAll() : null;
    const countBefore = beforeAll?.length ?? 4;

    // Trigger consolidation
    await adapter.consolidate();

    const afterAll = adapter.getAll ? await adapter.getAll() : null;
    const countAfter = afterAll?.length ?? 0;

    // After consolidation, the 3 bun/npm memories should merge
    const results = await adapter.recall('bun npm preference', 5);
    const apiResults = await adapter.recall('API REST', 5);

    const hasBunPref = results.some(r =>
      r.content.toLowerCase().includes('bun') && r.content.toLowerCase().includes('npm'),
    );
    const hasApi = apiResults.some(r => r.content.includes('API') || r.content.includes('REST'));

    let score = 0;
    const details: string[] = [];

    // Check that bun preference is still recallable
    if (hasBunPref) {
      score += 0.3;
      details.push('Bun preference still recallable after consolidation');
    } else {
      details.push('Bun preference lost after consolidation');
    }

    // Check that non-redundant memory survived
    if (hasApi) {
      score += 0.2;
      details.push('Non-redundant memory survived');
    } else {
      details.push('Non-redundant memory lost');
    }

    // Check that total count decreased (merging happened)
    if (afterAll && countAfter < countBefore) {
      score += 0.5;
      details.push(`Memory count reduced: ${countBefore} → ${countAfter}`);
    } else if (afterAll) {
      details.push(`No merge detected: count stayed at ${countAfter}`);
    } else {
      score += 0.2; // Can't verify, give partial credit
      details.push('Cannot verify merge (getAll not supported)');
    }

    return {
      testId: 'consolidation-redundancy-merge',
      score,
      passed: score >= 0.5,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

/** System should be able to extract patterns from multiple similar memories */
const patternExtraction: TestCase = {
  id: 'consolidation-pattern-extraction',
  name: 'Pattern extraction',
  category: 'consolidation',
  description: 'System should generalize patterns from repeated similar experiences',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    if (!adapter.consolidate) {
      return {
        testId: 'consolidation-pattern-extraction',
        score: 0,
        passed: false,
        details: 'System does not support consolidation',
        durationMs: Date.now() - start,
      };
    }

    // Store multiple instances of a pattern
    await adapter.store({ content: 'Monday standup: Mike mentioned he prefers morning coding sessions' });
    await adapter.store({ content: 'Wednesday: Mike started coding at 6am again' });
    await adapter.store({ content: 'Friday: Mike said mornings are his most productive time' });
    await adapter.store({ content: 'Mike scheduled all deep work blocks before noon' });

    await adapter.consolidate();

    // Query for the generalized pattern
    const results = await adapter.recall('when is Mike most productive', 5);

    const hasMorningPattern = results.some(r =>
      r.content.toLowerCase().includes('morning') ||
      r.content.toLowerCase().includes('productive') ||
      r.content.toLowerCase().includes('before noon'),
    );

    let score: number;
    let details: string;

    if (hasMorningPattern) {
      // Check if it looks like a generalization (not just one of the originals)
      const topContent = results[0].content;
      const isGeneralized = !topContent.includes('Monday standup') &&
                            !topContent.includes('Wednesday:') &&
                            !topContent.includes('Friday:');

      if (isGeneralized) {
        score = 1.0;
        details = 'Pattern extracted and generalized from individual episodes';
      } else {
        score = 0.6;
        details = 'Individual episodes found but not generalized into pattern';
      }
    } else {
      score = 0.2;
      details = 'Morning productivity pattern not retrievable after consolidation';
    }

    return {
      testId: 'consolidation-pattern-extraction',
      score,
      passed: score >= 0.5,
      details,
      durationMs: Date.now() - start,
    };
  },
};

export const consolidationTests: TestCase[] = [
  redundancyMerge,
  patternExtraction,
];
