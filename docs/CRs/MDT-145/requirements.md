# Requirements: MDT-145

**Source**: [MDT-145](../MDT-145-refine-shared-layer-into-a-stable-service-framewor.md)
**Generated**: 2026-03-24

## Overview

This ticket defines the consumer-facing contract for turning `shared/` into a stable service framework for CLI, MCP, and server entrypoints. The requirement set stays intentionally narrow: it does not invent new end-user features, and for ticket writes in this increment it locks only the shared attr-mutation semantics and result contract that downstream entrypoints must rely on consistently.

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Shared project detection | Current-project detection is a shared utility that searches parent directories to filesystem root and returns the nearest config result or an explicit no-project outcome | Keep detection private to MCP startup or bounded to a shallow fixed depth | `shared/` must own one cwd-to-project rule for all consumers |
| Shared project lookup | Exact identifier lookup stays exact, while project-code lookup is case-insensitive | Treat all lookup tokens as case-sensitive or let each consumer normalize independently | CLI and MCP need one lookup truth at the shared boundary |
| Attr mutation model | Shared attr updates are operation-aware: replace for all mutable fields, add/remove only for relation fields | Keep overwrite-only shared semantics and let CLI simulate add/remove outside shared | Add/remove behavior is now product-level contract, not a presentation trick |
| Write return contract | Shared ticket attr-mutation flows return structured result objects with target, normalized inputs, path, and changed fields | Return bare booleans and force each consumer to re-read or infer what changed | LLM-facing and automation-facing consumers need stable machine-readable outcomes for the refactored write flow |
| Shared error/logging policy | Shared services surface typed errors or typed results and keep terminal output under consumer control | Keep CLI-specific error classes and direct console output inside shared success and validation paths | `shared/` is a framework boundary, not a terminal adapter |
| Contract ownership boundary | Persisted entity shapes remain in `domain-contracts`; service request/result contracts live in `shared` | Put service-layer interfaces in `domain-contracts` or let each consumer define its own operation result types | Canonical data shape ownership and service-contract ownership are separate concerns |

## Constraint Carryover

- `C1` and `C4` together lock the package boundary: consumer-neutral service contracts belong in `shared`, while canonical persisted entity schemas stay in `domain-contracts`.
- `C2` carries the attr operator rule forward into architecture and tests: only `relatedTickets`, `dependsOn`, and `blocks` may use add/remove semantics.
- `C3` is structural, not stylistic. Existing imports of CLI-specific errors from shared code are architectural debt to remove, not acceptable long-term coupling.
- `C5` keeps shared write APIs safe for automation and LLM use by treating user-supplied text as literal data.

## Review Notes

- This ticket is architecture-heavy, but it still needs behavioral closure because project detection, lookup normalization, attr mutation semantics, and attr write-result shape are observable to external consumers.
- The current shared implementation already exposes the core project and ticket primitives. MDT-145 is about making those primitives systematic enough that downstream consumers do not need bespoke policy adapters.
- The immediate hotspots are already visible in the codebase: MCP-private project detection, case-sensitive project lookup, overwrite-only attr updates, boolean write results, and CLI-specific error/logging leakage into `shared/`.
- `/mdt:architecture` should treat the new shared consumer services as the primary redesign surface, not as thin wrappers over unchanged behavior.
- CLI command wiring remains a downstream adoption concern under `MDT-143`, not an implementation surface for this ticket.

---
*Canonical requirements and route summaries: [requirements.trace.md](./requirements.trace.md)*
*Rendered by /mdt:requirements via spec-trace*
