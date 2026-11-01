# MDT-252 — external reference UX

Current direction: user-selected A, existing wrapping badge flow. UAT refines the original separate-badge/full-list concept to grouped instance badges and hidden-only dropdowns. See the canonical [badge spec](../../design/surfaces/external-reference-badge.spec.md).

## Composition

- Preserve the key/timestamp row, separate title, internal relationships and worktree ordering. External references join the existing wrapping flow after internal relationships.
- One badge per exact tracker instance: one tracker icon, optional instance label, up to three individually clickable short keys, a Lucide ExternalLink indicator inside the last resolved anchor, then +N for additional refs. This matches internal relationship badge grouping without routing external identities through local TicketCode/SmartLink normalization.
- Group order follows first stored occurrence; each group keeps stored order. Search may prioritize the matching group/ref inline. Overflow excludes the actual inline entries and preserves stored order of the rest.
- Dropdown links show full stored identities and wrap within the viewport. Full stored identity and destination remain in native link titles and accessible names. No repeated resolved inline references in the dropdown.
- Resolved groups with up to three refs have no dropdown. Unavailable keys are themselves non-navigating explanation buttons. Their short explanation does not repeat the key or a generic heading; no separate ellipsis control is shown.
- Neutral existing badge chrome, primary link text and vendor icons; no vendor palette.

## Shortening and identity

- Jira auto removes the prefix only when projectKeys contains exactly one key matching that ref. No keys, multiple keys or a nonmatching prefix retain the full key; always disables shortening.
- Git defaults to repository basename#number. Optional none shows #number only for the exact configured defaultRepo; other repositories retain basename. Owner display is deferred. Long repository names truncate in the middle while preserving their final six characters, issue number and attached external-link indicator. This is display-only and retains complete DOM text, stored identities and URLs.
- Multiple configured same-kind instances retain an instance label beside every affected group icon, including when another configured instance is invalid or absent from the ticket. Never merge same-kind instances.
- Shortening never changes stored refs or destinations. Unknown refs remain raw, searchable and unlinked.

## Interaction and accessibility

Native new-tab anchors retain modifier-click and context menus. Links and overflow controls isolate parent navigation and drag initiation. Full accessible identities announce tracker/instance and new-tab behavior. Inline actions fit their content using shared badge metrics, without forced minimum widths or expanded hit surfaces; content text remains at least 11px.

The Radix panel uses viewport-bounded width/height, internal scrolling and wrapping keys/reasons. It uses chrome typography, independent of card density. Opening focuses the first real link, or the focusable panel when none exist; Escape/outside close returns focus to the invoking control.

Quick Search retains input-only Tab scope cycling, F6 to the selected result's primary action, native Tab through group links and overflow, and Shift+F6 back to search. Keyboard-visible focus remains intentional.

## Visibility

Board/list obey existing badge preferences and one-time preserving migration. Swimlanes preserve Show badges=false precedence. Viewer/search show grouped refs independently of board preferences. No refs means no group or placeholder. Read-only access retains navigation/inspection; editing uses existing CLI/MCP/HTTP boundaries. Cloud stubs never invent absent refs.

## Design history

The original A/B exploration in thread storage established placement A and icon/key/arrow styling. Its two-inline complete-list inspection concept is superseded by the user's grouped-key and no-repeat UAT direction. Original exploration screenshots are design evidence only. Current production/readiness evidence belongs to the UAT verification and independent review.
