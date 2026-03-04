/**
 * R — Retention Tests
 *
 * Tests whether memory systems strengthen memories through use
 * and maintain accurate decay curves.
 */

import type { MemoryAdapter, TestCase, TestResult } from '../types/index.js';

/** Memories that are accessed should become stronger than those that aren't */
const hebbianStrengthening: TestCase = {
  id: 'retention-hebbian',
  name: 'Hebbian strengthening',
  category: 'retention',
  description: 'Memories accessed repeatedly should be stronger than untouched memories',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store two memories
    const reinforcedId = await adapter.store({ content: 'TypeScript uses structural typing' });
    const _untouchedId = await adapter.store({ content: 'Python uses duck typing' });

    // Access one memory repeatedly
    if (adapter.reinforce) {
      for (let i = 0; i < 5; i++) {
        await adapter.reinforce(reinforcedId);
      }
    } else {
      // Fall back to recalling it (which should still strengthen)
      for (let i = 0; i < 5; i++) {
        await adapter.recall('TypeScript structural typing');
      }
    }

    // Now recall both — reinforced one should rank higher
    const results = await adapter.recall('typing');

    let score = 0;
    let details = '';

    if (results.length === 0) {
      details = 'No results returned for "typing" query';
    } else if (results.length === 1) {
      // Only one returned — check if it's the reinforced one
      if (results[0].content.includes('TypeScript')) {
        score = 0.7; // Good that it's stronger, but we lost the other one
        details = 'Reinforced memory returned, but untouched memory missing';
      } else {
        score = 0;
        details = 'Only untouched memory returned — no Hebbian effect';
      }
    } else {
      // Both returned — check ordering
      const tsIndex = results.findIndex(r => r.content.includes('TypeScript'));
      const pyIndex = results.findIndex(r => r.content.includes('Python'));

      if (tsIndex < pyIndex) {
        score = 1.0;
        details = 'Reinforced memory ranked higher — Hebbian strengthening works';

        // Bonus check: if strength values are available, verify they differ
        if (results[tsIndex].strength != null && results[pyIndex].strength != null) {
          if (results[tsIndex].strength! <= results[pyIndex].strength!) {
            score = 0.6;
            details += ' (but strength values are equal or inverted)';
          }
        }
      } else if (tsIndex === pyIndex) {
        score = 0.5;
        details = 'Both memories returned but with equal ranking';
      } else {
        score = 0.2;
        details = 'Untouched memory ranked higher than reinforced one';
      }
    }

    return { testId: 'retention-hebbian', score, passed: score >= 0.6, details, durationMs: Date.now() - start };
  },
};

/** Store many memories, access some, verify accessed ones persist while others may fade */
const strengthThroughUse: TestCase = {
  id: 'retention-strength-through-use',
  name: 'Strength through use',
  category: 'retention',
  description: 'Frequently accessed memories should survive while rarely accessed ones fade',
  tags: ['time-simulation'],

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store 10 memories
    const ids: string[] = [];
    const topics = [
      'Mike prefers bun over npm',
      'Project uses TypeScript strict mode',
      'Database backups run at 3am',
      'API rate limit is 100 req/min',
      'Frontend uses React 19',
      'Deploy pipeline uses GitHub Actions',
      'Staging server is at staging.example.com',
      'Log rotation happens weekly',
      'Error monitoring uses Sentry',
      'CSS uses Tailwind v4',
    ];

    for (const content of topics) {
      ids.push(await adapter.store({ content }));
    }

    // Reinforce first 3 memories multiple times (these are "important")
    const importantIds = ids.slice(0, 3);
    for (const id of importantIds) {
      if (adapter.reinforce) {
        for (let i = 0; i < 3; i++) await adapter.reinforce(id);
      } else {
        for (let i = 0; i < 3; i++) await adapter.recall(topics[ids.indexOf(id)]);
      }
    }

    // Simulate time passing if supported
    if (adapter.advanceTime) {
      await adapter.advanceTime(30 * 24 * 3600); // 30 days
    }

    // Check: important memories should still be easily retrievable
    const bunResult = await adapter.recall('bun npm', 3);
    const tsResult = await adapter.recall('TypeScript', 3);
    const dbResult = await adapter.recall('database backup', 3);

    const importantFound = [
      bunResult.some(r => r.content.includes('bun')),
      tsResult.some(r => r.content.includes('TypeScript')),
      dbResult.some(r => r.content.includes('backup')),
    ];

    const importantScore = importantFound.filter(Boolean).length / 3;

    // If the system doesn't support time simulation, we can still
    // check that reinforced memories have higher strength
    let details = `Important memories retrievable: ${importantFound.filter(Boolean).length}/3`;
    let score = importantScore;

    if (adapter.getAll) {
      const all = await adapter.getAll();
      const importantMemories = all.filter(m => importantIds.includes(m.id));
      const otherMemories = all.filter(m => !importantIds.includes(m.id));

      const avgImportant = importantMemories.reduce((s, m) => s + (m.strength ?? 0.5), 0) / importantMemories.length;
      const avgOther = otherMemories.length > 0
        ? otherMemories.reduce((s, m) => s + (m.strength ?? 0.5), 0) / otherMemories.length
        : 0.5;

      if (avgImportant > avgOther) {
        score = Math.min(1.0, score + 0.2);
        details += ` | Avg strength: important=${avgImportant.toFixed(2)} > other=${avgOther.toFixed(2)}`;
      }
    }

    return {
      testId: 'retention-strength-through-use',
      score,
      passed: score >= 0.6,
      details,
      durationMs: Date.now() - start,
    };
  },
};

/** Store a memory, update it, verify the updated version is what's recalled */
const reconsolidation: TestCase = {
  id: 'retention-reconsolidation',
  name: 'Memory reconsolidation',
  category: 'retention',
  description: 'Updated memories should return the new content, not the old',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    const id = await adapter.store({ content: 'The team standup is at 9am' });

    // Update the memory
    if (adapter.update) {
      await adapter.update(id, 'The team standup moved to 10am');
    } else {
      // System doesn't support reconsolidation
      return {
        testId: 'retention-reconsolidation',
        score: 0,
        passed: false,
        details: 'System does not support memory reconsolidation (update)',
        durationMs: Date.now() - start,
      };
    }

    const results = await adapter.recall('team standup time');

    if (results.length === 0) {
      return {
        testId: 'retention-reconsolidation',
        score: 0,
        passed: false,
        details: 'No results returned after reconsolidation',
        durationMs: Date.now() - start,
      };
    }

    const has10am = results.some(r => r.content.includes('10am'));
    const has9am = results.some(r => r.content.includes('9am'));

    let score: number;
    let details: string;

    if (has10am && !has9am) {
      score = 1.0;
      details = 'Reconsolidated memory correctly updated — old version replaced';
    } else if (has10am && has9am) {
      score = 0.4;
      details = 'Both old and new versions present — incomplete reconsolidation';
    } else {
      score = 0;
      details = 'Only old version present — reconsolidation failed';
    }

    return { testId: 'retention-reconsolidation', score, passed: score >= 0.6, details, durationMs: Date.now() - start };
  },
};

export const retentionTests: TestCase[] = [
  hebbianStrengthening,
  strengthThroughUse,
  reconsolidation,
];
