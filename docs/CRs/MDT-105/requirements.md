# Requirements: MDT-105

**Source**: [MDT-105](../MDT-105-unify-and-make-cache-configurable-across-backend-s.md)
**Generated**: 2025-12-26
**Updated**: 2025-12-27 (added tag-based invalidation, smart invalidation, bentocache)
**CR Type**: Technical Debt (with behavioral scope: full)

## Introduction

This specification defines the behavioral requirements for unifying cache implementations across backend services and making cache configuration globally adjustable. The system currently has scattered cache implementations with inconsistent configuration patterns, hardcoded TTLs, and no size limits. These requirements ensure all caches use a shared module with a single global configuration.

## Constraints

> Design decisions that architecture must respect.

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Cache library | `bentocache` | Native tagging, namespaces, TypeScript, active maintenance |
| Configuration location | `[system.cache]` in global config | Aligns with `CONFIG_GLOBAL_SPECIFICATION.md` |
| Granularity | Single global TTL + size limit | Minimal complexity |
| Environment variables | `MDT_CACHE_TIMEOUT`, `MDT_CACHE_DISABLE` | Testing/debugging/containers |
| Breaking change | Remove `MCP_CACHE_TIMEOUT` | Unified under `MDT_*` namespace |
| Tagging pattern | Entity-centric (`{entity}-{id}`, `{entities}-list`) | See [tagging-strategy.md](./tagging-strategy.md) |

## Behavioral Requirements (EARS)

### Requirement 1: Cache Module API

**Objective**: As a developer, I want a unified cache API, so that all services use consistent caching patterns.

#### Acceptance Criteria

1. The system shall provide a cache factory that creates named cache instances.
2. The system shall provide `get`, `set`, `has`, `delete`, and `clear` methods for cache operations.
3. WHEN a cache entry is requested via `get`, the system shall return the cached value if present and not expired.
4. WHEN a cache entry is requested via `get` and the entry is expired, the system shall return undefined and remove the expired entry.
5. WHEN a cache entry is set via `set`, the system shall store the value with the current timestamp for TTL tracking.

### Requirement 2: Cache Registry

**Objective**: As a developer, I want centralized cache management, so that all caches can be cleared via one API call.

#### Acceptance Criteria

1. WHEN a cache instance is created, the system shall register it in a central registry.
2. WHEN `clearAll()` is called, the system shall clear all registered cache instances.
3. WHEN `POST /api/cache/clear` is called, the system shall invoke `clearAll()` on the cache registry.
4. The system shall track cache statistics (hit count, miss count, size) per instance.

### Requirement 3: Global Configuration

**Objective**: As an operator, I want a single configuration location, so that cache behavior is easy to understand and modify.

#### Acceptance Criteria

1. The system shall read cache configuration from the global config file.
2. WHEN cache is disabled via configuration, the system shall bypass all caching (pass-through mode).
3. WHEN TTL is configured, the system shall use that value for all cache instances.
4. WHEN max entries is configured, the system shall use that value as size limit for all cache instances.
5. IF cache configuration is missing, THEN the system shall use default values (enabled, ttl: 30000ms, maxEntries: 1000).

### Requirement 4: Environment Variable Overrides

**Objective**: As a developer/operator, I want env var overrides for testing and containerized deployments.

#### Acceptance Criteria

1. WHEN `MDT_CACHE_DISABLE=true` is set, the system shall bypass all caching (pass-through mode).
2. WHEN `MDT_CACHE_TIMEOUT` is set, the system shall use that value instead of config file TTL.
3. The system shall apply this priority order: `MDT_CACHE_DISABLE` > `MDT_CACHE_TIMEOUT` > config file > defaults.
4. IF `MDT_CACHE_TIMEOUT` contains an invalid value, THEN the system shall fall back to config file or default and log a warning.

### Requirement 5: TTL-Based Expiration

**Objective**: As an operator, I want configurable cache TTL, so that I can tune freshness vs. performance.

#### Acceptance Criteria

1. WHEN a cache entry age exceeds the configured TTL, the system shall consider the entry expired.
2. WHILE cache is active, the system shall lazily expire entries on access (no background cleanup required).
3. WHILE existing cache entries are valid, the system shall honor their original TTL (no retroactive TTL changes on config change).

### Requirement 6: Size-Limited Caching

**Objective**: As an operator, I want bounded cache sizes, so that memory usage remains predictable.

#### Acceptance Criteria

1. The system shall enforce maximum entry count limit per cache instance.
2. WHEN cache size limit is reached and a new entry is added, the system shall evict entries to make room.
3. IF cache is disabled (via config or env var), THEN the system shall return undefined for all `get` operations (pass-through mode).

### Requirement 7: Service Migration

**Objective**: As a developer, I want all services to use the shared cache module with entity-centric tagging.

#### Acceptance Criteria

1. WHEN `ProjectService` caches project data, the system shall use tags `project-{code}`, `projects-list`.
2. WHEN `TicketService` caches ticket metadata, the system shall use tags `ticket-{key}`, `ticket-{key}-meta`, `tickets-list`.
3. WHEN `TicketService` caches ticket content, the system shall use tags `ticket-{key}`, `ticket-{key}-content` (no list tag).
4. WHEN `DocumentService` caches document data, the system shall use tags `doc-{id}`, `docs-list`.
5. WHEN a file is modified, the system shall invalidate corresponding cache entries via tags.

### Requirement 8: Edge Case Handling

**Objective**: As a developer, I want predictable behavior for edge cases.

#### Acceptance Criteria

1. IF concurrent cache access occurs, THEN the system shall handle it safely using Node.js single-threaded event loop guarantees.
2. WHEN cache key is null or undefined, the system shall throw an error with descriptive message.
3. WHEN cache value is undefined, the system shall store it as-is (distinguish from "no entry").

### Requirement 9: Tag-Based Invalidation

**Objective**: As a developer, I want to invalidate groups of cache entries, so that related data is invalidated together.

#### Acceptance Criteria

1. WHEN a cache entry is set, the system shall allow associating tags with the entry.
2. WHEN `deleteByTag()` is called, the system shall invalidate all entries with matching tags.
3. The system shall support multiple tags per cache entry (recommended: 3-4, max: 5).
4. WHEN an entity is deleted, the system shall invalidate via `{entity}-{id}` tag (drops all aspects).
5. WHEN a list needs refresh, the system shall invalidate via `{entities}-list` tag.

### Requirement 10: Smart Invalidation (Change Detection)

**Objective**: As an operator, I want minimal cache invalidation, so that performance is optimized.

#### Acceptance Criteria

1. WHEN a file's frontmatter changes, the system shall invalidate `{entity}-{id}` and `{entities}-list` tags.
2. WHEN only a file's body content changes, the system shall invalidate `{entity}-{id}-content` tag only (list stays cached).
3. WHEN a file is created, the system shall invalidate `{entities}-list` tag.
4. WHEN a file is deleted, the system shall invalidate `{entity}-{id}` and `{entities}-list` tags.
5. The system shall compare new frontmatter with cached frontmatter to detect changes.

---

## Functional Requirements

> Specific capabilities the system must provide.

| ID | Requirement | Rationale |
|----|-------------|-----------|
| FR-1 | Shared cache module using `bentocache` with facade wrapper | Eliminates duplicate implementations, native tagging support |
| FR-2 | Global configuration via `[system.cache]` in config.toml | Single source of truth for cache settings |
| FR-3 | Environment variable overrides (`MDT_CACHE_TIMEOUT`, `MDT_CACHE_DISABLE`) | Testing, debugging, containerized deployments |
| FR-4 | Cache statistics API (hit count, miss count, size) | Enables monitoring and debugging |
| FR-5 | `deleteByTag()` for group invalidation | Invalidate related entries without key enumeration |
| FR-6 | Configuration validation with fallback to defaults | Prevents misconfiguration from breaking the system |
| FR-7 | Pass-through mode when cache is disabled | Allows caching to be disabled for debugging |
| FR-8 | Entity-centric tagging (`{entity}-{id}`, `{entities}-list`) | Consistent invalidation patterns across all entities |
| FR-9 | Change detector comparing frontmatter vs body | Smart invalidation — list stays cached on body-only changes |

## Non-Functional Requirements

> Quality attributes and constraints.

### Performance

| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-P1 | Cache `get` operation latency | < 1ms | Cache operations must be faster than I/O |
| NFR-P2 | Cache `set` operation latency | < 1ms | Cache operations must be faster than I/O |
| NFR-P3 | Memory overhead per cache entry | < 100 bytes metadata | Minimize memory overhead |

### Reliability

| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-R1 | Cache operations shall not throw exceptions on valid input | 100% | Cache failures should not crash services |
| NFR-R2 | Invalid configuration shall fall back to defaults | 100% | Misconfiguration should not cause outages |
| NFR-R3 | Cache shall handle concurrent access safely | 100% | Node.js event loop provides safety |

### Maintainability

| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-M1 | Single cache module implementation shared across all services | 1 implementation | Reduce code duplication |
| NFR-M2 | All cache configuration documented with defaults | 100% coverage | Operators can understand options |
| NFR-M3 | Cache module unit test coverage | > 90% | Ensure reliability |

## Configuration Requirements

### Global Config File (`~/.config/markdown-ticket/config.toml`)

```toml
[system.cache]
enable = true      # Enable/disable caching (default: true)
ttl = 30000        # Global TTL in milliseconds (default: 30 seconds)
maxEntries = 1000  # Global max entries per cache instance (default: 1000)
```

| Setting | Description | Default | Valid Range | Rationale |
|---------|-------------|---------|-------------|-----------|
| `[system.cache].enable` | Enable/disable caching | true | true/false | Allow persistent disable |
| `[system.cache].ttl` | Global cache TTL in milliseconds | 30000 | 0-86400000 | Balance freshness vs. performance |
| `[system.cache].maxEntries` | Max entries per cache instance | 1000 | 0-100000 | Bound memory usage |

### Environment Variables (Override)

| Variable | Description | Default | Example | Use Case |
|----------|-------------|---------|---------|----------|
| `MDT_CACHE_DISABLE` | Disable all caching (override) | `false` | `true` | Debugging, testing |
| `MDT_CACHE_TIMEOUT` | Override global TTL (ms) | - | `5000` | Testing, containers |

### Priority Order

```
1. MDT_CACHE_DISABLE=true       →  Pass-through mode (debugging override)
2. [system.cache].enable=false  →  Pass-through mode (persistent disable)
3. MDT_CACHE_TIMEOUT            →  Overrides config file TTL
4. [system.cache].ttl           →  From global config file
5. Default (enabled, 30000ms)
```

## Breaking Changes

| Change | Migration |
|--------|-----------|
| `MCP_CACHE_TIMEOUT` removed | Use `MDT_CACHE_TIMEOUT` instead |
| Per-cache-type TTLs removed | Single global TTL applies to all caches |

## Current Implementation Context

> Informational only. Architecture decides migration strategy.

| Behavior | Current Location | Current Config | Migration Target                         |
|----------|------------------|----------------|------------------------------------------|
| Project discovery cache | `shared/services/ProjectCacheService.ts` | Hardcoded 30s TTL | `project-{code}`, `projects-list` tags   |
| Project discovery cache (MCP) | MCP server | `MCP_CACHE_TIMEOUT` env var | Use `MDT_CACHE_TIMEOUT`                  |
| File metadata cache | `server/services/TicketService.ts` | 3600s TTL | `ticket-{key}-meta`, `tickets-list` tags |
| File content cache | `server/services/TicketService.ts` | 3600s TTL | `ticket-{key}-content` tag                |
| Title extraction cache | `shared/services/TitleExtractionService.ts` | 3600s constructor param | `ticket-{key}-meta` tag                   |
| Cache clear API | `POST /api/cache/clear` | Clears file metadata/content only | Clear all via `bentocache`               |

---

## Artifact Mapping

> Maps requirements to implementation areas. Architecture decides final structure.

| Req ID | Requirement Summary | Implementation Area |
|--------|---------------------|---------------------|
| R1, R2 | Cache module with registry | `shared/cache/facade.ts` |
| R3 | Global configuration | `shared/cache/config.ts` |
| R4 | Env var overrides | `shared/cache/config.ts` |
| R5 | TTL-based expiration | `bentocache` internals |
| R6 | Size-limited caching | `bentocache` memory driver |
| R7 | Service migration | `ProjectService`, `TicketService`, `DocumentService` |
| R8 | Edge case handling | `shared/cache/facade.ts` |
| R9 | Tag-based invalidation | `bentocache` + tagging-strategy.md |
| R10 | Smart invalidation | `shared/cache/change-detector.ts` |

## Traceability

| Req ID | CR Section | Acceptance Criteria |
|--------|------------|---------------------|
| R1, R2 | Problem - scattered implementations | AC: Shared module with facade exists |
| R3, R4 | Problem - inconsistent config | AC: Single global config + env overrides |
| R5 | Problem - hardcoded TTLs | AC: TTL configurable via bentocache |
| R6 | Problem - no size limits | AC: Size limits enforced via maxSize |
| R7 | Scope - consolidate caches | AC: All services use shared module with entity tags |
| R8 | Edge Cases | AC: Edge cases handled in facade |
| R9 | Architecture - tagging | AC: `deleteByTag()` works for group invalidation |
| R10 | Architecture - smart invalidation | AC: Body-only changes don't invalidate list |

---
*Updated from MDT-105 by /mdt:requirements (v3) + manual updates for bentocache/tagging*
