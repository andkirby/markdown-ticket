-- MDT-201: project provisioning idempotency.
-- Source: docs/CRs/MDT-201/architecture.md § Provisioning Idempotency,
--         BR-1.7 / Edge-8.
--
-- Initial project provisioning must be retry-safe. The client journals an
-- idempotency key BEFORE the first request. D1 stores one provisioning record
-- keyed by the idempotency key (NOT cloud_project_id — provisioning creates
-- the project). An identical retry returns the same cloud project UUID; the
-- same key with changed request content is rejected.
--
-- This table is intentionally separate from `idempotency_keys`
-- (ticket-reservation idempotency keyed by cloud_project_id). Provisioning
-- idempotency is keyed by the operator-supplied idempotency key alone, because
-- the cloud_project_id does not exist until provisioning succeeds.
--
-- The request_hash is the SHA-256 of the canonical request body, used for
-- conflict detection on key reuse. Schema is forward-only; application startup
-- never creates or repairs tables (operations.md).

CREATE TABLE project_provisioning_idempotency (
  -- SHA-256 of the client-journaled idempotency key; never the raw key.
  idempotency_key_hash TEXT PRIMARY KEY,
  -- SHA-256 of the canonical request body; conflict-detection on key reuse.
  request_hash TEXT NOT NULL,
  -- The cloud project UUID created on first use. Returned verbatim on retry.
  cloud_project_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (cloud_project_id) REFERENCES cloud_projects(id)
);

CREATE INDEX project_provisioning_by_project
  ON project_provisioning_idempotency(cloud_project_id);
