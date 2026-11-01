# External Reference Badges

Compact links from a local MDT ticket to explicitly stored external issues.

## Ownership

Owns external badge labels, shortening, unavailable states, link activation and reference details across card/list/viewer/search. Does not own stored identity, URL resolution, tracker synchronization or local-ticket navigation.

## Composition

```text
ExternalReferenceBadges
└── one badge per tracker instance
    ├── one tracker icon + optional instance label
    ├── up to three individually clickable short keys
    │   └── ExternalLink indicator inside the last resolved link
    ├── unavailable key itself opens its explanation
    └── +N opens a bounded popover of hidden refs with full identities
```

Use neutral `.badge` chrome and existing primary link-text color; vendor icons distinguish providers without provider-specific badge palettes. Unavailable refs use neutral text plus a visible unavailable marker. Preserve `.ticket-key` typography without routing through local TicketCode/SmartLink normalization.

Tracker glyphs, including Jira's SVG tile, use shared badge icon metrics without tracker-specific sizing or negative margins. The decorative Lucide `ExternalLink` uses the shared `badge__icon--indicator` modifier and belongs inside the last resolved inline anchor so it cannot wrap independently. Links and overflow controls inherit badge spacing and use underline-only feedback with visible keyboard focus.

All instance groups inherit `.badge` typography, padding, row/column gap, radius and visible height. Inline links and overflow controls fit their text, without minimum widths, added insets or expanded invisible targets. The split-chip board-jump action retains its separate target contract; it is not the external-reference pattern.

## Labels and configured shortening

| Kind/state | Default and edge behavior |
| --- | --- |
| Jira | `display.projectCode=auto` hides the prefix only if exactly one configured `projectKeys` entry matches it; e.g. PRJ-123 -> 123. Missing/multiple configured keys or OPS-123 outside configured PRJ retain full keys. `always` forces the full key. |
| GitHub/GitLab | `display.repository=name` shows basename#number, e.g. widgets#123. `none` shows #123 only for the configured `defaultRepo`; other repositories retain basename. Full owner/group path remains in native link tooltips and accessibility names; popover labels use the full stored reference. |
| Several configured instances of the same kind | Use separate groups and retain one instance label beside each group icon, independent of which instances appear on the ticket. |
| Unavailable/unknown ref | Preserve raw ref text, visible unavailable marker, no destination/arrow; details explain why. |

All shortening is display-only. Never infer configuration from visible tickets or filters. Full identifiers and destinations remain in stored refs, link titles and accessible names. Group by exact instance, never by tracker kind; keep first-instance occurrence order and stored order within each group. Search may prioritize matching groups and keys inline. Within a group use the relationship badge's three-key inline limit. Overflow retains the remaining refs' stored order and never repeats resolved refs already inline. Long repository labels truncate in the middle using the `--badge-repository-max` budget: preserve the last six repository characters and keep the issue number outside the shrinking repository region. The full text stays in the DOM for search highlighting and accessibility; stored refs and destinations never change. Hidden-reference labels show the full stored identity and wrap within the viewport. Owner/namespace disambiguation remains available through the full native link identity rather than adding an inline owner mode.

## Interaction and accessibility

- Native anchors open the resolved HTTP(S) issue URL in a new tab with safe rel and a full-identity accessible name announcing the new tab.
- Link/control pointer and keyboard events never open or drag the parent card/result. Preserve native modifier-click and context-menu behavior.
- Resolved groups with up to three refs have no details control. With more refs, +N exposes only hidden refs. An unavailable key is itself a non-navigating button that opens its reason. Its explanation does not repeat the key or add a generic heading; it has a contextual accessible label. No separate ellipsis control is rendered. Overflow lists only hidden entries, including each hidden unavailable entry and its reason. Opening focuses an actual actionable element, or the focusable panel if none exist. Escape/outside close returns focus to the invoking control.
- The popover is bounded by viewport width/height, internally scrollable and uses chrome typography. It shows full stored identities, original destinations, accessible names and native tooltips without repeating resolved inline entries.
- Visible focus and >=11px content text at every density. Inline badge actions use content-width targets as specified in THEME.md. No color-only unavailable meaning.
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
- Reusable owner: `frontend/src/components/Badge/ExternalReferenceBadges.tsx`; link/label rendering lives in `ExternalReferenceLink.tsx`, disclosure behavior in `ExternalReferencePopover.tsx`, and display-only splitting in `referenceLabel.ts`.
- The styleguide mounts these production components through `frontend/src/styleguide/externalReferences.tsx`. Open `/src/styleguide.html` through Vite for live examples; direct-file viewing retains static sections and an explicit live-demo fallback.
- Semantic contract: `Badge/badge.css`, `THEME.md`, `BADGE_ARCHITECTURE.md`.
- Browser acceptance: `tests/e2e/ticket/external-references.spec.ts` and `tests/e2e/quick-search/external-references.spec.ts`.
