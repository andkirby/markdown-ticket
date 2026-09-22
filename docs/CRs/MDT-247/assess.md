# Assessment: MDT-247

**Generated**: 2026-09-22 · Stage: `mdt:assess` · Inputs: CR `docs/CRs/MDT-247-status-icon-integration.md`, `docs/CRs/MDT-247/ux-design.md` (pre-existing, gate-approved), source verification of every CR line reference (all confirmed current at commit `31c41375`)

## Verdict

**Recommendation**: Option 1 — Integrate As-Is

## Feature Pressure

### Target Feature Needs
- a status glyph slot in the key strip (`TicketCode`) between the priority glyph and the key, mirroring how priority (MDT-135) and type (MDT-244) already render
- a leading icon in `StatusBadge` with exact `PriorityBadge` parity (`badge__icon`, `aria-hidden`, icon before label)
- suppression of the key-strip glyph on every surface that co-renders `StatusBadge` (board/swimlane cards, cloud stub, viewer header/attributes, swimlane lane header, list rows) — one status encoding per surface
- status plumbing to the two stub surfaces that pass only `priority` today: QuickSearch results (current + cross-project) and the pin tooltip
- a status→icon registry module (`priorityIcons.ts` pattern, Fast-Refresh-clean) mapping the 7 `CRStatus` states
- a List-view Status column (desktop table + mobile mapping)
- pin tooltip: `StatusBadge` block replaced by the strip status glyph (data already in `PinMetadata.status`)
- 10 `status_svg/` assets normalized to inline React glyph components (24×24 viewBox + `currentColor`, fixing the 64×64/hex and alt-fast-forward drift)

### Current System Assumptions
- `TicketCode.tsx:42-46` is the single key-composition point (`{priority}{key}{type}{epic Zap}{worktree}`) with an established override-prop pattern (`priority` for surfaces lacking a full ticket)
- `PriorityBadge.tsx:40` + `priorityIcons.ts` establish the badge-icon and map-module patterns
- MDT-244 established icon-vs-badge suppression precedence (`CompactTicketHeader.tsx:31` omits `TypeBadge` when the key glyph is on)
- `SearchResponseSchema` (`domain-contracts/src/ticket/search.ts:47-62`) carries only `code`/`title`/`priority` per cross-project hit
- board/swimlane cards always render `StatusBadge` via `TicketAttributeTags.tsx:56-58` (`ticketCardBadges.ts` drops only PRIORITY by default)

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | one composition point absorbs the change; no ownership warping — same shape as MDT-244's type-icon slot |
| Extension Fit | Healthy | every seam exists: strip slot + override prop, badge-icon pattern, map-module pattern, suppression precedence |
| Dependency Fit | Healthy | no new packages; glyphs bundle inline (no `public/` URLs → no new network requests); schema change (if taken) is one additive optional field mirroring `priority` |
| Verification Fit | Healthy | 138/138 baseline unit tests green over the exact touched dirs (`Badge/` + `TicketCode.test.tsx`); ESLint clean on all 9 target files |
| Redesign Scope | Healthy | local only; no module boundary moves |

## Mismatch Points

All mismatches are local design decisions already scoped by the CR, not structural:

### Status plumbing to stub surfaces
- Current system assumes: surfaces without a full `Ticket` pass `priority` override (`QuickSearchResults.tsx:90,280`, `PinItem.tsx:97`)
- Feature needs: a parallel `status` override (or ticket pass-through)
- Mismatch: none structural — the override-prop seam exists and extends naturally
- Adjustment required: add `status?: string` to `TicketCodeProps` (architecture decides exact shape)
- Scope: local

### Suppression on badge-co-rendering surfaces
- Current system assumes: viewer header and lane header pass the full `ticket` (status included), so a naive strip icon would double-encode beside `StatusBadge`
- Feature needs: an explicit opt-out on those surfaces (inverse of MDT-244, which suppressed the *badge*)
- Adjustment required: a suppress prop (or omission discipline) on `TicketCode` — architecture decides the mechanism
- Scope: local

### Cross-project search contract gap
- Current system assumes: cross-project hits carry no `status` (`search.ts:47-62`)
- Feature needs: either `status: z.string().nullable().optional()` (mirroring `priority`) + server population, or graceful absence on cross-project hits
- Mismatch: additive-only; older servers just omit the field and the strip degrades to no icon (the graceful-absence AC already covers it)
- Adjustment required: schema field + server response building + one contract test if extension is chosen (decision recorded in Requirements)
- Scope: local (bounded to `domain-contracts` + the search service)

### SVG asset normalization
- Current system assumes: `status_svg/` assets are untouched raw files (9/10 at 64×64 hardcoded hex; `in-progress-alt-fast-forward.svg` at 24×24 currentColor)
- Feature needs: normalized inline React components (~24×24 viewBox, `currentColor`, lucide-ish ~2 stroke)
- Adjustment required: port glyphs into the registry module at normalization time; raw assets remain as source-of-truth references
- Scope: local asset work

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: none for the always-on design (the open `ui.ticketKey.statusIcon*` selector route would add two user-scope selectors — deferred, not needed for this CR as specified)
- Testing/E2E impact: existing pin-tooltip and list-view E2E specs may assert the current badge markup; they get updated with the feature, not before
- Main risk introduced: none systemic — the largest blast radius is `TicketCode`, whose 60+ consumers all inherit the new slot automatically; suppression discipline is the only correctness risk and it is unit-testable per surface

## Verification Gaps

- Preservation tests needed: none beyond baseline — the strip/badge suites are green and lock current behavior; new assertions land with the feature (CR §5 Testing)
- E2E/contract drift risks: pin tooltip markup swap, list-view new column — both inside this CR's diff
- Safe-to-refactor now?: yes

## Recommendation

### Option 1: Integrate As-Is
Use when: every needed pattern (strip slot, override prop, badge icon, map module, suppression precedence) already exists and was proven by MDT-244/MDT-135; the only contract question (cross-project `status`) is additive and degrades gracefully
Architecture impact: minimal — architecture stage decides the suppression mechanism and the registry module's exact shape

**Next**: `mdt:requirements MDT-247` (per pipeline order; CR clarification slots resolved there)
