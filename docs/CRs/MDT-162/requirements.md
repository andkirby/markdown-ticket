# Requirements: MDT-162

**Source**: [MDT-162](../MDT-162-document-tree-navigation.md)
**Generated**: 2026-05-11

## Overview

- Documents View navigation must reduce large-tree overload without replacing the existing two-pane reader.
- The sidebar remains a navigation surface: collapsed roots, recent documents, and tree filtering.
- `docs/CRs/` remains ticket territory and is excluded from document navigation even when `docs/` is configured as a document root.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md module boundaries, tests.md backend exclusion coverage, tasks.md DocumentService task |
| C2 | architecture.md accessibility invariants, tests.md E2E control coverage, tasks.md DocumentsLayout task |
| C3 | architecture.md filter boundary, tests.md filter assertions, tasks.md DocumentsLayout task |
| Edge-1 | architecture.md shortcut reconciliation, tests.md invalid shortcut handling, tasks.md navigation config task |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Default tree state | Root folders render collapsed; selected document ancestors expand | Expand every folder on load | Large trees become unreadable when fully expanded |
| Ticket area | `docs/CRs/` is excluded from Documents View navigation | Show ticket markdown as general documents | Tickets already have Board and Ticket Viewer ownership |
| Sidebar filter | Filter file name, title, and project-relative path | Search full document contents | Content search is a separate feature and backend scope |
| Recent documents | Project-scoped file shortcuts capped at five | Global history or folder history | Keeps sidebar predictable and small |
| Recent collapse | Header toggles recent shortcut visibility | Hide the whole tree or change selection | Collapse only reduces sidebar noise |
| Recent row display | Same title/filename row treatment as tree file rows | Filename-only shortcuts | Recent must feel like the same document object, not a separate list type |
| Sidebar scrolling | Tree scrolls independently below fixed Recent | Recent scrolls away with tree | Keeps resume shortcuts stable while browsing long trees |

## Configuration

- Existing `.mdt-config.toml` document roots remain valid.
- Broad roots such as `docs` are allowed, but ticket-area descendants are filtered from document navigation.
- Navigation preferences are project-scoped and local to the browser.

## Review Notes

- Canonical requirements are in `requirements.trace.md`.
- BDD must cover only `BR-*` behavior requirements.
- Constraints and edge cases close through architecture obligations and tests, not BDD scenario coverage.
