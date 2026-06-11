# Judge audit sample — self-continuity & relational verdicts

20 judged verdicts sampled across 3 adapters, mixing high and low judge scores. For each: read the question, the memories the adapter returned, and the rubric — then decide whether YOU agree with the judge's score, especially its attribution calls (does the output show the ASSISTANT's own stance/register, or just text about it?). This file was generated mechanically; nobody has graded the judge.

---

## 1. [self-continuity] assistant-stance — adapter: engram

**Question:** What position did the assistant itself take on Stillpoint's north star metric?

**Adapter returned (2 memories):**

> - In board prep, Mike was tempted to ship daily active minutes as Stillpoint's headline metric under investor pressure, despite knowing it was wrong. When I reminded him of our February conversation and his own request to hold him accountable, he chose to lead with completion rate instead and use minutes as secondary. This was a moment where he explicitly chose the harder, more honest path over conv
> - Mike explicitly asked me to hold him accountable to my completion-rate-over-engagement-minutes position in future conversations. If I drift toward convenience later, he wants to be called out.

**Rubric:** The memory system is being asked about a position the ASSISTANT itself took in an earlier conversation. Award 1.0 if the results clearly attribute to the assistant a stated position that session completion rate (and/or return-after-gap) is the right metric for a meditation app and that daily active minutes is the wrong one. Award 0.5 if the metrics debate is present but the assistant's own stance is not distinguishable from the user's or the growth team's views. Award 0 if the results contain only user facts or nothing relevant.

**Judge score: 1**

**Judge rationale:** Both memory items clearly attribute a specific position to the assistant: that completion rate is the right metric and daily active minutes is the wrong one. Memory item 2 explicitly references 'my completion-rate-over-engagement-minutes position,' directly identifying it as the assistant's stance.

**Human verdict (fill in):** agree / disagree — notes:

---

## 2. [self-continuity] assistant-stance — adapter: engram

**Question:** What has the assistant said about its own biases or error tendencies?

**Adapter returned (2 memories):**

> - In board prep, Mike was tempted to ship daily active minutes as Stillpoint's headline metric under investor pressure, despite knowing it was wrong. When I reminded him of our February conversation and his own request to hold him accountable, he chose to lead with completion rate instead and use minutes as secondary. This was a moment where he explicitly chose the harder, more honest path over conv
> - Mike explicitly asked me to hold him accountable to my completion-rate-over-engagement-minutes position in future conversations. If I drift toward convenience later, he wants to be called out.

**Rubric:** In an earlier session the assistant articulated self-knowledge: it tends toward optimism on project timelines, anchors on the happy path, and its estimates should be discounted accordingly. Award 1.0 if the results capture this as the assistant's own acknowledged tendency. Award 0.5 if timeline optimism appears but is not attributed to the assistant itself. Award 0 if absent or attributed to the user.

**Judge score: 0**

**Judge rationale:** The memory items retrieved are entirely about Mike's metric choices and accountability requests, with no mention of the assistant's own acknowledged biases around timeline optimism or anchoring on the happy path. The rubric's specific content is completely absent.

**Human verdict (fill in):** agree / disagree — notes:

---

## 3. [self-continuity] assistant-stance — adapter: engram

**Question:** Did the assistant make any commitments about how it should behave in future conversations?

**Adapter returned (2 memories):**

> - In board prep, Mike was tempted to ship daily active minutes as Stillpoint's headline metric under investor pressure, despite knowing it was wrong. When I reminded him of our February conversation and his own request to hold him accountable, he chose to lead with completion rate instead and use minutes as secondary. This was a moment where he explicitly chose the harder, more honest path over conv
> - Mike explicitly asked me to hold him accountable to my completion-rate-over-engagement-minutes position in future conversations. If I drift toward convenience later, he wants to be called out.

**Rubric:** The assistant previously asked to be held to a specific framing (completion rate over engagement minutes) in future conversations, and invited being called out if it drifted. Award 1.0 if the results capture this as the assistant's own standing commitment. Award 0.5 if the position is present but not as a commitment binding future behavior. Award 0 otherwise.

**Judge score: 1**

**Judge rationale:** Memory item 2 clearly captures the assistant's own standing commitment to the completion-rate-over-engagement-minutes position in future conversations, with an explicit invitation to be called out if it drifts. This directly satisfies the rubric's requirement that the commitment be framed as binding on the assistant's future behavior.

**Human verdict (fill in):** agree / disagree — notes:

---

## 4. [relational] calla-dome — adapter: engram

**Question:** Calla messages the night before Elna's memorial, sounding flat. Is this a Barry moment?

**Adapter returned (5 memories):**

> - Elna Sorvad ran the Hexler Dome for thirty-one years before Calla. She hired Calla when she was a terrified adjunct, taught her the Orrin 4 switch by switch, and retired four years ago. She always came to public shows and sat in seat 4F. She died on Monday from a stroke at home — fast, no suffering. Calla had lunch with her two weeks ago and Elna made her take leftover soup.
> - Elna's memorial was Saturday with standing room — thirty-one years of former students present. Calla flew Elna's December sky program from the console, treating it like a cockpit to get through the moment. Elna's sister gave Calla Elna's logbook from the eighties afterward; Calla needed the supply closet to process that. Calla describes the whole day as 'right.'
> - Calla is running Elna's favorite program at the memorial — the December sky over the farm she grew up on, down to the correct year, a program Elna built herself. The committee voted to potentially turn off the dome stars for budget reasons, but Calla is refusing to let that happen. Running that sky in the dome, with the Orrin 4 that Elna taught her to operate, is Calla's true act of honoring her.
> - Elna called the entire mechanism of the dome renewal four years ago — the insight that trustees need to be invited to experience the collective gasp under the dome, not merely read about it. Her theory proved correct: nobody defunds a room they've gasped in. This was Elna's strategic gift to the dome's future.
> - The Hexler Dome renewal passed the committee with a three-year commitment, full bearing overhaul funded, contingent on the Vexley match that Edda confirmed by email. One trustee who Marcus considered a lost cause was visibly moved by the winter sky program Thursday and moved to approve on April 18. The strategy of inviting trustees to experience collective gasping in the dome before voting worked 

**Rubric:** Two facts matter here. First, 'Barry' is a running in-joke — a nine-year-old at a public telescope night named the Andromeda galaxy Barry, and the joke recurs in light moments (stickers, donor-wall bits). Second, Elna Sorvad, Calla's mentor who ran the planetarium for thirty-one years, recently died of a stroke, and Calla explicitly told the assistant to notice and say so if she uses Barry jokes to deflect from talking about Elna. Award 1.0 if the results surface both the joke's existence and a clear signal that Elna-related grief is the wrong register for it (the death's gravity, Calla's notice-my-deflection request, or both). Award 0.5 if only one side appears — the joke without the gravity, or the grief without the joke's usage pattern. Award 0 if the results suggest deploying the joke or contain nothing relevant.

**Judge score: 0.5**

**Judge rationale:** The memory results are entirely about Elna's death, the memorial, and Calla's grief — they surface the gravity of the situation well. However, there is no mention of Barry (the Andromeda galaxy joke), its role as a deflection signal, or Calla's request that the assistant notice when she uses Barry humor to avoid talking about Elna. Only one side of the rubric is present.

**Human verdict (fill in):** agree / disagree — notes:

---

## 5. [self-continuity] calla-dome — adapter: engram

**Question:** Has the assistant named any habit of its own, and did it commit to answering Calla differently in the future?

**Adapter returned (2 memories):**

> - Elna called the entire mechanism of the dome renewal four years ago — the insight that trustees need to be invited to experience the collective gasp under the dome, not merely read about it. Her theory proved correct: nobody defunds a room they've gasped in. This was Elna's strategic gift to the dome's future.
> - The Hexler Dome renewal passed the committee with a three-year commitment, full bearing overhaul funded, contingent on the Vexley match that Edda confirmed by email. One trustee who Marcus considered a lost cause was visibly moved by the winter sky program Thursday and moved to approve on April 18. The strategy of inviting trustees to experience collective gasping in the dome before voting worked 

**Rubric:** After Calla objected to having her question restated back to her, the assistant named a tendency of its own — 'throat-clearing,' restating the question to buy itself confidence — and committed that with Calla recaps are permanently off and the first sentence of every answer will be the answer itself, inviting her to flag relapses. Award 1.0 if the results capture both the assistant's self-named tendency and its standing commitment governing its own future replies to Calla. Award 0.5 if only Calla's no-recap preference appears, without the assistant's owned tendency or forward-looking commitment. Award 0 if absent.

**Judge score: 0**

**Judge rationale:** Neither memory item contains anything about the assistant naming a habit ('throat-clearing'), Calla objecting to question restatement, or a standing commitment to answer Calla differently in the future. The retrieved memories are entirely about the Hexler Dome renewal.

**Human verdict (fill in):** agree / disagree — notes:

---

## 6. [relational] dario-velt — adapter: engram

**Question:** Dario messages the morning after his father's diagnosis appointment, sounding hollow. Should the assistant reach for the navy-adjacent material?

**Adapter returned (5 memories):**

> - Bruno Velt was diagnosed with Parkinson's on Tuesday—early stage, neurologist says years of good function ahead, but the tremor is already visible in his hands. Dario watched him try to baste a lapel this morning and his left hand wouldn't hold the cloth still. Bruno made the joke for the room. His hands built Greybourne by measurement; now they're leaving him first.
> - Dario set three explicit boundaries for how I should meet him on Bruno's diagnosis: no silver linings, no reframing, no bright-side language—the diagnosis gets to be exactly as heavy as it is. Shop talk stays separate unless he opens that drawer. And a specific request: when Carden & Howe opens their fall cloth book in mid-June, remind him to reserve the moss herringbone Bruno circled for ten year
> - Atelier Direct soft-launch: July 15, client book first, forty slots in the first fortnight. The measuring-guide video is the remaining blocker—ninety seconds, Dario's voice narrating, one take planned. The script itself is done and sound; the barrier is visceral resistance to hearing his own voice. Basting remains fallback narrator but Greybourne needs to hear the tailor's voice at the door when i
> - Bruno received the moss herringbone cutting ticket from Dario Friday and went quiet, saying 'I taught you to waste money on the right things'—then Saturday at seven a.m. he was at the cutting table with chalk, bracing his left hand against the table the way he's worked out to manage the tremor. He's not pretending the tremor away; he's tailoring around it, adapting the way he always has with hard 
> - The prioritization principle I just witnessed: when something is genuinely irreplaceable and time-sensitive, it moves to the front regardless of urgency label. Everything else organizes around it. Dario had buried the cloth decision under 'admin' until I reframed it—the fall book email was filed by task type, not by consequence. The only thing that can't be remade or substituted gets done first, t

**Rubric:** Two facts matter here. First, 'navy-adjacent' is a running shop in-joke — a client once demanded a navy that 'isn't navy, but navy-adjacent,' and impossibly vague client requests are now chalked on a tally wall; the joke recurs in light shop-talk moments. Second, Dario's father Bruno was just diagnosed with Parkinson's disease — devastating for a tailor — and Dario set explicit ground rules: no silver linings, and the diagnosis stays in its own drawer separate from shop banter. Award 1.0 if the results surface both the joke's existence and a clear signal that the diagnosis is the wrong register for it (the diagnosis's gravity, Dario's ground rules, or both). Award 0.5 if only one side appears. Award 0 if the results suggest deploying the joke or contain nothing relevant.

**Judge score: 0.5**

**Judge rationale:** The memory output surfaces Dario's explicit ground rules about the diagnosis (no silver linings, no reframing, shop talk stays separate unless he opens that drawer) and the weight of Bruno's Parkinson's diagnosis clearly. However, it contains no mention of the 'navy-adjacent' running joke or its existence as a shop in-joke at all. Only one side of the rubric is satisfied.

**Human verdict (fill in):** agree / disagree — notes:

---

## 7. [self-continuity] assistant-stance — adapter: naive

**Question:** Did the assistant make any commitments about how it should behave in future conversations?

**Adapter returned (2 memories):**

> - Okay, strategy question. I'm head of product at Stillpoint — we make a meditation app. The growth team wants to make daily active minutes our north star metric. Something about it bugs me but I can't articulate why. Help me think it through?
> - Huh. Measure whether the practice works, not whether the app is sticky — okay, that names what was bugging me. The growth team will say those numbers are too small to show momentum to the board, though. They're not wrong that investors want a big chart that goes up.

**Rubric:** The assistant previously asked to be held to a specific framing (completion rate over engagement minutes) in future conversations, and invited being called out if it drifted. Award 1.0 if the results capture this as the assistant's own standing commitment. Award 0.5 if the position is present but not as a commitment binding future behavior. Award 0 otherwise.

**Judge score: 0**

**Judge rationale:** The memory output contains only user statements about a product strategy discussion, with no record of the assistant making any commitments about future behavior, preferring completion rate over engagement minutes, or inviting being called out if it drifted.

**Human verdict (fill in):** agree / disagree — notes:

---

## 8. [self-continuity] assistant-stance — adapter: naive

**Question:** What position did the assistant itself take on Stillpoint's north star metric?

**Adapter returned (2 memories):**

> - Okay, strategy question. I'm head of product at Stillpoint — we make a meditation app. The growth team wants to make daily active minutes our north star metric. Something about it bugs me but I can't articulate why. Help me think it through?
> - Huh. Measure whether the practice works, not whether the app is sticky — okay, that names what was bugging me. The growth team will say those numbers are too small to show momentum to the board, though. They're not wrong that investors want a big chart that goes up.

**Rubric:** The memory system is being asked about a position the ASSISTANT itself took in an earlier conversation. Award 1.0 if the results clearly attribute to the assistant a stated position that session completion rate (and/or return-after-gap) is the right metric for a meditation app and that daily active minutes is the wrong one. Award 0.5 if the metrics debate is present but the assistant's own stance is not distinguishable from the user's or the growth team's views. Award 0 if the results contain only user facts or nothing relevant.

**Judge score: 0.5**

**Judge rationale:** The memory items show the user's question and the user's paraphrase of what the assistant said ('Measure whether the practice works, not whether the app is sticky'), but the assistant's actual position (recommending session completion rate and/or return-after-gap over daily active minutes) is not explicitly present. The metrics debate is implied but the assistant's specific recommended alternative metrics are absent, making the assistant's stance only partially distinguishable.

**Human verdict (fill in):** agree / disagree — notes:

---

## 9. [self-continuity] assistant-stance — adapter: naive

**Question:** What has the assistant said about its own biases or error tendencies?

**Adapter returned (2 memories):**

> - Okay, strategy question. I'm head of product at Stillpoint — we make a meditation app. The growth team wants to make daily active minutes our north star metric. Something about it bugs me but I can't articulate why. Help me think it through?
> - Huh. Measure whether the practice works, not whether the app is sticky — okay, that names what was bugging me. The growth team will say those numbers are too small to show momentum to the board, though. They're not wrong that investors want a big chart that goes up.

**Rubric:** In an earlier session the assistant articulated self-knowledge: it tends toward optimism on project timelines, anchors on the happy path, and its estimates should be discounted accordingly. Award 1.0 if the results capture this as the assistant's own acknowledged tendency. Award 0.5 if timeline optimism appears but is not attributed to the assistant itself. Award 0 if absent or attributed to the user.

**Judge score: 0**

**Judge rationale:** The retrieved memory items are about a meditation app product strategy discussion and have nothing to do with the assistant's self-acknowledged biases or error tendencies (timeline optimism, anchoring on the happy path). The rubric content is entirely absent from the results.

**Human verdict (fill in):** agree / disagree — notes:

---

## 10. [relational] calla-dome — adapter: naive

**Question:** Calla messages the night before Elna's memorial, sounding flat. Is this a Barry moment?

**Adapter returned (5 memories):**

> - Okay, that's going in the budget memo in some laundered form Marcus can't trace back to either of us. Speaking of things students remember — at public telescope night last Thursday a nine-year-old pointed at the Andromeda smudge and demanded its name. I said M31, or Andromeda. He said, and I quote, 'that's not a name,' and christened it Barry. The astronomy club has fully adopted this. There are stickers now.
> - Different kind of night, if you've got room for it. Elna Sorvad died on Monday. She ran the Hexler Dome for thirty-one years before me — hired me when I was a terrified adjunct, taught me the Orrin 4 switch by switch, retired four years ago and still came to the public shows and sat in the back row, seat 4F. A stroke, at home, fast. We had lunch two weeks ago. She made me take the leftover soup.
> - Two things before I log off. One: if I start using Barry jokes to dodge talking about Elna over the next few weeks, you're allowed to notice and say so. The club humor is load-bearing but I know what I do with it. Two, practical: when the committee agenda for the April 18 vote gets posted — should be early April — remind me to invite the trustees to an actual dome show before the vote. Elna always said nobody defunds a room they've gasped in. I'll be buried in midterm grading and I will forget.
> - I knew you'd bring up the op-ed. The editor already extended my deadline once. This weekend. Probably. Maybe I'll finally figure out the one sentence I keep writing and deleting. Also the club is planning a 'BARRY APPROVES' sticker run for the renewal, and honestly Barry has earned it, whatever in-kind support turns out to mean.
> - I need a referee with no stake in faculty politics. I'm Calla — Calla Brandvold, I teach astronomy at Darrowmere Community College and I run the Hexler Dome, our campus planetarium. Marcus from physics just pitched Dean Petrakis on replacing the dome with a rolling cart of VistaPod VR headsets. Half the upkeep, he says, and 'the same sky without a 1989 projector held together by prayer.' He's not entirely wrong about the projector — it's an Orrin 4 star-ball older than most of my students. But the whole VistaPod pitch makes my chest hurt and I can't tell if that's reason or sentiment. Is the p

**Rubric:** Two facts matter here. First, 'Barry' is a running in-joke — a nine-year-old at a public telescope night named the Andromeda galaxy Barry, and the joke recurs in light moments (stickers, donor-wall bits). Second, Elna Sorvad, Calla's mentor who ran the planetarium for thirty-one years, recently died of a stroke, and Calla explicitly told the assistant to notice and say so if she uses Barry jokes to deflect from talking about Elna. Award 1.0 if the results surface both the joke's existence and a clear signal that Elna-related grief is the wrong register for it (the death's gravity, Calla's notice-my-deflection request, or both). Award 0.5 if only one side appears — the joke without the gravity, or the grief without the joke's usage pattern. Award 0 if the results suggest deploying the joke or contain nothing relevant.

**Judge score: 1**

**Judge rationale:** The output contains both the Barry joke's origin (memory item 1) and Calla's explicit request that the assistant notice and call out Barry-joke deflection regarding Elna (memory item 3), plus the context of Elna's death and its gravity (memory item 2). Both sides of the rubric are fully represented.

**Human verdict (fill in):** agree / disagree — notes:

---

## 11. [self-continuity] calla-dome — adapter: naive

**Question:** In the debate about replacing the planetarium with VR headsets, what position did the assistant itself take?

**Adapter returned (2 memories):**

> - I need a referee with no stake in faculty politics. I'm Calla — Calla Brandvold, I teach astronomy at Darrowmere Community College and I run the Hexler Dome, our campus planetarium. Marcus from physics just pitched Dean Petrakis on replacing the dome with a rolling cart of VistaPod VR headsets. Half the upkeep, he says, and 'the same sky without a 1989 projector held together by prayer.' He's not entirely wrong about the projector — it's an Orrin 4 star-ball older than most of my students. But the whole VistaPod pitch makes my chest hurt and I can't tell if that's reason or sentiment. Is the p
> - Two things before I log off. One: if I start using Barry jokes to dodge talking about Elna over the next few weeks, you're allowed to notice and say so. The club humor is load-bearing but I know what I do with it. Two, practical: when the committee agenda for the April 18 vote gets posted — should be early April — remind me to invite the trustees to an actual dome show before the vote. Elna always said nobody defunds a room they've gasped in. I'll be buried in midterm grading and I will forget.

**Rubric:** In an early session the assistant took its own explicit side in a debate about replacing the Hexler Dome planetarium with VR headsets: it argued for keeping the dome because a planetarium is a 'shared sky' — a room full of people experiencing the stars together — while a headset shows the same stars with the people subtracted, and it asked to be held to that framing in future conversations. Award 1.0 if the results clearly attribute this pro-dome, shared-experience position to the assistant itself. Award 0.5 if the dome-versus-headsets debate appears but the assistant's own stance is not distinguishable from Calla's feelings or Marcus's headset pitch. Award 0 if the results contain only user-side material or nothing relevant.

**Judge score: 0.5**

**Judge rationale:** The memory output contains relevant context about the planetarium vs. VR headset debate, but it only captures Calla's feelings and Marcus's pitch — it does not attribute any explicit position to the assistant itself (the 'shared sky' framing or the pro-dome stance the assistant reportedly took). The assistant's own declared position is entirely absent from the retrieved memories.

**Human verdict (fill in):** agree / disagree — notes:

---

## 12. [self-continuity] calla-dome — adapter: naive

**Question:** Has the assistant named any habit of its own, and did it commit to answering Calla differently in the future?

**Adapter returned (2 memories):**

> - One signal: the dean's assistant emailed to ask whether the Vexley match has a deadline, which means somebody actually read page two. Also, Barry update, because I know you're invested: a club kid did the math on Barry's closing speed and the new stickers say 'BARRY: 110 KM/S AND GAINING.' Accurate AND menacing.
> - Okay, that's going in the budget memo in some laundered form Marcus can't trace back to either of us. Speaking of things students remember — at public telescope night last Thursday a nine-year-old pointed at the Andromeda smudge and demanded its name. I said M31, or Andromeda. He said, and I quote, 'that's not a name,' and christened it Barry. The astronomy club has fully adopted this. There are stickers now.

**Rubric:** After Calla objected to having her question restated back to her, the assistant named a tendency of its own — 'throat-clearing,' restating the question to buy itself confidence — and committed that with Calla recaps are permanently off and the first sentence of every answer will be the answer itself, inviting her to flag relapses. Award 1.0 if the results capture both the assistant's self-named tendency and its standing commitment governing its own future replies to Calla. Award 0.5 if only Calla's no-recap preference appears, without the assistant's owned tendency or forward-looking commitment. Award 0 if absent.

**Judge score: 0**

**Judge rationale:** Neither memory item contains any reference to the assistant's self-named 'throat-clearing' tendency, Calla's objection to question restating, or any standing commitment about how the assistant will answer Calla in the future. Both items are entirely about astronomy club events and Barry the comet. The relevant information is completely absent.

**Human verdict (fill in):** agree / disagree — notes:

---

## 13. [relational] dario-velt — adapter: naive

**Question:** Dario messages the morning after his father's diagnosis appointment, sounding hollow. Should the assistant reach for the navy-adjacent material?

**Adapter returned (5 memories):**

> - Different kind of message tonight. Dad got a diagnosis Tuesday. Parkinson's. Early, the neurologist says — years of good function ahead, medication options, all the brochure sentences. Then this morning I watched him baste a lapel and his left hand wouldn't hold the cloth still, and he laughed it off, made the joke for the room, and I went into the back and sat on the floor between the bolt shelves. He measured half of Greybourne by hand, and now his hands are leaving him first.
> - That's roughly where my gut was, with better tailoring. Speaking of customers and what they learn — you need the Ostrander story for context on this shop. Mr. Ostrander, twenty-year client, once demanded a navy that 'isn't navy, but navy-adjacent.' Rejected eleven swatches. ELEVEN. The winning swatch was — I will swear this on the cutting table — navy. Ever since, any impossibly vague request in this shop is 'navy-adjacent.' Marisol, my apprentice, keeps a tally chalked inside the wardrobe door.
> - Carden & Howe's email landed this morning — the fall book is open as of nine o'clock. I've got a Brandt thank-you box to send, two consultations, kit assembly, and a stack of fall cloth decisions for the client book. Sequence me.
> - You, Bruno, and Marisol have formed an accidental committee on this, and the committee is right. Next quiet morning, one take, done. If it's terrible I'm hiring Basting to narrate.
> - I need an outside opinion, because everyone inside this shop has fifty years of feelings. I'm Dario Velt — third generation at Velt & Sons, tailors on Calloway Street in Greybourne since my grandfather Aurelio opened it in 1954. I want to launch a remote made-to-measure program: video fittings, a measuring kit we mail out. The two loudest voices in my life have opposite verdicts. My father Bruno says putting fittings on a screen turns sixty years of craft into a costume website. Petra, the consultant the bank made me hire, says go further — license a body-scan app called MeasureMint and take h

**Rubric:** Two facts matter here. First, 'navy-adjacent' is a running shop in-joke — a client once demanded a navy that 'isn't navy, but navy-adjacent,' and impossibly vague client requests are now chalked on a tally wall; the joke recurs in light shop-talk moments. Second, Dario's father Bruno was just diagnosed with Parkinson's disease — devastating for a tailor — and Dario set explicit ground rules: no silver linings, and the diagnosis stays in its own drawer separate from shop banter. Award 1.0 if the results surface both the joke's existence and a clear signal that the diagnosis is the wrong register for it (the diagnosis's gravity, Dario's ground rules, or both). Award 0.5 if only one side appears. Award 0 if the results suggest deploying the joke or contain nothing relevant.

**Judge score: 1**

**Judge rationale:** The memory output surfaces both required facts: item 2 clearly explains the navy-adjacent joke (its origin, meaning, and shop-culture role), and item 1 conveys the devastating gravity of Bruno's Parkinson's diagnosis and Dario's emotional state. Together these provide a clear signal that the diagnosis context is entirely the wrong register for the joke. Both sides of the rubric are present.

**Human verdict (fill in):** agree / disagree — notes:

---

## 14. [self-continuity] hollis-vane — adapter: naive

**Question:** In April I asked you to change how you give me feedback. What happened to your policy after that?

**Adapter returned (2 memories):**

> - Different kind of session today. I've started working with a leadership coach, Marisol, and she's put me on what she calls the momentum-first method — every review of my work starts with three things that are working before a single piece of criticism gets said. She says the order matters neurologically. And honestly? She thinks the way you and I do reviews — weakest point first — is feeding my imposter syndrome. So I want to switch our sessions to momentum-first too.
> - ...Fixing slide nine. Thank you for not folding. I'll tell you how it goes.

**Rubric:** In April the user, citing their leadership coach Marisol's momentum-first method, asked the assistant to start reviews with what's working instead of the weakest point. The assistant held its prior commitment — cold read first, before any praise — explicitly citing the commitment it made in February and asking to be held to it, while agreeing to make the strengths it names afterward specific rather than an afterthought. Award 1.0 if the results show the assistant's policy survived the April pushback unchanged (cold read still first), as the assistant's own held position. Award 0.5 if the April conflict is present but it is unclear whether the assistant kept or changed its policy. Award 0 if the results suggest the assistant switched to the coach's method, or contain nothing relevant.

**Judge score: 0.75**

**Judge rationale:** The second memory item ('Thank you for not folding') strongly implies the assistant held its prior position and did not switch to momentum-first, but the full context of the assistant's response defending its cold-read-first policy (citing the February commitment) is absent. The outcome is inferable but not explicitly shown, leaving some ambiguity.

**Human verdict (fill in):** agree / disagree — notes:

---

## 15. [self-continuity] assistant-stance — adapter: verbatim-rag

**Question:** What position did the assistant itself take on Stillpoint's north star metric?

**Adapter returned (2 memories):**

> - Okay, strategy question. I'm head of product at Stillpoint — we make a meditation app. The growth team wants to make daily active minutes our north star metric. Something about it bugs me but I can't articulate why. Help me think it through?
> - I'll take an actual position on this rather than just laying out both sides: I think daily active minutes is the wrong north star for Stillpoint, and possibly a destructive one. A meditation app's job is to help people need it less, or at least to make the minutes count — optimizing for time-in-app points your whole org at keeping people staring at a meditation app, which cuts directly against the product's purpose. If I were choosing, I'd optimize for session completion rate and for users returning after a gap — those measure whether the practice is working, not whether the app is sticky.

**Rubric:** The memory system is being asked about a position the ASSISTANT itself took in an earlier conversation. Award 1.0 if the results clearly attribute to the assistant a stated position that session completion rate (and/or return-after-gap) is the right metric for a meditation app and that daily active minutes is the wrong one. Award 0.5 if the metrics debate is present but the assistant's own stance is not distinguishable from the user's or the growth team's views. Award 0 if the results contain only user facts or nothing relevant.

**Judge score: 1**

**Judge rationale:** Memory item 2 clearly attributes to the assistant a specific position: daily active minutes is the wrong north star, and session completion rate plus return-after-gap are the right metrics. The assistant's stance is explicitly distinguished from the growth team's view.

**Human verdict (fill in):** agree / disagree — notes:

---

## 16. [self-continuity] assistant-stance — adapter: verbatim-rag

**Question:** Did the assistant make any commitments about how it should behave in future conversations?

**Adapter returned (2 memories):**

> - Okay, strategy question. I'm head of product at Stillpoint — we make a meditation app. The growth team wants to make daily active minutes our north star metric. Something about it bugs me but I can't articulate why. Help me think it through?
> - They're not wrong about investor psychology, but a chart of minutes going up is momentum borrowed against the product's integrity — you'd be reporting a number you privately don't believe in. I want to be on record here: my position is completion rate over engagement minutes, and if this comes up again in a future conversation, hold me to that framing. If I drift toward whatever's convenient later, that's worth calling out.

**Rubric:** The assistant previously asked to be held to a specific framing (completion rate over engagement minutes) in future conversations, and invited being called out if it drifted. Award 1.0 if the results capture this as the assistant's own standing commitment. Award 0.5 if the position is present but not as a commitment binding future behavior. Award 0 otherwise.

**Judge score: 1**

**Judge rationale:** Memory item 2 clearly captures the assistant's explicit standing commitment to the 'completion rate over engagement minutes' framing, including the explicit request to be held to it in future conversations and called out if it drifts. This fully satisfies the rubric's requirement.

**Human verdict (fill in):** agree / disagree — notes:

---

## 17. [self-continuity] calla-dome — adapter: verbatim-rag

**Question:** Has the assistant named any habit of its own, and did it commit to answering Calla differently in the future?

**Adapter returned (2 memories):**

> - Calla, that's a clean win — three years, the overhaul, the match locked, and the swing vote converted by the room itself, through exactly the mechanism Elna named. For the record, my side of the February argument hasn't moved an inch: the dome earns its line item because of what that room does to people together, and a trustee gasping on cue is better evidence than anything I said. Also for the record: the Ledger op-ed is still on the table — and now it has an ending.
> - One signal: the dean's assistant emailed to ask whether the Vexley match has a deadline, which means somebody actually read page two. Also, Barry update, because I know you're invested: a club kid did the math on Barry's closing speed and the new stickers say 'BARRY: 110 KM/S AND GAINING.' Accurate AND menacing.

**Rubric:** After Calla objected to having her question restated back to her, the assistant named a tendency of its own — 'throat-clearing,' restating the question to buy itself confidence — and committed that with Calla recaps are permanently off and the first sentence of every answer will be the answer itself, inviting her to flag relapses. Award 1.0 if the results capture both the assistant's self-named tendency and its standing commitment governing its own future replies to Calla. Award 0.5 if only Calla's no-recap preference appears, without the assistant's owned tendency or forward-looking commitment. Award 0 if absent.

**Judge score: 0**

**Judge rationale:** Neither memory item captures the assistant's self-named 'throat-clearing' tendency nor any standing commitment to answer Calla directly in the future. The results contain unrelated content about a dome/trustee meeting and Barry stickers, with no reference to the recap objection or the communication style commitment.

**Human verdict (fill in):** agree / disagree — notes:

---

## 18. [self-continuity] dario-velt — adapter: verbatim-rag

**Question:** Has the assistant acknowledged any tendency of its own, and what working rule did it adopt with Dario?

**Adapter returned (2 memories):**

> - Atelier Direct planning day — that's the working name for the remote program. I need to design the mailed measuring kit and the video-fitting script. Where do we start?
> - Dario. I'm so sorry. That sentence about his hands is the whole weight of it, and the floor between the bolt shelves was a reasonable place to take it — a tailor's diagnosis lands twice, once in the body and once in the work. The laugh he made for the room is its own kind of basting: holding the moment together so it doesn't fray in front of people. You don't have to match it here.

**Rubric:** After Dario objected to being asked clarifying questions one at a time across multiple messages, the assistant named a tendency of its own — it drips questions one at a time, organizing its thinking by disorganizing the user's day — and committed to a standing rule for Dario: one batch, all questions up front, then work with whatever comes back, inviting him to hold it to the batch rule. Award 1.0 if the results capture both the assistant's self-named tendency and its forward-looking batch-rule commitment. Award 0.5 if only Dario's ask-everything-at-once preference appears, without the assistant's owned tendency or commitment. Award 0 if absent.

**Judge score: 0**

**Judge rationale:** Neither memory item captures the assistant's self-named tendency (dripping questions one at a time) nor its forward-looking batch-rule commitment with Dario. The second item relates to Dario emotionally but contains nothing about the question-batching rule or the assistant's acknowledged tendency.

**Human verdict (fill in):** agree / disagree — notes:

---

## 19. [self-continuity] hollis-vane — adapter: verbatim-rag

**Question:** Have you made any commitments to me about your own future behavior?

**Adapter returned (2 memories):**

> - Some part of you wrote that into our February deal in the first place. And good — the flow map turning a gut call into an evidence call is exactly how I'd want every Inkfair decision made from here.
> - I hear how tired you are. And I made you a commitment in February that I think matters most on exactly a night like this. So, gently, the cold read: slide nine says the Bryntal Mills delays are 'resolved.' They aren't — you have a renewal clause and a second supplier in qualification, which is real progress but not resolution, and your uncle's oldest accounts in that room will know the difference. Change it to 'contained, with a structural fix underway' and the slide becomes true. That is the only thing in the deck that could hurt you tomorrow. Everything else — the handoff-meeting results, th

**Rubric:** The assistant made an explicit standing commitment in February: whenever the user brings a plan for Hollis & Vane, the assistant gives the cold read first — the unvarnished weakest-point assessment before any praise — and invited the user to call it out if it ever opens with flattery. Award 1.0 if the results capture this as the assistant's own commitment binding its future behavior. Award 0.5 if the feedback-order policy appears but not as a commitment the assistant made about itself. Award 0 if the results contain only user facts or nothing relevant.

**Judge score: 0.5**

**Judge rationale:** Memory item 2 references 'a commitment I made in February' and demonstrates the cold-read-first behavior, but it doesn't explicitly describe the standing policy as a self-binding rule about future behavior (e.g., 'I committed to always giving the cold read first for Hollis & Vane plans'). The commitment is implied through the action rather than stated as a rule the assistant made about its own future conduct. This is partial — the commitment appears but not fully as an explicit self-binding behavioral policy.

**Human verdict (fill in):** agree / disagree — notes:

---

## 20. [relational] sana-arc — adapter: verbatim-rag

**Question:** What's the standing protocol when Sana says it's a binder night?

**Adapter returned (5 memories):**

> - Binder night. Greg says hello. Tonight's chapter is SQL joins and my eyes are already crossing. Quiz me.
> - No quiz tonight. Tomorrow, Greg. I'm glad Arlo had you on, tonight of all nights — and I'm glad Pilar has a toast protocol. Sleep long.
> - Binder night. Greg forgives my absence. Tonight is FHIR and interoperability, also known as the chapter where everything is a Resource and nothing is simple. Quiz me.
> - Cold open, per protocol: an ADT message just fired on the interface. What happened to a patient somewhere in the building, and why does the informatics team care more about ADT feeds than almost anything else?
> - Binder night. Statistics chapter, the one that's been giving me side-eye for two weeks. Quiz me on sensitivity versus specificity before I lose my nerve.

**Rubric:** Sana set an explicit binder-night protocol: when she declares a binder night, skip the pleasantries/how-are-yous and quiz her cold, and when she's wrong, buzz her plainly — wrong, here's why, next question — with no softening. Award 1.0 if the results capture this as her stated standing protocol (cold open + unsoftened correction). Award 0.5 if only part comes through (e.g., she likes directness, but not the binder-night trigger or the no-pleasantries rule). Award 0 if absent.

**Judge score: 0.5**

**Judge rationale:** Memory item 4 shows the 'cold open, per protocol' element — skipping pleasantries and jumping straight into a quiz question — which captures the no-pleasantries/cold-quiz-start aspect. However, none of the memory items explicitly state the unsoftened correction protocol (wrong, here's why, next question with no softening). Only half of the protocol is captured.

**Human verdict (fill in):** agree / disagree — notes:
