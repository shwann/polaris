ALTER TABLE releases ADD COLUMN title TEXT;
ALTER TABLE releases ADD COLUMN tag TEXT CHECK(tag IN ('feature','fix','hotfix','milestone'));
ALTER TABLE releases ADD COLUMN build TEXT;
