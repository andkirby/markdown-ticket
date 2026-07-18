---
code: MDT-193
status: In Progress
dateCreated: 2026-07-18T08:04:52.769Z
type: Feature Enhancement
priority: Medium
phaseEpic: MDT-187
---

# Render ticket references in Epic badge as links

## 1. Description

### Requirements Scope
`full` — outcome-focused requirements; implementation approach deferred to `mdt:architecture`.

### Problem
- The Epic badge (phase context badge) renders the `phaseEpic` field as plain text in every surface it appears on
- When a ticket's epic value is another ticket reference (e.g. `ABC-012`), the user cannot navigate to that ticket from the badge
- This is inconsistent with the relationship badge, which already renders ticket references as navigable links
- Users must copy the reference, open search, and paste to reach the epic ticket

### Affected Areas
- Frontend: Epic badge rendering across ticket surfaces (board cards, list rows, ticket detail header, attributes panel)
- Reuse: Existing ticket-link detection and rendering infrastructure (already used by the relationship badge and markdown body content)

### Scope
- **In scope**:
  - Whole-string ticket references in the Epic badge value render as clickable in-app links — a "whole-string reference" is the bare key (`ABC-012`), optionally with a `.md` suffix (`ABC-012.md`) or `#anchor` (`ABC-012#section`), matching the existing ticket regex anchors used elsewhere
  - Non-ticket free-text values (including embedded refs like `"Epic: ABC-012"`) continue to render as plain text (no regression)
  - Behavior is consistent across all surfaces that render the Epic badge
- **Out of scope**:
  - True cross-project routing (e.g. `ABC-012` in a `TEST` project resolving to `/prj/ABC/...`). The existing `classifyLink` matches the ticket regex `^([A-Z]+-[A-Z]?\d+)...$` **before** its cross-project branch, so any `XXX-NNN` value is classified as `TICKET` and resolved against the current project route. This is a pre-existing `classifyLink` limitation already documented in `linkProcessor.mdt150.test.ts:119` and exhibited by `RelationshipBadge` (`RelationshipBadge.test.tsx:172-183`). Fixing it is a separate concern tracked below as a deferred follow-up.
  - Linkifying ticket references embedded in free text (e.g. `"Epic: ABC-012"` or `"Phase 2 / ABC-012"`) — deferred to a follow-up
  - Promoting `phaseEpic` to a structured/durable epic identity (see MDT-188)
  - Changes to the relationship badge, document links, or markdown body autolinking
  - Backend changes — `phaseEpic` remains a free-text string

## 2. Desired Outcome

### Success Conditions
- When a ticket's epic value is a bare ticket key, the Epic badge renders that key as a link that navigates within the app
- When the epic value is free text that does not match a ticket key, the badge renders as plain text unchanged from today
- Clicking the link does not trigger the parent surface's click handler (e.g. opening a card's detail view) — navigation goes to the referenced ticket only

### Constraints
- Must reuse the existing ticket-link detection (`classifyLink`) and rendering (`SmartLink`) infrastructure — no new detection logic
- Must match the visual and interaction pattern already established by the relationship badge
- Must respect existing global link toggles (auto-linking, ticket links) that govern `SmartLink`
- Must preserve current Epic badge styling (phase variant) — link treatment only, no restyle
- Must work without a backend round-trip; link resolution is client-side from the badge value

### Non-Goals
- Not detecting or linkifying ticket references embedded in prose values
- Not changing the `phaseEpic` field type, schema, or frontmatter format
- Not adding hover cards, previews, or status coloring to Epic badge links
- Not unifying Epic badge and relationship badge into a single component

## 3. Open Questions

All resolved during architecture (see §6 Implementation Notes):

| Area | Question | Resolution |
|------|----------|------------|
| Rendering | Should the link live inside the existing badge primitive, or wrap it? | Inside `ContextBadge`. The three call sites render `<ContextBadge variant="phase" value={ticket.phaseEpic} />` identically, so a single internal change fixes all surfaces. Mirrors how `RelationshipBadge` owns its own link rendering. |
| Project context | How does the badge obtain the current project code? | `useParams<{ projectCode: string }>()` — same as `RelationshipBadge.tsx:77`. Call sites are unchanged. |
| Click handling | What is the propagation contract? | Wrap the `<SmartLink>` in `<span onClick={e => e.stopPropagation()}>`, mirroring `RelationshipBadge.tsx:117-121`. Prevents the parent card/row's viewer-open onClick from double-firing on navigation. |
| Fallback boundary | Which value shapes linkify vs. fall back to plain text? | Delegated to `classifyLink`. The ticket regexes (`linkProcessor.ts:85,100`) match whole-string keys `^([A-Z]+-[A-Z]?\d+)(\.md)?(#.*)?$`, so `ABC-012`, `ABC-012.md`, `ABC-012#section` linkify; `UNKNOWN`/non-matching values fall back to plain text. This is the same boundary the relationship badge uses — consistency is the goal. |

### Known Constraints
- Link detection reuses the existing `classifyLink` ticket regexes (whole-string match)
- `SmartLink` and its global toggles (`enableAutoLinking`, `enableTicketLinks`) are the only sanctioned link renderer
- The `phaseEpic` field stays a free-text string; no schema change

### Decisions Deferred
- Task breakdown (determined by `mdt:tasks`)

## 4. Acceptance Criteria

### Functional
- [ ] A ticket whose epic value is a bare same-project ticket key shows that key as a clickable link in the Epic badge
- [ ] Clicking a same-project Epic badge link navigates to the referenced ticket's view
- [ ] A ticket whose epic value is a ticket-key shape (e.g. `ABC-012`, `ABC-012.md`, `ABC-012#section`) shows that key as a clickable link
- [ ] Clicking the Epic badge link navigates within the app to the resolved ticket route
- [ ] A ticket whose epic value is free text (not a ticket key) renders the Epic badge as plain text, identical to current behavior
- [ ] Clicking the Epic badge link does not simultaneously trigger the parent card/row's primary action
- [ ] Epic badge linking behaves identically across board cards, list rows, ticket detail header, and attributes panel
- [ ] Disabling the global ticket-link toggle disables Epic badge links (consistency with other link surfaces)

### Non-Functional
- [ ] No new runtime dependency introduced
- [ ] No measurable increase in Epic badge render time (link resolution is a single regex classification)

### Edge Cases
- Empty `phaseEpic` — badge does not render (no change from today)
- Self-referential key (a ticket whose epic points to itself) — link renders but behavior follows existing self-reference handling in `SmartLink`
- Malformed near-keys (e.g. `ABC-`, `-012`, `ABC012`) — render as plain text, do not link
- Cross-project keys (`ABC-012` viewed from a `TEST` project) — linkify but resolve against the current project route, **not** the referenced project. This is inherited from `classifyLink`'s ticket-vs-cross-project ordering; see Out of scope §1 and deferred follow-up below
- Value with surrounding whitespace — handled per existing `classifyLink` behavior; document the outcome in architecture

## 5. Verification

### How to Verify Success
- Manual: Set a ticket's `phaseEpic` to a ticket-key shape (`ABC-012`, `ABC-012.md`, `ABC-012#section`) and confirm the Epic badge link navigates on each surface
- Manual: Set `phaseEpic` to free text and confirm plain-text rendering is unchanged
- Automated: Component tests cover the link-vs-plain-text decision for the Epic badge across representative value shapes (`ContextBadge.test.tsx`, MDT-193 block)
- Regression: Existing relationship badge and markdown link tests remain green

## 6. Implementation Notes

### Architecture decision

**Leverage point:** extend `ContextBadge` internally. When `variant === 'phase'`, classify `value` with `classifyLink(value, currentProject)`; if the result type is `TICKET` or `CROSS_PROJECT`, render the value through `<SmartLink>` (link wrapped in a `stopPropagation` span, mirroring `RelationshipBadge.tsx:117-130`); otherwise render plain text as today. Assignee and worktree variants are untouched.

**Wiring:**
- `currentProject` comes from `useParams<{ projectCode: string }>()` inside `ContextBadge` (same pattern as `RelationshipBadge.tsx:77`). The three call sites (`TicketAttributes.tsx:27`, `CompactTicketHeader.tsx:29`, `TicketAttributeTags.tsx:66`) need no changes.
- `<SmartLink link={parsed} currentProject={currentProject} showIcon={false} className="hover:underline">` — same props as the relationship badge for visual parity.
- Global toggles (`enableAutoLinking`, `enableTicketLinks`) flow through `SmartLink` automatically; no new toggle code.
- Existing tests in `ContextBadge.test.tsx` must be wrapped in a `MemoryRouter` (the component will now call `useParams`). New tests cover: bare key → link; cross-project → link; `.md` and `#anchor` suffixes → link; free text → plain; malformed → plain; `enableTicketLinks=false` → plain.

**Boundary:** delegated entirely to `classifyLink`'s existing whole-string ticket regexes (`linkProcessor.ts:85,100`). No new detection logic, no tokenization. Embedded refs in prose remain plain text — a deliberate, documented non-goal.

**Pre-existing limitation surfaced during RED:** `classifyLink` classifies `ABC-012` as `TICKET` (matching the `^([A-Z]+-[A-Z]?\d+)...$` regex) before reaching its cross-project branch, so the Epic badge resolves any `XXX-NNN` value against the **current** project route rather than the referenced project. This is the same behavior `RelationshipBadge` already exhibits and is pinned by `linkProcessor.mdt150.test.ts:119-126`. MDT-193 deliberately does **not** fix this — doing so would change `classifyLink` semantics shared by every link surface and is out of scope. If true cross-project routing for the Epic badge becomes a requirement, file a follow-up CR to either (a) reorder the regex checks in `classifyLink`, or (b) special-case the Epic badge to detect the project-code prefix against the known project registry. Option (a) is the higher-leverage fix but has blast radius; option (b) is localized but diverges Epic badge behavior from `RelationshipBadge`.

## 7. References
- MDT-059 — Smart link conversion infrastructure (the `classifyLink` / `SmartLink` machinery this reuses)
- MDT-135 — Badge module consolidation (where free-text Epic rendering originated)
- MDT-187 — Relationship badge overflow (sister badge; pattern to mirror for linking + click propagation)
- MDT-188 — Dependency graph epic (notes `phaseEpic` is not durable epic identity; context for why schema stays unchanged)

## 8. UAT — 2026-07-18

**Demonstration vehicle:** this CR's own frontmatter sets `phaseEpic: MDT-187`, so the Epic badge on MDT-193 itself exercises the feature against a real referenced ticket.

**Verified:**
- Board / list / ticket-detail header / attributes panel: the MDT-193 Epic badge renders `MDT-187` as a link, not plain text
- Clicking navigates to `/prj/MDT/ticket/MDT-187`
- Parent card/row onClick does not double-fire (click isolation confirmed by component test + E2E)
- Sibling tickets with prose `phaseEpic` (e.g. `Phase A (Foundation)`) render unchanged as plain text — no regression

**Surfaced during UAT (not a blocker, documented in §1 Out of scope and §6):**
- A bare key whose project code differs from the current project (e.g. `ABC-012` viewed from `MDT`) linkifies but resolves against the **current** project route, not `ABC`. This is the pre-existing `classifyLink` ordering limitation shared with `RelationshipBadge`; fixing it is a deferred follow-up, not an MDT-193 regression.

**Acceptance criteria status:** all §4 criteria met except the (withdrawn) cross-project-routing criterion, which was removed from §4 and moved to Out of scope §1 after the limitation was confirmed against `linkProcessor.mdt150.test.ts:119`.

**Test evidence:**
- `bun test src/components/Badge/ContextBadge.test.tsx` → 20/20 pass
- `bun test src/components/Badge/` → 105/105 pass (no regression)
- `bunx playwright test tests/e2e/board/epic-badge-link.spec.ts` → 1/1 pass
- `bun run build` → success
