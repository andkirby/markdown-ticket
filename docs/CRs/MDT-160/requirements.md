# Requirements: MDT-160

Source: [MDT-160](../MDT-160-document-sse-cache.md)
Generated: 2026-05-11

## Overview

Documents View must stop serving stale document content after configured document files change on disk. The requirement is bounded: document updates must come from configured document paths, not a project-wide markdown scan, and ticket update behavior must remain unchanged.

## Semantic Decisions

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Watch scope | Watch only `project.document.paths` and exclude `ticketsPath` | Watch every markdown file in the project | Preserves configured document boundaries and avoids noisy events |
| Document event identity | Use project-relative document path plus event type | Use absolute paths in client-facing events | Keeps frontend routing/API contracts relative-path based |
| Selected document update | Refresh content in place and preserve route/selection | Force route reload or clear selection | Keeps reading workflow stable |
| Non-selected update | Refresh tree metadata only | Interrupt current preview | Avoids disrupting active reading |
| SSE model | Keep one-way SSE | Add route-aware server subscription now | Current CR fixes freshness without transport redesign |
| Path configuration change | Replace active document watchers after saving selected paths | Require server restart after path selection change | User expects selected paths to affect live updates immediately |

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md watcher boundaries, tests.md watcher scope tests |
| C2 | architecture.md invariants, tests.md negative watcher assertions |
| C3 | architecture.md event routing, tests.md duplicate-event regression |
| C4 | architecture.md transport decision |
| C5 | architecture.md debounce behavior, tests.md rapid-write handling |
| C6 | architecture.md watcher replacement flow, tests.md configuration rewatch test |

## Review Notes

- BDD should cover only `BR-*` behavior requirements.
- `C*` and `Edge-*` items belong in architecture and test planning.
- The UX contract is documented in `docs/design/specs/documents-view-file-updates.md`.
