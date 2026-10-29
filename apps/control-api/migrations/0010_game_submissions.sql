CREATE TABLE platform_admins (user_id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE game_submissions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  release_id TEXT NOT NULL REFERENCES releases(id),
  deployment_id TEXT NOT NULL REFERENCES deployment_hostnames(deployment_id),
  title TEXT NOT NULL, description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','unpublished','superseded')),
  submitted_at TEXT NOT NULL, reviewed_at TEXT, reviewer_id TEXT, review_note TEXT NOT NULL DEFAULT '',
  UNIQUE(project_id,release_id)
);
CREATE UNIQUE INDEX game_one_approved ON game_submissions(project_id) WHERE status='approved';
CREATE INDEX game_review_queue ON game_submissions(status,submitted_at);
CREATE TRIGGER game_review_audit AFTER UPDATE OF status ON game_submissions WHEN OLD.status != NEW.status BEGIN
  INSERT INTO audit_events(id,project_id,actor_id,action,detail,created_at)
  VALUES(lower(hex(randomblob(16))),NEW.project_id,NEW.reviewer_id,'game.' || NEW.status,json_object('submissionId',NEW.id,'releaseId',NEW.release_id,'note',NEW.review_note),NEW.reviewed_at);
END;
