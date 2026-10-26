# Assessment: MDT-262

## Verdict

**Recommendation**: Option 2 — Redesign Inline.

## Feature Pressure

The approved 2026-10-26 UAT expands seven native MDT tools to all eleven non-cloud operations and enables the eight operational spec-trace tools in BB. Existing shared definitions and host adapters remain the extension points.

## Fitness Summary

| Dimension | Verdict | Why |
|---|---|---|
| Structural Fit | Healthy | Shared tables already separate capabilities from host mechanics. |
| Extension Fit | Concerning | BB only registers MDT; stdin is currently ignored; rename returns text. |
| Dependency Fit | Healthy | Existing Bun, Node, Zod and CLI binaries suffice. |
| Verification Fit | Concerning | Old mapping tests accept an incorrect spec-trace delete order; real CLI journeys are needed. |
| Redesign Scope | Healthy | Bounded adapter changes, no business-service or cloud edits. |

## Mismatch Points

Generalize the BB subprocess boundary for two binaries and optional stdin while preserving bounded output, cancellation, and workspace host validation. Preserve per-command output contracts: rename is text; other MDT commands request JSON. Cloud stays CLI-only.

## Dependency and Tooling Pressure

No new packages. Resolve spec-trace from SPEC_TRACE_BIN, plugin setting or host PATH. Use Bun 1.4.2 at /opt/homebrew/bin/bun for plugin checks; root PATH Bun 1.3.14 rejects the existing empty test preload configuration.

## Verification Gaps

Baseline: 45 plugin tests, BB TypeScript check and BB build passed. New registration, argument-boundary, stdin, binary absence, and real CLI lifecycle checks must precede implementation. DSH offline adapter tests are in scope; DSH fresh-host live testing is separate, explicitly unverified.
