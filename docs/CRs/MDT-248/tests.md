# Tests: MDT-248

## Current verification intent — UAT r12

Canonical coverage: [tests.trace.md](tests.trace.md). Target UX: [ux-design.md](ux-design.md). This is a test plan, not a report that the new behaviors pass.

### Project isolation — first blocking slice

- Project A: visit two references, scroll each, step Back, then switch to B. B must have its own history/index/titles/scroll, or no session if never used.
- A -> B -> A restores A's session without losing B's. Close/reopen restores only the matching project, hidden with its reveal affordance.
- Same relative filename in both projects must render distinct content. Cache, fetch URL, hand-off, copy and link source context must all use the document's owner.
- Delay A's response until B is active; A must neither render in B nor overwrite B's persistence, title or scroll. Repeat with a cache hit and with a failed request.
- Seed valid legacy project+ticket snapshots: first r12 use must ignore all of them, initialize new-format histories empty, and never migrate/reinterpret their paths. Visit 51 distinct references in one project: exactly 50 remain, the oldest is evicted and index/scroll/title keys remain valid; another project's history is unchanged.
- Existing per-ticket store tests alone do not establish isolation of live reader state.

### Navigation and header

- Filter nested document paths; Main remains reachable; keyboard/touch actions and no-results state work.
- Document name navigates its pane; Open beside leaves main intact, replaces right and extends only its history. Verify same-doc dedupe.
- Main Back/Forward restores visited tickets/subdocs/scroll independently within one viewer-open lifetime. Close/reopen clears main Back/Forward; reference history still restores hidden. Reference Back/Forward and jump menus remain independent.
- Same-ticket, different-ticket and repository provenance remains correct after main navigation and promotion. Copy actual main/subdoc paths on both sides.
- Details toggle: click/Enter/Space; tooltip on focus; no hover dropdown; expanded state survives tickets/projects/reopen and unavailable storage degrades safely. Repository mode does not reset the preference.
- Fullscreen/Restore preserves both document locations, histories, scroll and split preference. Header/toolbars remain pinned; narrow overlay and picker sheet preserve all state.

### Promotion and dedicated reader route

- Close main with same-ticket and other-ticket references. The selected file fills the reader; title, key-template priority, metadata and Trace availability all use the new owner.
- Promote a repository reference. Keep title/path/copy/hand-off; no stale ticket identity, badges or Trace.
- Promotion pushes /prj/{sourceProject}/read?doc={encodedProjectRelativePath}; main Back and browser Back restore the prior ticket URL without double-pushing. Existing /documents?file= URLs must still open the workspace. Fresh/reloaded /read links open document mode with no active reference and disabled main Back. Close uses replace to the source Documents-view URL; missing/invalid/denied targets fail without stale ticket chrome.
- Main Back returns to the previous main location. No duplicate hidden reference/pill after promotion; other projects remain unchanged.
- Failed/removed target and stale responses cannot pair a new header with old content or old metadata. Surviving scroll and focus are preserved.

### Baseline regressions retained

Open/follow document links, hide/reveal/discard, source-based link normalization, flagged missing links, sandboxed HTML, density/theme parity, error containment, toast stability, split keyboard/drag persistence, trace #trace behavior, epic destination and delivery outside the viewer.

## Evidence collected 2026-10-31

Command: bun test --isolate ./frontend/src/config/sidePaneSessions.test.ts ./frontend/src/components/TicketViewer/TicketSidePane.test.tsx

Result: 31 pass, 0 fail, 82 assertions. Link-config/document-index fetches emitted ECONNREFUSED warnings because their localhost service was unavailable. These are existing component/store tests, not a live reproduction or new-project-isolation proof. No browser, full E2E suite or real-user acceptance pass was performed for r12.

Initial spec-trace all-stage check: requirements, BDD, architecture and tests passed; tasks had six existing closure gaps from prior UAT additions. This round repairs those links without claiming the corresponding runtime was reverified.

## Execution gates

TASK-12a closes navigation/copy through TEST-reader-navigation-truth and the picker/main-history scenarios. TASK-12b separately closes header/details/fullscreen through TEST-reader-navigation-header and its three scenarios. TASK-13 adds repository_reader_route_entry_and_exit and verifies against canonical designs; optional local images are cleaned up after implementation and UAT are complete.
