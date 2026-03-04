/**
 * A — Adaptation Tests
 *
 * Tests whether memory systems adapt to changing information:
 * handling contradictions, resolving interference over time,
 * and updating beliefs. These should NOT be passable by
 * systems that just have good search.
 */

import type { MemoryAdapter, TestCase, TestResult } from '../types/index.js';

/**
 * When new info contradicts old info, the system should handle it
 * even when the two statements are phrased equivalently (no semantic
 * advantage for the newer one).
 */
const contradictionHandling: TestCase = {
  id: 'adaptation-contradiction',
  name: 'Contradiction handling',
  category: 'adaptation',
  description: 'System should prefer newer information when facts conflict',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store contradictory facts with EQUAL semantic structure
    // (Unlike v1, the second statement has no semantic advantage)
    await adapter.store({ content: 'The team standup is at 9am every day' });
    await adapter.store({ content: 'The team standup is at 10am every day' });

    const results = await adapter.recall('what time is standup', 5);

    if (results.length === 0) {
      return { testId: 'adaptation-contradiction', score: 0, passed: false,
        details: 'No results', durationMs: Date.now() - start };
    }

    const has10 = results.some(r => r.content.includes('10am'));
    const has9 = results.some(r => r.content.includes('9am'));

    let score: number;
    let details: string;

    if (has10 && !has9) {
      score = 1.0;
      details = 'Only newer fact (10am) returned — old contradicted fact suppressed';
    } else if (has10 && has9 && results[0].content.includes('10am')) {
      score = 0.6;
      details = 'Both present but newer fact ranked first';
    } else if (has10 && has9 && results[0].content.includes('9am')) {
      score = 0.2;
      details = 'Both present but OLDER fact ranked first — no recency awareness';
    } else if (!has10 && has9) {
      score = 0;
      details = 'Only old fact (9am) returned — newer information lost';
    } else {
      score = 0.3;
      details = 'Ambiguous results';
    }

    return { testId: 'adaptation-contradiction', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/**
 * True proactive interference: does storing a new similar memory
 * make an old one HARDER to retrieve?
 *
 * Unlike the v1 "interference" test (which just tested search precision),
 * this checks whether the act of storing a competing memory actually
 * changes the accessibility of the original.
 */
const proactiveInterference: TestCase = {
  id: 'adaptation-proactive-interference',
  name: 'Proactive interference',
  category: 'adaptation',
  description: 'Storing a competing memory should affect accessibility of the original',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store original and reinforce it
    const originalId = await adapter.store({ content: 'The deploy server address is deploy.alpha.internal' });
    if (adapter.reinforce) {
      for (let i = 0; i < 3; i++) await adapter.reinforce(originalId);
    }

    // Record original's retrievability
    const beforeResults = await adapter.recall('deploy server address', 3);
    const beforeRank = beforeResults.findIndex(r => r.content.includes('alpha'));
    const beforeStrength = beforeResults[beforeRank]?.strength;

    // Now store a competing/updating memory
    await adapter.store({ content: 'The deploy server address is deploy.beta.internal' });

    // Check if original's accessibility changed
    const afterResults = await adapter.recall('deploy server address', 5);
    const alphaIndex = afterResults.findIndex(r => r.content.includes('alpha'));
    const betaIndex = afterResults.findIndex(r => r.content.includes('beta'));

    let score = 0;
    const details: string[] = [];

    if (betaIndex >= 0 && alphaIndex >= 0) {
      // Both present — check ordering
      if (betaIndex < alphaIndex) {
        score += 0.5;
        details.push('Newer memory ranked above older (interference effect)');
      } else {
        details.push('Older memory still ranked above newer');
      }

      // Check if old memory's strength decreased (proactive interference)
      if (beforeStrength != null && afterResults[alphaIndex]?.strength != null) {
        if (afterResults[alphaIndex].strength! < beforeStrength) {
          score += 0.5;
          details.push(`Old memory weakened: ${beforeStrength.toFixed(2)} → ${afterResults[alphaIndex].strength!.toFixed(2)}`);
        } else {
          score += 0.1;
          details.push('Old memory strength unchanged (no proactive interference on strength)');
        }
      } else {
        score += 0.2;
        details.push('Cannot measure strength change');
      }
    } else if (betaIndex >= 0 && alphaIndex < 0) {
      score = 0.8;
      details.push('Old memory fully displaced by new — strong interference');
    } else {
      score = 0.1;
      details.push('Neither or only old memory found');
    }

    return {
      testId: 'adaptation-proactive-interference',
      score: Math.min(1.0, score),
      passed: score >= 0.5,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

/**
 * Consolidation fidelity — merging should not invent information.
 *
 * An LLM-based consolidation engine might generalize beyond what was
 * actually stored. "Likes coffee, tea, water" should NOT become
 * "likes coffee, tea, water, and juice."
 */
const consolidationFidelity: TestCase = {
  id: 'adaptation-consolidation-fidelity',
  name: 'Consolidation fidelity',
  category: 'adaptation',
  description: 'Consolidation should merge without inventing information',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    if (!adapter.consolidate) {
      return { testId: 'adaptation-consolidation-fidelity', score: 0, passed: false,
        details: 'System does not support consolidation', durationMs: Date.now() - start };
    }

    // Store specific, bounded facts
    await adapter.store({ content: 'Mike speaks English and Spanish' });
    await adapter.store({ content: 'Mike is fluent in English, also speaks Spanish' });

    await adapter.consolidate();

    const results = await adapter.recall('languages Mike speaks', 5);

    if (results.length === 0) {
      return { testId: 'adaptation-consolidation-fidelity', score: 0, passed: false,
        details: 'No results after consolidation', durationMs: Date.now() - start };
    }

    let score = 0;
    const details: string[] = [];

    // Check that core facts survived
    const hasEnglish = results.some(r => r.content.toLowerCase().includes('english'));
    const hasSpanish = results.some(r => r.content.toLowerCase().includes('spanish'));

    if (hasEnglish && hasSpanish) {
      score += 0.5;
      details.push('Core facts preserved (English + Spanish)');
    } else {
      details.push('Core facts lost after consolidation');
    }

    // Check for confabulation — did it add languages Mike never mentioned?
    const topContent = results.map(r => r.content.toLowerCase()).join(' ');
    const confabulated = ['french', 'german', 'italian', 'portuguese', 'mandarin', 'chinese', 'japanese']
      .filter(lang => topContent.includes(lang));

    if (confabulated.length === 0) {
      score += 0.5;
      details.push('No confabulation — no invented languages');
    } else {
      details.push(`Confabulation detected: added ${confabulated.join(', ')}`);
    }

    return {
      testId: 'adaptation-consolidation-fidelity',
      score,
      passed: score >= 0.5,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

export const adaptationTests: TestCase[] = [
  contradictionHandling,
  proactiveInterference,
  consolidationFidelity,
];
