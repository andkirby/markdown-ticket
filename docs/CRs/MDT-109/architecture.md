# Architecture: MDT-109

**Source**: [MDT-109](../MDT-109.md)
**Type**: Bug Fix
**Generated**: 2026-03-14

## Overview

Minimal fix to correct path access patterns in ConfigRepository (backend) and PathSelector (frontend). The TOML `[project.document]` table maps to JavaScript as `parsed.project.document.paths`, not `parsed.document.paths`.

## Pattern

**Direct property access** (no legacy fallback):

```typescript
// Backend (ConfigRepository)
const paths = parsed.project?.document?.paths ?? []

// Frontend (PathSelector)
const paths = data.config?.project?.document?.paths ?? []
```

## Module Boundaries

| Module | Owner | Responsibility |
|--------|-------|----------------|
| ConfigRepository | ART-config-repo | Parse TOML config, extract document paths from project.document |
| PathSelector | ART-path-selector | Read API response at correct path, display checkboxes |

## Invariants

1. **Single path**: Only `project.document.paths` is supported (no legacy `document.paths`)
2. **No API changes**: Response structure unchanged, only consumer access pattern fixed

## Data Flow

```
.mdt-config.toml          ConfigRepository          API Response           PathSelector
[project.document]  -->   parsed.project.    -->   config.project.  -->   data.config.project.
paths = ["docs"]          document.paths           document.paths          document.paths
```

---
*Rendered by /mdt:architecture via spec-trace*
