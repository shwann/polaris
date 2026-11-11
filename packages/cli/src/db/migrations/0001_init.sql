CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE systems (
  key TEXT PRIMARY KEY NOT NULL CHECK(length(key)>0),
  constellation TEXT NOT NULL, name TEXT NOT NULL CHECK(length(name)>0),
  note TEXT, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE system_apps (
  system_key TEXT PRIMARY KEY NOT NULL REFERENCES systems(key),
  version TEXT NOT NULL, build TEXT, released_at TEXT, backend TEXT,
  backend_label TEXT, backend_build TEXT, skill TEXT, model TEXT,
  rollback TEXT, next TEXT, next_note TEXT, ref TEXT
);
CREATE TABLE releases (
  id TEXT PRIMARY KEY NOT NULL, system_key TEXT NOT NULL REFERENCES systems(key),
  version TEXT NOT NULL, released_at TEXT NOT NULL, ref TEXT, note TEXT,
  UNIQUE(system_key, version)
);
CREATE TABLE requirements (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id)>0),
  system_key TEXT NOT NULL REFERENCES systems(key), title TEXT NOT NULL CHECK(length(title)>0),
  body TEXT, source TEXT NOT NULL CHECK(source IN ('customer','user','review','defect')),
  priority TEXT NOT NULL CHECK(priority IN ('P0','P1','P2')),
  status TEXT NOT NULL CHECK(status IN ('proposed','clarifying','confirmed','scheduled','in_progress','acceptance','done','shelved')),
  scope TEXT, owner TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE requirement_acceptance (
  req_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK(seq>=0), text TEXT NOT NULL,
  met INTEGER NOT NULL CHECK(met IN (0,1)), PRIMARY KEY(req_id,seq)
);
CREATE TABLE requirement_refs (
  req_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK(seq>=0), ref TEXT NOT NULL, PRIMARY KEY(req_id,seq)
);
CREATE TABLE tasks (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id)>0),
  system_key TEXT NOT NULL REFERENCES systems(key), code TEXT NOT NULL CHECK(length(code)>0),
  title TEXT NOT NULL CHECK(length(title)>0),
  lane TEXT NOT NULL CHECK(lane IN ('planned','doing','waiting','release','risk','done')),
  status TEXT NOT NULL CHECK(length(status)>0), sort REAL,
  progress REAL CHECK(progress>=0 AND progress<=100), detail TEXT, needs TEXT, owner TEXT, ref TEXT,
  waiting_since TEXT, shipped_in TEXT, target_release TEXT, unverified TEXT,
  created_at TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE task_steps (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK(seq>=0), name TEXT NOT NULL CHECK(length(name)>0),
  state TEXT NOT NULL CHECK(state IN ('done','doing','blocked','todo')), PRIMARY KEY(task_id,seq)
);
CREATE TABLE task_requirements (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  req_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE, PRIMARY KEY(task_id,req_id)
);
CREATE TABLE events (
  id TEXT PRIMARY KEY NOT NULL, at TEXT NOT NULL, system_key TEXT REFERENCES systems(key),
  text TEXT NOT NULL CHECK(length(text)>0), task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  req_id TEXT REFERENCES requirements(id) ON DELETE SET NULL
);
CREATE TABLE changes (
  id TEXT PRIMARY KEY NOT NULL, at TEXT NOT NULL, actor TEXT NOT NULL,
  op TEXT NOT NULL CHECK(op IN ('insert','update','delete')),
  entity TEXT NOT NULL, entity_id TEXT NOT NULL, field TEXT NOT NULL,
  old TEXT NOT NULL, new TEXT NOT NULL, batch TEXT NOT NULL
);
CREATE INDEX idx_requirements_system ON requirements(system_key);
CREATE INDEX idx_tasks_system_lane ON tasks(system_key,lane);
CREATE INDEX idx_tasks_release ON tasks(system_key,target_release);
CREATE INDEX idx_task_requirements_req ON task_requirements(req_id);
CREATE INDEX idx_events_at ON events(at DESC);
CREATE INDEX idx_events_system ON events(system_key);
CREATE INDEX idx_events_task ON events(task_id);
CREATE INDEX idx_events_req ON events(req_id);
CREATE INDEX idx_changes_batch ON changes(batch);
CREATE INDEX idx_changes_entity ON changes(entity,entity_id);
