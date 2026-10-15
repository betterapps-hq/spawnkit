CREATE TABLE project_hostnames (
  project_id TEXT PRIMARY KEY REFERENCES projects(id),
  slug TEXT NOT NULL UNIQUE,
  ready INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE hosting_aliases (
  hostname TEXT PRIMARY KEY,
  slot TEXT NOT NULL REFERENCES hosting_slots(slot)
);
CREATE TABLE deployment_hostnames (
  deployment_id TEXT PRIMARY KEY REFERENCES deployments(id),
  hostname TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL REFERENCES projects(id),
  environment TEXT NOT NULL,
  release_id TEXT NOT NULL REFERENCES releases(id)
);
CREATE INDEX deployment_hostnames_project ON deployment_hostnames(project_id, environment);
