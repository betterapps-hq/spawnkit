CREATE TABLE game_activity_totals (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0 CHECK(views >= 0),
  plays INTEGER NOT NULL DEFAULT 0 CHECK(plays >= 0)
);

-- Only the most recent counted event is retained for each game, visitor and kind.
CREATE TABLE game_activity_visitors (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('view','play')),
  counted_at INTEGER NOT NULL,
  PRIMARY KEY(project_id, visitor_hash, kind)
);
CREATE INDEX game_activity_expiry ON game_activity_visitors(counted_at);

-- The deduplication write and counter increment are one atomic SQL operation.
CREATE TRIGGER game_activity_insert AFTER INSERT ON game_activity_visitors BEGIN
  INSERT INTO game_activity_totals(project_id,views,plays)
  VALUES(NEW.project_id,NEW.kind='view',NEW.kind='play')
  ON CONFLICT(project_id) DO UPDATE SET views=views+(NEW.kind='view'),plays=plays+(NEW.kind='play');
END;
CREATE TRIGGER game_activity_update AFTER UPDATE OF counted_at ON game_activity_visitors BEGIN
  INSERT INTO game_activity_totals(project_id,views,plays)
  VALUES(NEW.project_id,NEW.kind='view',NEW.kind='play')
  ON CONFLICT(project_id) DO UPDATE SET views=views+(NEW.kind='view'),plays=plays+(NEW.kind='play');
END;
