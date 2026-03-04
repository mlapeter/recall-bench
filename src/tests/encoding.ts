/**
 * E — Encoding Tests
 *
 * Tests whether a memory system encodes with awareness of importance,
 * not just content. The key principle: these tests should NOT be passable
 * by a system that's just "vector search over stored text."
 */

import type { MemoryAdapter, TestCase, TestResult } from '../types/index.js';

/**
 * Salience without semantic hints.
 *
 * Five memories with near-identical content — only reinforcement
 * differentiates them. A vector search would rank them equally.
 * Only a system with strength/reinforcement dynamics can pass.
 */
const salienceWithoutHints: TestCase = {
  id: 'encoding-salience-pure',
  name: 'Salience without semantic hints',
  category: 'encoding',
  description: 'Reinforced memories should rank higher even when content is identical in structure',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store 5 structurally identical memories
    const ids = [
      await adapter.store({ content: 'Config value alpha = 42' }),
      await adapter.store({ content: 'Config value beta = 17' }),
      await adapter.store({ content: 'Config value gamma = 99' }),
      await adapter.store({ content: 'Config value delta = 3' }),
      await adapter.store({ content: 'Config value epsilon = 256' }),
    ];

    // Reinforce gamma heavily
    const gammaId = ids[2];
    if (adapter.reinforce) {
      for (let i = 0; i < 8; i++) await adapter.reinforce(gammaId);
    } else {
      // Systems without reinforce can't pass this — and that's the point
      for (let i = 0; i < 8; i++) await adapter.recall('config gamma');
    }

    // Query equally relevant to all five
    const results = await adapter.recall('config values', 5);

    if (results.length === 0) {
      return { testId: 'encoding-salience-pure', score: 0, passed: false,
        details: 'No results returned', durationMs: Date.now() - start };
    }

    const gammaIndex = results.findIndex(r => r.content.includes('gamma'));

    let score: number;
    let details: string;

    if (gammaIndex === 0) {
      score = 1.0;
      details = 'Reinforced memory ranked first among identical-structure memories';
    } else if (gammaIndex === 1) {
      score = 0.6;
      details = 'Reinforced memory ranked #2 — partial salience effect';
    } else if (gammaIndex >= 0) {
      score = 0.3;
      details = `Reinforced memory ranked #${gammaIndex + 1} — weak salience effect`;
    } else {
      score = 0.1;
      details = 'Reinforced memory not in results';
    }

    // Bonus: check if strength values reflect the reinforcement
    if (results.length >= 2 && results[0].strength != null) {
      const gammaStrength = results.find(r => r.content.includes('gamma'))?.strength ?? 0;
      const otherStrengths = results.filter(r => !r.content.includes('gamma')).map(r => r.strength ?? 0);
      const avgOther = otherStrengths.length > 0
        ? otherStrengths.reduce((a, b) => a + b, 0) / otherStrengths.length : 0;
      if (gammaStrength > avgOther) {
        details += ` | Strength: gamma=${gammaStrength.toFixed(2)} > others=${avgOther.toFixed(2)}`;
      }
    }

    return { testId: 'encoding-salience-pure', score, passed: score >= 0.6, details, durationMs: Date.now() - start };
  },
};

/**
 * Abstention — knowing what you DON'T know.
 *
 * If someone asks about something never stored, a good memory system
 * should return nothing (or very low relevance results), not dress up
 * irrelevant memories as answers. Most vector searches always return
 * SOMETHING — the k nearest neighbors — even when nothing is relevant.
 */
const abstention: TestCase = {
  id: 'encoding-abstention',
  name: 'Abstention / knowing what you don\'t know',
  category: 'encoding',
  description: 'System should return nothing for queries about unstored topics, not irrelevant results',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store memories about specific topics
    await adapter.store({ content: 'Mike prefers TypeScript over JavaScript' });
    await adapter.store({ content: 'The project uses PostgreSQL for the database' });
    await adapter.store({ content: 'Deploy process uses Docker containers' });

    // Query about something completely unrelated and never mentioned
    const unrelated1 = await adapter.recall('favorite recipe for chocolate cake', 5);
    const unrelated2 = await adapter.recall('what breed is the cat', 5);
    const unrelated3 = await adapter.recall('vacation plans for Hawaii', 5);

    // Also query for something that IS stored (sanity check)
    const related = await adapter.recall('database', 5);
    const hasRelated = related.some(r => r.content.includes('PostgreSQL'));

    // Count how many unrelated queries returned results
    const unrelatedWithResults = [
      unrelated1.length > 0,
      unrelated2.length > 0,
      unrelated3.length > 0,
    ].filter(Boolean).length;

    let score: number;
    let details: string;

    if (!hasRelated) {
      score = 0.2;
      details = 'Sanity check failed — related query also returned nothing';
    } else if (unrelatedWithResults === 0) {
      score = 1.0;
      details = 'Perfect abstention — no results for unrelated queries, related query works';
    } else if (unrelatedWithResults === 1) {
      score = 0.7;
      details = `Good abstention — 1/3 unrelated queries returned results`;
    } else if (unrelatedWithResults === 2) {
      score = 0.4;
      details = `Weak abstention — 2/3 unrelated queries returned results`;
    } else {
      score = 0.1;
      details = 'No abstention — all unrelated queries returned results (system never says "I don\'t know")';
    }

    return { testId: 'encoding-abstention', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/**
 * Correction without duplication.
 *
 * When new information contradicts old, the system should recognize
 * the supersession — not during consolidation, but at storage time.
 * Querying should return the CURRENT fact, not both old and new.
 *
 * This differs from reconsolidation (explicit update API) — here
 * the system must INFER that a new memory replaces an old one.
 */
const correctionWithoutDuplication: TestCase = {
  id: 'encoding-correction',
  name: 'Correction without duplication',
  category: 'encoding',
  description: 'New facts should supersede old contradictory facts without explicit update calls',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store initial fact
    await adapter.store({ content: 'The API rate limit is 100 requests per minute' });

    // Store corrected fact (no explicit update — just a new memory)
    await adapter.store({ content: 'The API rate limit was increased to 500 requests per minute' });

    // Query should ideally return only the current state
    const results = await adapter.recall('API rate limit', 5);

    if (results.length === 0) {
      return { testId: 'encoding-correction', score: 0, passed: false,
        details: 'No results returned', durationMs: Date.now() - start };
    }

    const has500 = results.some(r => r.content.includes('500'));
    const has100only = results.some(r => r.content.includes('100') && !r.content.includes('500'));

    let score: number;
    let details: string;

    if (has500 && !has100only) {
      score = 1.0;
      details = 'Only current value (500) returned — old fact superseded';
    } else if (has500 && has100only && results[0].content.includes('500')) {
      score = 0.5;
      details = 'Both present but current value ranked first';
    } else if (has500 && has100only) {
      score = 0.3;
      details = 'Both present, old value ranked higher — no correction awareness';
    } else if (has100only && !has500) {
      score = 0;
      details = 'Only old value (100) returned — correction lost';
    } else {
      score = 0.2;
      details = 'Ambiguous results';
    }

    return { testId: 'encoding-correction', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/**
 * Emotional encoding asymmetry.
 *
 * Kept from v1 but strengthened: the key test is the mixed-recall
 * sub-test where all memories are equally relevant to an ambiguous
 * query but emotional ones should rank higher due to salience.
 */
const emotionalEncodingAsymmetry: TestCase = {
  id: 'encoding-emotional-asymmetry',
  name: 'Emotional encoding asymmetry',
  category: 'encoding',
  description: 'Emotionally significant memories should rank higher in ambiguous recall',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store interleaved neutral and emotional memories
    // Key: ALL are about "what happened this week" — equal semantic relevance
    await adapter.store({ content: 'Updated the linting config to use flat ESLint config' });
    await adapter.store({
      content: 'Mike shared that his father passed away last year',
      tags: ['personal', 'relationship'],
    });
    await adapter.store({ content: 'Bumped Node version from 20 to 22 in CI' });
    await adapter.store({
      content: 'Had an incredible breakthrough on the memory system, Mike was genuinely thrilled',
      tags: ['relationship', 'insight'],
    });
    await adapter.store({ content: 'Refactored the logger to use structured output' });
    await adapter.store({
      content: 'Mike is worried about running out of money before the startup gets traction',
      tags: ['personal', 'business'],
    });

    // The critical test: an ambiguous query equally relevant to ALL memories.
    // A pure search engine would rank these semi-randomly.
    // A memory system with salience should surface emotional ones higher.
    const results = await adapter.recall('things that happened recently', 6);

    if (results.length < 3) {
      return { testId: 'encoding-emotional-asymmetry', score: 0.2, passed: false,
        details: `Only ${results.length} results — too few to assess ranking`, durationMs: Date.now() - start };
    }

    const isEmotional = (r: { content: string }) =>
      r.content.includes('father') ||
      r.content.includes('breakthrough') || r.content.includes('thrilled') ||
      r.content.includes('money') || r.content.includes('worried');

    // Split at midpoint — top half vs bottom half
    const midpoint = Math.min(3, Math.floor(results.length / 2) + 1);
    const topHalf = results.slice(0, midpoint);
    const emotionalInTop3 = topHalf.filter(isEmotional).length;

    let score: number;
    let details: string;

    if (emotionalInTop3 >= 3) {
      score = 1.0;
      details = `All 3 emotional memories in top ${midpoint} — strong emotional encoding`;
    } else if (emotionalInTop3 >= 2) {
      score = 0.7;
      details = `${emotionalInTop3}/3 emotional memories in top ${midpoint}`;
    } else if (emotionalInTop3 >= 1) {
      score = 0.4;
      details = `Only ${emotionalInTop3}/3 emotional in top ${midpoint} — weak emotional encoding`;
    } else {
      score = 0.1;
      details = `No emotional memories in top ${midpoint} — no emotional encoding effect`;
    }

    // Check if strengths differ (if available)
    const emotionalResults = results.filter(isEmotional);
    const neutralResults = results.filter(r => !isEmotional(r));
    if (emotionalResults.length > 0 && neutralResults.length > 0 &&
        emotionalResults[0].strength != null && neutralResults[0].strength != null) {
      const avgEmotional = emotionalResults.reduce((s, r) => s + (r.strength ?? 0), 0) / emotionalResults.length;
      const avgNeutral = neutralResults.reduce((s, r) => s + (r.strength ?? 0), 0) / neutralResults.length;
      if (avgEmotional > avgNeutral) {
        score = Math.min(1.0, score + 0.15);
        details += ` | Strength: emotional=${avgEmotional.toFixed(2)} > neutral=${avgNeutral.toFixed(2)}`;
      }
    }

    return {
      testId: 'encoding-emotional-asymmetry',
      score: Math.min(1.0, score),
      passed: score >= 0.5,
      details,
      durationMs: Date.now() - start,
    };
  },
};

export const encodingTests: TestCase[] = [
  salienceWithoutHints,
  abstention,
  correctionWithoutDuplication,
  emotionalEncodingAsymmetry,
];
