# BDD: MDT-151

## Overview

BDD scenarios cover three user-visible journeys for the path hardening feature:
1. **Subdocument path safety** — malicious subDocName values are rejected, valid ones served unchanged
2. **Config validation** — traversal-containing ticketsPath rejected at load, valid paths accepted
3. **Symlink containment** — default deny, opt-in allow with containment boundary

## Acceptance Strategy

- **Framework**: Playwright (E2E) + Supertest (API integration)
- **Executable**: Yes — existing server integration test infrastructure in `server/tests/`
- **Spec-only items**: Symlink scenarios require filesystem setup (symlink creation) — implement as integration tests rather than Playwright E2E
- **Acceptance gate**: All 9 scenarios must pass after implementation

## Test-Facing Contract Notes

### API Endpoints Under Test
- `GET /api/projects/:projectId/crs/:crId/subdocuments/:subDocName`
- Config validation via `ProjectConfigService.getProjectConfig()` / `ProjectValidator.validateTicketsPath()`

### Key Test Setup
- Path traversal tests: use real CR directory with known subdocuments, attempt traversal to known out-of-bound paths
- Symlink tests: create symlinks via `fs.symlinkSync` in test fixtures, clean up after
- Config tests: temp `.mdt-config.toml` files with various ticketsPath values

### Error Response Contract
- Rejected paths return **404** (not 403) to avoid information leakage
- Rejected path responses MUST have the exact same response body as a legitimate "SubDocument not found" 404
- This closes information leakage: an attacker cannot distinguish "path traversal blocked" from "subdocument does not exist" by response body content

## Execution Notes

- Integration tests in `server/tests/` cover the API surface directly
- Unit tests in `shared/services/ticket/__tests__/` cover SubdocumentService validation logic
- Symlink tests may require POSIX filesystem (skip on Windows CI)
