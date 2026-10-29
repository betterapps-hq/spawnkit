CREATE TABLE agent_registrations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  project_id TEXT NOT NULL,
  scopes TEXT NOT NULL,
  claim_hash TEXT NOT NULL UNIQUE,
  attempt_hash TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL,
  owner_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  claim_expires_at INTEGER NOT NULL,
  grant_expires_at INTEGER,
  next_poll_at INTEGER NOT NULL DEFAULT 0,
  poll_interval INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX agent_registration_owner ON agent_registrations(owner_id);
CREATE TABLE agent_access_tokens (
  hash TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES agent_registrations(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX agent_token_registration ON agent_access_tokens(registration_id);
CREATE TABLE agent_auth_audit (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL,
  event TEXT NOT NULL,
  actor_id TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX agent_audit_registration ON agent_auth_audit(registration_id,created_at);
CREATE TABLE agent_auth_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
