import { randomUUID, randomBytes, randomInt, createHash } from "node:crypto";
import {
  initial,
  reduce,
  defaultConfig,
  commitShowdown,
  type State,
  type Action,
} from "../../src/engine.js";
import {
  PROTOCOL_VERSION,
  validateCommand,
  validConfig,
  validInjection,
  needsPreview,
  playerActions,
  operatorActions,
  type Proposal,
  type DecisionPreview,
  type Command,
  type Ack,
  type ActorRole,
} from "../../src/protocol.js";
import { RULES } from "../../src/rules.js";
import { MAP_SIGNATURE, MAP_VERSION, distance } from "../../src/world.js";
import {
  playerProfile,
  PROFILE_ERROR,
  type PlayerProfile,
} from "../../src/playerProfile.js";
import type { PokemonRecord } from "../../src/data.js";
import { hashToken, token, hashPassword, checkPassword } from "../security.js";
import { metrics } from "../metrics.js";
import {
  catalog,
  validPokemon,
  publicRecord,
  injectionRecord,
} from "../catalog.js";
import { quickPlans, quickForecast, QUICK_MODEL } from "../quickAnalysis.js";
import { knowledgeState } from "../analytics.js";
import { fieldFacts, fieldMaterialKey } from "../../src/fieldAnalysis.js";
import { makePreview, feasibility, fingerprint } from "../decisions.js";
import { startEncounter, battleChoice } from "../showdownBattle.js";
import type { Jobs } from "../jobs.js";
import { dbTime, migrate, type Database, type SqlClient } from "./store.js";
import {
  check,
  CloudError,
  type Room,
  type Player,
  type Identity,
} from "./types.js";
export type Auth = { bearer?: string; cookie?: string; connectionId?: string };
const js = (v: unknown) => JSON.stringify(v),
  numbers = (r: any) => {
    for (const k of [
      "version",
      "expires_at",
      "created_at",
      "updated_at",
      "last_tick",
      "last_seq",
      "joined_at",
      "lease_until",
      "last_seen",
    ])
      if (r?.[k] !== undefined) r[k] = Number(r[k]);
    return r;
  };
export class CloudService {
  readonly ready: Promise<void>;
  readonly graceMs: number;
  readonly leaseMs = 4000;
  constructor(
    readonly db: Database,
    readonly options: {
      bootstrapUser?: string;
      bootstrapPassword?: string;
      graceMs?: number;
    } = {},
  ) {
    this.graceMs = options.graceMs ?? 10000;
    this.ready = migrate(db).then(async () => {
      if (options.bootstrapPassword)
        await this.createOperator(
          options.bootstrapUser || "operator",
          options.bootstrapPassword,
        );
    });
  }
  async createOperator(username: string, password: string) {
    check(
      /^[a-zA-Z0-9_-]{3,32}$/.test(username) && password.length >= 10,
      400,
      "Operator username/password configuration is invalid.",
    );
    await this.db.query(
      "INSERT INTO gs_operators VALUES($1,$2,$3,$4) ON CONFLICT(username) DO NOTHING",
      [randomUUID(), username, hashPassword(password), Date.now()],
    );
  }
  async checkOperatorEnvironment(username: string, password: string) {
    const row = (
      await this.db.query(
        "SELECT password_hash FROM gs_operators WHERE username=$1",
        [username],
      )
    ).rows[0];
    return {
      accountExists: !!row,
      passwordMatchesEnvironment:
        !!row && checkPassword(password, row.password_hash),
    };
  }
  async resetOperatorPassword(username: string, password: string) {
    check(
      /^[a-zA-Z0-9_-]{3,32}$/.test(username) && password.length >= 10,
      400,
      "Use a valid operator username and a password of at least 10 characters.",
    );
    return this.db.transaction(async (c) => {
      const row = (
        await c.query(
          "SELECT id FROM gs_operators WHERE username=$1 FOR UPDATE",
          [username],
        )
      ).rows[0];
      check(
        row,
        404,
        "Operator account not found. Create the cloud operator first.",
      );
      await c.query("UPDATE gs_operators SET password_hash=$2 WHERE id=$1", [
        row.id,
        hashPassword(password),
      ]);
      await c.query("DELETE FROM gs_operator_sessions WHERE operator_id=$1", [
        row.id,
      ]);
    });
  }
  async operator(auth: Auth, c: SqlClient = this.db) {
    check(auth.cookie, 401, "Operator login required.");
    const row = (
      await c.query(
        "SELECT o.id,o.username FROM gs_operator_sessions s JOIN gs_operators o ON o.id=s.operator_id WHERE s.token_hash=$1 AND s.expires_at>(extract(epoch from clock_timestamp())*1000)::bigint",
        [hashToken(auth.cookie)],
      )
    ).rows[0];
    check(row, 401, "Operator login required.");
    return row as { id: string; username: string };
  }
  async login(username: unknown, password: unknown) {
    check(
      typeof username === "string" &&
        username.length <= 32 &&
        typeof password === "string" &&
        password.length <= 256,
      400,
      "Invalid login.",
    );
    const op = (
      await this.db.query("SELECT * FROM gs_operators WHERE username=$1", [
        username,
      ])
    ).rows[0];
    const valid = checkPassword(
      password,
      op?.password_hash || "0".repeat(32) + ":" + "0".repeat(128),
    );
    check(op && valid, 401, "Incorrect operator credentials.");
    const value = token();
    await this.db.query("INSERT INTO gs_operator_sessions VALUES($1,$2,$3)", [
      hashToken(value),
      op.id,
      Date.now() + 12 * 3600000,
    ]);
    return { token: value, operator: { id: op.id, username: op.username } };
  }
  async limit(key: string, max: number, window = 1000) {
    const now = await dbTime(this.db),
      bucket = Math.floor(now / window),
      k = createHash("sha256").update(key).digest("hex");
    const n = (
      await this.db.query(
        "INSERT INTO gs_limits(key,bucket,n,expires_at) VALUES($1,$2,1,$3) ON CONFLICT(key,bucket) DO UPDATE SET n=gs_limits.n+1 RETURNING n",
        [k, bucket, now + window + 60000],
      )
    ).rows[0].n;
    check(n <= max, 429, "Too many requests. Wait briefly and retry.");
    if (bucket % 60 === 0)
      await this.db.query("DELETE FROM gs_limits WHERE expires_at<$1", [now]);
  }
  async identity(c: SqlClient, room: Room, auth: Auth): Promise<Identity> {
    if (auth.bearer) {
      const p = numbers(
        (
          await c.query(
            "SELECT * FROM gs_players WHERE session_id=$1 AND token_hash=$2 AND NOT released",
            [room.id, hashToken(auth.bearer)],
          )
        ).rows[0],
      ) as Player;
      check(p, 401, "Player slot credential is invalid or released.");
      if (auth.connectionId)
        check(
          p.connection_id === auth.connectionId,
          409,
          "This slot is now controlled by another tab.",
        );
      return {
        id: p.id,
        role: p.role,
        profile: p.profile,
        sessionId: room.id,
        connectionId: auth.connectionId,
      };
    }
    const op = await this.operator(auth, c);
    check(
      room.owner === op.id || room.owner === null,
      403,
      "This operator does not own that session.",
    );
    return {
      id: op.id,
      username: op.username,
      role: "control",
      sessionId: room.id,
      connectionId: auth.connectionId,
    };
  }
  async players(c: SqlClient, id: string) {
    return (
      await c.query(
        "SELECT * FROM gs_players WHERE session_id=$1 AND NOT released ORDER BY role",
        [id],
      )
    ).rows.map(numbers) as Player[];
  }
  async activity(
    c: SqlClient,
    r: Room,
    key: string,
    category: string,
    action: string,
    summary: string,
    actor?: Identity,
    status = "recorded",
    details: unknown = {},
  ) {
    await c.query(
      "INSERT INTO gs_activity(session_id,entry_key,elapsed,category,action,actor_id,actor_role,full_name,block,group_number,status,summary,details,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14) ON CONFLICT DO NOTHING",
      [
        r.id,
        key,
        r.state.elapsed,
        category,
        action,
        actor?.id || null,
        actor?.role || "system",
        actor?.profile?.fullName || actor?.username || null,
        actor?.profile?.block || null,
        actor?.profile?.groupNumber || null,
        status,
        summary,
        js(details),
        r.last_tick,
      ],
    );
  }
  note(r: Room, text: string, kind: "system" | "warning" = "system") {
    const s = structuredClone(r.state);
    s.events.unshift({
      id: s.id + "-" + ++s.eventSeq,
      at: s.elapsed,
      text,
      kind,
    });
    s.events = s.events.slice(0, 200);
    s.revision++;
    s.broadcast = text;
    r.state = s;
  }
  async events(c: SqlClient, r: Room, before: State, actor?: Identity) {
    if (before.overrideKeys !== r.state.overrideKeys)
      await this.activity(
        c,
        r,
        "resource:" + r.state.revision,
        "resource",
        "KEY_CHANGE",
        "Shared override key balance changed",
        actor,
        "recorded",
        { before: before.overrideKeys, after: r.state.overrideKeys },
      );
    for (const role of ["A", "B"] as const) {
      const p = r.state.players[role],
        prior = before.players[role];
      if (
        p.room !== prior.room ||
        Math.floor(p.movementSeconds / 5) >
          Math.floor(prior.movementSeconds / 5)
      ) {
        const identity =
          actor?.role === role
            ? actor
            : (await this.players(c, r.id))
                .filter((v) => v.role === role)
                .map((v) => ({
                  id: v.id,
                  role,
                  sessionId: r.id,
                  profile: v.profile,
                }))[0];
        await this.activity(
          c,
          r,
          "movement:" + role + ":" + r.state.revision,
          "movement",
          p.room !== prior.room ? "ROOM_ENTERED" : "MOVEMENT_SUMMARY",
          p.room !== prior.room
            ? "Entered " + p.room
            : "Cumulative movement " +
                p.movementSeconds.toFixed(1) +
                " seconds",
          identity,
          "recorded",
          {
            from: prior.room,
            to: p.room,
            cumulativeMovementSeconds: p.movementSeconds,
          },
        );
      }
    }
    for (const e of [...r.state.events].reverse()) {
      if (before.events.some((v) => v.id === e.id)) continue;
      await this.activity(
        c,
        r,
        "event:" + e.id,
        e.kind,
        "GAME_EVENT",
        e.text,
        actor,
        "recorded",
        e.data || {},
      );
    }
    if (before.phase !== r.state.phase)
      await this.activity(
        c,
        r,
        "phase:" + r.state.revision + ":" + r.state.phase,
        "session",
        "SESSION_" + r.state.phase.toUpperCase(),
        "Session " + before.phase + " -> " + r.state.phase,
        actor,
        "recorded",
        { from: before.phase, to: r.state.phase },
      );
  }
  advance(r: Room, players: Player[], now: number) {
    let end = Math.max(r.last_tick, now),
      cutoff = end;
    const active =
      ["playing", "countdown"].includes(r.state.phase) && !r.state.paused;
    if (active && !r.override_disconnect) {
      for (const role of ["A", "B"] as const) {
        const p = players.find((v) => v.role === role);
        cutoff = Math.min(
          cutoff,
          (p?.lease_until || r.last_tick) + this.graceMs,
        );
      }
    }
    let remaining = active
      ? Math.max(0, Math.min(end, cutoff) - r.last_tick) / 1000
      : 0;
    while (
      remaining > 0.00001 &&
      ["playing", "countdown"].includes(r.state.phase) &&
      !r.state.paused
    ) {
      const moving = Object.values(r.state.players).some(
          (p) =>
            p.inputUntil > r.state.worldTime &&
            Math.hypot(p.input.x, p.input.y) > 0,
        ),
        step = Math.min(remaining, moving ? 0.05 : 0.25);
      r.state = reduce(r.state, { type: "FRAME", value: step });
      remaining -= step;
    }
    if (
      active &&
      end > cutoff &&
      ["playing", "countdown"].includes(r.state.phase) &&
      !r.state.paused
    ) {
      r.state = reduce(r.state, { type: "PAUSE", role: "control" });
      r.pause_reason =
        "Partner disconnected: protected pause after shared connection lease/grace expired.";
      this.note(r, r.pause_reason, "warning");
    }
    r.last_tick = end;
    if (
      r.proposal?.status === "pending" &&
      (r.proposal.expiresAt < now ||
        r.state.request?.status === "expired" ||
        !r.state.emergencies.some(
          (e) => e.id === r.state.request?.eventId && e.status === "active",
        ))
    ) {
      r.proposal.status = "expired";
      if (r.state.request?.status === "pending")
        r.state.request.status = "expired";
    }
  }
  async save(c: SqlClient, r: Room) {
    r.version++;
    await c.query(
      "WITH refreshed AS (UPDATE gs_players SET last_seq=GREATEST(last_seq,$11::bigint),lease_until=$12::bigint,last_seen=$13::bigint WHERE id=$10::text RETURNING id) UPDATE gs_rooms SET state=$2::jsonb,version=$3,closed=$4,last_tick=$5,updated_at=$5,pause_reason=$6,proposal=$7::jsonb,rematch_code=$8,override_disconnect=$9 WHERE id=$1",
      [
        r.id,
        js(r.state),
        r.version,
        r.closed,
        r.last_tick,
        r.pause_reason,
        js(r.proposal),
        r.rematch_code,
        r.override_disconnect,
        r.pendingPlayer?.id || null,
        r.pendingPlayer?.lastSeq || 0,
        r.pendingPlayer?.leaseUntil || 0,
        r.pendingPlayer?.lastSeen || 0,
      ],
    );
  }
  async room<T>(
    id: string,
    auth: Auth,
    work: (
      c: SqlClient,
      r: Room,
      actor: Identity,
      players: Player[],
    ) => Promise<T>,
    allowClosed = false,
  ): Promise<T> {
    await this.ready;
    return this.db.transaction(async (c) => {
      const r = numbers(
        (await c.query("SELECT * FROM gs_rooms WHERE id=$1 FOR UPDATE", [id]))
          .rows[0],
      ) as Room;
      check(r, 404, "Session not found.");
      const access = (
        await c.query(
          "SELECT (extract(epoch from clock_timestamp())*1000)::bigint AS now, coalesce((SELECT jsonb_agg(p ORDER BY role) FROM gs_players p WHERE session_id=$1 AND NOT released),'[]'::jsonb) AS players, (SELECT jsonb_build_object('id',o.id,'username',o.username) FROM gs_operator_sessions os JOIN gs_operators o ON o.id=os.operator_id WHERE os.token_hash=$2 AND os.expires_at>(extract(epoch from clock_timestamp())*1000)::bigint) AS operator",
          [id, auth.cookie ? hashToken(auth.cookie) : ""],
        )
      ).rows[0];
      const players = (access.players as Player[]).map(numbers),
        now = Number(access.now);
      let actor: Identity;
      if (auth.bearer) {
        const player = players.find(
          (p) => p.token_hash === hashToken(auth.bearer!),
        );
        check(player, 401, "Player slot credential is invalid or released.");
        if (auth.connectionId)
          check(
            player.connection_id === auth.connectionId,
            409,
            "This slot is now controlled by another tab.",
          );
        actor = {
          id: player.id,
          role: player.role,
          profile: player.profile,
          sessionId: id,
          connectionId: auth.connectionId,
        };
      } else {
        const op = access.operator;
        check(op, 401, "Operator login required.");
        check(
          r.owner === op.id || r.owner === null,
          403,
          "This operator does not own that session.",
        );
        actor = {
          id: op.id,
          username: op.username,
          role: "control",
          sessionId: id,
          connectionId: auth.connectionId,
        };
      }
      if (!allowClosed) {
        check(
          !r.closed && r.expires_at > now,
          410,
          "Session closed or expired.",
        );
        check(
          r.state.scenarioVersion === RULES.scenario.version,
          409,
          "Archived scenario: create a new shift.",
        );
      }
      const before = r.state;
      if (
        !r.closed &&
        r.expires_at > now &&
        r.state.scenarioVersion === RULES.scenario.version
      )
        this.advance(r, players, now);
      else {
        r.closed = true;
        r.last_tick = now;
      }
      await this.events(c, r, before);
      const result = await work(c, r, actor, players);
      await this.save(c, r);
      return result;
    });
  }
  async create(
    owner: string | null,
    config = { ...defaultConfig, seed: randomInt(1, 1000000) },
    parentId: string | null = null,
  ) {
    await this.ready;
    check(validConfig(config), 400, "Invalid scenario configuration.");
    return this.db.transaction((c) =>
      this.createIn(c, owner, config, parentId),
    );
  }
  async createIn(
    c: SqlClient,
    owner: string | null,
    config = defaultConfig,
    parentId: string | null = null,
  ) {
    const now = await dbTime(c),
      state = initial({
        ...config,
        seed: config.seed ?? randomInt(1, 1000000),
      });
    state.id = "GS-" + randomUUID();
    state.code = "GS-" + randomBytes(5).toString("hex").toUpperCase();
    const r: Room = {
      id: state.id,
      code: state.code,
      owner,
      state,
      version: 0,
      closed: false,
      expires_at: now + 12 * 3600000,
      created_at: now,
      updated_at: now,
      last_tick: now,
      pause_reason: null,
      proposal: null,
      rematch_code: null,
      parent_id: parentId,
      override_disconnect: false,
    };
    await c.query(
      "INSERT INTO gs_rooms(id,code,owner,state,expires_at,created_at,updated_at,last_tick,parent_id) VALUES($1,$2,$3,$4::jsonb,$5,$6,$6,$6,$7)",
      [r.id, r.code, owner, js(state), r.expires_at, now, parentId],
    );
    await this.activity(
      c,
      r,
      "created",
      "session",
      "SESSION_CREATED",
      "Session created",
      owner ? { id: owner, role: "control", sessionId: r.id } : undefined,
    );
    return { sessionId: r.id, code: r.code, state };
  }
  async join(
    code: string,
    role: "A" | "B",
    profile: PlayerProfile | null,
    resume?: string,
  ) {
    await this.ready;
    return this.db.transaction(async (c) => {
      const r = numbers(
        (
          await c.query("SELECT * FROM gs_rooms WHERE code=$1 FOR UPDATE", [
            code.toUpperCase(),
          ])
        ).rows[0],
      ) as Room;
      check(
        r && !r.closed && r.expires_at > (await dbTime(c)),
        404,
        "Join code not found or session closed.",
      );
      check(
        r.state.scenarioVersion === RULES.scenario.version,
        409,
        "Archived scenario.",
      );
      const old = numbers(
        (
          await c.query(
            "SELECT * FROM gs_players WHERE session_id=$1 AND role=$2 AND NOT released",
            [r.id, role],
          )
        ).rows[0],
      ) as Player;
      let id = old?.id,
        credential = resume || token();
      if (old) {
        check(
          resume && hashToken(resume) === old.token_hash,
          409,
          "Slot already owned. Rejoin with the original browser credential.",
        );
      } else {
        check(profile, 400, PROFILE_ERROR);
        check(
          r.state.phase === "lobby",
          409,
          "New slots can only be claimed in the lobby.",
        );
        id = randomUUID();
        await c.query(
          "INSERT INTO gs_players(id,session_id,role,token_hash,profile,joined_at,last_seen) VALUES($1,$2,$3,$4,$5::jsonb,$6,$6)",
          [id, r.id, role, hashToken(credential), js(profile), r.last_tick],
        );
        const before = r.state;
        r.state = reduce(r.state, {
          type: "JOIN",
          role,
          value: { code: r.code },
        });
        await this.events(c, r, before, {
          id,
          role,
          profile: profile!,
          sessionId: r.id,
        });
      }
      await this.activity(
        c,
        r,
        randomUUID(),
        "registration",
        old ? "PLAYER_REJOINED" : "PLAYER_REGISTERED",
        old
          ? "Player rejoined owned slot"
          : "Player registered and joined slot",
        { id, role, profile: old?.profile || profile!, sessionId: r.id },
      );
      await this.save(c, r);
      return {
        sessionId: r.id,
        code: r.code,
        role,
        participantId: id,
        credential,
        nextSeq: (old?.last_seq || 0) + 1,
        protocol: PROTOCOL_VERSION,
      };
    });
  }
  async attach(id: string, auth: Auth, connectionId: string) {
    return this.room(
      id,
      { ...auth, connectionId: undefined },
      async (c, r, actor) => {
        if (actor.role !== "control")
          await c.query(
            "UPDATE gs_players SET connection_id=$2,lease_until=$3,last_seen=$4 WHERE id=$1",
            [actor.id, connectionId, r.last_tick + this.leaseMs, r.last_tick],
          );
        await this.activity(
          c,
          r,
          randomUUID(),
          "connection",
          "CONNECTED",
          "Authenticated connection opened",
          actor,
        );
        return this.project(r, actor, await this.players(c, id));
      },
    );
  }
  async detach(id: string, auth: Auth) {
    try {
      await this.room(
        id,
        auth,
        async (c, r, actor) => {
          if (actor.role !== "control") {
            await c.query(
              "UPDATE gs_players SET connection_id=NULL,lease_until=$2,last_seen=$2 WHERE id=$1 AND connection_id=$3",
              [actor.id, r.last_tick, auth.connectionId],
            );
            r.state = structuredClone(r.state);
            r.state.players[actor.role].input = { x: 0, y: 0 };
            r.state.players[actor.role].inputUntil = 0;
            r.override_disconnect = false;
          }
          await this.activity(
            c,
            r,
            randomUUID(),
            "connection",
            "DISCONNECTED",
            "Connection closed",
            actor,
          );
        },
        true,
      );
    } catch {
      /* Expired or superseded sockets cannot alter another owner. */
    }
  }
  project(r: Room, actor: Identity, players: Player[]) {
    const state = structuredClone(r.state);
    for (const t of state.threats) delete t.battleState;
    if (actor.role !== "control") {
      const other = actor.role === "A" ? "B" : "A",
        partner = state.players[other];
      if (!partner.shared) {
        partner.discovered = false;
        partner.scouted = false;
      }
      state.events = state.events.filter(
        (e) =>
          !(
            e.kind === other &&
            /discovered a private|scouted a safe/.test(e.text) &&
            !partner.shared
          ),
      );
      if (
        distance(state.players[actor.role].position, partner.position) > 360
      ) {
        partner.position = { x: -10000, y: -10000 };
        partner.follower = { x: -10000, y: -10000 };
        partner.trail = [];
      }
      state.unknownBlocking = false;
    }
    const presence = Object.fromEntries(
      (["A", "B"] as const).map((role) => {
        const p = players.find((v) => v.role === role);
        return [
          role,
          {
            connected: !!p?.connection_id && p.lease_until > r.last_tick,
            alias: p?.profile.fullName || "Trainer " + role,
            lastSeen: p?.last_seen || null,
            ...(actor.role === "control" && p ? { profile: p.profile } : {}),
          },
        ];
      }),
    );
    return {
      type: "snapshot",
      protocol: PROTOCOL_VERSION,
      serverTime: r.last_tick,
      state,
      net: {
        lastCommandSeq: players.find((p) => p.id === actor.id)?.last_seq || 0,
        mode: "server",
        protocol: PROTOCOL_VERSION,
        mapSignature: MAP_SIGNATURE,
        role: actor.role,
        sessionId: r.id,
        connected: true,
        authenticated: true,
        presence,
        proposal: r.proposal,
        error: "",
        pausedReason: r.pause_reason,
        closed: r.closed,
        rematchCode: r.rematch_code,
        disconnectGraceMs: this.graceMs,
        simulationHz: 20,
      },
    };
  }
  async snapshot(id: string, auth: Auth, heartbeat = false) {
    return this.room(
      id,
      auth,
      async (c, r, actor, players) => {
        if (heartbeat && actor.role !== "control") {
          const p = players.find((v) => v.id === actor.id)!;
          p.lease_until = r.last_tick + this.leaseMs;
          p.last_seen = r.last_tick;
          r.pendingPlayer = {
            id: p.id,
            lastSeq: p.last_seq,
            leaseUntil: p.lease_until,
            lastSeen: p.last_seen,
          };
        }
        return this.project(r, actor, players);
      },
      true,
    );
  }
  /** Latest input + orientation + heartbeat + snapshot share one locked transaction. */
  async motionFrame(id: string, auth: Auth, commands: Command[]) {
    const validated = commands
      .map((command) => {
        const v = validateCommand(command);
        check(v.ok, 400, v.ok ? "" : v.message);
        check(
          ["INPUT", "LOOK"].includes(command.type),
          403,
          "Only movement packets may use this path.",
        );
        return v.command;
      })
      .sort((a, b) => a.seq - b.seq);
    return this.room(id, auth, async (_c, r, actor, players) => {
      check(
        actor.role !== "control",
        403,
        "Player movement requires a player slot.",
      );
      const player = players.find((p) => p.id === actor.id)!;
      const acknowledgements: Ack[] = [];
      for (const command of validated) {
        if (command.seq <= player.last_seq) {
          acknowledgements.push({
            type: "ack",
            id: command.id,
            ok: false,
            message: "Movement superseded by a newer sequence.",
          });
          continue;
        }
        const next = reduce(r.state, {
          type: command.type,
          role: actor.role,
          value: command.value,
        });
        player.last_seq = command.seq;
        r.state = next;
        acknowledgements.push({
          type: "ack",
          id: command.id,
          ok: true,
          message: "Movement received.",
          stateVersion: r.state.revision,
        });
      }
      player.lease_until = r.last_tick + this.leaseMs;
      player.last_seen = r.last_tick;
      r.pendingPlayer = {
        id: player.id,
        lastSeq: player.last_seq,
        leaseUntil: player.lease_until,
        lastSeen: player.last_seen,
      };
      return { snapshot: this.project(r, actor, players), acknowledgements };
    });
  }
  async context(r: Room, actor: Identity, players: Player[]) {
    return {
      sessionId: r.id,
      stateVersion: r.state.revision,
      elapsed: r.state.elapsed,
      materialVersion: fingerprint(r.state, actor.role, {
        type: "ACCEPT",
        value: null,
      }),
      fieldKey: fieldMaterialKey(
        this.project(r, actor, players).state,
        actor.role === "B" ? "B" : "A",
      ),
    };
  }
  async preview(id: string, auth: Auth, raw: any) {
    return this.room(id, auth, async (c, r, actor, players) => {
      const v = validateCommand({
        id: randomUUID(),
        seq: 1,
        type: raw.type,
        value: raw.value,
      });
      check(v.ok, 400, v.ok ? "" : v.message);
      let action: Action = {
        type: raw.type,
        value: raw.value,
        role: actor.role,
      };
      check(
        (actor.role === "control") === (action.type === "INJECT"),
        403,
        "Use the correct player/operator controls.",
      );
      check(
        needsPreview(action.type, action.value),
        400,
        "This action has no preview.",
      );
      if (action.type === "INJECT") {
        check(validInjection(action.value), 400, "Invalid injection.");
        if (action.value.kind === "emergency")
          action.value = { ...action.value, duration: 60, blocking: true };
        else {
          check(
            validPokemon(action.value.pokemonId),
            400,
            "Choose a verified 3D Pokemon.",
          );
          const rec = injectionRecord(action.value.pokemonId!);
          action.value = { ...action.value, name: rec.name, types: rec.types };
        }
      }
      if (action.type === "ACCEPT") {
        const job = (
          await c.query(
            "SELECT * FROM gs_jobs WHERE id=$1 AND owner=$2 AND session_id=$3 AND status='complete'",
            [action.value?.jobId, actor.id, id],
          )
        ).rows[0];
        check(job?.result?.best, 409, "Recompute your current guidance.");
        const ctx = await this.context(r, actor, players);
        check(
          job.context.materialVersion === ctx.materialVersion &&
            job.context.fieldKey === ctx.fieldKey &&
            r.state.elapsed - job.context.elapsed < 10,
          409,
          "Forecast snapshot is outdated.",
        );
        action.value = {
          jobId: job.id,
          plan: job.result.best.name,
          activationAt: Math.max(
            0,
            ...r.state.emergencies
              .filter((e) => e.status === "active")
              .map((e) => e.createdAt),
          ),
          replanningLatency: Math.max(0, r.state.elapsed - job.context.elapsed),
        };
      }
      const inline = {
        submit: (
          _owner: string,
          _kind: string,
          state: State,
          options: any,
        ) => ({
          result: quickPlans(
            state,
            options.n,
            options.seed ?? state.config.seed,
          ),
        }),
        wait: async (job: any) => job.result,
      } as unknown as Jobs;
      const result = await makePreview(
        r.state,
        actor.role,
        action,
        inline,
        actor.id,
      );
      result.knownEffects = result.knownEffects.map((v) =>
        v
          .replace(
            "Guard or Support before each counter; Scout concealed signatures.",
            "Choose legal Showdown moves and switch to a healthy reserve when needed.",
          )
          .replace("battle or containment", "winning the battle"),
      );
      await c.query(
        "INSERT INTO gs_previews VALUES($1,$2,$3,$4::jsonb,$5,$6)",
        [result.id, id, actor.id, js(result), "pending", r.last_tick],
      );
      return { preview: result };
    });
  }
  async record(id: number): Promise<PokemonRecord> {
    check(validPokemon(id), 404, "Choose a verified animated 3D Pokemon.");
    const cached = (
      await this.db.query("SELECT data,cached_at FROM gs_records WHERE id=$1", [
        id,
      ])
    ).rows[0];
    if (cached && Date.now() - Number(cached.cached_at) < 7 * 86400000)
      return cached.data;
    const fallback = cached?.data || publicRecord(id);
    if (fallback.source === "pokeapi" && !cached) {
      await this.db.query(
        "INSERT INTO gs_records VALUES($1,$2::jsonb,$3) ON CONFLICT DO NOTHING",
        [id, js(fallback), Date.now()],
      );
      return fallback;
    }
    try {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon/" + id, {
        signal: AbortSignal.timeout(4500),
      });
      if (!response.ok) throw Error("Metadata unavailable");
      const value = await response.json();
      const data: PokemonRecord = {
        id: value.id,
        name: value.name,
        types: value.types.map((v: any) => v.type.name),
        stats: value.stats.map((v: any) => v.base_stat),
        isDefault: value.is_default,
        species: value.species.name,
        source: "pokeapi",
      };
      await this.db.query(
        "INSERT INTO gs_records VALUES($1,$2::jsonb,$3) ON CONFLICT(id) DO UPDATE SET data=excluded.data,cached_at=excluded.cached_at",
        [id, js(data), Date.now()],
      );
      return data;
    } catch {
      return fallback;
    }
  }
  async command(id: string, auth: Auth, raw: unknown): Promise<Ack> {
    const v = validateCommand(raw);
    check(v.ok, 400, v.ok ? "" : v.message);
    const cmd = v.command;
    return this.room(id, auth, async (c, r, actor, players) => {
      const cached = (
        await c.query(
          "SELECT result FROM gs_commands WHERE session_id=$1 AND actor_id=$2 AND id=$3",
          [id, actor.id, cmd.id],
        )
      ).rows[0];
      if (cached) return cached.result;
      const backup = structuredClone(r);
      let ack: Ack;
      await c.query("SAVEPOINT command_work");
      try {
        if (actor.role !== "control")
          check(
            cmd.seq > (players.find((p) => p.id === actor.id)?.last_seq || 0),
            409,
            "Command sequence is old. Reconnect to resynchronize.",
          );
        let action: Action = {
            type: cmd.type,
            value: cmd.value,
            role: actor.role,
          },
          next = r.state,
          executed: DecisionPreview | undefined;
        if (cmd.type === "CONFIRM_PREVIEW") {
          const row = (
            await c.query(
              "SELECT * FROM gs_previews WHERE id=$1 AND session_id=$2 AND actor_id=$3",
              [cmd.previewId || "", id, actor.id],
            )
          ).rows[0];
          check(
            row && row.status === "pending",
            409,
            "Preview missing, used or cancelled. Request a fresh preview.",
          );
          executed = row.data;
          check(
            executed && executed.expiresAt > r.last_tick,
            409,
            "Preview expired. Refresh it.",
          );
          check(
            fingerprint(r.state, actor.role, executed.action) ===
              executed.materialVersion,
            409,
            "Material conditions changed. Refresh the preview.",
          );
          const valid = feasibility(r.state, actor.role, executed.action);
          check(valid.ok, 409, valid.reason);
          action = { ...executed.action, role: actor.role };
          next = reduce(r.state, action);
          if (
            action.type === "ENCOUNTER" &&
            actor.role !== "control" &&
            next !== r.state
          ) {
            const t = next.threats.find((t) => t.instanceId === action.value)!;
            startEncounter(next, t, actor.role);
          }
        } else if (cmd.type === "BATTLE_MOVE" || cmd.type === "BATTLE_SWITCH") {
          check(
            actor.role !== "control",
            403,
            "Player battle controls required.",
          );
          const result = battleChoice(
            r.state,
            actor.role,
            cmd.value,
            cmd.type === "BATTLE_SWITCH",
          );
          next = commitShowdown(
            r.state,
            actor.role,
            (cmd.value as any).id,
            result.view,
            result.state,
          );
        } else if (actor.role === "control") {
          check(
            operatorActions.has(cmd.type) ||
              ["PROPOSAL_CANCEL", "RELEASE_SLOT"].includes(cmd.type),
            403,
            "Operator accounts cannot issue player commands.",
          );
          if (cmd.type === "RELEASE_SLOT") {
            check(cmd.value === "A" || cmd.value === "B", 400, "Unknown slot.");
            await c.query(
              "UPDATE gs_players SET released=true,connection_id=NULL,lease_until=0 WHERE session_id=$1 AND role=$2 AND NOT released",
              [id, cmd.value],
            );
            next = structuredClone(r.state);
            const p = next.players[cmd.value];
            p.ready = false;
            p.briefingVersion = undefined;
            p.input = { x: 0, y: 0 };
            p.inputUntil = 0;
            if (["playing", "countdown"].includes(next.phase)) {
              next.paused = true;
              r.pause_reason = "Operator released a player slot";
            }
            next.revision++;
          } else if (cmd.type === "PROPOSAL_CANCEL") {
            check(
              r.proposal?.status === "pending",
              409,
              "No pending proposal.",
            );
            r.proposal.status = "cancelled";
            next = structuredClone(r.state);
            if (next.request) next.request.status = "cancelled";
            next.revision++;
          } else {
            if (cmd.type === "START")
              check(
                ["A", "B"].every((role) =>
                  players.some(
                    (p) =>
                      p.role === role &&
                      p.connection_id &&
                      p.lease_until > r.last_tick,
                  ),
                ),
                409,
                "Both player terminals must be connected.",
              );
            next = reduce(r.state, action);
            if (cmd.type === "PAUSE") {
              r.override_disconnect = true;
              r.pause_reason = next.paused ? "Operator pause" : null;
            }
          }
        } else if (
          ["PROPOSAL_APPROVE", "PROPOSAL_REJECT", "PROPOSAL_CANCEL"].includes(
            cmd.type,
          )
        ) {
          const p = r.proposal;
          check(
            p &&
              p.id === cmd.proposalId &&
              p.status === "pending" &&
              p.expiresAt > r.last_tick,
            409,
            "Proposal is no longer pending.",
          );
          if (cmd.type === "PROPOSAL_CANCEL") {
            check(actor.role === p.by, 403, "Only the proposer can cancel.");
            next = structuredClone(r.state);
            if (next.request) next.request.status = "cancelled";
            next.revision++;
            p.status = "cancelled";
          } else {
            check(
              actor.role !== p.by,
              403,
              "Your partner must approve or reject.",
            );
            next = reduce(r.state, {
              type: cmd.type === "PROPOSAL_APPROVE" ? "APPROVE" : "REJECT",
              role: actor.role,
            });
            p.status =
              cmd.type === "PROPOSAL_APPROVE" ? "approved" : "rejected";
          }
        } else {
          check(
            playerActions.has(cmd.type),
            403,
            "Consequential actions require an authoritative preview.",
          );
          if (cmd.type === "TEAM") {
            check(
              Array.isArray(cmd.value) && cmd.value.every(validPokemon),
              400,
              "Choose verified animated 3D Pokemon.",
            );
            const cached = (
              await c.query(
                "SELECT id,data FROM gs_records WHERE id=ANY($1::integer[])",
                [cmd.value],
              )
            ).rows;
            action.value = (cmd.value as number[]).map(
              (id) => cached.find((v) => v.id === id)?.data || publicRecord(id),
            );
          }
          if (["COMPANION", "BATTLE"].includes(cmd.type))
            check(
              !r.state.threats.find(
                (t) =>
                  t.instanceId ===
                  r.state.players[actor.role as "A" | "B"].encounterId,
              )?.battle,
              409,
              "Use current Pokemon move controls.",
            );
          next = reduce(r.state, action);
        }
        check(
          next !== r.state,
          409,
          "Action rejected. Recheck distance, readiness, selected Pokemon or mission phase.",
        );
        const before = r.state;
        r.state = next;
        if (executed) {
          await c.query(
            "UPDATE gs_previews SET status='executed' WHERE id=$1",
            [executed.id],
          );
          if (executed.action.type === "REQUEST")
            r.proposal = {
              id: randomUUID(),
              preview: executed,
              by: actor.role as "A" | "B",
              status: "pending",
              expiresAt: r.last_tick + RULES.approvalSeconds * 1000,
            };
        }
        await this.events(c, r, before, actor);
        ack = {
          type: "ack",
          id: cmd.id,
          ok: true,
          message: "Command committed after authoritative revalidation.",
          stateVersion: r.state.revision,
        };
        if (actor.role !== "control")
          await c.query(
            "UPDATE gs_players SET last_seq=$2,last_seen=$3 WHERE id=$1",
            [actor.id, cmd.seq, r.last_tick],
          );
        if (!["INPUT", "LOOK"].includes(cmd.type))
          await this.activity(
            c,
            r,
            "command:" + actor.id + ":" + cmd.id,
            "command",
            action.type,
            action.type + " accepted",
            actor,
            "accepted",
            {
              commandType: cmd.type,
              value: cmd.value ?? null,
              previewId: executed?.id,
              action: executed?.action,
            },
          );
        await c.query("RELEASE SAVEPOINT command_work");
      } catch (error) {
        await c.query("ROLLBACK TO SAVEPOINT command_work");
        Object.assign(r, backup);
        ack = {
          type: "ack",
          id: cmd.id,
          ok: false,
          message:
            error instanceof CloudError || error instanceof Error
              ? error.message
              : "Command failed.",
          stateVersion: r.state.revision,
        };
        if (!["INPUT", "LOOK"].includes(cmd.type))
          await this.activity(
            c,
            r,
            "command:" + actor.id + ":" + cmd.id,
            "command",
            cmd.type,
            cmd.type + " rejected: " + ack.message,
            actor,
            "rejected",
          );
      }
      if (!["INPUT", "LOOK"].includes(cmd.type))
        await c.query(
          "INSERT INTO gs_commands VALUES($1,$2,$3,$4,$5,$6::jsonb,$7) ON CONFLICT DO NOTHING",
          [id, actor.id, cmd.id, cmd.seq, cmd.type, js(ack), r.last_tick],
        );
      return ack;
    });
  }
  async analyze(id: string, auth: Auth, kind = "field", options: any = {}) {
    check(
      ["field", "plans", "forecast", "whatif"].includes(kind),
      400,
      "Unknown analytical job.",
    );
    return this.room(id, auth, async (c, r, actor, players) => {
      check(
        r.state.phase === "playing",
        409,
        "Analysis requires an active shift.",
      );
      let state = knowledgeState(r.state, actor.role);
      if (kind === "whatif") {
        check(
          actor.role === "control",
          403,
          "What-if is an operator workspace.",
        );
        const config = { ...state.config, ...options.changes };
        check(validConfig(config), 400, "Invalid what-if assumptions.");
        state = { ...state, config };
      }
      const result =
          kind === "forecast"
            ? quickForecast(state, 8, state.config.seed)
            : quickPlans(state, 8, state.config.seed),
        context = await this.context(r, actor, players),
        jobId = randomUUID();
      await c.query(
        "INSERT INTO gs_jobs VALUES($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8)",
        [
          jobId,
          id,
          actor.id,
          kind,
          js(result),
          "complete",
          js(context),
          r.last_tick,
        ],
      );
      const plan = "best" in result ? result.best : null;
      await c.query(
        "INSERT INTO gs_forecasts VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)",
        [
          jobId,
          id,
          actor.role,
          js({
            role: actor.role,
            fieldKey: context.fieldKey,
            plan: plan?.name,
            nextSteps: plan?.nextSteps,
          }),
          js(plan?.forecast || result),
          r.state.elapsed,
          QUICK_MODEL,
          r.last_tick,
        ],
      );
      return kind === "field"
        ? { ...result, jobId, context }
        : { jobId, status: "complete" };
    });
  }
  async job(id: string, auth: Auth, cancel = false) {
    const row = (await this.db.query("SELECT * FROM gs_jobs WHERE id=$1", [id]))
      .rows[0];
    check(row, 404, "Job not found.");
    let owner: string;
    if (auth.bearer) {
      const p = (
        await this.db.query(
          "SELECT id FROM gs_players WHERE token_hash=$1 AND NOT released",
          [hashToken(auth.bearer)],
        )
      ).rows[0];
      check(p, 401, "Player credential revoked.");
      owner = p.id;
    } else owner = (await this.operator(auth)).id;
    check(owner === row.owner, 403, "Job belongs to another identity.");
    if (cancel && row.status !== "complete") {
      row.status = "cancelled";
      await this.db.query("UPDATE gs_jobs SET status='cancelled' WHERE id=$1", [
        id,
      ]);
    }
    return {
      id,
      status: row.status,
      progress: row.status === "complete" ? 100 : 0,
      result: row.result,
      context: row.context,
    };
  }
  async history(owner: string, c: SqlClient = this.db) {
    const rows = (
      await c.query(
        "SELECT * FROM gs_rooms WHERE owner=$1 OR owner IS NULL ORDER BY created_at DESC LIMIT 500",
        [owner],
      )
    ).rows;
    return rows.map((row) => {
      numbers(row);
      return {
        id: row.id,
        code: row.code,
        phase: row.state.phase,
        source: "human",
        scenario_version: row.state.scenarioVersion,
        created_at: row.created_at,
        updated_at: row.updated_at,
        closed: row.closed ? 1 : 0,
        state: row.state as State,
        metrics:
          row.state.schema === 3 &&
          ["success", "failed"].includes(row.state.phase)
            ? metrics(row.state)
            : null,
        players: [],
      };
    });
  }
  async activityPage(owner: string, params: URLSearchParams) {
    const values: any[] = [owner],
      where = ["(r.owner=$1 OR r.owner IS NULL)"];
    for (const [key, column] of [
      ["sessionId", "l.session_id"],
      ["category", "l.category"],
      ["role", "l.actor_role"],
    ] as const) {
      const value = params.get(key);
      if (value) {
        values.push(value);
        where.push(column + "=$" + values.length);
      }
    }
    const q = (params.get("q") || "").trim().slice(0, 120);
    if (q) {
      values.push("%" + q + "%");
      where.push(
        "concat_ws(' ',l.full_name,l.block,l.group_number,l.summary,l.action,r.code) ILIKE $" +
          values.length,
      );
    }
    const from =
        " FROM gs_activity l JOIN gs_rooms r ON r.id=l.session_id WHERE ",
      total = Number(
        (
          await this.db.query(
            "SELECT count(*) AS n" + from + where.join(" AND "),
            values,
          )
        ).rows[0].n,
      );
    const before = Number(params.get("before"));
    if (Number.isSafeInteger(before) && before > 0) {
      values.push(before);
      where.push("l.id<$" + values.length);
    }
    const limit = Math.floor(
      Math.min(1000, Math.max(1, Number(params.get("limit")) || 100)),
    );
    values.push(limit + 1);
    const rows = (
        await this.db.query(
          "SELECT l.*,r.code AS session_code" +
            from +
            where.join(" AND ") +
            " ORDER BY l.id DESC LIMIT $" +
            values.length,
          values,
        )
      ).rows.map((row) => ({
        ...row,
        id: Number(row.id),
        created_at: Number(row.created_at),
      })),
      more = rows.length > limit;
    rows.splice(limit);
    let profiles: any[] = [];
    const session = params.get("sessionId");
    if (
      session &&
      (
        await this.db.query(
          "SELECT id FROM gs_rooms WHERE id=$1 AND (owner=$2 OR owner IS NULL)",
          [session, owner],
        )
      ).rows.length
    )
      profiles = (
        await this.db.query(
          'SELECT id AS "participantId",role,profile FROM gs_players WHERE session_id=$1',
          [session],
        )
      ).rows.map((v) => ({
        participantId: v.participantId,
        role: v.role,
        ...v.profile,
      }));
    return { rows, total, nextCursor: more ? rows.at(-1)?.id : null, profiles };
  }
  async report(id: string, auth: Auth, kind: string) {
    return this.room(
      id,
      auth,
      async (c, r, actor, players) => {
        check(
          actor.role === "control",
          403,
          "Operator authorization required.",
        );
        const history = await this.history(actor.id, c),
          cohort = history.filter(
            (v) => v.scenario_version === RULES.scenario.version,
          ),
          forecasts = (
            await c.query(
              "SELECT * FROM gs_forecasts WHERE session_id=$1 ORDER BY created_at DESC",
              [id],
            )
          ).rows;
        if (kind === "field-analysis")
          return {
            guidance: (["A", "B"] as const).map((role) => {
              const state = this.project(r, { ...actor, role }, players).state,
                row = forecasts.find((f) => f.role === role);
              return {
                role,
                facts: fieldFacts(state, role),
                forecast: row?.result,
                plan: row?.features.plan,
                nextSteps: row?.features.nextSteps,
                stale: row?.features.fieldKey !== fieldMaterialKey(state, role),
                elapsed: row?.elapsed,
              };
            }),
            method: QUICK_MODEL,
            assumptions:
              "Current known state; no future operator injections assumed. Generated timing samples are not visitor calibration.",
            decisions: [],
            options: r.state.events
              .filter((e) => ["task-option", "consequence"].includes(e.kind))
              .slice(0, 15),
          };
        const activity = (
            await c.query(
              "SELECT * FROM gs_activity WHERE session_id=$1 ORDER BY id",
              [id],
            )
          ).rows,
          events = activity
            .filter((v) => v.action === "GAME_EVENT")
            .map((v) => ({
              id: v.entry_key,
              elapsed: v.elapsed,
              category: v.category,
              source: "human",
              text: v.summary,
              created_at: Number(v.created_at),
              ...v.details,
            })),
          commands = (
            await c.query(
              "SELECT id AS command_id,seq,kind,result AS response_json,created_at FROM gs_commands WHERE session_id=$1",
              [id],
            )
          ).rows,
          resources = activity.filter((v) => v.category === "resource"),
          recommendations = activity.filter((v) =>
            ["ACCEPT", "OVERRIDE"].includes(v.action),
          ),
          runs = cohort.map((v) => ({
            id: v.id,
            code: v.code,
            phase: v.state.phase,
            elapsed: v.state.elapsed,
            duration: v.state.config.duration,
            completed: v.state.tasks.filter((t) => t.complete).length,
            reason:
              v.state.events.find((e) => e.kind === "outcome")?.data?.cause ||
              (v.state.emergencies.some((e) => e.status === "missed")
                ? "emergency-deadline"
                : v.state.elapsed >= v.state.config.duration
                  ? "mission-deadline"
                  : "other"),
            incidents: [
              ...v.state.threats.map((t) => ({
                id: t.instanceId,
                kind: "pokemon",
                name: t.name,
                status: t.status,
                createdAt: t.createdAt,
                firstResponse: t.firstResponse,
                resolvedAt: t.resolvedAt,
              })),
              ...v.state.emergencies.map((e) => ({
                id: e.id,
                kind: e.kind,
                name: e.name,
                status: e.status,
                createdAt: e.createdAt,
                firstResponse: e.firstResponse,
                resolvedAt: e.resolvedAt,
              })),
            ],
          })),
          completed = cohort.filter((v) => v.metrics);
        if (kind === "analytics")
          return {
            runs,
            current: metrics(r.state),
            eligibleSessions: completed.length,
            jointEscapeRate: completed.length
              ? completed.filter((v) => v.state.phase === "success").length /
                completed.length
              : null,
            events,
            tasks: r.state.tasks,
            threats: r.state.threats,
            emergencies: r.state.emergencies,
            cohorts: completed.map((v) => ({ id: v.id, ...v.metrics })),
            resources,
            recommendations,
            forecasts: forecasts.map((f) => ({
              ...f,
              result: f.result,
              success: ["success", "failed"].includes(r.state.phase)
                ? +(r.state.phase === "success")
                : null,
              actual_remaining:
                r.state.phase === "success"
                  ? Math.max(0, r.state.elapsed - f.elapsed)
                  : null,
            })),
            observedPredictionMAE:
              completed.length &&
              r.state.phase === "success" &&
              forecasts.some((f) => f.result.remaining !== null)
                ? forecasts
                    .filter((f) => f.result.remaining !== null)
                    .reduce(
                      (n, f) =>
                        n +
                        Math.abs(
                          f.result.remaining -
                            Math.max(0, r.state.elapsed - f.elapsed),
                        ),
                      0,
                    ) /
                  forecasts.filter((f) => f.result.remaining !== null).length
                : null,
            observedPredictionN:
              r.state.phase === "success"
                ? forecasts.filter((f) => f.result.remaining !== null).length
                : 0,
          };
        return {
          legacyRecords: (
            await c.query(
              "SELECT table_name,data FROM gs_legacy_rows WHERE session_id=$1",
              [id],
            )
          ).rows,
          session: r.state,
          metrics: r.state.schema === 3 ? metrics(r.state) : null,
          players: players.map((p) => ({
            participantId: p.id,
            role: p.role,
            ...p.profile,
          })),
          activity: { rows: activity },
          events,
          commands,
          resources,
          recommendationDecisions: recommendations,
          forecasts,
          proposals: r.proposal ? [r.proposal] : [],
        };
      },
      true,
    );
  }
  async closeRoom(id: string, auth: Auth, config?: typeof defaultConfig) {
    return this.room(id, auth, async (c, r, actor) => {
      check(actor.role === "control", 403, "Operator authorization required.");
      let next;
      if (config) next = await this.createIn(c, actor.id, config, id);
      const before = r.state;
      if (["playing", "countdown", "lobby"].includes(before.phase)) {
        r.state =
          before.phase === "playing"
            ? reduce(before, { type: "FAIL", role: "control" })
            : { ...before, phase: "failed", revision: before.revision + 1 };
        this.note(r, "Operator closed this round.", "warning");
        await this.events(c, r, before, actor);
      }
      r.closed = true;
      r.rematch_code = next?.code || null;
      await this.activity(
        c,
        r,
        randomUUID(),
        "session",
        "SESSION_CLOSED",
        "Session closed by operator",
        actor,
      );
      return next || { ok: true };
    });
  }
}
