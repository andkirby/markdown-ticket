# Sort Menu

Collapsed sort control — one shared component replacing the native `<select>` + direction button in both places sorting appears: the app header (board/list) and the documents navigation toolbar. Visual reference and interactive demo: `frontend/src/styleguide.html` § "collapsed sort control".

Related artifacts:
- Host specs: `board-layout.spec.md` (§ Sort & Filter), `documents-view-navigation.spec.md` (§ toolbar)
- Interactive review artifact: `frontend/src/styleguide.html` — three live variants sharing one state

## Owns

- The trigger + popover composition, its three size variants (A/B/C), and when each applies.
- Icon ↔ attribute mapping, per-attribute default direction on selection, direction visibility rules.
- Trigger width stability (fixed min-width sized to longest label; no header reflow on selection).
- Keyboard/pointer behavior of the popover: open/close, select, outside-click close.

## Does Not Own

- Sort state or persistence — each host owns its preferences (`frontend/src/config/sorting.ts` for tickets, documents sort prefs in `DocumentsLayout.tsx`).
- The mobile board/list sort UI — stays in the Hamburger Menu as the full-label list (labels are free there; this component does not render in it).
- Actual sorting logic (`frontend/src/utils/sorting.ts`, documents `sortFiles`).
- Segmented-cluster styling of the surrounding header (`control-group` in `layout.css`).

## Variants

One component, three sizes — a deliberate degradation ladder, not three designs. All share one state; the label never disappears, it moves to `title` + `aria-label`.

| Variant | Trigger | Direction | Applies when |
|---------|---------|-----------|--------------|
| **A** default | icon + label, no caret | sibling segment button | room for the label |
| **B** tight | icon-only (36px) | sibling segment button | label doesn't fit, segment does |
| **C** tightest | icon-only, single button | inside menu — explicit Ascending/Descending section | space emergency; segment doesn't fit either |

Rules:

- Icon-only is a degradation, not a design: `calendar-1` and `calendar-clock` are twins at 14px, so B/C trade glanceable state for space only when space actually runs out.
- Direction-in-menu (C) requires the explicit Ascending/Descending menu section (GitHub pattern) so the state stays visible while open. Per-attribute `defaultDirection` can silently flip direction on attribute switch — A/B keep it on screen.
- Trigger menu rows always show icon + label + default-direction hint; selected row follows the app-wide flush-row menu idiom (design3 / Hamburger Menu): full-width `--state-active-bg` tint + trailing check in `--state-active-fg` — no per-row rounding, no ring. One idiom for every dropdown menu.
- Caret is intentionally absent — the segmented silhouette + popover behavior already say "opens a menu".

## Composition

```text
SortMenu
├── TriggerButton            (icon [+ label in A]; title/aria-label always)
├── DirectionSegment         (A/B only — sibling control-group member)
└── SortPopover
    ├── AttributeRows        (icon + label + default-dir hint)
    ├── Separator            (C only)
    └── DirectionRows        (C only — Ascending / Descending)
```

## Attributes & Icons

Icons verified in lucide-react 0.542.0. Labels drop the redundant "Date" — the calendar glyph carries it; `Updated` (past participle) over `Update Date`.

| Host | Attribute | Label | Icon | Default dir |
|------|-----------|-------|------|-------------|
| tickets | `code` | Key | `ticket` | desc |
| tickets | `title` | Title | `a-large-small` | asc |
| tickets | `priority` | Priority | `chevrons-up` | desc |
| both | `dateCreated` / `created` | Created | `calendar-1` | desc |
| both | `lastModified` / `modified` | Updated | `calendar-clock` | desc |
| documents | `name` | Filename | `file-text` | asc |

Direction segment glyph: `arrow-up-narrow-wide` / `arrow-down-wide-narrow` (not bare chevrons — the arrow encodes the ordering semantics, not just "up/down").

Priority note: the sort field uses `chevrons-up`, never the per-value `PriorityIcon` glyphs (Flame/ChevronUp/Equal/ChevronDown). Those mean priority values; the field is a different concept.

## Integration — the two hosts

### Case 1: App header right cluster (board/list)

Viewport-driven. Trigger joins the header's segmented clusters as a `control-group` member next to `AuthStatusAction` and the hamburger, competing with `BoardFilterBar` on the same row.

| Viewport | Variant |
|----------|---------|
| < 640px (sm) | none — Hamburger Menu full-label list (structure unchanged: full labels + a direction row; rows follow the same flush-row menu idiom: tint + trailing check) |
| 640–767px (sm–md) | **B** icon-only + direction segment |
| ≥ 768px (md) | **A** icon + label + direction segment |

C is not used here: below 640 the hamburger owns sorting, so the header never gets tight enough to justify burying direction.

### Case 2: Documents navigation toolbar

Container-driven. The navigation panel is user-resizable (18–45% of the window), so the variant must track the **panel** width, not the viewport — CSS container query on `.documents-view__navigation-header`.

| Container (panel header) width | Variant |
|-------------------------------|---------|
| ≥ 300px | **A** icon + label + direction segment |
| 220–299px | **B** icon-only + direction segment |
| < 220px | **C** single button, direction in menu |

Popover aligns to the right edge (`right: 0`) — the toolbar sits at the panel's right side and the panel is narrow by definition.

Documents uses its own attribute set (Filename instead of Key/Priority) and its own persistence; it passes both into the same component.

## Behavior

| Action | Result |
|--------|--------|
| click trigger | toggle popover; open trigger gets primary border + 1px ring |
| select attribute | apply attribute + its `defaultDirection`; close |
| click direction segment (A/B) | flip asc/desc in place; no menu open |
| click Ascending/Descending (C) | set direction; close |
| outside click / Esc | close popover |
| keyboard | trigger is a `button` with `aria-haspopup="listbox"` + `aria-expanded`; rows are `role="option"`; arrow keys move, Enter selects, Esc closes |

## States

| State | Visual |
|-------|--------|
| default | recessed fill `oklch(var(--background))`, `--border` hairline |
| hover | `--state-hover-bg` (neutral tier) |
| open | primary border + 1px primary ring (matches `.filter-button--open`) |
| selected row | `--state-active-bg` full-width tint + trailing `--state-active-fg` check (flush-row menu idiom) |
| popover | `--bg-elevated`, border, shadow (floating layer — shadows allowed here) |

## Source / Verification Anchors

| Anchor | Path | Why |
|--------|------|-----|
| Current implementation (to be replaced) | `frontend/src/components/SortControls.tsx` | native select + chevron pair |
| Documents sort controls | `frontend/src/components/DocumentsView/DocumentsLayout.tsx` (navigation-toolbar) | second host, container-query case |
| Ticket sort config | `frontend/src/config/sorting.ts` | attribute list, defaultDirection, persistence |
| Interactive review artifact | `frontend/src/styleguide.html` § collapsed sort control | three variants, live shared state |
| Segmented cluster | `frontend/src/styles/components/layout.css` (.control-group) | trigger + segment join rule — popovers must not be `control-group` direct children or they break corner flattening |

## Implementation Notes

- One presentational component (proposed `SortMenu`), props: `attributes`, `value`, `direction`, `onChange`, `variant`. Hosts own state and persistence.
- Reuse: `control-group` silhouette, interaction-state ramp tokens, `filter-button--open` open-state recipe. New: container-query variant switching (case 2) — no existing container-query usage in `frontend/src/`.
- E2E: `sort-controls` testid survives; option-text assertions must move from "Created Date"→"Created", "Update Date"→"Updated".
