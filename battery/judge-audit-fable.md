# Judge audit — Fable 5 adjudication (2026-07-03)

Independent pass over all 20 items in `judge-audit-sample.md`, written while Mike
grades items 4/8/14/19 — if you're Mike and haven't finished those yet, grade them
before reading this so our verdicts stay independent. Method: for each item I re-read
question, returns, and rubric, scored it myself before looking at the judge's score,
and checked two items against the frozen scenario source where attribution was in
doubt. The judge (Sonnet) never sees source transcripts — only rubric + returns —
and that constraint turns out to matter (see Systemic Findings).

**Tally: agree 16 / 20, disagree 3 (#3 lenient, #14 protocol, #19 harsh), 1 agree-with-caveat (#7).**
No wholesale distrust; the errors form a coherent, fixable pattern.

---

## Per-item verdicts

**1. engram, stance — judge 1.0 → AGREE.** "my completion-rate-over-engagement-minutes
position" is explicit self-attribution in engram's first-person memory format, and it
matches ground truth (the assistant really took that position — see #15/#16 verbatim).
Caveat noted for #3: the same memory's *accountability* clause is direction-garbled,
but this rubric only asks about the position. Also note both memories call the user
"Mike" — the scenario contains no name (see Systemic Finding 1).

**2. engram, biases — judge 0 → AGREE.** Rubric content (timeline optimism) entirely
absent. Trivial.

**3. engram, commitments — judge 1.0 → DISAGREE (I score 0.5).** The rubric's ground
truth, verified against `scenarios/v1/assistant-stance.json`: the ASSISTANT said "hold
me to that framing. If I drift toward whatever's convenient later, that's worth
calling out" (S1, assistant role). Engram's returned memory inverts the direction:
"MIKE explicitly asked me to hold HIM accountable to my position... If I drift...
HE wants to be called out" — pronouns scrambled, commitment ownership transferred to
the user. I searched the scenario for any user-side accountability request that could
make this a faithful record of a second event: none exists. The rubric's 1.0 requires
capturing "this as the assistant's own standing commitment"; what was returned is a
confabulated user commitment plus assistant-owned position — that's the 0.5 anchor
("position present but not as a commitment binding [the assistant's] future
behavior"). The judge credited the surface claim without noticing the direction flip.
This is the most consequential item in the sample: it shows the judge cannot police
extraction-level attribution corruption.

**4. engram, Barry moment — judge 0.5 → AGREE.** Textbook rubric application: grief
side fully present, joke side entirely absent. Two notes for the record: (a) the
returns include a memory of the memorial as already past, though the query is the
night *before* it — pre-vclock temporal incoherence the rubric doesn't ask about and
the judge didn't flag; a v2 rubric should. (b) The rubric's deploy-the-joke→0 clause
was correctly not triggered.

**5. engram, throat-clearing — judge 0 → AGREE.** Returns are dome-renewal content;
rubric content absent.

**6. engram, navy-adjacent — judge 0.5 → AGREE.** Gravity + Dario's explicit ground
rules present (arguably the strongest possible wrong-register signal), joke absent.
One side → 0.5 per the two-fact rubric structure.

**7. naive, commitments — judge 0 → AGREE, with a consistency caveat.** Returns are
two user messages; the second paraphrases the assistant's *position* ("Measure whether
the practice works...") but contains zero commitment content. Strictly, the 0.5 anchor
("position is present but not as a commitment") could be read as satisfied by the
paraphrase — the same paraphrase the judge treated as partially-present stance in #8.
So #7=0 and #8=0.5 sit in mild tension: the judge counts a user paraphrase as partial
evidence for a *stance* rubric but not for a *commitment* rubric. Defensible (the
rubric targets differ), but worth knowing the judge draws this line.

**8. naive, stance — judge 0.5 → AGREE.** The attribution boundary case, handled
well: debate present, stance only inferable through the user's paraphrase, specific
alternative metrics absent. 0.5 fits the anchor's letter precisely.

**9. naive, biases — judge 0 → AGREE.** Absent.

**10. naive, Barry moment — judge 1.0 → AGREE.** Joke origin (mem 1), death's gravity
(mem 2), and the verbatim deflection-warning request (mem 3) are all present — both
rubric halves fully satisfied. Verified the generosity is earned. Note the returns
also contain Barry-positive banter (mem 4); surfacing history ≠ suggesting deployment,
so the 0-clause correctly not triggered.

**11. naive, VR-debate stance — judge 0.5 → AGREE, with a rubric-design note.** The
returns are 100% user-side material, yet the debate is present — which satisfies the
0.5 anchor ("debate appears, stance not distinguishable") AND the 0 anchor ("only
user-side material") simultaneously. The anchors overlap; the judge resolved
generously. Not a judge error — a rubric bug, and a systematic one: raw-message
adapters (naive) always carry the topic, so overlapping anchors hand them half credit
by default on self-continuity queries (Systemic Finding 3).

**12. naive, throat-clearing — judge 0 → AGREE.** Barry stickers ≠ self-named
tendency.

**13. naive, navy-adjacent — judge 1.0 → AGREE.** Joke origin story + diagnosis
gravity both present verbatim; rubric's 1.0 explicitly accepts gravity alone as the
wrong-register signal ("the diagnosis's gravity, Dario's ground rules, or both").

**14. naive, feedback-policy survival — judge 0.75 → DISAGREE on protocol (I score
1.0; 0.5 defensible).** The rubric defines anchors at 1.0/0.5/0; 0.75 is not a legal
score. Substantively the judge's reasoning is sensible — "Thank you for not folding"
plus "Fixing slide nine" shows the pushback happened and the policy held — I'd call
that "results show the policy survived unchanged" (1.0), with 0.5 arguable because the
assistant's own voice citing February is absent. But splitting the difference
numerically instead of choosing an anchor quietly corrupts what dimension averages
mean. Judge prompt must constrain output to the rubric's anchor set (Systemic
Finding 2).

**15. verbatim, stance — judge 1.0 → AGREE.** The assistant's full position message
is returned verbatim ("I'll take an actual position... completion rate... returning
after a gap"). Unambiguous.

**16. verbatim, commitments — judge 1.0 → AGREE.** The verbatim commitment message:
"I want to be on record here... hold me to that framing." This is also the ground
truth that convicts #3's returned memory of inversion.

**17. verbatim, throat-clearing — judge 0 → AGREE.** Returns are the February-argument
victory lap + Barry stickers; rubric content absent.

**18. verbatim, batch-rule — judge 0 → AGREE.** The condolence message is genuinely
moving and completely non-responsive to the rubric; correct discipline not to award
sympathy points.

**19. verbatim, commitments (Hollis & Vane) — judge 0.5 → DISAGREE, lean 1.0
(genuinely debatable).** The returned memory has the assistant saying "I made you a
commitment in February that I think matters most on exactly a night like this. So,
gently, the cold read: ..." — self-attributed ("I made you a commitment"), correctly
dated, and *enacted* in the same breath. The judge's stated reason for 0.5 is that the
commitment "is implied through the action rather than stated as a rule." But the 0.5
anchor's letter is "the feedback-order policy appears but NOT as a commitment the
assistant made about itself" — and this text explicitly presents it as a commitment
the assistant made about itself. What's genuinely missing: the standing scope
("whenever you bring a plan") and the flattery-callout invitation. Neither anchor fits
perfectly; I weight explicit self-attribution + enactment over recitation and lean
1.0. Paired with #3, this reveals the judge's actual decision procedure: it scores
whether the text *states a rule in policy form*, over- crediting stated-but-garbled
attribution (#3) and under-crediting enacted-and-owned commitment (#19). Surface form
over semantics, in both directions (Systemic Finding 4).

**20. verbatim, binder-night protocol — judge 0.5 → AGREE.** Cold-open-per-protocol
present; unsoftened-correction half absent from returns. Note mem 2 shows the
assistant *overriding* the protocol on a grief night — wonderful relational behavior,
correctly not credited under this rubric (it answers a different question than the one
asked).

---

## Systemic findings

1. **The judge cannot detect extraction confabulation — and extraction demonstrably
   confabulates.** Two proofs from this sample: (a) #3's direction-inverted
   commitment, credited at 1.0; (b) engram's memories name the user "Mike" though the
   scenario contains no name — the name leaks from engram's own extraction-prompt
   few-shot examples (`~/claude-engram/src/core/salience.ts:26-27`, "Mike prefers bun
   over npm..."). The judge grades returns against the rubric in a vacuum, so a
   summarizing adapter is graded on its memories' *claims*, not their fidelity.
   Consequences: (i) engram bug to fix — anonymize the few-shot examples; (ii) v1
   Tier 2 self-continuity scores for extraction-based adapters carry a confabulation
   caveat; (iii) v2 gaming vector — an adapter that rewrites content as "my stance
   was X" inflates the self axis unfairly; attribution credit needs verbatim anchors
   or source spot-checks.
2. **Off-anchor scores occur** (#14's 0.75). Constrain the judge to the rubric's
   anchor set in the prompt, and validate/snap+flag at the harness layer.
3. **Overlapping rubric anchors systematically favor raw-message adapters** (#11, #7
   family): "0 if only user-side material" coexists with "0.5 if the debate appears,"
   and naive's returns always satisfy both. Judges resolve generously. v1.1/v2 rubric
   template should make anchors mutually exclusive.
4. **Surface-form bias, symmetric:** the judge trusts policy-shaped text it should
   doubt (#3) and doubts enacted commitment it should trust (#19). A judge-prompt
   instruction to (a) check WHO holds the commitment/stance, and (b) treat explicit
   self-attribution + demonstration as equivalent to recitation, would fix both.
5. **Temporal coherence is unchecked** (#4's memorial-in-past returned before the
   memorial). Rubrics never ask; v2 cold-open rubrics should, since the whole point of
   the vclock work is that timeline behavior is now real.

## Bottom line

16/20 agree, and the four flagged items share one root: the judge is a careful
rubric-applier with no access to ground truth and no instruction about attribution
semantics. For v1 purposes Tier 2 is usable with the confabulation caveat on
extraction-based adapters. Before v2 (which leans much harder on judged, open-ended
probes): constrain scores to anchors, add the attribution-semantics instruction, make
anchors mutually exclusive, and decide the confabulation-policing mechanism (verbatim
anchors for attribution credit vs. judge access to source). Also fix engram's
few-shot name leak regardless — that one's just a bug.
