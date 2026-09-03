# Shared Primitive Inventory

The catalog of global CSS classes in this project. **Curated by hand** — a human
writes the `Purpose` annotations — and kept accurate by a **nightly drift check**
that flags classes which appear in `@layer components` but not here (undocumented),
or here but not in CSS (orphaned).

**This is an inventory, not a rulebook.** For *how* to name and extract classes,
see [STYLING.md](STYLING.md). For *which ITCSS layer a file belongs in*, see
[ITCSS.md](ITCSS.md). For *what tokens exist*, see [THEME.md](THEME.md).

---

## Drift check

The nightly ITCSS task (02:00) reconciles this table against the actual
`@layer components` selectors in `frontend/src/`. Each entry's `Class` cell is the key. When
the check reports drift:

| Drift type | Meaning | Action |
|---|---|---|
| **Undocumented** | A class selector in `@layer components` that isn't listed here | Add a row (curate the Purpose) if it's a shared primitive; ignore if it's a one-off component-local class that doesn't belong in the shared inventory |
| **Orphaned** | A row here whose `Class` no longer exists in any CSS file | Remove the row, or fix the rename that orphaned it |

The check is advisory — it reports, it does not edit this file. Keeping the curation
human-owned preserves the annotations a script can't author.

---

## Buttons & forms

| Class | Purpose | File |
|-------|---------|------|
| `.btn`, `.btn-*` | Button variants | `styles/components/buttons.css` |
| `.input`, `.input-error` | Form inputs | `styles/components/forms.css` |
| `.label` | Form labels | `styles/components/forms.css` |

## Cards & layout

| Class | Purpose | File |
|-------|---------|------|
| `.card`, `.card-*` | Card structure | `styles/components/layout.css` |
| `.control-group`, `.control-group__item` | Joined segmented control cluster — flattens wrapped children into one visual silhouette via border-radius zeroing + margin collapse. The no-color object: owns structure only, inherits skin from children. | `styles/components/layout.css` |
| `.avatar`, `.avatar-*` | Avatar sizes | `styles/components/layout.css` |
| `.header`, `.header__*` | Sticky navigation bar | `components/Header/header.css` |
| `.board-container` | Kanban grid layout | `components/Column/column.css` |
| `.column`, `.column--over` | Board column + drop target | `components/Column/column.css` |
| `.column__header` | Column gradient header bar | `components/Column/column.css` |
| `.column__count` | Ticket count badge in header | `components/Column/column.css` |
| `.column-drop-zone` | Inner scrollable ticket list | `components/Column/column.css` |
| `.draggable-ticket`, `.draggable-ticket--*` | Drag wrapper states | `components/Column/column.css` |

## Badges & indicators

| Class | Purpose | File |
|-------|---------|------|
| `.badge`, `.badge[*]` | Ticket attribute badges (`data-status`/`data-priority`/`data-type` variants) | `components/Badge/badge.css` |
| `.priority-dot`, `.priority-dot[*]` | Card-only 8px priority dot | `components/Badge/badge.css` |
| `.ticket-code__type-icon[*]` | Key-line type glyph sizing + `--type-*` colors (MDT-244, opt-in) | `components/TicketCard/ticket.css` |
| `.status-dot`, `.status-dot--*` | Pulsing status dots | `styles/components/loading.css` |
| `.count-badge`, `.count-badge--*` | Count indicators | `styles/components/loading.css` |
| `.skeleton`, `.skeleton-*` | Loading placeholders | `styles/components/loading.css` |
| `.fav-star`, `.fav-star--*` | Favorite star indicator | `styles/entities/fav-star.css` |
| `.fav-star-btn`, `.fav-star-btn--*` | Star toggle button wrapper | `styles/entities/fav-star.css` |

## Overlays & menus

| Class | Purpose | File |
|-------|---------|------|
| `.dropdown`, `.dropdown-*` | Dropdown menus | `styles/components/overlays.css` |
| `.modal`, `.modal-*` | Modal dialogs | `components/ui/modal.css` |
| `.modal__headline` | Canonical modal `<h1>` title | `components/ui/modal.css` |
| `.tooltip`, `.tooltip-*` | Tooltips | `styles/components/overlays.css` |

## Project selector

| Class | Purpose | File |
|-------|---------|------|
| `.project-card`, `.project-card--*` | Project selector card (rail + panel) | `components/ProjectSelector/project-selector.css` |
| `.project-chip`, `.project-chip__*` | Compact project chip (rail inactive) | `components/ProjectSelector/project-selector.css` |
| `.project-launcher` | Panel launcher button | `components/ProjectSelector/project-selector.css` |
| `.project-chips-overlay`, `.project-chips-overlay__*` | Hover-revealed inactive chip strip (MDT-185) | `components/ProjectSelector/project-selector.css` |
| `.project-expand-hint` | Chevron hint on active card edge (MDT-185) | `components/ProjectSelector/project-selector.css` |
| `.project-search` | Panel search input | `components/ProjectSelector/project-selector.css` |
| `.project-lift` | Shared hover lift transition | `components/ProjectSelector/project-selector.css` |

## Search

| Class | Purpose | File |
|-------|---------|------|
| `.search-result`, `.search-result__*` | Quick search result items | `components/QuickSearch/quick-search.css` |
| `.search-results-list` | Result list container with dividers | `components/QuickSearch/quick-search.css` |
| `.search-section-header` | Section header in results | `components/QuickSearch/quick-search.css` |
| `.search-mode-badge` | Mode indicator pill (In: CODE) | `components/QuickSearch/quick-search.css` |
| `.search-skeleton-bar` | Loading skeleton bar | `components/QuickSearch/quick-search.css` |

## Ticket surfaces

| Class | Purpose | File |
|-------|---------|------|
| `.ticket-card`, `.ticket-card--invalid` | Ticket card surface + hover | `components/TicketCard/ticket.css` |
| `.ticket-card__title` | Ticket title typography | `components/TicketCard/ticket.css` |
| `.ticket-card--projected` | Cloud-projected stub (dashed border) | `components/TicketCard/ticket.css` |

## Settings & tabs

| Class | Purpose | File |
|-------|---------|------|
| `.settings-*` | Settings modal | `components/SettingsModal/settings.css` |
| `.tab`, `.tab__*`, `.tab--*` | Shared underline-tab object (every tab strip; also consumed by styleguide.html) | `styles/components/tabs.css` |
| `.checkbox` | Shared checkbox object — custom-drawn 16px, `--radius-xs` corner, primary checked fill (every checkbox input + prose task lists; also consumed by styleguide.html) | `styles/components/checkbox.css` |
| `.column-merge-checkbox` | Documented deviation — warning accent on merge-mode checkbox | `components/Column/column.css` |
