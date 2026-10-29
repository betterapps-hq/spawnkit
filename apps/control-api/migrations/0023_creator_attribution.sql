CREATE TABLE kit_downloads (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX kit_downloads_created ON kit_downloads(created_at);
ALTER TABLE releases ADD COLUMN kit_download_id TEXT;
CREATE INDEX releases_kit_download ON releases(kit_download_id);
