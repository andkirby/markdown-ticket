---
code: MDT-168
status: Implemented
dateCreated: 2026-05-17T12:50:41.785Z
type: Feature Enhancement
priority: Medium
---

# Provide configuration management UI and API

## 1. Description

### Problem Statement

Configuration is spread across local project files, global user/system files, registry files, browser storage, and feature-specific state files. Some settings already have UI ownership, but other settings require manual file edits. The product needs a secure, deliberate configuration-management surface rather than a generic config editor.

### Current State

- `project.document.paths` is already managed from the Documents settings/path selector flow.
- Project metadata is already managed from the Project Edit form.
- Guarded project identity/path settings are related to project editing, not a general global settings page.
- Global config and stable user config are documented, but not consistently exposed through an editable API/UI.
- Configuration defaults are partly encoded as literals in implementation files and documentation instead of coming from one code-owned defaults layer.
- Browser-only preferences from MDT-167 intentionally remain local client state.

### Desired State

Provide backend-backed configuration management for approved settings, routed to the UI surface that owns the user intent:

| Configuration area                     | Owning UI surface                                                  |
| -------------------------------------- | ------------------------------------------------------------------ |
| Project document discovery             | Documents settings/path selector                                   |
| Project metadata                       | Project Edit form                                                  |
| Guarded project identity/path settings | Project Edit advanced/guarded section or separate guarded workflow |
| Global app/system configuration        | Settings modal advanced/global section                             |
| Stable user preferences                | Settings modal user/preferences section                            |
| Browser-only UI state                  | Existing client-only Settings controls                             |

The API must expose only allowlisted settings. It must classify fields as editable, guarded, read-only, or file-only so the UI can avoid unsafe edits.

### Rationale

Users should be able to manage common configuration from the app, but not at the cost of turning the UI into an unsafe TOML editor. The right design is a controlled configuration API plus focused UI entry points.

## 2. Scope

### In Scope

- Define which configuration fields may be exposed to UI.
- Add API support for reading editable configuration with exposure metadata.
- Add API support for updating allowlisted configuration fields.
- Extend existing UI surfaces instead of creating duplicate settings panels.
- Preserve browser-only preferences as browser-only unless explicitly promoted.
- Define a single code-owned layer for configuration defaults, with contract-level defaults owned by `domain-contracts`.
- Document which settings remain file-only.

### Out of Scope

- Arbitrary TOML editing from the browser.
- Bulk editing every configuration field.
- Moving browser-only state to backend storage.
- Replacing the existing project edit flow.
- Replacing the existing document path selector flow.

### Bounded Architecture Refactors (Option 2 — Redesign Inline)

Per `assess.md`, this ticket performs bounded refactors inside MDT-168. These
seams are required because the feature needs them, not as foundational cleanup:

1. **Strict mutation contracts in `domain-contracts`** — Add selector metadata
   and strict patch schemas; keep tolerant normalization schemas separate for
   persisted-file reads. Invalid mutation input must be rejected, never
   converted to a default.
2. **Configuration application and persistence boundary** — One application
   service resolves a selector to its scope, validates the whole request,
   chooses the correct storage adapter (global/user/project/registry), writes
   atomically, and reports side effects. Extract config endpoints from the
   broad system router; keep controllers/routes transport-only.
3. **Project-document patch command** — Replace the positional
   `configureDocuments(projectId, documentPaths)` seam with a typed patch that
   validates the complete candidate config before one atomic write and returns
   effective saved values for refresh.
4. **Canonical document defaults** — Define project document defaults in
   `domain-contracts` and consume them from schema defaults, registry creation,
   config readers, tree building, UI reset/display logic, tests, and docs.
   Resolve the `maxDepth` default drift (schema=3 vs runtime=5 vs
   ConfigRepository=undefined).
5. **Explicit injected post-write effects** — Make cache, discovery, document
   tree, and watcher refreshes explicit effects with defined failure behavior
   and idempotency; do not bury side effects in TOML helpers.
6. **Backend-backed Settings state** — Extract focused backend-config
   hooks/controllers and owned Settings sections rather than expanding the
   Settings modal into a persistence monolith. Preserve browser-only handlers.

## 3. Product Requirements

- The app shows users where each configuration group belongs.
- Existing project document path configuration remains in the Documents settings flow.
- Existing project metadata editing remains in the Project Edit form.
- Guarded project identity/path settings are not exposed as normal settings.
- Global/system settings are exposed only when validation and runtime side effects are understood.
- Stable user preferences can be exposed through Settings when they are backend-owned.
- Browser-only Settings controls stay client-side.
- Every editable field has validation, clear error messages, and safe persistence behavior.
- Defaults shown in UI/API/docs come from the same canonical defaults source used by runtime behavior.
- The API is default-deny: unknown fields are rejected.

## 4. References

- Configuration exposure matrix: `docs/CRs/MDT-168/configuration-exposure.md`
- UI ownership requirements: `docs/CRs/MDT-168/ui-ownership.md`
- Defaults architecture recommendation: `docs/CRs/MDT-168/configuration-defaults.md`
- `docs/CONFIG_SPECIFICATION.md`
- `docs/CONFIG_GLOBAL_SPECIFICATION.md`
- `docs/CONFIG_USER_SPECIFICATION.md`
- `docs/architecture/preference-storage-architecture.md`
- `docs/CRs/MDT-163-preference-storage-architecture.md`
- `docs/CRs/MDT-167-settings-modal.md`
- Configuration inspection tool: `bun run inspect:config` (see [`docs/CONFIG_INSPECTION.md`](../CONFIG_INSPECTION.md)) — projects the exposure matrix + selector allowlist into a readable table or JSON; answers "where does each setting live"

> Requirements trace projection: [requirements.trace.md](./MDT-168/requirements.trace.md)
> Requirements notes: [requirements.md](./MDT-168/requirements.md)
> BDD trace projection: [bdd.trace.md](./MDT-168/bdd.trace.md)
> BDD notes: [bdd.md](./MDT-168/bdd.md)
> Architecture trace projection: [architecture.trace.md](./MDT-168/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-168/architecture.md)
> Tests trace projection: [tests.trace.md](./MDT-168/tests.trace.md)
> Tests notes: [tests.md](./MDT-168/tests.md)
> Tasks trace projection: [tasks.trace.md](./MDT-168/tasks.trace.md)
> Tasks notes: [tasks.md](./MDT-168/tasks.md)

## 5. Acceptance Criteria

### Behavior

- [x] Configuration fields are classified as editable, guarded, read-only, or file-only.
- [x] The API exposes only allowlisted configuration selectors (default-deny).
- [x] The API rejects unknown or disallowed selectors without writing partial changes.
- [x] Invalid mutation input is rejected with field-level errors, never converted to a default.
- [x] Document discovery config (`paths`, `excludeFolders`, `maxDepth`) is managed through the Documents settings flow with full-request validation and tree/watcher refresh.
- [x] Project metadata is managed through the Project Edit form.
- [x] Guarded project identity/path settings require a warning/confirmation flow or remain file-only.
- [x] Global/user config exposed in Settings follows the exposure matrix.
- [x] Browser-only settings remain client-only and never flow into backend TOML.
- [x] Read-only visitors cannot access config details or mutate any config scope.
- [x] Correct side effects fire after successful global discovery, link/system, user, project metadata, and document configuration updates.

### Defaults and contracts

- [x] Configuration defaults are centralized instead of scattered as literals.
- [x] Contract-level configuration defaults live in `domain-contracts`; runtime-only filesystem defaults remain outside the contract layer.
- [x] Project document `maxDepth` default drift is resolved (runtime, contracts, API metadata, UI, tests, examples, and docs agree on one value).
- [x] Tolerant persisted-file read/normalization schemas are separate from strict mutation schemas.

### Architecture (Option 2 — Redesign Inline)

- [x] `domain-contracts` holds canonical selector types, exposure metadata, strict mutation schemas, and persisted configuration defaults; no filesystem/controller/UI behavior there.
- [x] One configuration application boundary resolves scope, validates the full candidate change, delegates to explicit scope-specific storage adapters, performs one atomic write per config file, and reports side effects.
- [x] Express routes/controllers are thin; config endpoints are extracted from the broad system router rather than adding more direct filesystem logic there.
- [x] No catch-all repository or service with unrelated responsibilities; storage adapters stay scope-specific behind a small typed application API.
- [x] The positional `configureDocuments` seam is replaced by a typed project-document patch command.
- [x] Cache, discovery, document tree, and watcher refreshes are explicit injected post-write effects.
- [x] Guarded project code, ticket path, and registry path changes are explicit operation-specific workflows with confirmation and invariants, never ordinary scalar patches.

### UI ownership

- [x] Documents settings own `project.document.*`.
- [x] Project Edit owns safe metadata and guarded project operations.
- [x] Settings owns global/system and stable backend user preferences.
- [x] Browser-only preferences remain local browser state.
- [x] Backend-backed Settings state is extracted into focused hooks/controllers and owned sections, not a persistence monolith.

### Documentation and verification

- [x] Config docs and OpenAPI docs describe scopes, exposure policy, validation, and security boundaries with stable contracts.
- [x] Existing focused configuration tests remain green and strict patch/atomic-failure tests are added before replacing each mutation seam.

### Acceptance status

All 28 acceptance criteria are implemented and verified. The four previously open
runtime-integration gaps are closed:

1. **Document tree/watcher refresh via the new patch path** —
   `/api/config` PATCH for `project.document.*` now injects a
   `document-watcher-refresh` side effect that re-reads effective config and
   reconfigures document watchers.
2. **Settings-owned global/user backend preferences** — `SettingsModal` now
   renders an owned `BackendConfigSection` (Advanced tab) consuming
   `useBackendConfig`, gated by `canUseOwnerEndpoints`.
3. **Side effects fire at runtime** — `createConfigRouter` wires real
   `clearDiscoveryCache` and `reconfigureDocumentWatchers` hooks into the
   `ConfigSideEffectRegistry`; verified by route-level integration tests.
4. **Backend-backed Settings state extracted** — the section is a focused
   component, not part of a persistence monolith; browser-only prefs stay in
   their existing tabs and never reach the backend.

## 8. Clarifications

### UAT Session 2026-07-26 — Same-browser selector consumer refresh for `ui.projectSelector.*`

**Source:** UAT review of the configuration management surface (MDT-168) and
its interaction with the project selector rail (MDT-129). Found that saving
`ui.projectSelector.visibleCount` / `ui.projectSelector.compactInactive`
through Settings persists correctly to `user.toml`, but the selector rail
reads backend preferences once on mount (`useSelectorData` →
`/api/config/selector`) and is not refreshed after the successful write, so
the rail and Settings drift within the same browser session until a full page
reload. Root cause verified in code: `useBackendConfig.applyOne` does not
notify any other consumer on success, and `useSelectorData`'s existing
`mdt:selector-prefs-updated` handler only re-reads localStorage overrides — it
does not re-fetch backend prefs. The architecture wording
`ui.projectSelector.* (user)` → "no global effect" was correct for the server
side but was read as "no effect at all", which is how the consumer-refresh
step was dropped.

**Decision:** `refine_in_place` of `BR-3.2` (its "fire the required runtime
side effect" clause is narrowed — user-scope selector prefs need no
server/global effect) + `additive_change` for a new behavior `BR-7.1` that
owns the same-browser consumer-refresh contract (distinct observable behavior,
own scenario/obligation/tests). Treated as same-ticket UAT/refinement for
MDT-168; not spun into a new CR.

**Approved changes:**
- After a successful `applyConfig` for `ui.projectSelector.visibleCount` or
  `ui.projectSelector.compactInactive`, notify live selector consumers via the
  existing narrow named window event (`mdt:selector-prefs-updated` /
  `SELECTOR_PREFS_SYNC_EVENT`) already consumed by `useSelectorData` — not a
  generic event bus, not broadcast on unrelated config writes.
- On the signal, `useSelectorData` re-fetches backend prefs from
  `/api/config/selector` and layers browser-only localStorage overrides
  (`accentEnabled`/`autocolor`/`accentStyle`) on top, preserving the
  initial-load merge order.
- Browser-only prefs stay browser-only (BR-6.1); no server change; no new side
  effect in `ConfigSideEffectRegistry`; no MDT-129 rewrite.

**Changed requirement IDs:** `BR-3.2` (refined in place), `BR-7.1` (new,
additive).

**Updated workflow documents:** `requirements.md`, `bdd.md`, `architecture.md`,
`tests.md`, `tasks.md` (mirrored from canonical spec-trace store).

**New canonical trace records:** requirement `BR-7.1`; refined requirement
`BR-3.2`; scenario `selector_pref_change_refreshes_live_consumers`;
obligation `OBL-selector-consumer-refresh`; artifact `ART-fe-selector-data`;
test plans `TEST-use-backend-config-refresh-signal`,
`TEST-selector-data-refresh-on-signal`; extended covers on
`TEST-e2e-config-refresh`; task `TASK-10`; milestone `M5`.

**`uat.md` written:** yes (current-round execution brief at
`docs/CRs/MDT-168/uat.md`).

**Strict drift/lock used:** no.

**Validation:** `spec-trace validate MDT-168 --stage all` passed across
requirements, bdd, architecture, tests, tasks; all five `*.trace.md`
projections re-rendered.

**More implementation required:** yes — `TASK-10` (slice 1 in `uat.md`).
Runtime code was not modified in this UAT round per the stop condition.
