# MDT-199 Verification

## Result

The architecture package is ready for User Review. It is documentation-only:
no production TypeScript, configuration schema, package manifest, migration, or
deployment resource was changed.

MDT-199 remains `In Progress`. MDT-200 remains `Proposed`.

## Required Output Audit

| Requirement | Evidence | Result |
| --- | --- | --- |
| Four permanent owner documents | `docs/architecture/cloud-sync/` contains README, identity/access, data/consistency, and operations owners | Pass |
| Concrete ticket handoff | `architecture.md` fixes package, dependency, identity, data, API, recovery, polling, security, and operations decisions | Pass |
| Local auth boundary preserved | `auth-and-sharing-architecture.md` received one cloud identity cross-link only | Pass |
| Local/worktree identity preserved | `project-identity-and-worktrees.md` received one explicit cloud UUID cross-link only | Pass |
| MDT-200 reconciled | Its architecture gate now links the owners and records approved decisions; status is unchanged | Pass |
| Approved MDT-198 decisions preserved | Authority, opt-in, no fallback, exclusions, polling, and attribution match research and POC | Pass |
| Proposed behavior not claimed as shipped | Owner docs consistently assign implementation and runtime gates to MDT-200 | Pass |

## Current-Code Recheck

Rechecked on 2026-07-24:

- `shared/services/TicketService.ts:318-334` allocates before writing the file,
  and `:602-628` derives the next number from local file scanning. This confirms
  both the shared orchestration seam and the cross-clone collision gap.
- CLI, server, and MCP creation paths delegate to the shared `TicketService`;
  no transport requires its own allocator.
- `shared/services/project/ProjectFactory.ts:47-50` still derives local project
  ID from config or directory name.
- `shared/services/ProjectService.ts:202-234` still resolves by local detected
  path. The existing worktree owner document contains end-state intent that is
  not required for cloud identity because the cloud UUID is explicit.
- `server/security/apiAuth.ts:97-140` and
  `src/auth/AuthSessionProvider.tsx:246-256` still implement local
  anonymous/read-only/owner behavior.
- `mcp-server/src/transports/transportSelection.ts:11-21` selects either stdio
  or HTTP. The architecture assigns a credential provider to each mode without
  changing that transport boundary.
- A repository-wide non-document search found no `cloud-sync-worker`,
  `CloudSyncCoordinator`, `CloudOperationJournal`, or
  `project.cloudSync` implementation. All described runtime behavior remains
  proposed.

## Cloudflare Source Recheck

Mutable platform claims were reopened after drafting on 2026-07-24:

- D1 `batch()` is transactional and rolls back the sequence on failure.
- D1 is single-threaded per database; deployed throughput still depends on
  measured query duration and overload behavior.
- Access origin validation requires the application assertion signature,
  issuer, audience, expiry, and rotating signing key.
- Human application assertions expose email; service-token assertions expose
  the client ID as `common_name`.
- Service-token deletion, not session revocation alone, revokes the underlying
  service credential.
- D1 Time Travel restore overwrites the database and Worker version rollback
  does not roll back D1 state.
- Workers rate-limit bindings are location-local, permissive, and eventually
  consistent, so the design uses them only as an abuse guard.
- D1 exposes query, rows read/written, latency, response size, and storage
  metrics with current documented 31-day retention.

The exact primary-source URLs and access date are owned by
`docs/architecture/cloud-sync/operations.md`.

## Independent Drift Review

The five architecture documents, MDT-199, MDT-198 research/POC, and MDT-200
were compared after drafting.

Unambiguous drift fixed:

- MDT-200 no longer defers package, identity, data, integration,
  configuration, or delivery decisions already resolved by MDT-199.
- Browser cloud routes are explicitly local-owner-only, preventing a local
  read-only share from receiving cloud-only projection state.
- Project-controlled service origins must match an operator allowlist, and
  credential-bearing requests reject cross-origin redirects.
- Worker rollback and D1 restore are separate procedures.
- A detached cloud-bound project cannot silently resume local allocation.

No architecture decision remains open. Concrete Cloudflare IDs, hostnames,
audiences, IdP groups, and credential owners are deployment inputs for MDT-200.

## Superseded Trace Route

The earlier pipeline created three untracked trace-heavy artifacts:

```text
docs/CRs/MDT-199.pipeline-state.json
docs/CRs/MDT-199/requirements.trace.md
docs/CRs/.trace/MDT-199/store.json
```

Git confirmed none was tracked, and the current-run timestamps and contents
proved their origin. The generated requirements trace and canonical store were
removed as superseded bureaucracy. The pipeline-state file was replaced with a
small recovery-plan status record because the recovery goal explicitly retains
that file.

No requirements, BDD, architecture obligation, test plan, task, bundle, trace
projection, or Spec Trace validation was added after the recovery goal.

## Validation Evidence

```text
Mermaid CLI 11.15.0:
  15/15 Mermaid blocks rendered successfully

markdownlint-cli2 0.22.1:
  scoped durable Markdown files
  0 errors

git diff --check:
  pass
```

Broad builds and test suites were intentionally not run for this
documentation-only ticket.

## Worktree Boundary

Unrelated modifications observed during the run were not edited:

```text
docs/CRs/MDT-196-board-filter-bar.md
docs/design/explorations/filtering-system.md
docs/design/surfaces/board-filter-bar.mockups.md
docs/design/surfaces/board-filter-bar.spec.md
```

The user-provided `pipeline-agent-prompt.md` and `goal-prompt.md` were preserved.
No commit was created.

## User Review

Approve the MDT-199 architecture package to close the architecture gate for
MDT-200. Until approval, keep MDT-199 `In Progress` and MDT-200 `Proposed`.
