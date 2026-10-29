CREATE TABLE game_moderation (
  project_id TEXT PRIMARY KEY REFERENCES projects(id),
  state TEXT NOT NULL DEFAULT 'normal' CHECK(state IN ('normal','hidden','restricted')),
  revision INTEGER NOT NULL DEFAULT 0,
  last_action_id TEXT
);
ALTER TABLE game_comments ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0 CHECK(hidden IN (0,1));
ALTER TABLE game_comments ADD COLUMN moderation_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_comments ADD COLUMN last_action_id TEXT;
CREATE INDEX game_comments_moderation_page ON game_comments(created_at DESC,id DESC);
CREATE TABLE moderation_audit (
  id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),
  game_title TEXT NOT NULL,
  comment_id TEXT,
  action TEXT NOT NULL CHECK(action IN ('hide-game','restrict-game','restore-game','hide-comment','restore-comment')),
  reason TEXT NOT NULL,
  note TEXT NOT NULL,
  before_state TEXT NOT NULL,
  after_state TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX moderation_audit_page ON moderation_audit(created_at DESC,id DESC);
CREATE INDEX moderation_audit_project_page ON moderation_audit(project_id,created_at DESC,id DESC);
CREATE TRIGGER moderation_audit_no_update BEFORE UPDATE ON moderation_audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
CREATE TRIGGER moderation_audit_no_delete BEFORE DELETE ON moderation_audit BEGIN SELECT RAISE(ABORT,'Audit history is immutable'); END;
