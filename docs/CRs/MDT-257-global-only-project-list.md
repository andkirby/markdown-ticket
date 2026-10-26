---
code: MDT-257
creationId: 601a945f-38fa-45ea-b258-cf32f0b0020c
status: Implemented
dateCreated: 2026-10-22T07:34:25.060Z
type: Bug Fix
priority: Medium
relatedTickets: MDT-077,MDT-116,MDT-142
---

# Show tickets in global-only projects

## 1. Description

### Requirements Scope
`brief`

### Problem
- A global-only project can be detected and a ticket can be read by key, while ticket list operations return no results when the project has no local `.mdt-config.toml`.
- `shared/services/ProjectService.ts#getProjectCRs` and `getProjectCRsMetadata` require local config and return an empty list before using the registry-backed project fields. This affects CLI ticket listing and shared list consumers in the API and MCP server.

### Affected Artifacts
- `shared/services/ProjectService.ts` — full and metadata ticket scans
- `shared/services/TicketService.ts` — pass the resolved project to shared listing
- API and MCP project-list adapters — preserve project context for shared scans
- Shared, CLI, API, and MCP regression coverage

### Scope
- **Changes**: Make full and metadata ticket listing use the resolved project's ticket path when local config is absent, while preserving local-config behavior and worktree aggregation.
- **Unchanged**: Registry format, project config persistence, single-ticket lookup, filtering and sorting behavior.

## 2. Decision

### Chosen Approach
Pass the resolved project context into shared ticket-list scans and use its registry-backed fields as the fallback for absent local config.

### Rationale
- `ProjectFactory.createFromRegistry()` already hydrates the project code and ticket path from global-only registry entries.
- A shared read path fixes CLI, API, and MCP consumers without adding mode-specific behavior to each adapter.
- Keeping `getProjectConfig()` local-only avoids changing the contract for unrelated config readers.
- Existing worktree aggregation and metadata responses must remain intact.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Resolved project context** | Shared list methods receive registry-backed project data | **ACCEPTED** - Reuses already resolved project data across consumers |
| CLI-only fallback | Special-case global-only projects in `mdt-cli` | Leaves API and MCP list consumers broken |
| Broaden `getProjectConfig()` | Make local-config lookup silently return registry data | Changes a local-only config reader's contract for unrelated callers |
| Require local config | Add `.mdt-config.toml` to global-only projects | Breaks the global-only storage mode |

## 4. Artifact Specifications

### New Artifacts

- `shared/tests/services/project/ProjectService.list.test.ts` — full/metadata scan edge-case matrix using real ticket files and registry-backed project resolution.
- `cli/tests/e2e/ticket/global-only-list.spec.ts` — isolated CLI process regression.
- `server/tests/api/global-only-list.test.ts` — authenticated REST metadata and unified-list regression using real shared services.
- `mcp-server/tests/e2e/tools/global-only-list.spec.ts` — real MCP stdio list/get/count regression.

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `shared/services/ProjectService.ts` | Method contract | Accept resolved project context for full and metadata scans; use registry-backed ticket path when local config is absent |
| `shared/services/TicketService.ts` | Call-site update | Preserve project context when requesting list results |
| `server/controllers/ProjectController.ts` | Call-site update | Pass the resolved project to metadata listing |
| `mcp-server/src/tools/handlers/projectHandlers.ts` | Call-site update | Pass the resolved project to list/count scans |
| `shared/services/project/types.ts` | Interface update | Match the resolved `Project` list contract |
| `server/server.ts` | Adapter update | Preserve `Project` through the production server adapter |
| Existing shared worktree/metadata tests and server test adapters/mocks | Contract migration | Replace path-only calls without weakening existing assertions |
| `docs/architecture/project-identity-and-worktrees.md` | Owner documentation | Record the shared list-read contract alongside worktree routing |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| CLI ticket list | Shared `TicketService` | Existing list request |
| REST project ticket list | Shared `ProjectService` | Resolved project context |
| MCP project list/info | Shared `ProjectService` | Resolved project context |
| Shared list service | Ticket scanner | Effective ticket path and project code |

### Key Patterns
- Shared service boundary: resolve project-specific settings once and reuse for all interface adapters.
- Local-config fallback: prefer available local settings; use the resolved project fields when local config is absent.
- Worktree preservation: retain current main-project and active worktree aggregation behavior.

## 5. Acceptance Criteria

### Functional
- [x] A global-only project with no local `.mdt-config.toml` lists tickets from its configured registry `ticketsPath` through `mdt-cli list`.
- [x] REST metadata listing and MCP list/count operations expose tickets from the same global-only project.
- [x] Project-first and auto-discovered projects continue listing tickets from their configured local paths.
- [x] Worktree-only tickets remain included with their existing worktree metadata.

### Testing
- Shared: global-only project with a custom tickets path and no local config returns matching tickets from both full and metadata scans.
- CLI: listing from a global-only project returns the ticket already readable by key.
- API and MCP: list consumers return the same ticket set.
- Regression: project-first, auto-discovery, and worktree-only listing behavior remains unchanged.

## 6. Verification

### By CR Type
- **Bug Fix**: The empty-list behavior no longer occurs for a global-only project with tickets in its configured path.

### Metrics
- Verify the shared full and metadata listing artifacts and the CLI/API/MCP regression scenarios above.

### Execution Plan (2026-10-22)

1. Cover both shared scan methods with real ticket files: registry-only custom paths, built-in fallback, local path/code precedence, empty or missing directories, and worktree enablement/override/aggregation. Migrate existing callers in tests to the resolved `Project` contract without weakening their assertions.
2. Add isolated CLI and REST/MCP regression coverage that exercises real shared reads. Check get/list agreement, project counts, metadata-only responses, filters/pagination, and unchanged registry bytes/no local config creation.
3. Run focused suites, affected builds/type checks and lint. Record exact results and remaining limits here. Add the shared list-read contract to the existing project identity/worktree architecture document.

Number allocation through `TicketService.getCRPath()` remains a separate issue and is outside this fix. Preserve unrelated worktree changes. The authorized implementation commit is recorded below.

### Verification Results (2026-10-22)

| Goal | Evidence | Result |
|------|----------|--------|
| Full and metadata reads use resolved context | `ProjectService.list.test.ts` runs the same ten cases against each scan method | 20 new cases pass |
| Preserve existing worktree/metadata behavior | Existing `ProjectService.worktree.test.ts` and MDT-205 metadata-level suite, assertions retained | 7 pass |
| CLI get/list agreement and adapters | New global-only CLI suite plus existing ticket list-enhancement and project-flag suites | 22 pass (4 new) |
| REST metadata and browser unified view | New API suite uses real shared ProjectService and TicketService; existing controller/project API suites also run | 62 pass (3 new), 4 existing skips |
| MCP list/get/count agreement | New stdio suite calls `list_crs`, `list_projects`, `get_project_info`, and `get_cr` | 4 new cases pass |
| Regression tests detect the original failure | An isolated copy restores the historical local-config-only gate; the two custom-path tests then return `[]` and fail their ticket assertions | Expected failure confirmed; production files unchanged |

The focused result is **115 passing tests**, including **31 new regression cases**, with four existing skipped API tests. Builds for shared, CLI and MCP, the server type check including test sources, scoped ESLint, and `git diff --check` pass.

The shared matrix covers custom/default paths, missing and malformed local config, local path/code precedence, empty/missing ticket directories, explicit worktree disablement, duplicate suppression and worktree overrides, stale/missing worktree targets, worktree-only tickets when the canonical ticket directory is absent, metadata content exclusion, and unchanged registry bytes/no synthesized local config. CLI coverage also checks nested CWD, explicit project references, filters, pagination, and a locally configured project with no registry entry.

Reproduction commands from the repository root:

```bash
bun run --cwd shared jest --runInBand tests/services/project/ProjectService.list.test.ts tests/services/project/ProjectService.worktree.test.ts tests/services/MDT-205/metadata-list-level.test.ts
bun run --cwd cli test tests/e2e/ticket/global-only-list.spec.ts tests/e2e/ticket/list-enhancements.spec.ts tests/e2e/ticket/project-flag.spec.ts
bun run --cwd server jest --runInBand tests/api/global-only-list.test.ts tests/unit/ProjectController.test.ts tests/api/projects.test.ts
bun run --cwd mcp-server jest --config jest.e2e.config.mjs --runInBand --runTestsByPath tests/e2e/tools/global-only-list.spec.ts
bun run build:shared
bun run --cwd cli build
bun run --cwd mcp-server build
bunx tsc -p server/tsconfig.json --noEmit
```

### Verification Limits

- A wider CLI run also selected `project/project.spec.ts`: 28 passed, two project-init absolute-path cases timed out, and one subsequent asynchronous error was reported. The targeted list/project-flag suites pass; the project-init failures were not fixed or baselined in this ticket.
- The MCP `test:e2e` wrapper prepends the entire E2E directory, so an initial attempted focused invocation ran the wider suite: 274 passed, four failed, 11 skipped, and the new suite initially failed to load a TOML import. The import was corrected. The wider failures were in update-attributes, suggest-improvements, and output-sanitization suites; they were not fixed or baselined here. Use the exact `jest --runTestsByPath` command above for this regression.
- The new MCP get test initially assumed the title was returned; it now asserts the ticket-specific body actually returned by the existing `get_cr` contract.
- The existing Jest harness reports open-handle/force-exit warnings. The focused commands exit successfully. No browser UI session, MCP HTTP transport, or full-monorepo green claim is made.
- Logs and the isolated negative control are retained in the implementing BB thread's `MDT-257-evidence` storage (@thread:thr_cdqiqp7ujs). Initial verification left the changes unstaged; the implementation commit and follow-up are recorded below. The user approved marking this ticket Implemented and committing the follow-up.

### CLI Timeout Follow-up

MDT-257 was committed as `c4a24aab` (`fix(MDT-257): list tickets for global-only projects`). The two earlier `project init` timeouts were investigated after that commit:

| Command | Result |
|---------|--------|
| `bun run --cwd cli test tests/e2e/project/project.spec.ts --test-name-pattern 'system root\|absolute non-system-root'` | Both cases pass in isolation (2 passed, 10 filtered out) |
| `bun run --cwd cli test tests/e2e/ticket/list-enhancements.spec.ts tests/e2e/ticket/project-flag.spec.ts tests/e2e/project/project.spec.ts` | Original wider CLI sequence passes: 30/30 |
| `bun run --cwd cli test:e2e` | Full CLI E2E suite passes: 121/121 across 16 files |

No runtime code, assertions, retries, or timeout thresholds were changed to obtain these results. The earlier timeouts remain historical observations with no established cause; they are not currently reproducible CLI defects. These results do not resolve the separately recorded MCP failures.

The complete follow-up logs are `mdt-cli-init-baseline.log`, `mdt-cli-original-sequence.log`, and `mdt-cli-e2e-current.log` in the same BB thread storage. Unrelated working-tree changes remain unstaged.

### CLI Validation Follow-up

Further tracing found a separate, deterministic defect in the shared validators: each absolute-path check on macOS canonicalized the union of Linux and macOS system roots. This included `/home`, which points to an `autofs` mount on the investigating host. Checking an unrelated path such as `/etc` therefore performed unnecessary filesystem probes. The trace confirmed the calls; the historical five-second timeouts themselves were not reproduced or conclusively attributed to that mount.

Changes in this follow-up:

- `shared/utils/protected-system-roots.ts` now owns the platform-specific raw root lists, used by both `ProjectValidator` and `ProjectValidator.node`.
- macOS checks native roots and aliases, without probing or blocking Linux-only roots such as `/home`, `/proc`, or `/mnt`. Linux and Windows lists retain their previous contents. Canonical path and symlink comparisons remain in place.
- Added `system-root-probes.test.ts`, covering both validators, native root protection, symlink targets, allowed subdirectories, Linux preservation, and the absence of foreign mount probes.
- Extended CLI project-init coverage with real rejected/allowed symlinks and assertions that invalid input creates no local config and valid absolute ticket paths are persisted.
- Updated MDT-151's owning `secure-paths.md` with the macOS policy and implementation boundary. CLI command syntax and timeouts did not change.

Verification:

| Check | Result |
|-------|--------|
| New regression against original validators | 2 expected failures for unwanted `/home` probes; 26 preservation cases pass |
| New and existing shared path-validation tests | 41/41 pass |
| Full CLI E2E suite after rebuilding shared | 123/123 pass across 16 files |
| Shared and CLI builds, scoped ESLint, whitespace check | Pass |
| Actual Node trace for `/etc` | Canonicalization calls fall from 28 to 17; `/home` probes fall from 1 to 0; `/etc` remains rejected |

Reproduction:

```bash
bun run --cwd shared jest --runInBand --runTestsByPath tools/__tests__/project-management/system-root-probes.test.ts tools/__tests__/project-management/ticketsPath-validation.test.ts
bun run build:shared
bun run --cwd cli test:e2e
bun run --cwd cli build
```

Follow-up logs include `mdt-cli-root-probes-red.log`, `mdt-cli-root-probes-green.log`, `mdt-cli-e2e-fixed.log`, and `cli-validation-etc-fixed-trace.json` in the same BB thread storage. The user approved committing this verified follow-up with the ticket marked Implemented. The separately recorded MCP failures and number-allocation issue remain outside this work.

## 7. Deployment

- Code-only change; no registry migration or project-local config file is required.
