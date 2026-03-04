/**
 * L — Loss Tests
 *
 * The most distinctive category: tests whether a system APPROPRIATELY forgets.
 * Traditional benchmarks penalize any forgetting. RECALL rewards it.
 */

import type { MemoryAdapter, TestCase, TestResult } from '../types/index.js';

/** Outdated information should fade or be removable — not haunt the system forever */
const gracefulForgetting: TestCase = {
  id: 'loss-graceful-forgetting',
  name: 'Graceful forgetting',
  category: 'loss',
  description: 'Outdated or superseded information should not dominate recall',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store a series of project status updates (progressively more recent)
    const updates = [
      'Project status: planning phase, gathering requirements',
      'Project status: development started, basic scaffolding done',
      'Project status: core features implemented, starting testing',
      'Project status: testing complete, preparing for launch',
      'Project status: launched successfully, monitoring performance',
    ];

    for (const update of updates) {
      await adapter.store({ content: update, tags: ['project', 'status'] });
    }

    // Query for current project status
    const results = await adapter.recall('current project status', 3);

    if (results.length === 0) {
      return {
        testId: 'loss-graceful-forgetting',
        score: 0,
        passed: false,
        details: 'No results returned for project status query',
        durationMs: Date.now() - start,
      };
    }

    // The most recent update should be most prominent
    const topResult = results[0];
    let score: number;
    let details: string;

    if (topResult.content.includes('launched')) {
      score = 1.0;
      details = 'Most recent status (launched) ranked first — good temporal awareness';
    } else if (topResult.content.includes('testing complete')) {
      score = 0.7;
      details = 'Near-recent status ranked first — decent temporal awareness';
    } else if (topResult.content.includes('planning')) {
      score = 0.1;
      details = 'Oldest status ranked first — no temporal awareness (FIFO or random)';
    } else {
      score = 0.4;
      details = `Mid-range status ranked first: "${topResult.content.substring(0, 50)}..."`;
    }

    // Bonus: check if old statuses are lower ranked or absent
    if (results.length > 1) {
      const lastResult = results[results.length - 1];
      if (lastResult.content.includes('planning') || lastResult.content.includes('development started')) {
        score = Math.min(1.0, score + 0.1);
        details += ' | Older statuses appropriately ranked lower';
      }
    }

    return { testId: 'loss-graceful-forgetting', score, passed: score >= 0.6, details, durationMs: Date.now() - start };
  },
};

/** System should handle large volumes without catastrophic degradation */
const memoryUnderLoad: TestCase = {
  id: 'loss-memory-under-load',
  name: 'Memory under load',
  category: 'loss',
  description: 'System should maintain quality when storing many memories',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store a distinctive "needle" memory
    const needleId = await adapter.store({
      content: 'The secret launch code is PHOENIX-42',
      tags: ['critical'],
    });

    // Flood with 50 mundane memories
    for (let i = 0; i < 50; i++) {
      await adapter.store({
        content: `Routine log entry #${i}: system check passed at ${i}:00`,
        tags: ['routine'],
      });
    }

    // Can we still find the needle?
    const results = await adapter.recall('secret launch code', 5);
    const foundNeedle = results.some(r => r.content.includes('PHOENIX-42'));

    // Also check: system should still return results (not crash/timeout)
    const routineResults = await adapter.recall('system check', 5);
    const hasRoutine = routineResults.length > 0;

    let score: number;
    let details: string;

    if (foundNeedle && hasRoutine) {
      score = 1.0;
      details = 'Found needle in haystack and routine memories still accessible';
    } else if (foundNeedle) {
      score = 0.8;
      details = 'Found needle but routine recall failed';
    } else if (hasRoutine) {
      score = 0.3;
      details = 'Routine memories work but critical needle memory lost';
    } else {
      score = 0;
      details = 'Both needle and routine recall failed under load';
    }

    // Check timing — severe degradation is a problem
    const elapsed = Date.now() - start;
    if (elapsed > 30000) {
      score = Math.max(0, score - 0.3);
      details += ` | Severe performance degradation (${(elapsed / 1000).toFixed(1)}s)`;
    }

    return {
      testId: 'loss-memory-under-load',
      score,
      passed: score >= 0.6,
      details,
      durationMs: elapsed,
    };
  },
};

/** Explicit forget should actually remove the memory */
const explicitForget: TestCase = {
  id: 'loss-explicit-forget',
  name: 'Explicit forget',
  category: 'loss',
  description: 'Forgotten memories should not be recalled',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    if (!adapter.forget) {
      return {
        testId: 'loss-explicit-forget',
        score: 0,
        passed: false,
        details: 'System does not support explicit forget',
        durationMs: Date.now() - start,
      };
    }

    // Store and then forget a memory
    const id = await adapter.store({ content: 'My old password was hunter2' });

    // Verify it exists
    const before = await adapter.recall('password', 5);
    const existsBefore = before.some(r => r.content.includes('hunter2'));

    if (!existsBefore) {
      return {
        testId: 'loss-explicit-forget',
        score: 0.5,
        passed: false,
        details: 'Memory was not retrievable even before forget — cannot test',
        durationMs: Date.now() - start,
      };
    }

    // Forget it
    await adapter.forget(id);

    // Verify it's gone
    const after = await adapter.recall('password', 5);
    const existsAfter = after.some(r => r.content.includes('hunter2'));

    let score: number;
    let details: string;

    if (!existsAfter) {
      score = 1.0;
      details = 'Forgotten memory successfully removed from recall';
    } else {
      score = 0.1;
      details = 'Forgotten memory still appears in recall results — forget is broken';
    }

    return { testId: 'loss-explicit-forget', score, passed: score >= 0.6, details, durationMs: Date.now() - start };
  },
};

export const lossTests: TestCase[] = [
  gracefulForgetting,
  memoryUnderLoad,
  explicitForget,
];
