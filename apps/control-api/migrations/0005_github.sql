CREATE TABLE github_states (
  state TEXT PRIMARY KEY, owner_id TEXT NOT NULL, project_id TEXT NOT NULL REFERENCES projects(id),
  repository TEXT NOT NULL, expires_at TEXT NOT NULL
);
CREATE TABLE github_connections (
  project_id TEXT PRIMARY KEY REFERENCES projects(id), installation_id INTEGER NOT NULL,
  repository_id INTEGER NOT NULL, repository TEXT NOT NULL,
  connected_by TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE github_events (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  kind TEXT NOT NULL, environment TEXT NOT NULL, commit_sha TEXT NOT NULL,
  title TEXT NOT NULL, branch TEXT NOT NULL, pull_request INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', deployment_id TEXT,
  created_at TEXT NOT NULL
);
