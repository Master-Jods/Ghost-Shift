CREATE TABLE IF NOT EXISTS player_profiles(
 participant_id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),role TEXT NOT NULL,
 full_name TEXT NOT NULL,block TEXT,group_number TEXT,registered_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS player_profiles_session ON player_profiles(session_id,role);
INSERT OR IGNORE INTO player_profiles SELECT id,session_id,role,alias,NULL,NULL,joined_at FROM participants;
CREATE TABLE IF NOT EXISTS activity_logs(
 id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT NOT NULL REFERENCES sessions(id),entry_key TEXT NOT NULL,
 elapsed REAL NOT NULL,category TEXT NOT NULL,action TEXT NOT NULL,actor_id TEXT,actor_role TEXT NOT NULL,
 full_name TEXT,block TEXT,group_number TEXT,status TEXT NOT NULL,summary TEXT NOT NULL,details_json TEXT NOT NULL,created_at INTEGER NOT NULL,
 UNIQUE(session_id,entry_key)
);
CREATE INDEX IF NOT EXISTS activity_logs_session ON activity_logs(session_id,id);
CREATE INDEX IF NOT EXISTS activity_logs_time ON activity_logs(id);
INSERT OR IGNORE INTO activity_logs(session_id,entry_key,elapsed,category,action,actor_role,status,summary,details_json,created_at)
 SELECT session_id,'event:'||event_key,elapsed,category,'LEGACY_EVENT','unattributed','recorded',text,features_json,created_at FROM events;
INSERT OR IGNORE INTO schema_migrations VALUES(3,CAST(strftime('%s','now') AS INTEGER)*1000);
