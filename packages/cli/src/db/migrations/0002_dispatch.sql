CREATE TABLE dispatch_settings (
  id TEXT PRIMARY KEY NOT NULL,
  system_key TEXT NOT NULL REFERENCES systems(key),
  engine TEXT NOT NULL CHECK(engine IN ('codex','claude')),
  model TEXT NOT NULL CHECK(length(trim(model))>0),
  effort TEXT NOT NULL, note TEXT NOT NULL, by_name TEXT NOT NULL,
  actor TEXT NOT NULL, set_at TEXT NOT NULL
);
CREATE INDEX idx_dispatch_system_time ON dispatch_settings(system_key,set_at DESC,id DESC);
ALTER TABLE tasks ADD COLUMN dispatch_engine TEXT;
ALTER TABLE tasks ADD COLUMN dispatch_model TEXT;
ALTER TABLE tasks ADD COLUMN dispatch_effort TEXT;
ALTER TABLE tasks ADD COLUMN executor TEXT;
ALTER TABLE tasks ADD COLUMN executor_at TEXT;
