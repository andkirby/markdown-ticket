# Tasks: MDT-247

**Source**: canonical architecture/tests/bdd state + [tasks.trace.md](./tasks.trace.md)
**Generated**: 2026-09-22 · Stage: `mdt:tasks`

## Scope Boundaries

- Key strip: only `TicketCode.tsx` mutates strip layout; glyph presence = explicit `status` prop (NO `ticket.status` fallback — suppression is structural)
- Badge: only `StatusBadge.tsx` renders the badge glyph; `PriorityBadge` parity (icon before label, `badge__icon`, aria-hidden)
- Registry: exactly the 7 `CRStatus` kebels; `deferred`/fast-forward assets stay unmapped
- Contract: `SearchResponseSchema.status` is additive optional; server populates from `cr.status ?? null`
- List: desktop column between Title and Attributes; mobile untouched (lead tag IS the status column)

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|-------------------------------|
| Strip glyph slot + order | `frontend/src/components/TicketCode.tsx` | N/A (single owner by invariant) |
| Glyph lookup + registry | `frontend/src/components/Badge/StatusIcon.tsx` + `statusIcons.ts` | N/A |
| Badge glyph | `frontend/src/components/Badge/StatusBadge.tsx` | N/A |
| Cross-project hit shape | `domain-contracts/src/ticket/search.ts` (schema) + `server/services/TicketService.ts` (populate) | N/A |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 (16px/12px legibility) | Task 2 (strip sizing), Task 3 (badge sizing); manual both-theme pass at checkpoint |
| C2 (aria-hidden + native title) | Task 1, Task 2 |
| C3 (currentColor + existing tokens) | Task 2 |
| C4 (inline bundled, no public URLs) | Task 1 |
| C5 (24×24 viewBox normalization) | Task 1 |
| C6 (deferred + fast-forwards unmapped) | Task 1 |
| C7 (unchanged sibling markers/enum) | Task 2 (regression locks) |
| C8 (contract additive + optional) | Task 4 |

## Architecture Coverage Check

All 13 canonical architecture paths map to task mutation fields; 3 missing paths (`statusGlyphs.tsx`, `statusIcons.ts`, `StatusIcon.tsx`) each appear in Task 1 `Creates`. Gap = 0. No Task 0: runtime and all command families already start (baseline 138/138 + eslint clean).

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint | Observable Proof |
|-----------|---------------|-------|------------|------------------|
| M1: Registry + strip core | BR-1.2, BR-1.4, BR-1.9 | 1–2 | Unit suites GREEN | `bun test frontend/src/components/Badge/StatusIcon.test.tsx frontend/src/components/TicketCode.test.tsx` |
| M2: Badge glyph | BR-1.3, BR-1.10 | 3 | Unit suite GREEN | `bun test frontend/src/components/Badge/StatusBadge.test.tsx` |
| M3: Icon-surfaces (search + pin) | BR-1.1, BR-1.7, BR-1.8 | 4–5 | Unit + server contract GREEN | `bun run --cwd server jest tests/api/projects.search.test.ts` |
| M4: List column + E2E | BR-1.5, BR-1.6 + all 10 re-verified | 6–7 | FULL E2E suite GREEN | `bun run test:e2e -- tests/e2e/ticket/status-icons.spec.ts` |

## Tasks

### Task 1: Create the status glyph module set (M1)

**Skills**: mdt-frontend
**Milestone**: M1 — registry (BR-1.2)
**Structure**: `frontend/src/components/Badge/`

**Makes GREEN (Automated Tests)**:
- `TEST-status-icon-unit` → `frontend/src/components/Badge/StatusIcon.test.tsx`: all suites

**Makes GREEN (Behavior)**:
- `every_status_has_exactly_one_glyph` (BR-1.2) — unit-verified at this milestone; E2E re-verified at M4

**Scope**: port the 7 mapped owner glyphs from `frontend/public/icons/status_svg/` into normalized inline components; the map module; the lookup component.
**Boundary**: no component consumes the glyphs yet (Task 2/3 wire them); no CSS (Task 2).
**Creates**:
- `frontend/src/components/Badge/statusGlyphs.tsx` — 7 SVG components (Proposed, Approved, In Progress, Implemented, Rejected, On Hold, Partially Implemented), each 24×24 viewBox, `currentColor` fill/stroke, ~2 stroke weight, ported shape from the owner svgs (fix the 64×64/hex drift; the alt-fast-forward 24×24 form is the normalization reference)
- `frontend/src/components/Badge/statusIcons.ts` — `STATUS_ICON: Record<string, StatusGlyph>` keyed by `formatDataAttr(status)` (mirrors `typeIcons.ts`; non-component module for Fast-Refresh)
- `frontend/src/components/Badge/StatusIcon.tsx` — lookup component mirroring `TypeIcon.tsx`: `{status?, className?, title?}` → `svg[data-status=kebab] aria-hidden` with optional `<title>` child; unmapped/missing → `null`

**Modifies**: None
**Deletes**: None
**Must Not Touch**: `status_svg/` assets (remain in place as unmapped source-of-truth), `typeIcons.ts`, `priorityIcons.ts`
**Exclude**: no lucide substitutions; no mapping `deferred`, `in-progress-fast-forward`, `in-progress-alt-fast-forward` (C6); no `public/` URL references (C4)
**Anti-duplication**: import `formatDataAttr` from `./utils` — do NOT re-implement kebab-case
**Duplication Guard**: owner-check — glyph lookup must not re-implement `TypeIcon` logic generically; status keeps its own component (parallel to type, not shared abstraction)
**Re-plan Trigger**: an owner glyph that cannot be normalized to 24×24 currentColor without losing meaning
**Verify**:
```bash
bun test frontend/src/components/Badge/StatusIcon.test.tsx
```
**Done when**:
- [x] RED→GREEN for TEST-status-icon-unit
- [x] 7 distinct glyph shapes asserted; In Progress = play
- [x] No new tokens, no URL fetches

### Task 2: TicketCode status slot + strip CSS (M1)

**Skills**: mdt-frontend
**Milestone**: M1 — strip core (BR-1.1, BR-1.4, BR-1.9)
**Structure**: `frontend/src/components/TicketCode.tsx`, `frontend/src/components/TicketCard/ticket.css`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-code-status-slot-unit` → `frontend/src/components/TicketCode.test.tsx`: status-slot describe

**Makes GREEN (Behavior)**:
- `strip_glyph_suppressed_where_badge_renders` (BR-1.4), `unknown_status_renders_no_glyph` (BR-1.9) — unit-verified; E2E re-verified at M4

**Scope**: add the `status?: string` prop rendering `<StatusIcon status className="ticket-code__status-icon" title={status} />` between `<PriorityIcon>` and `{code}`; strip CSS.
**Boundary**: glyph renders IFF the prop is passed AND mapped — never reads `ticket.status` (structural suppression). No call-site changes in this task.
**Creates**: None
**Modifies**:
- `frontend/src/components/TicketCode.tsx` — prop + glyph slot (keep priority/type/epic/worktree untouched, C7)
- `frontend/src/components/TicketCard/ticket.css` — `.ticket-code__status-icon` sizing at the `--sz-icon` 16px slot (mirror `.ticket-code__type-icon`) + `[data-status]` fg color rules mirroring badge.css's status→`--status-*` mapping (proposed→backlog, approved→open, in-progress/partially-implemented→progress, implemented→done, rejected→rejected, on-hold→hold) (C1, C3)

**Deletes**: None
**Must Not Touch**: `TicketCard.tsx`, `CompactTicketHeader.tsx`, `SwimlaneBoard/`, `CloudProjectionStub.tsx`, `ProjectView.tsx` (suppression = they never pass status)
**Exclude**: no `ui.ticketKey.statusIcon*` selectors (always-on per requirements); no suppression boolean
**Anti-duplication**: import `StatusIcon` from `./Badge/StatusIcon` — do NOT inline glyph JSX in TicketCode
**Duplication Guard**: verify no second key-composition point appears; strip layout stays single-owner
**Re-plan Trigger**: a consumer found rendering `<StatusIcon>` outside TicketCode/StatusBadge
**Verify**:
```bash
bun test frontend/src/components/TicketCode.test.tsx
bunx eslint frontend/src/components/TicketCode.tsx
```
**Done when**:
- [x] RED→GREEN for TEST-ticket-code-status-slot-unit
- [x] Order priority→status→key holds; title tooltip present; no-prop → no glyph even with ticket.status

### Task 3: StatusBadge leading glyph (M2)

**Skills**: mdt-frontend
**Milestone**: M2 — badge glyph (BR-1.3, BR-1.10)
**Structure**: `frontend/src/components/Badge/StatusBadge.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-status-badge-glyph-unit` → `frontend/src/components/Badge/StatusBadge.test.tsx`: leading-glyph describe

**Makes GREEN (Behavior)**:
- `status_badge_leads_with_glyph` (BR-1.3), `invalid_status_uses_rejected_glyph_and_invalid_colors` (BR-1.10) — unit-verified; E2E re-verified at M4

**Scope**: render `<StatusIcon status={isInvalid ? 'Rejected' : status} className="badge__icon" />` before the label (no title — label adjacent, C2).
**Boundary**: badge keeps its own `data-status` (invalid stays "invalid"); only the GLYPH lookup shifts to rejected when `isInvalid`.
**Creates**: None
**Modifies**: `frontend/src/components/Badge/StatusBadge.tsx`
**Deletes**: None
**Must Not Touch**: `badge.css` color rules (existing tokens suffice, C3/C7), `PriorityBadge.tsx`
**Exclude**: no aria changes — label remains the accessible name
**Anti-duplication**: import `StatusIcon`; reuse `.badge__icon` sizing — do NOT add a new badge-icon class
**Duplication Guard**: glyph-before-label must follow `PriorityBadge.tsx:40` shape exactly; no parallel icon pattern
**Re-plan Trigger**: `.badge__icon` proves insufficient for ported glyph geometry
**Verify**:
```bash
bun test frontend/src/components/Badge/StatusBadge.test.tsx
```
**Done when**:
- [x] RED→GREEN for TEST-status-badge-glyph-unit
- [x] Invalid → `svg.badge__icon[data-status="rejected"]` inside `.badge[data-status="invalid"]`

### Task 4: Search contract + server + QuickSearch plumbing (M3)

**Skills**: mdt-frontend
**Milestone**: M3 — icon-surfaces (BR-1.8)
**Structure**: `domain-contracts/src/ticket/search.ts`, `server/services/TicketService.ts`, `frontend/src/components/QuickSearch/QuickSearchResults.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-search-contract-status` → `server/tests/api/projects.search.test.ts`: "includes the ticket status in cross-project hits"
- `TEST-quicksearch-status-glyph-unit` → `frontend/src/components/QuickSearch/__tests__/QuickSearchResults.test.tsx`: status-glyph describe

**Makes GREEN (Behavior)**:
- `quick_search_hit_shows_status_glyph`, `cross_project_hit_shows_status_glyph` (BR-1.8) — unit/server-verified; E2E re-verified at M4

**Scope**: schema gains `status: z.string().nullable().optional()` (C8, mirrors `priority`); server populates `cr.status ?? null` (interface at line 34 + hit at ~line 495); QuickSearch passes `status` on current (`ticket.status`) and cross (`result.ticket.status ?? undefined`) hits.
**Boundary**: additive only — no field renames, no removals; older responses degrade to no glyph.
**Creates**: None
**Modifies**:
- `domain-contracts/src/ticket/search.ts` — `SearchResponseSchema.ticket.status`
- `server/services/TicketService.ts` — `SearchResultItem.ticket.status` + hit building
- `frontend/src/components/QuickSearch/QuickSearchResults.tsx` — both TicketCode call sites (lines ~90, ~280)

**Deletes**: None
**Must Not Touch**: `SearchController.ts` unified-search shape (separate contract), MCP tools, `SearchRequestSchema`
**Exclude**: no requirement that status be present (optional; absence = graceful)
**Anti-duplication**: reuse the existing `SearchResponse` type — do NOT define a local hit interface in the frontend
**Duplication Guard**: exactly one hit-building site in `TicketService.searchTickets`; verify no second builder appears
**Re-plan Trigger**: server CR parse path that does not carry status
**Verify**:
```bash
bun run --cwd server jest tests/api/projects.search.test.ts
bun test frontend/src/components/QuickSearch/__tests__/QuickSearchResults.test.tsx
```
Note: rebuild domain-contracts (`bun run build:domain-contracts` or via dev:full) before server tests; a stale running server won't see the new shared build.
**Done when**:
- [x] RED→GREEN both suites
- [x] Cross hit without status renders no glyph (older-contract test GREEN)

### Task 5: PinItem tooltip swap (M3)

**Skills**: mdt-frontend
**Milestone**: M3 — icon-surfaces (BR-1.7, Edge-1)
**Structure**: `frontend/src/components/PinRail/PinItem.tsx`

**Makes GREEN (Behavior)**:
- `pin_tooltip_shows_status_glyph_not_badge` (BR-1.7) + `TEST-e2e-status-icons` (pin test) — E2E-verified at M4; tooltip content does not mount in happy-dom (probe-proven), so this task's proof is Task 7's E2E run plus typecheck/lint

**Scope**: remove the `.pin-tooltip__status` block + `StatusBadge` import; pass `status={metadata?.status}` to the existing `<TicketCode>`.
**Boundary**: aria-label keeps `"({status})"`; tooltip mechanics (Radix portaled hover) untouched; `metadata: null` → no glyph (Edge-1, free via undefined status).
**Creates**: None
**Modifies**: `frontend/src/components/PinRail/PinItem.tsx`
**Deletes**: the `.pin-tooltip__status` div block (and its CSS rule in `pin-rail.css` if now orphaned)
**Must Not Touch**: `pin-rail.css` layout rules beyond the orphaned status block, `PinRailToggle`, pin seeding API
**Exclude**: no new tooltip content structure — glyph rides the EXISTING TicketCode line
**Anti-duplication**: keep rendering the key via canonical `<TicketCode>` — never hand-compose the glyph beside the code
**Duplication Guard**: exactly one status encoding in the tooltip after the swap (grep `.pin-tooltip__status` = 0 hits)
**Re-plan Trigger**: None (local mechanical work)
**Verify**:
```bash
bun run validate:ts
bunx eslint frontend/src/components/PinRail/PinItem.tsx
```
**Done when**:
- [x] No `StatusBadge` import remains in PinItem
- [x] `status={metadata?.status}` flows to TicketCode

### Task 6: List Status column (M4)

**Skills**: mdt-frontend
**Milestone**: M4 — list column (BR-1.5, BR-1.6)
**Structure**: `frontend/src/components/TicketAttributeTags.tsx`, `frontend/src/components/ProjectView.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-attribute-tags-exclude-status-unit` → `frontend/src/components/TicketAttributeTags.test.tsx`: excludeStatus describe

**Makes GREEN (Behavior)**:
- `desktop_list_status_column` (BR-1.5), `mobile_list_lead_status_tag` (BR-1.6) — E2E-verified at Task 7

**Scope**: `TicketAttributeTags` gains `excludeStatus?: boolean` (hides the STATUS badge when set); desktop table gains `<TableHead>Status</TableHead>` between Title and Attributes with cell `<StatusBadge status={ticket.status} isInvalid={!VALID_STATUSES.includes(...)}>`; desktop Attributes cell passes `excludeStatus`; mobile block unchanged.
**Boundary**: cell value is the shared `StatusBadge` — no second status rendering; mobile lead tag IS the status column.
**Creates**: None
**Modifies**:
- `frontend/src/components/TicketAttributeTags.tsx` — prop + STATUS gate
- `frontend/src/components/ProjectView.tsx` — desktop column + cell + `excludeStatus` on the desktop Attributes cell

**Deletes**: None
**Must Not Touch**: mobile card block, sort controls, `ticketCardBadges` config (board defaults unchanged)
**Exclude**: no Status sorting (not in scope); no mobile-only status element
**Anti-duplication**: import `VALID_STATUSES` from `../utils/ticketStatus` — same invalid computation as `TicketCard.tsx:25`
**Duplication Guard**: one badge per desktop row — the excludeStatus gate is the only dedup mechanism
**Re-plan Trigger**: desktop table layout breaks at the new column width (needs a column-visibility config instead)
**Verify**:
```bash
bun test frontend/src/components/TicketAttributeTags.test.tsx
bunx eslint frontend/src/components/ProjectView.tsx frontend/src/components/TicketAttributeTags.tsx
```
**Done when**:
- [x] RED→GREEN for TEST-attribute-tags-exclude-status-unit
- [x] Desktop row: exactly one `.badge[data-status]`; mobile card: exactly one

### Task 7: Checkpoint — durable docs + full E2E + gates (M4)

**Skills**: mdt-frontend
**Milestone**: M4 — all scenarios re-verified
**Structure**: `frontend/src/STYLING.md`, `tests/e2e/ticket/status-icons.spec.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-status-icons` → `tests/e2e/ticket/status-icons.spec.ts`: all 6 tests

**Makes GREEN (Behavior)**: all 10 scenarios (final executable verification of the full matrix)

**Scope**: land the deferred durable-doc updates (UX milestone rule: they spec runtime behavior, so they land with the implementation commit): `frontend/src/STYLING.md` § Stable Scanning Patterns gains the status-marker bullet between Priority and Type (strip format `{priority}{status}{key}{type}{epic}{worktree}`, suppression rule, icon-surfaces list); optionally `styleguide.html` status-icons section beside `#type-icons`; then run every gate.
**Boundary**: no code changes in this task unless E2E exposes a defect (record any fix under Post-Verify Fixes).
**Creates**: None (STYLING.md edit is a modification)
**Modifies**:
- `frontend/src/STYLING.md` — status-marker pattern bullet
- `tests/e2e/ticket/status-icons.spec.ts` — only if a wait/selector fix is required by real-run evidence

**Deletes**: None
**Must Not Touch**: implementation files (defects route back to their owning task)
**Exclude**: no new list-view.spec.md (requirements decision: contract lives in the CR)
**Anti-duplication**: STYLING bullet references the pattern, not a copy of the registry
**Duplication Guard**: N/A (docs + verification)
**Re-plan Trigger**: E2E exposing a wrong DOM contract assumption (route back to architecture before patching)
**Verify**:
```bash
bun run test:e2e -- tests/e2e/ticket/status-icons.spec.ts
bun run validate:ts
bunx eslint frontend/src/components/Badge/ frontend/src/components/TicketCode.tsx frontend/src/components/PinRail/PinItem.tsx frontend/src/components/QuickSearch/QuickSearchResults.tsx frontend/src/components/ProjectView.tsx frontend/src/components/TicketAttributeTags.tsx
bun test frontend/src/components/Badge/ frontend/src/components/TicketCode.test.tsx frontend/src/components/TicketAttributeTags.test.tsx frontend/src/components/QuickSearch/__tests__/QuickSearchResults.test.tsx
```
**Observe**:
```bash
bun run test:e2e -- tests/e2e/ticket/status-icons.spec.ts   # 6/6 GREEN, including both-theme manual visual pass at user review
```
**Done when**:
- [x] 6/6 E2E GREEN; 10/10 scenarios closed
- [x] validate:ts + eslint clean on touched files
- [x] All unit suites GREEN (no baseline regressions)
- [x] STYLING.md pattern bullet landed

## Post-Implementation

- [x] No duplication (grep: no second strip composition, no second hit builder, no `.pin-tooltip__status`)
- [x] Scope boundaries respected
- [x] Actual create/modify/delete paths match task mutation intent
- [x] All unit tests GREEN
- [x] All BDD scenarios GREEN
- [x] Milestone observable proofs pass with real execution
- [x] Fallback/absence paths match requirements (unmapped status, null metadata, older contract)

## Post-Verify Fixes (recorded by `mdt:implement`)

- (none yet)
