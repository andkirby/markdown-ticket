# UAT Refinement Brief

## Objective

Capture a UAT request for MDT-182: add a configurable default annotation mode to the Appearance section of the Settings modal, so users can choose whether new Wireloom blocks start in `callout` or `compact` mode.

## Approved Changes

### Change 1: Default Annotation Mode Setting

- **What**: Add `defaultAnnotationMode` (`"callout"` | `"compact"`) to user preferences, surfaced in Settings → Appearance.
- **Why**: Currently the annotation mode resets to `callout` on every page load (in-memory only, per architecture). Users who prefer compact mode must re-toggle every block every session.
- **Impact**: Behavior — changes the initial state of rendered Wireloom blocks.

## Changed Requirement IDs

No existing requirement IDs change. This is an **additive** change:

- New requirement: default annotation mode is a stable per-user preference.
- Architecture section on State Management needs updating: persistence tier changes from "in-memory only" to "backend-backed default + in-memory per-block runtime state."

## Affected Downstream Trace

| Stage | Impact |
|-------|--------|
| requirements | Add requirement for persistent default annotation mode |
| bdd | Add scenario: user sets default, new blocks start in that mode |
| architecture | Update State Management: storage tier is `user.toml` under `[ui.appearance]`; frontend reads default on load and passes to `addAnnotationToggle()` |
| tests | Add test: default is read from backend; add test: blocks initialize in configured default mode |
| tasks | Add implementation tasks for schema, API, frontend wiring |

## Execution Slices

**Deferred pending MDT-168.**

### Dependency: MDT-168 (Configuration Editing API)

MDT-168 defines the unified configuration read/write API surface. The default annotation mode setting depends on MDT-168 for:

1. **A single read endpoint** for stable user preferences (from `user.toml`).
2. **A single write endpoint** for allowlisted user preference fields.
3. **Field allowlisting** — `ui.appearance.defaultAnnotationMode` must be classified as `editable` in MDT-168's exposure matrix.

Rationale: building a one-off `user.toml` write endpoint for this single setting would duplicate the work MDT-168 is designed to consolidate. Per `preference-storage-architecture.md` item 10: *"Add one backend config service abstraction if a second backend-persisted preference endpoint is introduced."* MDT-168 is that abstraction.

### What Can Proceed Before MDT-168

- Schema addition in `domain-contracts`: `AppearancePreferencesSchema` with `defaultAnnotationMode` field and defaults.
- Frontend wiring: pass a `defaultMode` parameter into `addAnnotationToggle()` so the architecture supports it. Falls back to `"callout"` when no backend value is available.

### What Blocks on MDT-168

- Backend read/write endpoints for `user.toml`.
- Settings modal Appearance section dropdown/select control.
- Integration test for persist + reload cycle.

## Validation

- [ ] Schema for `ui.appearance.defaultAnnotationMode` exists in `domain-contracts` with type `"callout" | "compact"`, default `"callout"`.
- [ ] `addAnnotationToggle()` accepts and applies a `defaultMode` parameter.
- [ ] No one-off config endpoint created — write path goes through MDT-168's unified API.
- [ ] ACL: write restricted to owner (same pattern as sharing endpoints).

## Watchlist

- MDT-168 status — blocks implementation of the full feature.
- If MDT-168 is deferred or descoped, revisit: could temporarily use `localStorage` as a bridge (follows the preference-storage-architecture guidance: *"If a durable cross-browser user profile is added later, this setting can move to `CONFIG_DIR/user.toml`"*).

## Open Decisions

1. **Bridge strategy**: If MDT-168 takes a while, should we ship with `localStorage` and migrate later, or wait?
2. **Scope of Appearance section**: Is `defaultAnnotationMode` the only `[ui.appearance]` field for now, or should we also promote other settings (theme, markdown density) from `localStorage` to `user.toml` at the same time?
