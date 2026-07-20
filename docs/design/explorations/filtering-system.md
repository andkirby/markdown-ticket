# Filtering System — Design Proposal

**Date**: 2026-07-20
**Type**: Exploration / option study → recommendation
**Status**: ✅ Promoted to canonical surfaces on 2026-07-20
**Promoted to**:
- `docs/design/surfaces/board-filter-bar.spec.md` (durable UX contract)
- `docs/design/surfaces/board-filter-bar.mockups.md` (review wireframes)

This exploration file remains as the **record of rejected alternatives** (popover-only, text-syntax,
bottom-sheet-for-v1, and the horizontal pin-bar collision) and the research basis. Per the
`ux-designer-specifier` rule, option studies stay out of canonical surface docs — the durable contract
lives in the spec, the "why not the other options" lives here.
**Research basis**: `research/filtering-system-research.md` (attribute must-haves + data structure)
**UX research basis**: Linear, GitHub Projects, Jira, Notion, Asana teardown (sources at end)

> **Ownership note.** This is an exploration file (option study + recommendation), per the
> `ux-designer-specifier` rule that option studies live outside canonical surface docs. The approach
> was promoted to `docs/design/surfaces/board-filter-bar.spec.md` +
> `board-filter-bar.mockups.md`. This file stays as the record of rejected alternatives.

---

## 1. The job

Users on the board today have **one** narrowing tool: a free-text input that AND-matches tokens in
title/code/description (`Board.tsx:293-311`). For a board that already exposes status, type, priority,
assignee, phase, worktree, and impact-area badges on every card, the absence of facet filtering is the
gap. The research doc establishes the **eight must-have facets**; this proposal establishes the **visual
pattern** that delivers them.

The recommendation below is intentionally not the most powerful option. It is the option that matches
MDT's existing UI density, ships in one pass, and leaves the door open to the more powerful patterns
without rework.

---

## 2. Options considered

Three patterns cover the space. Each is real, each ships in a leading tool. They differ on **learning
curve**, **power**, and **screen real estate** — in that order for the MDT audience.

### Option A — Faceted popover (Notion / Asana pattern)

A **"Filter" button** in the board toolbar carries a numeric badge when filters are active. Clicking
opens a popover with one row per facet; each row expands to a multi-select value list (checkboxes or
search-with-chips).

```
[ Filter · 3 ]   [ Sort: Key ↓ ]   [ Refresh ]
```

- **Strengths.** Zero learning curve. Scales to many facets without crowding the toolbar. Hides
  complexity until asked for. Notion and Asana both land here for broad audiences.
- **Weaknesses.** Active filters are invisible until you open the popover — you rely on the count badge.
  Baymard calls the invisible active state out specifically as the "frozen filter" anti-pattern, which
  is why every tool that uses this pattern pairs it with chips somewhere.
- **Best for.** Discoverability-first audiences; surfaces with 8+ facets.

### Option B — Inline chip bar (Linear pattern)

No popover. Each facet is a **dropdown trigger that becomes a chip** once a value is picked. Active
filters sit inline in the toolbar as removable chips. A trailing `+ Filter` affordance adds another
facet.

```
[ status: In Progress ✕ ]  [ priority: High ✕ ]  [ + Filter ]   [ Sort ]
```

- **Strengths.** Active state is always visible and one-tap removable — the dominant pattern in
  developer tools. No hidden state. Reads naturally as "what am I looking at."
- **Weaknesses.** Horizontal real estate. On a 4-column board with a multi-project header, the toolbar
  is already busy. Collapses badly on mobile without a separate pattern.
- **Best for.** Power users, stable small facet set, desktop-first.

### Option C — Text-syntax input (GitHub Projects pattern)

A single text input accepts `field:value` predicates with autocomplete on both field names and values.
Predicates render as chips below the input.

```
[ status:"In Progress" priority:high,urgent -type:docs              ]
[ status: In Progress ✕ ]  [ priority: high, urgent ✕ ]  [ type: not docs ✕ ]
```

- **Strengths.** Most expressive. Copy-paste-shareable. AND across fields, OR via comma, NOT via `-`.
  Github's "merge search and filter" is the consensus for developer tools.
- **Weaknesses.** Learning curve. Autocomplete is mandatory or it's hostile. Two controls (input + chip
  row) instead of one. Doesn't compose well with the existing free-text input without a unification
  pass.
- **Best for.** Power users on large field sets; surfaces where the query itself is a shareable
  artifact.

---

## 3. Recommendation: Option B (chip bar), with a constrained v1

**Pick the Linear-style inline chip bar.** Reject the popover-only and text-syntax options for v1.

### Why chip bar over popover

1. **Active state must be visible.** MDT's board is the primary surface; users live in it. Hiding
   active filters behind a count badge (Option A) imports Notion's worst trait for a power-user
   audience. The Baymard "applied filters overview" is non-negotiable here.
2. **The facet set is small and fixed.** Eight must-haves, all known up front. The popover's main
   advantage (scaling to many facets) buys us nothing.
3. **It matches the existing badge language.** Cards already speak in status/priority/type chips. A
   chip bar is the same vocabulary at board level. Cognitive cost ≈ zero.

### Why not text-syntax (yet)

Text-syntax (Option C) is the most powerful and the natural endpoint for a developer tool. But it is a
**second control layered on top of the visual one**, and shipping both at once doubles the surface. The
research doc pins text-syntax as an explicit non-goal for v1. The chip bar's `TicketFilters` state
shape supports adding a syntax mode later without a rewrite — same data structure, different input.
That sequencing is correct.

### Why constrain the v1

Ship **four** facets first, not eight, even though the data structure carries eight. The four with
the highest daily-job value:

| v1 facet | Why first |
|----------|-----------|
| **status** | The board is grouped by status; narrowing within is the #1 ask. |
| **priority** | "What's critical right now" — daily standup question. |
| **assignee** | "What's on my plate" / "unassigned" — daily standup question. |
| **type** | "Show only bugs" / "hide docs" — board hygiene. |

The other four must-haves (`inWorktree`, `phaseEpic`, `impactAreas`, `query`) land in v1.1 behind the
same control — they're already in the data structure, so it's UI work only, not architecture.

> Rationale: shipping eight facet dropdowns on day one makes the toolbar unreadable and invites every
> user to tune every knob. Four facets + free-text covers ~90% of real board jobs. This is the
> "dumbest code that's obviously right" move.

### 3.1 Spatial decision — pin bar collision (IDEA-002)

IDEA-002 (global pin bar) wants the same `header__right` slot this filter bar occupies. Both want to be
horizontal, both want to be always visible, both feed off the same 64px header that already holds
project selector + view switcher + sort + hamburger. Putting both in the header is the
"special-case insanity" anti-pattern — a collision that has to be managed forever.

Three ways to resolve it, evaluated:

| Option | Verdict |
|--------|---------|
| **A. Both in header__right** | Rejected. Two horizontal strips in one 64px row with project selector and sort? No. The header collapses on mobile already; this makes desktop look like mobile. |
| **B. Second sub-header row (40px)** | Rejected. Steals 40px of board height permanently for a bar that's empty most of the time. Paying permanent vertical tax for transient filter state is a bad trade. |
| **C. Pin bar absorbs into filter chips** | Rejected. Pinned items are *persistent context* (you're actively working on these), filters are *transient narrowing*. Forcing pinned items through the filter state breaks drag-to-pin, breaks always-visible access, and semantically lies — a pin is not a filter. |
| **D. Pin bar → vertical left rail; filter bar keeps header__right** | **Chosen.** Removes the collision by giving each surface its own zone. Pin bar is a new ~48px left rail (icon-only, tooltip-on-hover), filter bar stays where sort is. Mobile hides the rail and folds pins into a FAB/sheet (deferred detail). |

Why a left rail fits the pin bar specifically:

- Pins are **persistent and cross-view** (you want them visible on board, list, and documents view). The header is per-view-chrome; a rail is app-level chrome. Different jobs, different zones.
- The pin set is **small** (handful of active items). A vertical rail with icon-only items scales to ~10 pins before overflow; horizontal bars overflow at ~4 on a narrow desktop.
- MDT has **no left rail today** (`App.tsx` is `flex flex-col` → Header + content). The rail slots in cleanly as `PinRail + content` inside the content row. Greenfield, no eviction.
- The rail is a **drop target** for ticket drag (IDEA-002 core feature). A vertical strip is a larger, stabler drop target than a thin header row.

The spatial contract is now durable in `board-filter-bar.spec.md` §"Spatial boundary": filter owns
`header__right`, pin owns the left rail. Future surfaces negotiate with that contract, not with each
other.

---

## 4. Proposed UX contract

This is the **preview** of what becomes `board-filter-bar.spec.md` after sign-off. Stated here so the
recommendation is concrete.

### Composition

```
BoardFilterBar (new)
├── FreeTextSearch (re-skinned FilterControls — keeps query behavior)
├── FacetDropdown[status]   (Radix DropdownMenu)
├── FacetDropdown[priority]
├── FacetDropdown[assignee]
├── FacetDropdown[type]
├── ActiveFilterChips (one chip per selected value, each with ✕)
└── ClearAll (text button, only when ≥1 filter active)
```

Reuses: `src/components/ui/popover.tsx`, Radix `DropdownMenu`, existing `Badge` styles for chip
appearance. No new primitive needed for desktop.

### State

- Single `TicketFilters` object (research doc §2) in a `useReducer`, sibling to
  `localSortPreferences`.
- **AND across facets, OR within a facet's value list.** No exceptions, no special cases.
- Empty `TicketFilters` = show everything. This invariant is the contract.
- Persistence: `localStorage["markdown-ticket-filter-preferences"]`, mirroring sort.

### Placement

- **Single-project mode**: inside `AppHeader`, replacing the current `FilterControls` slot.
- **Multi-project (`showHeader`) mode**: inside `.board-header` next to `SortControls`
  (`board-layout.spec.md:9-14`).
- Both modes use the **same** `BoardFilterBar` component. Only the container differs.

### Mobile

MDT's mobile board is **not a shrunk desktop board** — it shows one column at a time
(`useBoardLayout.ts`, `isMobile = max-width: 768px`) and the user switches columns via a
`DropdownMenu` in the column header (`Column/index.tsx:238`). Anything we add has to coexist with that
model, not fight it.

**Constraints that drive the mobile design:**

1. **One column visible.** The board surface is already committed to a single column + column-switcher.
   We cannot stack a chip bar *and* four facet triggers *and* chips *and* a result-count line above
   that — it eats the screen.
2. **Sort already moved to the hamburger menu on `< sm`.** (`SortControls.tsx:40` uses `hidden sm:flex`;
   app-header spec item 6–7 moves it into the Hamburger Menu on mobile.) That is the established MDT
   pattern for "control that doesn't fit on mobile" — **filter must follow the same pattern**, not
   invent a new one.
3. **No `Sheet` / `Drawer` primitive exists in `src/components/ui/`.** Only `dropdown-menu.tsx` and
   `popover.tsx`. My earlier draft proposed a bottom-sheet tray (the NN/G-preferred pattern) — that
   would require adding a new Radix Dialog-based primitive. It's the right long-term answer but it's a
   scope add; see "Decision" below.
4. **The column-switcher already lives in the column header gradient.** That's where the user's thumb
   already is when navigating on mobile. A filter trigger there is one tap from the work; a filter
   trigger in the app header is two screens away.

**Decision (v1):** mirror sort exactly. On `< sm`:

- The desktop chip bar (`FreeTextSearch` + 4 `FacetDropdown`s + chips + `ClearAll`) is hidden, same as
  `SortControls` is today.
- A **"Filter · N" entry is added to the Hamburger Menu** in the same block as the existing "Sort by /
  Sort direction (mobile)" rows (app-header spec items 6–7). N = count of active filter values.
- Tapping it opens a **Popover** anchored to the menu item, containing the four facets as collapsible
  sections + the free-text input + `Clear all`. This reuses the existing `Popover` primitive — no new
  component.
- **Active filters are surfaced in two places** so the "frozen filter" anti-pattern can't take hold:
  - The Hamburger Menu row reads `Filter · 3` (count badge, Asana-style).
  - A **compact chip strip** sits directly under the column header on mobile, one chip per active
    value, horizontally scrollable, each chip one-tap removable. Empty filter = no strip (no wasted
    vertical space when there's nothing to show).

**Why not a bottom sheet for v1 (deferred):** the NN/G tray pattern is genuinely better than a popover
for faceted search on mobile — it keeps partial results visible. But it requires (a) a new
`Sheet`/`Dialog`-based primitive we don't have, and (b) reworking the one-column-at-a-time layout so
the tray can slide over *part* of the column without breaking the column switcher. That's a separate
ticket. The popover-on-hamburger approach ships the filtering capability now, reuses existing
primitives, matches the existing sort pattern, and can be upgraded to a sheet later without changing
`TicketFilters`.

**What does NOT change on mobile:** the filter predicate itself, the `TicketFilters` state, the
localStorage persistence, the AND-across/OR-within rule. Mobile and desktop share one filter state —
only the chrome differs. This is the point of putting the contract in the data structure, not the UI.

### Accessibility

- Each facet dropdown is a Radix `DropdownMenu` → arrow-key navigation, `Escape` to close, `aria-expanded`.
- Chips are `button` elements with `aria-label="Remove filter: status In Progress"`.
- "Clear all" is a real button with a descriptive `aria-label`, not an icon-only gesture.
- Filter bar as a whole is a `<toolbar>` landmark.

### Active-filter summary (the non-negotiable)

Baymard's "applied filters overview" rule is satisfied two ways simultaneously:

1. **Inline chips** with individual `✕` — one-tap removal, field + value both visible.
2. **FacetDropdown trigger label** changes when a facet is active:
   `Status` → `Status: 2`. Mirrors Linear's "the trigger is the summary" trick and keeps the toolbar
   honest when chips wrap.

### Non-goals (carried from research doc)

No saved views, no nested AND/OR, no text-syntax mode, no AI filters, no server-side filtering. All
explicitly revisit-able without touching `TicketFilters`.

---

## 5. Mockups

Wireloom is structural, not pixel-perfect — it shows composition and state, not exact chip widths.
All visible text is realistic UI copy.

### 5.1 Default state — no filters active

```wireloom
window "Board — Filter bar (default)":
  panel:
    row:
      input placeholder="Filter tickets..." id="freetext"
      button "Status" id="facet-status"
      button "Priority" id="facet-priority"
      button "Assignee" id="facet-assignee"
      button "Type" id="facet-type"
      spacer
      button "Sort: Key ↓" id="sort"
      button "Refresh" id="refresh"
    text "Showing all 14 tickets" id="result-count"
```

### 5.2 Active filters — chips visible

```wireloom
window "Board — Filter bar (active)":
  panel:
    row:
      input placeholder="Filter tickets..." id="freetext"
      button "Status: 2" id="facet-status-active"
      button "Priority: 1" id="facet-priority-active"
      button "Assignee" id="facet-assignee"
      button "Type" id="facet-type"
      spacer
      button "Sort: Key ↓" id="sort"
      button "Refresh" id="refresh"
    row:
      chip "In Progress" id="chip-1"
      chip "Approved" id="chip-2"
      chip "High" id="chip-3"
      button "Clear all" id="clear-all"
    text "Showing 3 of 14 tickets" id="result-count-active"
```

### 5.3 Facet dropdown open (priority)

```wireloom
window "Board — Filter bar (priority open)":
  panel:
    row:
      input placeholder="Filter tickets..." id="freetext"
      button "Status: 2" id="facet-status-active"
      button "Priority: 1" id="facet-priority-open"
      button "Assignee" id="facet-assignee"
      button "Type" id="facet-type"
      spacer
      button "Sort: Key ↓" id="sort"
  sheet position=bottom title="Priority":
    panel:
      checkbox "Critical" id="val-critical" label-right
      checkbox "High" id="val-high" checked label-right
      checkbox "Medium" id="val-medium" label-right
      checkbox "Low" id="val-low" label-right
      row justify=end:
        button "Done" primary id="priority-done"
```

### 5.4 Mobile — collapsed filter tray

### 5.4 Mobile — default (no filters), one-column-at-a-time

Mirrors `useBoardLayout.ts` reality: one column visible, column switcher in the column header. No chip
strip when nothing is active — vertical space is precious.

```wireloom
window "Board — Mobile (no filters)":
  navbar:
    leading:
      backbutton "MDT"
    center:
      text "Change Requests"
    trailing:
      button "☰" id="hamburger"
  panel:
    text "In Progress  ▾" id="mobile-col-switcher"
    text "2 tickets"
    list:
      slot "MDT-042 • Fix login":
        chip "In Progress"
        chip "Feature"
      slot "MDT-039 • Setup API":
        chip "In Progress"
        chip "Feature"
```

### 5.5 Mobile — filters active (chip strip under column header)

When filters are active, a horizontally-scrollable chip strip appears directly under the column
header. The Hamburger Menu row carries the count so the state is discoverable even with the menu
closed. No chip strip = no wasted vertical space.

```wireloom
window "Board — Mobile (filters active)":
  navbar:
    leading:
      backbutton "MDT"
    center:
      text "Change Requests"
    trailing:
      button "☰" id="hamburger-active"
  panel:
    text "In Progress  ▾" id="mobile-col-switcher-active"
    row:
      chip "High" id="m-chip-1"
      chip "Bug" id="m-chip-2"
      button "✕" id="m-clear"
    text "1 of 2 tickets"
    list:
      slot "MDT-051 • Crash on save":
        chip "In Progress"
        chip "High"
        chip "Bug"
```

### 5.6 Mobile — filter Popover open (from Hamburger Menu)

Filtering is reached via the Hamburger Menu, same pattern as mobile sort today (app-header spec
items 6–7). Opens a `Popover` (existing primitive) — not a bottom sheet, which would require a new
component (deferred).

```wireloom
window "Board — Mobile (filter popover)":
  navbar:
    leading:
      backbutton "MDT"
    center:
      text "Change Requests"
    trailing:
      button "☰" id="hamburger-open"
  sheet position=bottom title="Filter":
    panel:
      input placeholder="Filter tickets..." id="m-freetext"
      text "Status" id="m-section-status"
      checkbox "Proposed" id="m-st-proposed" label-right
      checkbox "In Progress" id="m-st-progress" checked label-right
      checkbox "Approved" id="m-st-approved" checked label-right
      text "Priority" id="m-section-priority"
      checkbox "Critical" id="m-pr-crit" label-right
      checkbox "High" id="m-pr-high" checked label-right
      checkbox "Medium" id="m-pr-med" label-right
      checkbox "Low" id="m-pr-low" label-right
      row justify=end:
        button "Clear all" id="m-clear-all"
        button "Done" primary id="m-done"
```

### Annotations

| Element | Pattern | Notes |
|---------|---------|-------|
| `freetext` | existing FilterControls, re-skinned | Preserves current multi-term AND behavior. Becomes `TicketFilters.query`. |
| `facet-status` | Radix DropdownMenu trigger | Label shows facet name when empty; `Status: N` when N values selected. |
| `chip-*` (desktop + mobile strip) | existing Badge styling | Removable; `aria-label="Remove filter: …"`. OR within a facet. |
| `clear-all` | text button | Single action: returns empty `TicketFilters`. Only renders when ≥1 chip. |
| `result-count` | text below bar (desktop) / under chip strip (mobile) | "Showing N of M tickets". Always visible — answers "why is the board empty?". |
| `priority-done` | primary button in popover footer | Mobile popover is apply-on-close, not live, to match the existing mobile-sort interaction. |
| `mobile-col-switcher` | existing `DropdownMenu` in Column header | Unchanged. Lives in the column header gradient; the chip strip sits below it. |
| `hamburger` / `hamburger-active` | existing Hamburger Menu | New "Filter · N" row added in the same block as mobile-only sort rows (app-header spec 6–7). |
| `m-chip-*` (mobile strip) | horizontally-scrollable chip row | One chip per active value; tap ✕ removes that value. Strip hidden when no filters active. |

---

## 6. What changes in the codebase (preview)

Stated so the recommendation is concrete; not implementation, just the shape of the work.

| Layer | Change |
|-------|--------|
| `domain-contracts/src/ticket/input.ts` | Add `query`, `impactAreas`, `inWorktree` to `TicketFilters`. Additive. |
| `src/hooks/` (new `useBoardFilters.ts`) | `useReducer` over `TicketFilters`; localStorage persist; `clearAll` action. |
| `src/components/BoardFilterBar/` (new) | Desktop: FreeTextSearch + 4 FacetDropdowns + ActiveFilterChips + ClearAll. Hidden `< sm`. |
| `src/components/AppHeader/` (Hamburger Menu) | Add **"Filter · N"** row alongside existing mobile-only sort rows (`< sm`). Opens Popover with facets. |
| `src/components/Column/index.tsx` | Render a horizontally-scrollable active-chip strip under the column header on mobile (`< 768px`) when filters are active. |
| `src/components/Board.tsx` | Replace inline filter logic (`293-311`) with a predicate built from `TicketFilters`. |
| Tests | Predicate unit tests (AND across facets, OR within). E2E: chip add/remove/clear on desktop; hamburger→popover apply/clear on mobile viewport. |

No backend changes. No new endpoints. No new indexes. The board already has the data. No new
`Sheet`/`Drawer` primitive required for v1 (deferred — see "Mobile").

---

## 7. Open questions for sign-off

1. **v1 facet count** — agree to ship 4 facets (status/priority/assignee/type) first, with the other
   4 must-haves (`inWorktree`, `phaseEpic`, `impactAreas`, `query`) in v1.1?
2. **`assignee` "Unassigned" sentinel** — accept `"__none__"` sentinel in the value list, or a
   dedicated checkbox row in the dropdown? Sentinel keeps the data shape clean.
3. **Filter bar placement in single-project mode** — confirm the AppHeader slot is the right home, not
   a new sticky bar below the header.
4. **Mobile v1 = Popover, defer Sheet** — agree to ship mobile filtering via the existing `Popover`
   primitive (reached from the Hamburger Menu, mirroring mobile sort), and defer the NN/G-preferred
   bottom-sheet tray to a follow-up ticket that introduces a `Sheet` primitive? Popover ships the
   capability now; Sheet is an upgrade, not a prerequisite.

---

## 8. UX research sources

| Tool | Pattern taken | Source |
|------|---------------|--------|
| Linear | Inline chips, AND across / OR within, trigger-as-summary | [linear.app/docs/filters](https://linear.app/docs/filters) |
| GitHub Projects | Text-syntax reference (rejected for v1, retained for v2) | [docs.github.com — filtering projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/filtering-projects) |
| Notion | Faceted popover reference (rejected — active state too hidden) | [notion.com/help/guides/using-advanced-database-filters](https://www.notion.com/help/guides/using-advanced-database-filters) |
| Asana | Count-badge trigger reference | [help.asana.com — filter and sort](https://help.asana.com/s/article/how-to-filter-and-sort-in-asana-projects) |
| Jira | JQL reference (rejected — out of scope) | [Atlassian — JQL](https://support.atlassian.com/jira-service-management-cloud/docs/use-advanced-search-with-jira-query-language-jql/) |
| Baymard | "Applied filters overview" rule — drives the always-visible chip requirement | [baymard.com/blog/how-to-design-applied-filters](https://baymard.com/blog/how-to-design-applied-filters) |
| NN/G | Mobile faceted tray pattern | [nngroup.com/articles/mobile-faceted-search](https://www.nngroup.com/articles/mobile-faceted-search/) |
| Smashing | "Frozen filter" anti-pattern — drives trigger-label change | [smashingmagazine.com — broken & frozen filters](https://www.smashingmagazine.com/2021/07/frustrating-design-patterns-broken-frozen-filters/) |

Full annotated source list in the research doc.
