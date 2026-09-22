---
code: MDT-247
status: In Progress
dateCreated: 2026-09-22T08:31:16.204Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-244
phaseEpic: MDT-231
---

# Add status icons to ticket key strip and badges

## 1. Description

### Requirements Scope
`full`

### Problem
- `frontend/src/components/TicketCode.tsx:42-46` renders `{PriorityIcon}{key}{TypeIcon}{epic Zap}{worktree}` — priority, type, epic-ness and worktree have positionally-stable markers beside the key; status has none
- `frontend/public/icons/status_svg/` ships 10 ready-made status icons (approved, deferred, implemented, in-progress, in-progress-fast-forward, in-progress-alt-fast-forward, on-hold, partially-implemented, proposed, rejected) and nothing consumes them — repo-wide grep finds only doc mentions (`docs/CRs/MDT-206/goal-prompt.md`), no code or CSS reference
- `frontend/src/components/Badge/StatusBadge.tsx:30-40` renders text-only — no leading glyph, while `frontend/src/components/Badge/PriorityBadge.tsx:40` already shows the parity pattern (`PRIORITY_ICON` map from `priorityIcons.ts`, `<Icon className="badge__icon" strokeWidth={2.5} aria-hidden>` before the label)
- List view has no Status column — desktop table `frontend/src/components/ProjectView.tsx:200-205` shows Code/Title/Attributes/Modified only; mobile list at 234-251 mirrors it
- Pin-bar tooltip co-renders the key and the status badge (`frontend/src/components/PinRail/PinItem.tsx:97,101-105`) — the owner wants the badge replaced by the status icon there
- icon-set drift inside `status_svg/`: 9/10 files are 64×64 with hardcoded hex fills/strokes and `role="img"`/`aria-label`; `in-progress-alt-fast-forward.svg` alone is 24×24 `currentColor`; `README.txt` recommends `in-progress.svg` as the default and mentions only `in-progress-fast-forward.svg` as an alternative (the alt variant is unmentioned)
- `deferred.svg` has no `CRStatus` counterpart — `domain-contracts/src/types/schema.ts:9-17` defines 7 statuses (no "Deferred"); "Deferred" exists only as a hidden board column holding `REJECTED` (`frontend/src/config/statusConfig.ts:107-115`)

### Affected Artifacts
- `frontend/src/components/TicketCode.tsx` — single key-composition point; gains the status icon slot between `<PriorityIcon>` (line 42) and `{code}` (line 43); takes no `status` prop today, so surfaces passing only `priority` (`QuickSearch/QuickSearchResults.tsx:90,280`, `PinRail/PinItem.tsx:97`) need status plumbed through
- `domain-contracts/src/ticket/search.ts:47-62` — `SearchResponseSchema` hits carry only `code`/`title`/`priority` (no `status`), so cross-project QuickSearch hits cannot render the key-strip icon without a contract change — either extend the schema (`status: z.string().nullable().optional()`, mirroring `priority`) or de-scope cross-project hits to graceful absence; current-project hits are unaffected (`Ticket` carries `status`)
- `frontend/src/components/Badge/StatusBadge.tsx` — gains a leading status icon, exactly the way `PriorityBadge.tsx:31-43` works today
- new status-icon registry module (status → icon) beside the Badge components, following the `priorityIcons.ts` map-module pattern (Fast-Refresh-clean)
- the 10 svgs in `frontend/public/icons/status_svg/` — consumed for the first time; dimension/color normalization decisions required (see Open Questions)
- `frontend/src/components/ProjectView.tsx:197-251` — Status column (desktop table) + Status cell (mobile list)
- `frontend/src/components/PinRail/PinItem.tsx:91-106` — tooltip: drop `<StatusBadge>`, show the status icon instead; `PinMetadata` (lines 19-24) already carries `status`, no new data plumbing
- suppression surfaces — everywhere `StatusBadge` co-renders with `TicketCode`: `TicketCard.tsx:42,53` via `TicketAttributeTags.tsx:57` (badge on by default), `TicketAttributes.tsx:23`, `SwimlaneBoard/index.tsx:519,527` (lane header: key + badge side by side)

### Scope
- **Changes**: status icon slot in `TicketCode` (between priority glyph and key), leading icon in `StatusBadge`, no-double-encoding suppression precedence on all co-rendering surfaces, List-view Status column, pin-tooltip badge→icon swap, status-icon registry mapping the 7 `CRStatus` states (deferred + fast-forward variants remain as unmapped assets pending the owner decision — see Acceptance Criteria)
- **Unchanged**: `PriorityIcon` position/behavior, the MDT-244 type icon slot and its options, epic Zap marker, worktree marker (`WORKTREE_ICON`, `uiConfig.ts:11`), badge.css status color tokens, the `CRStatus` enum

## 2. Decision

### Chosen Approach
Render the status icon in the `TicketCode` slot between the priority glyph and the key, give `StatusBadge` a leading icon with exact `PriorityBadge` parity, and suppress the key-strip icon wherever the status badge is already shown — including all board/swimlane ticket cards.

### Rationale
- every surface already routes key rendering through `TicketCode.tsx` (single-composition invariant, its doc comment lines 18-29; STYLING.md § Stable Scanning Patterns) — status gains everywhere-scannability with one edit point, like priority and type before it
- the strip format `{priority}{status}{key}{type}{epic}{worktree}` keeps all glyph markers positionally stable; status slots in as the leftmost context after priority
- suppression mirrors MDT-244's icon-replaces-badge precedence (`CompactTicketHeader.tsx:14-16,31` omits `TypeBadge` when the key glyph is on) — no surface shows status twice
- board/swimlane cards always show `StatusBadge` (`TicketAttributeTags.tsx:57` on by default) — that is the no-icon case, and `ticketCardBadges.ts:39` confirms only PRIORITY is dropped by default, so STATUS badge stays
- `StatusBadge` parity with `PriorityBadge.tsx:40` reuses the proven badge-icon pattern (`badge__icon` class, `aria-hidden`, icon before label)
- epics ride the same machinery — `SwimlaneBoard/index.tsx:519` passes `ticket={lane.epic}` (full ticket incl. status), so epic keys carry the icon on icon-surfaces; badge-co-rendering surfaces (lane header, `index.tsx:527`) suppress per the precedence rule
- the pin tooltip swap needs no new data: `PinMetadata` already carries `status` (`PinItem.tsx:19-24`)
- List-view Status column: the cell value is the `StatusBadge` (with its new icon), so the column reuses the badge rather than introducing a second status rendering

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Key-strip icon + badge icon + suppression precedence** | icon suppresses wherever the badge already shows | **ACCEPTED** — matches the owner's spec; one composition point; no double encoding |
| Badge icon only (no key-strip slot) | status never appears beside the key | key strip stays status-less; loses the everywhere-scannability priority and type already have |
| Always render key-strip icon and badge together | no suppression rule | duplicate status encoding on card/header surfaces |
| Reuse lucide glyphs instead of `status_svg/` | bundled icons, no asset work | discards the owner-provided 10-icon set that already exists in the repo |
| Config-gated via `ui.ticketKey.statusIconNearKey`/`statusIconInBadge` (defaults off) | MDT-244's selector precedent (`selectors.ts:251-264`) | not rejected — open; the owner's spec reads always-on *(Requires mdt:clarification)* |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| status-icon registry module (beside `Badge/`, mirroring `priorityIcons.ts`) | Module | maps the 7 `CRStatus` states → icons; `deferred.svg` + both fast-forward variants carried as unmapped assets pending the owner decision |
| List-view Status column (desktop + mobile, `ProjectView.tsx`) | UI element | cell value is `StatusBadge` with its leading icon |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `frontend/src/components/TicketCode.tsx` | Element added | status icon between `<PriorityIcon>` and `{code}`; accepts status (via `ticket` or a `status` override prop mirroring the existing `priority` override) |
| `frontend/src/components/Badge/StatusBadge.tsx` | Element added | leading status icon, `PriorityBadge.tsx:31-43` parity |
| `frontend/src/components/TicketAttributeTags.tsx` / `TicketCard.tsx` | Behavior added | board/swimlane cards never render the key-strip status icon (badge already encodes status there) |
| `frontend/src/components/TicketViewer/CompactTicketHeader.tsx`, `frontend/src/components/TicketAttributes.tsx` | Behavior added | suppress key-strip status icon on surfaces where `StatusBadge` co-renders (MDT-244 precedence pattern) |
| `frontend/src/components/PinRail/PinItem.tsx` | Element replaced | tooltip: `<StatusBadge>` in `.pin-tooltip__status` → status icon |
| `frontend/src/components/QuickSearch/QuickSearchResults.tsx` | Prop added | pass status to `TicketCode` so key strips in search results carry the icon too; cross-project hits depend on the `SearchResponseSchema` decision (see Affected Artifacts) |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `TicketCode` | status-icon registry | icon for `ticket.status` (or `status` override), rendered between priority glyph and key |
| `StatusBadge` | status-icon registry | leading icon keyed by `formatDataAttr(status)` |
| `PinItem` tooltip | `TicketCode` + registry | status flows from existing `PinMetadata.status`; badge block removed |
| List view (`ProjectView.tsx`) | `StatusBadge` | new column/cell renders the badge component unchanged |

### Key Patterns
- Single-composition invariant: key-layout changes happen only in `TicketCode.tsx`, never per-surface
- Suppression precedence: key-strip status icon yields to any co-rendered `StatusBadge` (MDT-244 pattern, `CompactTicketHeader.tsx:31`)
- Fast-Refresh map-module pattern: the status→icon map lives in a plain module beside the component, like `priorityIcons.ts`
- Badge-icon parity: `badge__icon` class, `aria-hidden` icon, label remains the accessible name

## 5. Acceptance Criteria

### Functional
- [ ] `TicketCode` renders `{priority}{status icon}{key}{type}{epic}{worktree}` — status icon sits between the priority glyph and the key
- [ ] the status-icon registry maps the 7 `CRStatus` states (`domain-contracts/src/types/schema.ts:9-17`) — proposed, approved, in-progress, implemented, rejected, on-hold, partially-implemented — with `in-progress.svg` as the In Progress glyph (`status_svg/README.txt` default)
- [ ] `deferred.svg` and both fast-forward variants ship as assets but stay unmapped (design decision, `docs/CRs/MDT-247/ux-design.md`: no `CRStatus` exists for deferred; no data distinguishes the fast-forward variants) — a deviation from owner requirement 1's explicit 10-icon list, carried here as an owner decision — *(Requires mdt:clarification)*
- [ ] board and swimlane ticket cards show NO key-strip status icon (the `StatusBadge` in `TicketAttributeTags` already encodes status there)
- [ ] every surface where `StatusBadge` co-renders with the key strip suppresses the key-strip status icon — viewer header/attributes, swimlane lane header — no double encoding
- [ ] `StatusBadge` renders a leading status icon exactly as `PriorityBadge` does today (icon before label)
- [ ] List view has a Status column (desktop table and mobile list); the cell value is the `StatusBadge` with its icon
- [ ] pin-bar ticket tooltip no longer shows the status badge; it shows the status icon instead
- [ ] epic keys carry the status icon on icon-surfaces (QuickSearch, pin tooltip); badge-co-rendering surfaces (lane header, viewer) suppress
- [ ] missing/unknown status: no key-strip icon rendered, badge behavior unchanged
- [ ] cross-project QuickSearch hits: either `SearchResponseSchema` (`domain-contracts/src/ticket/search.ts:47-62`) gains `status` (`z.string().nullable().optional()`, mirroring `priority`) so those key strips render the icon, or cross-project hits are de-scoped to graceful absence (no icon) — *(Requires mdt:clarification)*, decide before Tests
- [ ] always-on vs config-gated (`ui.ticketKey.statusIconNearKey`/`statusIconInBadge` selectors per MDT-244's `selectors.ts:251-264` precedent, defaults off) — *(Requires mdt:clarification)*; owner spec reads always-on
- [ ] in-progress variant: the design uses `in-progress.svg` (`status_svg/README.txt` default) and leaves both fast-forward variants unmapped — confirm or override — *(Requires mdt:clarification)*

### Non-Functional
- [ ] icons legible at `--sz-icon` (16px) in both themes on board, list, viewer, pin tooltip
- [ ] key-strip status icon is `aria-hidden` with a native `<title>` hover tooltip carrying the status name (MDT-244 precedent, CR line 94); badge text remains the accessible name
- [ ] icon color strategy decided: svgs carry hardcoded hex (9/10) vs badge.css `data-status` theme colors via `currentColor` — *(Requires mdt:clarification)*
- [ ] delivery path decided: serving from `public/` (URL references) vs bundling as components — `public/` refs would break MDT-244's no-new-network-requests pattern (its non-functional AC, CR line 99) — *(Requires mdt:clarification)*
- [ ] `in-progress-alt-fast-forward.svg` dimension drift (24×24 `currentColor` vs 64×64 hex) normalized

### Testing
- Unit: `TicketCode` with a status → icon present, positioned between `PriorityIcon` and code; without status → absent
- Unit: `StatusBadge` → leading icon present with `badge__icon` class
- Unit: card/`TicketAttributeTags` → no key-strip status icon while badge shows; suppression surfaces (viewer, lane header) → no key-strip icon
- Unit: `PinItem` tooltip → no `StatusBadge`, status icon present
- Unit/E2E: list view (desktop + mobile) → Status column renders the badge cell
- Manual: board, swimlane, list, viewer, QuickSearch, pin tooltip — both themes, 16px legibility

## 6. Verification

### By CR Type
- Artifact `TicketCode.tsx` renders the status slot; unit tests above pass; manual visual pass on board + list + viewer + pin rail in both themes

### Metrics
- none — visual feature with no baseline metric; verifiable artifacts are the acceptance criteria above

## 7. Deployment

- Ships via normal `bun run build`; svg assets already sit in `frontend/public/icons/status_svg/` — no new dependency
- if the config-selector route is chosen, two user-scope selectors register like MDT-244's (`domain-contracts/src/config-management/selectors.ts`), defaults off, no configuration migration; if always-on, no config surface changes