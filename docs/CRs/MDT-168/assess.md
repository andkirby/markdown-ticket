# Assessment: MDT-168

## Verdict

**Recommendation**: Option 2 — Redesign Inline

## Feature Pressure

### Target Feature Needs
- Expose only allowlisted project, global, user, and registry selectors with ownership and exposure metadata.
- Reject unknown, disallowed, or invalid updates before writing, with field-level errors and atomic persistence per config file.
- Keep project metadata, document discovery, guarded identity/path operations, global settings, stable user preferences, and browser-only state in their existing product-owned surfaces.
- Apply runtime side effects after successful updates, including project discovery/cache refresh and document tree/watcher refresh.
- Serve API values, UI reset behavior, runtime fallbacks, and documentation from canonical configuration defaults.

### Current System Assumptions
- Configuration reads are tolerant full-object loads that replace invalid values with defaults; they are not strict mutation contracts.
- Global and user config are read directly in `server/routes/system.ts`, while project config is separately read by `ProjectConfigService`, `ProjectConfigLoader`, `ConfigRepository`, and controller code.
- Existing mutation paths are operation-specific: project metadata updates, document path updates, selector JSON state updates, and browser `localStorage` preferences do not share a configuration application boundary.
- `SettingsModal` owns several unrelated persistence modes directly, while `PathSelector` can save document paths but only displays `maxDepth`.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Concerning | The intended UI owners fit, but backend config ownership and persistence are split across routes, controllers, repositories, and shared services. |
| Extension Fit | Concerning | Adding selectors directly to current route/file helpers would duplicate validation, write, and side-effect logic across scopes. |
| Dependency Fit | Healthy | Zod contracts, TOML parsing, atomic file helpers, auth policy, and existing UI surfaces are already available; no new package is required. |
| Verification Fit | Concerning | Current tests preserve reads, path persistence, watcher refresh, and browser-only settings, but no strict allowlist or global/user/project patch contract exists. |
| Redesign Scope | Concerning | The required redesign is bounded to configuration contracts, persistence/application services, config routes, and the affected Settings/Documents UI state. |

## Mismatch Points

### Strict configuration mutation contracts
- Current system assumes: `GlobalConfigSchema` and `UserConfigSchema` may recover invalid stored values through `.catch(...)` defaults, and project configuration reads accept legacy/passthrough shapes.
- Feature needs: Mutation input must be default-deny, strict, selector-aware, and able to return field-level validation errors without modifying a file.
- Mismatch: Reusing tolerant read schemas for writes can turn invalid input into defaults instead of rejecting it, while accepting full objects would expose fields outside the allowlist.
- Adjustment required: Add explicit selector metadata and strict patch schemas in `domain-contracts`; keep tolerant normalization schemas separate for persisted-file reads.
- Scope: bounded.

### Configuration persistence ownership
- Current system assumes: `server/routes/system.ts` reads global/user files directly, `ProjectConfigService` mutates local/registry TOML, `ConfigRepository` reads document config independently, and `ProjectController` also parses global TOML for directory access.
- Feature needs: One application boundary must resolve a selector to its scope, validate the whole request, choose the correct storage adapter, write atomically, and report side effects.
- Mismatch: A new generic route built on the current helpers would create another config reader/writer and allow runtime behavior to drift by entry point.
- Adjustment required: Introduce a configuration application service with explicit global, user, project, and registry adapters; extract config endpoints from the broad system router and keep controllers/routes as transport-only delegates.
- Scope: bounded.

### Project document configuration update
- Current system assumes: `POST /api/documents/configure` accepts only `documentPaths`; the controller checks only that it is an array, and `PathSelector` reads but cannot edit `excludeFolders` or `maxDepth`.
- Feature needs: The Documents settings flow must update all exposed `project.document` fields with contract validation and then refresh the effective document tree/watcher state.
- Mismatch: Extending the existing positional `configureDocuments(projectId, documentPaths)` path would spread more parameters through controller, shared service, mocks, and watcher orchestration without an atomic validated patch.
- Adjustment required: Replace the path-only mutation seam with a typed project-document patch command that validates the complete candidate config before one atomic write and returns the effective saved values for refresh.
- Scope: bounded.

### Canonical document defaults
- Current system assumes: Project document `maxDepth` defaults to `3` in the domain schema and global-only registry, to `5` in tree/UI fallbacks and documentation, and to `undefined` in `ConfigRepository` before downstream fallback.
- Feature needs: Runtime, API metadata, UI reset behavior, tests, and docs must agree on one default.
- Mismatch: The API cannot truthfully publish a default while consumers calculate different effective values.
- Adjustment required: Define project document defaults beside the canonical project config contract and consume them from schema defaults, registry creation, config readers, tree building, UI, tests, and docs.
- Scope: local.

### Backend-backed Settings state
- Current system assumes: `SettingsModal` directly coordinates browser preferences, selector JSON state, project sharing, access tokens, and maintenance actions; global config is read elsewhere through `useConfig` but has no update seam.
- Feature needs: Backend-backed global/user settings require load, staged edits, field errors, save status, exposure metadata, and owner-only mutation without changing browser-only preference behavior.
- Mismatch: Adding this lifecycle directly to the current modal would mix backend configuration state with immediate `localStorage` state and make ownership harder to test.
- Adjustment required: Extract backend configuration state/actions into a focused hook/controller and split the relevant Settings sections into owned components while preserving the existing browser-only handlers.
- Scope: bounded.

### Guarded project identity and path operations
- Current system assumes: Project metadata updates are ordinary field assignments, while code, ticket path, and registry path changes are currently read-only or omitted from the edit request.
- Feature needs: Guarded changes require confirmation plus operation-specific validation and side effects across local config, registry identity, discovery, and watchers.
- Mismatch: Treating guarded fields as generic dotted-selector writes would bypass rename/path invariants and could leave local and registry files inconsistent.
- Adjustment required: Keep guarded settings in explicit project commands/workflows behind the same exposure metadata; do not route them through the ordinary scalar patch writer until their multi-file behavior is designed.
- Scope: bounded.

## Dependency and Tooling Pressure

- New packages: none.
- Runtime/config impact: new typed config query/patch API; global/user/project TOML writes; explicit cache, discovery, document tree, and watcher refresh hooks after successful writes.
- Testing/E2E impact: add contract tests for exposure metadata and strict patches, API tests for allowlist/atomic failure behavior, service tests for each storage scope and side effect, plus focused Settings/Documents E2E coverage.
- Main risk introduced: a permissive generic editor or tolerant write schema could overwrite disallowed fields or silently convert invalid input to defaults.

## Verification Gaps

- Preservation tests needed: tolerant read/fallback behavior; current project metadata edits; `[project.document]` path persistence and sibling preservation; selector state persistence; owner/read-only route policy; watcher refresh after document path changes.
- E2E/contract drift risks: `/api/documents/configure`, `/api/projects/:id/config`, `/api/config/global`, `/api/config/selector`, Settings tab selectors, and path-selector controls will change or gain new response shapes.
- Safe-to-refactor now?: yes, if the existing focused tests remain green and strict patch/atomic-failure tests are added before replacing each mutation seam.

## Recommendation

### Option 1: Integrate As-Is
Use when: the feature is reduced to one or two read-only settings with no shared mutation contract or runtime side effects.
Architecture impact: insufficient for MDT-168 because the approved scope includes multiple storage scopes, editable fields, and guarded operations.

### Option 2: Redesign Inline
Use when: configuration management remains within the approved MDT-168 scopes and existing UI owners.
Architecture must redesign: strict selector/patch contracts, the configuration application and persistence boundary, project-document patching, canonical document defaults, config route ownership, and backend-backed Settings state.
Expected scope added: focused extraction/refactoring inside MDT-168 plus preservation and mutation-contract tests; no prerequisite CR or new runtime dependency is required.

### Option 3: Redesign First
Use when: MDT-168 expands into arbitrary TOML editing, cross-process configuration coordination, or a generic multi-file transaction framework.
Reason redesign cannot wait: not applicable to the current allowlisted, per-scope feature; those expansions remain out of scope.
Preferred path: same CR, no prep phase.
