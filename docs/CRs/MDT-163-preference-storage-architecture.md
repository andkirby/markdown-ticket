---
code: MDT-163
status: Implemented
dateCreated: 2026-05-12T19:23:07.924Z
type: Technical Debt
priority: Medium
implementationNotes: Post-update completed: CONFIG_USER_SPECIFICATION.md now contains the canonical preference storage decision rule; docs/architecture/preference-storage-architecture.md records rationale/examples; MDT-163 title/file and references were renamed away from durable wording. Code update completed: added localStoragePreferences helper, migrated ToC/document sort helpers, and added focused unit tests. Manual browser reload verification remains.
---

# Standardize preference storage architecture

## 1. Description

### Requirements Scope
preservation

### Problem
- `src/config/tocConfig.ts`, `src/config/sorting.ts`, `src/config/documentSorting.ts`, and `src/components/ViewModeSwitcher/useViewModePersistence.ts` each handle `localStorage` directly.
- `docs/CONFIG_USER_SPECIFICATION.md`, `docs/CONFIG_GLOBAL_SPECIFICATION.md`, and `docs/CRs/MDT-129/architecture.md` describe preference storage, but no single decision rule exists in canonical config docs.
- `domain-contracts/src/app-config/schema.ts` and `server/routes/system.ts` define a backend-persisted selector pattern, but the boundary between browser-only preferences and backend-persisted preferences is implicit.

### Affected Artifacts
- `docs/architecture/preference-storage-architecture.md` (architecture note and decision record)
- `docs/CONFIG_USER_SPECIFICATION.md` (canonical user preference guidance)
- `src/config/*` (browser-only preference helpers)
- `domain-contracts/src/app-config/schema.ts` (backend-persisted preference contracts)
- `server/routes/system.ts` (backend-persisted preference endpoints)
- `cli/src/utils/cliConfig.ts` (CLI boundary example)

### Scope
- **Changes**: Document storage decision rules, add a typed frontend localStorage helper, and migrate selected browser-only preference helpers with backward-compatible reads.
- **Unchanged**: Existing user preference files, existing project configuration semantics, CLI behavior, and backend selector endpoint behavior.

## 2. Decision

### Chosen Approach
Standardize preference tiers while keeping browser-only state frontend-local by default.

### Rationale
- `localStorage` remains the simplest persistent store for browser-only visual state.
- `CONFIG_DIR/user.toml` remains the store for stable per-user preferences read by backend clients.
- `CONFIG_DIR/<feature>.json` remains the store for frequently mutated backend-persisted user state.
- Backward-compatible reads avoid silently resetting existing user preferences.
- CLI stays unaffected unless a preference changes shared product behavior.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Standardize tiers and add frontend storage helper | **ACCEPTED** - Preserves current behavior and clarifies future choices |
| Move all preferences to backend | Centralizes all state in `CONFIG_DIR` | Adds endpoints for visual-only browser state |
| Keep current scattered localStorage usage | No implementation work | Keeps key naming and error handling inconsistent |
| Move preference rules to `shared/` | Makes rules available to all clients | Pulls visual-only browser state into shared product logic |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/config/localStoragePreferences.ts` | Utility | Typed safe JSON read/write for browser-only preferences |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `docs/CONFIG_USER_SPECIFICATION.md` | Documentation | Add preference storage decision rule |
| `docs/architecture/preference-storage-architecture.md` | Documentation | Mark current behavior versus recommendations |
| `src/config/tocConfig.ts` | Refactor | Use `localStoragePreferences` helper with legacy key read |
| `src/config/documentSorting.ts` | Refactor | Use `localStoragePreferences` helper with project-scoped key |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| React components | `src/config/*` helpers | Getter/setter functions |
| `src/config/*` helpers | `src/config/localStoragePreferences.ts` | Typed read/write utility |
| Backend-persisted prefs | `domain-contracts/src/app-config/schema.ts` | Zod schemas and defaults |
| Backend-persisted prefs | `server/routes/system.ts` | Config route handlers |

### Key Patterns

- Browser-only state: `src/config/*` helper owns key, defaults, getter, setter.
- Backend-persisted stable preference: `user.toml` shape is defined in `domain-contracts`.
- Backend-persisted mutable state: JSON file shape is defined in `domain-contracts`.
- CLI boundary: CLI consumes shared behavior only when preference affects non-UI output.

## 5. Acceptance Criteria

### Functional
- [x] `docs/CONFIG_USER_SPECIFICATION.md` contains a storage decision rule for browser-only, per-user, mutable user-state, and project/system settings.
- [x] `src/config/localStoragePreferences.ts` exports typed safe read/write helpers with default fallback.
- [x] `src/config/tocConfig.ts` uses the shared helper without losing existing `markdown-ticket-toc-*` values.
- [x] `src/config/documentSorting.ts` uses the shared helper for project-scoped document sort preferences.
- [x] No backend route is added for visual-only collapse state.
- [x] No CLI behavior changes unless a preference is promoted to shared product behavior.

### Non-Functional
- [x] Invalid JSON in browser storage falls back to defaults without throwing.
- [x] Unavailable `localStorage` keeps the UI functional with defaults.
- [x] Existing localStorage keys continue to read during migration.

### Testing
- [x] Unit: `localStoragePreferences` missing key returns default value.
- [x] Unit: `localStoragePreferences` invalid JSON returns default value.
- [x] Unit: `tocConfig` reads existing `markdown-ticket-toc-document` values.
- [x] Unit: `documentSorting` keeps project-specific preferences isolated by project id.
- Manual: Toggle ToC and document sort preferences, reload browser, verify values persist.

## 6. Verification

### By CR Type
- Refactoring: Existing UI preference behavior remains unchanged while duplicate storage handling is reduced.
- Documentation: `docs/CONFIG_USER_SPECIFICATION.md` and `docs/architecture/preference-storage-architecture.md` contain the preference tier rules.

### Metrics
- Verifiable artifacts: `src/config/localStoragePreferences.ts`, updated config helpers, updated docs, and unit tests.

## 7. Deployment

### Simple Changes
- Deploy frontend and docs changes with normal application build.
- No runtime configuration changes required.
- No data migration required because legacy localStorage keys remain readable.
