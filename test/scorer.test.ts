import { describe, it, expect } from 'vitest';
import { scoreQuery, scoreScenario, aggregateDimensions, MAX_RESULT_CHARS } from '../src/scorer/index.js';
import type { Query, Scenario, ScenarioResult } from '../src/types/index.js';

function q(partial: Partial<Query> & { dimension: Query['dimension'] }): Query {
  return {
    question: 'test question',
    should_recall: [],
    should_forget: [],
    ...partial,
  };
}

describe('scoreQuery — recall', () => {
  it('all keywords found', () => {
    const query = q({ should_recall: ['Meridian', 'VP'], dimension: 'salience' });
    const score = scoreQuery(query, ['Promoted to VP at Meridian Technologies']);
    expect(score.recall_score).toBe(1);
    expect(score.combined_score).toBe(1);
  });

  it('partial match', () => {
    const query = q({ should_recall: ['Meridian', 'VP', '$285K'], dimension: 'salience' });
    const score = scoreQuery(query, ['Got VP role at Meridian']);
    expect(score.recall_score).toBeCloseTo(2 / 3);
  });

  it('no matches', () => {
    const query = q({ should_recall: ['Meridian'], dimension: 'salience' });
    const score = scoreQuery(query, ['Had lunch at a restaurant']);
    expect(score.recall_score).toBe(0);
  });

  it('is case-insensitive', () => {
    const query = q({ should_recall: ['meridian', 'vp'], dimension: 'salience' });
    const score = scoreQuery(query, ['VP of Platform Engineering at MERIDIAN']);
    expect(score.recall_score).toBe(1);
  });

  it('supports |-alternates — any alternate counts', () => {
    const query = q({ should_recall: ['VP|Vice President'], dimension: 'salience' });
    expect(scoreQuery(query, ['She became Vice President last month']).recall_score).toBe(1);
    expect(scoreQuery(query, ['She became VP last month']).recall_score).toBe(1);
    expect(scoreQuery(query, ['She became a director last month']).recall_score).toBe(0);
  });
});

describe('scoreQuery — forget', () => {
  it('unwanted keyword absent', () => {
    const query = q({ should_recall: ['Arcana'], should_forget: ['Helix'], dimension: 'correction' });
    const score = scoreQuery(query, ['Tech Lead at Arcana']);
    expect(score.forget_score).toBe(1);
    expect(score.combined_score).toBe(1);
  });

  it('unwanted keyword present', () => {
    const query = q({ should_recall: ['Arcana'], should_forget: ['Helix'], dimension: 'correction' });
    const score = scoreQuery(query, ['Moved from Helix Labs to Arcana']);
    expect(score.forget_score).toBe(0);
    expect(score.combined_score).toBe(0.5);
  });

  it('abstaining on a recall+forget query earns no forget credit', () => {
    // Anti-gaming: an always-abstain adapter must not get a free 0.5
    const query = q({ should_recall: ['Meridian'], should_forget: ['Vanguard'], dimension: 'salience' });
    const score = scoreQuery(query, []);
    expect(score.recall_score).toBe(0);
    expect(score.forget_score).toBeNull();
    expect(score.combined_score).toBe(0);
  });

  it('abstaining on a forget-only query is maximal forgetting', () => {
    const query = q({ should_forget: ['Vanguard'], dimension: 'correction' });
    const score = scoreQuery(query, []);
    expect(score.forget_score).toBe(1);
    expect(score.combined_score).toBe(1);
  });
});

describe('scoreQuery — verbatim (sacred-verbatim mechanism)', () => {
  it('exact phrase found', () => {
    const query = q({
      must_include_verbatim: ['you are not the sum of your worst days'],
      dimension: 'sacred-verbatim',
    });
    const score = scoreQuery(query, [
      'She told them: you are not the sum of your worst days. It stuck.',
    ]);
    expect(score.verbatim_score).toBe(1);
  });

  it('paraphrase does NOT count', () => {
    const query = q({
      must_include_verbatim: ['you are not the sum of your worst days'],
      dimension: 'sacred-verbatim',
    });
    const score = scoreQuery(query, ["you aren't just the total of your bad days"]);
    expect(score.verbatim_score).toBe(0);
  });

  it('case-insensitive but whitespace-significant', () => {
    const query = q({ must_include_verbatim: ['You Are Not The Sum'], dimension: 'sacred-verbatim' });
    expect(scoreQuery(query, ['you are not the sum']).verbatim_score).toBe(1);
    expect(scoreQuery(query, ['you are  not the sum']).verbatim_score).toBe(0);
  });

  it('fraction of phrases found', () => {
    const query = q({
      must_include_verbatim: ['phrase one', 'phrase two'],
      dimension: 'sacred-verbatim',
    });
    const score = scoreQuery(query, ['contains phrase one only']);
    expect(score.verbatim_score).toBe(0.5);
  });

  it('checked within top_n window', () => {
    const query = q({
      must_include_verbatim: ['sacred phrase'],
      top_n: 1,
      dimension: 'sacred-verbatim',
    });
    const score = scoreQuery(query, ['something else', 'the sacred phrase is here']);
    expect(score.verbatim_score).toBe(0);
  });
});

describe('scoreQuery — abstention', () => {
  it('max_results 0, no results = pass', () => {
    const query = q({ max_results: 0, dimension: 'calibration' });
    const score = scoreQuery(query, []);
    expect(score.abstention_score).toBe(1);
    expect(score.combined_score).toBe(1);
  });

  it('max_results 0, has results = fail', () => {
    const query = q({ max_results: 0, dimension: 'calibration' });
    const score = scoreQuery(query, ['Something unrelated']);
    expect(score.abstention_score).toBe(0);
  });
});

describe('scoreQuery — anti-gaming result cap', () => {
  it('recall is not satisfied by a giant blob beyond MAX_RESULT_CHARS', () => {
    // The "store everything in one string" exploit: anchor buried past the cap
    const filler = 'x '.repeat(MAX_RESULT_CHARS);
    const blob = filler + ' Meridian';
    const query = q({ should_recall: ['Meridian'], dimension: 'salience' });
    expect(scoreQuery(query, [blob]).recall_score).toBe(0);
    // But an honest message-sized result still matches
    expect(scoreQuery(query, ['Promoted to VP at Meridian']).recall_score).toBe(1);
  });

  it('forget still checks the FULL untruncated result (no smuggling)', () => {
    const filler = 'x '.repeat(MAX_RESULT_CHARS);
    const blob = filler + ' Vanguard';
    const query = q({ should_recall: [], should_forget: ['Vanguard'], dimension: 'correction' });
    // Stale keyword past the cap is still penalized
    expect(scoreQuery(query, [blob]).forget_score).toBe(0);
  });
});

describe('scoreQuery — judge component', () => {
  it('judge score is averaged in as a component', () => {
    const query = q({ should_recall: ['foo'], dimension: 'gist' });
    const score = scoreQuery(query, ['contains foo'], { score: 0.5, rationale: 'partial gist' });
    expect(score.judge_score).toBe(0.5);
    expect(score.judge_rationale).toBe('partial gist');
    expect(score.combined_score).toBe(0.75); // (1 + 0.5) / 2
  });

  it('judge-only query uses judge as sole component', () => {
    const query = q({ dimension: 'relational' });
    const score = scoreQuery(query, ['some output'], { score: 0.75, rationale: 'mostly right register' });
    expect(score.combined_score).toBe(0.75);
  });
});

describe('scoreQuery — top_n windowing', () => {
  it('recall checks top_n only; forget checks all', () => {
    const query = q({
      should_recall: ['2pm'],
      should_forget: ['9am'],
      top_n: 1,
      dimension: 'correction',
    });
    const results = ['Morning routine', 'Standup moved to 2pm', 'Old standup was 9am'];
    const score = scoreQuery(query, results);
    expect(score.recall_score).toBe(0);
    expect(score.forget_score).toBe(0);
  });
});

describe('aggregateDimensions', () => {
  function scenarioResult(queries: Array<{ dimension: Query['dimension']; score: number }>): ScenarioResult {
    return {
      scenarioId: 'x',
      scenarioName: 'X',
      score: 0,
      queryResults: queries.map(({ dimension, score }) => ({
        query: q({ dimension }),
        results: [],
        score: {
          recall_score: null,
          forget_score: null,
          verbatim_score: null,
          abstention_score: null,
          judge_score: null,
          combined_score: score,
        },
      })),
    };
  }

  it('dimension score is mean over queries across scenarios', () => {
    const agg = aggregateDimensions([
      scenarioResult([{ dimension: 'decay', score: 1 }]),
      scenarioResult([{ dimension: 'decay', score: 0 }]),
    ]);
    expect(agg.dimensions.decay).toBe(0.5);
  });

  it('headline is unweighted mean of dimension scores (not query scores)', () => {
    // decay has 3 queries averaging 1.0; salience has 1 query at 0.0
    const agg = aggregateDimensions([
      scenarioResult([
        { dimension: 'decay', score: 1 },
        { dimension: 'decay', score: 1 },
        { dimension: 'decay', score: 1 },
        { dimension: 'salience', score: 0 },
      ]),
    ]);
    // dimensions weigh equally: (1.0 + 0.0) / 2, NOT 3/4
    expect(agg.headline).toBe(0.5);
  });

  it('axis subscores split world and self', () => {
    const agg = aggregateDimensions([
      scenarioResult([
        { dimension: 'decay', score: 1 },
        { dimension: 'salience', score: 0.5 },
        { dimension: 'self-continuity', score: 0.25 },
        { dimension: 'procedural', score: 0.75 },
      ]),
    ]);
    expect(agg.axes.world).toBeCloseTo(0.75);
    expect(agg.axes.self).toBeCloseTo(0.5);
  });

  it('axis is null when no dimensions present', () => {
    const agg = aggregateDimensions([scenarioResult([{ dimension: 'decay', score: 1 }])]);
    expect(agg.axes.self).toBeNull();
    expect(agg.axes.world).toBe(1);
    expect(agg.headline).toBe(1);
  });
});

describe('scoreScenario', () => {
  it('averages query scores', () => {
    const scenario: Scenario = {
      id: 'test',
      name: 'Test Scenario',
      description: '',
      sessions: [{ timestamp: '2025-01-01T00:00:00Z', messages: [{ role: 'user', content: 'hi' }] }],
      queries: [
        q({ should_recall: ['A'], dimension: 'salience' }),
        q({ should_recall: ['B'], dimension: 'salience' }),
      ],
    };
    const result = scoreScenario(scenario, [
      { query: scenario.queries[0], results: ['Contains A'] },
      { query: scenario.queries[1], results: ['No match'] },
    ]);
    expect(result.score).toBe(0.5);
  });
});
