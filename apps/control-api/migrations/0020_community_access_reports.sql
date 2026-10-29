CREATE TABLE community_members (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK(role IN ('Admin','Moderator','Observer')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 0,
  last_action_id TEXT,
  created_at TEXT NOT NULL
);
INSERT INTO community_members(user_id,role,created_at) SELECT user_id,'Admin',created_at FROM platform_admins;
CREATE VIEW community_access AS
  SELECT user_id,name,email,role,revision,created_at FROM community_members WHERE active=1
  UNION ALL
  SELECT user_id,'','', 'Admin',0,created_at FROM platform_admins a
  WHERE NOT EXISTS(SELECT 1 FROM community_members m WHERE m.user_id=a.user_id);
CREATE TRIGGER community_last_admin_update BEFORE UPDATE ON community_members
WHEN OLD.active=1 AND OLD.role='Admin' AND (NEW.active=0 OR NEW.role!='Admin')
AND (SELECT COUNT(*) FROM community_access WHERE role='Admin')<=1
BEGIN SELECT RAISE(ABORT,'The last administrator cannot be removed'); END;
CREATE TRIGGER community_last_admin_delete BEFORE DELETE ON community_members
WHEN OLD.active=1 AND OLD.role='Admin' AND (SELECT COUNT(*) FROM community_access WHERE role='Admin')<=1
BEGIN SELECT RAISE(ABORT,'The last administrator cannot be removed'); END;
CREATE TABLE community_invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Admin','Moderator','Observer')),
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','cancelled')),
  accepted_by TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  email_state TEXT NOT NULL DEFAULT 'pending' CHECK(email_state IN ('pending','sent','failed')),
  email_attempts INTEGER NOT NULL DEFAULT 0,
  email_next_at TEXT,
  email_error TEXT,
  last_action_id TEXT
);
CREATE UNIQUE INDEX community_pending_email ON community_invitations(email) WHERE state='pending';
CREATE TABLE community_audit (
  id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_state TEXT NOT NULL,
  after_state TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX community_audit_page ON community_audit(created_at DESC,id DESC);
CREATE TRIGGER community_audit_no_update BEFORE UPDATE ON community_audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
CREATE TRIGGER community_audit_no_delete BEFORE DELETE ON community_audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
CREATE TABLE report_cases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  comment_id TEXT,
  target_key TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('Game','Comment')),
  state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','escalated','resolved')),
  assignee_id TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  last_action_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX report_open_target ON report_cases(target_key) WHERE state!='resolved';
CREATE INDEX report_case_page ON report_cases(state,created_at DESC,id DESC);
CREATE TABLE player_reports (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES report_cases(id),
  reporter_id TEXT NOT NULL,
  target_key TEXT NOT NULL,
  target_version TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(reporter_id,target_key,target_version)
);
CREATE INDEX reports_user_time ON player_reports(reporter_id,created_at);
CREATE INDEX reports_case ON player_reports(case_id,created_at);
CREATE TRIGGER player_report_no_update BEFORE UPDATE ON player_reports BEGIN SELECT RAISE(ABORT,'Reported evidence is immutable'); END;
CREATE TRIGGER player_report_no_delete BEFORE DELETE ON player_reports BEGIN SELECT RAISE(ABORT,'Reported evidence is immutable'); END;
CREATE TABLE report_audit (
  id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  case_id TEXT NOT NULL REFERENCES report_cases(id),
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX report_audit_case ON report_audit(case_id,created_at,id);
CREATE TRIGGER report_audit_no_update BEFORE UPDATE ON report_audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
CREATE TRIGGER report_audit_no_delete BEFORE DELETE ON report_audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
CREATE TABLE project_listing_settings (
  project_id TEXT PRIMARY KEY REFERENCES projects(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  genre TEXT NOT NULL,
  dimension TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_action_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
