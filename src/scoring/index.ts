/**
 * Scoring utilities for RECALL benchmark
 */

import type { BenchmarkResult, TestCategory } from '../types/index.js';

/** Category descriptions for reports */
export const CATEGORY_INFO: Record<TestCategory, { letter: string; name: string; description: string }> = {
  retention: {
    letter: 'R',
    name: 'Retention',
    description: 'Hebbian strengthening, decay curves, reconsolidation',
  },
  encoding: {
    letter: 'E',
    name: 'Encoding',
    description: 'Salience discrimination, tag retrieval, fuzzy matching',
  },
  consolidation: {
    letter: 'C',
    name: 'Consolidation',
    description: 'Redundancy merge, pattern extraction, episodic→semantic',
  },
  adaptation: {
    letter: 'A',
    name: 'Adaptation',
    description: 'Contradictions, interference, context-dependent retrieval',
  },
  loss: {
    letter: 'L',
    name: 'Loss',
    description: 'Graceful forgetting, memory under load, explicit forget',
  },
  learning: {
    letter: 'L',
    name: 'Learning',
    description: 'Cross-domain transfer, relationship memory, metacognition',
  },
};

/** Compare two benchmark results */
export function compareResults(a: BenchmarkResult, b: BenchmarkResult): string {
  const lines: string[] = [];
  lines.push(`\n  ${a.systemName} vs ${b.systemName}`);
  lines.push(`  ${'─'.repeat(50)}`);
  lines.push(`  Overall: ${(a.overallScore * 100).toFixed(1)}% vs ${(b.overallScore * 100).toFixed(1)}%`);
  lines.push('');

  for (const catA of a.categories) {
    const catB = b.categories.find(c => c.category === catA.category);
    if (!catB) continue;
    const info = CATEGORY_INFO[catA.category];
    const diff = catA.score - catB.score;
    const arrow = diff > 0.05 ? '←' : diff < -0.05 ? '→' : '≈';
    lines.push(
      `  ${info.letter} ${info.name.padEnd(15)} ${(catA.score * 100).toFixed(0).padStart(3)}% ${arrow} ${(catB.score * 100).toFixed(0).padStart(3)}%`,
    );
  }

  lines.push('');
  return lines.join('\n');
}
