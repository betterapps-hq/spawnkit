ALTER TABLE projects ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata));
