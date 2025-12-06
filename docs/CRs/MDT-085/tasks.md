# Tasks: MDT-085

**Source**: [MDT-085](../MDT-085-add-openapi-specification-with-swagger-jsdoc-and-r.md)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `server/` |
| Test command | `cd server && npm test` |
| Build command | `npm run build:shared && cd server && npm run build` |
| File extension | `.ts` |

## Size Thresholds

| Role | Default | Hard Max | Action |
|------|---------|----------|--------|
| Orchestration (`config.ts`) | 100 | 150 | Flag at 100+, STOP at 150+ |
| Schema definitions (`schemas.ts`) | 200 | 300 | Flag at 200+, STOP at 300+ |
| Utility (`docs.ts`) | 75 | 110 | Flag at 75+, STOP at 110+ |
| JSDoc per endpoint | 20 | 30 | Flag at 20+, STOP at 30+ |

*(Inherited from Architecture Design)*

## Shared Patterns (from Architecture Design)

| Pattern | Extract To | Used By |
|---------|------------|---------|
| CR schema | `server/openapi/schemas.ts` | projects.ts (6 endpoints) |
| Project schema | `server/openapi/schemas.ts` | projects.ts (4 endpoints), system.ts |
| Document schema | `server/openapi/schemas.ts` | documents.ts (2 endpoints) |
| Error responses (400, 404, 500) | `server/openapi/schemas.ts` | All 6 route files |
| Path params (projectId, crId) | `server/openapi/schemas.ts` | projects.ts (8 endpoints) |

> Phase 1 extracts schemas BEFORE JSDoc annotations reference them.

## Architecture Structure (from CR)

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

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating schema definitions in JSDoc instead of using `$ref` → STOP, use schemas.ts
- JSDoc block > 30 lines → STOP, simplify or split endpoint docs

---

## Phase 1: Setup & Shared Schemas

> Install dependencies and create shared schema definitions FIRST.

**Phase goal**: Dependencies installed, schemas defined, config ready
**Phase verify**: `npm run build` passes in server directory

### Task 1.1: Install dependencies

**Do**:
```bash
cd server && npm install swagger-jsdoc redoc-express --save
npm install @types/swagger-jsdoc --save-dev
```

**Verify**:
```bash
grep "swagger-jsdoc" server/package.json
grep "redoc-express" server/package.json
```

**Done when**:
- [ ] `swagger-jsdoc` in dependencies
- [ ] `redoc-express` in dependencies
- [ ] `@types/swagger-jsdoc` in devDependencies

---

### Task 1.2: Create OpenAPI schemas

**Structure**: `server/openapi/schemas.ts`

**Limits**:
- Default: 200 lines
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Create**: `server/openapi/schemas.ts`

**Include**:
- CR schema (code, title, status, type, priority, content, etc.)
- Project schema (id, name, code, path, enabled, etc.)
- Document schema (path, name, content)
- Error response schemas (400, 404, 500)
- Common parameters (projectId, crId path params)
- CRStatus, CRType, CRPriority enums

**Anti-duplication**:
- This IS the single source of truth for all schemas
- JSDoc annotations in routes MUST use `$ref: '#/components/schemas/{Name}'`
- Never inline schema definitions in route JSDoc

**Verify**:
```bash
wc -l server/openapi/schemas.ts  # ≤ 200 (or flag ≤ 300)
```

**Done when**:
- [ ] File at `server/openapi/schemas.ts`
- [ ] Size ≤ 200 lines (or flagged if ≤ 300)
- [ ] All shared schemas defined
- [ ] Exports schemas object for swagger-jsdoc

---

### Task 1.3: Create swagger-jsdoc configuration

**Structure**: `server/openapi/config.ts`

**Limits**:
- Default: 100 lines
- Hard Max: 150 lines
- If > 100: ⚠️ flag
- If > 150: ⛔ STOP

**Create**: `server/openapi/config.ts`

**Include**:
- OpenAPI 3.0.0 info (title, version, description)
- Server URLs (localhost:3001)
- API path glob pattern (`./routes/*.ts`)
- Import and merge schemas from `schemas.ts`
- Export swaggerSpec and swaggerOptions

**Exclude**:
- Schema definitions (those go in schemas.ts)
- Route handlers (those stay in routes/)

**Anti-duplication**:
- Import schemas from `./schemas.ts`
- Do NOT define schemas inline

**Verify**:
```bash
wc -l server/openapi/config.ts  # ≤ 100 (or flag ≤ 150)
cd server && npm run build
```

**Done when**:
- [ ] File at `server/openapi/config.ts`
- [ ] Size ≤ 100 lines
- [ ] Imports schemas from schemas.ts
- [ ] TypeScript compiles without errors

---

## Phase 2: Route Annotations

> Add @openapi JSDoc blocks to all route files. Use $ref to schemas.

**Phase goal**: All 42 endpoints annotated
**Phase verify**: swagger-jsdoc generates valid spec

### Task 2.1: Annotate projects.ts (12 endpoints)

**Structure**: `server/routes/projects.ts`

**Limits per endpoint**:
- Default: 20 lines per JSDoc block
- Hard Max: 30 lines per JSDoc block
- If > 20: ⚠️ flag
- If > 30: ⛔ STOP, simplify

**Endpoints to annotate**:
1. `GET /` - List all projects
2. `GET /:projectId/config` - Get project configuration
3. `GET /:projectId/crs` - List CRs for project
4. `GET /:projectId/crs/:crId` - Get specific CR
5. `POST /:projectId/crs` - Create new CR
6. `PATCH /:projectId/crs/:crId` - Partial update CR
7. `PUT /:projectId/crs/:crId` - Full update CR
8. `DELETE /:projectId/crs/:crId` - Delete CR
9. `POST /register` - Deprecated endpoint
10. `POST /create` - Create new project
11. `PUT /:code/update` - Update project
12. `PUT /:code/enable` - Enable project
13. `PUT /:code/disable` - Disable project

**Anti-duplication**:
- Use `$ref: '#/components/schemas/CR'` — NOT inline CR schema
- Use `$ref: '#/components/schemas/Project'` — NOT inline Project schema
- Use `$ref: '#/components/schemas/Error400'` — NOT inline error schema

**JSDoc template**:
```typescript
/**
 * @openapi
 * /api/projects/{projectId}/crs:
 *   get:
 *     summary: List CRs for project
 *     tags: [Projects]
 *     parameters:
 *       - $ref: '#/components/parameters/projectId'
 *     responses:
 *       200:
 *         description: List of CRs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CR'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
```

**Verify**:
```bash
grep -c "@openapi" server/routes/projects.ts  # Should be 12+
```

**Done when**:
- [ ] All 12 endpoints have @openapi blocks
- [ ] Each block ≤ 20 lines (or flagged)
- [ ] All use $ref to schemas.ts definitions
- [ ] No inline schema definitions

---

### Task 2.2: Annotate tickets.ts (8 endpoints)

**Structure**: `server/routes/tickets.ts`

**Limits per endpoint**: 20 lines default, 30 hard max

**Endpoints to annotate**:
1. `GET /api/tasks` - List all tasks
2. `GET /api/tasks/:filename` - Get specific task
3. `POST /api/tasks/save` - Save task
4. `DELETE /api/tasks/:filename` - Delete task
5. `GET /api/duplicates/:projectId` - Get duplicates
6. `POST /api/duplicates/preview` - Preview rename
7. `POST /api/duplicates/resolve` - Resolve duplicate

**Anti-duplication**:
- Use `$ref` for all schema references
- Reuse error response schemas from schemas.ts

**Verify**:
```bash
grep -c "@openapi" server/routes/tickets.ts  # Should be 7+
```

**Done when**:
- [ ] All endpoints have @openapi blocks
- [ ] Each block ≤ 20 lines
- [ ] All use $ref to schemas

---

### Task 2.3: Annotate documents.ts (3 endpoints)

**Structure**: `server/routes/documents.ts`

**Limits per endpoint**: 20 lines default, 30 hard max

**Endpoints to annotate**:
1. `GET /` - Discover documents
2. `GET /content` - Get document content
3. `POST /configure` - Configure document paths

**Anti-duplication**:
- Use `$ref: '#/components/schemas/Document'`
- Reuse projectId parameter from schemas.ts

**Verify**:
```bash
grep -c "@openapi" server/routes/documents.ts  # Should be 3
```

**Done when**:
- [ ] All 3 endpoints have @openapi blocks
- [ ] Each block ≤ 20 lines
- [ ] All use $ref to schemas

---

### Task 2.4: Annotate sse.ts (1 endpoint)

**Structure**: `server/routes/sse.ts`

**Limits**: 20 lines default, 30 hard max

**Endpoints to annotate**:
1. `GET /api/events` - SSE stream

**Note**: SSE endpoints require special OpenAPI handling for streaming responses

**Done when**:
- [ ] SSE endpoint has @openapi block
- [ ] Block ≤ 20 lines

---

### Task 2.5: Annotate system.ts (8 endpoints)

**Structure**: `server/routes/system.ts`

**Limits per endpoint**: 20 lines default, 30 hard max

**Endpoints to annotate**:
1. `GET /status` - Server health
2. `GET /directories` - System directories
3. `GET /config/links` - Link configuration
4. `GET /filesystem` - File system tree
5. `POST /filesystem/exists` - Check directory
6. `POST /cache/clear` - Clear cache
7. `GET /config` - Get configuration
8. `GET /config/global` - Get global config
9. `POST /config/clear` - Clear config cache

**Anti-duplication**:
- Reuse error schemas from schemas.ts
- Use common response patterns

**Verify**:
```bash
grep -c "@openapi" server/routes/system.ts  # Should be 9
```

**Done when**:
- [ ] All 9 endpoints have @openapi blocks
- [ ] Each block ≤ 20 lines
- [ ] All use $ref to schemas

---

### Task 2.6: Annotate devtools.ts (10 endpoints)

**Structure**: `server/routes/devtools.ts`

**Limits per endpoint**: 20 lines default, 30 hard max

**Endpoints to annotate**:
1. `GET /logs` - Get server logs
2. `GET /logs/stream` - Stream logs (SSE)
3. `GET /frontend/logs/status` - Frontend logging status
4. `POST /frontend/logs/start` - Start frontend logging
5. `POST /frontend/logs/stop` - Stop frontend logging
6. `POST /frontend/logs` - Receive frontend logs
7. `GET /frontend/logs` - Get frontend logs
8. `GET /frontend/dev-logs/status` - Dev logs status
9. `POST /frontend/dev-logs` - Receive dev logs
10. `GET /frontend/dev-logs` - Get dev logs

**Anti-duplication**:
- Reuse error schemas
- Use common logging response patterns

**Verify**:
```bash
grep -c "@openapi" server/routes/devtools.ts  # Should be 10
```

**Done when**:
- [ ] All 10 endpoints have @openapi blocks
- [ ] Each block ≤ 20 lines
- [ ] All use $ref to schemas

---

## Phase 3: UI & Integration

> Create Redoc UI route and wire everything together.

**Phase goal**: `/api-docs` serves interactive documentation
**Phase verify**: `curl http://localhost:3001/api-docs` returns HTML

### Task 3.1: Create docs route for Redoc UI

**Structure**: `server/routes/docs.ts`

**Limits**:
- Default: 75 lines
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**Create**: `server/routes/docs.ts`

**Include**:
- Import redoc-express
- Import swaggerSpec from openapi/config.ts
- Route handler for `/api-docs`
- JSON endpoint for raw spec at `/api-docs.json`

**Anti-duplication**:
- Import config from `../openapi/config.ts` — do NOT recreate swagger setup
- Use redoc-express middleware — do NOT build custom HTML

**Verify**:
```bash
wc -l server/routes/docs.ts  # ≤ 75 (or flag ≤ 110)
```

**Done when**:
- [ ] File at `server/routes/docs.ts`
- [ ] Size ≤ 75 lines
- [ ] Exports router factory function
- [ ] Imports from openapi/config.ts

---

### Task 3.2: Register docs route in server.ts

**Structure**: `server/server.ts`

**Modify**: Add docs route registration

**Changes**:
- Import createDocsRouter from routes/docs.ts
- Register at `/api-docs` path
- Import swagger setup to trigger generation

**Anti-duplication**:
- Follow existing route registration pattern in server.ts
- Do NOT inline swagger configuration

**Verify**:
```bash
grep "api-docs" server/server.ts
cd server && npm run build
```

**Done when**:
- [ ] Docs route imported and registered
- [ ] Build succeeds
- [ ] No duplicate swagger configuration

---

### Task 3.3: Add npm scripts for OpenAPI generation

**Structure**: `server/package.json`

**Add scripts**:
```json
{
  "scripts": {
    "openapi:generate": "ts-node scripts/generate-openapi.ts",
    "openapi:validate": "swagger-cli validate openapi.yaml"
  }
}
```

**Create**: `server/scripts/generate-openapi.ts` (small utility, ≤30 lines)

**Done when**:
- [ ] `npm run openapi:generate` creates `server/openapi.yaml`
- [ ] `npm run openapi:validate` validates the spec

---

## Phase 4: Post-Implementation

### Task 4.1: Verify no schema duplication

**Do**: Search for inline schema definitions in route files
```bash
grep -r "type: object" server/routes/*.ts | grep -v "node_modules"
grep -r "properties:" server/routes/*.ts | grep -v "node_modules"
```

**Done when**:
- [ ] All schema definitions are in `schemas.ts`
- [ ] Route files only use `$ref` references

---

### Task 4.2: Verify size compliance

**Do**: Check all new files
```bash
wc -l server/openapi/config.ts   # ≤ 100
wc -l server/openapi/schemas.ts  # ≤ 200
wc -l server/routes/docs.ts      # ≤ 75
```

**Done when**:
- [ ] No files exceed hard max
- [ ] Flagged files (> default) have justification

---

### Task 4.3: Validate OpenAPI spec

**Do**:
```bash
cd server && npm run openapi:validate
curl http://localhost:3001/api-docs  # Should return HTML
curl http://localhost:3001/api-docs.json  # Should return JSON spec
```

**Done when**:
- [ ] `swagger-cli validate` passes with no errors
- [ ] Redoc UI loads and displays all 42 endpoints
- [ ] All schemas render correctly

---

### Task 4.4: Update CR status

**Do**: Mark MDT-085 as Implemented
```bash
# Use MCP tool
mdt-all:update_cr_status project=MDT key=MDT-085 status="Implemented"
```

**Done when**:
- [ ] CR status is "Implemented"
- [ ] Implementation notes added
