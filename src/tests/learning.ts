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

export const learningTests: TestCase[] = [
  crossDomainTransfer,
  relationshipMemory,
  metacognition,
];
