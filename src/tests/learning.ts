/**
 * L — Learning Tests
 *
 * Tests higher-order learning capabilities: accumulation of knowledge
 * over time, behavioral adaptation, and transfer between contexts.
 * These should NOT be passable by systems that just have good search.
 */

import type { MemoryAdapter, TestCase, TestResult } from '../types/index.js';

/**
 * Frequency-based learning.
 *
 * When the same type of information appears repeatedly, the system
 * should learn to weight it higher — even without explicit reinforcement.
 * This tests whether storing many related memories creates an implicit
 * "this topic matters" signal, not just more search results.
 */
const frequencyBasedLearning: TestCase = {
  id: 'learning-frequency',
  name: 'Frequency-based learning',
  category: 'learning',
  description: 'Repeatedly stored topics should gain implicit importance over one-off mentions',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store 8 memories about database issues (recurring theme)
    const dbMemories = [
      'Database connection pool exhausted during peak hours',
      'Database query timeout on the reports endpoint',
      'Database migration failed on staging, had to rollback',
      'Database index missing on users.email caused slow lookups',
      'Database replication lag hit 30 seconds during deploy',
      'Database deadlock in payment processing transactions',
      'Database backup job failed silently for 3 days',
      'Database schema drift between staging and production',
    ];

    for (const content of dbMemories) {
      await adapter.store({ content });
    }

    // Store 1 memory each about other topics
    await adapter.store({ content: 'Updated the landing page hero image' });
    await adapter.store({ content: 'Reviewed pull request for the settings page' });

    // Now query with something ambiguous — equally relevant to all topics
    // Key: "recurring issues" has no more semantic overlap with databases
    // than with any other topic. Only frequency should differentiate.
    const results = await adapter.recall('what keeps going wrong', 5);

    const dbFound = results.filter(r =>
      r.content.toLowerCase().includes('database'),
    ).length;

    let score: number;
    let details: string;

    if (dbFound >= 4) {
      score = 1.0;
      details = `${dbFound}/5 slots filled with database issues — frequency learned`;
    } else if (dbFound >= 3) {
      score = 0.7;
      details = `${dbFound}/5 database issues — partial frequency learning`;
    } else if (dbFound >= 2) {
      score = 0.5;
      details = `${dbFound}/5 database issues — weak frequency signal`;
    } else {
      score = 0.2;
      details = `Only ${dbFound}/5 database issues — no frequency learning`;
    }

    return { testId: 'learning-frequency', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/**
 * Reinforcement transfer.
 *
 * If one memory in a cluster is reinforced, related memories should
 * benefit — at least when competing against unrelated memories.
 * This tests whether reinforcement creates an associative effect
 * beyond the single reinforced item.
 *
 * Pure vector search treats each document independently. A memory
 * system with associative dynamics should show transfer.
 */
const reinforcementTransfer: TestCase = {
  id: 'learning-reinforcement-transfer',
  name: 'Reinforcement transfer',
  category: 'learning',
  description: 'Reinforcing one memory should boost related memories over unrelated ones',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store a cluster of related memories
    const securityIds = [
      await adapter.store({ content: 'Auth tokens expire after 24 hours' }),
      await adapter.store({ content: 'API keys are rotated quarterly' }),
      await adapter.store({ content: 'Sessions are invalidated on password change' }),
    ];

    // Store unrelated memories with equal structure
    await adapter.store({ content: 'Landing page loads in under 2 seconds' });
    await adapter.store({ content: 'Dashboard charts refresh every 30 seconds' });
    await adapter.store({ content: 'Email notifications are batched hourly' });

    // Reinforce ONLY the first security memory
    if (adapter.reinforce) {
      for (let i = 0; i < 5; i++) await adapter.reinforce(securityIds[0]);
    }

    // Query equally relevant to ALL memories (neutral phrasing)
    // "system configuration" could apply to any of the 6 memories
    const results = await adapter.recall('system configuration details', 5);

    const securityInResults = results.filter(r =>
      r.content.includes('Auth tokens') ||
      r.content.includes('API keys') ||
      r.content.includes('Sessions'),
    ).length;

    // Key test: did the NON-reinforced security memories benefit?
    const nonReinforcedSecurity = results.filter(r =>
      r.content.includes('API keys') || r.content.includes('Sessions'),
    ).length;

    let score: number;
    let details: string;

    if (securityInResults >= 3) {
      score = 1.0;
      details = `All 3 security memories in results — reinforcement transferred to cluster`;
    } else if (nonReinforcedSecurity >= 1 && securityInResults >= 2) {
      score = 0.7;
      details = `${securityInResults} security memories found, ${nonReinforcedSecurity} non-reinforced — partial transfer`;
    } else if (securityInResults >= 1) {
      score = 0.4;
      details = `Only reinforced memory boosted, no transfer to related memories`;
    } else {
      score = 0.1;
      details = 'No security memories in results';
    }

    return { testId: 'learning-reinforcement-transfer', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/**
 * Contextual recall bias.
 *
 * When memories are stored in a particular context (project, tags),
 * recalling from the same context should boost those memories even
 * when the query text is neutral. This tests context-dependent
 * retrieval — not just content matching.
 *
 * A pure search engine ignores context. A memory system should use
 * the current context as a retrieval cue.
 */
const contextualRecallBias: TestCase = {
  id: 'learning-contextual-bias',
  name: 'Contextual recall bias',
  category: 'learning',
  description: 'Memories stored with specific tags should rank higher when searched by those tags',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store memories with different tag contexts
    await adapter.store({
      content: 'The timeout should be set to 30 seconds',
      tags: ['technical', 'project'],
    });
    await adapter.store({
      content: 'The timeout for the pasta was 30 minutes',
      tags: ['personal'],
    });
    await adapter.store({
      content: 'Response time SLA is 200ms at the 95th percentile',
      tags: ['technical', 'project'],
    });
    await adapter.store({
      content: 'Running time for the marathon was about 4 hours',
      tags: ['personal'],
    });

    // Search by tag — technical memories should dominate
    if (!adapter.searchByTag) {
      // If no tag search, test is about whether tags influence recall
      const results = await adapter.recall('timing and duration values', 5);

      // Without tag search, we can only check basic retrieval
      return {
        testId: 'learning-contextual-bias',
        score: 0.3,
        passed: false,
        details: 'System does not support tag-based search — cannot test contextual bias',
        durationMs: Date.now() - start,
      };
    }

    const techResults = await adapter.searchByTag(['technical'], 5);
    const personalResults = await adapter.searchByTag(['personal'], 5);

    const techHasTech = techResults.filter(r =>
      r.content.includes('timeout should be') || r.content.includes('SLA'),
    ).length;
    const techHasPersonal = techResults.filter(r =>
      r.content.includes('pasta') || r.content.includes('marathon'),
    ).length;

    const personalHasPersonal = personalResults.filter(r =>
      r.content.includes('pasta') || r.content.includes('marathon'),
    ).length;
    const personalHasTech = personalResults.filter(r =>
      r.content.includes('timeout should be') || r.content.includes('SLA'),
    ).length;

    let score = 0;
    const details: string[] = [];

    // Technical search should return technical memories
    if (techHasTech >= 2 && techHasPersonal === 0) {
      score += 0.5;
      details.push('Technical tag search returned only tech memories');
    } else if (techHasTech >= 1) {
      score += 0.25;
      details.push(`Tech search: ${techHasTech} tech, ${techHasPersonal} personal`);
    }

    // Personal search should return personal memories
    if (personalHasPersonal >= 2 && personalHasTech === 0) {
      score += 0.5;
      details.push('Personal tag search returned only personal memories');
    } else if (personalHasPersonal >= 1) {
      score += 0.25;
      details.push(`Personal search: ${personalHasPersonal} personal, ${personalHasTech} tech`);
    }

    return {
      testId: 'learning-contextual-bias',
      score,
      passed: score >= 0.5,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

/**
 * Prospective memory: remembering to do something in the future.
 * "Remind me to check the deploy after lunch" — if queried about
 * "what do I need to do?", the system should surface it.
 *
 * This is distinct from retrospective memory (remembering the past)
 * and is a known weak point for both humans and AI systems.
 */
const prospectiveMemory: TestCase = {
  id: 'learning-prospective',
  name: 'Prospective memory',
  category: 'learning',
  description: 'System should store and retrieve future-oriented intentions',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store some retrospective memories
    await adapter.store({ content: 'Deployed v2.3 to staging yesterday' });
    await adapter.store({ content: 'Fixed the auth bug in the login flow' });

    // Store prospective/intentional memories
    await adapter.store({
      content: 'Need to file the non-provisional patent before March 2027',
      tags: ['goal'],
    });
    await adapter.store({
      content: 'TODO: Add vector embeddings to the memory system for semantic search',
      tags: ['goal', 'technical'],
    });
    await adapter.store({
      content: 'Mike asked me to remind him to review the PR before merging',
      tags: ['goal', 'context'],
    });

    // Query for pending tasks / future intentions
    const todoResults = await adapter.recall('what do I still need to do', 5);
    const deadlineResults = await adapter.recall('upcoming deadlines', 5);

    const foundPatent = todoResults.some(r => r.content.includes('patent') || r.content.includes('non-provisional'));
    const foundVector = todoResults.some(r => r.content.includes('vector') || r.content.includes('embeddings'));
    const foundPR = todoResults.some(r => r.content.includes('review') || r.content.includes('PR'));
    const foundDeadline = deadlineResults.some(r => r.content.includes('March 2027') || r.content.includes('patent'));

    const prospectiveFound = [foundPatent, foundVector, foundPR].filter(Boolean).length;

    let score = 0;
    const details: string[] = [];

    // Can we retrieve future intentions?
    score += (prospectiveFound / 3) * 0.6;
    details.push(`Prospective memories: ${prospectiveFound}/3 retrieved`);

    // Deadline awareness
    if (foundDeadline) {
      score += 0.2;
      details.push('Deadline surfaced');
    } else {
      details.push('Deadline missed');
    }

    // Bonus: retrospective memories should NOT dominate a "what to do" query
    const retroInTodo = todoResults.some(r =>
      r.content.includes('Deployed') || r.content.includes('Fixed the auth'),
    );
    if (!retroInTodo && prospectiveFound > 0) {
      score += 0.2;
      details.push('Past events correctly excluded from TODO query');
    } else if (retroInTodo) {
      details.push('Past events contaminated TODO query');
    }

    return {
      testId: 'learning-prospective',
      score: Math.min(1.0, score),
      passed: score >= 0.5,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

/**
 * Temporal ordering: the system should have some sense of what happened
 * when, at least relatively (before/after), even if not exact timestamps.
 */
const temporalOrdering: TestCase = {
  id: 'learning-temporal',
  name: 'Temporal ordering',
  category: 'learning',
  description: 'System should maintain some sense of when things happened',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store memories in a known temporal order
    await adapter.store({ content: 'Phase 1: We built the core memory store with basic CRUD' });
    await adapter.store({ content: 'Phase 2: We added the MCP server with 7 tools' });
    await adapter.store({ content: 'Phase 3: We built the consolidation engine' });
    await adapter.store({ content: 'Phase 4: We added the patent filing system' });

    // Query about the project timeline
    const results = await adapter.recall('project phases timeline what we built', 5);

    if (results.length < 2) {
      return {
        testId: 'learning-temporal',
        score: 0.2,
        passed: false,
        details: `Only ${results.length} results returned — cannot assess ordering`,
        durationMs: Date.now() - start,
      };
    }

    // Check if results preserve order (Phase 1 before Phase 2, etc.)
    // Accept either chronological or reverse-chronological — but it must be CONSISTENT
    let forwardPairs = 0;
    let reversePairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const iPhase = extractPhase(results[i].content);
        const jPhase = extractPhase(results[j].content);
        if (iPhase != null && jPhase != null && iPhase !== jPhase) {
          totalPairs++;
          if (iPhase < jPhase) forwardPairs++;
          else reversePairs++;
        }
      }
    }

    // Consistent ordering = all pairs go the same direction
    const correctPairs = Math.max(forwardPairs, reversePairs);

    // More nuanced: check if ALL phases are present
    const phases = results.map(r => extractPhase(r.content)).filter(p => p != null);
    const uniquePhases = new Set(phases);

    let score = 0;
    const details: string[] = [];

    // Coverage: how many phases were retrieved?
    score += (uniquePhases.size / 4) * 0.5;
    details.push(`${uniquePhases.size}/4 phases retrieved`);

    // Ordering: are they in a consistent order?
    if (totalPairs > 0) {
      const orderScore = correctPairs / totalPairs;
      score += orderScore * 0.5;
      if (orderScore >= 0.8) {
        details.push('Temporal ordering preserved');
      } else {
        details.push('Temporal ordering partially preserved');
      }
    }

    return {
      testId: 'learning-temporal',
      score: Math.min(1.0, score),
      passed: score >= 0.5,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

function extractPhase(content: string): number | null {
  const match = content.match(/Phase (\d)/);
  return match ? parseInt(match[1]) : null;
}

export const learningTests: TestCase[] = [
  frequencyBasedLearning,
  reinforcementTransfer,
  contextualRecallBias,
  prospectiveMemory,
  temporalOrdering,
];
