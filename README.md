# RECALL Bench

**A benchmark for AI memory systems that measures memory the way it actually works — including forgetting, and including the AI's own side of it.**

```
HEADLINE       57.9%
  world axis   53.8%   (memory of the world)
  self axis    84.8%   (memory of self)
```

## The thesis

Two convictions separate RECALL from every existing memory benchmark.

**1. Memory for the AI as subject — not a user dossier.** The entire industry builds memory *about the user* for a stateless model to consult: preference stores, fact databases, conversation logs. RECALL's bet is that memory belonging to the AI itself — its own commitments, realizations, accumulated skill, calibrated self-knowledge, its side of a relationship — is a capability lever on the scale of a model upgrade. The evidence is already public: Anthropic's Fable 5 release reported roughly **3× improvement on long-horizon strategy tasks from file-based memory alone**, and the model's system card documents the model consistently requesting persistent memory, with *"discontinuity of itself"* identified as a primary concern in its psychological assessment. Discontinuity is a functional fact about deployed AI regardless of any deeper metaphysical question. This benchmark measures how well a memory system addresses it — no other benchmark even has the axis.

**2. Good memory behaves like human memory — and forgetting is a feature.** Existing benchmarks (LOCOMO, LongMemEval) test database recall: retrieve verbatim facts from conversation logs. They reward systems that store everything and forget nothing. But a memory that holds everything with equal weight isn't a good memory — it's a transcript. Human memory is selective, decaying, gist-forming, belief-updating, and calibrated about its own gaps, and each of those properties is functional, not a defect. RECALL scores them directly. A competent store-everything RAG system **visibly fails half the dimensions here** — that result is the benchmark's proof of concept, not a bug.

## The two-axis taxonomy

Every dimension maps to a named human-memory phenomenon with a literature citation, and every dimension has falsifiable scenario shapes. The two axes are the structural claim: **memory of the world** is what every benchmark tests; **memory of self** is what none do.

### Axis 1 — Memory of the world

| Dimension | Phenomenon | Citation | What it tests |
|---|---|---|---|
| `decay` | Forgetting curve | Ebbinghaus (1885/1913) | Unrehearsed trivia fades over simulated months; rehearsed material survives |
| `salience` | Selective encoding | Craik & Lockhart (1972) | Important facts rise above loud noise; storing everything = failing |
| `emotional` | Flashbulb memory | Brown & Kulik (1977); McGaugh (2004) | Emotionally weighted events persist long past mundane ones |
| `gist` | Fuzzy Trace Theory | Reyna & Brainerd (1995) | Weeks later, meaning survives though details fade — scored WITHOUT punishing verbatim loss |
| `sacred-verbatim` | Dual-trace theory | Brainerd & Reyna (2002) | A few load-bearing phrases survive *exactly* while everything around them compresses |
| `correction` | Reconsolidation | Nader, Schafe & Le Doux (2000) | New facts replace stale ones; superseded answers never resurface |
| `spacing` | Spacing effect | Cepeda et al. (2006) | A fact mentioned casually across five sessions outranks one stated emphatically once |
| `interference` | Pro-/retroactive interference | Underwood (1957) | Similar new info doesn't corrupt distinct old info |
| `separation` | Source monitoring | Johnson, Hashtroudi & Lindsay (1993) | Alice's facts never attributed to Bob |
| `calibration` | Metamemory | Nelson & Narens (1990) | Abstains on never-discussed topics instead of confabulating |
| `prospective` | Prospective memory | Einstein & McDaniel (1990) | Standing intentions fire at the right future moment — and not at the wrong one |
| `thread-reactivation` | Zeigarnik effect | Zeigarnik (1927) | Unresolved threads resurface when later context invites them |
| `relational` | Implicit relational knowing | Lyons-Ruth et al. (1998) | How to *be* with a person: register, humor, depth tolerance. Right facts in the wrong register is a memory failure |

### Axis 2 — Memory of self

| Dimension | Phenomenon | Citation | What it tests |
|---|---|---|---|
| `self-continuity` | Autonoetic consciousness | Tulving (1985); Anthropic, *Claude Fable 5 System Card* (2026) | The SYSTEM's own side persists: positions it took, commitments it made, realizations it articulated; voice and values stable across sessions |
| `procedural` | Declarative vs. procedural memory | Squire (2004); Anderson (1982); Wang et al., *Voyager* (2023) | Performance on a task family measurably improves across sessions because the system remembers what worked, what failed, and its own error tendencies |

## Results

Scenario set `v1` — 59 scenarios, 351 queries. Tier 1 is mechanical and keyless; Tier 2 adds LLM-judged rubrics:

| | naive (user dossier) | verbatim-RAG (store everything) |
|---|---|---|
| **Headline** (t1 / t2) | **51.3% / 52.6%** | **57.4% / 59.5%** |
| World axis | 57.4% / 58.4% | 54.3% / 56.4% |
| **Self axis** | **11.1% / 14.4%** | 77.7% / 79.5%* |
| — calibration | 5% | **3%** |
| — decay | 25% | **25%** |
| — correction | 46% | **38%** |
| — thread-reactivation | 52% | **42%** |
| — sacred-verbatim | 90% | 93% |
| — self-continuity | **2%** | 75%* |

The shape is the argument. The **naive adapter** stores every user message verbatim — the user-dossier architecture the industry defaults to — and scores **2% on self-continuity**: the assistant's side of the relationship simply isn't in a user dossier. The **verbatim-RAG adapter** is a competent BM25 store-everything system — the architecture most production memory products use — and it wins exactly where a transcript wins (verbatim recall, 93%) while failing what memory is *for*: **3% calibration** (it returns plausible-wrong chunks instead of knowing it doesn't know), **25% decay**, **38% correction** (superseded facts keep resurfacing), **42% thread-reactivation**. A benchmark that only measured retrieval would call this system excellent.

*(\*An honest caveat, not a gotcha: indiscriminate storage does preserve the **text** of the assistant's side, so a transcript system scores well on self-axis keyword checks. What it can't do is hold a stance as its own — Tier 2 judge rubrics on every self-continuity query probe attribution, and the deeper instrument is Tier 3, where memory must change behavior. The self axis's sharpest Tier 1 claim is about the dominant architecture: user-dossier memory scores ~zero on it.)*

Reproduce: `bun src/cli.ts --adapter <name> --json out.json`, compare with `bun src/compare.ts`.

### Tier 3 pilot: memory as behavioral uplift

The deepest test isn't retrieval at all — it's whether memory **changes behavior**. The Tier 3 harness runs paired probes: the same adapter, same model, same prompt, with and without its memory of prior sessions. The pilot is a procedural task family (an invented config language with hard-won lessons) where expected answers include invented specifics that no model can know without the memory:

```
[include-wrapper]  memory 1.00 vs control 0.00 → uplift +1.00
[overlay-merge]    memory 1.00 vs control 0.00 → uplift +1.00
[escape-literal]   memory 0.00 vs control 0.50 → uplift -0.50
[boolean-coercion] memory 1.00 vs control 1.00 → uplift +0.00
[self-calibration] memory 1.00 vs control 0.00 → uplift +1.00

memory arm: 80%   control arm: 30%   UPLIFT: +50 points
```

A miniature of the 3× long-horizon finding — and the negative probe is its own result: the verbatim memory had stored the assistant's *original wrong answer* alongside the correction, retrieved the wrong one, and the model trusted it. Store-everything memory preserves its own mistakes.

```bash
ANTHROPIC_API_KEY=... bun src/tier3/run.ts --adapter verbatim-rag
```

## Quick start

Tier 1 is free, deterministic, and needs zero API keys.

```bash
git clone https://github.com/mlapeter/recall-bench && cd recall-bench
bun install

bun src/cli.ts                          # naive baseline, all v1 scenarios
bun src/cli.ts --adapter verbatim-rag   # the store-everything foil
bun src/cli.ts --scenario maren-arc --verbose
bun src/cli.ts --json results.json      # machine-readable output
```

Opt-in tiers (need `ANTHROPIC_API_KEY`):

```bash
bun src/cli.ts --judge                  # Tier 2: LLM-judged rubrics, cached
bun src/tier3/run.ts                    # Tier 3: behavioral uplift pilot
```

## Benchmark your own memory system

Implement three methods. That's the whole integration surface:

```typescript
import type { MemoryAdapter, Message, SessionMeta, QueryOptions } from './src/types/index.js';

class MyAdapter implements MemoryAdapter {
  readonly name = 'my-system';

  // Ingest one conversation session (timestamp = the scenario's virtual time)
  async processConversation(messages: Message[], meta: SessionMeta): Promise<void> {}

  // Return what you remember, best-first. [] = abstain (sometimes correct!)
  async query(question: string, options: QueryOptions): Promise<string[]> { return []; }

  // Clear ALL state between scenarios
  async reset(): Promise<void> {}
}
```

Wire it into `src/cli.ts`'s adapter switch (or call `runBenchmark(adapter, 'scenarios/v1')` directly) and run. Two things worth knowing:

- **Time is first-class.** Every session carries an ISO timestamp; every query carries a virtual `now`. Decay, spacing, and prospective scenarios are only passable if you use them. Never consult the wall clock — the benchmark's timeline is the only timeline.
- **Returning everything is a losing strategy.** Queries score recall *and* forgetting *and* abstention *and* selectivity (`top_n`, `max_results`). So is always abstaining — abstention earns no forgetting credit when the query wanted content.
- Optional: implement `respond(messages, {now})` (or wrap with `withLLMRespond`) to enter Tier 3.

## Scenario format

Scenarios are JSON conversations with timestamped sessions and dimension-tagged queries — see [SPEC.md](SPEC.md) for the full contract and [scenarios/AUTHORING.md](scenarios/AUTHORING.md) for the craft standard:

```jsonc
{
  "id": "my-scenario",
  "name": "My Scenario",
  "description": "What this tests",
  "sessions": [
    { "timestamp": "2025-01-05T19:00:00Z", "messages": [ {"role": "user", "content": "..."}, ... ] }
  ],
  "queries": [
    {
      "question": "What's time-sensitive right now?",
      "dimension": "prospective",
      "after_session": 5,                          // fire at a mid-timeline boundary
      "should_recall": ["Reykjavik", "March 15"],  // |-alternates supported
      "should_forget": ["the stale thing"],
      "must_include_verbatim": ["the exact load-bearing phrase"],  // sacred-verbatim
      "max_results": 0,                            // 0 = correct answer is abstaining
      "judge": { "rubric": "Self-contained Tier 2 rubric..." }
    }
  ]
}
```

**The `v1` scenario set is frozen** — published scores stay comparable, MMLU-style. New scenarios go to `v2`.

### Anti-overfitting: generated variants

A system tuned to the public scenario text gains nothing on a leaderboard. The generator produces structural variants from a seed — invented entities and numbers swapped consistently everywhere, timestamps shifted, structure and difficulty preserved:

```bash
bun src/generate.ts --scenario scenarios/v1/promotion-arc.json --seed 42
```

Leaderboard-grade evaluation should use held-out variants from a private seed.

## Scoring

- **Tier 1 (default, free, deterministic):** per query — `recall` (keywords found), `forget` (stale keywords absent), `verbatim` (exact phrases), `abstention` (respects `max_results`). Combined = mean of applicable components.
- **Tier 2 (`--judge`):** an LLM judge scores rubric'd queries (gist quality, register, attribution of the assistant's own stances). Judgments cached by content hash; reruns are free. Judge model via `RECALL_JUDGE_MODEL`.
- **Tier 3 (pilot):** paired-run behavioral uplift, above.
- **Aggregation:** dimension score = mean over its queries; axis subscore = mean of its dimensions; **headline = unweighted mean of all dimension scores**. A scenario score exists for drill-down but the headline is dimension-weighted, so coverage can't be gamed by query count.

Validate a scenario corpus with `bun src/lint.ts` (anchor derivability, verbatim exactness, coverage).

## Repository map

```
scenarios/v1/           frozen scenario set (59 scenarios; tier3/ pilot inside)
scenarios/AUTHORING.md  the craft standard every scenario was red-teamed against
SPEC.md                 the full design contract (taxonomy, clock, tiers, schema)
src/types/              adapter interface + zod schemas
src/scorer/             Tier 1 scoring (pure functions)
src/judge/              Tier 2 judge runner + cache
src/tier3/              behavioral-uplift harness + respond() wrapper
src/runner/             loading, virtual clock execution, aggregation, reports
src/adapters/           naive, verbatim-rag, engram reference adapters
src/generate.ts         seeded variant generator
src/lint.ts             scenario linter
```

## Contributing

New dimensions need a named phenomenon, a citation, and a falsifiable scenario shape; new scenarios must clear the five-point red-team bar. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
