---
code: MDT-168
status: Proposed
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
- Browser-only preferences from MDT-167 intentionally remain local client state.

### Desired State
Provide backend-backed configuration management for approved settings, routed to the UI surface that owns the user intent:

| Configuration area | Owning UI surface |
|--------------------|-------------------|
| Project document discovery | Documents settings/path selector |
| Project metadata | Project Edit form |
| Guarded project identity/path settings | Project Edit advanced/guarded section or separate guarded workflow |
| Global app/system configuration | Settings modal advanced/global section |
| Stable user preferences | Settings modal user/preferences section |
| Browser-only UI state | Existing client-only Settings controls |

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
- Document which settings remain file-only.

### Out of Scope
- Arbitrary TOML editing from the browser.
- Bulk editing every configuration field.
- Moving browser-only state to backend storage.
- Replacing the existing project edit flow.
- Replacing the existing document path selector flow.

## 3. Product Requirements

- The app shows users where each configuration group belongs.
- Existing project document path configuration remains in the Documents settings flow.
- Existing project metadata editing remains in the Project Edit form.
- Guarded project identity/path settings are not exposed as normal settings.
- Global/system settings are exposed only when validation and runtime side effects are understood.
- Stable user preferences can be exposed through Settings when they are backend-owned.
- Browser-only Settings controls stay client-side.
- Every editable field has validation, clear error messages, and safe persistence behavior.
- The API is default-deny: unknown fields are rejected.

## 4. References

- Configuration exposure matrix: `docs/CRs/MDT-168/configuration-exposure.md`
- UI ownership requirements: `docs/CRs/MDT-168/ui-ownership.md`
- `docs/CONFIG_SPECIFICATION.md`
- `docs/CONFIG_GLOBAL_SPECIFICATION.md`
- `docs/CONFIG_USER_SPECIFICATION.md`
- `docs/architecture/preference-storage-architecture.md`
- `docs/CRs/MDT-163-preference-storage-architecture.md`
- `docs/CRs/MDT-167-settings-modal.md`

## 5. Acceptance Criteria

- [ ] Configuration fields are classified as editable, guarded, read-only, or file-only.
- [ ] The API exposes only allowlisted configuration selectors.
- [ ] The API rejects unknown or disallowed selectors without writing partial changes.
- [ ] Document discovery config is managed through the Documents settings flow.
- [ ] Project metadata is managed through the Project Edit form.
- [ ] Guarded project identity/path settings require a warning/confirmation flow or remain file-only.
- [ ] Global/user config exposed in Settings follows the exposure matrix.
- [ ] Browser-only settings remain client-only.
- [ ] Config docs and OpenAPI docs describe scopes, exposure policy, validation, and security boundaries.
