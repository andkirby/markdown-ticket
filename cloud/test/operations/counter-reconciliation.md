# Ticket-number and creation-identity incident reconciliation

Status: executed and verified for the original MDT project on2026-10-26,
operation `d520cc6b-a586-45e7-a64f-2b946d08e118`. Counter260→264, revision166→175,
then obsolete256 tombstoned at176. Eight canonical files received reviewed
creationIds; nine reservation identities (including retired256) were reconciled.
Existing reservations/idempotency history were retained. The exact operation,
backup, legacy intent archive and live proof are in
[MDT-200 production acceptance](../../../docs/CRs/MDT-200/production-rollout-2026-10-26.md).
The procedure below remains required for future repairs; deploying source alone
does not repair any project's legacy rows.

## Preconditions and inventory

1. Suspend the existing project's coordination; keep its UUID. Export its
   project/counter, reservations, idempotency, projections, audit, and migration
   state before any correction. Never recreate the project or lower its counter.
2. Inventory canonical files across participating clones/worktrees and pending
   create journals. Check filenames, frontmatter keys, duplicate keys, and
   creation identity. Record which history belongs to the canonical ticket.
3. Inspect every occupied/reserved number involved, including reservations with
   no projection. `reserved`, `acknowledged`, `orphaned`, and `abandoned` all hold
   their numbers. A missing projection does not free a number.
4. For the October24 incident, review both cloud257 → local261 and cloud258 →
   local262, as well as the real canonical257/258 and manually assigned259/260.
   A bump to263 alone cannot fix these associations. A higher retained reservation
   or file requires a higher target. Do not auto-rename either canonical file.
5. Assign an opaque UUID creationId to each reviewed legacy canonical creation
   in its frontmatter. For existing version2 identities, preserve the actual
   creation ID when correcting the reviewed association. Receipt changes and
   pending journals must be reviewed together; do not invent a new identity on
   an ordinary retry. Keep the files readable/editable while cloud publication
   remains withheld for unverified identities.

## Operator API

`POST /v1/admin/projects/{projectId}/reconciliation` is admitted only under the
operator Access audience and additionally requires project owner membership.
The project must remain `suspended`. The body is the pure
`CounterReconciliationRequest` contract in `domain-contracts`.

- `operationId`: one fresh UUID for the reviewed repair; preserve it on retries.
- `dryRun`: start with `true`. Successful authorized preview does SELECTs only.
- `expectedNextTicketNumber`, `expectedProjectionRevision`: exact observed values.
- `reason`: bounded reviewed incident explanation; no body or secrets.
- `canonicalTickets`: at most200 reviewed mappings. Each supplies ticketNumber,
  creationId, approved header, header contentHash, and expectedReservationId,
  expectedCreationId, expectedState, expectedProjectionVersion. For an absent
  reservation use null IDs, `unreserved`, and projectionVersion0.

Header code must match the project's code and ticket number. Header creationId
must match the reviewed creationId. The server independently computes the SHA-256
of the recursively key-sorted header JSON and rejects a mismatched contentHash.
Normal mutable header fields are not proof of creation provenance.

The preview returns the counter target and projection revision changes. The
target is max(current counter, highest retained reservation+1, reviewed canonical
high-water+1), never a lower value. Preview the whole incident inventory and
review all planned batches before proceeding; do not resume between batches.

## Reviewed apply

After review, submit the same operation and expected-state body with `dryRun:
false`. The server derives its own immutable request digest. Changing reviewed
inputs under the same operationId returns `idempotency_key_reused`; obtain a new
review and operationId for a changed plan.

One D1 batch first asserts the suspended project counter/revision and every
reviewed reservation identity/state/projection version. A stale assertion aborts
the entire batch. The batch preserves original number and idempotency rows,
records the prior/reviewed associations in immutable reconciliation evidence,
registers absent reviewed numbers, rebinds only explicitly reviewed identities,
corrects derived projections, advances counter/revision, and writes an audit.
It never deletes reservations or recycles a terminal number.

A response lost after commit is safe to retry unchanged: the stored operation
result is returned without repeating mutations. Concurrent review drift requires
inspection and a fresh preview, not suppressing an error or changing the floor
of a pending create operation.

## Verify before resuming

- Compare returned counter/revision and canonical creation bindings with D1.
- Verify original reservation number rows, idempotency history, and earlier audit
  remain; the new `counter.reconcile` audit and immutable correction record exist.
- Confirm derived projections represent the correct canonical tickets and hashes.
- Resolve or explicitly retire old conflicting local journals using their original
  reservation/intent evidence. Do not delete journals merely to unblock creates.
- Refresh/catch up connected projection read models before ordinary publishing
  resumes. The repair does not itself resume coordination or initiate a stream.
- Confirm a new capable client can reserve above all occupied numbers, while an
  old/incompatible writer fails closed. Raw manual files remain diagnostic-only
  until provenance is verified or explicitly reconciled.

## Local evidence

`bun test ./cloud/test/identity-allocation.test.ts
./cloud/test/counter-reconciliation.test.ts` uses all ordered production
migrations in isolated SQLite. It covers allocation floors, replay and changed
inputs, raced floors, claim visibility, identity mismatches, dry-run, monotonic
repair, retained history, operation replay, and stale preconditions. This does
not replace deployed D1/Access or multi-client acceptance evidence.

The 200-existing-mapping regression enforces the documented D1 Free limits
(50 invocation queries and 100 bindings per statement), including a raced final
mapping that must abort the whole batch. Snapshot reads use two bulk JSON queries;
the atomic guard uses a constant number of bindings. D1 counts `db.batch()` as
one invocation query while applying statement limits to each contained query.
See [D1 platform limits](https://developers.cloudflare.com/d1/platform/limits/).
