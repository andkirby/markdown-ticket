# Requirements: MDT-175

> Canonical requirements projection: [requirements.trace.md](./requirements.trace.md)

## Overview

MDT-175 requires browser tab and visit-history titles to reflect the active page context instead of always showing the static `CR Task Board` title.

## Scope

- Generate deterministic titles for project board, project listing, documents root, active ticket, ticket subdocument/subtab, and active project document contexts.
- Use project code for project/document areas and ticket code for ticket areas.
- Avoid stale title state after close, deletion, loading, failed context data, missing content, project switching, or rapid navigation.
- Keep the change frontend-only.

## Non-Ambiguity Table

| Concept | Decision |
|---------|----------|
| Root project views | Use `{PROJECT_CODE} Board`, `{PROJECT_CODE} Listing`, and `{PROJECT_CODE} Documents`. |
| Main ticket title | Use `{TICKET_CODE} - {ticket H1/title}`. |
| Ticket subcontext title | Append the active subdocument or special subtab label, such as `Architecture` or `Trace Graph`. |
| Project document title | Use `{PROJECT_CODE} - {document H1/title/name}`. |
| Modal behavior | Modal-only contexts must not leave unrelated ticket or document titles active after close. |
| Settings | No user-configurable title-format setting is added in this CR. |
| Timing | All requirements are `Now` for this ticket. |

## Constraint Carryover

- `C1`: frontend-only title system; no backend, MCP, CLI, or schema changes.
- `C2`: deterministic formats with project code for project/document areas and ticket code for ticket areas; no user-configurable title-format setting.
- `C3`: normalize whitespace, omit empty title parts, and use dash-separated title parts without adding a trailing app suffix.
- `C4`: no navigation, ticket selection, or document selection behavior changes.
- `C5`: no visible UI elements, layout changes, or on-screen title clutter.

## Edge Carryover

- `Edge-1`: missing or deleted ticket clears stale ticket title.
- `Edge-2`: missing or deleted document clears stale document title.
- `Edge-3`: rapid navigation ends with the final active context title.
- `Edge-4`: empty or malformed title source falls back to app-level title.
- `Edge-5`: loading or failed active context data falls back to the nearest truthful parent or app-level title.

## Validation Summary

- Scope coverage:
  - Project board/list/documents root view: covered by `BR-1.1`.
  - Ticket context: covered by `BR-1.2`.
  - Document context: covered by `BR-1.3`.
  - Ticket subdocument or special subtab context: covered by `BR-1.7`.
  - Close/restore behavior: covered by `BR-1.4`.
  - Modal-only stale-title prevention: covered by `BR-1.5`.
  - Project switching: covered by `BR-1.6`.
  - Loading, missing, and error fallback: covered by `Edge-1`, `Edge-2`, `Edge-4`, and `Edge-5`.
  - No visible UI clutter: covered by `C5`.
- Quality:
  - Each behavior requirement has one SHALL.
  - Constraints and edge cases route to tests, not BDD.
  - No backend or model behavior is introduced.
  - No open clarification is required before architecture.

## Verify

```bash
spec-trace validate MDT-175 --stage requirements
spec-trace render requirements MDT-175
```
