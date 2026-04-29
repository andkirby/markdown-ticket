---
code: MDT-151
status: Done
dateCreated: 2026-04-29T07:04:24.792Z
type: Technical Debt
priority: Medium
---

# Harden Path Resolution for Public Deployment

## 1. Description

### Requirements Scope
`preservation` — existing functionality stays, security containment layer added.

### Problem
- System was designed as local-only tool — path inputs (subdocument names, config paths) are trusted without validation
- Moving to public/remote deployment means HTTP users are untrusted — path traversal exploits are now realistic (reported: GitHub Issue #11)
- No containment boundary exists between resolved file paths and their intended directory roots

### Affected Areas
- Shared services: SubdocumentService (path resolution + file reads)
- Shared services: ProjectConfigService (config validation)
- Server: Route parameter handling reaching SubdocumentService

### Scope
- **In scope**: Path traversal prevention in subdocument API, ticketsPath config validation, symlink containment policy
- **Out of scope**: Authentication, authorization, rate limiting, CORS, other HTTP security concerns

## 2. Desired Outcome

### Success Conditions
- No combination of URL-encoded, double-encoded, or manipulated subDocName values can resolve a path outside ticketDir
- ticketsPath config rejects relative paths containing `..` — only simple relative paths or absolute paths allowed
- Symlinks inside ticketDir are not followed by default; opt-in via config with containment check on resolved target
- All existing legitimate subdocument reads continue to work unchanged

### Constraints
- Must maintain backward compatibility with existing project configs (simple relative paths like `docs/CRs`)
- Must support absolute ticketsPath (admin's deliberate choice for external directories)
- Must not change the API contract — same endpoints, same responses for valid requests

### Non-Goals
- Not adding authentication or authorization layers
- Not addressing symlink attacks that require filesystem write access (different threat model)
- Not changing how ticketsPath is resolved at load time (just validating the input)

## 3. Open Questions

All resolved during implementation:

| Area | Question | Resolution |
|------|----------|------------|
| Config | Should `allowSymlinks` be a per-project config or global? | **Per-project** in `.mdt-config.toml` |
| Validation | Should path containment check use `realpathSync` even when symlinks disabled? | **Only when `allowSymlinks=true`** — avoids perf cost on default path |
| Error handling | What HTTP status for rejected paths — 403 or 404? | **404** — avoids information leakage about path structure |

### Known Constraints
- Node.js `path.join` does not resolve symlinks — must use `realpathSync` when symlink safety needed
- Express decodes `%2F` to `/` in route params — must validate AFTER decoding
- `existsSync` and `readFileSync` follow symlinks by default

### Decisions Deferred
- Exact containment check implementation (determined by `/mdt:architecture`)
- Whether to add a generic path-sanitization utility or handle per-service (determined by `/mdt:architecture`)
- Test strategy for security edge cases (determined by `/mdt:tests`)

## 4. Acceptance Criteria

### Functional
- [x] `GET /subdocuments/..%2Fsomething` returns 404 (path traversal blocked)
- [x] `GET /subdocuments/../something` returns 404
- [x] `GET /subdocuments/architecture` still returns valid subdocument
- [x] Config with `ticketsPath = "../../shared"` is rejected at load time
- [x] Config with `ticketsPath = "docs/CRs"` is accepted
- [x] Config with `ticketsPath = "/var/mdt/tickets"` is accepted
- [x] Symlink inside ticketDir is not followed by default
- [x] Symlink following works when `allowSymlinks = true` with containment check

### Non-Functional
- [x] Path validation adds <1ms overhead per request
- [x] No regression in existing subdocument test suite

### Edge Cases
- [x] Null byte injection (`%00`) rejected
- [x] Double encoding (`%252F`) rejected
- [x] Unicode slash variants (∕ ⁄ ／) rejected
- [x] Whitespace-only subDocName rejected
- [x] Very long subDocName (>255 chars) rejected
- [x] Absolute ticketsPath matching system root (`/etc`, `/usr`, `C:\Windows`) rejected
- [x] Absolute ticketsPath that is subdirectory of system root (`/usr/local/my-project`) accepted

## 5. Verification

### How to Verify Success
- Automated: Security-focused unit tests for each attack vector in SubdocumentService
- Automated: Config validation tests for ticketsPath edge cases
- Manual: Confirm existing board functionality unchanged in dev:full mode

## 8. Clarifications

### UAT Session 2026-04-29

**Approved changes**:
- Added system path blocklist for absolute ticketsPath — reject exact matches against protected system root directories (Linux, macOS, Windows)
- Subdirectories of protected roots remain allowed

**Changed requirement IDs**: +BR-2.4, +Edge-7

**Updated workflow documents**: requirements.trace.md, bdd.trace.md, architecture.trace.md, tests.trace.md, tasks.trace.md, uat.md

**Reference doc**: `docs/CRs/MDT-151/secure-paths.md` — canonical protected roots list

**New task**: TASK-4 — implement blocklist in `ProjectValidator`