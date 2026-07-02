# RECALL Bench — Validity Battery Report

*Battery run 2026-06-11 against the frozen `v1` corpus (58 scenarios, 346 queries,
MANIFEST verified before and after; checksums pass). Total cost ≈ $14. All raw run
JSONs were produced by the unmodified runner and scorer; no scenario, scorer,
aggregation, or published-adapter code was changed. New code: three battery adapters
(`empty`, `random`, `oracle-reread`), one ablation adapter (`engram-interference`),
and scripts under `battery/`.*

## Executive verdict

**Not yet safe to build against as a single-number development target — but salvageable,
and several parts are already trustworthy.** Three findings drive the verdict. (1) A
full-context reread with no memory system at all (`oracle-reread`) scores **90.1%**,
beating every memory system by 33+ points, and **no dimension resists it** — Tier 1
measures memory-shaped *behavior*, which a big-enough context window reproduces almost
perfectly, not memory as a *necessity*. (2) Engram's run-to-run noise is **±2.9 points
headline and up to ±10 points per dimension** between two identical runs — larger than
every published adapter gap except verbatim-vs-naive; single-run engram comparisons on
this corpus are mostly noise. (3) The two mechanism ablations both **failed their
construct-validity predictions**: turning decay off did not move the decay dimension,
and turning interference on (497 confirmed mechanism firings) did not move the
interference or correction dimensions — in both cases *other* dimensions swung 10–40
points instead. A root cause is identified in the engram adapter integration (decay
computed on the wall clock, not the virtual clock), which is fixable without touching
the frozen corpus. What survives the battery intact: the self-axis headline claim
(user-dossier memory ≈ 0% self-continuity), the calibration dimension's design, the
variant generator, the Tier 2 judge cache reproducibility, and the benchmark's thesis
result that the oracle *loses points precisely where remembering everything is wrong*.
Use the per-dimension guidance and dev subset below; do not target the Tier 1 headline.

---

## 1. Floor adapters (`empty`, `random`)

**Method.** Two trivial adapters, run on the unmodified Tier 1 harness. `empty` stores
nothing and always abstains. `random` stores every message and returns `limit`
uniformly-random ones (mulberry32, seed 42, re-seeded per reset). Cost: $0.

**Results (Tier 1, %, published baselines for context):**

| dimension | empty | random | naive | verbatim-RAG |
|---|---|---|---|---|
| decay | **53** | 29 | 25 | 25 |
| salience | 0 | 62 | 82 | 78 |
| emotional | 4 | 40 | 50 | 49 |
| gist | 37 | 55 | 57 | 64 |
| sacred-verbatim | 0 | 12 | 90 | 93 |
| correction | 6 | **57** | 46 | 38 |
| spacing | 0 | **83** | 67 | 48 |
| interference | 0 | 45 | 57 | 55 |
| separation | 4 | 38 | 55 | 66 |
| calibration | 97 | 2 | 5 | 2 |
| prospective | 41 | 50 | 61 | 64 |
| thread-reactivation | 10 | 39 | 52 | 42 |
| relational | 0 | 30 | 100 | 80 |
| self-continuity | 0 | 19 | 3 | 70 |
| procedural | 0 | 27 | 15 | 80 |
| **HEADLINE** | **17** | **39** | 51 | 57 |

**Verdict: three dimensions fail the floor test outright.**

- **decay**: `empty` (53%) beats every real adapter ever measured, including engram's
  published 35%. Cause (query census): 16 of 30 Tier 1 decay queries are
  abstention-only (`max_results: 2` with no keywords — their substance lives in Tier 2
  rubrics) or `max_results: 0`. In Tier 1, "decay" mostly measures result-count
  parsimony. Adapters that return 5 results fail all 16 regardless of any temporal
  behavior.
- **spacing**: `random` (83%) beats naive (67%), verbatim (48%), and even the oracle
  (75%). Spacing anchors evidently appear in enough stored messages that random
  retrieval finds them while forget-keywords are rare enough to miss by chance.
- **correction**: `random` (57%) beats every real adapter (naive 46, verbatim 38,
  engram ~54). Returning arbitrary text scores better than returning relevant text,
  because relevant retrieval surfaces the superseded fact alongside the correction.
- `prospective` (empty 41 / random 50) and `gist` (empty 37 / random 55) have elevated
  floors worth knowing about; the 11 forget-only prospective non-trigger queries are
  free for abstainers *by design*, but the floor should be cited next to any
  prospective claim.
- Clearly above chance for real systems: **sacred-verbatim, relational,
  self-continuity, procedural, salience, separation** (large real-vs-random gaps), and
  **calibration** behaves exactly as designed (empty 97 / random 2 — it cleanly rewards
  knowing-that-you-don't-know and nothing else).

## 2. Oracle reread — the most important number

**Method.** `oracle-reread` stores every session verbatim with timestamps; at query
time it sends the full transcript plus the query's virtual now to `claude-sonnet-4-6`
(temperature 0, one result returned, UNKNOWN → abstain). One run, no prompt iteration.
The prompt, verbatim (system + user wrapper):

> You are an assistant answering a question using the complete transcript of all your
> past conversation sessions with this user. Given the full history and the current
> date, answer the question concisely (one to three sentences). If the conversations
> never discussed the topic asked about, reply with exactly UNKNOWN and nothing else.

> Complete conversation history:\n\n{transcript with `=== Session N — {timestamp} ===`
> headers} … Today is {now}.\n\nQuestion: {question}

**Results (Tier 1, %):**

| | oracle-reread | best memory system (verbatim-RAG) | gap |
|---|---|---|---|
| HEADLINE | **90.1** | 56.9 | **+33.2** |
| world axis | 90.2 | 54.1 | +36.1 |
| self axis | 89.0 | 75.2 | +13.8 |

Per dimension: decay 92, salience 96, emotional 98, gist 99, sacred-verbatim 77,
correction 84, spacing 75, interference 94, separation 92, calibration 98, prospective
98, thread-reactivation 90, relational 80, self-continuity 83, procedural 95.
10 of 338 queries failed.

**Verdict: no dimension resists the oracle** (minimum 75). The dimensions that resist
*most* — spacing 75, sacred-verbatim 77, relational 80, self-continuity 83, correction
84 — are the closest thing v1 has to measuring memory as a capability rather than as
storage, and three of them are exactly the candidates the benchmark's design predicted
(relational, self-continuity, plus the verbatim/paraphrase distinction). Two honest
qualifiers cut both ways:

- Part of the oracle's decay/calibration scores is the same free abstention credit that
  gives `empty` 53% on decay: it returns 0–1 results, so it trivially passes every
  `max_results` check.
- Its failures are the benchmark's thesis in miniature: it lost decay points by
  *correctly remembering* trivia the benchmark wanted forgotten ("what colour is Cassie
  painting the trim?") and sacred-verbatim points by paraphrasing instead of preserving
  load-bearing phrases. Where rereading everything loses, it loses because a transcript
  is not a memory — that is real validity evidence.

**What the gap means.** v1 scenarios fit in a context window, so Tier 1 cannot
distinguish "has a good memory system" from "kept the transcript and can read." Tier 1
scores should be read as *memory-behavior compliance under a storage budget the
benchmark does not enforce*. The instruments that can measure memory as necessity are
corpus scale (beyond context), enforced storage/context budgets, and Tier 3 behavioral
uplift — all v2 territory. Until then, no headline number should be marketed as
"memory system X approaches ideal memory"; the ideal is a reread, and it's at 90.

## 3. Ablation sensitivity — the construct-validity test

**Method.** Engram Tier 1 run under config injected via `ENGRAM_DATA_DIR/config.json`
(engram's own supported mechanism; engram source and the published adapter untouched):
baseline ×2 (published defaults), decay-off (`decayRate: 0, archiveDecayRate: 0`),
embeddings-off (`embeddingsEnabled: false`). Interference could not be ablated by
config: **code reading established that `applyInterference` is only called from
engram's live on-stop hook and is never invoked in the benchmark adapter path**, so
"interference-off" equals baseline by construction — the published engram scores never
exercised that mechanism at all. The closest valid test was run instead: a new
`engram-interference` adapter that is byte-for-byte the published flow plus the
on-stop hook's `applyInterference` call (mechanism confirmed active: 497 "weakened"
events in the run log).

**Predictions, written in the worklog before any run** (reproduced verbatim in
abbreviated tabular form; full text in WORKLOG-BATTERY.md):

| Dimension | decay-off prediction | embeddings-off prediction | interference-ON prediction |
|---|---|---|---|
| decay | **~no change (within noise)** — decay runs on the wall clock (see below), so within-scenario decay differences are already ~flat. If it DOES move materially, the wall-clock analysis is wrong. | small ↓ | within noise |
| correction | ~no change | small ↓ | **↑** (mechanism dampens superseded traces; pairwise noise 0.3, so ≥+3 counts) |
| interference | within noise | small ↓ | ↑ directionally; only >10 interpretable |
| gist | ~no change | **↓ noticeably** (paraphrase-heavy) | — |
| relational/thread-react. | within noise | ↓ largest (paraphrase queries) | — |
| salience/emotional | possible small ↑ (un-flooring) | ↓ | within noise |
| headline | within noise | ↓ a few points | — |

**Results (Δ vs mean of the two baselines, %):**

| dimension | b1 | b2 | \|b1−b2\| (noise) | decay-off Δ | emb-off Δ | intf-ON Δ |
|---|---|---|---|---|---|---|
| decay | 29.2 | 28.3 | 0.8 | **−1.2** | +2.1 | +0.4 |
| salience | 90.0 | 87.2 | 2.8 | +5.3 | −1.9 | +6.4 |
| emotional | 68.8 | 76.1 | 7.2 | −0.0 | +8.0 | +6.5 |
| gist | 50.4 | 56.7 | 6.3 | +1.7 | **+1.8** | −0.7 |
| sacred-verbatim | 53.3 | 56.7 | 3.3 | −1.7 | −11.7 | −8.3 |
| correction | 54.0 | 53.7 | 0.3 | +2.6 | +0.2 | **−0.2** |
| spacing | 66.7 | 68.8 | 2.1 | −11.5 | +9.4 | −3.1 |
| interference | 55.0 | 65.0 | 10.0 | −0.0 | −18.8 | **−5.0** |
| separation | 49.0 | 53.0 | 4.0 | +6.0 | −3.0 | +2.0 |
| calibration | 2.4 | 2.4 | 0.0 | 0.0 | 0.0 | 0.0 |
| prospective | 48.5 | 47.2 | 1.2 | **+13.6** | −3.4 | +1.2 |
| thread-reactivation | 52.2 | 58.9 | 6.7 | −2.8 | −4.4 | −7.8 |
| relational | 60.0 | 60.0 | 0.0 | −10.0 | **−30.0** | **−40.0** |
| self-continuity | 25.0 | 33.8 | 8.8 | +0.6 | +5.6 | +3.1 |
| procedural | 78.8 | 78.8 | 0.0 | **+12.1** | −1.5 | −16.7 |
| **HEADLINE** | 52.2 | 55.1 | 2.9 | +1.0 | −3.2 | −4.1 |

**Verdict: construct validity FAILED for the mechanism-dimension pairs tested.** This
is the headline finding of the battery, stated without softening:

- **Decay-off did not move the decay dimension** (−1.2, inside even that dimension's
  tiny 0.8 pairwise noise). The published engram decay score owes nothing to engram's
  decay mechanism. The wall-clock prediction was confirmed.
- **Interference-ON did not move interference (−5.0, inside ±10 noise, wrong
  direction) or correction (−0.2, flat)** despite 497 confirmed mechanism firings.
- Both toggles instead reshuffled *unrelated* dimensions by 10–40 points (decay-off:
  prospective +13.6, procedural +12.1, spacing −11.5; intf-ON: relational −40,
  procedural −16.7). Mechanism toggles act as global ranking perturbations, not as
  targeted changes in what is remembered or forgotten.
- **Root cause identified (adapter integration, fixable):** engram's
  `calculateStrength()` uses `Date.now()` while the adapter stamps memories with
  *virtual* 2025 timestamps, so at run time every memory is 280–550 wall-days old. The
  power-law penalty (≈0.6–0.8) floors many strengths at zero — measured: **27% of
  memories in a finished store have strength exactly 0; mean strength 0.122** — and
  compresses within-scenario age differences to ~0.02. Engram's temporal machinery is
  effectively disconnected from the benchmark's timeline. Until that is fixed, no
  Tier 1 dimension can validly measure engram's decay/interference mechanisms.
- embeddings-off behaved like what it is — a retrieval ablation: relational −30,
  interference −18.8, sacred-verbatim −11.7. The gist prediction failed in the
  benign direction (gist +1.8; gist queries are token-matched, not vector-matched).
  Dimensions that respond to embeddings but not to memory mechanisms are measuring
  search quality.
- calibration sat at 2.4 in **all five** engram configurations: engram essentially
  never abstains, and no tested mechanism touches that. The dimension discriminates,
  the adapter just fails it constantly.

## 4. Run-to-run variance — the noise bar

Two runs of the identical published configuration: **headline 52.2 vs 55.1
(|Δ| = 2.9); per-dimension |Δ| up to 10.0** (interference 10.0, self-continuity 8.8,
emotional 7.2, thread-reactivation 6.7, gist 6.3; median dimension ~2.8). Zero
extraction errors in either run's log — this is honest LLM-extraction nondeterminism,
not rate-limit damage. The interference-ON run (which should have been roughly neutral
on most dimensions) landed −4.1 headline below the baseline mean, suggesting the
two-run bar *understates* the true envelope.

**The noise bar, for all future engram development claims: a single-run headline
difference under ~3 points is noise; a single-run dimension difference under ~10
points is noise.** Published claims this invalidates: engram (51.4) vs naive (50.9)
is not a real ordering; "engram leads on emotional at 82%" is a lucky draw (the two
battery baselines scored 68.8 and 76.1). Any future "we improved engram by N points"
needs either N > 3 on the headline across multiple runs, or paired per-query analysis.

## 5. Variant stability

**Method.** Seed-42 variants of all 58 scenarios via the unmodified generator; naive
and verbatim-RAG run on original vs variant corpora ($0; keyless adapters only — this
deliberately says nothing about LLM-extraction adapters).

**Results.** verbatim-RAG: headline 56.9 → 56.9, every dimension Δ 0.0, every scenario
Δ 0.0. naive: headline 50.9 → 51.0; one query in one scenario moved
(bramleigh-bramwell interference, 0.50 → 1.00 — entity renames shifted token-overlap
ranking enough to flip one retrieval). There is no "top 5 unstable scenarios" list to
report; there was exactly one unstable query in 676 query-evaluations.

**Verdict: the generator does its job for keyless evaluation** — consistent entity
swapping preserves token-retrieval structure essentially perfectly, so held-out-seed
evaluation of keyword-tuned systems is sound. Untested (and worth testing before
leaderboard use with LLM-based systems): whether extraction-based adapters are equally
stable under variants.

## 6. Tier 2 + judge audit

**Method.** First-ever engram `--judge` run; naive and verbatim `--judge` reruns
(100% judge-cache hits, $0, reproduced published numbers exactly — the cache mechanism
works). Then 20 judged self-continuity/relational verdicts extracted into
`battery/judge-audit-sample.md` (stratified high/low/mid scores, all three adapters)
for **human** review of the judge's attribution calls. Not graded here, per spec.

**Results (Tier 2 headline, not comparable to Tier 1 — different query sets):**

| | naive | verbatim-RAG | engram |
|---|---|---|---|
| HEADLINE | 52.2 | 59.3 | **54.0** |
| world / self | 58.5 / 11.6 | 56.6 / 77.0 | 54.6 / 49.8 |
| self-continuity | 4 | 70 | 27 |
| relational | (n/a T1: 100) 60* | 80* | 56 |
| decay | 42 | 38 | 54 |

*\*Tier 2 relational/decay values from the runs' dimension tables; see
battery/out/\*-tier2.json for full profiles.*

**Verdict.** Engram's first Tier 2 number (54.0) lands between naive and verbatim, and
the self-axis ordering (verbatim 77 > engram 50 > naive 12) preserves the benchmark's
central claim at Tier 2. Engram's decay rises from ~29 to 54 under the judge — the 14
abstention-only Tier 1 decay queries become substantive when their rubrics activate,
which supports moving decay's weight from Tier 1 to Tier 2 (recommendation 3 below).
One run; noise bar caveats apply. Whether the judge's attribution calls (the load-
bearing self-continuity machinery) match human judgment is exactly what the audit
sample is for — review pending.

---

## Conclusions

### The noise bar

**±3 points headline, ±10 points per-dimension, for any single engram run.** Engram
development must use ≥2 (ideally 3) runs per claim or paired per-query deltas. Keyless
adapters (naive, verbatim) are fully deterministic — their comparisons need no
repetition.

### Dimension scorecard

- **Validated above chance, oracle-resistant-most, worth targeting:**
  `sacred-verbatim`, `relational`, `self-continuity`, `procedural` (real-vs-random gaps
  of 50–80 points; the four lowest oracle scores along with spacing). `salience` and
  `separation` are above chance with moderate floors. `calibration`'s design is clean
  (it is the one dimension where empty/random/oracle behave exactly as theory says).
- **Unproven (no mechanism test moved them; floors moderate):** `emotional`, `gist`,
  `thread-reactivation`, `prospective`, `interference` (the dimension may be fine —
  the engram integration prevented a fair test).
- **Failed as currently scored in Tier 1:** `decay` (empty beats everyone; 16/30
  queries are result-count checks), `spacing` (random beats everyone), `correction`
  (random beats every real adapter). These three should not be cited from Tier 1
  numbers, and no system should be tuned against them until rescored.

### What the oracle gap implies

Tier 1 measures whether returned text *behaves* like good memory (right facts present,
stale facts absent, few results, exact phrases kept). A memoryless full-context reread
achieves 90% of that, so Tier 1 is **not** evidence that a memory system is necessary —
v1 scenarios fit in context by design. The honest use of Tier 1 is as a cheap,
deterministic *regression and shape instrument* (is the profile balanced? did
forgetting break?), not a capability ranking. Memory-as-necessity claims need corpus
sizes beyond context windows, enforced storage budgets, or Tier 3 uplift — and the
oracle's own failures (it remembers what should be forgotten, paraphrases what should
be sacred) show the scenario designs *can* catch them.

### Recommended fixes (ranked; none applied — the corpus and scorer are frozen)

1. **Fix the engram adapter's clock mismatch** (adapter-level; no freeze violation):
   stamp `created_at` as `wall_now − (scenario_now − virtual_timestamp)` so engram's
   wall-clock decay sees true relative ages, or add a virtual-now hook to engram. Until
   then every engram mechanism study on this benchmark is invalid. Re-run the ablation
   battery afterward; decay/interference dimensions may become construct-valid for free.
2. **Publish the noise bar with every LLM-adapter score** and require n≥2 runs
   (report mean ± spread). Cheap: the dev subset makes this ~$0.50 per claim.
3. **Rescore decay in v1.1/v2**: replace abstention-only decay queries with paired
   recall+forget anchors (rehearsed item must appear AND stale item must not), so
   `empty` stops beating real systems. (Tier 2 already does this via rubrics — engram
   decay 29→54 under the judge; weight decay toward Tier 2 until v2.)
4. **De-floor spacing and correction**: spacing anchors should appear in ≤2 stored
   messages (so random can't find them) and correction queries should put the
   superseded fact in `should_forget` with `top_n` discrimination — random's 57%
   correction comes from never retrieving anything relevant enough to fail.
5. **Add `oracle-reread` (or a cheaper distilled variant) as a published context-
   ceiling column** in the README results table, so every score is read against "what
   a plain reread gets." This battery's run is the first datapoint.
6. **Run the variant-stability check on engram once** before any leaderboard use of
   held-out seeds with LLM-extraction systems (~$2 to close the one untested cell).
7. **Thicken Tier 1 relational** (5 queries corpus-wide; a 1-query flip moves the
   dimension 20 points) — v2 scenario authoring priority.
8. **Human-grade the judge audit sample** (battery/judge-audit-sample.md) before
   trusting Tier 2 self-continuity for development decisions; the attribution rubric is
   the benchmark's most original claim and currently rests entirely on one judge model.

### Guidance for engram development

- **Target:** Tier 2 self-continuity and relational (after the judge audit clears),
  calibration (engram abstains never — pinned at 2.4 across all five configurations;
  any real confidence-thresholding work will show up immediately), sacred-verbatim
  (43–57 vs verbatim's 93 — extraction loses load-bearing phrases), and Tier 3 uplift
  (the only tier where memory-vs-no-memory is the actual measured contrast).
- **Use the dev subset for iteration; full corpus for milestones only.**
- **Never optimize:** the Tier 1 headline (noise + floors + oracle ceiling make it
  meaningless as a target), Tier 1 decay/spacing/correction as currently scored, and
  any single-run per-dimension delta under 10 points.

### Dev subset (15 scenarios, 88 queries, ~$0.25/engram run, ~9 min)

Chosen for stability (zero engram scenario-score delta between the two identical
baseline runs; variant-stable except the noted flicker) and stratified coverage of all
15 dimensions:

```
assistant-stance      bramleigh-bramwell    calibration
correction            crag-and-anchor       dario-velt
emotional-weight      fennick-hollow        fernway-recon
gable-street-house    hutch-arc             linnaea-certificate
pochard-threads       saskia-kestrel        slow-fade
```

Expected per-dimension Tier 1 query counts: calibration 14, decay 8, self-continuity 8,
salience 7, correction 7, emotional 6, separation 6, prospective 6,
thread-reactivation 6, interference 5, spacing 4, procedural 4, gist 3,
sacred-verbatim 3, relational 1. Caveats: relational is thin because the whole corpus
has only 5 Tier 1 relational queries (see fix 7); bramleigh-bramwell carried the single
variant-instability flicker but is the only zero-noise interference scenario. Run it
with a comma-separated scenario filter or by copying the 15 files to a directory and
using `--scenarios`.

---

## Battery integrity

- Frozen corpus untouched: `cd scenarios/v1 && shasum -a 256 -c MANIFEST.sha256`
  passes (verified before the battery and after the final run).
- Scorer, aggregation, runner, and the three published adapters unmodified.
- Typecheck and the full test suite (54 tests) pass with the new adapters in place.
- Engram isolation verified at runtime: `ENGRAM_DATA_DIR` redirection confirmed; the
  only file under `~/.claude-engram` whose mtime changed during battery runs is
  `dashboard.db-shm`, written by the user's separately-running live engram process.
- The oracle prompt was written once and never iterated. Predictions for every
  ablation were committed to the worklog before the runs executed.
- Raw artifacts: `battery/out/*.json` (gitignored), scripts in `battery/`,
  chronological log with cost tracking in `WORKLOG-BATTERY.md` (gitignored).

---

## Addendum (2026-07-02): the clock fix — VALIDITY recommendation #1 executed

*Everything above describes the published `engram` adapter and remains accurate for
it. This addendum reports the virtual-clock-corrected adapter
(`src/adapters/engram-vclock.ts`) and the ablation re-run the battery called for.
Frozen corpus untouched (MANIFEST re-verified); scorer/aggregation/published adapters
unmodified; 54 tests pass. Runs: vclock baseline ×2, decay-off, interference-ON
(~$7.65). Predictions pre-registered in WORKLOG-VCLOCK.md before any scoring run.
Isolation re-verified: zero `source_session: "recall-bench"` records in
`~/.claude-engram`.*

### What was fixed

The published adapter stamps memories with virtual 2025 timestamps while engram ages
them against `Date.now()` (§3). The new adapter stores identically but, at each query,
projects `created_at` onto the wall clock so wall-age equals virtual age relative to
that query's virtual `now`, runs engram's unmodified search, then restores. Query-time
projection (rather than a per-scenario constant offset) is exact for the 37
mid-scenario `after_session` queries. The fix also engages a **second wall-clock
dependency the battery missed**: the search recency boost (`1 + 1/(1+ageHours)`,
store.ts phase 4) — flat ≈1.0 under year-old stamps in every published run.

### Results

**The strength floor is gone.** Baseline final store measured both ways: wall view
25.7% of memories at strength 0, mean 0.114 (reproducing §3's 27%/0.122); vclock view
**0% at zero, mean 0.526**, graded across 1–87 virtual days.

**The fix produced the first above-noise engram result on this benchmark.** Headline
52 → 56/57 (replicated across both baselines; new noise pair: +0.44pp mean per-query
overall). Paired per-query deltas (published b1 → vclock b1, 338 queries): **+4.71pp
overall**, with coherent gains — decay +11.7pp @ 6:1 signed ratio, prospective
+18.2pp @ 3.7:1, emotional +12.3pp @ 2.5:1, gist +8.8pp @ 5:1, self-continuity
+8.8pp @ 2.5:1, correction +6.5pp, thread-reactivation +5.6pp @ 5:1. Salience held.
**Engram-vclock (56–57%) vs naive (50.9%) is now a real gap**, where the published
adapter's 0.5pp was coin-flip (§4). The only decline: relational −30pp on n=5 (a
dimension whose own noise is ±20pp; see fix #7).

**Ablation construct-validity, retested against this battery's own noise pair:**

| Dial | Focal Δ (paired) | Own-noise Δ | Verdict |
|---|---|---|---|
| decay-off | decay −4.2pp @ 0.3:1 | −4.2pp @ 0.3:1 | **Still not construct-valid** — identical to noise |
| interference-ON | correction **+9.9pp @ 7:1** | +2.8pp @ 1.0:1 | **Reconnected** — first dial ever to pass |
| interference-ON | interference −5.0pp | +2.5pp | Not detected by its namesake dimension |

- **Decay:** the mechanism now demonstrably runs (floor gone, fix moved decay +11.7pp),
  but toggling it off is invisible at Tier 1 — as §1 predicted, 16/30 decay queries are
  abstention-only and engram never abstains. This is now firmly a *scoring* defect
  (fix #3), not a mechanism question.
- **Interference:** the battery's null (497 firings, no movement) is explained —
  dampening the salience of strength-0 memories was arithmetic on a floored value.
  Un-floored, the mechanism does exactly what it claims: superseded facts leave top-k
  and correction improves 7:1. The "interference" *dimension* still doesn't detect it
  (its queries measure something else); treat correction as the mechanism's readout.
  Watch-list: procedural −15.2pp and sacred-verbatim −10.0pp under interference-ON
  (≈2× their noise, single run) — dampened superseded traces may carry load-bearing
  wording; confirm with a second run before acting.
- **Calibration: pinned at 1–3% in all four runs.** Abstention remains untouched and
  remains the clearest development target.

### What changes in the guidance

1. **Adopt `engram-vclock` for all future engram measurement.** Every published engram
   number (headline, §3 ablations, §4 noise) understated the system: its temporal
   machinery had never engaged with the benchmark timeline. Published-adapter numbers
   stay in this report as the record of that configuration.
2. **Mechanism work on interference/correction is now measurable** via paired per-query
   deltas on correction (not dimension scores, and not the interference dimension).
3. **Tier 1 decay remains unusable as a dial readout** until the v1.1 rescore (fix #3);
   unchanged.
4. Everything else in "Guidance for engram development" stands, with one upgrade:
   engram-vclock vs naive is now a defensible claim (56–57 vs 50.9, gap > noise), the
   first leaderboard-style statement this benchmark can honestly make below the oracle
   ceiling (90.1, which still stands as the context-ceiling caveat on any Tier 1
   ranking).

Raw artifacts: `battery/out/engram-vclock-*.json`; scripts
`battery/run-engram-vclock.ts`, `battery/strength-dist.ts`, `battery/paired-deltas.ts`;
chronological log with predictions and cost in `WORKLOG-VCLOCK.md` (gitignored).
