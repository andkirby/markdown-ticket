# BDD: MDT-150

## Overview

SmartLink document URL generation — 5 scenarios across 2 journeys covering document reference resolution and anchor preservation.

**Note**: Original `backend_blocks_path_traversal` and `backend_returns_missing_file_error` scenarios (BR-5 in the original numbering) were removed because backend validation is covered by MDT-151 (shipped). MDT-150 does not test backend path validation. **BR-5 was re-added 2026-07-21 with a different meaning** — see scenarios below.

**UAT refined**: 2026-04-29 — scenarios updated to reflect simplified resolution model (useParams instead of sourcePath threading).
**UAT refined**: 2026-07-21 — added `documents_view_relative_reference` scenario for the documents-view resolution gap.

## Acceptance Strategy

- **Framework**: Playwright (browser E2E)
- **Command**: `bun run test:e2e`
- **Filter**: tag with `@MDT-150`

## Journeys

### 1. Document Reference Resolution (BR-1, BR-2, BR-5)

Covers the core routing logic: the preprocessor resolves `.md` references using the source document's path as context.

| Scenario | Covers |
|---|---|
| ticket_subdoc_reference | BR-1 |
| project_doc_reference | BR-1 |
| sibling_ticket_reference | BR-2 |
| documents_view_relative_reference | BR-1, BR-5 (added 2026-07-21) |

### 2. Navigation (BR-3, BR-4)

Covers anchor preservation and path-style documents routing.

| Scenario | Covers |
|---|---|
| anchor_fragment_preserved | BR-3 |
| documents_path_style_route | BR-4 |

## Resolution Table (reference for tests)

| Ref type | Example | Resolves to |
|---|---|---|
| Bare filename | `architecture.md` | Current ticket subdoc |
| Bare filename + anchor | `architecture.md#top` | Current ticket subdoc + scroll |
| Ticket-key filename | `MDT-151.md` | That ticket |
| Ticket-key filename + anchor | `MDT-151.md#overview` | That ticket + scroll |
| Ticket key | `MDT-151` | That ticket |
| Ticket-prefixed filename | `MDT-150-smartlink-doc-urls.md` | That ticket |
| Relative with `..` (ticket view) | `../../README.md` | Path math → documents view |
| Relative bare filename (documents view) | `relative.md` in `docs/architecture/aaaa.md` | `/prj/:code/documents/docs/architecture/relative.md` (BR-5) |
| Relative with `..` (documents view) | `../sibling.md` in `docs/architecture/aaaa.md` | `/prj/:code/documents/docs/sibling.md` (BR-5) |

## Execution Notes

- Scenarios are architecture-agnostic — they describe user-visible behavior only
- Regression scenarios for ticket links (C1) and external links (C2) belong in `/mdt:tests`
- Preprocessor/linkProcessor regression (C5) is a unit-level concern, not E2E
