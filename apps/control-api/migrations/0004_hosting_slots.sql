CREATE TABLE hosting_slots (
  slot TEXT PRIMARY KEY, hostname TEXT NOT NULL UNIQUE,
  project_id TEXT REFERENCES projects(id), environment TEXT,
  UNIQUE(project_id,environment)
);
