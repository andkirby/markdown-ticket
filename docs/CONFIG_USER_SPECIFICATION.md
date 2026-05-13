# User Configuration Guide (`user.toml`)

## Overview

`user.toml` stores per-user preferences.

It does not store:
- project definition
- shared team configuration
- global system configuration

## File Location

```text
CONFIG_DIR/user.toml
```

## Preference Storage Decision

Use the narrowest durable scope that satisfies the behavior:

| Scope | Storage | Use when |
|-------|---------|----------|
| Browser-only UI state | `localStorage` | State only matters in the current browser profile |
| Stable per-user preference | `CONFIG_DIR/user.toml` | Preference should follow the user across web sessions or backend clients |
| Mutable per-user state | `CONFIG_DIR/<feature>.json` | State changes often, such as favorites, usage, or recents |
| Project/team behavior | `.mdt-config.toml` | Setting is part of project behavior and should be shared/versioned |
| Global system behavior | `CONFIG_DIR/config.toml` | Setting affects application-wide backend behavior |

Notes:
- Visual-only preferences do not belong in `.mdt-config.toml`, `config.toml`, `shared/`, or CLI config.
- CLI is affected only when a preference changes shared product behavior, not web UI presentation.
- See [preference-storage-architecture.md](./architecture/preference-storage-architecture.md) for architecture rationale and examples.

## Project Selector

The project selector rail displays a compact view of available projects. Clicking the active project card opens a full project browser panel. Hovering over inactive project chips reveals additional project details.

### Configuration

```toml
[ui.projectSelector]
visibleCount = 7
compactInactive = true
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `visibleCount` | integer | Number of visible project entries in the selector rail |
| `compactInactive` | boolean | Whether inactive visible projects use compact code-only chips (default: true) |

### Behavior

- **Active project**: Always visible in the selector rail as a larger card; clicking it opens the full project browser panel
- **Visible rail**: Shows active project plus `visibleCount - 1` additional projects
  - Favorites are prioritized and ordered by usage count and last used time
  - Non-favorites appear after favorites
- **Inactive project chips**: Display as compact code-only cards; hovering reveals full project details (code, name, description, favorite status) in a hover card
- **Panel**: Shows all projects with favorite indicators and access to all project switching functionality
- **Favorites**: Persisted per-project state stored in `CONFIG_DIR/project-selector.json`

### State Storage

Mutable selector state is stored in `CONFIG_DIR/project-selector.json`:

```json
{
  "PROJECT-KEY": {
    "favorite": true,
    "lastUsedAt": "2026-03-02T12:00:00.000Z",
    "count": 5
  }
}
```

Notes:
- Personal selector preferences belong here, not in `.mdt-config.toml` or global `config.toml`
- Invalid or missing state falls back safely without breaking the UI

## Related Documentation

- [preference-storage-architecture.md](./architecture/preference-storage-architecture.md)
- [CONFIG_GLOBAL_SPECIFICATION.md](./CONFIG_GLOBAL_SPECIFICATION.md)
- [CONFIG_SPECIFICATION.md](./CONFIG_SPECIFICATION.md)
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- [server/docs/ARCHITECTURE.md](../server/docs/ARCHITECTURE.md)
- [server/openapi.yaml](../server/openapi.yaml)
