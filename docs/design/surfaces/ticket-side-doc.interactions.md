# Ticket Side Doc — Interactions

Canonical reference-session lifecycle, routing and project boundaries for MDT-248 UAT r12. **Approved target; implementation pending.**

Related: [reference composition](ticket-side-doc.spec.md), [mockups](ticket-side-doc.mockups.md), [main reader interactions](ticket-viewer.interactions.md), [UAT brief](../../CRs/MDT-248/uat.md).

## Owns / does not own

Owns project-scoped reference closed/open/hidden states, its own browser-style history/scroll, link delivery and survival. Main navigation, details, fullscreen and promotion composition are host-owned. Link classification, permissions, parser, graph internals and modal primitives are unchanged owners.

## State and source model

One active reference session belongs to the reader's selected project. Retain independent sessions for other projects without rendering or loading them as the current project's content.
Each reference location identifies owning project, canonical relative file, ticket owner if any, document kind and anchor. History entries retain title and scroll using this full identity. A filename/path string alone is insufficient.
Closed means no session; open means visible; hidden means a session retained behind the reveal affordance. Main ticket hops within the same project never retarget a reference or its picker.

## Transitions

| From | Event | To / effect |
| --- | --- | --- |
| Closed | Open beside / repository link | Open; source-qualified target loads and initializes history |
| Open | Different reference selected | Open; capture current scroll, push source-qualified entry, truncate Forward |
| Open/hidden | Same current reference selected | Open/reveal/focus without duplicate entry |
| Open | Escape / Return to main | Hidden; preserve current document, history/index/scroll |
| Hidden | Reveal pill | Open; same source/position |
| Open/hidden | Close right pane | Closed; clear active project's reference snapshot only |
| Any | Same-project main ticket link | Reference state unchanged; main changes independently |
| Any | Main project A -> B | Save/deactivate A; select B's session or empty; A paths cannot load under B |
| Any | Close viewer | Save current project session; reopening restores it hidden |
| Open | Close left pane / Use as main | Host promotes reference, consumes reference slot/pill and preserves source/scroll |

Promotion does not erase other projects' sessions. Restore is hidden; visibility is not a device preference. Project navigation must finish selecting its own state before fetching/rendering.
Legacy history policy is locked: DROP/ignore all old {projectId,ticketKey} snapshots, including valid ones; no migration and no path-owner inference. First r12 use starts with empty new-format state. Use a distinct project-keyed store with at most 50 reference entries per project; evict oldest, adjust index and prune evicted title/scroll keys. A new project never inherits another project's entries. Main history is per viewer-open only and clears on close; reference sessions alone persist.
Corrupt/unavailable new-format storage degrades safely. Reference history is browser-local reading state; it is independent of the device-wide details preference.

## Link routing and explicit picker intent

| Input | Delivery |
| --- | --- |
| Ordinary repository DOCUMENT link in either pane | Reference, using source-qualified resolution |
| Ticket/epic key or ticket-file reference in either pane | Main ticket/document; same-project reference survives, project change selects its own session |
| Current ticket subdocument name in main picker | Main document selection |
| Current ticket subdocument name in reference picker | Reference document selection |
| Explicit Open {document} beside | Reference, including internal ticket documents; main unchanged |
| Known-missing target | Flagged/inert; no new pane |
| External link | Existing browser-tab behavior |
| In-page anchor | The current document region |
| Open in Documents | Full Documents workspace on the displayed document's source project/file |

Ticket-file classification remains authoritative for normal links, including root-style ticket/subdoc refs from repository prose. Explicit Open beside is a user-selected document destination, not a rewrite of global ticket-link classification.
Reference ticket picker scope is its source ticket. Source-based relative link resolution never changes because main navigated elsewhere. A reference click never creates a third pane.

## History, copy and async isolation

- Reference Back/Forward sits in its pinned toolbar and changes only its stack. Forward truncates on a new visit; consecutive duplicate identities do not push.
- Existing right-click history jump menus retain title over source path, nearest past first, and non-truncating jump semantics. Closing/dismissing a portal menu must not close the viewer behind it.
- Capture scroll at navigation/hide/close boundaries; restore it on history/reveal. Main history is separate.
- Copy, hand-off, link normalization, HTML sandbox, fetching, title/scroll maps, cache and error fallback all use owning project/file.
- On A -> B -> A, each project's index, history titles, content and scroll resume independently. Equal relative paths must still show different project content.
- Cancel/ignore old-context results and callbacks before applying destination state. Old requests/cache hits may not write another project's visible state or persisted snapshot.
- Rapid navigation follows committed visit order. A failed request retains loaded content/source with a clear failed-target error; no header/content owner mismatch or toast loop.
- Right Close clears only the active project. Global Close retains it hidden for reopen. Escape hides without destructive persistence changes.

## Divider

Pointer drag, ArrowLeft/Right +/-32px and double-click reset remain. Keep both columns >=340px in split; overlay below 1100px. Persist the percentage as an independent layout preference. The global viewer close now belongs to the shared header rather than following the dragged main width.
Capture/restore reading positions on split/overlay/fullscreen transitions; never lose source context on resize.

## Keyboard and focus

One Escape per active layer: picker/history menu, Trace shell, visible reference hide, reader close. Fullscreen uses explicit Restore.
Open focuses source-naming reference toolbar; hide focuses pill; reference discard returns focus to main/origin; promotion focuses promoted main and announces it.
In overlay mode Return to main hides the reference and Use as main promotes it; the covered main/global close is not exposed over the reference. Reference Close is the only visible close on that pane surface.
Buttons use standard tab stops and focus-visible rings. Disabled history bounds remain tooltip-accessible; retained portal exemptions prevent an outside menu dismissal from closing the reader.

## Announcements and failures

Announce Opening {title} beside main, {title} tucked, Reading session closed, and source-labelled promotion/navigation. Include owning ticket/project where needed.
Keep the existing error boundary and first-load/replacement-failure behavior. Deleted saved documents remain an explicit error, not a fallback to another project's identically named file.
The sf-api-under-MDT history defect is recorded in UAT r12; store unit tests alone do not prove these live-context rules. Browser and asynchronous project-isolation acceptance remains pending.
