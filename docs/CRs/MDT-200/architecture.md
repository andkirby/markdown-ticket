# Architecture Reconciliation: MDT-200

The original sections below are the historical conformance map from approved requirements/scenarios to exact
implementation modules. It is **not** a new architecture — the permanent
contract lives in [`docs/architecture/cloud-sync/`](../../architecture/cloud-sync/)
and was approved by MDT-199. Reopen a decision only if live code or current
Cloudflare behavior proves it unsafe; record evidence and stop for User Review.

Spec Trace obligation IDs (`OBL-*`) are the canonical links; see
[`architecture.trace.md`](architecture.trace.md) for the rendered projection.

## Requirement → Module Conformance

| Area | Requirements | Obligation | Modules (cloud/) | Modules (shared/contracts) |
| --- | --- | --- | --- | --- |
| Package boundary | C1 | OBL-package-boundary | `worker.ts`, `http/router.ts`, `wrangler.jsonc` | `domain-contracts/src/cloud-sync/index.ts` |
| Allocation | BR-1.1–1.3, C2, C3 | OBL-allocation | `application/reservation.ts`, `d1/statements.ts`, `migrations/0001_init.sql` | `shared/services/cloud-sync/CloudSyncCoordinator.ts` |
| Recovery | BR-1.4, Edge-2 | OBL-local-orchestration | `application/reservation.ts`, `d1/projection.ts` | `create-orchestrator.ts`, `operation-journal.ts`, `recovery.ts` |
| No fallback | BR-1.5, BR-1.6, BR-1.7 | OBL-local-orchestration | — | `shared/services/TicketService.ts`, `allocator-strategy.ts` |
| Identity | BR-2.1, BR-2.2, Edge-5, C5 | OBL-identity | `access/jwt.ts`, `http/router.ts` | `credential-providers.ts`, domain principal/credential contracts |
| Membership | BR-2.3–2.5, Edge-4 | OBL-membership | `application/authorization.ts`, `application/membership.ts`, `d1/membership.ts` | membership contracts |
| Projection | BR-3.1–3.4 | OBL-projection | `application/projection-usecase.ts`, `d1/projection.ts` | `projection-sync.ts`, `CloudProjectionClient.ts`, server `TicketService.ts`, frontend projection hooks/components |
| Operations | BR-4.1, BR-4.2, C7, Edge-3 | OBL-operations | `d1/audit.ts`, `scheduled/maintenance.ts`, `rate-limit/guard.ts`, `worker.ts` completion events | local journals and `CLOUD_COORDINATION_GUIDE.md` |
| Config | C4, C6, Edge-6 | OBL-local-orchestration | — | `config.ts`, project/global config schemas and inspection registry |

## Static D1 Allocation Batch (must match MDT-198 POC)

`POST /v1/projects/{projectId}/reservations` executes one D1 batch per
`data-and-consistency.md` § Allocation Transaction:

```text
batch([
  1. INSERT reservation with projects.next_ticket_number
       only when no row exists for project + idempotency-key hash;
  2. INSERT OR IGNORE idempotency result by selecting the row with this
       request's reservation_id;
  3. UPDATE cloud_projects.next_ticket_number by one only when its current
       value equals this request's selected ticket number;
  4. INSERT allocation or replay audit event by comparing the selected
       reservation_id with this request's reservation_id;
  5. SELECT the row for project + idempotency-key hash.
])
```

Unique constraints are the final guard. A replay returns the existing
reservation without advancing the counter (BR-1.2). Reusing one key with a
different request hash returns `409 idempotency_key_reused` (Edge-1). The
implementation must not branch on intermediate results; the
`reservation_id` is request-scoped to keep the statement list static.

## Identity Flow (identity-and-access.md § Assertion Validation)

For every request reaching the Worker:

1. Read `Cf-Access-Jwt-Assertion`; never trust caller-supplied identity headers.
2. Parse bounded JWT; allow only `RS256`.
3. Select JWK by `kid` from the team-domain JWKS (cached ≤ 5 min).
4. Verify signature, exact issuer, accepted audience, `exp`, `nbf` if present,
   sane `iat`.
5. On unknown `kid`, refresh JWKS once and retry (Edge-5).
6. Derive one principal: human (normalized email) or machine (`common_name`).
7. Reject ambiguous/missing/malformed/expired/unverifiable claims.

Two audiences: coordination (`/v1/projects/*`) and operator (`/v1/admin/*`).
Vars `COORDINATION_AUD`/`OPERATOR_AUD` are already in `cloud/wrangler.jsonc`.

## Deployment Reality

- Worker `mdt-cloud-sync-production` and migration `0001_init.sql` are deployed.
- Routes `mdt-sync.constantapp.org` (coordination) and
  `mdt-sync-admin.constantapp.org` (operator) are Access-protected.
- D1 `02996cfe…` contains the coordination schema.
- Rate-limit namespaces `2026072401` (read), `2026072402` (mutate) bound.
- No staging environment (production-only deploy per user decision).
- The last recorded deployed version predates this reconciliation. Current
  source must pass the release checks and be redeployed before live acceptance
  evidence is refreshed.

## Slice → Module readiness

| Slice | Exit gate | Key modules to land |
| --- | --- | --- |
| 1 | Real human + service-token assertions on live Worker | `http/router.ts`, `access/jwt.ts`, `d1/audit.ts`, `0001` migration, `/healthz` |
| 2 | Deployed concurrency/replay/isolation/recovery pass | `application/reservation.ts`, `d1/*`, `application/membership.ts`, `scheduled/maintenance.ts` |
| 3 | Local-only green; cloud create no fallback | `shared/services/cloud-sync/*`, strategy seam in `TicketService`, config schema |
| 4 | Two clients observe changes in poll interval | `application/projection-usecase.ts`, `CloudProjectionClient.ts`, server poll adapter, board stub/poller in `frontend/src/` |
| 5 | Operations release gate recorded | disable/export/restore drills, doc reconciliation |

## UAT 2026-10-24 — implemented source correction

The source contract below is implemented and locally verified. Production
rollout and incident repair remain open; see [verification.md](verification.md).

The user approved same-ticket stabilization after a confirmed duplicate-key
incident. [PoC](poc.md) rejects a naive max-only allocator patch and validates a
candidate guarded static batch locally. No deployment is implied.

### Allocation and creation identity

1. Domain contracts define a positive safe-integer `minimumTicketNumber`, an
   opaque immutable `creationId`, capability/version checks, and typed ambiguity,
   identity-conflict, and verification-pending outcomes. Preserve canonical ticket
   parsing compatibility: absent identity is legacy/unverified, never invented.
2. Shared services scan configured canonical files and known worktrees (filename
   and frontmatter agreement, duplicate keys, safe numeric bounds); failures must
   not be swallowed into the old scan's start-number fallback. Compute the minimum
   above all observed occupied keys. Use one physical-repository operation lock,
   recheck before writing and acknowledgement, and retain paths for diagnostics.
3. Journal creationId and the minimum before reserve. New cloud-created Markdown
   includes the same non-secret creationId; reservation rows retain its scoped
   association through a forward-only migration. Cloud binding/credentials remain
   device-local. All CLI, MCP, and HTTP adapters continue to share this service.
4. Worker validates inputs and hashes immutable allocation inputs itself alongside
   the supplied intent digest. A caller cannot change floor/creationId while
   preserving an opaque client hash to evade idempotency checks. Existing pending
   legacy operations need explicit compatibility/recovery handling; do not silently
   assign new identities or numbers during retry.
5. Within the static D1 batch, insert only when the project's counter still equals
   the pre-read value. Select `max(observed counter, minimum)` as candidate, advance
   from the observed value to candidate+1 only for that inserted reservation, and
   include idempotency/audit/readback atomically. A lost guard with no result retries
   boundedly without leaving a committed reservation. The insertion guard is
   essential when concurrent clients report DIFFERENT floors; changing only the
   counter UPDATE guard is insufficient. Unique constraints remain final guards.
6. Replay resolves the original identity/reservation and never reapplies today's
   higher floor. Key-wide local conflicts stop write/acknowledge; byte equality or
   slug equality alone is insufficient replay ownership. Duplicate-key reads and
   mutations must not call the current first-match lookup and act on its result.

### Manual-file observation and cloud claims

The path watcher reports physical file identity INTERNALLY to a shared classifier;
SSE/API diagnostics expose authorized relative paths, not machine paths or cloud
secrets. Keep ordinary file refresh working and add a separate typed identity
outcome rather than pretending a watcher event is a successful create.

| Evidence | Outcome | Permitted automatic effect |
| --- | --- | --- |
| Unique file and creationId match an acknowledged coordinator claim | verified existing creation, including Git delivery | Ordinary refresh; later explicit edits use normal membership/version checks |
| File matches its still-pending local journal and cloud reservation | pending owned recovery | Report recovery; only explicit create/recovery orchestration writes or acknowledges |
| Key is held by a proven different creation, identity is bound to another key, or duplicate local files claim the key | conflict | Diagnostic only; preserve files, reservation, and original projection |
| No cloud claim exists and the file was not coordinator-created | unmanaged | Diagnostic and explicit operator-import guidance |
| Identity missing, claim association unknown, partial file, or inaccessible evidence | verification pending | Preserve file; bounded/coalesced verification or explicit retry; no adoption |

A RESERVED key is not free, even when there is no projection yet. Acknowledged,
orphaned, and abandoned numbers are also not free. Project membership and a
matching number never establish same-creation evidence. Add a membership-checked,
non-disclosing claim lookup by ticket number; today's reservation lookup needs a
reservationId and today's projection lookup cannot see unacknowledged claims.
Lookup provides identity/state evidence only and never reserves on a miss.

The classifier must validate current file content after coalescing (including
startup inventory and watcher-error recovery), keep diagnostics stable across
repeated events, and avoid login subprocesses or unbounded cloud traffic. Existing
unambiguous local Markdown stays readable/editable offline. Until explicitly
reconciled, legacy files without identity may not impersonate an acknowledged
cloud creation during publication. Do not quarantine by moving/deleting a file;
quarantine means withholding cloud adoption/publication and reporting a state.

This protects supported operations and observed files. It cannot stop arbitrary
raw writes or guarantee absence of unreported files in disconnected clones. A
commit guard/general import CLI is follow-up work, not an implied guarantee here.

### Reviewed incident reconciliation

Keep the current cloud project UUID. A repair first inventories retained
reservations, cloud projections/creation claims, pending journals, and canonical
files across participating clones. Preview exact before/after changes and apply
only as an explicitly authorized operator operation while coordination is
suspended. Counter target is max(current counter, highest retained reservation+1,
reviewed canonical high-water+1); never decrement, delete allocation history, or
reuse terminal numbers. No runtime schema repair is allowed.

Treat existing number/creation conflicts as explicit incident corrections, not
normal imports. Preserve original audit history and add correction evidence before
repairing derived projections or legacy identity associations. A plain counter
bump does not resolve cloud 257/258 versus locally repaired 261/262. The operator
must review that mapping, resolve pending old intents, and verify before resumption.
Repair preview/apply is resumable and idempotent. This UAT does not authorize a live
mutation or deployment.

### Ownership and rollout

- MDT-200 owns the core protocol, schema, shared writer/recovery, safe observation,
  ambiguity boundary, and incident procedure. Forward-only schema changes belong
  in `cloud/migrations/`; pure schemas first in `domain-contracts`.
- MDT-201 enable/connect/re-enable must use the same scan/identity reconciliation
  and preserve fail-closed connection semantics; it never reprovisions as repair.
- MDT-202 owns any later operator CLI rendering, not allocation or reconciliation
  logic. No new ticket is allocated by this UAT while the live counter is unsafe.
- Deploy capability/schema support before requiring it in clients; update all
  creating consumers. A client/Worker mismatch must be explicit and fail closed.
  Decide and test safe disposition of pre-upgrade journals and legacy identities
  before enabling publication; do not bulk trust files merely because keys exist.
- Permanent owner docs remain current-state truth. Update them when implementation
  is verified; this ticket package retains the approved contract and dated execution evidence.

## October implementation locations (2026-10-25)

- `domain-contracts/src/cloud-sync/identity.ts`: protocol-v2 inputs, claims,
  diagnostics, and reviewed reconciliation contracts; ticket schemas retain UUIDs.
- `shared/services/ticket/TicketIdentityService.ts`: fresh physical-repository and
  worktree inventory, filename/frontmatter/copy ambiguity, read-only classification.
- `shared/services/TicketService.ts` and `cloud-sync/{create-orchestrator,
  operation-journal,recovery,CloudSyncCoordinator}.ts`: all-consumer create,
  frozen floor/identity, safe upgrade routing and current-file verification.
- `cloud/src/cloudflare/application/{reservation,projection-usecase,
  counter-reconciliation}.ts`, `d1/`, Worker routes and migration0005:
  guarded allocation, immutable server hashes, identity checks, claim reads,
  and audited monotonic reconciliation with transactional expected-state guards.
- `server/services/cloud-sync/TicketIdentityObservation.ts`, watcher internals,
  `routes/ticketIdentities.ts`, access policy and server wiring: bounded
  background observation, relative diagnostics and cached owner-only lookup.
- CLI remains a presentation shell. MCP's injection hook reuses the same shared
  service for real-adapter tests; it adds no numbering logic.

Runtime/source contracts are reconciled in the permanent cloud-sync owner docs.
No live migration, deployment, D1 correction, or multi-client acceptance is
claimed by this implementation inventory.

Configured external ticket roots use the same resolved directory for inventory,
create, and key reads/mutations. Shared external roots are deduplicated across
worktrees and diagnostics use the relative `tickets-root/` label.

MCP section caches re-resolve ticket identity before reuse; a cached body does
not bypass the shared ambiguity guard. External-root key selection compares
physical configured directories rather than inventory ownership labels.

## Review closure design 2026-10-25 — implemented 2026-10-26

This is a correction within the October24 round. The previously implemented
protocol and earlier passing local checks remain historical evidence. No
production rollout or incident repair is authorized by this document update.

### Explicit creation recovery

MDT-200 owns reusable inspection/resume/reconciliation policy in
`shared/services/cloud-sync/creation-recovery.ts`, composing the existing journal,
orchestrator and RecoveryRunner instead of adding another state machine.
The minimum shipped adapter is
`server/routes/cloudCreationRecovery.ts`: an owner-only read-only inspection and
an explicit owner-invoked recovery operation under the existing project cloud-
sync API. A read, startup, watcher event or background timer never resumes a
creation. Exact HTTP payloads must be pure domain contracts, with owner-only
access/public-route carve-outs covered before shipping.

Inspection must enumerate the current physical-repository route and former
project/worktree routes without requiring a successful journal schema parse.
Return bounded redacted metadata, parse/legacy status, original operation and
reservation metadata when valid, expected file digest, and actionable next
steps. Preserve uninterpretable bytes and paths; no new reservation, invented
identity, raw dump, token, body logging, or deletion. Validate proposed journal
writes before persistence so write/read schemas cannot silently diverge.

Resume a valid v2 operation from its original stored draft/identity/minimum and
reservation with the same exclusive lock and current-file verifier. Do not
require users to remember and repeat the original CLI payload. An identical
create invocation already supports recovery across processes; preserve that
behavior. Legacy/corrupt intent requires explicit reviewed resolution against
expected journal state and coordinator/canonical-file evidence. If provenance
cannot be proved, return manual-review-required with inspection still usable;
never clear the blockage by replacing the identity or dropping the journal.
Keep all prior allocation history and an auditable record of any approved local
reconciliation. Do not claim that constructing a new journal can replay an old
idempotency record whose immutable protocol inputs differ.

Lock inspection exposes available owner PID/creation time and verified owner
identity where supported. PID reuse is not evidence of the original process;
age alone never authorizes reclaim. Without sufficient owner proof, retain the
lock and provide a safe explicit operator verification path. Reaped dead-owner
reclaim and ownership-token release guards must remain intact. The challenger
zombie probe is not accepted as evidence of a reproduced zombie failure.

MDT-201 remains the connection/principal lifecycle owner. The minimum local
server adapter closes core recovery availability without making MDT-200 depend
on MDT-202. MDT-202 owns any later CLI parsing/help/rendering of these shared
operations; no full recovery CLI or general import UI is silently added here.

### Canonical project-code identity

Normalize supported local project-code spelling to the canonical cloud identity
at the shared boundary before reservation/header/write/verification decisions.
Use existing project/key normalization policy and strict coordinator project/code
association; do not merely loosen verification comparisons. A genuine different
project code still fails closed. Existing files/configuration are not silently
renamed or rewritten. Cover both local-only compatibility and a real shared-
service create/retry whose header passes the Worker identity check.

### Actionable inventory and stable observation

Retain the fail-closed inventory gate for unavailable worktrees, permissions,
malformed files and unsafe numeric bounds. Preserve the successful parts of an
inventory plus a typed cause, authorized relative path and safe next action for
each failure. Do not swallow a file-specific numeric error into one generic
project diagnostic. An unavailable worktree may be an offline mount; no automatic
skip, prune or file mutation is justified. Suggest inspection and pruning only
after the operator confirms that a worktree is stale.

Keep bounded last verified claim evidence keyed by local project, binding,
principal context, canonical key and creation identity. Rotation outside this
pass's64 probes alone must not demote unchanged evidence or generate a new
notification. Expose last verification/freshness so cached evidence is not
presented as a new authorization decision. Invalidate or mark affected evidence
stale on meaningful identity/content, duplicate, binding/principal or observed
authorization changes. Mutation membership and identity checks always remain
current and independent of this cache. No idle polling/expiry loop or watcher
write is added; the existing bounded event-triggered waves remain.

### Review-fix runtime ownership

- ART-shared-creation-recovery: `shared/services/cloud-sync/creation-recovery.ts`
  (implemented shared policy composition).
- ART-server-creation-recovery: `server/routes/cloudCreationRecovery.ts`
  (implemented explicit owner-only adapter).
- ART-project-code-identity: `domain-contracts/src/project/`
  (existing pure project identity contracts; shared runtime owns integration).
- Existing OBL-creation-identity, OBL-local-orchestration and OBL-manual-observation
  remain valid; explicit recovery/canonical-code obligations supplement them.

### Concrete recovery boundary (2026-10-26 implementation)

`CreationRecoveryService` composes journal discovery and the existing
`RecoveryRunner`; shared TicketService is its production caller. The server
facade resolves Project and forwards to owner-only inspect/resume/reconcile
routes. Inspection obtains no credential, lock or cloud result. Resume takes
`{journalId,expectedDigest}` and retains the original draft, creation identity,
floor, idempotency key and held receipt. The runner checks the digest against
the same bytes it parses after acquiring its lock. A retained written header
must still match the canonical file before ACK. No startup writes are added.

Reconcile additionally takes `{operationId,reason}` and performs only local
archive-terminal disposition. It holds the current route lock and selected
legacy route lock, verifies the original receipt through read-only claims,
and requires current unique canonical identity for acknowledged state.
Reserved/orphaned/unknown receipts remain active. Exact original bytes and a
private immutable decision/proof are synced before active-route removal;
identical operation replay returns the existing decision. Malformed, oversized
or receipt-less journals remain inspectable manual-review-required. There is
no generic force-clear or age-based lock stealing. Trusted disabled bindings
permit inspection/read-only terminal proof; resume requires enabled state.

`CanonicalProjectCodeSchema` normalizes configuration in memory at the shared
cloud creation/recovery boundary. Repository configuration stays untouched;
Worker expected-prefix/number/creation checks remain strict. Diagnostic
cache keys include binding and hashed credential context plus file content
and identity. At most 64 unique claims are probed per observation; unchanged
entries retain their last verified timestamp outside that window. Failed
selected probes become stale/pending; observed authorization loss clears all
project proof. Changes to timestamps alone update cache without another SSE
notification. The cache is never used to authorize a write.

Acknowledged entries are never passed to RecoveryRunner by the explicit owner
recovery policy. They require archive-terminal with a held receipt and fresh
proof, or remain manual-review-required. This prevents the runner's historical
cleanup-only branch from erasing an incomplete or unproven terminal journal.
