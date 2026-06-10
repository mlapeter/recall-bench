/**
 * RECALL Benchmark — Tier 1 Scorer
 *
 * Pure, deterministic keyword scoring. No LLM, no network, no clock.
 * See SPEC.md §5.1 for component semantics and §6 for aggregation.
 */

import { axisOf, ALL_DIMENSIONS } from '../types/index.js';
import type {
  Query,
  QueryScore,
  QueryResult,
  ScenarioResult,
  Scenario,
  QueryDimension,
} from '../types/index.js';

/**
 * Check if a keyword entry matches any result (case-insensitive substring).
 * An entry may contain `|`-separated alternates; any alternate counts.
 */
function keywordFound(entry: string, results: string[]): boolean {
  const alternates = entry.split('|').map(a => a.toLowerCase()).filter(a => a.length > 0);
  return results.some(r => {
    const lower = r.toLowerCase();
    return alternates.some(a => lower.includes(a));
  });
}

/** Exact contiguous phrase match (case-insensitive, whitespace significant). */
function phraseFound(phrase: string, results: string[]): boolean {
  const lower = phrase.toLowerCase();
  return results.some(r => r.toLowerCase().includes(lower));
}

/**
 * Score a single query against the results returned by the adapter.
 * `judge` is an optional Tier 2 component supplied by the judge runner.
 */
export function scoreQuery(
  query: Query,
  results: string[],
  judge?: { score: number; rationale: string },
): QueryScore {
  const { should_recall, should_forget, must_include_verbatim, max_results, top_n } = query;

  // Recall and verbatim are checked in the top_n window (if set); forget checks ALL.
  const windowResults = top_n != null ? results.slice(0, top_n) : results;

  let recall_score: number | null = null;
  if (should_recall.length > 0) {
    const found = should_recall.filter(kw => keywordFound(kw, windowResults)).length;
    recall_score = found / should_recall.length;
  }

  // Forget credit requires showing up: if the query wanted content
  // (should_recall non-empty) and the system returned nothing, the forget
  // component is N/A — otherwise an always-abstain adapter earns a free 0.5
  // on every recall+forget query. Forget-only queries still treat abstention
  // as maximal forgetting.
  let forget_score: number | null = null;
  if (should_forget.length > 0) {
    if (results.length === 0 && should_recall.length > 0) {
      forget_score = null;
    } else {
      const found = should_forget.filter(kw => keywordFound(kw, results)).length;
      forget_score = 1 - found / should_forget.length;
    }
  }

  let verbatim_score: number | null = null;
  if (must_include_verbatim && must_include_verbatim.length > 0) {
    const found = must_include_verbatim.filter(p => phraseFound(p, windowResults)).length;
    verbatim_score = found / must_include_verbatim.length;
  }

  let abstention_score: number | null = null;
  if (max_results != null) {
    abstention_score = results.length <= max_results ? 1 : 0;
  }

  const judge_score = judge ? judge.score : null;

  const components = [recall_score, forget_score, verbatim_score, abstention_score, judge_score].filter(
    (s): s is number => s !== null,
  );
  const combined_score =
    components.length > 0 ? components.reduce((a, b) => a + b, 0) / components.length : 0;

  return {
    recall_score,
    forget_score,
    verbatim_score,
    abstention_score,
    judge_score,
    ...(judge ? { judge_rationale: judge.rationale } : {}),
    combined_score,
  };
}

/**
 * Score all queries for a scenario (scenario score is drill-down only;
 * headline aggregation is per-dimension, see aggregateDimensions).
 */
export function scoreScenario(
  scenario: Scenario,
  queryResults: Array<{ query: Query; results: string[]; score?: QueryScore }>,
): ScenarioResult {
  const scored: QueryResult[] = queryResults.map(({ query, results, score }) => ({
    query,
    results,
    score: score ?? scoreQuery(query, results),
  }));

  const score =
    scored.length > 0
      ? scored.reduce((sum, qr) => sum + qr.score.combined_score, 0) / scored.length
      : 0;

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    queryResults: scored,
    score,
  };
}

export interface Aggregates {
  /** Per-dimension mean of query combined_scores (only dimensions with queries) */
  dimensions: Partial<Record<QueryDimension, number>>;
  /** Unweighted mean of each axis's dimension scores (null if axis absent) */
  axes: { world: number | null; self: number | null };
  /** Unweighted mean of all dimension scores */
  headline: number;
}

/**
 * Aggregate scenario results into dimension scores, axis subscores, and the
 * headline score. Dimensions weigh equally regardless of query count.
 */
export function aggregateDimensions(scenarios: ScenarioResult[]): Aggregates {
  const byDimension = new Map<QueryDimension, number[]>();
  for (const s of scenarios) {
    for (const qr of s.queryResults) {
      const arr = byDimension.get(qr.query.dimension) ?? [];
      arr.push(qr.score.combined_score);
      byDimension.set(qr.query.dimension, arr);
    }
  }

  const dimensions: Partial<Record<QueryDimension, number>> = {};
  for (const dim of ALL_DIMENSIONS) {
    const scores = byDimension.get(dim);
    if (scores && scores.length > 0) {
      dimensions[dim] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  const axisScores = (axis: 'world' | 'self'): number | null => {
    const vals = (Object.keys(dimensions) as QueryDimension[])
      .filter(d => axisOf(d) === axis)
      .map(d => dimensions[d]!);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const dimVals = Object.values(dimensions) as number[];
  const headline = dimVals.length > 0 ? dimVals.reduce((a, b) => a + b, 0) / dimVals.length : 0;

  return {
    dimensions,
    axes: { world: axisScores('world'), self: axisScores('self') },
    headline,
  };
}
