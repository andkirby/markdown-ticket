# Requirements: MDT-145

**Source**: [MDT-145](../MDT-145-refine-shared-layer-into-a-stable-service-framewor.md)
**Generated**: 2026-03-24

## Overview

This ticket defines the consumer-facing contract for turning `shared/` into a stable service framework for CLI, MCP, and server entrypoints. The requirement set stays architecture-led, but it now locks a clearer capability split: project list and project updates on the project side, ticket list, ticket attribute updates, ticket document updates, and ticket subdocument listing on the ticket side.

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Shared project detection | Current-project detection is a shared utility that searches parent directories to filesystem root and returns the nearest config result or an explicit no-project outcome | Keep detection private to MCP startup or bounded to a shallow fixed depth | `shared/` must own one cwd-to-project rule for all consumers |
| Shared project lookup | Exact identifier lookup stays exact, while project-code lookup is case-insensitive | Treat all lookup tokens as case-sensitive or let each consumer normalize independently | CLI and MCP need one lookup truth at the shared boundary |
| Project service surface | Project list and project attribute updates are distinct shared capabilities even if they remain under one `ProjectService` wording | Keep one broad project service with no explicit capability boundaries | Query and write responsibilities must stay visible to both humans and LLMs |
| Ticket service surface | Ticket list, ticket attribute updates, ticket document updates, and ticket subdocument listing are distinct shared capabilities even if they remain under one `TicketService` wording | Keep one broad ticket service where query, attr, document, and subdocument behavior blur together | Capability separation is the main systematic cleanup this ticket is trying to achieve |
| Attr mutation model | Shared ticket attr updates are operation-aware: replace for all mutable attr fields, add/remove only for relation fields | Keep overwrite-only shared semantics and let CLI simulate add/remove outside shared | Add/remove behavior is now product-level contract, not a presentation trick |
| Title ownership | Ticket `title` remains part of the ticket entity, but the markdown H1 remains the authoritative stored title source and therefore title changes belong to document-update flow, not attribute-update flow | Treat `title` as just another mutable attr or move title entirely out of the ticket entity | This preserves MDT-064 while keeping the entity model coherent |
| Write return contract | Shared project- and ticket-update flows use a common structured write-result family with target, normalized inputs, path, and changed fields | Return bare booleans or invent a separate bespoke write-result type for each capability | LLM-facing and automation-facing consumers need stable machine-readable outcomes without a large result taxonomy |
| Shared error/logging policy | Shared services surface typed errors or typed results and keep terminal output under consumer control | Keep CLI-specific error classes and direct console output inside shared success and validation paths | `shared/` is a framework boundary, not a terminal adapter |
| Contract ownership boundary | Persisted entity and input shapes remain in `domain-contracts`; service request contracts, shared read/write result families, and service interfaces live in `shared` | Put service-layer interfaces in `domain-contracts` or let each consumer define its own operation result types | Canonical data shape ownership and service-contract ownership are separate concerns |

## Constraint Carryover

- `C1` and `C4` together lock the package boundary: consumer-neutral service contracts and service interfaces belong in `shared`, while canonical entity and input schemas stay in `domain-contracts`.
- `C2` carries the attr operator rule forward into architecture and tests: only `relatedTickets`, `dependsOn`, and `blocks` may use add/remove semantics, and title/content remain outside attr-update flow.
- `C3` is structural, not stylistic. Existing imports of CLI-specific errors from shared code are architectural debt to remove, not acceptable long-term coupling.
- `C5` keeps shared query and write APIs safe for automation and LLM use by treating user-supplied text as literal data.

## Review Notes

- This ticket is architecture-heavy, but it still needs behavioral closure because project detection, project lookup, project list/update boundaries, ticket list filtering, ticket attr semantics, ticket document semantics, subdocument listing, and structured write results are observable to external consumers.
- The current shared implementation already exposes the core project and ticket primitives. MDT-145 is about making those primitives systematic enough that downstream consumers do not need bespoke policy adapters and do not mistake one green method for a complete entity service.
- The immediate hotspots are already visible in the codebase: MCP-private project detection, case-sensitive project lookup, ticket queries and writes mixed under broad service names, overwrite-only attr updates, boolean write results, and CLI-specific error/logging leakage into `shared/`.
- `/mdt:architecture` should treat service-capability separation as the primary redesign surface, not as thin wrappers over unchanged behavior.
- The target shared contract should stay systematic but lean: a small set of request types, one read-result family, one write-result family, and one shared error model are preferred over a bespoke result type for every capability.
- CLI command wiring remains a downstream adoption concern under `MDT-143`, not an implementation surface for this ticket.

---
*Canonical requirements and route summaries: [requirements.trace.md](./requirements.trace.md)*
*Rendered by /mdt:requirements via spec-trace*
