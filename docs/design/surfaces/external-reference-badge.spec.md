# External Reference Badges

Compact links from a local MDT ticket to explicitly stored external issues.

## Ownership

Owns external badge labels, shortening, unavailable states, link activation and reference details across card/list/viewer/search. Does not own stored identity, URL resolution, tracker synchronization or local-ticket navigation.

## Composition

```text
ExternalReferenceBadges
└── one badge per tracker instance
    ├── one tracker icon + optional instance label
    ├── up to three individually clickable short keys + shared ↗
    └── +N for hidden refs, or ⋯ for unavailable explanations
        └── bounded popover: hidden refs with the same short labels
```

Use neutral `.badge` chrome and existing primary link-text color; vendor icons distinguish providers without provider-specific badge palettes. Unavailable refs use neutral text plus a visible unavailable marker. Preserve `.ticket-key` typography without routing through local TicketCode/SmartLink normalization.

Jira uses the user-supplied blue tile/white mark SVG asset at `frontend/public/icons/trackers/jira.svg`, rendered decoratively by `TrackerIcon`. Its inset artwork uses the standard `--sz-icon` slot (16px), rather than font-cap sizing, to stay legible beside other badge glyphs at every density. The tile’s leading inset matches its top and bottom insets; other badge padding stays shared. The badge background and link text continue to use shared theme tokens. Issue numbers keep their resting appearance on hover, without an underline or individual background; keyboard focus remains visible.

All instance groups inherit the shared `.badge` font size, line height, padding, column gap, radius and visible height in card and viewer contexts. External references must not add a separate minimum pill height or smaller text scale. Native links and overflow controls keep at least 24px-wide targets; vertically expanded invisible hit surfaces preserve a 24px hit height without enlarging the badge or overlapping adjacent keys, following the existing `.badge-action` pattern. Wrapped rows use the combined `--gap-sm` + `--gap-xs` spacing so their 24px target surfaces remain separate even with browser hit-test rounding; this row gap does not increase single-line badge height.

## Labels and configured shortening

| Kind/state | Default and edge behavior |
| --- | --- |
| Jira | `display.projectCode=auto` hides the prefix only if exactly one configured `projectKeys` entry matches it; e.g. PRJ-123 -> 123. Missing/multiple configured keys or OPS-123 outside configured PRJ retain full keys. `always` forces the full key. |
| GitHub/GitLab | `display.repository=name` shows basename#number, e.g. widgets#123. `none` shows #123 only for the configured `defaultRepo`; other repositories retain basename. Full owner/group path remains in native link tooltips and accessibility names; dropdown labels use the same shortening as inline labels. |
| Several configured instances of the same kind | Use separate groups and retain one instance label beside each group icon, independent of which instances appear on the ticket. |
| Unavailable/unknown ref | Preserve raw ref text, visible unavailable marker, no destination/arrow; details explain why. |

All shortening is display-only. Never infer configuration from visible tickets or filters. Full identifiers and destinations remain in stored refs, link titles and accessible names. Group by exact instance, never by tracker kind; keep first-instance occurrence order and stored order within each group. Search may prioritize matching groups and keys inline. Within a group use the relationship badge's three-key inline limit. Overflow retains the remaining refs' stored order and never repeats resolved refs already inline. Long labels may ellipsize inline; overflow labels wrap/break within the viewport. Owner/namespace disambiguation remains available through the full native link identity rather than adding an inline owner mode.

## Interaction and accessibility

- Native anchors open the resolved HTTP(S) issue URL in a new tab with safe rel and a full-identity accessible name announcing the new tab.
- Link/control pointer and keyboard events never open or drag the parent card/result. Preserve native modifier-click and context-menu behavior.
- Resolved groups with up to three refs have no details control. With more refs, +N exposes only hidden refs. Inline unavailable refs retain a ⋯ explanation control even when no overflow exists; they may repeat in that explanatory panel, while resolved inline refs never do. Opening focuses an actual actionable element, or the focusable panel if none exist. Escape/outside close returns focus to the invoking control.
- The popover is bounded by viewport width/height, internally scrollable and uses chrome typography. It keeps configured short labels, original destinations, full-identity accessible names and native tooltips.
- Visible focus, >=24px actual targets, >=11px content text at every density. No color-only unavailable meaning.
- No refs means no badges, details button, placeholder or empty row.

## Visibility by surface

| Surface | Visibility |
| --- | --- |
| Board/list attributes | Existing Show badges and External references preference apply. First feature introduction adds refs to old selections once, retaining all other choices and respecting later opt-out. |
| Swimlane cards | Preserve existing Show badges=false default; external refs appear when badges are enabled and the ref preference allows them. |
| Ticket viewer | All grouped refs independent of board preferences; existing CLI/MCP/HTTP boundaries supply editing. |
| All Quick Search ticket results | Always show refs when present, including title/local-key matches; ignore board preferences. Prioritize a matched group/ref inline; overflow excludes the actual refs selected inline. |
| Read-only local ticket | Navigation/details remain available; no reference editing. |
| Cloud projected stub | Never synthesize refs absent from the actual projection. |

## Source and verification anchors

- Existing owners: `TicketAttributeTags.tsx`, `Badge/RelationshipBadge.tsx`, `QuickSearch/QuickSearchResults.tsx`, `TicketAttributes.tsx`.
- Reusable owner: `frontend/src/components/Badge/ExternalReferenceBadges.tsx`.
- Semantic contract: `Badge/badge.css`, `THEME.md`, `BADGE_ARCHITECTURE.md`.
- Browser acceptance: `tests/e2e/ticket/external-references.spec.ts` and `tests/e2e/quick-search/external-references.spec.ts`.
