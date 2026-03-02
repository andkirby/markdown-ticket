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

### Notes

- Personal selector preferences belong here, not in `.mdt-config.toml`.
- Personal selector preferences belong here, not in global `config.toml`.
- Mutable selector state such as favorites and project usage does not belong here.
- Mutable selector state is stored in `CONFIG_DIR/project-selector.json`.

## Related Documentation

- [CONFIG_GLOBAL_SPECIFICATION.md](./CONFIG_GLOBAL_SPECIFICATION.md)
- [CONFIG_SPECIFICATION.md](./CONFIG_SPECIFICATION.md)
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- [server/docs/ARCHITECTURE.md](../server/docs/ARCHITECTURE.md)
- [server/openapi.yaml](../server/openapi.yaml)
