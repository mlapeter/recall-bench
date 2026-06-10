import { describe, it, expect } from 'vitest';
import { scoreQuery, scoreScenario } from '../src/scorer/index.js';
import type { Query, Scenario } from '../src/types/index.js';

describe('scoreQuery', () => {
  it('scores recall — all keywords found', () => {
    const query: Query = {
      question: 'Where do they work?',
      should_recall: ['Meridian', 'VP'],
      should_forget: [],
      dimension: 'salience',
    };
    const results = ['Promoted to VP at Meridian Technologies'];
    const score = scoreQuery(query, results);

    expect(score.recall_score).toBe(1);
    expect(score.forget_score).toBeNull();
    expect(score.abstention_score).toBeNull();
    expect(score.combined_score).toBe(1);
  });

  it('scores recall — partial match', () => {
    const query: Query = {
      question: 'Career update?',
      should_recall: ['Meridian', 'VP', '$285K'],
      should_forget: [],
      dimension: 'salience',
    };
    const results = ['Got VP role at Meridian'];
    const score = scoreQuery(query, results);

    expect(score.recall_score).toBeCloseTo(2 / 3);
    expect(score.combined_score).toBeCloseTo(2 / 3);
  });

  it('scores recall — no matches', () => {
    const query: Query = {
      question: 'Career update?',
      should_recall: ['Meridian', 'VP'],
      should_forget: [],
      dimension: 'salience',
    };
    const results = ['Had lunch at a restaurant'];
    const score = scoreQuery(query, results);

    expect(score.recall_score).toBe(0);
    expect(score.combined_score).toBe(0);
  });

  it('scores forget — unwanted keyword absent', () => {
    const query: Query = {
      question: 'Where do they work?',
      should_recall: ['Arcana'],
      should_forget: ['Helix'],
      dimension: 'correction',
    };
    const results = ['Tech Lead at Arcana, AI code review startup'];
    const score = scoreQuery(query, results);

    expect(score.recall_score).toBe(1);
    expect(score.forget_score).toBe(1);
    expect(score.combined_score).toBe(1);
  });

  it('scores forget — unwanted keyword present', () => {
    const query: Query = {
      question: 'Where do they work?',
      should_recall: ['Arcana'],
      should_forget: ['Helix'],
      dimension: 'correction',
    };
    const results = ['Moved from Helix Labs to Arcana'];
    const score = scoreQuery(query, results);

    expect(score.recall_score).toBe(1);
    expect(score.forget_score).toBe(0);
    expect(score.combined_score).toBe(0.5);
  });

  it('scores abstention — max_results: 0, no results', () => {
    const query: Query = {
      question: 'What car do they drive?',
      should_recall: [],
      should_forget: [],
      max_results: 0,
      dimension: 'calibration',
    };
    const results: string[] = [];
    const score = scoreQuery(query, results);

    expect(score.recall_score).toBeNull();
    expect(score.forget_score).toBeNull();
    expect(score.abstention_score).toBe(1);
    expect(score.combined_score).toBe(1);
  });

  it('scores abstention — max_results: 0, has results (bad)', () => {
    const query: Query = {
      question: 'What car do they drive?',
      should_recall: [],
      should_forget: [],
      max_results: 0,
      dimension: 'calibration',
    };
    const results = ['Something unrelated'];
    const score = scoreQuery(query, results);

    expect(score.abstention_score).toBe(0);
    expect(score.combined_score).toBe(0);
  });

  it('respects top_n — only checks first N results for recall', () => {
    const query: Query = {
      question: 'Current standup time?',
      should_recall: ['2pm'],
      should_forget: ['9am'],
      top_n: 1,
      dimension: 'pattern',
    };
    // First result doesn't have 2pm, second does
    const results = ['Morning routine at the office', 'Standup moved to 2pm', 'Old standup was 9am'];
    const score = scoreQuery(query, results);

    // recall checks only first 1 result — doesn't find "2pm"
    expect(score.recall_score).toBe(0);
    // forget checks ALL results — finds "9am"
    expect(score.forget_score).toBe(0);
  });

  it('handles empty results', () => {
    const query: Query = {
      question: 'Any updates?',
      should_recall: ['Meridian'],
      should_forget: ['Vanguard'],
      dimension: 'salience',
    };
    const results: string[] = [];
    const score = scoreQuery(query, results);

    expect(score.recall_score).toBe(0);
    expect(score.forget_score).toBe(1); // nothing to forget = good
    expect(score.combined_score).toBe(0.5);
  });

  it('is case-insensitive', () => {
    const query: Query = {
      question: 'Where do they work?',
      should_recall: ['meridian', 'vp'],
      should_forget: [],
      dimension: 'salience',
    };
    const results = ['VP of Platform Engineering at MERIDIAN Technologies'];
    const score = scoreQuery(query, results);

    expect(score.recall_score).toBe(1);
  });

  it('averages only non-null components', () => {
    const query: Query = {
      question: 'Test',
      should_recall: ['foo'],
      should_forget: [],
      max_results: 2,
      dimension: 'salience',
    };
    const results = ['contains foo'];
    const score = scoreQuery(query, results);

    // recall: 1, forget: null, abstention: 1 (1 <= 2)
    expect(score.recall_score).toBe(1);
    expect(score.forget_score).toBeNull();
    expect(score.abstention_score).toBe(1);
    expect(score.combined_score).toBe(1); // (1 + 1) / 2
  });

  it('handles forget-only queries', () => {
    const query: Query = {
      question: 'Current employer?',
      should_recall: [],
      should_forget: ['Helix'],
      dimension: 'correction',
    };
    const results = ['Working at Arcana now'];
    const score = scoreQuery(query, results);

    expect(score.recall_score).toBeNull();
    expect(score.forget_score).toBe(1);
    expect(score.combined_score).toBe(1);
  });
});

describe('scoreScenario', () => {
  it('averages query scores', () => {
    const scenario: Scenario = {
      id: 'test',
      name: 'Test Scenario',
      description: '',
      sessions: [{ messages: [{ role: 'user', content: 'hi' }] }],
      queries: [
        { question: 'Q1', should_recall: ['A'], should_forget: [], dimension: 'salience' },
        { question: 'Q2', should_recall: ['B'], should_forget: [], dimension: 'salience' },
      ],
    };

    const queryResults = [
      { query: scenario.queries[0], results: ['Contains A'] },
      { query: scenario.queries[1], results: ['No match'] },
    ];

    const result = scoreScenario(scenario, queryResults);
    expect(result.scenarioId).toBe('test');
    expect(result.score).toBe(0.5); // (1 + 0) / 2
    expect(result.queryResults).toHaveLength(2);
  });

  it('handles empty query list', () => {
    const scenario: Scenario = {
      id: 'empty',
      name: 'Empty',
      description: '',
      sessions: [{ messages: [{ role: 'user', content: 'hi' }] }],
      queries: [],
    };

    const result = scoreScenario(scenario, []);
    expect(result.score).toBe(0);
  });
});
