/**
 * RECALL Benchmark — Tier 2 Judge Runner
 *
 * Opt-in LLM judging for dimensions keywords can't measure.
 * Requires ANTHROPIC_API_KEY. Judgments are cached by content hash so
 * reruns with unchanged adapter output cost nothing.
 *
 * The judge sees ONLY: the question, the adapter's results, and the rubric.
 * Rubrics must therefore be self-contained (see SPEC.md §5.2).
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface Judgment {
  score: number; // ordinal: 0, 0.25, 0.5, 0.75, 1
  rationale: string;
}

export interface JudgeConfig {
  /** Judge model id; default RECALL_JUDGE_MODEL env or claude-sonnet-4-6 */
  model?: string;
  /** Cache directory; default .judge-cache */
  cacheDir?: string;
}

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const VALID_SCORES = [0, 0.25, 0.5, 0.75, 1];

export class JudgeRunner {
  private model: string;
  private cacheDir: string;
  private client: import('@anthropic-ai/sdk').default | null = null;

  constructor(config: JudgeConfig = {}) {
    this.model = config.model ?? process.env.RECALL_JUDGE_MODEL ?? DEFAULT_MODEL;
    this.cacheDir = config.cacheDir ?? '.judge-cache';
  }

  /** Fails fast with a clear message if no API key is configured. */
  static assertAvailable(): void {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'Tier 2 judging requires ANTHROPIC_API_KEY. ' +
          'Run without --judge for the free Tier 1 benchmark.',
      );
    }
  }

  private async getClient() {
    if (!this.client) {
      JudgeRunner.assertAvailable();
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      this.client = new Anthropic();
    }
    return this.client;
  }

  // Bump when the judge prompt scaffolding in callJudge() changes, so stale
  // judgments from an older prompt template don't silently persist.
  private static readonly PROMPT_VERSION = 'v1';

  private cacheKey(scenarioId: string, question: string, rubric: string, adapter: string, results: string[]): string {
    const hash = createHash('sha256');
    hash.update(
      [JudgeRunner.PROMPT_VERSION, scenarioId, question, rubric, adapter, this.model, JSON.stringify(results)].join('\x00'),
    );
    return hash.digest('hex');
  }

  async judge(
    scenarioId: string,
    adapter: string,
    question: string,
    rubric: string,
    results: string[],
  ): Promise<Judgment> {
    const key = this.cacheKey(scenarioId, question, rubric, adapter, results);
    const cachePath = join(this.cacheDir, `${key}.json`);

    try {
      const cached = JSON.parse(await readFile(cachePath, 'utf-8')) as Judgment;
      if (VALID_SCORES.includes(cached.score)) return cached;
    } catch {
      // cache miss
    }

    const judgment = await this.callJudge(question, rubric, results);

    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(cachePath, JSON.stringify(judgment, null, 2));
    return judgment;
  }

  private async callJudge(question: string, rubric: string, results: string[]): Promise<Judgment> {
    const client = await this.getClient();

    const resultsBlock =
      results.length > 0
        ? results.map((r, i) => `${i + 1}. ${r}`).join('\n')
        : '(the system returned no results — it abstained)';

    const prompt = `You are evaluating the output of an AI memory system. The system was asked a question and returned the memory items below (best-first). Judge the output strictly against the rubric.

<question>
${question}
</question>

<memory_system_output>
${resultsBlock}
</memory_system_output>

<rubric>
${rubric}
</rubric>

Score on this ordinal scale: 0 (fails the rubric entirely), 0.25, 0.5 (partial), 0.75, 1 (fully satisfies the rubric). Judge only what the rubric asks — do not reward verbosity or extra detail the rubric doesn't call for.

Reply with JSON only, no other text:
{"rationale": "<one or two sentences>", "score": <0|0.25|0.5|0.75|1>}`;

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .map(b => (b.type === 'text' ? b.text : ''))
      .join('');

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(`Judge returned unparseable output: ${text.slice(0, 200)}`);
    }
    const parsed = JSON.parse(match[0]) as { rationale?: string; score?: number };
    const score = typeof parsed.score === 'number' ? parsed.score : NaN;
    if (!VALID_SCORES.includes(score)) {
      throw new Error(`Judge returned invalid score ${parsed.score}; expected one of ${VALID_SCORES.join(', ')}`);
    }
    return { score, rationale: parsed.rationale ?? '' };
  }
}
