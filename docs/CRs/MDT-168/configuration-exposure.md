# Configuration Exposure Matrix

## Exposure Levels

| Level | Meaning | UI behavior |
|-------|---------|-------------|
| Editable | Safe, common setting with clear validation | Show as normal setting |
| Guarded | High-impact setting that can break behavior or change filesystem scope | Show only with warning/confirmation or advanced workflow |
| Read-only | Useful context but unsafe or inappropriate to mutate from UI | Display only |
| File-only | Must stay in config files/manual workflow | Do not expose in normal UI/API |

## Local Project Configuration: `{project}/.mdt-config.toml`

| Section | Field | Exposure | Owner |
|---------|-------|----------|-------|
| `project` | `name` | Editable | Project Edit form |
| `project` | `description` | Editable | Project Edit form |
| `project` | `repository` | Editable | Project Edit form |
| `project` | `active` | Editable | Project Edit form |
| `project` | `ticketsPath` | Guarded | Project Edit advanced/guarded workflow |
| `project` | `code` | Guarded | Project Edit advanced/guarded workflow or separate rename workflow |
| `project` | `id` | File-only | Manual config only |
| `project` | `path` | Read-only | Project Edit form context |
| `project` | `startNumber` | File-only | Project creation/manual config only |
| `project` | `counterFile` | File-only | Manual config only |
| `project.document` | `paths` | Editable | Documents settings/path selector |
| `project.document` | `excludeFolders` | Editable | Documents settings/path selector |
| `project.document` | `maxDepth` | Editable | Documents settings/path selector |

## Global System Configuration: `CONFIG_DIR/config.toml`

| Section | Field | Exposure | Owner |
|---------|-------|----------|-------|
| `discovery` | `autoDiscover` | Editable | Settings global/advanced section |
| `discovery` | `searchPaths` | Guarded | Settings global/advanced section |
| `discovery` | `maxDepth` | Guarded | Settings global/advanced section |
| `system` | `cacheTimeout` | Guarded | Settings advanced section |
| `system` | `logLevel` | Guarded | Settings advanced section |
| `links` | `enableAutoLinking` | Editable | Settings global/link section |
| `links` | `enableTicketLinks` | Editable | Settings global/link section |
| `links` | `enableDocumentLinks` | Editable | Settings global/link section |
| `links` | `enableHoverPreviews` | Editable | Settings global/link section |
| `links` | `linkValidation` | Editable | Settings global/link section |
| `ui` | `theme` | File-only for backend config | Existing browser-only controls |
| `ui` | `autoRefresh` | Read-only until ownership is confirmed | No UI edit yet |
| `ui` | `refreshInterval` | Read-only until ownership is confirmed | No UI edit yet |

## Stable User Configuration: `CONFIG_DIR/user.toml`

| Section | Field | Exposure | Owner |
|---------|-------|----------|-------|
| `ui.projectSelector` | `visibleCount` | Editable | Settings user/preferences section |
| `ui.projectSelector` | `compactInactive` | Editable | Settings user/preferences section |

## Mutable User State: `CONFIG_DIR/<feature>.json`

| File | Field | Exposure | Owner |
|------|-------|----------|-------|
| `project-selector.json` | project favorite state | Editable through feature action | Project selector UI |
| `project-selector.json` | last used/count | Read-only | Runtime state only |

## Project Registry: `CONFIG_DIR/projects/*.toml`

| Field | Exposure | Owner |
|-------|----------|-------|
| `project.path` | Guarded | Project Edit advanced/guarded workflow |
| `project.active` | Editable | Project Edit form |
| extended fallback fields | Guarded | Prefer local `.mdt-config.toml` when present |

## Browser-only Settings

These remain client-only unless a separate decision promotes them:

| Setting | Current storage | Reason |
|---------|-----------------|--------|
| Theme quick toggle | cookie/localStorage | Browser/profile-specific presentation |
| Default view | localStorage | Browser preference from MDT-167 |
| Card density | localStorage | Browser-only visual density |
| Event history visibility | localStorage | Browser-only panel state |
| Document tree recents/sort/collapse | localStorage | Browser/session UX state |
