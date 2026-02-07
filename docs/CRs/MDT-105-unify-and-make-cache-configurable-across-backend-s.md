---
code: MDT-105
status: Proposed
dateCreated: 2025-12-26T12:48:55.218Z
type: Technical Debt
priority: Medium
---

# Unify and make cache configurable across backend services

## 1. Description
**Requirements Scope**: full

### Problem

- Cache implementations scattered across 6+ locations with inconsistent configuration patterns
- Project discovery cache has hardcoded 30-second TTL in `ProjectService.ts` with no configuration option
- File operation caches (metadata, content) have no size limits, potential unbounded memory growth
- Multiple custom cache implementations duplicating logic instead of shared module
- No global cache configuration mechanism - some use env vars, some hardcoded, some API config

### Affected Areas

- Backend services: Project discovery, file operations (metadata, content)
- Configuration: Inconsistent patterns across hardcoded, env vars, and API config
- Shared code: ProjectCacheService, TitleExtractionService with duplicate patterns
- MCP server: Project discovery cache with env var + config file support

### Scope

**In scope**:
- Create dedicated shared cache module with unified API
- Make all cache TTLs globally configurable via environment variables
- Add cache size limits to prevent unbounded memory growth
- Consolidate duplicate cache implementations into shared module

**Out of scope**:
- Frontend browser storage cache (different domain, already has clear API)
- Changing existing cache invalidation logic (unless broken)
- Cache performance optimization (beyond making it configurable)
## 2. Desired Outcome

### Success Conditions

- All backend services use shared cache module with consistent API
- Cache TTLs configurable via environment variables (e.g., `CACHE_PROJECT_DISCOVERY_TTL`, `CACHE_FILE_METADATA_TTL`)
- Cache size limits enforced to prevent unbounded memory growth
- Project discovery cache respects global configuration instead of hardcoded 30-second TTL

### Constraints

- ~~Must not introduce external cache library dependencies~~ → **Decided**: Use `cache-manager` v7 (see Architecture Design)
- Must maintain backward compatibility with existing cache invalidation behavior
- Must support existing configuration patterns (env vars for MCP, API config for backend)
- ~~Must not break existing MCP server cache configuration (`MCP_CACHE_TIMEOUT`)~~ → **Decided**: Hard break, migrate to `MDT_CACHE_TIMEOUT`

### Non-Goals

- Not changing frontend caching (browser storage, link processing)
- Not optimizing cache hit/miss ratios (beyond configurability)
- Not adding distributed caching (single-process in-memory only)

## 3. Architecture Design
> **Extracted**: Complex architecture (score 12) — see [architecture.md](./MDT-105/architecture.md)

**Summary**:
- Pattern: Facade over `bentocache`
- Components: 4 (CacheFacade, CacheConfig, and 4 service migrations)
- Key constraint: Total new code ~150 lines, facade.ts ≤60 lines

**Key Decisions**:
1. **Library**: Use `bentocache` — native tagging, namespaces, TypeScript, active community
2. **Tagging**: Client-side tagging via invalidation timestamps (O(1) invalidation)
3. **Namespaces**: `projects` for project list, `files` for all file caches
4. **Location**: `shared/cache/` — clean separation from services
5. **Breaking change**: `MCP_CACHE_TIMEOUT` → `MDT_CACHE_TIMEOUT`

**Tag Patterns**:
| Tag | Purpose |
|-----|---------|
| `project:{path}` | Invalidate all files for a project |
| `list:projects` | Invalidate project list cache |
| `type:metadata` | Invalidate all metadata caches |
| `type:content` | Invalidate all content caches |

**Extension Rule**: To add a cache, choose namespace + define tag pattern + call `cache.namespace('x').set({ key, value, tags })`.
## 4. Acceptance Criteria
> Full EARS requirements: [requirements.md](./MDT-105/requirements.md)

### Functional (initial Outcome)

- [ ] `bentocache` installed and integrated in shared module
- [ ] `shared/cache/` module with facade, config, and types (≤150 lines total)
- [ ] All cache TTLs configurable via `[system.cache]` in global config
- [ ] `MDT_CACHE_DISABLE` and `MDT_CACHE_TIMEOUT` env vars work
- [ ] `deleteByTag()` invalidates all entries with matching tag
- [ ] `ProjectCacheService` migrated to use shared cache module
- [ ] `TitleExtractionService` migrated to use shared cache module
- [ ] `ExtractMetadataCommand` migrated to use shared cache module
- [ ] `ReadFileCommand` migrated to use shared cache module
- [ ] MCP server migrated from `MCP_CACHE_TIMEOUT` to `MDT_CACHE_TIMEOUT`

### Non-Functional

- [ ] All existing tests pass after cache module migration
- [ ] Cache operations < 1ms latency (bentocache guarantee)
- [ ] Memory usage bounded by `maxSize` config

### Size Verification

| Module | Limit | Hard Max |
|--------|-------|----------|
| `shared/cache/facade.ts` | 60 | 90 |
| `shared/cache/config.ts` | 50 | 75 |
| `shared/cache/types.ts` | 25 | 40 |
## 5. Verification
> Full EARS requirements: [requirements.md](./MDT-105/requirements.md)

### How to Verify Success

- **Manual verification**: Check that environment variables control cache TTLs across all services
- **Automated verification**: Unit tests verify cache module API, TTL expiration, size limits
- **Integration verification**: Existing project discovery and file operation tests pass
- **Memory verification**: Monitor memory usage under load to confirm bounded growth

### Current Cache Inventory (for reference)

| Cache Type | Current TTL | Config Method | Has Size Limit |
|------------|-------------|---------------|----------------|
| Project Discovery (shared) | 30s | Hardcoded | No |
| Project Discovery (MCP) | 300s | `MCP_CACHE_TIMEOUT` | No |
| File Metadata | 3600s | API Config | No |
| File Content | 3600s | API Config | No |
| Title Extraction | 3600s | Constructor | No |

**All above require migration to shared module with configurable TTLs and size limits.**

### Requirements Specification

- [`docs/CRs/MDT-105/requirements.md`](./MDT-105/requirements.md) — EARS-formatted behavioral requirements

## 6. Clarifications

### Session 2025-12-27

- Q: Which file contains File Metadata/Content caches? → A: Investigated - `server/commands/ExtractMetadataCommand.ts` (metadata) and `server/commands/ReadFileCommand.ts` (content)
- Q: What changes needed in ProjectCacheService.ts? → A: Replace internal cache object with `createCache()` call, preserve public API
- Q: How to handle MCP_CACHE_TIMEOUT breaking change? → A: Hard break - only support `MDT_CACHE_TIMEOUT`, update docker-compose files, document in release notes
- Q: How should cache keys be organized? → A: Absolute file paths. Each cache instance isolated by name, keys are just file paths. `TitleExtractionService` changes from composite `projectPath:relativePath` to absolute paths.

### Updated Cache Inventory (with file paths)

| Cache Type | Current Location | Current TTL | Migration |
|------------|------------------|-------------|-----------|
| Project Discovery | `shared/services/project/ProjectCacheService.ts` | 30s hardcoded | Replace cache object with `createCache('projects')` |
| File Metadata | `server/commands/ExtractMetadataCommand.ts` | 3600s | Replace Map with `createCache('file-metadata')` |
| File Content | `server/commands/ReadFileCommand.ts` | 3600s | Replace Map with `createCache('file-content')` |
| Title Extraction | `shared/services/TitleExtractionService.ts` | 3600s | Replace Map with `createCache('titles')` |
| MCP Project Discovery | `mcp-server/src/config/index.ts` | 300s via env | Use `MDT_CACHE_TIMEOUT` env var |
