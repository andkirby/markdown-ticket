# Preference Storage Architecture

## Existing Documents

Preference storage guidance exists, but it is split across several files:

- `docs/CONFIG_USER_SPECIFICATION.md` - canonical user preference file, `CONFIG_DIR/user.toml`.
- `docs/CONFIG_GLOBAL_SPECIFICATION.md` - distinguishes global system config from user preferences.
- `docs/architecture/toml-operations.md` - shared TOML read/write pattern.
- `docs/CRs/MDT-129/architecture.md` - strongest implemented pattern: immutable preferences in `user.toml`, mutable selector state in `project-selector.json`, served through `/api/config/selector`.
- `src/config/*` - browser-local examples for lightweight UI state, including ToC and sort preferences.

## Current Architecture

There are five preference storage tiers:

| Scope | Storage | Owner | Use when |
| --- | --- | --- | --- |
| Browser-local UI state | `localStorage` | frontend | State only matters in this browser. |
| Per-user durable preference | `CONFIG_DIR/user.toml` | backend + domain contracts | Preference should follow the user across browser sessions/clients. |
| Mutable per-user state | `CONFIG_DIR/<feature>.json` | backend + domain contracts | State changes often, e.g. favorites, usage, recents. |
| Project/team behavior | `.mdt-config.toml` | shared/backend/CLI | Setting is part of project behavior and should be shared/versioned. |
| Global system behavior | `CONFIG_DIR/config.toml` | shared/backend/CLI | Setting affects application-wide backend behavior. |

## Browser-Only Preference Architecture

Browser-only preferences are owned completely by the frontend.

Flow:

1. A small `src/config/*` helper defines the storage key, default value, getter, and setter.
2. React component or hook reads the helper during initialization.
3. Invalid, missing, or unavailable `localStorage` falls back to defaults.
4. User interaction updates React state immediately.
5. The setter writes the preference back to `localStorage`.

No backend request is made. No domain contract is required. No CLI behavior changes.

Use this for visual or interaction state that only matters in the current browser profile:

- expanded/collapsed panels
- last selected tab or view mode
- local sort choice
- sidebar visibility
- document tree expanded state, if not shared across clients

Current examples:

- `src/config/tocConfig.ts` stores ToC expanded/collapsed state.
- `src/config/sorting.ts` stores ticket sort preferences.
- `src/config/documentSorting.ts` stores per-project document sort preferences.
- `src/components/ViewModeSwitcher/useViewModePersistence.ts` stores last board/list mode.

## Collapsible List Recommendation

For a simple collapsible list, store state in frontend `localStorage`.

Use backend durability only when collapse state must sync across browsers, affect CLI/MCP behavior, or be inspectable/configurable outside the web UI.

If backend durability is needed:

1. Add schema/defaults in `domain-contracts/src/app-config/schema.ts`.
2. Add read/write endpoint in `server/routes/system.ts` or a dedicated config route.
3. Store stable preferences in `user.toml`.
4. Store high-churn UI state in JSON.
5. Keep frontend optimistic with debounced writes.

## Shared And CLI Impact

`shared/` should not know about purely visual collapse state.

Move logic into `shared/` only when it becomes product behavior reused by backend, frontend, MCP, or CLI. CLI should consume shared behavior and render it; it should not implement its own preference rules.

## Suggested Improvements

- Move localStorage key naming conventions into a tiny frontend helper to avoid scattered keys.
- Consider a generic `/api/config/user-state/:feature` only after a second or third backend-persisted UI state appears; one-off endpoints are simpler for now.

## To Make This Right

1. Keep browser-only state in frontend `src/config/*` helpers.
2. Standardize localStorage keys as `markdown-ticket:<scope>:<feature>[:<projectId>]`.
3. Add a small typed localStorage utility for safe JSON read/write with defaults.
4. Move existing browser-only helpers to that utility gradually; do not rewrite all at once.
5. Add unit tests for any new preference helper that controls visible behavior.
6. Use `domain-contracts` schemas for every backend-persisted preference/state shape.
7. Keep stable user preferences in `user.toml`; keep frequently mutated state in JSON.
8. Do not put visual-only preferences in `shared/`, `.mdt-config.toml`, or CLI config.
9. Involve CLI only when the preference changes shared product behavior, not UI presentation.
10. Add one backend config service abstraction if a second backend-persisted preference endpoint is introduced.
11. Update feature tickets to state the chosen preference tier before implementation.
