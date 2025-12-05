---
code: MDT-085
status: Proposed
dateCreated: 2025-12-05T00:45:30.865Z
type: Technical Debt
priority: Medium
---

# Add OpenAPI specification with swagger-jsdoc and Redoc UI

## 1. Description

### Problem
- No machine-readable API specification exists for the Express backend
- `generated-docs/API.md` is manual markdown, not parseable by tooling
- No interactive API documentation available for developers

### Affected Artifacts
- `server/routes/projects.ts` - 12 endpoints needing JSDoc annotations
- `server/routes/tickets.ts` - 8 endpoints needing JSDoc annotations
- `server/routes/documents.ts` - 3 endpoints needing JSDoc annotations
- `server/routes/sse.ts` - 1 SSE endpoint
- `server/routes/system.ts` - 8 system endpoints
- `server/routes/devtools.ts` - 10 logging endpoints

### Scope
- **Changes**: Add swagger-jsdoc integration, JSDoc annotations to all route files, Redoc UI endpoint
- **Unchanged**: Controller logic, service layer, existing API behavior

## 2. Decision
### Chosen Approach
Use swagger-jsdoc to generate OpenAPI 3.0 spec from JSDoc comments, serve via Redoc UI at `/api-docs`.

### Rationale
- swagger-jsdoc requires minimal refactoring - just add comments to existing routes
- Generates OpenAPI 3.0 compatible with Redoc's rendering
- Keeps spec close to code, reducing documentation drift
- Well-maintained library with TypeScript support

### Pattern
Centralized schema registry — all OpenAPI schemas defined in one location, referenced by JSDoc annotations in route files.

### Shared Patterns

| Pattern | Occurrences | Extract To |
|---------|-------------|------------|
| CR schema | projects.ts (6 endpoints) | `server/openapi/schemas.ts` |
| Project schema | projects.ts (4 endpoints), system.ts | `server/openapi/schemas.ts` |
| Document schema | documents.ts (2 endpoints) | `server/openapi/schemas.ts` |
| Error responses (400, 404, 500) | All 6 route files | `server/openapi/schemas.ts` |
| Path params (projectId, crId) | projects.ts (8 endpoints) | `server/openapi/schemas.ts` |

> These schemas must be defined BEFORE JSDoc annotations reference them.

### Structure
```
server/
  ├── openapi/
  │   ├── config.ts          → swagger-jsdoc configuration
  │   └── schemas.ts         → All OpenAPI schema definitions
  ├── routes/
  │   ├── docs.ts            → Redoc UI serving endpoint (new)
  │   ├── projects.ts        → Add @openapi JSDoc blocks
  │   ├── tickets.ts         → Add @openapi JSDoc blocks
  │   ├── documents.ts       → Add @openapi JSDoc blocks
  │   ├── sse.ts             → Add @openapi JSDoc blocks
  │   ├── system.ts          → Add @openapi JSDoc blocks
  │   └── devtools.ts        → Add @openapi JSDoc blocks
  └── openapi.yaml           → Generated spec (output)
```

### Size Guidance

| Module | Role | Limit | Hard Max |
|--------|------|-------|----------|
| `openapi/config.ts` | Orchestration | 100 | 150 |
| `openapi/schemas.ts` | Schema definitions | 200 | 300 |
| `routes/docs.ts` | Utility | 75 | 110 |
| JSDoc per endpoint | Annotation | 20 | 30 |

**Note**: JSDoc annotations add ~15-25 lines per endpoint. Route files will grow but remain maintainable.

### Extension Rule
To add new endpoint documentation: add `@openapi` JSDoc block above route handler (limit 20 lines), reference schemas from `openapi/schemas.ts`.
## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|---------------|
| **swagger-jsdoc + Redoc** | JSDoc comments on routes | **ACCEPTED** - Minimal refactoring, Redoc compatible |
| tsoa | Decorators on controllers | Requires significant controller refactoring |
| express-oas-generator | Runtime extraction | Less control over spec quality, runtime overhead |
| Manual openapi.yaml | Hand-written spec | High maintenance burden, prone to drift |
| zod-to-openapi | Generate from Zod schemas | Project doesn't use Zod for validation |

## 4. Artifact Specifications
### New Artifacts

| Artifact | Type | Purpose |
|----------|------|----------|
| `server/openapi/config.ts` | Config | swagger-jsdoc configuration (limit 100 lines) |
| `server/openapi/schemas.ts` | Schemas | Centralized OpenAPI schema definitions (limit 200 lines) |
| `server/routes/docs.ts` | Route | Redoc UI serving endpoint (limit 75 lines) |
| `server/openapi.yaml` | Spec file | Generated OpenAPI 3.0 specification |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|---------------|
| `server/routes/projects.ts` | JSDoc added | OpenAPI annotations for 12 endpoints (~240 lines added) |
| `server/routes/tickets.ts` | JSDoc added | OpenAPI annotations for 8 endpoints (~160 lines added) |
| `server/routes/documents.ts` | JSDoc added | OpenAPI annotations for 3 endpoints (~60 lines added) |
| `server/routes/sse.ts` | JSDoc added | OpenAPI annotation for SSE endpoint (~20 lines added) |
| `server/routes/system.ts` | JSDoc added | OpenAPI annotations for 8 endpoints (~160 lines added) |
| `server/routes/devtools.ts` | JSDoc added | OpenAPI annotations for 10 endpoints (~200 lines added) |
| `server/server.ts` | Route added | Register `/api-docs` route, import swagger setup |
| `server/package.json` | Deps added | swagger-jsdoc, redoc-express |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `openapi/config.ts` | Route files | Scans `@openapi` JSDoc via glob `routes/*.ts` |
| `openapi/schemas.ts` | JSDoc annotations | Schema `$ref` references |
| `routes/docs.ts` | `openapi.yaml` | Serves spec to Redoc UI |
| Redoc UI | Browser | HTML page at `/api-docs` |

### Key Patterns
- `@openapi` JSDoc tag: Applied above each route handler
- Schema `$ref`: JSDoc references centralized schemas via `#/components/schemas/{Name}`
- swagger-jsdoc glob: Scans `server/routes/*.ts` for annotations
## 5. Acceptance Criteria
### Functional
- [ ] `server/openapi.yaml` generated and valid per OpenAPI 3.0 spec
- [ ] `/api-docs` serves Redoc UI with all endpoints documented
- [ ] All 42 backend endpoints have `@openapi` JSDoc annotations
- [ ] Request/response schemas defined in `server/openapi/schemas.ts` for CR, Project, Document models
- [ ] Schema references work correctly (`$ref: '#/components/schemas/CR'`)

### Non-Functional
- [ ] OpenAPI spec validates with `npx swagger-cli validate server/openapi.yaml`
- [ ] Redoc UI loads in < 2 seconds
- [ ] npm script `npm run openapi:generate` creates spec

### Size Compliance
- [ ] `server/openapi/config.ts` ≤ 100 lines (hard max 150)
- [ ] `server/openapi/schemas.ts` ≤ 200 lines (hard max 300)
- [ ] `server/routes/docs.ts` ≤ 75 lines (hard max 110)
- [ ] No file exceeds hard max without documented justification

### Extension Rule Verification
- [ ] To add new endpoint: add `@openapi` JSDoc block (≤20 lines) referencing schemas from `schemas.ts`

### Testing
- Manual: Navigate to `http://localhost:3001/api-docs` → Redoc UI renders
- Manual: Click endpoint → Shows request/response examples with schemas
- Manual: Verify schemas display correctly for CR, Project, Document
- CLI: Run `npx swagger-cli validate server/openapi.yaml` → No errors
## 6. Verification

### By CR Type
- **Technical Debt**: `server/openapi.yaml` exists and validates, `/api-docs` endpoint returns 200

### Artifacts After Implementation
- `server/openapi.yaml` - Valid OpenAPI 3.0 spec
- `server/swagger.ts` - swagger-jsdoc configuration
- `server/routes/docs.ts` - Redoc UI route handler
- All route files contain `@openapi` JSDoc blocks

## 7. Deployment

### Implementation Steps
- Install dependencies: `cd server && npm install swagger-jsdoc redoc-express`
- Create `swagger.ts` configuration
- Add JSDoc annotations to route files (prioritize projects.ts first)
- Create docs route for Redoc UI
- Add npm script to generate spec
- Register docs route in server.ts