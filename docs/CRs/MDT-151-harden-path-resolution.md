---
code: MDT-151
status: In Progress
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

| Area | Question | Constraints |
|------|----------|-------------|
| Config | Should `allowSymlinks` be a per-project config or global? | Per-project preferred — `.mdt-config.toml` |
| Validation | Should path containment check use `realpathSync` even when symlinks disabled? | Performance cost vs. belt-and-suspenders safety |
| Error handling | What HTTP status for rejected paths — 403 or 404? | 404 avoids information leakage about path structure |

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
- [ ] `GET /subdocuments/..%2Fsomething` returns 404 (path traversal blocked)
- [ ] `GET /subdocuments/../something` returns 404
- [ ] `GET /subdocuments/architecture` still returns valid subdocument
- [ ] Config with `ticketsPath = "../../shared"` is rejected at load time
- [ ] Config with `ticketsPath = "docs/CRs"` is accepted
- [ ] Config with `ticketsPath = "/var/mdt/tickets"` is accepted
- [ ] Symlink inside ticketDir is not followed by default
- [ ] Symlink following works when `allowSymlinks = true` with containment check

### Non-Functional
- [ ] Path validation adds <1ms overhead per request
- [ ] No regression in existing subdocument test suite

### Edge Cases
- [ ] Null byte injection (`%00`) rejected
- [ ] Double encoding (`%252F`) rejected or rendered inert
- [ ] Unicode slash variants (∕ ⁄ ／) rendered inert
- [ ] Whitespace-only subDocName rejected
- [ ] Very long subDocName (>255 chars) rejected

## 5. Verification

### How to Verify Success
- Automated: Security-focused unit tests for each attack vector in SubdocumentService
- Automated: Config validation tests for ticketsPath edge cases
- Manual: Confirm existing board functionality unchanged in dev:full mode