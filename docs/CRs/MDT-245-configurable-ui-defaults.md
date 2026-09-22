---
code: MDT-245
status: Proposed
dateCreated: 2026-09-05T13:21:08.027Z
type: Feature Enhancement
priority: Medium
---

# Expose tooltip delay and ticketsPath defaults as owner config

## 1. Description

### Requirements Scope
`full`

### Problem
- `TooltipProvider` hard-codes `delayDuration = 50` in `frontend/src/components/ui/tooltip.tsx:6`; every tooltip in the app inherited a new delay with no way to turn it off or tune it.
- `DEFAULTS.TICKETS_PATH = 'docs/CRs'` in `shared/utils/constants.ts:129` is hard-coded in code and duplicated as literal `'docs/CRs'` fallbacks in at least 5 frontend files (`config/documentNavigation.ts:13`, `utils/markdownPreprocessor.ts:438,476,625`, `components/routes/ProjectOverlays.tsx:134`, `components/AddProjectModal/hooks/useProjectForm.ts:29`, `components/DocumentsView/PathSelector.tsx:88`); changing the deployment layout requires a code change.
- The config-management allowlist (`domain-contracts/src/config-management/selectors.ts`) has no selectors for either value, so both are invisible to Settings → Advanced and to `bun run inspect:config`.

### Affected Artifacts
- `frontend/src/components/ui/tooltip.tsx` (delayDuration source)
- `frontend/src/components/SettingsModal/BackendConfigSection.tsx` (number-render predicate)
- `frontend/src/hooks/useBackendConfig.ts` (consumer refresh coupling)
- `server/routes/system.ts` (non-owner effective-UI read `GET /api/config/selector`)
- `shared/utils/constants.ts` (DEFAULTS.TICKETS_PATH)
- `shared/services/project/ProjectConfigService.ts`, `shared/services/project/ProjectFactory.ts`, `shared/services/ticket/TicketLocationResolver.ts`, `shared/services/TicketService.ts`, `shared/services/project/ProjectRegistry.ts` (ticketsPath resolution chain)
- `domain-contracts/src/config-management/selectors.ts` (allowlist)
- Server global config adapter (`server/services/config/adapters/GlobalConfigStorageAdapter.ts`) for new `[ui.tooltip]` / default-ticketsPath keys
- Docs: `docs/CONFIG_GLOBAL_SPECIFICATION.md`, `docs/CONFIG_SPECIFICATION.md`, `docs/CONFIG_INSPECTION.md`, `prompts/QUICKREF.md`

### Scope
- **Changes**: two new owner-only global selectors; tooltip delay becomes configurable; built-in ticketsPath default changes to `.tickets`; frontend literal fallbacks consume the effective default; durable config docs upgraded.
- **Unchanged**: per-project `project.ticketsPath` in `.mdt-config.toml` still wins over any global default (projects that pin `docs/CRs` — including this repo — keep working); guarded selectors stay guarded; browser-only prefs stay in localStorage (BR-6.1).

## 2. Decision

### Chosen Approach
Add two EDITABLE global selectors to the MDT-168 allowlist (`ui.tooltip.delayMs`, `project.defaultTicketsPath`), change the built-in `DEFAULTS.TICKETS_PATH` to `.tickets`, and render both in Settings → Advanced via the existing `BackendConfigSection`.

### Rationale
- Reuses the whole MDT-168 pipeline (allowlist → adapters → config API → BackendConfigSection); no new UI machinery.
- EDITABLE exposure matches the existing filter in `BackendConfigSection.tsx` (only `editable` + `global`/`user` render there), so both settings appear in Advanced with zero section changes beyond a number-input predicate extension.
- Global scope (config.toml) matches the request: owner decides once for every viewer/project; per-project override path already exists and stays authoritative.
- Changing the built-in default to `.tickets` declutters `docs/` while remaining invisible to projects that already pin `ticketsPath`.
- Trade-off accepted: `project.defaultTicketsPath` is EDITABLE rather than GUARDED (unlike `project.ticketsPath`), because it only affects projects with no explicit path; validation is strict (relative, no `..`, no absolute).

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Allowlist + BackendConfigSection (chosen)** | Two allowlist entries + defaults change | **ACCEPTED** - smallest diff through an existing, tested pipeline |
| Browser localStorage pref for tooltip delay | Per-visitor setting | Wrong layer: request is owner-only/global; BR-6.1 forbids shared behavior in browser prefs |
| GUARDED exposure for defaultTicketsPath | Confirmation workflow like `project.ticketsPath` | Would not render in Advanced (BackendConfigSection filters to editable); blast radius is limited to unpinned projects |
| SSE config:changed event for live refresh | Wider selector-refresh contract | Follow-up CR territory (noted in `useBackendConfig.ts`); page context already re-reads on next tooltip mount |
| Hard-code `.tickets` without a config knob | Code-only default change | Does not satisfy the override requirement |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| (none — both selectors extend existing registries/adapters) | — | — |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `domain-contracts/src/config-management/selectors.ts` | Registry entries | Add `ui.tooltip.delayMs` (GLOBAL/EDITABLE/SETTINGS, validation "Integer 0–5000 milliseconds") and `project.defaultTicketsPath` (GLOBAL/EDITABLE/SETTINGS, validation "Relative path; no '..' or absolute; no trailing slash") |
| `shared/utils/constants.ts` | Constant change | `DEFAULTS.TICKETS_PATH: 'docs/CRs'` → `'.tickets'` |
| `server/services/config/adapters/GlobalConfigStorageAdapter.ts` + patch schemas | Selector support | Read/write `ui.tooltip.delayMs` and `project.defaultTicketsPath` in `CONFIG_DIR/config.toml` |
| `frontend/src/components/ui/tooltip.tsx` | Prop source | `delayDuration` read from effective config (default 0 — restores pre-delay instant tooltips) instead of hard-coded 50 |
| `server/routes/system.ts` (`GET /api/config/selector`) | Payload extended | Expose effective `tooltipDelayMs` + `defaultTicketsPath` to non-owner viewers (pattern: MDT-244 `ticketKeyOptions`) |
| `frontend/src/components/SettingsModal/BackendConfigSection.tsx` | Predicate | `isNumberSelector` also matches `.delayMs` (and ticketsPath default renders as text input) |
| `frontend/src/hooks/useBackendConfig.ts` | Consumer mapping | Map `ui.tooltip.delayMs` to the tooltip provider's config read on successful save |
| Frontend `'docs/CRs'` literal fallbacks (5 files listed in §1) | Fallback source | Use effective default ticketsPath from project/bootstrap payload instead of the literal |
| `docs/CONFIG_GLOBAL_SPECIFICATION.md`, `docs/CONFIG_SPECIFICATION.md`, `docs/CONFIG_INSPECTION.md`, `prompts/QUICKREF.md` | Docs | Document both selectors, the new `.tickets` built-in default, and resolution order: project `.mdt-config.toml` → global `project.defaultTicketsPath` → built-in `.tickets` |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `TooltipProvider` call sites | Global config | `delayDuration` from effective `ui.tooltip.delayMs` (0 when unset) |
| `TicketLocationResolver` / `ProjectFactory` | Global config | Resolution order project → global default → `DEFAULTS.TICKETS_PATH` |
| Owner browser | Config API | `PATCH /api/config` scalar writes (existing, owner-gated) |
| All viewers | `GET /api/config/selector` | Effective UI values incl. tooltip delay (existing non-owner read) |

### Key Patterns
- MDT-168 default-deny allowlist: both selectors registered in `domain-contracts/src/config-management/selectors.ts` before any read/write works.
- MDT-244 pattern: owner writes config, every viewer renders from the non-owner effective read on `GET /api/config/selector`.
- Type-safe enum/const pattern from `docs/PRE_IMPLEMENT.md` for any new literal collections (none expected).

## 5. Acceptance Criteria

### Functional
- [ ] `ui.tooltip.delayMs` and `project.defaultTicketsPath` appear in Settings → Advanced (owner session) and persist to `config.toml`
- [ ] Tooltip delay equals the configured value everywhere tooltips render; unset → 0ms (instant)
- [ ] `DEFAULTS.TICKETS_PATH` is `'.tickets'` in `shared/utils/constants.ts`
- [ ] New project created with no ticketsPath uses `.tickets` (or the global override)
- [ ] A project pinning `ticketsPath = "docs/CRs"` in `.mdt-config.toml` (this repo) is unaffected
- [ ] No `'docs/CRs'` literal remains as a fallback in the 5 frontend files listed in §1
- [ ] `bun run inspect:config` lists both selectors with exposure `editable`, scope `global`
- [ ] Non-owner sessions cannot write either selector (owner-gated `PATCH /api/config` unchanged)

### Non-Functional
- [ ] `bun run validate:ts` and lint clean across touched packages
- [ ] Invalid values rejected server-side with field-level error: negative/non-integer delay; absolute or `..` paths
- [ ] Shared build updated (`bun run build:shared`, `domain-contracts` build) before servers run

### Testing
- Unit: `domain-contracts` selectors test — new entries present, validation strings match render contract
- Unit: global adapter round-trips `ui.tooltip.delayMs` (0, 500, 5000) and `project.defaultTicketsPath` (`'.tickets'`, reject `'/abs'`, reject `'a/../b'`)
- Unit: `TicketLocationResolver`/`ProjectFactory` resolution order with/without global override
- E2E (manual or Playwright): owner edits tooltip delay in Advanced → tooltips reflect it after reload; non-owner sees same behavior
- Manual: fresh project bootstrap lands tickets in `.tickets`

## 6. Verification

### By CR Type
- Feature: both selectors editable via Settings → Advanced and effective at runtime; docs list them

### Metrics
No baseline metrics; verifiable artifacts: allowlist entries, changed `DEFAULTS.TICKETS_PATH`, updated config docs, passing unit tests listed above.

## 7. Deployment

- `bun run build:shared` + domain-contracts build, then restart backend/frontend per `DEBUG.md` (no server restart by the agent unless requested)
- No config migration needed: absent keys fall back to built-in defaults (delay 0, `.tickets`)
- Rollback: revert commit; `config.toml` keys are ignored by older builds