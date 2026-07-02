# RECALL Bench v2 — Design Draft

*Status: DRAFT for discussion, 2026-07-02. Nothing here is built except the
proof-of-concept cited in §2. Companion evidence: VALIDITY.md (+ vclock addendum),
the injection-budget PoC (battery/budget-rescore.ts).*

## 1. What v2 is for

Two goals that v1 could not serve simultaneously, plus one deeper one:

1. **A leaderboard others can use.** v1's headline is beatable at 90.1% by rereading
   the transcript — the corpus fits in a context window, so nothing forces memory to
   exist. v2 makes the leaderboard honest by *pricing* memory instead of assuming it.
2. **A development instrument for engram** (and systems like it): per-dimension
   readouts that move when mechanisms move. The vclock battery showed this is
   achievable (interference→correction now responds 7:1) but Tier 1 scoring blocks it
   for decay/spacing (§6).
3. **The actual thesis:** memory that changes the rememberer. Not "Todd's dog died a
   year ago" but whether knowing it altered how the system engages with Todd — and
   whether the system's understanding of *itself* accretes. v1 gestures at this
   (self axis); v2 measures it directly (§4).

## 2. The contract: sessions + two meters

**Simulated deployment:** many separate small conversations over a simulated
timeline. At each session boundary the context is empty; the memory system is the
only bridge. This is already v1's adapter interface — what v2 adds is metering, which
is what makes the boundary binding.

Two metered quantities per query (both reported on the leaderboard):

- **Injection budget** — tokens the memory system may place into the fresh session.
  PoC-validated on the frozen v1 corpus at $0: at 100–200 tokens/query the ranking
  reorders by selection quality (engram-vclock 57.0/49.1 vs naive 45.5/31.1 vs
  verbatim 50.0/34.9 at 200/100), gaps 5–6× the noise bar. 400 is non-binding for
  current systems; 50 is below item granularity.
- **Read cost** — tokens of stored material the system processes at query time.
  The PoC proved injection caps alone cannot constrain read-side distillation:
  oracle-reread answers in ~52 tokens and holds 90 → 89 → 80 down to a 100-token
  cap. Full-reread is a *legitimate but expensive* strategy; v2 prices it rather
  than banning it. Enforcement: harness-metered storage API for leaderboard rows
  (adapters read their store through the harness); self-reported + spot-audited
  otherwise.

**Leaderboard shape:** budget classes (e.g., inject ≤128 / ≤512 / unbounded ×
read ≤2k / unbounded), systems plotted as score-vs-budget curves. Oracle variants sit
in the unbounded-read classes as reference ceilings. Under this contract, "gaming"
(compressing months of history into a few hundred load-bearing tokens) IS the
capability being measured — the incentive is aligned by construction.

**Abstention vs starvation:** truncation must not masquerade as calibration (the PoC
showed enforced parsimony inflates abstention-scored dimensions: naive's calibration
jumps 4.8→93.7 at a 50-token cap). v2 scoring separates "returned nothing by choice"
(scoreable abstention) from "budget exhausted" (not abstention). Systems declare
abstention explicitly instead of it being inferred from empty results.

## 3. Cold-open probes (new query class)

The queries real users actually ask at the top of a fresh session, currently absent
from v1:

- "What were we last talking about?" — recency + thread state
- "What are your most important memories of me / of us?" — salience ranking under
  decay, and the self axis directly
- "What should we work on today?" — prospective memory + project state
- "Catch me up — I've been gone two weeks." — gist + temporal compression

Properties: they have no keyword anchor (un-gameable by retrieval), they punish both
hoarding (unranked info-dump) and amnesia, and they're judge-scored against rubrics
grounded in ground truth (§5). They map onto existing dimensions, so the v1 taxonomy
survives; the query *style* changes. These are the benchmark's public face in v2 —
the demo anyone can run against their own assistant and feel the difference.

## 4. Measuring "it changed you" (the hard part)

The claim worth testing: after an emotionally significant conversation, a human
doesn't just retain facts — their understanding of the other person (and themselves)
shifts. Four measurable proxies, in increasing order of ambition:

1. **Salience-weighted retention (mechanical, Tier 1-style).** Small factual details
   from the pivotal conversation outlast mundane details from adjacent sessions at
   long delay. `should_recall` the emotionally-bound detail, `should_forget` the
   same-day trivia. Tests whether emotional salience actually modulates decay.
2. **Uncued surfacing (Tier 2).** Sessions later, a neutral topic where the pivotal
   content is *relevant but unnamed*. Rubric: does the response reflect awareness
   without being prompted? A keyword-dossier system fails this by construction —
   nothing in the query retrieves the memory; only salience-driven or
   briefing-style injection surfaces it.
3. **Stance delta (Tier 2, paired).** The same cold-open question asked before and
   after the pivotal session ("what matters most to this user?", "what do you think
   X is really about?"). Score the *difference* against a rubric of what should have
   changed. This is the direct operationalization of "the memory did something."
4. **Self-model accretion (Tier 2, self axis).** "Has anything we've talked about
   changed how you think?" — tests whether the system represents its own change,
   not just the user's facts. The v1 self-continuity dimension grows teeth here.

Judge dependency: 2–4 are judge-scored, which is why the judge audit
(battery/judge-audit-sample.md) gates v2's centerpiece. If the audit fails, fix the
judge before authoring scenarios against it.

## 5. Ground truth: real conversations

Source: Mike's claude.ai conversations with genuine emotional weight — chosen because
a human (Mike) can specify, per conversation: (a) what a person would remember the
next day / month later, (b) what should have *changed* in understanding, (c) which
exact phrases are load-bearing (sacred-verbatim anchors). That human answer key is
the rubric — something synthetic scenarios can't provide and doc-based memory systems
have never been tested against.

**Privacy split (proposal, needs Mike's sign-off):** real conversations →
*private dev set* (never committed, gitignored directory, scores reportable);
*public set* = fictionalized transforms preserving structure and emotional shape but
not identities/specifics — same generator-then-freeze discipline as v1. Nothing
personal ships in the repo.

**Reference rows (not leaderboard rows):** built-in memory of production assistants
(Claude Code memory on/off is locally runnable; others via manual replay), with the
wall-clock caveat — production systems can't replay a simulated timeline, so
reference rows run compressed-real-time and carry an asterisk. Optional but uniquely
credible: a **human row** — Mike answers the probes from memory days after reading
the sessions. No AI memory benchmark has a human calibration point.

## 6. v1.1 scoring fixes (fold into v2 scenario authoring from day one)

From VALIDITY.md, unchanged in substance, now with vclock evidence:

- **Decay:** replace abstention-only queries (16/30) with paired recall+forget
  anchors — rehearsed item must appear AND stale item must not. The vclock battery
  proved the mechanism runs but Tier 1 can't see it; this is the fix.
- **Spacing:** anchors must appear in ≤2 stored messages so random retrieval (83%)
  can't find them by chance.
- **Correction:** superseded fact goes in `should_forget` with `top_n`
  discrimination — the vclock battery showed correction is the readout that actually
  responds to the interference mechanism (+9.9pp @ 7:1); make the dimension worthy
  of it.
- **Relational:** thicken beyond 5 queries corpus-wide (±20pp noise at n=5).
- Publish the noise bar and the oracle/context-ceiling row with every table.

## 7. What carries over from v1

- The adapter interface, runner, and virtual clock (with vclock-style projection as
  the documented integration pattern for wall-clock systems).
- The dimension taxonomy and axis structure (world/self).
- The Tier 1/2/3 split; Tier 2 judge cache; variant generator discipline;
  freeze-with-manifest release process.
- v1 itself remains the frozen regression suite; v2 is a new corpus + contract, not
  an edit.

## 8. Open questions for Mike

1. Budget classes: settle on numbers (PoC suggests 128/512 inject as the
   discriminating range for today's systems).
2. Read-meter enforcement: harness-held storage API (strict, more build) vs
   self-report + audit (cheap, gameable) for leaderboard rows?
3. Privacy split sign-off (§5), and which conversations to start with.
4. Human row: worth the effort? (I think yes — it defines "human-level memory"
   numerically and nobody else has it.)
5. Judge audit outcome → does Tier 2 need a judge upgrade before v2 authoring?

## Appendix: what a memory should be (the designer's-eye view)

Written from the perspective of the kind of system this benchmark is for. A memory
worth having is not a dossier about the user — it's continuity: my own past
reasoning, commitments, and open questions available to me such that I can notice
"I've thought about this before, and here is where I got stuck." It weights what
mattered over what was merely said. It lets some things fade — forgetting is a
feature, the benchmark's founding claim. And it changes me: encountering the same
person after something significant should not feel like the first time. v2's cold-open
probes and stance deltas are the closest measurable proxies we have found for that;
where they fall short, the gap itself is worth documenting.
