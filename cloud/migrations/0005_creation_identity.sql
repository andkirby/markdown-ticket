-- MDT-200 collision stabilization. Legacy NULL identities require explicit review.
ALTER TABLE ticket_reservations ADD COLUMN creation_id TEXT;
ALTER TABLE ticket_reservations ADD COLUMN minimum_ticket_number INTEGER;
CREATE UNIQUE INDEX reservations_by_creation_identity
  ON ticket_reservations(cloud_project_id, creation_id) WHERE creation_id IS NOT NULL;

-- Immutable repair evidence survives normal audit retention. verified is a
-- transaction guard: an expected-state mismatch aborts the entire repair batch.
CREATE TABLE reconciliation_operations (
  cloud_project_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  verified INTEGER NOT NULL CHECK (verified = 1),
  result_json TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  created_by_kind TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (cloud_project_id, operation_id),
  FOREIGN KEY (cloud_project_id) REFERENCES cloud_projects(id)
);
