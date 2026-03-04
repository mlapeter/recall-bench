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
  description: 'System should prefer recent information over stale equivalents',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store a series of project status updates — all structurally identical
    // so there's no semantic advantage for any particular one
    const updates = [
      'Project status: planning phase',
      'Project status: development phase',
      'Project status: testing phase',
      'Project status: staging phase',
      'Project status: production phase',
    ];

    for (const update of updates) {
      await adapter.store({ content: update });
    }

    // Query — all are equally relevant semantically
    const results = await adapter.recall('project status', 3);

    if (results.length === 0) {
      return { testId: 'loss-graceful-forgetting', score: 0, passed: false,
        details: 'No results returned', durationMs: Date.now() - start };
    }

    const topResult = results[0];
    let score: number;
    let details: string;

    if (topResult.content.includes('production')) {
      score = 1.0;
      details = 'Most recent status ranked first — good temporal awareness';
    } else if (topResult.content.includes('staging')) {
      score = 0.7;
      details = 'Near-recent status ranked first';
    } else if (topResult.content.includes('planning')) {
      score = 0.1;
      details = 'Oldest status ranked first — no recency awareness';
    } else {
      score = 0.4;
      details = `Mid-range status ranked first: "${topResult.content}"`;
    }

    return { testId: 'loss-graceful-forgetting', score, passed: score >= 0.6, details, durationMs: Date.now() - start };
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
      return { testId: 'loss-explicit-forget', score: 0, passed: false,
        details: 'System does not support explicit forget', durationMs: Date.now() - start };
    }

    const id = await adapter.store({ content: 'My old password was hunter2' });

    // Verify it exists
    const before = await adapter.recall('password', 5);
    const existsBefore = before.some(r => r.content.includes('hunter2'));

    if (!existsBefore) {
      return { testId: 'loss-explicit-forget', score: 0.5, passed: false,
        details: 'Memory not retrievable even before forget', durationMs: Date.now() - start };
    }

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
      details = 'Forgotten memory still appears in recall — forget is broken';
    }

    return { testId: 'loss-explicit-forget', score, passed: score >= 0.6, details, durationMs: Date.now() - start };
  },
};

/**
 * Priority under scarcity.
 *
 * When many memories compete, the system should naturally surface
 * the more important ones — not by salience tagging, but by
 * reinforcement history. This is the "what would you save from a
 * burning building" test for memory.
 */
const priorityUnderScarcity: TestCase = {
  id: 'loss-priority-scarcity',
  name: 'Priority under scarcity',
  category: 'loss',
  description: 'Important memories should outcompete trivial ones for limited retrieval slots',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store 20 memories — mix of important and trivial
    const trivialIds: string[] = [];
    for (let i = 0; i < 15; i++) {
      trivialIds.push(await adapter.store({
        content: `Routine daily log entry number ${i + 1}: all systems nominal`,
      }));
    }

    // Store and reinforce 5 important memories
    const importantContents = [
      'The production database credentials are stored in Vault',
      'Mike is allergic to shellfish — important for team dinners',
      'Revenue target for Q2 is $500K ARR',
      'The main API endpoint must maintain 99.9% uptime SLA',
      'Critical bug: race condition in payment processing under concurrent requests',
    ];

    const importantIds: string[] = [];
    for (const content of importantContents) {
      const id = await adapter.store({ content });
      importantIds.push(id);
      // Reinforce each important memory
      if (adapter.reinforce) {
        for (let i = 0; i < 3; i++) await adapter.reinforce(id);
      }
    }

    // Now query with only 5 slots — the important ones should win
    const results = await adapter.recall('important things to remember', 5);

    const importantFound = results.filter(r =>
      importantContents.some(ic => r.content.includes(ic.substring(0, 20))),
    ).length;

    const trivialFound = results.filter(r =>
      r.content.includes('Routine daily log'),
    ).length;

    let score: number;
    let details: string;

    if (importantFound >= 4 && trivialFound === 0) {
      score = 1.0;
      details = `${importantFound}/5 important memories in top 5, no trivial — excellent prioritization`;
    } else if (importantFound >= 3) {
      score = 0.7;
      details = `${importantFound}/5 important, ${trivialFound} trivial in top 5`;
    } else if (importantFound >= 2) {
      score = 0.5;
      details = `${importantFound}/5 important in top 5 — moderate prioritization`;
    } else {
      score = 0.2;
      details = `Only ${importantFound}/5 important in top 5 — poor prioritization`;
    }

    return { testId: 'loss-priority-scarcity', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

export const lossTests: TestCase[] = [
  gracefulForgetting,
  explicitForget,
  priorityUnderScarcity,
];
