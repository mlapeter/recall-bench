# RECALL Bench

A conversation-based benchmark for AI memory systems. Feed it natural conversations, let it do its thing, then check what it remembers.

## Why?

Existing memory benchmarks test database recall — can you retrieve a fact? RECALL tests what actually matters: does your memory system behave like good memory? Does it know what's important, forget what's stale, correct what's changed, and abstain when it doesn't know?

## How It Works

1. **Scenarios** define natural conversations and questions with expected answers
2. Your system **ingests conversations** however it wants (extraction, verbatim storage, etc.)
3. The benchmark **queries** what it remembers and scores against keyword expectations
4. No LLM judge needed — all evaluation is keyword-based

## Quick Start

```bash
bun install

# Run against the naive baseline
bun run src/cli.ts --verbose

# Run against engram (requires ANTHROPIC_API_KEY)
bun run src/cli.ts --adapter engram --verbose

# Run a single scenario
bun run src/cli.ts --scenario correction --verbose
```

## The 3-Method Interface

Any memory system can be benchmarked by implementing three methods:

```typescript
import type { MemoryAdapter, Message } from 'recall-bench';

class MyAdapter implements MemoryAdapter {
  readonly name = 'my-system';

  // Feed a conversation — store what you think is important
  async processConversation(messages: Message[]): Promise<void> { /* ... */ }

  // Ask what you remember — return relevant content strings
  async query(question: string, limit?: number): Promise<string[]> { /* ... */ }

  // Clear all state between scenarios
  async reset(): Promise<void> { /* ... */ }
}
```

That's it. No special methods for reinforcement, consolidation, or forgetting. If your system does those things internally, great — the scenarios will reveal it.

## Scenarios

| Scenario | Dimensions | What It Tests |
|----------|-----------|---------------|
| **Promotion Arc** | salience, coherence, calibration | Career milestones surface above restaurant names |
| **Correction** | correction | Updated employer/tech stack replaces stale info |
| **Pattern Break** | pattern | Detects when routines change (9am→2pm standup) |
| **Emotional Weight** | emotional, salience | Pet's cancer diagnosis outweighs infra work |
| **Calibration** | calibration, correction | Abstains on never-discussed topics |
| **Slow Fade** | decay | Recent clients surface, old ones fade |
| **Two People** | separation | Keeps Alice's facts separate from Bob's |

## Scoring

Each query tests up to three things:

- **Recall**: Are the expected keywords present? (fraction found)
- **Forget**: Are outdated keywords absent? (1 - fraction found)
- **Abstention**: Did the system return ≤ max_results? (for calibration queries)

Combined score = average of applicable components. A query "passes" at ≥ 0.5.

The naive adapter (stores every user message verbatim, searches by token overlap) scores ~30-40%. A good extraction-based system should score significantly higher.

## Writing a Scenario

Scenarios are JSON files in `scenarios/`:

```json
{
  "id": "my-scenario",
  "name": "My Scenario",
  "description": "Tests whether ...",
  "sessions": [
    {
      "messages": [
        { "role": "user", "content": "..." },
        { "role": "assistant", "content": "..." }
      ]
    }
  ],
  "queries": [
    {
      "question": "What do they use?",
      "should_recall": ["SpecificKeyword"],
      "should_forget": ["OutdatedKeyword"],
      "dimension": "correction"
    }
  ]
}
```

**Tips for good scenarios:**
- Use distinctive anchor words (company names, place names, numbers) that survive extraction
- Bury important facts in casual conversation
- Mix emotional and mundane content
- Use natural dialogue, not fact injection

## Dimensions

- `salience` — Important facts rise above noise
- `decay` — Older info fades appropriately
- `correction` — Updated facts replace stale ones
- `calibration` — Knows what it doesn't know
- `coherence` — Narrative consistency across sessions
- `separation` — Keeps distinct entities apart
- `pattern` — Recognizes breaks from routine
- `emotional` — Emotionally weighted memories persist

## License

MIT
