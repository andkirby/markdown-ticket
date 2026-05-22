---
code: MDT-175
status: In Progress
dateCreated: 2026-05-22T11:59:02.098Z
type: Feature Enhancement
priority: Medium
---

# Set browser page titles

## 1. Description

### Requirements Scope
`full`

### Problem
- Browser history currently shows the static title `CR Task Board` for every route or selected page.
- Users cannot identify which ticket, document, board state, or project entry a history item represents after navigating away.
- The application misses a low-friction way to make tabs, browser history, and recent pages reflect the active work context.

### Affected Areas
- `src` - page and view state that determines the active user-facing context.
- `public` - default document title fallback.
- `tests` - browser or unit coverage for title behavior.

### Scope
- In scope: define deterministic page title behavior for primary user-facing pages and active content states.
- In scope: keep a stable application fallback when no more specific page context is available.
- In scope: ensure browser tabs and browser visit history receive meaningful title updates.
- Out of scope: changing routing structure unless architecture determines it is necessary.
- Out of scope: changing ticket, document, or project data models.
- Out of scope: adding analytics or external history tracking.

## 2. Desired Outcome

### Success Conditions
- Board root title is `{PROJECT_CODE} Board`.
- List root title is `{PROJECT_CODE} Listing`.
- Documents root title is `{PROJECT_CODE} Documents`.
- Main ticket title is `{TICKET_CODE} - {ticket H1/title}`.
- Ticket subdocument or special ticket tab title appends the active label, for example `{TICKET_CODE} - {ticket H1/title} - Architecture`.
- Project document title is `{PROJECT_CODE} - {document H1/title/name}`.

### Constraints
- Must use project code for project/document areas and ticket code for ticket areas.
- Must not require backend persistence or schema changes.
- Must avoid stale titles after navigation, deselection, loading failure, or project switching.
- Must keep titles concise enough to be useful in browser tabs and history.

### Non-Goals
- Not redesigning navigation.
- Not changing URL patterns as a goal of this CR.
- Not changing how tickets or documents are named.
- Not adding per-user title customization.
- Not adding a title-format Settings item in this CR.

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Architecture | Where should page title ownership live? | Must fit existing frontend state flow. |
| UX | What title source should each surface use? | Use project code for project/document areas and ticket code for ticket areas. |
| Integration | Which views need explicit titles in the first implementation? | Must cover primary ticket, document, and app-level surfaces. |
| Testing | Should verification be unit-level, browser-level, or both? | Must prove the DOM document title changes during navigation. |

### Known Constraints
- Must use existing frontend application state as the title source.
- Must use deterministic title formats with project code for project/document areas and ticket code for ticket areas.
- Must not introduce title-format settings in this CR.
- Must not introduce backend, MCP, CLI, or shared model changes unless architecture proves they are required.

### Decisions Deferred
- Implementation approach is determined by `/mdt:architecture`.
- Task breakdown is determined by `/mdt:tasks`.

## 4. Acceptance Criteria

### Functional
- [ ] Browser title is not always the static `CR Task Board` after navigating through primary app contexts.
- [ ] Board context sets title to `{PROJECT_CODE} Board`.
- [ ] List context sets title to `{PROJECT_CODE} Listing`.
- [ ] Documents root context sets title to `{PROJECT_CODE} Documents`.
- [ ] Main ticket context sets title to `{TICKET_CODE} - {ticket H1/title}`.
- [ ] Ticket subdocument or special subtab context appends the active label after the main ticket title.
- [ ] Project document context sets title to `{PROJECT_CODE} - {document H1/title/name}`.
- [ ] No title-format Settings item is added in this CR.
- [ ] Settings or modal-only contexts do not leave the title in a misleading stale content state after close.
- [ ] Loading, missing, or error states fall back to a truthful app-level title.
- [ ] Project switching updates the title to the new project context.
- [ ] Closing a ticket or document restores the appropriate parent view title.

### Non-Functional
- [ ] Title updates do not require backend persistence.
- [ ] Title updates do not add visible UI clutter.
- [ ] Title values remain concise for browser tab and history display.
- [ ] Existing navigation, ticket selection, and document selection behavior remain unchanged.

### Edge Cases
- [ ] A deleted or unavailable ticket does not leave its old title active.
- [ ] A deleted or unavailable document does not leave its old title active.
- [ ] Rapid navigation between tickets or documents ends with the final active context in `document.title`.
- [ ] Empty or malformed names fall back to a stable app-level title.

## 5. Verification

### How to Verify Success
- Manual: navigate board, list, ticket viewer, document viewer, settings, and project switching while observing the browser tab title.
- Automated: test that title state changes when active ticket, document, or view context changes.
- Automated: test fallback behavior when content is closed, missing, or unavailable.
