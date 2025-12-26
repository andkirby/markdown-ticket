# Domain Audit: MDT-105

**Scope**: shared/services/ProjectCacheService.ts, shared/services/TitleExtractionService.ts, shared/services/ProjectService.ts, server/invokers/FileOperationInvoker.ts, server/commands/*Command.ts, mcp-server/src/services/projectDiscovery.ts
**Generated**: 2025-12-26

## Summary

| Severity | Count |
|----------|-------|
| 🔴 High | 3 |
| 🟡 Medium | 2 |
| 🟢 Low | 0 |

## Violations

### 🔴 High Severity

#### Duplicate Cache Implementations (Code Duplication)
- **Implementations**: 6 separate cache patterns discovered
  - `ProjectCacheService.ts:11-21` — Project discovery cache (Map + TTL)
  - `TitleExtractionService.ts:24-32` — Title extraction cache (Map + TTL + file mtime)
  - `ReadFileCommand.ts:14-21` — File content cache (Map + TTL)
  - `ExtractMetadataCommand.ts:20-27` — File metadata cache (Map + TTL)
  - `projectDiscovery.ts:19-21` — MCP project cache (Map + timestamp)
  - `FileWatcherService.ts:68` — Event queue (array-based cache)
- **Evidence**: Each implements identical TTL expiration logic, Map-based storage, cache invalidation
- **Fix direction**: Extract shared `Cache<K,V>` module with configurable TTL, size limits, eviction policy

#### Missing Value Objects (Primitive Obsession)
- **Field**: `ttl: number` scattered across 6 services (hardcoded integers)
- **Locations**:
  - `ProjectCacheService.ts:19` — `defaultTTL: number = 30000` (30s)
  - `ProjectService.ts:32` — `new ProjectCacheService(..., 30000)` (hardcoded)
  - `TitleExtractionService.ts:26` — `DEFAULT_TTL = 60 * 60 * 1000` (1 hour)
  - `ReadFileCommand.ts:17` — `ttlSeconds: number = 3600` (1 hour)
  - `ExtractMetadataCommand.ts:23` — `ttlSeconds: number = 3600` (1 hour)
  - `mcp-server/config/index.ts:62` — `cacheTimeout: parseInt(process.env.MCP_CACHE_TIMEOUT || '300')` (5 min)
- **Concept**: `CacheDuration` value object with validation (non-negative, reasonable bounds)
- **Fix direction**: Extract `CacheDuration` value object with millisecond conversion, bounds checking

#### Unbounded Cache Growth (Resource Leak Risk)
- **Locations**:
  - `ReadFileCommand.ts:11` — Comment: "Cache has no size limit - could grow large"
  - `ExtractMetadataCommand.ts:16` — Comment: "Cache has no size limit - could grow large"
  - `FileWatcherService.ts:68` — Event queue: only "Keep only last 50 events" (no config)
  - `TitleExtractionService.ts:24` — No size limit on Map
- **Evidence**: All 6 cache implementations use unbounded `Map<string, T>` storage
- **Fix direction**: Add max-size parameter with LRU eviction when limit reached

### 🟡 Medium Severity

#### Invariant Scatter (Cache Validation Logic)
- **Rule**: "Cache entry validity = current_time - timestamp < TTL"
- **Locations**: Duplicated in 5 classes with near-identical logic
  - `ProjectCacheService.ts:27-30` — `Date.now() - timestamp < ttl`
  - `TitleExtractionService.ts:182-186` — `now - cached.extractedAt > this.ttl`
  - `ReadFileCommand.ts:26-29` — `Date.now() - cached.timestamp < this.TTL`
  - `ExtractMetadataCommand.ts:32-35` — Same pattern
  - `projectDiscovery.ts:31-33` — Same pattern
- **Fix direction**: Single `isValid(entry)` method in shared cache module

#### Configuration Pattern Inconsistency
- **Patterns Found**:
  - Constructor parameter: `ProjectCacheService(quiet, defaultTTL)` — direct number
  - Environment variable: `MCP_CACHE_TIMEOUT` — MCP server only
  - API config fetch: `FileOperationInvoker.ts:27-38` — HTTP call to `/api/config/global`
  - Hardcoded defaults: Scattered throughout (30000, 3600, 300)
- **Evidence**: 4 different configuration mechanisms, no unified pattern
- **Fix direction**: Centralize cache configuration via environment variables with fallback to defaults

## Domain Map (Current)

| Element | Type | Lines | Notes |
|---------|------|-------|-------|
| `ProjectCacheService` | Service | 126 | Project discovery cache, anemic |
| `TitleExtractionService` | Service | 260 | Title extraction with file mtime invalidation |
| `ReadFileCommand` | Command | 50 | File content cache, no size limit |
| `ExtractMetadataCommand` | Command | 78 | File metadata cache, no size limit |
| `FileOperationInvoker` | Invoker | 87 | Orchestrates command caching |
| `ProjectDiscoveryService` (MCP) | Service | 341 | Project discovery cache, separate from shared |
| `CacheEntry` | Internal | varies | Duplicated across 4 locations |

## Recommendations

1. **Immediate**: Extract shared `Cache<K,V>` module with TTL, size limits, LRU eviction
2. **Next cycle**: Create `CacheDuration` value object to replace scattered `ttl: number` primitives
3. **Next cycle**: Unify configuration pattern (env vars with fallback defaults)
4. **Opportunistic**: Consolidate cache validation logic into single module

## Next Steps

To fix violations:
1. Architecture CR already exists: MDT-105
2. Run `/mdt:architecture MDT-105` to design cache module API
3. Run `/mdt:tasks MDT-105` to break down implementation
4. Execute via `/mdt:implement MDT-105`

---
*Generated by /mdt:domain-audit*
