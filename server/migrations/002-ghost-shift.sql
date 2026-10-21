CREATE TABLE IF NOT EXISTS pokemon_records(id INTEGER PRIMARY KEY,record_json TEXT NOT NULL,cached_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS selected_teams(session_id TEXT NOT NULL,role TEXT NOT NULL,ids_json TEXT NOT NULL,records_json TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(session_id,role));
CREATE TABLE IF NOT EXISTS normal_tasks(session_id TEXT NOT NULL,id TEXT NOT NULL,data_json TEXT NOT NULL,PRIMARY KEY(session_id,id));
CREATE TABLE IF NOT EXISTS threat_instances(session_id TEXT NOT NULL,id TEXT NOT NULL,data_json TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(session_id,id));
CREATE TABLE IF NOT EXISTS emergency_instances(session_id TEXT NOT NULL,id TEXT NOT NULL,data_json TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(session_id,id));
CREATE TABLE IF NOT EXISTS director_commands(session_id TEXT NOT NULL,command_id TEXT NOT NULL,actor_id TEXT NOT NULL,kind TEXT NOT NULL,data_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(session_id,command_id));
CREATE TABLE IF NOT EXISTS ghost_metrics(session_id TEXT PRIMARY KEY,data_json TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS emergency_status ON emergency_instances(session_id,status);
