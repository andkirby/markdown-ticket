# Tasks: MDT-244

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- `domain-contracts/src/config-management/`: two additive selectors + patch schemas only — no API contract changes
- `frontend/src/components/Badge|TicketViewer|`: glyph slot, badge glyph, suppression only — no new glyphs, no styling rewrites
- localStorage preference layer (`browser.*`, `src/config/localStoragePreferences.ts`): untouched

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Key-line composition (priority → key → type → Zap) | `frontend/src/components/TicketCode.tsx` | N/A (single owner by invariant) |
| Badge composition | `frontend/src/components/Badge/TypeBadge.tsx` | N/A |
| Viewer-header suppression | `frontend/src/components/TicketViewer/CompactTicketHeader.tsx` | N/A |
| Option delivery/store | `frontend/src/config/ticketKeyConfig.ts` | N/A |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 1 (registration), Task 4 (E2E over live config API) |
| C2 | Task 1 (defaults), Task 4 (absent-keys scenario) |
| C3 | Task 2 (sizing/colors), Task 4 (E2E) |
| C4 | Task 2 (aria-hidden), Task 4 (E2E) |

## Milestones

| Milestone | BDD Scenarios (BR-X.Y) | Tasks | Checkpoint | Observable Proof |
|-----------|------------------------|-------|------------|------------------|
| M1: config foundation + key-line glyph | BR-1.1, BR-1.2, BR-4.1 | Task 1-2 | unit suites GREEN; E2E key-line scenarios GREEN after M2 header work lands in same run | `bun test frontend/src/config/ticketKeyConfig.test.ts frontend/src/components/TicketCode.test.tsx` |
| M2: badge glyph + suppression | BR-2.1, BR-2.2, BR-3.1 | Task 3 | unit suites GREEN | `bun test frontend/src/components/Badge/TypeBadge.test.tsx frontend/src/components/TicketViewer/CompactTicketHeader.test.tsx` |
| M3: acceptance | all seven scenarios | Task 4 | full E2E spec GREEN | `bun run test:e2e -- tests/e2e/ticket/type-icon-options.spec.ts` |

Task 0 skipped: runtime and all command families already start (baseline recorded in `.pipeline-state.json`); no new packages.

## Tasks

### Task 1: Config foundation — selectors + shared store (M1)

**Structure**: `domain-contracts/src/config-management/selectors.ts`, `domain-contracts/src/config-management/patch-schemas.ts`, `docs/CRs/MDT-168/configuration-exposure.md`, `frontend/src/config/ticketKeyConfig.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-key-config-store` → `frontend/src/config/ticketKeyConfig.test.ts`

**Scope**: register `ui.ticketKey.typeIconNearKey` / `ui.ticketKey.typeIconInBadge` (USER scope, `editable`, owner `settings`, strict boolean patch schemas, exposure-catalog rows); create the shared module store (`get/set/subscribe/useTicketKeyOptions`, defaults off, `loadTicketKeyOptions()` over `fetchConfigSelectors`).
**Boundary**: no Settings UI work (descriptor-driven, appears automatically); no component wiring (Task 2/3).
**Creates**: `frontend/src/config/ticketKeyConfig.ts`
**Modifies**: `domain-contracts/src/config-management/selectors.ts`, `domain-contracts/src/config-management/patch-schemas.ts`, `docs/CRs/MDT-168/configuration-exposure.md`
**Deletes**: None
**Must Not Touch**: `server/`, `localStoragePreferences.ts`, parallel-session files (see `.pipeline-state.json` dirty boundary)
**Exclude**: no API endpoint changes, no migrations
**Anti-duplication**: reuse `fetchConfigSelectors` from `configApiClient.ts` — do NOT add a second config fetch path
**Duplication Guard**: grep for existing `ui.ticketKey` / typeIcon selectors before adding; verify no second runtime owner for option delivery
**Re-plan Trigger**: if `/api/config/selectors` does not deliver values for user-scope selectors, the store cannot read them — revisit delivery with a Decision Needed

**Verify**:
```bash
bun run build:domain-contracts && bun test frontend/src/config/ticketKeyConfig.test.ts
```

**Done when**:
- [x] RED→GREEN on `TEST-ticket-key-config-store`
- [x] Rebuilt domain-contracts picked up by config API (selectors listed)

### Task 2: TicketCode type-glyph slot (M1)

**Skills**: mdt-frontend

**Structure**: `frontend/src/components/TicketCode.tsx` (+ consumes `frontend/src/components/Badge/TypeIcon.tsx` unchanged), `frontend/src/components/TicketCard/ticket.css`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-code-type-slot` → `frontend/src/components/TicketCode.test.tsx`

**Scope**: optional `<TypeIcon type={ticket.type} className="ticket-code__type-icon" />` after `{code}`, before epic Zap, gated by `useTicketKeyOptions().typeIconNearKey` and a present ticket type; `.ticket-code__type-icon` CSS at `var(--sz-icon)` with per-`data-type` `--type-*` color rules (tech-debt → `--text-muted`).
**Boundary**: `TicketCode` stays suppression-agnostic; no changes to priority/epic/worktree markers.
**Creates**: None
**Modifies**: `frontend/src/components/TicketCode.tsx`, `frontend/src/components/TicketCard/ticket.css`
**Deletes**: None
**Must Not Touch**: `badge.css` type-tint rules (badges unchanged), `PriorityIcon.tsx`
**Exclude**: no icon-only mode, no tooltip work
**Anti-duplication**: import `TypeIcon` from `./Badge/TypeIcon` — do NOT inline a second glyph map
**Duplication Guard**: confirm no second component composes `PriorityIcon + code` (STYLING.md invariant)
**Re-plan Trigger**: `useSyncExternalStore` unavailable/misbehaving under happy-dom → fall back to a subscription hook in `ticketKeyConfig.ts`

**Verify**:
```bash
bun test frontend/src/components/TicketCode.test.tsx && bun run build
```

**Done when**:
- [x] RED→GREEN on `TEST-ticket-code-type-slot`
- [x] `bun run build` passes after `ticket.css` change

### Task 3: Badge glyph + viewer-header suppression (M2)

**Skills**: mdt-frontend

**Structure**: `frontend/src/components/Badge/TypeBadge.tsx`, `frontend/src/components/TicketViewer/CompactTicketHeader.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-type-badge-leading-glyph` → `frontend/src/components/Badge/TypeBadge.test.tsx`
- `TEST-viewer-header-suppression` → `frontend/src/components/TicketViewer/CompactTicketHeader.test.tsx`

**Scope**: `TypeBadge` renders a leading `<TypeIcon className="badge__icon" />` when `typeIconInBadge` is on; `CompactTicketHeader` adds `data-testid="ticket-detail-header"` on its root and omits its `TypeBadge` when `typeIconNearKey` is on.
**Boundary**: other `TypeBadge` consumers (`TicketAttributes`, `TicketAttributeTags`) keep working via the same store — no prop threading; attribute-row badges are NOT suppressed.
**Creates**: None
**Modifies**: `frontend/src/components/Badge/TypeBadge.tsx`, `frontend/src/components/TicketViewer/CompactTicketHeader.tsx`
**Deletes**: None
**Must Not Touch**: `StatusBadge`/`PriorityBadge`, viewer body components
**Exclude**: no suppression outside `CompactTicketHeader`
**Anti-duplication**: reuse `badge__icon` sizing class and `useTicketKeyOptions` — do NOT add a parallel option source
**Duplication Guard**: verify only `CompactTicketHeader` suppresses; no second suppression site
**Re-plan Trigger**: a second co-rendering surface (key + badge in one row) discovered → extend suppression there explicitly

**Verify**:
```bash
bun test frontend/src/components/Badge/TypeBadge.test.tsx frontend/src/components/TicketViewer/CompactTicketHeader.test.tsx
```

**Done when**:
- [x] RED→GREEN on both suites
- [x] Existing `TypeBadge` tests still pass (no regression)

### Task 4: Acceptance — E2E gate + Settings + durable docs (M3, checkpoint)

**Skills**: playwright-skill

**Structure**: `tests/e2e/ticket/type-icon-options.spec.ts`, `frontend/src/STYLING.md`

**Makes GREEN (Automated Tests)**:
- `TEST-type-icon-key-options` → `tests/e2e/ticket/type-icon-options.spec.ts`

**Makes GREEN (Behavior)**:
- `key_glyph_enabled_renders_in_key_line`, `key_glyph_disabled_keeps_key_line_unchanged`, `badge_glyph_enabled_shows_leading_glyph`, `badge_glyph_disabled_stays_text_only`, `viewer_header_suppresses_badge_when_key_glyph_shown`, `viewer_header_shows_badge_when_key_glyph_hidden`, `absent_config_keeps_pre_feature_rendering` → `tests/e2e/ticket/type-icon-options.spec.ts`

**Scope**: run the full E2E spec against the live config API path; verify the two toggles render in Settings (descriptor-driven) and persist to `user.toml`; add the type-marker line to STYLING.md § Stable Scanning Patterns; PRIMITIVES.md inventory row for `.ticket-code__type-icon`.
**Boundary**: no flake fixes outside the new spec; worktree-sse/parallel-suite failures out of scope.
**Creates**: None
**Modifies**: `tests/e2e/ticket/type-icon-options.spec.ts` (only if selector/auth wiring needs correction), `frontend/src/STYLING.md`, `frontend/src/PRIMITIVES.md`
**Deletes**: None
**Must Not Touch**: `tests/e2e/sse/`, MDT-183 files
**Exclude**: no icon-only presentation mode
**Anti-duplication**: selectors from `utils/selectors.ts` only
**Duplication Guard**: spec additions stay in the single MDT-244 spec file
**Re-plan Trigger**: config PATCH rejected by test-backend auth → revisit wiring (never fall back to localStorage)

**Verify**:
```bash
bun run test:e2e -- tests/e2e/ticket/type-icon-options.spec.ts
```

**Observe**:
```bash
bun run test:e2e -- tests/e2e/ticket/type-icon-options.spec.ts   # 7 passed; key lines show glyphs only when opted in
```

**Done when**:
- [x] All seven E2E scenarios GREEN
- [x] Settings toggles verified rendering + persisting
- [x] Durable docs updated (final behavior)
- [x] Full local gates pass (validate:ts, eslint, affected bun tests, build)

## Post-Implementation

- [x] No duplication (grep check)
- [x] Scope boundaries respected
- [x] Actual create/modify/delete paths match task mutation intent
- [x] All unit tests GREEN
- [x] All BDD scenarios GREEN
- [x] Milestone observable proofs pass with real execution
- [x] Fallback/absence paths match requirements (absent keys → off)
