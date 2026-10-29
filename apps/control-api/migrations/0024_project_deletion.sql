ALTER TABLE projects ADD COLUMN lifecycle TEXT NOT NULL DEFAULT 'active' CHECK(lifecycle IN ('active','deleting','deleted'));
CREATE INDEX projects_lifecycle ON projects(lifecycle,owner_id);
-- Settings presents one saved display name. Addresses remain unchanged.
UPDATE projects SET name=(SELECT title FROM project_listing_settings WHERE project_id=projects.id)
WHERE EXISTS(SELECT 1 FROM project_listing_settings WHERE project_id=projects.id);
CREATE TABLE project_deletions (
  project_id TEXT PRIMARY KEY REFERENCES projects(id), actor_id TEXT NOT NULL,
  requested_at TEXT NOT NULL, completed_at TEXT,
  phase TEXT NOT NULL DEFAULT 'builds' CHECK(phase IN ('builds','telemetry','domains','files','records','complete')),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','retrying','complete')),
  attempts INTEGER NOT NULL DEFAULT 0, retry_at INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0, last_error TEXT
);
CREATE TABLE project_deletion_builds (
  project_id TEXT NOT NULL REFERENCES projects(id), deployment_id TEXT NOT NULL,
  PRIMARY KEY(project_id,deployment_id)
);
-- Track external writes until their bounded provider calls finish. A crashed
-- isolate expires; every storage write also checks the lifecycle after writing.
CREATE TABLE project_resource_operations (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), expires_at INTEGER NOT NULL
);
CREATE INDEX project_resource_operations_project ON project_resource_operations(project_id,expires_at);
CREATE TRIGGER project_resource_active BEFORE INSERT ON project_resource_operations
  WHEN NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER project_no_resurrection BEFORE UPDATE OF lifecycle ON projects
  WHEN OLD.lifecycle!='active' AND NEW.lifecycle='active'
  BEGIN SELECT RAISE(ABORT,'Deleted projects cannot be restored'); END;
CREATE TRIGGER environments_active_project BEFORE INSERT ON environments
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER uploads_active_project BEFORE INSERT ON uploads
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER releases_active_project BEFORE INSERT ON releases
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER deployments_active_project BEFORE INSERT ON deployments
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER domains_active_project BEFORE INSERT ON domains
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER github_states_active_project BEFORE INSERT ON github_states
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER github_connections_active_project BEFORE INSERT ON github_connections
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER github_events_active_project BEFORE INSERT ON github_events
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER project_hostnames_active_project BEFORE INSERT ON project_hostnames
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER hosting_slots_active_project BEFORE INSERT ON hosting_slots
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER deployment_hostnames_active_project BEFORE INSERT ON deployment_hostnames
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER game_submissions_active_project BEFORE INSERT ON game_submissions
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER project_listing_settings_active_project BEFORE INSERT ON project_listing_settings
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER game_comments_active_project BEFORE INSERT ON game_comments
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER game_ratings_active_project BEFORE INSERT ON game_ratings
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER game_activity_visitors_active_project BEFORE INSERT ON game_activity_visitors
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER game_activity_totals_active_project BEFORE INSERT ON game_activity_totals
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER game_activity_daily_active_project BEFORE INSERT ON game_activity_daily
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER game_moderation_active_project BEFORE INSERT ON game_moderation
  WHEN NEW.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
CREATE TRIGGER environment_no_reactivation BEFORE UPDATE ON environments
  WHEN (NEW.enabled=1 OR NEW.current_release_id IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND lifecycle='active')
  BEGIN SELECT RAISE(ABORT,'Project is being deleted'); END;
