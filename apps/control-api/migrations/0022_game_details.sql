ALTER TABLE game_submissions ADD COLUMN details TEXT NOT NULL DEFAULT '{}';
ALTER TABLE project_listing_settings ADD COLUMN details TEXT NOT NULL DEFAULT '{}';
