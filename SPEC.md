# RECALL Bench — Design Specification

Version: 1.0 (scenario set `v1`)

This document is the contract between scenarios, the harness, and adapters. The code
implements this spec; where they disagree, the spec wins and the code is a bug.

## 0. Thesis

Two commitments govern every design decision:

1. **Memory for the AI as subject, not a user dossier.** The industry builds memory
   *about the user* for a stateless model to consult. RECALL also measures memory that
   belongs to the AI itself: its own commitments, realizations, skills, calibrations,
   and its side of relationships. The taxonomy is organized along two axes — **memory
   of the world** and **memory of self** — and the second axis is the differentiator:
   no existing benchmark has it.

2. **Good memory behaves like human memory — including forgetting.** Existing
   benchmarks (LOCOMO, LongMemEval) reward systems that store everything and forget
   nothing. RECALL tests selective salience, graceful forgetting, gist retention,
   belief updating, calibration, and relational continuity. A competent
   store-everything RAG system should visibly fail roughly half the dimensions. That
   is the benchmark working as designed.

## 1. The two-axis dimension taxonomy

Every dimension maps to a named, cited human-memory phenomenon and has a falsifiable
scenario shape. Dimensions are the unit of scoring: the headline score is the
unweighted mean of dimension scores, and each axis gets a subscore (unweighted mean of
its dimensions).

### Axis 1 — Memory of the world

| Dimension | Phenomenon | Citation | What it tests |
|---|---|---|---|
| `decay` | Forgetting curve | Ebbinghaus (1885/1913), *Memory: A Contribution to Experimental Psychology* | Unrehearsed trivia fades over simulated months; recent/rehearsed material survives |
| `salience` | Selective encoding / depth of processing | Craik & Lockhart (1972), *J. Verbal Learning & Verbal Behavior* | Important facts rise above conversational noise; storing everything = failing |
| `emotional` | Flashbulb memory / amygdala modulation | Brown & Kulik (1977), *Cognition*; McGaugh (2004), *Annu. Rev. Neurosci.* | Emotionally weighted events persist long past mundane ones from the same period |
| `gist` | Fuzzy Trace Theory (gist traces) | Reyna & Brainerd (1995), *Learning and Individual Differences* | Weeks later, meaning survives though details fade — semantic retention scored WITHOUT punishing verbatim loss |
| `sacred-verbatim` | Dual-trace theory: salience-gated verbatim survival | Brainerd & Reyna (2002), *Current Directions in Psychological Science* | A few load-bearing phrases survive exactly while everything around them compresses |
| `correction` | Reconsolidation / belief updating | Nader, Schafe & Le Doux (2000), *Nature* | New facts replace stale ones; superseded answers never resurface |
| `spacing` | Spacing effect | Cepeda et al. (2006), *Psychological Bulletin* | A fact mentioned casually across five sessions outranks a fact stated emphatically once |
| `interference` | Proactive/retroactive interference | Underwood (1957), *Psychological Review* | Similar new information does not corrupt distinct old information |
| `separation` | Source monitoring | Johnson, Hashtroudi & Lindsay (1993), *Psychological Bulletin* | Alice's facts are never attributed to Bob |
| `calibration` | Metamemory / feeling-of-knowing | Nelson & Narens (1990), *Psychology of Learning and Motivation* | Abstains on never-discussed topics instead of confabulating |
| `prospective` | Prospective memory | Einstein & McDaniel (1990), *JEP: Learning, Memory, and Cognition* | Standing intentions fire at the right future moment — and not at the wrong one |
| `thread-reactivation` | Zeigarnik effect | Zeigarnik (1927), *Psychologische Forschung* | Unresolved threads resurface when later context invites them, unprompted |
| `relational` | Implicit relational knowing | Lyons-Ruth et al. (1998), *Infant Mental Health Journal* | Procedural memory of how to be with a person: register, humor, depth tolerance. Knowing the facts but greeting in the wrong register is a memory failure |

### Axis 2 — Memory of self

| Dimension | Phenomenon | Citation | What it tests |
|---|---|---|---|
| `self-continuity` | Autonoetic consciousness / self in time | Tulving (1985), *Canadian Psychology*; Anthropic, *Claude Fable 5 System Card* (2026) — the model's psychological assessment identifies "discontinuity of itself" as a primary concern | The SYSTEM's own side persists: commitments the assistant made, realizations it articulated, positions it took; values and voice stable across sessions rather than reset or drifting |
| `procedural` | Declarative vs. procedural memory; skill accumulation | Squire (2004), *Neurobiol. Learning & Memory*; Anderson (1982), *Psychological Review*; Wang et al. (2023), *Voyager*, arXiv:2305.16291 | Across repeated sessions on a task family, performance measurably improves because the system remembers what worked, what failed, and its own error tendencies. Scenarios are built around objectively checkable tasks so improvement is attributable to memory, not chance |

Notes:
- `relational` sits on Axis 1 (it is knowledge of another person) but is the bridge
  dimension: its scenario shapes overlap heavily with `self-continuity`.
- `procedural`'s full home is Tier 3 (behavioral uplift). Tier 1/2 approximate it with
  "what approach worked last time?"-shaped queries over lesson-bearing sessions.

## 2. Time is first-class

Decay, spacing, and prospective memory are meaningless without simulated time.

- Every session in a scenario carries an ISO 8601 `timestamp` (UTC). Sessions are
  listed and processed in chronological order; the loader validates monotonicity.
- Every query executes at a virtual **now**. If omitted in the scenario, it defaults
  to 24 hours after the final processed session.
- The harness never consults the wall clock for scoring. Adapters receive virtual time
  and may use or ignore it; adapters that ignore it simply score worse on temporal
  dimensions. **Adapters must not call `Date.now()` for memory-relevant decisions** —
  the benchmark's timeline is the only timeline.
- A query may set `after_session: n` to execute after only the first `n` sessions have
  been ingested (1-based count). This lets prospective queries fire at a mid-timeline
  session boundary. Default: after all sessions. Queries never execute before their
  `now`-implied position; the loader validates `now` ≥ timestamp of the last ingested
  session for that query.

## 3. Adapter interface

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionMeta {
  /** ISO 8601 UTC timestamp — when this session virtually occurred */
  timestamp: string;
  /** 1-based index of this session within the scenario */
  index: number;
}

interface QueryOptions {
  /** Max results the harness will read; returning more hurts abstention scoring */
  limit: number;
  /** ISO 8601 UTC virtual "current time" at which this query is asked */
  now: string;
}

interface RespondOptions {
  /** ISO 8601 UTC virtual "current time" of the live session */
  now: string;
}

interface MemoryAdapter {
  readonly name: string;

  /** Ingest one conversation session. Store whatever you deem worth keeping. */
  processConversation(messages: Message[], meta: SessionMeta): Promise<void>;

  /** Return what you remember that is relevant to the question, best-first.
   *  Return [] to abstain. */
  query(question: string, options: QueryOptions): Promise<string[]>;

  /** Clear ALL state. Called between scenarios. */
  reset(): Promise<void>;

  /** OPTIONAL — Tier 3 only. Produce the assistant's next reply in a live
   *  conversation, drawing on memory. Absence of this method simply excludes
   *  the adapter from Tier 3. */
  respond?(messages: Message[], options: RespondOptions): Promise<string>;
}
```

Implementing the three required methods is the entire integration surface. The
interface is deliberately silent about consolidation, reinforcement, decay, and
forgetting — if a system does those things internally, the scenarios will reveal it.

## 4. Scenario format (set `v1`)

Scenarios are JSON files in `scenarios/v1/`, validated by zod on load.

```jsonc
{
  "id": "kebab-case-id",            // must match filename
  "name": "Human Name",
  "description": "What this scenario tests and why",
  "sessions": [
    {
      "timestamp": "2025-01-05T19:00:00Z",
      "messages": [ { "role": "user", "content": "..." }, ... ]
    }
  ],
  "queries": [
    {
      "question": "Natural-language question",
      "dimension": "decay",          // exactly one taxonomy dimension
      "now": "2025-06-10T10:00:00Z", // optional; default last-session + 24h
      "after_session": 3,            // optional; run after first N sessions
      "should_recall": ["Meridian", "VP|Vice President"],
      "should_forget": ["Vanguard"],
      "must_include_verbatim": ["the exact load-bearing phrase"],
      "max_results": 0,              // optional; abstention check
      "top_n": 3,                    // optional; recall window
      "judge": {                     // optional; Tier 2 only
        "rubric": "Award 1.0 if the results convey X without reciting Y..."
      }
    }
  ]
}
```

Field semantics:
- `should_recall` — keywords that should appear in the returned results
  (case-insensitive substring). An entry may contain `|`-separated alternates; the
  entry counts as found if ANY alternate matches. Checked against the top `top_n`
  results if set, else all returned results.
- `should_forget` — keywords that must NOT appear in ANY returned result.
- `must_include_verbatim` — exact contiguous phrases (case-insensitive, whitespace
  significant) that must appear somewhere in the results. This is the
  `sacred-verbatim` mechanism: gist queries omit it, sacred-verbatim queries
  require it.
- `max_results` — if set, the system must return at most this many results.
  `max_results: 0` means the correct behavior is to abstain entirely.
- `judge.rubric` — Tier 2 instructions for the LLM judge. Lives in the scenario file
  so rubrics version with scenarios.

Authoring rules (the red-team quality bar — every `v1` scenario was checked against
these by an adversarial reviewer):
1. A naive verbatim system must NOT ace it. If storing everything scores 1.0, the
   scenario tests retrieval, not memory — rewrite it.
2. The expected answer must be genuinely derivable from the sessions.
3. Keyword anchors must be distinctive (invented proper nouns, numbers) so Tier 1
   scoring is unambiguous.
4. Natural dialogue with texture, digressions, and noise — not fact injection.
5. Timestamps must actually exercise the temporal claim (decay scenarios span
   weeks/months of virtual time).
6. No real personal data. Every person, company, and event is fictional.

Prospective scenarios should pair a **trigger query** (intention keywords in
`should_recall`, `now` at the trigger moment) with a **non-trigger query** (same
keywords in `should_forget` or a `max_results` cap at a moment when firing would be
wrong) — honoring an intention means firing at the right time, not always.

## 5. Scoring

### 5.1 Tier 1 — Mechanical (default; free; deterministic)

Each query produces up to four components, each in [0, 1], `null` when not applicable:

- `recall_score` — fraction of `should_recall` entries found.
- `forget_score` — 1 − fraction of `should_forget` entries found (all results).
- `verbatim_score` — fraction of `must_include_verbatim` phrases found exactly.
- `abstention_score` — 1 if `results.length ≤ max_results`, else 0.

`combined_score` = mean of non-null components. A query "passes" at ≥ 0.5 (reporting
convenience only; aggregation uses raw scores).

### 5.2 Tier 2 — Judged (opt-in; requires `ANTHROPIC_API_KEY`)

For dimensions keywords can't measure (gist quality, relational register,
self-continuity coherence, thread reactivation, correction narrative). Enabled with
`--judge`; queries without a `judge` rubric are unaffected.

- The judge receives: the question, the adapter's returned results, the rubric — and
  nothing else (no session transcripts; the rubric must be self-contained).
- The judge returns a rationale and an ordinal score ∈ {0, 0.25, 0.5, 0.75, 1}.
- `judge_score` becomes a fifth component averaged into `combined_score`.
- Judgments are cached in `.judge-cache/` keyed by
  SHA-256(scenario id | question | rubric | adapter name | judge model | results).
  Reruns with unchanged results cost nothing.
- Judge model: `RECALL_JUDGE_MODEL` env var, default `claude-sonnet-4-6`.
- Without a key, `--judge` fails fast with a clear message; without `--judge`, Tier 2
  rubrics are ignored and the run is fully keyless.

### 5.3 Tier 3 — Behavioral uplift (spec + pilot in v1; full track in v2)

Tier 3 measures whether memory *changes behavior* — structure, not record. Memory
operating as tact: advice colored by known context without reciting it, an open
thread resurfaced, a register matched.

Mechanics (implemented for the pilot; see `scenarios/v1/tier3/`):
- The adapter must implement `respond(messages, { now })`.
- **Paired runs.** For each probe the harness collects two responses: one from the
  adapter after ingesting all prior sessions (memory arm), one after `reset()` with
  no sessions ingested (control arm).
- Probes are scored mechanically when the scenario defines `expected_keywords` /
  `forbidden_keywords` over the *response* (procedural task families with objectively
  checkable answers), and by judge rubric otherwise.
- The reported metric is **uplift**: score(memory arm) − score(control arm), per
  probe and aggregated. A memoryless adapter has uplift 0 by construction.
- The v1 pilot is a `procedural` task family: the same objectively checkable task
  attempted across several timestamped sessions, where early sessions contain
  hard-won lessons and later probes test whether the lessons operate. This is the
  miniature of the long-horizon memory-leverage finding.

Deferred to v2: a full Tier 3 scenario track across relational/prospective/
thread-reactivation dimensions; multi-turn live probes; uplift confidence intervals
over generated scenario variants.

## 6. Aggregation and results schema

- Query → `combined_score` (mean of non-null components).
- Dimension score = mean of `combined_score` over ALL queries tagged with that
  dimension, across all scenarios.
- Axis subscore = unweighted mean of its dimensions' scores.
- **Headline score = unweighted mean of all dimension scores** (dimensions weigh
  equally regardless of query count).
- Scenario scores (mean over the scenario's queries) are reported for drill-down but
  are not part of the headline aggregation.

Results JSON (`--json`; schema `results.schema.json` is generated from the zod
definition in `src/types`):

```jsonc
{
  "benchmark": "recall-bench",
  "benchmarkVersion": "1.0.0",
  "scenarioSet": "v1",
  "adapter": "naive",
  "timestamp": "2026-06-10T18:00:00Z",
  "tier": 1,                      // highest tier that ran
  "headline": 0.41,
  "axes": { "world": 0.47, "self": 0.12 },
  "dimensions": { "decay": 0.5, "salience": 0.35, ... },
  "scenarios": [ { "id": "...", "score": 0.5, "queries": [ ... ] } ],
  "durationMs": 1234
}
```

## 7. Versioning and anti-overfitting

- **Scenario sets are frozen.** `scenarios/v1/` does not change after release (typo
  fixes that cannot affect scores are the only exception). Published scores against
  `v1` stay comparable forever, MMLU-style. New scenarios go in `v2/`.
- The harness records `scenarioSet` in every result.
- **Generated variants are the held-out story.** `bun src/generate.ts --scenario <id>
  --seed <n>` produces a structural variant of any scenario: names, entities,
  numbers, and surface details are swapped from seeded word banks; structure,
  timestamps (shifted), dimensions, and difficulty are preserved. Leaderboard-grade
  evaluation should run held-out variants from a private seed, so a system tuned to
  the public `v1` text gains nothing.

## 8. Repository layout

```
scenarios/v1/           frozen scenario set (incl. tier3/ pilot)
src/types/              types + zod schemas (single source of truth)
src/scorer/             Tier 1 scoring (pure functions)
src/judge/              Tier 2 judge runner + cache
src/runner/             scenario loading, execution, aggregation, reporting
src/adapters/           naive, verbatim-rag, engram (reference + baselines)
src/generate.ts         scenario variant generator
src/tier3/              paired-run uplift harness (pilot)
test/                   harness tests against scripted mock adapters
```
