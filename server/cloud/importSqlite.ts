import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Database } from "./store";
import { migrate, dbTime } from "./store";
import { RULES } from "../../src/rules";
/** Read-only, all-or-nothing import. Existing cloud rows always win on re-run. */
export async function importSqlite(db: Database, path: string) {
  await migrate(db);
  const source = new DatabaseSync(resolve(path), { readOnly: true });
  try {
    return await db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(71637002)");
      const now = await dbTime(c),
        tables = (
          source
            .prepare(
              "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            )
            .all() as { name: string }[]
        ).map((v) => v.name);
      const rows = (table: string): any[] =>
        tables.includes(table)
          ? source
              .prepare('SELECT * FROM "' + table.replaceAll('"', '""') + '"')
              .all()
          : [];
      let archived = 0,
        imported = 0;
      for (const op of rows("operators")) {
        const existing = (
          await c.query("SELECT id FROM gs_operators WHERE username=$1", [
            op.username,
          ])
        ).rows[0];
        if (existing && existing.id !== op.id)
          throw Error(
            "Operator username already exists with a different identity. Import into an empty database before bootstrapping accounts.",
          );
        await c.query(
          "INSERT INTO gs_operators VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
          [op.id, op.username, op.password_hash, op.created_at],
        );
      }
      const snapshots = new Map(
        rows("session_snapshots").map((v) => [v.session_id, v]),
      );
      for (const r of rows("sessions")) {
        const snapshot = snapshots.get(r.id);
        if (!snapshot) continue;
        const state = JSON.parse(snapshot.state_json);
        const incompatible =
            state.schema !== 3 ||
            state.scenarioVersion !== RULES.scenario.version,
          active = ["playing", "countdown"].includes(state.phase);
        if (active && !incompatible) {
          state.paused = true;
          for (const p of Object.values(state.players) as any[]) {
            p.input = { x: 0, y: 0 };
            p.inputUntil = 0;
          }
        }
        const result = await c.query(
          "INSERT INTO gs_rooms(id,code,owner,state,version,closed,expires_at,created_at,updated_at,last_tick,pause_reason,rematch_code,parent_id) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(id) DO NOTHING RETURNING id",
          [
            r.id,
            r.code,
            r.operator_id,
            JSON.stringify(state),
            snapshot.version,
            !!r.closed || incompatible || r.expires_at <= now,
            r.expires_at,
            r.created_at,
            r.updated_at,
            now,
            active
              ? "Imported session: operator must resume after both players reconnect."
              : snapshot.pause_reason,
            r.rematch_code,
            r.parent_id,
          ],
        );
        if (result.rows.length) imported++;
        if (incompatible) archived++;
      }
      const profiles = new Map(
        rows("player_profiles").map((v) => [v.participant_id, v]),
      );
      for (const p of rows("participants")) {
        if (!snapshots.has(p.session_id)) continue;
        const profile = profiles.get(p.id);
        await c.query(
          "INSERT INTO gs_players(id,session_id,role,token_hash,profile,last_seq,joined_at,last_seen) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8) ON CONFLICT DO NOTHING",
          [
            p.id,
            p.session_id,
            p.role,
            p.token_hash,
            JSON.stringify({
              fullName: profile?.full_name || p.alias,
              block: profile?.block || "",
              groupNumber: profile?.group_number || "",
            }),
            p.last_seq,
            p.joined_at,
            p.last_seen || 0,
          ],
        );
      }
      for (const v of rows("commands"))
        if (snapshots.has(v.session_id))
          await c.query(
            "INSERT INTO gs_commands VALUES($1,$2,$3,$4,$5,$6::jsonb,$7) ON CONFLICT DO NOTHING",
            [
              v.session_id,
              v.actor_id,
              v.command_id,
              v.seq,
              v.kind,
              v.response_json,
              v.created_at,
            ],
          );
      for (const v of rows("activity_logs"))
        if (snapshots.has(v.session_id))
          await c.query(
            "INSERT INTO gs_activity(session_id,entry_key,elapsed,category,action,actor_id,actor_role,full_name,block,group_number,status,summary,details,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14) ON CONFLICT DO NOTHING",
            [
              v.session_id,
              v.entry_key,
              v.elapsed,
              v.category,
              v.action,
              v.actor_id,
              v.actor_role,
              v.full_name,
              v.block,
              v.group_number,
              v.status,
              v.summary,
              v.details_json,
              v.created_at,
            ],
          );
      for (const v of rows("forecasts"))
        if (snapshots.has(v.session_id)) {
          const features = JSON.parse(v.features_json);
          await c.query(
            "INSERT INTO gs_forecasts VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8) ON CONFLICT DO NOTHING",
            [
              v.id,
              v.session_id,
              features.role || "control",
              v.features_json,
              v.result_json,
              v.elapsed,
              v.method_version,
              v.created_at,
            ],
          );
        }
      for (const v of rows("pokemon_records"))
        await c.query(
          "INSERT INTO gs_records VALUES($1,$2::jsonb,$3) ON CONFLICT DO NOTHING",
          [v.id, v.record_json, v.cached_at],
        );
      // Preserve every historical table verbatim, including superseded schemas,
      // released-player profiles, outcome pairs, decisions and offline evaluations.
      // Active cookies/previews/proposals are archived but deliberately not reactivated.
      let preserved = 0;
      for (const table of tables)
        for (const row of rows(table)) {
          const data = JSON.stringify(row),
            key = createHash("sha256").update(data).digest("hex");
          const result = await c.query(
            "INSERT INTO gs_legacy_rows VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING RETURNING row_key",
            [table, key, row.session_id || null, data, now],
          );
          preserved += result.rows.length;
        }
      return {
        importedSessions: imported,
        archivedIncompatibleSessions: archived,
        preservedRows: preserved,
      };
    });
  } finally {
    source.close();
  }
}
