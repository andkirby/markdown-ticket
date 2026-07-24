---
code: MDT-198
status: Implemented
dateCreated: 2026-07-23T12:47:36.153Z
type: Research
priority: Medium
implementationDate: 2026-07-24
implementationNotes: Research approved: Markdown-authoritative projection, opt-in cloud binding, no presence or offline allocation; follow-up Architecture and Feature CRs authorized.
---

# Research cloud ticket coordination

## 1. Description

### Requirements Scope

`none`

### Research Objective

- Validate a minimal cloud coordination service for teammates using the same Markdown Ticket project.
- Decide which ticket fields the cloud owns and which remain owned by local Markdown/Git.
- Prove collision-free ticket key allocation without turning MDT into a full SaaS issue tracker.
- Produce an implementation recommendation for data flow, authentication, authorization, failure handling, and Cloudflare services.

### Research Context

- Current ticket numbering scans local files and selects the highest number plus one.
- Separate clones can allocate the same ticket key before either clone receives the other's Git changes.
- The board can already render shared metadata such as title, status, type, priority, and assignee.
- Current authentication and sharing target a single owner plus read-only visitors, not teammate identities or collaborative writes.
- Existing ticket CRUD is centralized in `shared/services/TicketService.ts` for CLI, MCP, and backend consumers.

### Scope

- In scope:
  - Minimal collaboration capability and explicit non-goals.
  - Cloud/local field authority matrix.
  - Project identity and team membership model.
  - Atomic ticket number allocation and idempotent creation.
  - Ticket header/status projection for teammate visibility.
  - Activity or work-presence semantics.
  - Browser, CLI, MCP, and automated-client authentication.
  - Authorization, audit, privacy, recovery, export, cost, and vendor-exit requirements.
  - Cloudflare Workers, D1, Access, and optional Durable Objects evaluation.
  - POC plan covering concurrent creation, retries, offline work, and stale updates.
- Out of scope:
  - Full ticket bodies, comments, attachments, or document editing in the cloud.
  - Jira-compatible workflows, reporting, notifications, sprint planning, or portfolio management.
  - Implementation of the production cloud service.
  - Replacing Markdown/Git as the durable source for ticket content.

## 2. Research Questions

| ID | Research Question | Success Criteria | Priority |
|----|-------------------|------------------|----------|
| RQ1 | What exact collaboration capability is required? | Minimal supported journeys and explicit non-goals are approved | High |
| RQ2 | Which system owns key, title, status, type, priority, assignee, body, and timestamps? | One authority per field plus a one-way projection rule | High |
| RQ3 | How are project identity and team membership mapped across clones? | Stable project identifier, membership rules, and onboarding/offboarding flow | High |
| RQ4 | How can the cloud allocate a per-project key exactly once? | Concurrent requests return unique keys; retries with one idempotency key return one result | High |
| RQ5 | What happens when cloud allocation succeeds but local file creation or Git publication fails? | Reservation lifecycle, retry, cancellation, gap, and orphan policy are specified | High |
| RQ6 | How do local and cloud metadata synchronize? | Version/precondition model resolves stale, concurrent, offline, rename, delete, and restore cases | High |
| RQ7 | How should humans and automated clients authenticate? | Browser, CLI/MCP, and headless flows are evidence-backed; token handling, revocation, attribution, and the deployed-validation boundary are explicit | High |
| RQ8 | What authorization and isolation are required? | Project roles, least privilege, tenant isolation, generic denial, and membership revocation are specified | High |
| RQ9 | Does teammate presence require realtime delivery? | Polling/SSE/WebSocket options are measured against product latency and cost needs | Medium |
| RQ10 | Is Workers plus D1 sufficient, and when is a Durable Object justified? | Topology decision is supported by concurrency and delivery POC evidence | High |
| RQ11 | What operational controls are required? | Audit, observability, rate limits, backup, restore, export, retention, privacy, and incident paths are defined | Medium |
| RQ12 | How does this integrate without duplicating ticket business logic? | Shared-service, API, CLI/MCP, frontend, contract, and migration boundaries are mapped | High |

## 3. Validation Approach

### Research Method

- RQ1-RQ3: Product-boundary review, owner-document analysis, and field-authority workshop.
- RQ4-RQ6: Local D1-binding POC for concurrent allocation/replay, plus lifecycle POC coverage for stale versions and injected local-write failures.
- RQ7-RQ8: Documentation-backed Cloudflare Access and application authorization threat model for human and machine clients; deployed validation is deferred explicitly.
- RQ9-RQ10: Compare polling, existing SSE patterns, and Durable Object WebSockets against measured collaboration needs.
- RQ11: Review Cloudflare limits, pricing, Time Travel, export, secrets, logs, and recovery procedures.
- RQ12: Code analysis of shared ticket services, project identity, domain contracts, backend, MCP, CLI, and board state.

### Data Sources

- `shared/services/TicketService.ts`
- `docs/architecture/project-identity-and-worktrees.md`
- `docs/architecture/auth-and-sharing-architecture.md`
- `docs/CRs/MDT-022-duplicate-ticket-detection-and-resolution-system-with-smart-numbering.md`
- `docs/CRs/MDT-071-implement-file-based-cr-numbering-remove-mdt-next-.md`
- `docs/CRs/MDT-157-api-auth.md`
- `docs/CRs/MDT-172-public-read-only-sharing.md`
- Cloudflare D1, Workers, Access, and Durable Objects documentation.
- POC evidence under this ticket directory.

### Success Metrics

- At least two parallel creators cannot receive the same project ticket number.
- A retried create request cannot create a second reservation or ticket record.
- Every synchronized field has one named authority and a deterministic conflict rule.
- Human actions remain attributable to a human identity; machine credentials remain distinguishable.
- Offline or failed local creation has an explicit recoverable state.
- Baseline design does not require Durable Objects unless a measured stateful or realtime need justifies them.
- Cloud state can be exported in a documented, repository-independent format.

## 4. Initial Findings

### Current System

- `shared/services/TicketService.ts` allocates `highestExistingNumber + 1` from locally visible files.
- MDT-071 removed the counter file in favor of local scanning and left concurrent creation as an uncovered case.
- The existing auth architecture explicitly excludes a multi-user account model.
- Canonical checkout identity and ticket worktree routing are separate concerns and must remain separate in cloud mapping.

### Preliminary Cloudflare Fit

- Workers plus D1 is the leading baseline for a small shared metadata bank.
- D1 batch operations provide transactional rollback for multi-statement reservation writes.
- D1 Sessions are relevant only if read replicas are enabled and read-after-write ordering is required across a client session.
- Durable Objects are optional for future stateful per-project coordination or hibernating WebSocket presence, not a baseline dependency or a D1 throughput workaround.
- Cloudflare Access can provide human identity for browser and interactive CLI access.
- Access service tokens are suitable for headless clients but must not be treated as human identity.

### Preliminary Authority Recommendation

| Data | Preliminary Authority | Local Representation |
|------|-----------------------|----------------------|
| Project cloud ID and membership | Cloud | Non-secret project binding/config |
| Ticket number/key reservation | Cloud | Persist returned key in filename/frontmatter |
| Title/status/type/priority/assignee | Research decision | Single-direction projection after authority is selected |
| Ticket body and workflow subdocuments | Markdown/Git | Canonical local files |
| Presence/activity | Cloud, ephemeral or short retention | Optional UI indicator only |
| Git branch, commit, and worktree state | Local Git | Never inferred as cloud ticket authority |

### Preliminary Request Flow

1. Client authenticates and resolves a cloud project membership.
2. Client sends create intent with title, selected metadata, and an idempotency key.
3. Worker atomically allocates the next per-project number and inserts the minimal ticket record in D1.
4. Worker returns ticket key, cloud record ID, version, and authoritative metadata.
5. Shared ticket service creates the local Markdown file using the returned key.
6. Client acknowledges local creation or records a recoverable cloud-only reservation state.
7. Other clients refresh the project index through polling or a later realtime channel.

### Primary Design Warning

- Do not make cloud metadata and Markdown frontmatter independently writable authorities.
- Select one authority per synchronized field and enforce versioned writes or one-way projection.
- Treat gaps in ticket numbering as acceptable unless product requirements explicitly require gap-free sequences.

## 5. Acceptance Criteria

### Research Completion

- [x] RQ1-RQ3 answered with an approved capability boundary and authority matrix. (`MDT-198/research.md` RQ1–RQ3 + section 4)
- [x] RQ4-RQ6 answered with executable concurrency and failure POC evidence. (`MDT-198/research.md` RQ4–RQ6 + `MDT-198/poc.md` E1–E10)
- [x] RQ7-RQ8 answered with authentication and authorization sequence diagrams plus threat notes. (`MDT-198/research.md` RQ7–RQ8 + section 7 sequence diagrams)
- [x] RQ9-RQ10 answered with a Cloudflare topology decision and realtime threshold. (`MDT-198/research.md` RQ9–RQ10; decision: Go, reduced scope; DO threshold stated)
- [x] RQ11 answered with an operational checklist and export/recovery proof. (`MDT-198/research.md` RQ11 + section 13; export proven in `poc.md` E9)
- [x] RQ12 answered with a component integration map and migration boundary. (`MDT-198/research.md` RQ12 + section 14)

### Decision Outcomes

- Decision recorded: **Go (reduced scope)** — Workers plus D1 is sufficient for the minimum viable collaboration capability; Durable Objects are excluded unless a measured stateful/realtime need is proven. See `MDT-198/research.md` section 1.
- Cloud metadata ownership: **approved** Markdown-as-authority with one-way cloud projection (cloud authority restricted to key reservation + derived mirror).
- First-slice boundary: **approved** opt-in cloud binding, no teammate presence, and no offline allocation/local rename.
- Headless write path: documented via Access service tokens (machine principal), labeled documentation-sourced pending real Access-environment validation in the follow-up.

### Artifacts Produced

- Research summary with evidence and final recommendation: `MDT-198/research.md`.
- Field-authority and lifecycle state tables: `MDT-198/research.md` sections 4 and 5.
- Authentication and data-flow sequence diagrams: `MDT-198/research.md` section 7 (browser, CLI/MCP, headless).
- D1 schema sketch and API contract draft: `MDT-198/research.md` sections 9 and 10.
- Concurrency, retry, stale-write, and failure POC results: `MDT-198/poc.md` + throwaway `MDT-198/poc/` (9/9 lifecycle experiments and 6/6 D1-binding checks pass).
- Cost, limits, backup, export, privacy, and vendor-exit notes: `MDT-198/research.md` sections 12 and 13.
- Follow-up plan: `MDT-199` owns architecture and canonical documentation under `docs/architecture/cloud-sync/`; dependent `MDT-200` owns the first implementation slice.
- Independent verification record: `MDT-198/verification.md`.

## 6. Dependencies & Next Steps

### Approved Defaults

- Cloud coordination is opt-in per project.
- First slice includes collision-free creation and polling-based header/status visibility.
- Markdown/Git owns projected headers; cloud owns membership and number allocation.
- Presence and offline allocation are deferred.

### Decision Gate

- [x] Product decision: Markdown/Git owns projected header fields.
- [x] Product decision: presence excluded from the first slice.
- [x] Product decision: offline allocation deferred.
- [x] Architecture namespace: `docs/architecture/cloud-sync/`.

### Next Steps After Research

- Completed outcome: created Architecture CR `MDT-199` and dependent Feature CR `MDT-200`.
- Negative outcome: document Git-only collision handling and reject cloud coordination.
- Inconclusive outcome: isolate the unresolved identity, consistency, or realtime question into a smaller Research CR.

## 7. References

- [D1 overview](https://developers.cloudflare.com/d1/)
- [D1 database API and transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [D1 read replication and Sessions](https://developers.cloudflare.com/d1/best-practices/read-replication/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [Cloudflare Access CLI authentication](https://developers.cloudflare.com/cloudflare-one/tutorials/cli/)
- [Cloudflare Access service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/)
- [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Durable Object WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
