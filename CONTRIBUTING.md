# Contributing to RECALL Bench

## Proposing a new dimension

A dimension is a claim that some property of human memory is functional and
measurable. To propose one, open an issue or PR containing all three:

1. **The phenomenon, named.** A specific finding from the human-memory
   literature with a citation (the original study or a canonical review). "It
   would be nice if memory did X" is not a phenomenon.
2. **The functional argument.** Why this property is a *feature* for an AI
   memory system, not a human limitation to engineer away.
3. **A falsifiable scenario shape.** A concrete description of sessions +
   queries where a system with the property passes and a system without it
   fails — including how a store-everything verbatim system fares (if it
   passes trivially, the shape tests retrieval, not memory).

State which axis it belongs to (world / self) and whether Tier 1 keywords can
measure it or it needs a Tier 2 rubric.

## Contributing scenarios

Read [scenarios/AUTHORING.md](scenarios/AUTHORING.md) first — it is the
standard every scenario in `v1` was red-teamed against, and it encodes the
mechanics that earlier rounds got wrong (accidental-abstention lures, user
echoes of assistant anchors, unfair forget traps).

Workflow:

1. Author your scenario in a working directory, e.g. `scenarios/dev/`.
2. Validate mechanically:
   ```bash
   bun src/lint.ts --scenarios scenarios/dev
   bun src/cli.ts --scenarios scenarios/dev --adapter naive --verbose
   bun src/cli.ts --scenarios scenarios/dev --adapter verbatim-rag --verbose
   ```
3. Check the five-point bar (AUTHORING.md): not aced by a verbatim baseline;
   genuinely derivable; distinctive anchors; natural dialogue with noise;
   timestamps that exercise the temporal claim. Plus: fully fictional people
   and companies, always.
4. Open a PR. **Target `scenarios/v2/`** — `v1` is frozen so published scores
   stay comparable. Typo-level fixes to `v1` are accepted only when they
   cannot affect scores.

## Contributing adapters

Reference adapters live in `src/adapters/`. An adapter PR should:

- Implement the three methods (`processConversation`, `query`, `reset`) per
  [SPEC.md](SPEC.md) §3, plus optional `respond()` for Tier 3.
- Keep the core benchmark keyless: if your adapter needs an API key or
  service, it must fail at construction with a clear message, not at import,
  and the rest of the CLI must keep working without it.
- Not consult the wall clock for memory decisions — use the virtual
  timestamps the harness provides.
- Add itself to the adapter switch in `src/cli.ts` and to the README's
  adapter list.

If your memory system lives elsewhere, you don't need a PR at all: depend on
this repo, implement `MemoryAdapter`, and call `runBenchmark()` — see the
README's "Benchmark your own memory system."

## Harness changes

Scoring semantics are spec'd in SPEC.md; the code follows the spec. PRs that
change scoring must update SPEC.md in the same change and explain the
anti-gaming analysis (what degenerate strategy does the change enable or
close?). `bun run typecheck && bun test` must pass; CI runs both plus a full
Tier 1 benchmark.
