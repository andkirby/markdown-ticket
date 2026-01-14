---
code: MDT-117
status: Proposed
dateCreated: 2026-01-14T18:02:09.155Z
type: Technical Debt
priority: Medium
---

# Standardize and eliminate redundant environment variables

## 1. Description

### Requirements Scope
`none` — Skip requirements, use `/mdt:architecture`

### Problem
- Two different variables (`LOG_LEVEL` and `MCP_LOG_LEVEL`) control logging level across different files, causing confusion about which takes precedence
- Cache timeout defined with inconsistent units in `MCP_CACHE_TIMEOUT` (300 seconds) vs `docker-config/config.toml` cacheTimeout (30000 milliseconds)
- Generic `PORT` variable lacks service-specific prefix, inconsistent with `MCP_HTTP_PORT` and `TEST_*_PORT` patterns
- `DOCKER_BACKEND_URL` duplicates purpose of `VITE_BACKEND_URL`, adding confusion about Docker networking
- `MCP_SANITIZATION_ENABLED` lacks consistent `MCP_SECURITY_*` prefix used by other security features
- `parseInt()` calls for environment variable parsing duplicated across 5+ files
- Port defaults scattered across multiple files: `server/server.ts`, `mcp-server/src/index.ts`, `shared/test-lib/config/ports.ts`, `vite.config.ts`

### Affected Areas
- Frontend: Environment variable loading and TypeScript definitions
- Backend: Server configuration and port handling
- MCP Server: All environment variable parsing and validation
- Docker: All compose files with environment variable arrays
- Shared: Constants and utility functions

### Scope
- **In scope**: Standardize naming conventions, eliminate duplicate variables, centralize parsing logic, consolidate defaults
- **Out of scope**: Adding new features or changing functionality

## 2. Desired Outcome

### Success Conditions
- All environment variables follow consistent naming convention (service prefix, category suffix)
- No duplicate variables serving same purpose across codebase
- All numeric environment variables use centralized parsing utility with proper validation
- Port defaults defined in single location
- TypeScript definitions complete for all Vite environment variables

### Constraints
- Must maintain backward compatibility where possible (use fallback to old variable names)
- Must not break existing Docker deployments
- Must preserve all current functionality
- Changes must be minimal and focused on standardization

### Non-Goals
- Not adding new environment variables
- Not changing the purpose or behavior of existing features
- Not introducing new dependencies or libraries

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Breaking changes | Should we support fallback from old to new variable names? | Must not break existing deployments |
| Type safety | Should we add Zod or similar for runtime validation? | Preference for minimal dependencies |
| Port defaults | Should ports be configurable via single env var pattern? | Must maintain existing defaults |

### Known Constraints
- Must preserve existing functionality - this is refactoring only
- Must work with existing Docker setup
- TypeScript project with Node.js runtime
- Vite for frontend build
- Multiple compose files (dev, prod, demo, mcp-stdio-only)

### Decisions Deferred
- Specific implementation approach (determined by `/mdt:architecture`)
- Whether to add runtime validation library
- Migration strategy for existing deployments
- Task breakdown (determined by `/mdt:tasks`)

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] All environment variables follow consistent `SERVICE_*` or `VITE_*` prefix pattern
- [ ] No duplicate variables exist for same configuration purpose
- [ ] All numeric environment variables parsed through centralized utility
- [ ] Port defaults sourced from single constant definition
- [ ] All Vite environment variables have TypeScript definitions

### Non-Functional
- [ ] Code duplication reduced for environment variable parsing
- [ ] Environment variable names are self-documenting and consistent
- [ ] Developer experience improved - single source of truth for defaults

### Edge Cases
- [ ] Missing environment variable falls back to documented default
- [ ] Invalid numeric values are handled gracefully
- [ ] Empty string vs unset variable handled consistently

## 5. Verification

### How to Verify Success
- **Code review**: All environment variable references follow naming convention
- **Test verification**: All existing tests pass with new variable names (with fallbacks)
- **Documentation review**: `.env.example` files reflect standardized names
- **Type checking**: No TypeScript errors for environment variable access

### Migration Verification
- Docker compose files use only standardized variable names
- Existing `.env.local` files continue to work (via fallback support)
- Documentation (`docs/ENVIRONMENT_VARIABLES.md`) reflects all changes