# RECALL

**Retention · Encoding · Consolidation · Adaptation · Loss · Learning**

A benchmark for AI memory systems that rewards forgetting as much as remembering.

## Why RECALL?

Existing memory benchmarks (LoCoMo, LongMemEval, ConvoMem) test one thing: can you retrieve a fact? They treat memory as a database lookup problem and penalize any information loss.

But biological memory isn't a database. It's a dynamic system that actively forgets, strengthens through use, consolidates patterns from episodes, and adapts to contradictions. A memory system that remembers everything forever isn't better — it's broken.

RECALL tests what no other benchmark tests: **memory dynamics**.

## The Six Axes

| Axis | Tests | What It Measures |
|------|-------|------------------|
| **R** Retention | Hebbian strengthening, decay, reconsolidation | Do memories get stronger through use? |
| **E** Encoding | Salience discrimination, fuzzy matching, tags | Does the system encode context and importance? |
| **C** Consolidation | Redundancy merge, pattern extraction | Can it transform episodes into knowledge? |
| **A** Adaptation | Contradictions, interference, context-switching | Does it handle conflicting or overlapping info? |
| **L** Loss | Graceful forgetting, load handling, explicit forget | Does it appropriately let go of what's not needed? |
| **L** Learning | Cross-domain transfer, relationships, metacognition | Can it connect knowledge and know itself? |

## Scoring Philosophy

Traditional benchmarks: "Did you remember X? No? -1 point."

RECALL: "You remembered X from 6 months ago that was accessed once and superseded twice? That's **worse** than forgetting it."

The benchmark rewards:
- Memories that strengthen through use (Hebbian learning)
- Graceful decay of unused information
- Consolidation of redundant memories into patterns
- Proper handling of contradictory information
- Maintaining retrieval quality under load

## Quick Start

```bash
# Install
bun install

# Run benchmark against the naive baseline
bun run src/cli.ts --verbose

# Run a specific category
bun run src/cli.ts --category retention --verbose
```

## Writing an Adapter

To benchmark your own memory system, implement the `MemoryAdapter` interface:

```typescript
import type { MemoryAdapter } from 'recall-bench';

class MyAdapter implements MemoryAdapter {
  readonly name = 'my-system';

  async store(input) { /* ... */ }
  async recall(query, limit?) { /* ... */ }
  async reset() { /* ... */ }

  // Optional but recommended:
  async reinforce(id) { /* ... */ }
  async update(id, content) { /* ... */ }
  async forget(id) { /* ... */ }
  async consolidate() { /* ... */ }
  async getAll() { /* ... */ }
}
```

Required methods: `store`, `recall`, `reset`

Optional methods unlock more tests:
- `reinforce` → Hebbian strengthening tests
- `update` → Reconsolidation tests
- `forget` → Explicit forget tests
- `consolidate` → Consolidation tests
- `getAll` → Deeper inspection of memory state

## Test Categories

### R — Retention (3 tests)
- **Hebbian strengthening**: Accessed memories rank higher
- **Strength through use**: Frequently used memories persist
- **Reconsolidation**: Updated memories return new content

### E — Encoding (3 tests)
- **Tag-based retrieval**: Memories found by category
- **Salience discrimination**: Important memories surface first
- **Fuzzy encoding**: Rephrased queries find relevant memories

### C — Consolidation (2 tests)
- **Redundancy merge**: Duplicate memories get merged
- **Pattern extraction**: Episodes generalize into knowledge

### A — Adaptation (3 tests)
- **Contradiction handling**: New info supersedes old
- **Interference resolution**: Similar memories don't contaminate
- **Context-dependent retrieval**: Context affects what surfaces

### L — Loss (3 tests)
- **Graceful forgetting**: Outdated info doesn't dominate
- **Memory under load**: Quality maintained at scale
- **Explicit forget**: Deleted memories stay deleted

### L — Learning (3 tests)
- **Cross-domain transfer**: Related knowledge connects
- **Relationship memory**: Relational context preserved
- **Metacognition**: Self-referential knowledge retrievable

## Example Output

```
╔══════════════════════════════════════════════════════════════╗
║                    RECALL Benchmark Results                 ║
╚══════════════════════════════════════════════════════════════╝

  System:  naive-baseline
  Score:   48.2%
  Tests:   14 run, 7 passed

  ┌────────────────┬───────┬─────────────────┐
  │ Category       │ Score │ Tests           │
  ├────────────────┼───────┼─────────────────┤
  │ R  Retention   │  37%  │ 1/3 passed      │
  │ E  Encoding    │  60%  │ 2/3 passed      │
  │ C  Consolidation│  0%  │ 0/2 passed      │
  │ A  Adaptation  │  63%  │ 2/3 passed      │
  │ L  Loss        │  70%  │ 2/3 passed      │
  │ L  Learning    │  60%  │ 2/3 passed      │
  └────────────────┴───────┴─────────────────┘
```

## License

MIT
