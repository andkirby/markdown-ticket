# External Reference Badges

Compact links from a local MDT ticket to explicitly stored external issues.

## Ownership

Owns external badge labels, shortening, unavailable states, link activation and reference details across card/list/viewer/search. Does not own stored identity, URL resolution, tracker synchronization or local-ticket navigation.

## Composition

```text
ExternalReferenceBadges
├── up to two inline reference badges (complete inline list in the viewer when appropriate)
│   └── tracker icon + optional instance label + display key + ↗ (resolved link only)
└── details control (⋯ for <=2, +N for overflow)
    └── bounded popover: complete identities, destinations and unavailable reasons
```

Use neutral `.badge` chrome and existing primary link-text color; vendor icons distinguish providers without provider-specific badge palettes. Unavailable refs use neutral text plus a visible unavailable marker. Preserve `.ticket-key` typography without routing through local TicketCode/SmartLink normalization.

## Labels and configured shortening

| Kind/state | Default and edge behavior |
| --- | --- |
| Jira | `display.projectCode=auto` hides the prefix only if exactly one configured `projectKeys` entry matches it; e.g. PRJ-123 -> 123. Missing/multiple configured keys or OPS-123 outside configured PRJ retain full keys. `always` forces the full key. |
| GitHub/GitLab | `display.repository=name` shows basename#number, e.g. widgets#123. `none` shows #123 only for the configured `defaultRepo`; other repositories retain basename. Full owner/group path remains in details/tooltips/accessibility names. |
| Several configured instances of the same kind | Keep an instance label on every affected badge, independent of which instances appear on the ticket. |
| Unavailable/unknown ref | Preserve raw ref text, visible unavailable marker, no destination/arrow; details explain why. |

All shortening is display-only. Never infer configuration from visible tickets or filters. Full identifiers remain stored and inspectable. Long display keys may ellipsize within available width; instance labels and icon/arrow remain visible. Details wrap/break full identifiers. Identical repository basenames under different owners remain distinguishable through full accessible names, tooltips and non-navigating details; do not silently rewrite destinations or invent an ownerless identity.

## Interaction and accessibility

- Native anchors open the resolved HTTP(S) issue URL in a new tab with safe rel and a full-identity accessible name announcing the new tab.
- Link/control pointer and keyboard events never open or drag the parent card/result. Preserve native modifier-click and context-menu behavior.
- The always-available details button provides touch/keyboard access to full identities and unavailable reasons even for one reference. Opening focuses an actual actionable element, or the focusable panel if none exist. Escape/outside close returns focus to the invoking control.
- The popover is bounded by viewport width/height, internally scrollable and uses chrome typography. The reference list contains all refs, not only overflow.
- Visible focus, >=24px actual targets, >=11px content text at every density. No color-only unavailable meaning.
- No refs means no badges, details button, placeholder or empty row.

## Visibility by surface

| Surface | Visibility |
| --- | --- |
| Board/list attributes | Existing Show badges and External references preference apply. First feature introduction adds refs to old selections once, retaining all other choices and respecting later opt-out. |
| Swimlane cards | Preserve existing Show badges=false default; external refs appear when badges are enabled and the ref preference allows them. |
| Ticket viewer | Full refs independent of board preferences; mutation form only when edit capability permits it. |
| All Quick Search ticket results | Always show refs when present, including title/local-key matches; ignore board preferences. Prioritize a matched ref inline while retaining full-list details. |
| Read-only local ticket | Navigation/details remain available; no reference editing. |
| Cloud projected stub | Never synthesize refs absent from the actual projection. |

## Source and verification anchors

- Existing owners: `TicketAttributeTags.tsx`, `Badge/RelationshipBadge.tsx`, `QuickSearch/QuickSearchResults.tsx`, `TicketAttributes.tsx`.
- Proposed reusable owner: `frontend/src/components/Badge/ExternalReferenceBadges.tsx`.
- Semantic contract: `Badge/badge.css`, `THEME.md`, `BADGE_ARCHITECTURE.md`.
- Planned browser acceptance: `tests/e2e/ticket/external-references.spec.ts` and `tests/e2e/quick-search/external-references.spec.ts`.
