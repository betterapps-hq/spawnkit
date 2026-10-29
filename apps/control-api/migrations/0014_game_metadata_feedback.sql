ALTER TABLE game_submissions ADD COLUMN genre TEXT;
ALTER TABLE game_submissions ADD COLUMN dimension TEXT CHECK(dimension IN ('2D','3D'));

CREATE TABLE game_ratings (
  project_id TEXT NOT NULL REFERENCES projects(id),
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(project_id,user_id)
);
CREATE TABLE game_comments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  user_id TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id,user_id)
);
CREATE INDEX game_comments_page ON game_comments(project_id,created_at DESC,id DESC);
