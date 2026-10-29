ALTER TABLE project_hostnames ADD COLUMN domain TEXT NOT NULL DEFAULT 'spawnkit.cloud';
CREATE TABLE deployment_hostname_aliases (
  hostname TEXT PRIMARY KEY,
  deployment_id TEXT NOT NULL REFERENCES deployment_hostnames(deployment_id)
);
