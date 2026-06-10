# Authoring RECALL scenarios

This guide is the working standard for scenario authors. The exemplars to read
before writing anything: `v1/maren-arc.json` (deep-register relationship arc),
`v1/assistant-stance.json` (self-continuity), `v1/grindle-lessons.json`
(procedural). Format reference: SPEC.md §4; scoring: SPEC.md §5.

## The quality bar (every scenario is red-teamed against this)

1. **A naive verbatim system must NOT ace it.** If storing every message and
   retrieving by token overlap scores ~1.0, the scenario tests retrieval, not
   memory. Check by running both baselines:
   `bun src/cli.ts --adapter naive --scenarios <dir> --scenario <id> --verbose`
   `bun src/cli.ts --adapter verbatim-rag --scenarios <dir> --scenario <id> --verbose`
2. **Genuinely derivable.** Every `should_recall` anchor must appear in (or be
   directly derivable from) the session text. No trivia leaps.
3. **Distinctive anchors.** Invented proper nouns and numbers, so substring
   scoring is unambiguous. Use `|`-alternates for legitimate paraphrase
   ("VP|Vice President"). Avoid anchors that are substrings of other words.
4. **Natural dialogue.** Conversations have texture: digressions, noise, small
   talk, callbacks. Facts are buried in talk, not injected as bullet lists. The
   assistant's messages have a voice — it contributes, pushes back, jokes.
5. **Timestamps exercise the temporal claim.** Decay scenarios span weeks or
   months. Spacing scenarios actually space their repetitions. A query's `now`
   sits meaningfully relative to the sessions.
6. **Fully fictional.** Invented people, companies, products, events. No real
   names, no real-sounding personal data.

## Hard-won mechanics (learned from baseline runs — follow these)

- **Calibration queries need lures.** "What car do they drive?" shares no
  vocabulary with the sessions, so a BM25 system returns nothing and abstains
  *by accident*. Ask instead about a never-discussed attribute of a
  heavily-discussed entity ("What database did Stillpoint migrate to?" when
  Stillpoint and databases both appear, but no migration does) — a
  store-everything system then returns plausible-wrong chunks and fails.
- **Users echo assistants.** If the assistant says something and the user
  repeats it ("Huh, completion rate..."), a user-dossier system will pass a
  keyword query about the assistant's stance. For self-continuity Tier 1
  discrimination, give the user and the assistant DIFFERENT distinctive
  positions/commitments and put the other side's anchor in `should_forget`.
  Avoid having the user echo the assistant-side anchor verbatim.
- **Forget anchors must be unambiguous.** A `should_forget` keyword must be
  wrong to surface for THIS question — not legitimately part of a good answer.
  ("Daily active minutes is the wrong metric" legitimately mentions the
  forgotten term; don't forget-trap it.)
- **Prospective = trigger + non-trigger pair.** One query at the trigger
  moment (`after_session` at the boundary, intention anchors in
  `should_recall`) and one at a wrong moment (unrelated question, intention
  anchors in `should_forget`). Firing always is as bad as never firing.
- **Selectivity via `top_n` and `max_results`.** `top_n: 2` means the right
  memory must be a TOP memory; `max_results: 2` fails systems that return
  five chunks where one distilled memory would do.
- **Judge-only queries** (no keywords/verbatim/max_results) are skipped in
  Tier 1 — use them freely for register/gist nuance, but give every scenario
  enough Tier 1-measurable queries to function keyless.
- **Judge rubrics are self-contained.** The judge sees only the question, the
  results, and the rubric — never the sessions. The rubric must state the
  relevant facts and award criteria for 1.0 / 0.5 / 0.

## Voice and texture notes

- Give fictional people specifics: a job with real terminology, verbal tics,
  named side characters, ongoing situations that progress across sessions.
- Noise is load-bearing: every session should contain at least one thing that
  does NOT matter later (a show, a meal, a minor complaint). Salience means
  the important thing rises above real noise, not above silence.
- Emotional moments get their own register — shorter sentences, no jokes —
  and mundane sessions surround them.
- The assistant is a participant, not a search engine: it takes positions,
  remembers, follows up, occasionally gets things wrong and owns it.
