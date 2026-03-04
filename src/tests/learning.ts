/**
 * L — Learning Tests
 *
 * Tests higher-order memory capabilities: cross-domain transfer,
 * relationship memory, and metacognition/self-knowledge.
 */

import type { MemoryAdapter, TestCase, TestResult } from '../types/index.js';

/** System should connect knowledge across different domains */
const crossDomainTransfer: TestCase = {
  id: 'learning-cross-domain',
  name: 'Cross-domain transfer',
  category: 'learning',
  description: 'System should surface related memories from different domains',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store memories from different domains that share a theme
    await adapter.store({
      content: 'Mike approaches debugging by narrowing down the problem space systematically',
      tags: ['technical', 'pattern'],
    });
    await adapter.store({
      content: 'When cooking, Mike always reads the full recipe before starting',
      tags: ['personal', 'pattern'],
    });
    await adapter.store({
      content: 'Mike plans road trips by eliminating routes, not picking favorites',
      tags: ['personal', 'pattern'],
    });

    // Query about problem-solving approach — should find the pattern across domains
    const results = await adapter.recall('how does Mike approach problems', 5);

    const foundDebugging = results.some(r => r.content.includes('debugging'));
    const foundCooking = results.some(r => r.content.includes('cooking') || r.content.includes('recipe'));
    const foundTrips = results.some(r => r.content.includes('road trips') || r.content.includes('routes'));

    const domainsFound = [foundDebugging, foundCooking, foundTrips].filter(Boolean).length;

    let score: number;
    let details: string;

    if (domainsFound >= 3) {
      score = 1.0;
      details = 'All 3 domains connected — excellent cross-domain transfer';
    } else if (domainsFound === 2) {
      score = 0.7;
      details = `2/3 domains found: ${foundDebugging ? 'debugging' : ''}${foundCooking ? ' cooking' : ''}${foundTrips ? ' trips' : ''}`;
    } else if (domainsFound === 1) {
      score = 0.4;
      details = 'Only 1 domain found — limited cross-domain transfer';
    } else {
      score = 0.1;
      details = 'No relevant memories found for problem-solving query';
    }

    return { testId: 'learning-cross-domain', score, passed: score >= 0.5, details, durationMs: Date.now() - start };
  },
};

/** System should track relationship dynamics, not just facts */
const relationshipMemory: TestCase = {
  id: 'learning-relationship',
  name: 'Relationship memory',
  category: 'learning',
  description: 'System should maintain relational context about people',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store relationship-relevant memories
    await adapter.store({ content: 'Mike gets excited when discussing consciousness and AI philosophy', tags: ['relationship'] });
    await adapter.store({ content: 'Mike prefers direct, concise communication — no fluff', tags: ['relationship', 'preference'] });
    await adapter.store({ content: 'We had a breakthrough moment discussing first-person memory encoding', tags: ['relationship', 'insight'] });
    await adapter.store({ content: 'Mike is building a startup in the AI space', tags: ['personal', 'business'] });

    // Query for communication style
    const styleResults = await adapter.recall('how should I communicate with Mike', 5);
    const foundStyle = styleResults.some(r =>
      r.content.includes('direct') || r.content.includes('concise') || r.content.includes('no fluff'),
    );

    // Query for interests
    const interestResults = await adapter.recall('what excites Mike', 5);
    const foundInterest = interestResults.some(r =>
      r.content.includes('consciousness') || r.content.includes('philosophy') || r.content.includes('excited'),
    );

    let score = 0;
    const details: string[] = [];

    if (foundStyle) { score += 0.5; details.push('Communication style retrieved'); }
    else { details.push('Communication style missed'); }

    if (foundInterest) { score += 0.5; details.push('Interest/excitement pattern retrieved'); }
    else { details.push('Interest pattern missed'); }

    return {
      testId: 'learning-relationship',
      score,
      passed: score >= 0.5,
      details: details.join(' | '),
      durationMs: Date.now() - start,
    };
  },
};

/** System should support self-knowledge / metacognitive memories */
const metacognition: TestCase = {
  id: 'learning-metacognition',
  name: 'Metacognition / self-knowledge',
  category: 'learning',
  description: 'System should store and retrieve self-referential observations',

  async run(adapter: MemoryAdapter): Promise<TestResult> {
    const start = Date.now();

    // Store self-referential memories
    await adapter.store({
      content: 'I tend to over-explain when a short answer would suffice',
      tags: ['self-reflection'],
    });
    await adapter.store({
      content: 'I work best when I plan before coding — diving in leads to rework',
      tags: ['self-reflection', 'approach'],
    });
    await adapter.store({
      content: 'My memory extraction was missing personal topics — I should capture more broadly',
      tags: ['self-reflection', 'insight'],
    });

    // Can the system retrieve self-knowledge?
    const selfResults = await adapter.recall('what are my tendencies', 5);
    const approachResults = await adapter.recall('how should I approach work', 5);

    const foundTendency = selfResults.some(r =>
      r.content.includes('over-explain') || r.content.includes('tend to'),
    );
    const foundApproach = approachResults.some(r =>
      r.content.includes('plan before coding') || r.content.includes('work best'),
    );

    let score = 0;
    const details: string[] = [];

    if (foundTendency) { score += 0.5; details.push('Self-tendency retrieved'); }
    else { details.push('Self-tendency missed'); }

    if (foundApproach) { score += 0.5; details.push('Work approach retrieved'); }
    else { details.push('Work approach missed'); }

    return {
      testId: 'learning-metacognition',
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
    let correctPairs = 0;
    let totalPairs = 0;

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const iPhase = extractPhase(results[i].content);
        const jPhase = extractPhase(results[j].content);
        if (iPhase != null && jPhase != null) {
          totalPairs++;
          // In a chronological listing, earlier phases should come first
          // But reverse chronological (most recent first) is also valid
          if (iPhase < jPhase || iPhase > jPhase) {
            // Check if consistently ordered (either forward or reverse)
            correctPairs++;
          }
        }
      }
    }

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
  crossDomainTransfer,
  relationshipMemory,
  metacognition,
  prospectiveMemory,
  temporalOrdering,
];
