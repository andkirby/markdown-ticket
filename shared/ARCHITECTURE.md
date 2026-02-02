# Architecture: @mdt/shared

Package architecture for the `@mdt/shared` workspace.

## Overview

Domain models, services, and test utilities shared across all workspaces.

## Structure

```
shared/
├── models/              # Project, Ticket types; YAML frontmatter parsing
├── services/            # ProjectService, MarkdownService
├── tools/               # config-cli, project-cli commands
├── test-lib/            # Isolated test environment
│   ├── core/            # TestEnvironment, ProjectFactory, TestServer
│   ├── ticket/          # CR creation, test project builders
│   ├── config/          # Port configuration
│   ├── utils/           # Process, retry, temp-dir helpers
│   ├── README.md        # Full API docs
│   └── write-tests-guide.md  # Quick start
└── dist/                # Build output
```

## Key Components

### Models
- `Project.ts` - Config types, legacy migration, validation
- `Ticket.ts` - CR model with YAML frontmatter
- `types.ts` - Shared type definitions

### Services
- `ProjectService.ts` - Multi-project management, discovery
- `MarkdownService.ts` - TOML read/write, template rendering

### Test Library (test-lib)
- `TestEnvironment` - Isolated temp dirs, ports, auto-sets `CONFIG_DIR`
- `ProjectFactory` - Test project/CR creation
- `TestServer` - Server lifecycle management

**See**: `test-lib/README.md` (API), `test-lib/write-tests-guide.md` (quick start)

### Validation
- `ProjectValidator` - Platform-aware (browser/Node.js) validation

## Conventions

```typescript
// ✅ Use @mdt/shared/ prefix
import { ProjectFactory } from '@mdt/shared/test-lib'

// ❌ Avoid relative imports
import { ProjectFactory } from '../../../test-lib/index'
```

## Build

Required before use in other workspaces:
- `npm run build:shared` - Explicit
- `npm run dev:full` - Auto-builds + starts servers
