# UX Design: MDT-249

**Generated**: 2026-09-30 · Gate: `references/ux-gate.md` · Project registry: `docs/SKILLS.md`

## Journey Intent

A user scanning the ticket list wants to reorder it by the column they're looking at — click `Title`, get title order — with the sort control visible exactly where the data lives, no hunt for the header dropdown. Sorting the list must not silently reorder the board (different mental model: whole-table order vs within-column order), and `Status` must sort by lifecycle stage, not alphabetically.

## Surfaces

| Surface | What changes |
|---------|--------------|
| List table headers (`ProjectView.tsx`, desktop ≥ md) | Key, Title, Status, Created, Updated become clickable sort headers with direction glyph + `aria-sort`; Attributes stays static text; labels change Code→Key, Modified→Updated; header row pins (sticky) to the table's scrollport on vertical scroll (UAT) |
| List table body | New Created column (before Updated); Created + Updated cells render fixed-mode `RelativeTimestamp` |
| SortMenu dropdown (`SortControls.tsx`, header, ≥ sm) | List scope: attribute list adds Status; selection/direction stay in two-way sync with headers |
| Hamburger sort list (`HamburgerMenu.tsx`, < sm) | Same list-scope attribute list including Status; full labels as today |

## States

Per sortable header (Key, Title, Status, Created, Updated):

| State | Trigger | Visual |
|-------|---------|--------|
| unsorted (inactive) | another attribute is active | plain label, muted like current headers; **no `aria-sort` attribute**; hover shows affordance (underline/hover bg) |
| active asc | sorted ascending | label + `ArrowUpNarrowWide` glyph at `--sz-icon`, `aria-sort="ascending"` on the `th`, `data-sort-direction="asc"` |
| active desc | sorted descending | label + `ArrowDownWideNarrow` glyph, `aria-sort="descending"`, `data-sort-direction="desc"` |
| pinned (sticky) | list scrolls vertically | header row stays at the top of the table's scrollport; glyph, `aria-sort`, and hover affordance unchanged while pinned |

- Glyph pair reuses the SortMenu direction icons (`ArrowUpNarrowWide`/`ArrowDownWideNarrow`) — one direction language across surfaces; glyph `aria-hidden`, colored `currentColor` so both themes inherit header text color without new tokens (light/dark covered by existing `--foreground`/`--muted-foreground`).
- Attributes header: no states — static, same muted style as today's headers.
- Created/Updated cells: relative time text (`an hour ago`); tooltip on hover shows full date-time; no "Unknown" placeholder change beyond today's behavior for missing dates (rendered text fallback stays).
- SortMenu/hamburger: unchanged visuals; list scope simply shows the Status row (selected row = flush `--state-active-bg` tint + check, existing idiom). List-scope dropdown order is pinned: **Key, Title, Status, Priority, Created, Updated** (Status after Title mirroring column order; Priority keeps its board-scope position — no reordering of existing options).
- Fixed-mode tooltip keyboard path: the span is non-focusable and never gets `:focus-visible` itself — the tooltip surfaces on row focus via `:focus-within` (or a native `title` fallback if the tooltip component can't key off `:focus-within`), so keyboard users get the full date-time when the row is focused.

## Sticky Header (UAT addition, list view only)

**Requirement**: column headers remain visible when the list scrolls vertically; the pinned header keeps its sort glyph and `aria-sort` state (sticky is pure CSS — DOM and state are untouched, so aria/glyph persist automatically). Board view: no change.

**Scroll container (verified)**: the vertical scrollport today is the outer `div.h-full.overflow-auto` at `frontend/src/components/ProjectView.tsx:253` — the vendored Table's inner wrapper `div.mdt-table__scroll` (`frontend/src/components/ui/table.css:20-24`) has `overflow: auto` but **no height constraint**, so it grows with the table and never scrolls itself. Trap: because it is `overflow: auto`, it is still the *nearest scroll container* for the `th` — a naive `th { position: sticky; top: 0 }` binds to the non-scrolling wrapper and is **inert**. The implementation must pin the scrollport explicitly — recommended: give `.mdt-table__scroll` a full-height chain (`h-full`/`max-h-full` from the ProjectView:253 container) so it *becomes* the vertical scrollport (it already owns horizontal table scrolling); sticky `thead th { position: sticky; top: 0 }` then binds correctly. Mobile card view shares the ProjectView:253 container and is unaffected (no table wrapper).

**Background**: `.mdt-table__head` is transparent today — pinned cells must get an opaque background or scrolled rows show through. Use the page-surface token `oklch(var(--background))` (THEME.md `--background`: light line 28, dark line 46) — the list table sits on the page surface, not on a card.

**Layering**: sticky thead takes `z-10`, matching the existing sticky-tab precedent (`ticket-viewer.css:94`); body rows stay `z-auto`. The pinned header cannot overlap the app header (`Header/header.css:7`, sticky `z-50`) — different stacking contexts, and sticky is confined to its scrollport. `SecondaryHeader` has no positioning (verified: no `sticky`/`position` rules) — no conflict.

## Interactions

- First click on an inactive header → sort by that attribute's `defaultDirection` (Key desc, Title asc, **Status asc**, Created desc, Updated desc).
- Click the active header → flip direction (asc↔desc).
- Header click updates the SortMenu trigger (attribute label + direction segment) with no visible transition lag — same state, same render pass.
- Dropdown/hamburger change updates the active header glyph the same way.
- Row click still opens the ticket; header clicks stop propagation from row scope (headers are not inside rows — no conflict by construction).
- Attributes header click: nothing (not a button; no pointer affordance).

## Accessibility

- `aria-sort` lives on the `th` and is **ABSENT on inactive sortable headers** — only the active column carries `aria-sort="ascending"` or `aria-sort="descending"` (pinned by UX gate; matches bdd.md "absent on inactive" and architecture.md).
- Each sortable header is a `<button>` inside the `th`: keyboard focusable, Enter/Space activate, natural tab order across columns; glyph is `aria-hidden` so the accessible name stays the column label.
- Direction changes are announced via the `aria-sort` value change on the sorted `th`; no live region needed. The pinned (sticky) header keeps its `aria-sort` and focusable button — keyboard sorting works while scrolled.
- Fixed-mode `RelativeTimestamp` renders a `<span>` (no nested button inside the clickable row); tooltip is hover/focus-visible only, decorative to SRs (relative text is the content).
- Focus style: standard focus ring token on header buttons, consistent with other app buttons.

## Responsive Constraints

| Breakpoint | Behavior |
|------------|----------|
| ≥ md | Full table: clickable headers + Created/Updated timestamp cells |
| < md | Card list unchanged (no table headers); sorting via hamburger list — gains Status (list scope) |
| ≥ sm < md | Table hidden, hamburger available — same as today's structure |

No column priority/drop rules are introduced — the table gains one column within the existing horizontal scroll behavior.

## Alternatives Considered

- **Sort affordance via whole-`th` click, no button** — rejected: not keyboard-focusable per-column without extra plumbing; button-in-header is the platform pattern.
- **Arrow icons on all headers (up/down stacked hint)** — rejected: doubles glyph noise; single glyph on the active column matches the SortMenu language and GitHub-style tables.
- **Status icon `Workflow`** — candidate for the SortMenu Status row; `ListChecks` reads better at 14px (stage checklist). Decision for reviewer gate: propose `ListChecks`, fallback `Workflow`.
- **Dropdown list order: Status appended last** — rejected; pinned order is Key, Title, Status, Priority, Created, Updated — Status after Title mirrors column order (Key, Title, Status, …) so dropdown and table read the same, while existing options keep their positions.

## Permanent-Owner Impact (after gate approval)

- `docs/design/surfaces/sort-menu.spec.md` — icon map gains the Status row (list scope only; note that board scope omits it) with the chosen glyph; per-attribute default direction table gains Status → asc.
- No other durable docs change; STYLING.md gains nothing new (BEM `data-*` state attributes follow existing taxonomy; no new tokens).
- Durable edits land **with the implementation commit**, not before (repo rule: durable docs describe final behavior).

**Reviewer**: pipeline UX gate (independent reviewer)
**Verdict**: pending gate — UAT change (sticky headers) added 2026-09-30; prior approval (changes-required → approved after aria-sort fix) applied to the pre-UAT draft; this amendment awaits re-gate
**Required changes**: none yet — re-gate pending on the sticky-header addition
**Durable docs**: `docs/design/surfaces/sort-menu.spec.md` gains the Status row (list scope only) + Status → asc default direction with the chosen glyph — landed **with the implementation commit**, not before (repo rule: durable docs describe final behavior). Glyph choice for the Status row is carried as a proposal (`ListChecks`, fallback `Workflow`) for the owner at implementation.

### Gate checklist (evaluated by reviewer 2026-09-30)
- [x] Journey intent explicit
- [x] State coverage complete (inactive/asc/desc per header, both themes, tooltip)
- [x] Accessibility stated (aria-sort ABSENT on inactive / value on active th, button-in-header, focus, tooltip keyboard path)
- [x] Responsive constraints stated
- [x] No contradiction with requirements/architecture (BR-1..BR-7, C1–C6 carried)
- [x] Permanent-owner impact identified with deferred-edit rule honored
