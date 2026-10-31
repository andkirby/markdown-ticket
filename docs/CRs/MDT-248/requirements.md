# Requirements: MDT-248

Current target: UAT r12, 2026-10-31. [Canonical requirements projection](requirements.trace.md), [current brief](uat.md), [UX contract](ux-design.md).

## Outcome and boundary

The reader keeps one main ticket/document and at most one independent reference. Users follow references, compare internal ticket or repository documents, move back through visited locations and promote the surviving document without losing their place.
Reference histories are isolated and retained by project. This explicitly refines the old per-ticket snapshot decision. Same-project ticket navigation preserves the reference; changing projects activates that project's own session.
Global search remains the ticket-search entry. Board-order Previous/Next, document editing, arbitrary extra panes and pane deep-link sharing are out of scope. Repository promotion uses the dedicated /prj/{sourceProject}/read?doc= route specified in architecture.md, without changing Documents workspace links.

## Approved requirement identity decisions

Refined in place: BR-1.7 (ticket navigation), C1 (current divider/fullscreen geometry), C2 (reading-position invariant), Edge-5 (close/restore/discard lifetime with project partition). Added: BR-1.13 through BR-1.19, C8 and Edge-8. No prior IDs are silently deleted. BR-1.19 makes the new project-history scope explicit.

## Current requirements

| ID | Kind / route | Contract |
| --- | --- | --- |
| BR-1.1 | behavior / bdd | WHEN a repo document link inside the open ticket modal is clicked, the system shall open the document in a side pane beside the ticket within the same modal, with ticket content, selected subdocument, and scroll position unchanged. |
| BR-1.2 | behavior / bdd | WHEN a repo document link inside the side pane document is clicked, the system shall navigate the pane to that document and push it onto the pane history (forward stack truncated, consecutive duplicates not pushed). |
| BR-1.3 | behavior / bdd | WHEN the pane back or forward control is activated, the system shall navigate within the pane history and restore the target document scroll position. |
| BR-1.4 | behavior / bdd | WHEN the Escape key is pressed while the pane is visible, the system shall hide the pane and preserve the session (current document, history, scroll positions). |
| BR-1.5 | behavior / bdd | WHILE a session exists and the pane is hidden, the system shall show a reveal affordance naming the current document, and WHEN it is activated the system shall reveal the pane on that document with scroll position restored. |
| BR-1.6 | behavior / bdd | WHEN the pane close control is activated, the system shall discard the session and return the modal to single-column layout. |
| BR-1.7 | behavior / bdd | WHEN a ticket or epic link is activated inside the viewer, the system shall replace the main ticket/document in place; same-project navigation shall keep the reference pane unchanged, while a project change shall activate only that destination project's saved reference history. |
| BR-1.8 | behavior / bdd | WHEN the pane hand-off control is activated, the system shall open the Documents view on the pane current document. |
| BR-1.9 | behavior / bdd | WHILE the viewport is narrower than 1100px with the pane open, the system shall present the pane as a full-cover view with an explicit return-to-ticket control that hides the pane keeping the session. |
| BR-1.10 | behavior / bdd | WHEN the Escape key is pressed while the pane is not visible and no trace shell is open, the system shall close the ticket modal as it does today. |
| BR-1.11 | behavior / bdd | WHEN the pane history back or forward control is right-clicked, THEN the system shall show that direction's history entries as menu rows (document title over mono file path) and activating an entry shall jump the pane to it without truncating the history stack. |
| BR-1.12 | behavior / bdd | WHEN a link inside a pane document names a ticket file (authored root-style as {ticketsPath}/{ticket key}[-slug].md, or a ticket subdoc path), THEN the system shall route it to the ticket view (column swap in the modal) instead of the documents world, from any source document. |
| C1 | constraint / tests | In framed split layout the modal shall be capped at min(94vw, 1560px), use the default main-column width clamp(420px,46%,640px), and allow a persisted draggable divider with a 340px floor per column; below 1100px use an overlay; fullscreen fills the viewport. |
| C2 | constraint / tests | Opening, hiding, discarding, promoting, resizing and changing reader header state shall preserve the surviving documents' reading positions; content scrolls beneath pinned chrome and mode changes shall not reset either pane's document or history. |
| C3 | constraint / tests | All pane controls shall be keyboard-operable with keyboard-only focus-visible rings, and Escape shall walk outward one layer per press in the order trace shell, pane, modal. |
| C4 | constraint / tests | Pane content shall render through the same markdown pipeline, theme tokens, and density setting as ticket prose (document prose variant). |
| C5 | constraint / tests | The pane shall be a complementary landmark labelled Document preview - {title}, with open, hide, and discard announced to assistive technology. |
| C6 | constraint / tests | Outside the ticket modal, document links shall deliver exactly as today (navigation to the Documents view); the pane delivery applies only to links hosted by the ticket modal. |
| C7 | constraint / tests | Documents known to be missing shall render flagged and non-clickable, and the pane shall never open for them. |
| Edge-1 | edge_case / tests | IF a document link is clicked while the pane is hidden, THEN the pane shall reveal on that document pushed onto the kept session history. |
| Edge-2 | edge_case / tests | IF the pane document fetch fails, THEN the system shall notify via toast and retain any previously loaded document with the session intact; with no previous document loaded, the pane shall show an inline empty error state naming the path. |
| Edge-3 | edge_case / tests | IF document navigation occurs in rapid succession, THEN history shall match the committed click order and scroll memory shall not corrupt. |
| Edge-4 | edge_case / tests | IF the viewport crosses the 1100px breakpoint while the pane is open, THEN presentation shall switch between split and overlay live without losing the session. |
| Edge-5 | edge_case / tests | IF the viewer closes, THEN retain only new-format project-keyed reference sessions (50 entries per project, oldest evicted) and restore them hidden on reopening the project; main-pane history resets; right-pane Close clears only the active project's reference session; first r12 load ignores all legacy project+ticket snapshots so each project starts with empty new-format history. |
| Edge-6 | edge_case / tests | IF a pane document target becomes invalid mid-session, THEN the link renders flagged and non-clickable and the current pane document is retained. |
| Edge-7 | edge_case / tests | IF the pane subtree throws during render, THEN the error shall be contained by a boundary: the pane shows an inline fallback naming the ticket as unharmed while the ticket column, modal chrome, and session keep working. |
| BR-1.13 | behavior / bdd | WHEN a ticket document picker is opened, the system shall show a searchable document tree including Main; selecting a name opens it in that pane and activating its separately labelled Open beside action opens it in the right pane without changing the main document or scroll. |
| BR-1.14 | behavior / bdd | WHEN Back or Forward is activated in either pane, the system shall restore that pane's visited ticket/document location and scroll independently; main-pane history exists only for the current viewer-open lifetime and resets on close, while only reference sessions persist; these controls represent visit history, not board ordering. |
| BR-1.15 | behavior / bdd | WHILE reading in single, split or fullscreen mode, the system shall keep a compact shared identity header and aligned pane navigation toolbars visible, place priority before the main ticket key, expose Copy path for both documents, identify the right document's source, and offer Trace Graph as an icon only when available. |
| BR-1.16 | behavior / bdd | WHEN the highlighted ticket-details control is clicked or keyboard-activated, the system shall toggle the badge row immediately below the title and remember that state device-wide across tickets, projects and viewer reopen; hover or focus shows a tooltip, not another badge dropdown, and repository documents hide badges without resetting the preference. |
| BR-1.17 | behavior / bdd | WHEN the main pane is closed while two panes are visible, the right document shall become the single main document with scroll preserved; a ticket document supplies its owner's title, key, priority and metadata, while a repository document supplies its own title/path without ticket-only controls; Back shall restore the prior main reading location. |
| BR-1.18 | behavior / bdd | WHEN Fullscreen or Restore is activated, the reader shall toggle between viewport and framed layout without losing documents, selected paths, pane histories, scroll positions or the split preference; Close viewer remains distinct from pane close. |
| BR-1.19 | behavior / bdd | WHEN the reader moves between projects, the system shall preserve a separate project-keyed reference history capped at 50 entries per project, evict oldest entries beyond the cap, restore only the destination project's new-format session, and resolve entries using their owning project; legacy project+ticket snapshots are ignored and never migrated or reinterpreted. |
| C8 | constraint / tests | Every document/history/cache identity shall include its owning project and canonical relative document path, plus owning ticket when applicable; storage selection, fetch, link resolution, hand-off, copy and error fallback shall not rebase a document against the currently active left ticket's project. |
| Edge-8 | edge_case / tests | IF a fetch, cache hit, title/scroll callback or storage write completes after switching projects or promoting a document, THEN it shall not overwrite, display in, or be saved under the new project's reader context. |
| BR-1.20 | behavior / bdd | WHEN a repository reference is promoted, the reader shall push /prj/{sourceProject}/read?doc={encodedProjectRelativePath}, preserve current main visit history, and show document-only main mode; in-session browser Back returns to the prior ticket URL, Close replaces the reader URL with that source's Documents-view URL, and direct/reloaded reader URLs open one document with no active reference and no restored main history; existing Documents-view links keep their meaning. |

## UAT evidence and carryover

The history-leak screenshot and source analysis are captured in uat.md/tests.md. Existing baseline assertions do not prove the new scope or transitions. C3–C7, Edge-1–Edge-4 and Edge-6–Edge-7 remain current: keyboard/layering, rendering parity, landmarks, delivery isolation, missing links, failures and stale/rapid navigation must remain protected.

## Locked review follow-up

BR-1.14 now explicitly limits main history to one viewer-open lifetime. BR-1.19/Edge-5 lock DROP legacy snapshots and 50 entries per project with oldest eviction. Added BR-1.20 for repository promotion URL/deep-link/Back/Close behavior. Only reference sessions persist across viewer close; details disclosure is an independent device preference.
