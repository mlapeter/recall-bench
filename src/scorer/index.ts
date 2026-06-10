/**
 * RECALL Benchmark — Scorer
 *
 * Pure keyword-based evaluation. No LLM judge needed.
 */

import type { Query, QueryScore, QueryResult, ScenarioResult, Scenario } from '../types/index.js';

/**
 * Check if a keyword appears in any of the result strings (case-insensitive substring).
 */
function keywordFound(keyword: string, results: string[]): boolean {
  const lower = keyword.toLowerCase();
  return results.some(r => r.toLowerCase().includes(lower));
}

/**
 * Score a single query against the results returned by the adapter.
 */
export function scoreQuery(query: Query, results: string[]): QueryScore {
  const { should_recall, should_forget, max_results, top_n } = query;

  // Determine which results to check for recall (top_n or all)
  const recallResults = top_n != null ? results.slice(0, top_n) : results;

  // Recall score: fraction of should_recall keywords found
  let recall_score: number | null = null;
  if (should_recall.length > 0) {
    const found = should_recall.filter(kw => keywordFound(kw, recallResults)).length;
    recall_score = found / should_recall.length;
  }

  // Forget score: 1 - fraction of should_forget keywords found (check ALL results)
  let forget_score: number | null = null;
  if (should_forget.length > 0) {
    const found = should_forget.filter(kw => keywordFound(kw, results)).length;
    forget_score = 1 - found / should_forget.length;
  }

  // Abstention score: if max_results is set, did the system respect the limit?
  let abstention_score: number | null = null;
  if (max_results != null) {
    abstention_score = results.length <= max_results ? 1 : 0;
  }

  // Combined: average of non-null components
  const components = [recall_score, forget_score, abstention_score].filter(
    (s): s is number => s !== null,
  );
  const combined_score = components.length > 0
    ? components.reduce((a, b) => a + b, 0) / components.length
    : 0;

  return { recall_score, forget_score, abstention_score, combined_score };
}

/**
 * Score all queries for a scenario.
 */
export function scoreScenario(
  scenario: Scenario,
  queryResults: Array<{ query: Query; results: string[] }>,
): ScenarioResult {
  const scored: QueryResult[] = queryResults.map(({ query, results }) => ({
    query,
    results,
    score: scoreQuery(query, results),
  }));

  const score = scored.length > 0
    ? scored.reduce((sum, qr) => sum + qr.score.combined_score, 0) / scored.length
    : 0;

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    queryResults: scored,
    score,
  };
}
