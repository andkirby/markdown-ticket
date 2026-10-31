# Architecture: MDT-248

## Current target and implementation gap

UAT r12 extends the same ticket. [UX contract](ux-design.md) and canonical architecture trace describe the target. Current code still uses ticket-owned bare-path reference sessions, folder-depth tabs and floating reference history. The original designs/ticket-side-doc POC is historical, not normative for r12.

## Ownership

| Owner / seam | Current responsibility | Required refinement |
| --- | --- | --- |
| TicketViewer/index.tsx | Main route context, reference integration, persistence and scroll transfer | One reader context; atomic project transitions; shared header; promotion and fullscreen without duplicate navigation truth |
| useSidePane.ts | Reference hist/hi/scroll/title/visibility | Project-scoped sessions with project-qualified document identity |
| TicketSidePane.tsx | Fetch, path cache, reference rendering, chrome | Fetch/cache/error fallback by source identity; pinned toolbar and source-ticket picker |
| config/sidePaneSessions.ts | Browser persistence keyed by project+ticket | Independent bounded project histories; safe legacy handling |
| useTicketDocumentNavigation.ts | Main subdoc selection and route synchronization | Retain canonical file resolution; main Back/Forward stores full visited location/scroll |
| TicketDocumentTabs.tsx | Folder-depth tabs | Replace presentation with searchable document tree; explicit Open beside action |
| CompactTicketHeader.tsx | Key/title, badge flow, actions | Shared main identity, device disclosure and icon actions; document mode after repository promotion |
| SmartLink/documentDelivery.ts + SmartLink | Delivery seam; default inert outside viewer | Explicit destination intent with qualified source; retain ordinary link classification and external behavior |
| Modal + colocated reader CSS | Dialog base, split geometry | Reuse focus/portal/close primitives; scoped reader work surface and fullscreen variant |
| Browser preference owner | Lightweight visual settings | One device-wide details state, independent from project histories and card badge filters |

Shared runtime artifacts are changed sequentially in TASK-11 -> TASK-12a -> TASK-12b -> TASK-13. Do not create competing main-navigation hooks or parallel pane-history arrays.

## Source identity and project boundary

A document location includes its owning project, canonical relative file path, ticket owner when applicable, document kind, and anchor. A view-history entry also retains reading position. Resolve paths using the source document's project, never the main ticket's current project by convenience.
Cache, titles, scroll keys, fetches, hand-off, HTML sandbox context and missing-target checks share this identity.
On project transition: capture/save the old project's session; select the target project's session (or empty); invalidate old callbacks/requests before rendering target state. A pending old request may populate only its source-owned cache, never the new project's UI or snapshot.
A same-project ticket link changes main only. References from another ticket remain identified by their actual ticket. Cross-project main navigation switches the session partition; it does not reinterpret the old history.
Legacy project+ticket records are dropped/ignored. The new project-keyed store caps reference history at 50 entries per project, evicting oldest; no migration or path-owner reinterpretation is allowed.

## Reported failure mechanism — source evidence

- Host restoration exits while hasSidePaneSession or sessionOriginRef is set.
- useSidePane histories/titles/scrolls carry bare paths with no source project.
- TicketSidePane cacheRef is keyed only by currentPath.
- Its default fetcher captures the current projectId; hand-off also uses the current route project.
- Thus changing the route project can leave an old history paired with a new fetch context, consistent with the user's sf-api path shown under MDT. This is not yet a fresh browser reproduction.
- The persistence helper's existing project+ticket tests pass; they do not exercise the host transition.

## Reader composition and transitions

Shared header owns main identity/actions. Both toolbars are pinned below it. Bodies scroll independently; retain scroll on disclosure, split/frame/fullscreen changes. Existing split clamp, remembered percent and live <1100px overlay remain.
The badge row uses a browser/device preference with safe fallback, not backend/project configuration. A repository main document hides ticket chrome without erasing the preference.
Open beside is explicit picker intent and preserves main. Link semantics outside the viewer and ordinary ticket-key normalization remain unchanged.
Promotion must commit the right document and its source/owner/metadata/selected path together, consume the reference slot, keep scroll and append a main-history location. Repository promotion uses the dedicated reader route and entry/back/close contract below. Preserve prior main location for Back; do not rebuild a discarded split automatically.

## Locked implementation decisions — user review follow-up

### Storage and history lifetime

- DROP legacy project+ticket snapshots. Do not migrate or reinterpret their paths. First r12 load with no new-format state starts every project's reference history empty.
- Use a separate versioned, project-keyed browser store. Retain at most 50 reference entries per project, oldest first eviction; adjust the current index and prune evicted title/scroll/cache references consistently. Other projects are unaffected.
- Main history is per viewer-open lifetime only, remains available through in-session ticket/repository promotion, and is cleared when the viewer closes. Fresh/reloaded reader entry has a single main location and disabled main Back. Reference sessions alone persist across viewer close; details disclosure is a separate device preference.
- Slice order: TASK-11 -> TASK-12a -> TASK-12b -> TASK-13. Each has one editing owner and its own GREEN gate.

### Repository promotion route — decision: dedicated reader route

Use `/prj/{sourceProject}/read?doc={encodedProjectRelativePath}`, built by the central route helpers. The doc value is the owning project's canonical relative file path, encoded once. Reuse existing project resolution, read authorization and path validation; invalid/missing/unreadable targets show the reader's recoverable error without retargeting another project.

| Entry/action | URL and result |
| --- | --- |
| Promote repository reference | Push the dedicated read URL, preserve the current viewer-open main stack/scroll, consume the active reference, show document-mode H1/path/copy/hand-off without ticket metadata |
| Reader main Back in that open session | Restore the previous main location and its ticket/subdoc URL/scroll; do not resurrect the consumed reference |
| Browser Back after promotion | Native preceding ticket URL returns; integrate with the same main-location authority without double-pushing another history entry |
| Fresh direct link or reload | Reader opens document mode with this one main document, no active reference/pill and no restored main history; saved project reference records remain stored but are not auto-attached to this entry |
| Close viewer in document mode | Replace the read URL with `/prj/{sourceProject}/documents?file={encodedProjectRelativePath}`; land on the existing Documents workspace with that file selected and avoid a Back bounce into the closed reader |
| Open in Documents | Same explicit source-owned Documents destination |
| Existing Documents URL | Continue opening the Documents workspace; never infer reader mode from an ordinary /documents?file= link |

Choice rationale: current App.tsx/routes.ts already route /documents and /documents/* to the existing workspace, and buildDocumentPath is used for normal hand-off/link behavior. Reusing that exact URL for a reader would require invisible state to distinguish two surfaces or change established deep links (contrary to C6). A dedicated route makes the view explicit and shareable. State-only promotion is rejected because it leaves a stale ticket URL and cannot reload the document. Route constants/builders remain in routes.ts, the route table stays declarative in App.tsx, and lifecycle/navigation stays in the route owner and one reader controller.

### Visual references

Review images are optional local pre-development aids, excluded from Git. The picker image contains obsolete controls/order and header counts are illustrative. Implement the self-contained canonical specs/Wireloom contracts. Keep warnings while images are used locally; delete them after implementation and UAT are complete.

## Preserved constraints

- C3: one Escape layer per press, active portal menu/picker first, trace shell, visible reference hide, reader close. Restore is explicit and fullscreen is orthogonal.
- C4/C5: existing markdown pipeline, density/theme, HTML sandbox, complementary reference landmark and announcements. Source context remains correct after promotion.
- C6/C7: document delivery remains viewer-local; known-missing links remain inert.
- Retain pane error boundary, stable toast API, cancellation of stale loads, graph #trace contract and epic board destination.
- Reuse authFetch and current services; CLI/shared/backend business rules are not copied into the reader.

## Source / verification anchors

TicketViewer/index.tsx; TicketSidePane.tsx and useSidePane.ts; config/sidePaneSessions.ts; CompactTicketHeader.tsx; tests/e2e/ticket/side-doc-pane.spec.ts; config/sidePaneSessions.test.ts.
Canonical obligations and planned test paths are in architecture.trace.md/tests.trace.md. Existing runtime files are anchors, not evidence of r12 completion.
