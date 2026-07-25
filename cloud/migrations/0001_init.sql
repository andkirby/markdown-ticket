-- MDT-200 Slice 2: coordination schema initialization.
-- Verbatim from docs/architecture/cloud-sync/data-and-consistency.md § Data Model.
-- Every tenant query is scoped by cloud_project_id. Schema is forward-only;
-- application startup never creates or repairs tables (operations.md).

CREATE TABLE cloud_projects (
  id TEXT PRIMARY KEY,
  project_code TEXT NOT NULL,
  coordination_state TEXT NOT NULL
    CHECK (coordination_state IN ('active', 'suspended')),
  next_ticket_number INTEGER NOT NULL CHECK (next_ticket_number > 0),
  projection_revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE memberships (
  cloud_project_id TEXT NOT NULL,
  principal_kind TEXT NOT NULL
    CHECK (principal_kind IN ('human', 'machine')),
  principal_id TEXT NOT NULL,
  display_label TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'contributor', 'owner')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (cloud_project_id, principal_kind, principal_id),
  FOREIGN KEY (cloud_project_id) REFERENCES cloud_projects(id)
);

CREATE TABLE ticket_reservations (
  cloud_project_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  ticket_number INTEGER NOT NULL,
  state TEXT NOT NULL
    CHECK (state IN ('reserved', 'acknowledged', 'abandoned', 'orphaned')),
  created_by_kind TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  acknowledged_at TEXT,
  abandoned_at TEXT,
  PRIMARY KEY (cloud_project_id, reservation_id),
  UNIQUE (cloud_project_id, ticket_number),
  FOREIGN KEY (cloud_project_id) REFERENCES cloud_projects(id)
);

CREATE TABLE idempotency_keys (
  cloud_project_id TEXT NOT NULL,
  idempotency_key_hash TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (cloud_project_id, idempotency_key_hash),
  UNIQUE (cloud_project_id, reservation_id),
  FOREIGN KEY (cloud_project_id, reservation_id)
    REFERENCES ticket_reservations(cloud_project_id, reservation_id)
);

CREATE TABLE ticket_projections (
  cloud_project_id TEXT NOT NULL,
  ticket_number INTEGER NOT NULL,
  reservation_id TEXT NOT NULL,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('active', 'deleted')),
  projection_version INTEGER NOT NULL CHECK (projection_version > 0),
  project_revision INTEGER NOT NULL CHECK (project_revision > 0),
  operation_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  type TEXT,
  priority TEXT,
  assignee TEXT,
  date_created TEXT,
  last_modified TEXT NOT NULL,
  updated_by_kind TEXT NOT NULL,
  updated_by_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (cloud_project_id, ticket_number),
  UNIQUE (cloud_project_id, reservation_id),
  UNIQUE (cloud_project_id, operation_id),
  FOREIGN KEY (cloud_project_id, reservation_id)
    REFERENCES ticket_reservations(cloud_project_id, reservation_id)
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  cloud_project_id TEXT,
  request_id TEXT NOT NULL,
  principal_kind TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  action TEXT NOT NULL,
  outcome TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  detail_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE INDEX memberships_by_principal
  ON memberships(principal_kind, principal_id, cloud_project_id);
CREATE INDEX projections_by_revision
  ON ticket_projections(cloud_project_id, project_revision);
CREATE INDEX reservations_by_state_age
  ON ticket_reservations(cloud_project_id, state, created_at);
CREATE INDEX audit_by_project_time
  ON audit_events(cloud_project_id, occurred_at);
CREATE INDEX audit_by_principal_time
  ON audit_events(principal_kind, principal_id, occurred_at);
