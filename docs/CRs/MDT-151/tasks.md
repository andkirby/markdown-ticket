# Tasks: MDT-151

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- `SubdocumentService`: owns subDocName input validation, path containment, symlink detection — no other module validates subDocName
- `ProjectValidator`: owns ticketsPath format validation logic — used by config loading
- `ProjectConfigService`: owns config loading — calls validation but doesn't define validation rules
- `path-resolver.ts`: owns shared path utilities — new `isContainedPath()` extracted from existing patterns

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| subDocName validation | `SubdocumentService` | N/A — single owner |
| Path containment check | `SubdocumentService` | N/A — uses shared utility from path-resolver |
| Symlink detection | `SubdocumentService` | N/A — single owner |
| ticketsPath validation | `ProjectValidator` | N/A — single owner |
| Config load enforcement | `ProjectConfigService` | N/A — delegates validation to ProjectValidator |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 (<1ms overhead) | Task 1 (sync ops only), Task 2 (lstatSync only when needed) |
| C2 (no regression) | Task 1, Task 2, Task 3 — all tests include existing patterns |
| C3 (API contract) | Task 1, Task 2 — 200 for valid, 404 same body for rejected |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|-----------|--------------|-------|------------|
| M1: Path containment | `path_traversal_blocked`, `literal_dotdot_traversal_blocked`, `valid_subdocument_returned` | Task 1 | Unit tests GREEN, traversal blocked |
| M2: Symlink containment | `symlink_denied_by_default`, `symlink_allowed_within_containment`, `symlink_rejected_outside_containment` | Task 2 | Integration tests GREEN, symlink policy active |
| M3: Config hardening | `config_rejects_traversal_path`, `config_accepts_simple_relative`, `config_accepts_absolute_path` | Task 3 | Config validation enforced at load |

## Tasks

### Task 1: Add input validation and path containment to SubdocumentService (M1)

**Structure**: `shared/services/ticket/SubdocumentService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-subdoc-security-unit` → `shared/services/ticket/__tests__/SubdocumentService.security.test.ts`: path traversal, input validation, null bytes, encoding, unicode, length

**Makes GREEN (Behavior)**:
- `path_traversal_blocked` → `server/tests/api/subdocuments.security.test.ts` (BR-1.1)
- `literal_dotdot_traversal_blocked` → `server/tests/api/subdocuments.security.test.ts` (BR-1.1)
- `valid_subdocument_returned` → `server/tests/api/subdocuments.security.test.ts` (BR-1.2)

**Scope**: Input validation + path containment in SubdocumentService
**Boundary**: Changes only SubdocumentService.isSupportedSubdocumentPath() and resolvePath(). Optionally adds shared utility to path-resolver.ts.

**Creates**:
- `isContainedPath()` utility in `shared/utils/path-resolver.ts` (extract pattern from ProjectService.isPathWithinProject)

**Modifies**:
- `shared/services/ticket/SubdocumentService.ts` — isSupportedSubdocumentPath(), resolvePath()

**Must Not Touch**:
- `ProjectConfigService` — belongs to Task 3
- `TicketLocationResolver` — upstream, no changes needed
- `server/controllers/ProjectController.ts` — no controller changes for validation

**Exclude**: No symlink handling — belongs to Task 2

**Anti-duplication**: Import `isContainedPath` from `shared/utils/path-resolver.js` — do NOT copy `isPathWithinProject` logic from ProjectService

**Duplication Guard**:
- Check `DocumentService.getDocumentContent()` for existing path containment pattern
- If `isContainedPath` already exists in path-resolver.ts, use it — do not create a second copy
- Verify no second path-validation owner was introduced

**Verify**:

```bash
bun test shared/services/ticket/__tests__/SubdocumentService.security.test.ts
bun test server/tests/api/subdocuments.security.test.ts --testNamePattern="path traversal|valid subdocument|input validation"
```

**Done when**:
- [ ] Unit tests GREEN (were RED)
- [ ] BDD scenarios `path_traversal_blocked`, `literal_dotdot_traversal_blocked`, `valid_subdocument_returned` GREEN
- [ ] No duplicated logic
- [ ] Existing subdocument tests still pass

---

### Task 2: Add symlink containment to SubdocumentService with config support (M2)

**Structure**: `shared/services/ticket/SubdocumentService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-subdoc-security-unit` → symlink test cases in SubdocumentService.security.test.ts
- `TEST-subdoc-security-api` → `server/tests/api/subdocuments.security.test.ts`: symlink containment tests

**Makes GREEN (Behavior)**:
- `symlink_denied_by_default` → integration test (BR-3.1)
- `symlink_allowed_within_containment` → integration test (BR-3.2)
- `symlink_rejected_outside_containment` → integration test (BR-3.3)

**Scope**: Symlink detection and containment in SubdocumentService.read(), with `allowSymlinks` config support in ProjectConfigService
**Boundary**: Adds symlink check in SubdocumentService.read() after Task 1's validation. Adds config option parsing.

**Creates**:
- (none — test files already created)

**Modifies**:
- `shared/services/ticket/SubdocumentService.ts` — read() method adds lstatSync check, realpathSync containment
- `shared/services/project/ProjectConfigService.ts` — reads `allowSymlinks` from config (no schema change, just reads existing config)

**Must Not Touch**:
- `ProjectValidator` — belongs to Task 3
- `path-resolver.ts` — already updated in Task 1
- Server routes/controllers — no changes needed

**Exclude**: No ticketsPath validation — belongs to Task 3

**Anti-duplication**: Import `isContainedPath` from Task 1 — do NOT reimplement containment check

**Duplication Guard**:
- Check if Task 1 already added containment utilities before adding symlink-specific ones
- Verify no second symlink-handling module was introduced

**Verify**:

```bash
bun test shared/services/ticket/__tests__/SubdocumentService.security.test.ts --testNamePattern="symlink"
bun test server/tests/api/subdocuments.security.test.ts --testNamePattern="symlink"
```

**Done when**:
- [ ] Unit symlink tests GREEN (were RED)
- [ ] Integration symlink tests GREEN
- [ ] BDD scenarios `symlink_denied_by_default`, `symlink_allowed_within_containment`, `symlink_rejected_outside_containment` GREEN
- [ ] No duplicated containment logic
- [ ] Existing subdocument tests still pass

---

### Task 3: Wire ticketsPath validation into server-side config load (M3)

**Structure**: `shared/tools/ProjectValidator.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-config-validation` → `shared/tools/__tests__/project-management/ticketsPath-validation.test.ts`

**Makes GREEN (Behavior)**:
- `config_rejects_traversal_path` → unit test (BR-2.1)
- `config_accepts_simple_relative` → unit test (BR-2.2)
- `config_accepts_absolute_path` → unit test (BR-2.3)

**Scope**: Ensure ProjectValidator.validateTicketsPath() is called during server-side project config loading
**Boundary**: Only config loading path — no changes to CLI tools or MCP server

**Creates**:
- (none — test file already created, validator already exists)

**Modifies**:
- `shared/services/project/ProjectConfigService.ts` — call validateTicketsPath() in getProjectConfig() or createOrUpdateLocalConfig()
- `shared/tools/ProjectValidator.ts` — may need minor enhancements to validateTicketsPath() for edge cases

**Must Not Touch**:
- `SubdocumentService` — belongs to Task 1/2
- Server controllers/routes — no API changes
- `TicketService` — no changes to ticket operations

**Exclude**: No subdocument path handling — belongs to Task 1/2

**Anti-duplication**: Use existing `ProjectValidator.validateTicketsPath()` — do NOT create a second validation function

**Duplication Guard**:
- Check if validateTicketsPath() already covers all edge cases before adding new logic
- Verify no second config-validation module was introduced

**Verify**:

```bash
bun test shared/tools/__tests__/project-management/ticketsPath-validation.test.ts
```

**Done when**:
- [ ] Config validation tests GREEN (were RED)
- [ ] BDD scenarios `config_rejects_traversal_path`, `config_accepts_simple_relative`, `config_accepts_absolute_path` GREEN
- [ ] No duplicated validation logic
- [ ] Existing project management tests still pass

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| services/ticket/ | 2 | 2 | 0 | ✅ |
| tools/ | 1 | 1 | 0 | ✅ |
| services/project/ | 1 | 1 | 0 | ✅ |
| utils/ | 1 | 1 | 0 | ✅ |
| server/services/ | 1 | 1 | 0 | ✅ |
| tests (shared) | 2 | 2 | 0 | ✅ |
| tests (server) | 1 | 1 | 0 | ✅ |
| reference (ProjectService, TicketLocationResolver) | 2 | 2 | 0 | ✅ |

## Post-Implementation

- [ ] No duplication (grep check: `isContainedPath` used, not copied)
- [ ] Scope boundaries respected
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN
- [ ] Existing subdocument test suite passes (regression)
- [ ] Smoke test: `dev:full` mode, board loads, subdocument reads work
