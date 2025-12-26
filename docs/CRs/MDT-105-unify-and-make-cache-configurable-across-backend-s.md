---
code: MDT-105
status: In Progress
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

- Must not introduce external cache library dependencies
- Must maintain backward compatibility with existing cache invalidation behavior
- Must support existing configuration patterns (env vars for MCP, API config for backend)
- Must not break existing MCP server cache configuration (`MCP_CACHE_TIMEOUT`)

### Non-Goals

- Not changing frontend caching (browser storage, link processing)
- Not optimizing cache hit/miss ratios (beyond configurability)
- Not adding distributed caching (single-process in-memory only)

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Architecture | Should cache module support size-based eviction (LRU) or TTL-only? | Must remain simple, no external libraries |
| Configuration | Single global `CACHE_TTL` or per-cache-type env vars? | MCP already has `MCP_CACHE_TIMEOUT` to preserve |
| Migration | How to migrate existing cache usage without breaking behavior? | Must maintain existing invalidation semantics |
| Size Limits | What default size limits for file operation caches? | Must prevent unbounded growth |

### Known Constraints

- No external cache libraries allowed (use native Map/Date APIs)
- Must preserve MCP server's existing `MCP_CACHE_TIMEOUT` env var
- Must preserve file operation cache invalidation on file changes
- Must support per-cache-type TTL configuration for different use cases

### Decisions Deferred

- Specific cache module API design (determined by `/mdt:architecture`)
- Cache eviction strategy (TTL-only vs. LRU) - determined by `/mdt:architecture`
- Default TTL values for different cache types - determined by `/mdt:architecture`
- Migration strategy from current implementations - determined by `/mdt:architecture`

## 5. Acceptance Criteria
> Full EARS requirements: [requirements.md](./MDT-105/requirements.md)

### Functional (Outcome-focused)

- [ ] Dedicated shared cache module exists and is used by all backend services
- [ ] All cache TTLs configurable via environment variables with documented defaults
- [ ] Cache size limits enforced (no unbounded memory growth)
- [ ] Project discovery cache TTL no longer hardcoded
- [ ] MCP server preserves existing `MCP_CACHE_TIMEOUT` behavior

### Non-Functional

- [ ] All existing tests pass after cache module migration
- [ ] Cache hit/miss ratios remain similar to current implementation
- [ ] Memory usage stays within current bounds under normal load
- [ ] Configuration changes (TTL, size limits) take effect without server restart

### Edge Cases

- What happens when cache size limit reached (eviction policy)
- What happens when invalid TTL value configured (fallback to default)
- What happens when cache disabled (TTL=0 or size=0)
- What happens during concurrent cache access (thread safety in Node.js)
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