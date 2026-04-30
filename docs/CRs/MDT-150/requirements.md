# Requirements: MDT-150

**Source**: [MDT-150](../MDT-150-smartlink-doc-urls.md)
**Type**: Bug Fix
**Generated**: 2026-04-26
**UAT refined**: 2026-04-30

## Bug

Clicking `.md` document references inside ticket views produces 404s. Bare filenames (e.g. `architecture.md`) and relative paths (e.g. `../../README.md`) resolve to broken URLs because no route matches them. Additionally, filenames containing ticket keys (e.g. `MDT-150-smartlink-doc-urls.md`) get corrupted by double-wrapping during markdown preprocessing.

## Fix Requirements

1. **R1** (BR-1): A bare `.md` filename (e.g. `architecture.md`) inside a ticket view SHALL navigate to the current ticket's subdocument. A relative `.md` path with `..` (e.g. `../../README.md`) SHALL navigate to the documents view with the resolved file path.
2. **R2** (BR-2): A `.md` reference containing a ticket key pattern (e.g. `MDT-151.md`, `MDT-150-smartlink-doc-urls.md`, `MDT-151`) SHALL navigate to that ticket's view.
3. **R3** (BR-3): WHEN a `.md` reference includes an anchor fragment (`#section`), the system SHALL preserve the fragment in the resolved URL.
4. **R4** (BR-4): The documents view SHALL support path-style routing (`/prj/:code/documents/:path*`).
5. **R5** (delegated to MDT-151): WHEN a file path is requested, the backend SHALL validate it against the project root and return an error response for traversal attempts or missing files. **Already satisfied by MDT-151** (shipped).

## Delivery Timing

- R1: In This Ticket
- R2: In This Ticket
- R3: In This Ticket
- R4: In This Ticket
- R5: Delegated to MDT-151 (shipped, no new work)

## Semantic Decisions

- **Ticket-key pattern**: Any `.md` filename starting with `{PROJECT}-\d+` is a ticket reference, regardless of what follows (e.g. `MDT-150-smartlink-doc-urls.md`).
- **No `..` to backend**: All relative path segments SHALL be resolved on the frontend. The backend only receives clean resolved paths.
- **Security authority**: Backend is the sole authority on path containment and file existence. Frontend does not validate paths.
- **URL format**: Path-style for ticket subdocs (`/prj/:code/ticket/:key/:path*`) and documents (`/prj/:code/documents/:path*`).

## Constraints

| Constraint ID | Text | Must Appear In |
|---------------|------|----------------|
| C1 | Must not alter ticket reference link behavior | architecture (invariants), tasks (regression tests) |
| C2 | Must not alter external link behavior | architecture (invariants), tasks (regression tests) |
| C3 | Must work for relative paths, bare filenames, and sibling ticket references | architecture (runtime flow), tests |
| C4 | Frontend must not perform security checks — backend's responsibility | architecture (invariants), tests |
| C5 | Existing link classification and rendering must remain unchanged | architecture (module boundaries), tasks (scope) |

## Edge Cases

| Edge Case | Handling Layer | Coverage |
|-----------|---------------|----------|
| Deeply nested subdocs (`../../../../../etc/passwd`) | Backend path containment (MDT-151) | MDT-151 tests |
| URL-encoded characters (`%2e%2e`) | Backend decoding + validation (MDT-151) | MDT-151 tests |
| Empty/missing document config | Link passes through unchanged; backend returns error if target doesn't exist | Implicit in BR-1 |
| Ticket-key filename double-wrap | Exclusion guard prevents double-wrapping | BR-2 |

## Verification

- [ ] Click `architecture.md` in a ticket subdoc → opens ticket subdoc view
- [ ] Click `../../README.md` in a ticket subdoc → opens documents view with resolved path
- [ ] Click `MDT-151.md` → opens ticket MDT-151
- [ ] Click `MDT-150-smartlink-doc-urls.md` → opens ticket MDT-150 (not documents view)
- [ ] Click `MDT-151` → opens ticket MDT-151
- [ ] Click `.md#section` → scrolls to heading
- [ ] Ticket reference links still work (regression)
- [ ] External links still work (regression)

---
*Rendered by /mdt:requirements via spec-trace, refined by /mdt:uat*
