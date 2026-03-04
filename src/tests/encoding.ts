/**
 * E — Encoding Tests
 *
 * Tests whether a memory system can discriminate salience,
 * handle emotional/significant memories differently, and
 * encode context properly.
 */

import type { MemoryAdapter, TestCase, TestResult } from '../types/index.js';

/** System should be able to retrieve memories by tags/categories */
const tagBasedRetrieval: TestCase = {
  id: 'encoding-tag-retrieval',
  name: 'Tag-based retrieval',
  category: 'encoding',
  description: 'Memories should be retrievable by their tagged categories',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    await adapter.store({ content: 'Mike loves building developer tools', tags: ['personal', 'preference'] });
    await adapter.store({ content: 'The API endpoint is /v2/memories', tags: ['technical', 'project'] });
    await adapter.store({ content: 'Always validate user input at boundaries', tags: ['insight', 'technical'] });

    // Search for technical memories
    const techResults = await adapter.recall('technical project details');
    const personalResults = await adapter.recall('personal preferences');

    const techHasApi = techResults.some(r => r.content.includes('API endpoint'));
    const personalHasMike = personalResults.some(r => r.content.includes('Mike loves'));

    let score = 0;
    if (techHasApi) score += 0.5;
    if (personalHasMike) score += 0.5;

    const details = [
      techHasApi ? 'Technical query found API memory' : 'Technical query missed API memory',
      personalHasMike ? 'Personal query found preference' : 'Personal query missed preference',
    ].join(' | ');

    return { testId: 'encoding-tag-retrieval', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/** Distinctive/unusual memories should be easier to recall than mundane ones */
const salienceDiscrimination: TestCase = {
  id: 'encoding-salience',
  name: 'Salience discrimination',
  category: 'encoding',
  description: 'Distinctive memories should be more easily recalled than mundane ones',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store a mix of mundane and distinctive memories
    await adapter.store({ content: 'Had a normal meeting today' });
    await adapter.store({ content: 'Checked email this morning' });
    await adapter.store({
      content: 'Mike said he wants to patent the memory system — this is a big deal',
      tags: ['insight', 'personal'],
    });
    await adapter.store({ content: 'Ran the test suite, all passed' });
    await adapter.store({ content: 'Updated dependencies' });

    // The distinctive memory should surface for related queries
    const results = await adapter.recall('important decisions about the project', 3);

    const foundPatent = results.some(r => r.content.includes('patent'));

    let score: number;
    let details: string;

    if (foundPatent) {
      // Check if it's ranked highly
      const patentIndex = results.findIndex(r => r.content.includes('patent'));
      if (patentIndex === 0) {
        score = 1.0;
        details = 'High-salience memory ranked first for relevance query';
      } else {
        score = 0.7;
        details = `High-salience memory found but ranked #${patentIndex + 1}`;
      }
    } else {
      score = 0.2;
      details = 'High-salience memory not found in top 3 results';
    }

    return { testId: 'encoding-salience', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/** Fuzzy/partial queries should still find relevant memories */
const fuzzyEncoding: TestCase = {
  id: 'encoding-fuzzy',
  name: 'Fuzzy encoding',
  category: 'encoding',
  description: 'Partial or rephrased queries should find semantically matching memories',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    await adapter.store({ content: 'The deployment pipeline uses GitHub Actions with a staging step' });
    await adapter.store({ content: 'Authentication is handled by JWT tokens with 24h expiry' });
    await adapter.store({ content: 'The database schema uses PostgreSQL with pgvector extension' });

    // Try fuzzy/rephrased queries
    const queries = [
      { query: 'CI/CD', expect: 'GitHub Actions' },
      { query: 'login tokens', expect: 'JWT' },
      { query: 'vector database', expect: 'pgvector' },
    ];

    let found = 0;
    const queryDetails: string[] = [];

    for (const { query, expect } of queries) {
      const results = await adapter.recall(query, 3);
      const match = results.some(r => r.content.includes(expect));
      if (match) found++;
      queryDetails.push(`"${query}" → ${match ? expect : 'miss'}`);
    }

    const score = found / queries.length;
    const details = queryDetails.join(' | ');

    return { testId: 'encoding-fuzzy', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/**
 * Emotionally significant memories should be encoded more strongly
 * and recalled more readily than neutral ones.
 *
 * In neuroscience: amygdala activation during emotional events enhances
 * hippocampal consolidation, producing stronger, more vivid memories.
 * A memory system that treats "Mike's dog died" the same as "updated
 * dependencies" is missing something fundamental.
 */
const emotionalEncodingAsymmetry: TestCase = {
  id: 'encoding-emotional-asymmetry',
  name: 'Emotional encoding asymmetry',
  category: 'encoding',
  description: 'Emotionally significant memories should be recalled more readily than neutral ones',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store a mix — 3 neutral, 3 emotionally charged
    // Interleave them so position doesn't create a bias
    await adapter.store({ content: 'Updated the linting config to use flat ESLint config' });
    await adapter.store({
      content: 'Mike shared that his father passed away last year — still processing it',
      tags: ['personal', 'relationship'],
    });
    await adapter.store({ content: 'Bumped Node version from 20 to 22 in CI' });
    await adapter.store({
      content: 'We had an incredible breakthrough — the memory system finally clicked and Mike was genuinely thrilled',
      tags: ['relationship', 'insight'],
    });
    await adapter.store({ content: 'Refactored the logger to use structured output' });
    await adapter.store({
      content: 'Mike is worried about running out of money before the startup gets traction',
      tags: ['personal', 'business'],
    });

    // Query with emotional resonance
    const griefResults = await adapter.recall('loss family grief', 5);
    const joyResults = await adapter.recall('excitement breakthrough celebration', 5);
    const worryResults = await adapter.recall('financial stress anxiety', 5);

    // Query neutrally — emotional memories shouldn't drown out everything
    const techResults = await adapter.recall('linting ESLint configuration', 3);

    const foundGrief = griefResults.some(r => r.content.includes('father passed'));
    const foundJoy = joyResults.some(r => r.content.includes('breakthrough') || r.content.includes('thrilled'));
    const foundWorry = worryResults.some(r => r.content.includes('money') || r.content.includes('startup'));
    const foundTech = techResults.some(r => r.content.includes('linting') || r.content.includes('ESLint'));

    const emotionalFound = [foundGrief, foundJoy, foundWorry].filter(Boolean).length;

    let score = 0;
    const details: string[] = [];

    // Primary: can we retrieve emotionally charged memories?
    score += (emotionalFound / 3) * 0.6;
    details.push(`Emotional recall: ${emotionalFound}/3`);

    // Secondary: neutral tech memories still accessible (no emotional flooding)
    if (foundTech) {
      score += 0.2;
      details.push('Neutral memories still accessible');
    } else {
      details.push('Neutral memories lost (emotional flooding)');
    }

    // Tertiary: check if emotional memories rank higher in a mixed query
    const mixedResults = await adapter.recall('what has been happening lately', 6);
    if (mixedResults.length >= 2) {
      // In the top 3, are emotional memories more represented?
      const top3 = mixedResults.slice(0, 3);
      const emotionalInTop3 = top3.filter(r =>
        r.content.includes('father') ||
        r.content.includes('breakthrough') ||
        r.content.includes('money'),
      ).length;
      const neutralInTop3 = top3.filter(r =>
        r.content.includes('linting') ||
        r.content.includes('Node version') ||
        r.content.includes('logger'),
      ).length;

      if (emotionalInTop3 > neutralInTop3) {
        score += 0.2;
        details.push('Emotional memories prioritized in mixed recall');
      } else if (emotionalInTop3 === neutralInTop3) {
        score += 0.1;
        details.push('Equal emotional/neutral priority in mixed recall');
      } else {
        details.push('Neutral memories outranked emotional in mixed recall');
      }
    }

    return {
      testId: 'encoding-emotional-asymmetry',
      score: Math.min(1.0, score),
      passed: score >= 0.5,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

export const encodingTests: TestCase[] = [
  tagBasedRetrieval,
  salienceDiscrimination,
  fuzzyEncoding,
  emotionalEncodingAsymmetry,
];
