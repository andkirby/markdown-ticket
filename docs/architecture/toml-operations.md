# TOML Operations Architecture

## Principle

**Single Source of Truth**: All TOML parse/stringify operations flow through one entrypoint.

```
┌─────────────────────────────────────────────────┐
│     shared/utils/toml.ts (Entrypoint)          │
│                                                 │
│  exports: parseToml(), stringify()            │
│  implementation: smol-toml package            │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
    ┌────▼─────┐            ┌─────▼──────┐
    │  SHARED  │            │   SERVER   │
    │          │            │            │
    │ Services │            │ Routes     │
    │          │            │ Repos      │
    └──────────┘            └────────────┘
```

## Rule

**No direct TOML package imports anywhere except `shared/utils/toml.ts`**

```typescript
// ✅ CORRECT
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'

// ❌ WRONG
import * as toml from 'toml'
import { parse } from 'smol-toml'
```

## Scope

This architecture applies to **ALL TOML files** in the system:

### Project Files
- `.mdt-config.toml` - Project configuration
- `document.paths` - Document discovery settings
- `ticketsPath` - CR location

### Global Registry
- `~/.config/markdown-ticket/projects/*.toml` - Project registration
- `~/.config/markdown-ticket/config.toml` - Global settings

### User Preferences
- `user.toml` - User-specific settings (UI preferences, etc.)

### Template Files
- `templates/config.toml` - Template configurations

## Data Flow

### Reading

```
Any .toml file
    ↓
shared/utils/toml.ts → parseToml()
    ↓
Config object
```

### Writing

```
Config object
    ↓
shared/utils/toml.ts → stringify()
    ↓
Any .toml file
```

## Benefits

1. **Consistency** - Single parser prevents incompatible representations
2. **Maintainability** - One place to update TOML handling
3. **Testing** - Easier to test with single implementation
4. **Type Safety** - Shared types from `@mdt/shared/utils/toml.ts`

## Implementation

**Library**: `smol-toml` (supports both parse and stringify)

**Usage**:
- Import from `@mdt/shared/utils/toml.js`
- Use `parseToml()` to read files
- Use `stringify()` to write files

**Trade-offs**:
- Comments not preserved (acceptable for config files)
- Null values removed during stringify
- Arrays formatted with spaces: `[ "a", "b", "c" ]`

## Examples

### Project Config

```typescript
const config = parseToml(readFile('.mdt-config.toml'))
config.project.document.paths = ['docs', 'src']
writeFile('.mdt-config.toml', stringify(config))
```

### Global Registry

```typescript
const registry = parseToml(readFile('projects/my-project.toml'))
registry.project.active = true
writeFile('projects/my-project.toml', stringify(registry))
```

### User Preferences

```typescript
const prefs = parseToml(readFile('user.toml'))
prefs.theme = 'dark'
writeFile('user.toml', stringify(prefs))
```
