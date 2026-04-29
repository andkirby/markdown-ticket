# UAT Refinement Brief

## Objective

Add system path blocklist to `validateTicketsPath()` — reject absolute paths that are exactly equal to known system root directories (e.g., `/etc`, `/usr`, `C:\Windows`), while allowing subdirectories of those roots.

## Approved Changes

| Change | Type | Why |
|--------|------|-----|
| BR-2.4: Reject system root directories as ticketsPath | additive_change | Absolute paths like `/etc` were accepted by BR-2.3, creating risk even in admin trust model |
| Edge-7: Subdirectories of system roots must still be accepted | additive_change | `/usr/local/my-project` is legitimate; only exact root matches are blocked |
| OBL-system-path-blocklist | additive_change | New architecture obligation for the blocklist |
| TASK-4: Implement blocklist | additive_change | New execution slice |

## Changed Requirement IDs

- Added: `BR-2.4`, `Edge-7`
- Existing (unchanged): BR-2.3 still accepts absolute paths — blocklist is a guard rail on top of it

## Affected Downstream Trace

| Stage | Changes |
|-------|---------|
| requirements | +BR-2.4 (bdd), +Edge-7 (tests) |
| bdd | +scenario `config_rejects_system_root_path` |
| architecture | +obligation `OBL-system-path-blocklist` |
| tests | +test-plan `TEST-system-path-blocklist` |
| tasks | +TASK-4 |

## Execution Slices

### Slice 1: System path blocklist (TASK-4)

**Objective**: Add protected roots list to `ProjectValidator.validateTicketsPath()` and reject exact matches.

**Direct artifacts/files**:
- `shared/tools/ProjectValidator.ts` — add `isSystemRoot()` helper with platform-specific protected roots
- `shared/tools/__tests__/project-management/ticketsPath-validation.test.ts` — add tests for BR-2.4, Edge-7

**Direct GREEN targets**:
- `TEST-system-path-blocklist`
- BDD scenario `config_rejects_system_root_path`

**Impacted canonical task IDs**: TASK-4

**Why this slice exists**: UAT feedback — accepting `/etc` as ticketsPath is unsafe even for admins. Blocklist prevents accidental misconfiguration.

**Reference doc**: `docs/CRs/MDT-151/secure-paths.md` — canonical list of protected roots per platform.

## Validation

- `spec-trace validate MDT-151 --stage requirements` ✅
- `spec-trace validate MDT-151 --stage bdd` ✅
- `spec-trace validate MDT-151 --stage architecture` ✅
- `spec-trace validate MDT-151 --stage tests` ✅
- `spec-trace validate MDT-151 --stage tasks` ✅

## Watchlist

- Platform detection: must handle Linux, macOS, and Windows roots correctly
- Path normalization: `realpathSync` before comparison (symlinks like macOS `/tmp` → `/private/tmp`)
- Case-insensitive comparison on Windows
- Blocklist is exact-match only — `/etc` blocked, `/etc/mdt` allowed

## Open Decisions

None — blocklist is exact match only, subdirectories allowed, per the secure-paths.md reference.
