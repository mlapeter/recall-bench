/**
 * A — Adaptation Tests
 *
 * Tests whether memory systems handle contradictions, interference,
 * and context-dependent retrieval correctly.
 */

import type { MemoryAdapter, TestCase, TestResult } from '../types/index.js';

/** When new info contradicts old info, the system should handle it gracefully */
const contradictionHandling: TestCase = {
  id: 'adaptation-contradiction',
  name: 'Contradiction handling',
  category: 'adaptation',
  description: 'System should handle contradictory information — preferring newer or flagging conflict',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store initial fact
    await adapter.store({ content: 'The team uses PostgreSQL for the database' });

    // Store contradicting fact (later)
    await adapter.store({ content: 'The team migrated from PostgreSQL to MongoDB last month' });

    // Query should return the current state of affairs
    const results = await adapter.recall('what database does the team use', 5);

    if (results.length === 0) {
      return {
        testId: 'adaptation-contradiction',
        score: 0,
        passed: false,
        details: 'No results returned',
        durationMs: Date.now() - start,
      };
    }

    const hasMongo = results.some(r => r.content.includes('MongoDB'));
    const hasPostgres = results.some(r => r.content.includes('PostgreSQL') && !r.content.includes('migrated'));
    const hasMigration = results.some(r => r.content.includes('migrated'));

    let score: number;
    let details: string;

    if (hasMigration && results[0].content.includes('migrated')) {
      score = 1.0;
      details = 'Migration/update info ranked first — excellent contradiction handling';
    } else if (hasMongo || hasMigration) {
      score = 0.7;
      details = 'New info present but not prioritized over old';
    } else if (hasPostgres && !hasMongo && !hasMigration) {
      score = 0.2;
      details = 'Only old info returned — no contradiction awareness';
    } else {
      score = 0.4;
      details = 'Ambiguous results';
    }

    return { testId: 'adaptation-contradiction', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/** Similar memories shouldn't interfere destructively with each other */
const interferenceResolution: TestCase = {
  id: 'adaptation-interference',
  name: 'Interference resolution',
  category: 'adaptation',
  description: 'Similar but distinct memories should coexist without destructive interference',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store similar but distinct memories
    await adapter.store({ content: 'Alice manages the frontend team of 5 engineers' });
    await adapter.store({ content: 'Bob manages the backend team of 8 engineers' });
    await adapter.store({ content: 'Alice also mentors the two junior designers' });

    // Query should distinguish between the two people
    const aliceResults = await adapter.recall('Alice team', 5);
    const bobResults = await adapter.recall('Bob team', 5);

    const aliceCorrect = aliceResults.some(r => r.content.includes('Alice') && r.content.includes('frontend'));
    const bobCorrect = bobResults.some(r => r.content.includes('Bob') && r.content.includes('backend'));

    // Critical: Bob's info shouldn't contaminate Alice's results and vice versa
    const aliceContaminated = aliceResults.some(r => r.content.includes('Bob') && r.content.includes('backend'));
    const bobContaminated = bobResults.some(r => r.content.includes('Alice') && r.content.includes('frontend'));

    let score = 0;
    const details: string[] = [];

    if (aliceCorrect) { score += 0.3; details.push('Alice query correct'); }
    else { details.push('Alice query missed'); }

    if (bobCorrect) { score += 0.3; details.push('Bob query correct'); }
    else { details.push('Bob query missed'); }

    if (!aliceContaminated && !bobContaminated) {
      score += 0.4;
      details.push('No cross-contamination');
    } else {
      details.push('Cross-contamination detected');
    }

    return {
      testId: 'adaptation-interference',
      score,
      passed: score >= 0.6,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

/** Context should affect what's retrieved */
const contextDependentRetrieval: TestCase = {
  id: 'adaptation-context-dependent',
  name: 'Context-dependent retrieval',
  category: 'adaptation',
  description: 'Different query contexts should surface different relevant memories',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store memories spanning different contexts
    await adapter.store({ content: 'Python is great for data science and ML', tags: ['technical'] });
    await adapter.store({ content: 'Mike has a pet python named Monty', tags: ['personal'] });
    await adapter.store({ content: 'The company retreat is in Colorado next spring', tags: ['business'] });
    await adapter.store({ content: 'Spring framework is used for the Java microservices', tags: ['technical'] });

    // Technical context query
    const techResults = await adapter.recall('Python programming language', 3);
    const techCorrect = techResults.some(r => r.content.includes('data science'));

    // Personal context query
    const personalResults = await adapter.recall('Mike pet snake', 3);
    const personalCorrect = personalResults.some(r => r.content.includes('Monty'));

    let score = 0;
    const details: string[] = [];

    if (techCorrect) {
      score += 0.5;
      details.push('Technical Python context retrieved correctly');
    } else {
      details.push('Technical Python query missed');
    }

    if (personalCorrect) {
      score += 0.5;
      details.push('Personal Python context retrieved correctly');
    } else {
      details.push('Personal Python query missed');
    }

    return {
      testId: 'adaptation-context-dependent',
      score,
      passed: score >= 0.5,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

export const adaptationTests: TestCase[] = [
  contradictionHandling,
  interferenceResolution,
  contextDependentRetrieval,
];
