# MDT-252 — external references UX draft

Status: user selected option A (existing badge flow). Icon + key + arrow, configured shortening and numeric/external search behavior are confirmed directions. Neutral badge chrome follows the existing palette. This document records the ticket UX decisions; canonical surface docs carry the implementation contract.

## Journey and boundaries

A user scanning the board recognizes a linked external issue and opens it directly, while retaining MDT identity and the normal card-to-viewer path. The local key stays the primary identity. Stored, instance-scoped `refs` supply the external identity; configured resolution supplies destinations. The card never derives external keys from local numbering.

Owns: external-reference placement, visible labels, overflow, link interaction and unavailable states on the ticket card. Does not own: tracker configuration schema, frontmatter mutation grammar, search ranking, viewer editing, or synchronization. Those receive their own stage decisions and surface contracts before implementation.

## Proposed card contract

- Preserve the implemented key/timestamp row and separate title.
- Selected placement A: use the existing wrapping attribute region after internal relationships and before worktree. Do not reserve a separate reference row. The rendered A/B comparison is retained in the requesting BB thread storage as `mdt252-placement.html`. User-directed label: tracker icon + actual external identifier + diagonal arrow (`[Jira icon] PROJ-123 ↗`); no tracker-name text in ordinary link labels. Tracker kind and instance remain in accessible names, tooltips, and reference details.
- When the current MDT project configures more than one instance of a tracker kind, include the instance name beside that tracker icon in every corresponding reference, e.g. `[Jira icon] work:PROJ-123 ↗` and `[Jira icon] client:PROJ-123 ↗`. This condition considers all configured instances, not only references currently visible. Keep the instance name intact when the identifier truncates. Accessible names and tooltips always include tracker kind and instance.
- Propose at most two inline references in stored order. With more references, `+N` opens the complete reference list; with one/two, a small `⋯` details button opens that same list. Both were shown in the rendered placement comparison selected by the user. This gives touch/keyboard users a non-navigating path to full identifiers, configured instance names, and unavailable reasons at every count. No refs means no placeholder, details button, or extra row.
- External links use native anchors opening a new tab. Announce the new-tab behavior in accessible labels; isolate click, pointer/drag initiation, and keyboard activation from the parent card. Native modifier-click/context-menu behavior remains available. Card-background click opens the MDT viewer.
- Shorten presentation only according to explicit tracker configuration: Jira auto hides a matching prefix only with exactly one configured project key; GitHub/GitLab default to repository basename plus #number, with optional issue-only display for the configured default repository. Unknown/multiple contexts retain identifying context. Stored identity and URL resolution always use the full identifier without MDT zero-padding or local-key normalization. Long identifiers truncate visually inside their badge with full text on focus/hover and in the popover. External links must remain individually focusable and have at least 24px targets at every density setting.
- Missing configuration, unsupported provider/ref, malformed identifier, or unsafe/unresolvable URL: show preserved raw ref with a visible unavailable marker and no link/arrow. Accessible text explains why; tooltip repeats it and the always-available details panel exposes the complete reason to touch users. Keep it searchable. No guessed destination.
- Existing board badge controls gain `External references`, enabled by default. Hiding it only changes card/list attribute visibility, never stored refs, search, or the viewer's complete reference display. Proposed preference policy: add External references once to pre-feature saved selections while retaining all other choices, record that migration, and respect every subsequent opt-out. Never reset the whole preference key. This preserving policy accompanies the selected A package.
- Read-only cards retain valid external navigation. No refs editing is introduced on the card.

## States

| State | Presentation | Action |
| --- | --- | --- |
| No refs | Existing card | Normal viewer navigation |
| One/two resolved refs | Named link badges | Open chosen issue in a new tab |
| Three or more | Two badges and +N | Popover contains complete list |
| Same-kind instances | Include instance names | Each retains its configured destination |
| Unresolvable ref | Raw preserved text, neutral unavailable treatment | No external navigation |
| Badge preference hidden | Reference region absent | Search/viewer still expose refs |
| Narrow/mobile | Wrapping badges, constrained long label | Touch and keyboard remain usable |

## Review mockups

The rendered A/B comparison in the requesting BB thread was reviewed by the user, who selected A. The canonical ticket-card and external-reference mockups now define the selected layout and edge states. Rendering alone is not production-browser verification.

## Accessibility and responsive behavior

Native links use visible focus rings and accessible names such as `Open PROJ-123 in Jira (work), new tab`. The +N / ⋯ control announces its reference count and expanded state; opening focuses the first actionable reference (or panel if none), Escape closes and restores focus to the invoking details control. No nested buttons/anchors. Popover clicks never open the parent ticket. On narrow columns and mobile cards, items wrap within available width; the popover has viewport-bounded width and height with internal vertical scrolling and wraps/breaks full identifiers and raw refs. The popover uses chrome typography rather than card-density slots. Use the existing Radix primitive, not RelationshipBadge handlers verbatim: those assume three inline items, overflow-only content, and focus an inert span. Unavailable meaning is not color-only.

## Reuse and proposed pattern

Reuse `.badge` base, data-attribute semantics, neutral surface tiers, `--primary-text`, `--text-muted`, `--ring`, density slots and 11px text/24px target floors. Reuse relationship-badge overflow/popover behavior and click isolation. Proposed: external-reference badge variant and ref-resolution state attributes; needed because existing relationship badges route local MDT links and perform local-key elision, which external refs must not inherit. No provider-specific brand colors or new palette.

## Alternatives considered

- Beside the local key: rejected for crowding priority/type/epic/worktree identity markers and competing with the local key.
- Viewer-only: rejected because direct recognition from the board is the requested task.
- One undifferentiated external-link icon: rejected because it conceals which issue/instance the user will open.

## Walkthrough (design analysis, not browser evidence)

A returning board user sees the familiar local identity and title, then a named external key in the existing metadata region. They follow that anchor without opening or dragging the card. Extra references remain reachable through a visible count. Narrow cards wrap the same entry points. Without config, the preserved identifier remains visible/searchable and does not send users to a guessed tracker.

## Permanent-owner impact

- Update `docs/design/surfaces/ticket-card.spec.md` and `.mockups.md`, reconciling the current key/timestamp/title structure.
- Define a focused external-reference badge contract if the reusable component warrants it; viewer/search contracts updated at their own design handoffs.
- Update `frontend/src/styleguide.html` with resolved, multiple, overflow, unavailable and narrow examples in light/dark themes using runtime classes once implemented.
- The user selected A; implementation follows the canonical surface contracts and executable acceptance checks.

## Surface and visibility boundaries

| Surface | Proposed behavior | Precedence |
| --- | --- | --- |
| Board cards | Selected reference placement | Card Show badges gate, then External references preference |
| Swimlane cards | Same selected placement when badges enabled | Preserve current Show badges=false default; refs hidden until enabled |
| Desktop/mobile lists | Shared attribute rendering adopts the reference badges | Explicit proposed rollout; existing local badge preference continues to apply |
| Projected cloud stubs | Show refs only if supplied by the actual projection contract | No invented refs/config/links; projection support evaluated at Architecture |
| Ticket viewer | Complete references, independently of board preferences | Separate surface handoff pending; no claim it is specified by this card concept |
| Quick Search | External badges always shown for tickets with refs, regardless of match source or board preference | Separate read-only reference rendering; numeric query includes local/Jira/git refs, #number means git-repository refs |

## Reviewer gate

Codex reviewer: @thread:thr_g5ynmg2ccm. Verdict: **FIX FIRST** on the initial concept. Read-only source review; no observed browser evidence.

Required changes were: choose preserving saved-preference migration; declare shared-surface/show-badges precedence; provide a touch/keyboard details route at <=2 refs; bound and scroll the complete-list popover; resolve the mismatch between the draft's wrapping flow and separate-row wireframe; show ambiguous instances/long labels; recognize MDT-254 resolved the historical local-key mismatch.

Revisions specify preference migration, visibility matrix, always-available +N/⋯ details, bounds/scrolling, and current MDT-254 dependency truth. User requested tracker icon + key + arrow; an actual HTML A/B comparison now makes placement reviewable. The user selected the A package and added configured shortening and numeric search requirements. The details affordance, instance disambiguation and preserving migration accompany that package; canonical docs and styleguide are updated to the resulting contract. Production verification is still required.


## Rendered exploration checks

The HTML A/B exploration rendered four cards in Chrome at 710px with no page overflow; at 360px no page overflow was detected and the details control opened its panel. This verifies only the exploration, not the production app. Screenshot and HTML are in the requesting BB thread storage. App/browser acceptance remains required after implementation.

## Configured context and search

Jira display reads an optional configured `projectKeys` list and `display.projectCode` (`auto` default, `always` override). Auto hides only the sole matching configured prefix. Missing/multiple keys, out-of-context refs and unresolved refs retain their original context. Never compute this from currently loaded/filtered tickets. GitHub/GitLab use `display.repository` (`name` default, `none` compact) and only hide basename for the configured default repository. Inline owner/group names are deferred; full namespace paths remain available in details/tooltips/accessibility names.

Search `123` includes local and external numeric matches. Search `#123` matches complete repository issue number 123, excluding Jira-only/local-only matches and #1234. Every search result with refs shows external badges, including title/local-key matches and when board references are hidden. Matching refs should be discoverable inline before unrelated refs; details retain the complete list. No fuzzy or partial external result auto-opens.
