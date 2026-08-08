# MDT-226 BDD Acceptance

These scenarios define observable acceptance behavior. Executable tests are
generated in the later test-specification stage; this document does not claim
that the current polling implementation satisfies them.

## SC-1 Project stream becomes live after catch-up

**Covers:** `BR-1.1`, `BR-1.4`

**Given** an authorized local server has an enabled cloud project and a
persisted project revision\
**When** the cloud projection stream connects\
**Then** one project stream catches up after that revision and reports live only
after catch-up completes.

## SC-2 Committed projection appears as a ticket update

**Covers:** `BR-1.2`, `BR-1.3`

**Given** an authorized local server has a healthy cloud project stream and a
browser is connected to the local ticket stream\
**When** another member commits a projection change\
**Then** the backend updates its unified ticket read model and the browser
receives an ordinary local ticket change without a refresh or cloud poll.

## SC-3 Browser tabs share one backend-managed cloud stream

**Covers:** `BR-1.6`

**Given** one browser tab is observing a project through the local ticket API
and event stream\
**When** additional browser tabs open the same project\
**Then** all tabs receive local ticket updates while the backend keeps
exactly one cloud project stream.

## SC-4 Reconnect catches up before live delivery

**Covers:** `BR-1.4`, `BR-1.5`

**Given** a local server is disconnected while projection revisions commit\
**When** its bounded reconnect succeeds with the last applied revision\
**Then** the missing projection state is applied in revision order before the
stream returns to live.

## SC-5 Disconnected board remains usable and visibly stale

**Covers:** `BR-1.5`

**Given** the board has a previously applied cloud projection\
**When** the cloud projection stream becomes unavailable\
**Then** the board keeps that projection visible, marks cloud state stale, and
retries without blocking local ticket use.

## SC-6 Revoked member stops receiving projections

**Covers:** `BR-1.7`

**Given** a member has an active project stream\
**When** an owner revokes or suspends that membership\
**Then** the member's project socket closes and no later projection is delivered
through it.

## SC-7 Post-commit delivery failure converges

**Covers:** `BR-1.8`

**Given** a projection revision commits but an active local backend does not
acknowledge it\
**When** the project hub alarm runs or the backend reconnects\
**Then** the backend receives committed projection state from its last
acknowledged or persisted revision without periodic polling.

## SC-8 Canonical local ticket wins in the unified read model

**Covers:** `BR-1.9`

**Given** a canonical local ticket and cloud projection share a ticket number\
**When** the backend builds the unified ticket read model\
**Then** the returned item is the canonical local ticket and no projected
duplicate is exposed.

## Acceptance Gate

- All eight scenarios require executable coverage before implementation is
  accepted.
- Constraint and edge-case verification is owned by the later test
  specification, including idle D1 traffic, latency, hibernation, redaction,
  alarm recovery, and connection-schema migration.
- Primary expected suites are `cloud/test/project-projection-hub.test.ts`,
  `server/tests/services/cloud-sync/ProjectionStreamManager.test.ts`, and
  `tests/e2e/cloud-sync-board.spec.ts`.
