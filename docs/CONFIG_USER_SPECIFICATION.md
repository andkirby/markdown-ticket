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

## Project Selector

The project selector rail displays a compact view of available projects with access to the full list via a launcher panel.

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
| `compactInactive` | boolean | Whether inactive visible projects use compact code-only cards in the selector rail |

### Behavior

- **Active project**: Always visible in the selector rail as a larger card
- **Visible rail**: Shows active project plus `visibleCount - 1` additional projects
  - Favorites are prioritized and ordered by usage count and last used time
  - Non-favorites appear after favorites
- **Launcher**: Single control at the end of the rail that opens a full project panel
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

- [CONFIG_GLOBAL_SPECIFICATION.md](./CONFIG_GLOBAL_SPECIFICATION.md)
- [CONFIG_SPECIFICATION.md](./CONFIG_SPECIFICATION.md)
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- [server/docs/ARCHITECTURE.md](../server/docs/ARCHITECTURE.md)
- [server/openapi.yaml](../server/openapi.yaml)
