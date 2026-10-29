-- Keep dated aggregates separately from short-lived visitor deduplication records.
-- Lifetime totals have no historical timestamps. Only projects created today
-- can be safely backfilled: all of their existing activity is from this UTC day.
CREATE TABLE game_activity_daily (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0 CHECK(views >= 0),
  plays INTEGER NOT NULL DEFAULT 0 CHECK(plays >= 0),
  PRIMARY KEY(project_id, day)
);
CREATE INDEX game_activity_daily_day ON game_activity_daily(day);
INSERT INTO game_activity_daily(project_id,day,views,plays)
SELECT a.project_id,date('now'),a.views,a.plays
FROM game_activity_totals a JOIN projects p ON p.id=a.project_id
WHERE date(p.created_at)=date('now');

CREATE TRIGGER game_activity_daily_insert AFTER INSERT ON game_activity_visitors BEGIN
  INSERT INTO game_activity_daily(project_id,day,views,plays)
  VALUES(NEW.project_id,strftime('%Y-%m-%d',NEW.counted_at/1000,'unixepoch'),NEW.kind='view',NEW.kind='play')
  ON CONFLICT(project_id,day) DO UPDATE SET views=views+(NEW.kind='view'),plays=plays+(NEW.kind='play');
END;
CREATE TRIGGER game_activity_daily_update AFTER UPDATE OF counted_at ON game_activity_visitors BEGIN
  INSERT INTO game_activity_daily(project_id,day,views,plays)
  VALUES(NEW.project_id,strftime('%Y-%m-%d',NEW.counted_at/1000,'unixepoch'),NEW.kind='view',NEW.kind='play')
  ON CONFLICT(project_id,day) DO UPDATE SET views=views+(NEW.kind='view'),plays=plays+(NEW.kind='play');
END;
