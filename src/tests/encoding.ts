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

export const encodingTests: TestCase[] = [
  tagBasedRetrieval,
  salienceDiscrimination,
  fuzzyEncoding,
];
