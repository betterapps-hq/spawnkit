PRAGMA foreign_keys = ON;
CREATE TABLE projects (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL,
  configuration TEXT NOT NULL CHECK(json_valid(configuration)), revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX projects_owner ON projects(owner_id);
CREATE TABLE environments (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL, enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
  current_release_id TEXT, generation INTEGER NOT NULL DEFAULT 0,
  UNIQUE(project_id,name)
);
CREATE TABLE uploads (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  sha256 TEXT NOT NULL, size_bytes INTEGER NOT NULL, status TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE releases (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  build_id TEXT NOT NULL, status TEXT NOT NULL, environment TEXT NOT NULL,
  artifact_digest TEXT, created_at TEXT NOT NULL, url TEXT
);
CREATE TABLE deployments (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  release_id TEXT REFERENCES releases(id), upload_id TEXT REFERENCES uploads(id),
  environment TEXT NOT NULL, status TEXT NOT NULL, operation TEXT NOT NULL,
  expected_release_id TEXT, request_key TEXT NOT NULL, request_hash TEXT NOT NULL,
  actor_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE(project_id, request_key)
);
CREATE INDEX deployments_project ON deployments(project_id,created_at);
CREATE TABLE logs (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id TEXT NOT NULL REFERENCES deployments(id), message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX logs_deployment ON logs(deployment_id,sequence);
CREATE TABLE domains (
  hostname TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  environment TEXT NOT NULL, verification_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL
);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  actor_id TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);
