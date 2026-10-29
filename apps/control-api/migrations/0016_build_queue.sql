CREATE TABLE build_queue (
  deployment_id TEXT PRIMARY KEY REFERENCES deployments(id),
  owner_id TEXT NOT NULL,
  enqueued_at TEXT NOT NULL,
  reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved IN (0,1)),
  finished INTEGER NOT NULL DEFAULT 0 CHECK(finished IN (0,1)),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_started_at TEXT,
  last_started_order INTEGER NOT NULL DEFAULT 0,
  available_at INTEGER NOT NULL DEFAULT 0,
  outcome TEXT CHECK(outcome IN ('retry','failed','activate'))
);
CREATE INDEX build_queue_waiting ON build_queue(finished,reserved,available_at,enqueued_at);
CREATE INDEX build_queue_owner ON build_queue(owner_id,last_started_order);
CREATE INDEX build_queue_order ON build_queue(last_started_order);

-- Preserve capacity occupied by jobs already running during rollout.
INSERT INTO build_queue(deployment_id,owner_id,enqueued_at,reserved,attempts,last_started_at)
SELECT d.id,p.owner_id,d.created_at,d.status != 'queued',d.status != 'queued',
       CASE WHEN d.status != 'queued' THEN d.updated_at END
FROM deployments d JOIN projects p ON p.id=d.project_id
WHERE d.operation='deployments' AND d.status IN ('queued','building','activating');

UPDATE releases SET status='queued'
WHERE status='building' AND id IN (SELECT release_id FROM deployments WHERE status='queued');
