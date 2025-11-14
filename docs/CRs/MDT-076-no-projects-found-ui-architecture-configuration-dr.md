---
code: MDT-076
status: Implemented
dateCreated: 2025-11-12T03:25:20.400Z
type: Architecture
priority: High
phaseEpic: Architecture Phase A
---

# No Projects Found UI Architecture - Configuration-Driven Project Discovery

## 1. Problem & Scope

**Problem**:
- No UI feedback when `projects.length === 0`
- Manual project registration required without discovery automation
- Regex-based TOML parsing in `server/services/ProjectService.ts`

**Affected Artifacts**:
- `src/components/RedirectToCurrentProject.tsx`
- `server/services/ProjectService.ts`
- `server/routes/configRoutes.js`
- `src/hooks/useProjectManager.ts`

**Scope**:
- Add `/api/config` endpoint
- Replace regex TOML parsing with `toml.js` library
- Implement empty state UI in `RedirectToCurrentProject`
- Add backend connectivity detection
- Does NOT change project data model or CR format

## 2. Decision

**Chosen Approach**: Configuration-driven discovery with empty state UI and backend connectivity detection

**Rationale**:
- `/api/config` endpoint exposes system state (CONFIG_DIR, search paths, project registry)
- `toml.js` library eliminates regex fragility in TOML parsing
- Empty state UI provides actionable setup instructions
- Backend connectivity detection prevents silent failures (Vite proxy errors, HTTP 500)
- Preserves existing project flow when `projects.length > 0`

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| Manual configuration enhancement only | No `/api/config` endpoint, improved setup docs | Doesn't solve discovery automation or empty state UI |
| Regex TOML parsing improvements | Keep regex-based parsing, add error handling | Fragile parsing creates maintenance burden |
| Client-side only solution | No backend changes, hardcoded paths in UI | Requires backend state for CONFIG_DIR and registry paths |

## 4. Artifact Specifications

#### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `/api/config` | Endpoint | System configuration state |
| `src/components/UI/alert.tsx` | Component | Reusable alert UI (shadcn-style) |
| `server/routes/configRoutes.js` | Route | Configuration endpoint routing |
| `server/controllers/configController.js` | Controller | Configuration request handling |

#### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/services/ProjectService.ts` | Dependency change | Added `toml.js` library, removed regex parsing |
| `src/hooks/useProjectManager.ts` | State added | `isBackendDown: boolean` in return interface |
| `src/components/RedirectToCurrentProject.tsx` | Conditional UI | Empty state view when `projects.length === 0` |
| `src/components/RedirectToCurrentProject.tsx` | Error display | Backend down alert when `isBackendDown === true` |

#### Integration Points

| From | To | Interface |
|------|----|-----------|
| `RedirectToCurrentProject` | `/api/config` | `fetch('/api/config')` returns CONFIG_DIR, paths |
| `useProjectManager` | `/api/projects` | Error detection (TypeError, HTTP 500) sets `isBackendDown` |
| `RedirectToCurrentProject` | `AddProjectModal` | "Create Project" button triggers modal |
| `configController` | `ProjectService` | Reads CONFIG_DIR, project registry paths |

#### Key Patterns

- **Empty state detection**: `projects.length === 0` triggers empty state UI
- **Backend detection**: `try/catch` on `/api/projects` sets `isBackendDown` flag
- **Alert visibility**: Show alert only when `projects.length === 0 && isBackendDown === true`
- **TOML parsing**: `toml.js` library replaces regex-based parsing
## 5. Acceptance Criteria

**Functional** (artifact-specific, testable):
```
- [x] `/api/config` endpoint returns JSON with `configDir`, `searchPaths`, `projectRegistry`
- [x] `RedirectToCurrentProject` renders empty state when `projects.length === 0`
- [x] `Alert` component displays when `isBackendDown === true && projects.length === 0`
- [x] `toml.js` library parses `.mdt-config.toml` files in `ProjectService`
- [x] "Create Project" button in `RedirectToCurrentProject` opens `AddProjectModal`
- [x] `useProjectManager` hook returns `isBackendDown: boolean`
```

**Non-Functional** (measurable):
```
- [x] `/api/config` responds in < 200ms (current: ~50ms)
- [x] Error handling catches TypeError (network) and HTTP 500 (server)
- [x] UI responsive across mobile/tablet/desktop viewports
- [x] Alert component uses `class-variance-authority` for styling
```

**Testing** (specific test cases):
```
- Manual: Start frontend without backend → Alert displays with correct commands
- Manual: Create project via modal → Redirects to `/projects/{id}`
- Manual: Malformed TOML file → Error message from `toml.js` parser
- Integration: `/api/config` with no projects → Returns CONFIG_DIR, empty registry
```

## 6. Verification

**Architecture CR**:
- `/api/config` endpoint exists and returns configuration state
- `toml.js` library integrated in `server/services/ProjectService.ts`
- `Alert` component implemented in `src/components/UI/alert.tsx`
- Empty state UI renders in `RedirectToCurrentProject` when `projects.length === 0`
- Backend connectivity detection via `isBackendDown` in `useProjectManager`
- Alert displays actionable commands (`npm run server`, `bin/dc up backend -d`)

**Performance**:
- `/api/config` < 200ms (baseline: N/A, measured: ~50ms)
- Error detection overhead minimal (catch block in existing fetch)

**Code Quality**:
- Removed regex-based TOML parsing from `ProjectService`
- Centralized configuration logic in `configController`
- Reusable `Alert` component follows shadcn pattern

## 7. Deployment

**Standard deployment**:
- `npm run build` compiles frontend and backend
- `npm run dev:full` runs both servers for development
- No database migrations required
- No feature flags required

**Configuration changes**:
- Backend requires `toml` package installed (`npm install` in server/)
- No environment variables added
- No breaking changes to existing APIs