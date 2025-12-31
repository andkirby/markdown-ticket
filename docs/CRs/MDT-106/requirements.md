# Requirements: MDT-106

**Source**: [MDT-106](../MDT-106.md)
**Generated**: 2025-12-29
**CR Type**: Feature Enhancement
**Requirements Scope**: Full EARS + FR + NFR specifications

## Introduction

MDT-106 adds comprehensive end-to-end (E2E) test coverage for all server API endpoints. This document specifies EARS-formatted requirements organized by API resource, defining what each resource should do and measurable verification criteria for E2E tests.

---

## Behavioral Requirements (EARS) — By API Resource

### Requirement 1: Projects Resource (`/api/projects`)

**Objective**: As a developer, I want project CRUD operations verified by E2E tests, so that API changes don't break project management.

#### 1.1 List Projects (`GET /api/projects`)
| ID | EARS Requirement |
|----|------------------|
| R1.1.1 | WHEN `GET /api/projects` is called, the system shall return HTTP 200 with an array of project objects. |
| R1.1.2 | WHEN no projects exist, the system shall return HTTP 200 with an empty array `[]`. |

**Measurable Result**: Response status code equals 200, response body is a valid JSON array, each element contains required project fields (`code`, `name`, `path`, `enabled`).

#### 1.2 Get Project Configuration (`GET /api/projects/{projectId}/config`)
| ID | EARS Requirement |
|----|------------------|
| R1.2.1 | WHEN `GET /api/projects/{projectId}/config` is called with a valid project ID, the system shall return HTTP 200 with the project configuration object. |
| R1.2.2 | WHEN `GET /api/projects/{projectId}/config` is called with a non-existent project ID, the system shall return HTTP 404 with an error message. |

**Measurable Result**: Valid ID returns 200 + config object with `name`, `code`, `ticketsPath`. Invalid ID returns 404 + error object.

#### 1.3 Create Project (`POST /api/projects/create`)
| ID | EARS Requirement |
|----|------------------|
| R1.3.1 | WHEN `POST /api/projects/create` is called with valid project data, the system shall create the project and return HTTP 201. |
| R1.3.2 | WHEN `POST /api/projects/create` is called with missing required fields, the system shall return HTTP 400 with validation errors. |
| R1.3.3 | WHEN `POST /api/projects/create` is called with a duplicate project code, the system shall return HTTP 400 with a conflict error. |

**Measurable Result**: Valid request returns 201, project file persisted to disk. Invalid request returns 400 with `error` field describing the issue.

#### 1.4 Update Project (`PUT /api/projects/{code}/update`)
| ID | EARS Requirement |
|----|------------------|
| R1.4.1 | WHEN `PUT /api/projects/{code}/update` is called with valid data, the system shall update the project and return HTTP 200. |
| R1.4.2 | WHEN `PUT /api/projects/{code}/update` is called for a non-existent project, the system shall return HTTP 404. |

**Measurable Result**: Valid update returns 200 + updated project object. Non-existent project returns 404.

#### 1.5 Enable/Disable Project (`PUT /api/projects/{code}/enable|disable`)
| ID | EARS Requirement |
|----|------------------|
| R1.5.1 | WHEN `PUT /api/projects/{code}/enable` is called, the system shall set `enabled: true` and return HTTP 200 with the updated project. |
| R1.5.2 | WHEN `PUT /api/projects/{code}/disable` is called, the system shall set `enabled: false` and return HTTP 200 with the updated project. |
| R1.5.3 | WHEN enable/disable is called for a non-existent project, the system shall return HTTP 404. |

**Measurable Result**: Project's `enabled` field matches expected boolean after operation. Response includes updated project object.

#### 1.6 Deprecated Register Endpoint (`POST /api/projects/register`)
| ID | EARS Requirement |
|----|------------------|
| R1.6.1 | WHEN `POST /api/projects/register` is called, the system shall return HTTP 501 with a deprecation message. |

**Measurable Result**: Response status is 501, body contains `error` field with deprecation notice.

---

### Requirement 2: CRs Resource (`/api/projects/{projectId}/crs`)

**Objective**: As a developer, I want CR CRUD operations verified by E2E tests, so that ticket management remains reliable.

#### 2.1 List CRs (`GET /api/projects/{projectId}/crs`)
| ID | EARS Requirement |
|----|------------------|
| R2.1.1 | WHEN `GET /api/projects/{projectId}/crs` is called for a valid project, the system shall return HTTP 200 with an array of CR objects. |
| R2.1.2 | WHEN `GET /api/projects/{projectId}/crs` is called for a non-existent project, the system shall return HTTP 404. |
| R2.1.3 | WHEN a project has no CRs, the system shall return HTTP 200 with an empty array. |

**Measurable Result**: Response contains array where each CR has `key`, `title`, `status`, `type`, `priority`, `filepath`. Empty project returns `[]`.

#### 2.2 Get Single CR (`GET /api/projects/{projectId}/crs/{crId}`)
| ID | EARS Requirement |
|----|------------------|
| R2.2.1 | WHEN `GET /api/projects/{projectId}/crs/{crId}` is called for a valid CR, the system shall return HTTP 200 with the full CR object including content. |
| R2.2.2 | WHEN `GET /api/projects/{projectId}/crs/{crId}` is called for a non-existent CR, the system shall return HTTP 404. |

**Measurable Result**: Valid CR returns 200 + CR object with `content` field containing markdown. Non-existent CR returns 404.

#### 2.3 Create CR (`POST /api/projects/{projectId}/crs`)
| ID | EARS Requirement |
|----|------------------|
| R2.3.1 | WHEN `POST /api/projects/{projectId}/crs` is called with valid CR data, the system shall create the CR file and return HTTP 201 with the new CR. |
| R2.3.2 | WHEN `POST /api/projects/{projectId}/crs` is called, the system shall auto-assign the next sequential CR number. |
| R2.3.3 | WHEN `POST /api/projects/{projectId}/crs` is called with missing title, the system shall return HTTP 400. |

**Measurable Result**: CR file created at expected path. Response includes `key` matching pattern `{PROJECT}-{NNN}`. Counter incremented in project config.

#### 2.4 Update CR - Full Replace (`PUT /api/projects/{projectId}/crs/{crId}`)
| ID | EARS Requirement |
|----|------------------|
| R2.4.1 | WHEN `PUT /api/projects/{projectId}/crs/{crId}` is called with valid data, the system shall replace CR content and return HTTP 200. |
| R2.4.2 | WHEN `PUT /api/projects/{projectId}/crs/{crId}` is called for a non-existent CR, the system shall return HTTP 404. |

**Measurable Result**: File content matches PUT body. Response includes updated CR object.

#### 2.5 Update CR - Partial (`PATCH /api/projects/{projectId}/crs/{crId}`)
| ID | EARS Requirement |
|----|------------------|
| R2.5.1 | WHEN `PATCH /api/projects/{projectId}/crs/{crId}` is called with status update, the system shall update only the status field and return HTTP 200. |
| R2.5.2 | WHEN `PATCH /api/projects/{projectId}/crs/{crId}` is called with priority update, the system shall update only the priority field and return HTTP 200. |
| R2.5.3 | WHEN `PATCH /api/projects/{projectId}/crs/{crId}` is called for a non-existent CR, the system shall return HTTP 404. |

**Measurable Result**: Only patched fields change in file. Other fields remain unchanged. Response reflects updated state.

#### 2.6 Delete CR (`DELETE /api/projects/{projectId}/crs/{crId}`)
| ID | EARS Requirement |
|----|------------------|
| R2.6.1 | WHEN `DELETE /api/projects/{projectId}/crs/{crId}` is called for an existing CR, the system shall delete the file and return HTTP 204. |
| R2.6.2 | WHEN `DELETE /api/projects/{projectId}/crs/{crId}` is called for a non-existent CR, the system shall return HTTP 404. |

**Measurable Result**: File removed from filesystem. Subsequent GET returns 404. Response has no body (204).

---

### Requirement 3: Documents Resource (`/api/documents`)

**Objective**: As a developer, I want document discovery and retrieval verified by E2E tests, so that the Documents view functions correctly.

#### 3.1 Discover Documents (`GET /api/documents?projectId={id}`)
| ID | EARS Requirement |
|----|------------------|
| R3.1.1 | WHEN `GET /api/documents?projectId={id}` is called, the system shall return HTTP 200 with an array of document metadata objects. |
| R3.1.2 | WHEN `GET /api/documents` is called without `projectId`, the system shall return HTTP 400. |
| R3.1.3 | WHEN project has no documents, the system shall return HTTP 200 with an empty array. |

**Measurable Result**: Each document object contains `path`, `name`, `type`. Only markdown files matching project's `documentPaths` config are returned.

#### 3.2 Get Document Content (`GET /api/documents/content?projectId={id}&path={path}`)
| ID | EARS Requirement |
|----|------------------|
| R3.2.1 | WHEN `GET /api/documents/content?projectId={id}&path={path}` is called with valid parameters, the system shall return HTTP 200 with raw markdown content. |
| R3.2.2 | WHEN `GET /api/documents/content` is called without `path`, the system shall return HTTP 400. |
| R3.2.3 | WHEN `GET /api/documents/content` is called with a path outside project root, the system shall return HTTP 403. |
| R3.2.4 | WHEN `GET /api/documents/content` is called for a non-existent file, the system shall return HTTP 404. |

**Measurable Result**: Content-Type is `text/plain`. Body contains file content. Path traversal attempts return 403.

#### 3.3 Configure Document Paths (`POST /api/documents/configure`)
| ID | EARS Requirement |
|----|------------------|
| R3.3.1 | WHEN `POST /api/documents/configure` is called with valid `documentPaths`, the system shall update project config and return HTTP 200. |
| R3.3.2 | WHEN `POST /api/documents/configure` is called without `projectId`, the system shall return HTTP 400. |

**Measurable Result**: Project config file updated with new `documentPaths` array. Response includes `success: true`.

---

### Requirement 4: Tasks Resource (`/api/tasks`) — Legacy

**Objective**: As a developer, I want legacy task endpoints verified by E2E tests, so that backward compatibility is maintained.

#### 4.1 List Tasks (`GET /api/tasks`)
| ID | EARS Requirement |
|----|------------------|
| R4.1.1 | WHEN `GET /api/tasks` is called, the system shall return HTTP 200 with an array of task filenames. |

**Measurable Result**: Response is array of strings (filenames). Files match `*.md` pattern.

#### 4.2 Get Task Content (`GET /api/tasks/{filename}`)
| ID | EARS Requirement |
|----|------------------|
| R4.2.1 | WHEN `GET /api/tasks/{filename}` is called for an existing file, the system shall return HTTP 200 with raw markdown content. |
| R4.2.2 | WHEN `GET /api/tasks/{filename}` is called for a non-existent file, the system shall return HTTP 404. |

**Measurable Result**: Content-Type is `text/plain`. Body contains markdown.

#### 4.3 Save Task (`POST /api/tasks/save`)
| ID | EARS Requirement |
|----|------------------|
| R4.3.1 | WHEN `POST /api/tasks/save` is called with `filename` and `content`, the system shall create/update the file and return HTTP 200. |
| R4.3.2 | WHEN `POST /api/tasks/save` is called without required fields, the system shall return HTTP 400. |

**Measurable Result**: File exists on disk with expected content. Response includes `success: true`.

#### 4.4 Delete Task (`DELETE /api/tasks/{filename}`)
| ID | EARS Requirement |
|----|------------------|
| R4.4.1 | WHEN `DELETE /api/tasks/{filename}` is called for an existing file, the system shall delete it and return HTTP 200. |
| R4.4.2 | WHEN `DELETE /api/tasks/{filename}` is called for a non-existent file, the system shall return HTTP 404. |

**Measurable Result**: File removed from filesystem. Response includes `success: true`.

---

### Requirement 5: Duplicates Resource (`/api/duplicates`) — Deprecated

**Objective**: As a developer, I want deprecated duplicate detection endpoints to return proper deprecation responses.

#### 5.1 Get Duplicates (`GET /api/duplicates/{projectId}`)
| ID | EARS Requirement |
|----|------------------|
| R5.1.1 | WHEN `GET /api/duplicates/{projectId}` is called, the system shall return HTTP 200 with `duplicates: []` and `totalDuplicates: 0`. |

**Measurable Result**: Response body has empty `duplicates` array (deprecated endpoint behavior per MDT-082).

#### 5.2 Preview Duplicate Rename (`POST /api/duplicates/preview`)
| ID | EARS Requirement |
|----|------------------|
| R5.2.1 | WHEN `POST /api/duplicates/preview` is called, the system shall return HTTP 200 with empty preview result. |

**Measurable Result**: Response indicates deprecated endpoint (empty results per MDT-082).

#### 5.3 Resolve Duplicate (`POST /api/duplicates/resolve`)
| ID | EARS Requirement |
|----|------------------|
| R5.3.1 | WHEN `POST /api/duplicates/resolve` is called, the system shall return HTTP 200 with empty resolution result. |

**Measurable Result**: Response indicates deprecated endpoint (empty results per MDT-082).

---

### Requirement 6: SSE Resource (`/api/events`)

**Objective**: As a developer, I want Server-Sent Events streaming verified by E2E tests, so that real-time updates work correctly.

#### 6.1 SSE Connection Establishment
| ID | EARS Requirement |
|----|------------------|
| R6.1.1 | WHEN `GET /api/events` is called, the system shall respond with `Content-Type: text/event-stream`. |
| R6.1.2 | WHEN SSE connection is established, the system shall send an initial connection event with `type: "connection"` and `status: "connected"`. |
| R6.1.3 | WHILE SSE connection is open, the system shall maintain the connection with appropriate keepalive. |

**Measurable Result**: Response headers include `Content-Type: text/event-stream`, `Cache-Control: no-cache`. First event contains `connection` type with timestamp.

#### 6.2 File Change Event Broadcasting
| ID | EARS Requirement |
|----|------------------|
| R6.2.1 | WHEN a CR file is created, the system shall broadcast an SSE event with `type: "file-change"` and `action: "add"`. |
| R6.2.2 | WHEN a CR file is modified, the system shall broadcast an SSE event with `type: "file-change"` and `action: "change"`. |
| R6.2.3 | WHEN a CR file is deleted, the system shall broadcast an SSE event with `type: "file-change"` and `action: "unlink"`. |

**Measurable Result**: SSE event received within 5 seconds of file operation. Event data contains file path and action type.

#### 6.3 Client Lifecycle Management
| ID | EARS Requirement |
|----|------------------|
| R6.3.1 | WHEN SSE client disconnects, the system shall remove the client from the broadcast list. |
| R6.3.2 | WHILE multiple SSE clients are connected, the system shall broadcast events to all clients. |

**Measurable Result**: Client count (`sseClients` from `/api/status`) decrements on disconnect. All connected clients receive same event.

---

### Requirement 7: System Resource (`/api/status`, `/api/config`, `/api/filesystem`)

**Objective**: As a developer, I want system endpoints verified by E2E tests, so that server health and configuration remain accessible.

#### 7.1 Server Status (`GET /api/status`)
| ID | EARS Requirement |
|----|------------------|
| R7.1.1 | WHEN `GET /api/status` is called, the system shall return HTTP 200 with status `"ok"`. |
| R7.1.2 | WHEN `GET /api/status` is called, the response shall include `timestamp` (ISO 8601) and `sseClients` count (integer >= 0). |

**Measurable Result**: Response contains `status: "ok"`, valid ISO timestamp, integer `sseClients` >= 0.

#### 7.2 System Directories (`GET /api/directories`)
| ID | EARS Requirement |
|----|------------------|
| R7.2.1 | WHEN `GET /api/directories` is called, the system shall return HTTP 200 with home directory and common directories list. |

**Measurable Result**: Response contains `home` (string path) and `directories` (array of strings).

#### 7.3 Configuration (`GET /api/config`, `GET /api/config/global`, `GET /api/config/links`)
| ID | EARS Requirement |
|----|------------------|
| R7.3.1 | WHEN `GET /api/config` is called, the system shall return HTTP 200 with discovery settings. |
| R7.3.2 | WHEN `GET /api/config/global` is called, the system shall return HTTP 200 with full configuration including `discovery`, `links`, `ui`, `system` sections. |
| R7.3.3 | WHEN `GET /api/config/links` is called with link config present, the system shall return HTTP 200 with link settings. |
| R7.3.4 | WHEN `GET /api/config/links` is called without link config, the system shall return HTTP 404. |

**Measurable Result**: Config response includes `discovery.autoDiscover` (boolean), `discovery.searchPaths` (array), `discovery.maxDepth` (integer).

#### 7.4 File System Browser (`GET /api/filesystem`, `POST /api/filesystem/exists`)
| ID | EARS Requirement |
|----|------------------|
| R7.4.1 | WHEN `GET /api/filesystem?path={path}` is called, the system shall return HTTP 200 with directory tree. |
| R7.4.2 | WHEN `POST /api/filesystem/exists` is called with a valid directory path, the system shall return `exists: 1`. |
| R7.4.3 | WHEN `POST /api/filesystem/exists` is called with a non-existent path, the system shall return `exists: 0`. |
| R7.4.4 | WHEN `POST /api/filesystem/exists` is called with tilde path (`~`), the system shall expand it and return `expandedPath`. |
| R7.4.5 | WHEN `POST /api/filesystem/exists` is called without path, the system shall return HTTP 400. |

**Measurable Result**: Directory tree contains `children` array with `name`, `type` (file/directory). Exists check returns integer `0` or `1`, plus `expandedPath` and `isInDiscovery`.

#### 7.5 Cache Management (`POST /api/cache/clear`, `POST /api/config/clear`)
| ID | EARS Requirement |
|----|------------------|
| R7.5.1 | WHEN `POST /api/cache/clear` is called, the system shall clear file operation cache and return HTTP 200 with `success: true`. |
| R7.5.2 | WHEN `POST /api/config/clear` is called, the system shall clear config cache and return HTTP 200 with `success: true`. |

**Measurable Result**: Response includes `success: true` and `timestamp`. Subsequent reads bypass cache.

---

### Requirement 8: OpenAPI Documentation (`/api-docs`)

**Objective**: As a developer, I want API documentation endpoints verified by E2E tests, so that the docs remain accessible.

#### 8.1 OpenAPI Spec (`GET /api-docs/json`)
| ID | EARS Requirement |
|----|------------------|
| R8.1.1 | WHEN `GET /api-docs/json` is called, the system shall return HTTP 200 with valid OpenAPI 3.0 JSON specification. |

**Measurable Result**: Response Content-Type is `application/json`. Body contains `openapi` field (version string) and `paths` object.

#### 8.2 Redoc UI (`GET /api-docs`)
| ID | EARS Requirement |
|----|------------------|
| R8.2.1 | WHEN `GET /api-docs` is called, the system shall return HTTP 200 with HTML page containing Redoc UI. |

**Measurable Result**: Response Content-Type is `text/html`. Body contains Redoc-related markup.

---

## Functional Requirements

| ID | Requirement | Rationale |
|----|-------------|-----------|
| FR-1 | E2E tests shall use isolated environments via `shared/test-lib` | Prevents interference with development data |
| FR-2 | Tests shall use unique ports to enable parallel execution | Avoids port conflicts in CI/CD |
| FR-3 | Tests shall clean up created resources after execution | Prevents test data accumulation |
| FR-4 | Tests shall verify both success and error response codes | Ensures complete API contract coverage |
| FR-5 | Tests shall validate response body structure | Catches schema drift |
| FR-6 | Tests shall cover empty/edge case scenarios | Ensures robustness |
| FR-7 | Tests shall use Supertest for HTTP requests | Enables testing without starting servers |
| FR-8 | Tests shall use Jest/Vitest as test runner | Aligns with existing backend tests |
| FR-9 | Tests shall validate against OpenAPI spec via jest-openapi | Catches implementation drift |
| FR-10 | SSE tests shall use EventSource client simulation | Enables testing real-time features |

## Non-Functional Requirements

### Performance
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-P1 | Full test suite execution time | < 60 seconds | Fast feedback loop for CI/CD |
| NFR-P2 | Individual test timeout | < 5 seconds | Identifies slow endpoints |

### Reliability
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-R1 | Test flakiness rate | < 1% | Reliable CI/CD signal |
| NFR-R2 | Test isolation | 100% | No test interdependencies |
| NFR-R3 | Cleanup success rate | 100% | No leftover test data |

### Coverage
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-C1 | API endpoint coverage | > 80% | Core functionality verified |
| NFR-C2 | Error path coverage | All 4xx/5xx cases | Error handling verified |

---

## Artifact Mapping

| Req ID | Requirement Summary | Test File | Primary Route |
|--------|---------------------|-----------|---------------|
| R1.x | Projects CRUD | `projects.test.ts` | `server/routes/projects.ts` |
| R2.x | CRs CRUD | `crs.test.ts` | `server/routes/projects.ts` |
| R3.x | Documents discovery/content | `documents.test.ts` | `server/routes/documents.ts` |
| R4.x | Legacy tasks | `tasks.test.ts` | `server/routes/tickets.ts` |
| R5.x | Deprecated duplicates | `duplicates.test.ts` | `server/routes/tickets.ts` |
| R6.x | SSE events | `sse.test.ts` | `server/routes/sse.ts` |
| R7.x | System/config/filesystem | `system.test.ts` | `server/routes/system.ts` |
| R8.x | OpenAPI docs | `openapi-docs.test.ts` | `server/routes/docs.ts` |

---

## Summary: Requirements by Resource

| Resource | Endpoints | Requirements | Key Behaviors Tested |
|----------|-----------|--------------|----------------------|
| Projects | 8 | R1.1–R1.6 (10) | CRUD, enable/disable, deprecation |
| CRs | 5 | R2.1–R2.6 (12) | CRUD, auto-numbering, partial update |
| Documents | 3 | R3.1–R3.3 (7) | Discovery, content retrieval, security |
| Tasks | 4 | R4.1–R4.4 (6) | Legacy CRUD |
| Duplicates | 3 | R5.1–R5.3 (3) | Deprecated stubs |
| SSE | 1 | R6.1–R6.3 (7) | Connection, events, lifecycle |
| System | 9 | R7.1–R7.5 (11) | Status, config, filesystem, cache |
| OpenAPI | 2 | R8.1–R8.2 (2) | Spec, UI |
| **Total** | **35** | **58** | |

---
*Generated from MDT-106 by /mdt:requirements (v3)*
