# Architecture

Related CR: `MDT-187-relationship-badge-overflow.md`
UX contract: `docs/design/surfaces/relationship-badge.spec.md`

## Rationale

The current `RelationshipBadge` (`src/components/Badge/RelationshipBadge.tsx`) renders every link inline with a comma separator and no project-code elision. On dense board cards with many same-project relationships this produces long, repetitive rows (`🔗 VOC-030, VOC-005, VOC-035, VOC-040, VOC-041`) that wrap and push other badges down. Additionally, link clicks today bubble to the card's `onClick={onEdit}` (`TicketCard.tsx:45`), so a relationship click both navigates and opens the viewer.

This change makes the badge compact on the board (elision + overflow popover) and stops event propagation on relationship interactions, while preserving full codes in the TicketViewer.

## Pattern

**Same component, surface-aware display mode + portal-based overflow.**

- One `RelationshipBadge` component continues to own all three relationship types. No new badge per link.
- A new optional `displayMode: 'compact' | 'full'` prop drives elision. Board passes `'compact'`; TicketViewer passes `'full'` (or omits, defaulting to `'full'`).
- Elision is a pure display helper derived from `classifyLink` + the link's key prefix.
- Overflow is a Radix Popover portal anchored to a `+N` button inside the badge.

## Structure

```text
src/components/
└── Badge/
    ├── RelationshipBadge.tsx        # updated: displayMode + overflow + stopPropagation
    ├── RelationshipBadge.test.tsx   # updated: elision, overflow, stopPropagation
    └── relationshipLink.ts          # NEW: elision helper (pure, unit-tested)
src/components/ui/
└── popover.tsx                      # NEW: shadcn popover wrapper over @radix-ui/react-popover
```

## Component API

```typescript
// Updated prop
interface RelationshipBadgeProps {
  variant: RelationshipVariant       // 'related' | 'depends' | 'blocks'
  links: string[]
  displayMode?: 'compact' | 'full'   // NEW; default 'full'. Board passes 'compact'
  className?: string
}
```

TicketAttributeTags (board) passes `displayMode="compact"`. TicketViewer keeps current usage (defaults to `'full'`).

## Decisions

### D1 — Elision classification: parse key prefix, do NOT rely on `classifyLink`'s `link.type`

`classifyLink` in `linkProcessor.ts:85-97` matches a link like `OTHER-123` against the generic ticket regex `^([A-Z]+-[A-Z]?\d+)` and returns `LinkType.TICKET` (same-project) **even when the prefix differs from the current project**, because the generic ticket match runs before the cross-project branch (`linkProcessor.ts:99-115`). Relying on `link.type` would misclassify cross-project links as same-project and wrongly elide them.

Resolution: a pure helper `elideLinkKey(link, currentProjectCode)` that:

1. Parses the link's prefix with the same shape `^([A-Z]+)-(\d+)$` (uppercase, 2–5 char prefix per `PROJECT_CODE_PATTERN`).
2. If prefix matches `currentProjectCode` → returns the zero-padded number segment (preserving the original digit count, including `1005` → `1005`).
3. Otherwise → returns the full key unchanged.
4. Falls back to the full key if the regex does not match (defensive; covers malformed/external links that slipped into the array).

The full CR key is always carried in a per-link `title` attribute regardless of display form.

### D2 — Overflow: add `@radix-ui/react-popover`, not DropdownMenu

There is no Popover primitive in `src/components/ui/` today. Options considered:

| Option | Verdict |
|---|---|
| Use existing `DropdownMenu` | Rejected. DropdownMenu's items are menu semantics (roving `aria-roledescription="menuitem"`, arrow-key navigation, `role="menu"`). Our items are **links** with `href`s, not menu commands. Menus with link children are an a11y antipattern and behave oddly with router `<Link>`. |
| Add `@radix-ui/react-popover` (shadcn `popover.tsx`) | **Chosen.** Popover is a generic floating container with correct focus management, Escape/outside-click close, and no menu-role semantics — right for "a list of links." Matches the spec's "Popover, not native menu." |
| Build a custom floating UI | Rejected. Reinvents focus trap, escape handling, portal positioning that Radix already solves. |

`popover.tsx` follows the existing shadcn wrapper convention (see `dropdown-menu.tsx`). Radix Popover composes well with `SmartLink` (children are normal elements).

### D3 — `stopPropagation` lives in `RelationshipBadge`, not in `SmartLink`

`SmartLink` (`src/components/SmartLink/index.tsx`) renders plain `<Link>`/`<a>` with no propagation control, and is used in `MarkdownContent` and elsewhere where bubbling may be intentional. Changing `SmartLink` globally is out of scope (flagged in the CR as a separate decision).

Resolution: `RelationshipBadge` wraps each `SmartLink` (inline and popover) in a `<span onClick={(e) => e.stopPropagation()}>` and the `+N` trigger button calls `e.stopPropagation()` before toggling. This mirrors the existing edit-button precedent (`TicketCard.tsx:69-73`). This also fixes the pre-existing double-fire bug for this surface.

### D4 — One Popover per badge, independent

Each `RelationshipBadge` instance manages its own popover open state via Radix's controlled `open` / `onOpenChange`. Badges do not coordinate (opening one does not close another). Within one badge there is exactly one popover. This keeps the component self-contained.

### D5 — Overflow threshold `INLINE_MAX = 3`

Exported as a named constant from `RelationshipBadge.tsx`. Tunable in one place. Spec-fixed at 3.

## Data Flow

```text
TicketAttributeTags (board)
  └── RelationshipBadge variant=related links=[...] displayMode="compact"
        ├── elideLinkKey(link, projectCode) → display string   (pure)
        ├── inlineLinks = links.slice(0, INLINE_MAX)
        ├── overflowLinks = links.slice(INLINE_MAX)
        ├── inline SmartLinks wrapped in stopPropagation span
        └── if overflowLinks.length > 0:
              ├── +N button (stopPropagation, aria-haspopup, aria-expanded)
              └── Popover (Radix) → overflowLinks as full-key SmartLinks

TicketViewer
  └── RelationshipBadge variant=related links=[...]   (displayMode defaults 'full')
        └── all links render full CR keys, no +N, no elision
```

`projectCode` is already resolved in `RelationshipBadge` via `useParams` (`RelationshipBadge.tsx:45`). No new data fetching.

## Migration & Rollback

- **Backward compatible API**: `displayMode` is optional with default `'full'`. Existing callers (TicketViewer, any tests) keep working unchanged.
- **Board-only behavior change**: `TicketAttributeTags` is the only place that opts into `'compact'`.
- **New dependency**: `@radix-ui/react-popover`. If rollback is needed, revert the import + popover usage; the elision helper and stopPropagation wrapper are independent and can remain.
- **Test updates**: the existing test at `RelationshipBadge.test.tsx:138-149` ("should include all links in title attribute") asserts a single badge-level `title`. Under the new contract, `title` moves per-link and the badge-level title is reserved for the overflow case. Tests are updated in the same change. The "should handle cross-project links" test at `:166-177` is preserved (full code rendering for single-link, non-overflow case).

## Non-Goals

- Not changing `SmartLink` global behavior (separate decision).
- Not changing badge colors, icons, or ordering.
- Not adding new relationship types.
- Not introducing a shared popover portal manager.
