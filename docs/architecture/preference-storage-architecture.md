# Preference Storage Architecture

## Existing Documents

Preference storage guidance exists, but it is split across several files:

- `docs/CONFIG_USER_SPECIFICATION.md` - canonical user preference file, `CONFIG_DIR/user.toml`.
- `docs/CONFIG_GLOBAL_SPECIFICATION.md` - distinguishes global system config from user preferences.
- `docs/architecture/toml-operations.md` - shared TOML read/write pattern.
- `docs/CRs/MDT-129/architecture.md` - strongest implemented pattern: immutable preferences in `user.toml`, mutable selector state in `project-selector.json`, served through `/api/config/selector`.
- `src/config/*` - browser-local examples for lightweight UI state, including ToC and sort preferences.

## Current Architecture

There are six preference storage tiers:

| Scope | Storage | Owner | Use when |
| --- | --- | --- | --- |
| Browser-local UI state | `localStorage` | frontend | State only matters in this browser. |
| Per-user durable preference | `CONFIG_DIR/user.toml` | backend + domain contracts | Preference should follow the user across browser sessions/clients. |
| Mutable per-user state | `CONFIG_DIR/<feature>.json` | backend + domain contracts | State changes often, e.g. favorites, usage, recents. |
| Mutable per-project feature state | `CONFIG_DIR/projects/{project.id}/{feature}.json` | backend feature service + domain contracts | State changes often and belongs to one resolved project, but is user state rather than shared project behavior. |
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
- `src/config/settingsPreferences.ts` stores visual Settings preferences such as card density and default view.

## Markdown Density Recommendation

Markdown density is a browser-local visual preference.

Use browser-local storage because markdown density:

- changes only how rendered text appears in the current browser
- does not change ticket data, document data, project behavior, backend behavior, MCP behavior, or CLI behavior
- should update immediately in the UI without a backend write
- can safely fall back to a default when storage is missing or invalid

Recommended contract:

| Setting | Storage key | Values | Default | Owner |
| --- | --- | --- | --- | --- |
| Markdown density | `markdown-ticket:settings:markdown-density` | `compact`, `default`, `comfortable` | `compact` | `src/config/settingsPreferences.ts` |

Behavior:

- `compact` is the default because tickets and documents are work surfaces, not article pages.
- `default` increases body size and rhythm modestly for longer reading.
- `comfortable` is the largest option and should remain opt-in.
- Density should be represented as a class or data attribute on the markdown prose container, not as inline descendant overrides.
- Density changes should not alter the markdown parser, SmartLink behavior, Mermaid rendering, Wireloom rendering, or backend content.
- If a durable cross-browser user profile is added later, this setting can move to `CONFIG_DIR/user.toml`; until then, keep it frontend-only.

## Per-Project Feature State Architecture

Use `CONFIG_DIR/projects/{project.id}/{feature}.json` when state is:

- durable backend-owned user state
- scoped to exactly one resolved project
- mutated often enough that TOML is the wrong fit
- not shared project behavior and therefore must not be stored in `.mdt-config.toml`

The backend must resolve any request input such as project id, code, or path to the canonical `project.id` before selecting the state file. Unknown projects must fail without creating `CONFIG_DIR/projects/{unresolved}/...` paths.

Each feature owns its JSON file through a small feature service. Do not add a generic per-project state endpoint until at least a second feature needs the same backend abstraction.

State shape rules:

1. Define the JSON shape as Zod schemas and exported types in `domain-contracts/src/app-config/schema.ts`.
2. Put parse/default/fallback helpers in `domain-contracts/src/app-config/validation.ts`.
3. Store an object at the top level, not a bare array, so the shape can evolve.
4. Reject unsafe paths before persistence when the state contains project-relative paths.
5. Treat missing, malformed, or invalid JSON as the feature's empty/default state unless the feature explicitly requires a hard failure.

Example:

```json
{
  "favItems": [
    {
      "path": "docs/guide.md",
      "type": "file",
      "favoritedAt": "2026-05-18T10:00:00.000Z"
    }
  ]
}
```

Current planned example:

- document favs: `CONFIG_DIR/projects/{project.id}/document-favs.json`

## Collapsible List Recommendation

For a simple collapsible list, store state in frontend `localStorage`.

Use backend durability only when collapse state must sync across browsers, affect CLI/MCP behavior, or be inspectable/configurable outside the web UI.

If backend durability is needed:

1. Add schema/defaults in `domain-contracts/src/app-config/schema.ts`.
2. Add read/write endpoint in `server/routes/system.ts` or a dedicated config route.
3. Store stable preferences in `user.toml`.
4. Store high-churn UI state in JSON. Use top-level `CONFIG_DIR/<feature>.json` for user-wide state and `CONFIG_DIR/projects/{project.id}/{feature}.json` for project-scoped feature state.
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
