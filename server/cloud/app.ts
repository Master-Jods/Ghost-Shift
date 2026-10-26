import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { CloudService, type Auth } from "./service.js";
import { postgres, type Database } from "./store.js";
import { CloudError, check } from "./types.js";
import {
  PROTOCOL_VERSION,
  validateCommand,
  type Command,
} from "../../src/protocol.js";
import { MAP_SIGNATURE, MAP_VERSION } from "../../src/world.js";
import { RULES } from "../../src/rules.js";
import { defaultConfig } from "../../src/engine.js";
import { playerProfile, PROFILE_ERROR } from "../../src/playerProfile.js";
import { catalog, validPokemon, publicRecord } from "../catalog.js";
import { hashToken } from "../security.js";
import { QUICK_MODEL } from "../quickAnalysis.js";
export type CloudOptions = {
  db?: Database;
  databaseUrl?: string;
  bootstrapUser?: string;
  bootstrapPassword?: string;
  origins?: string[];
  graceMs?: number;
  staticDir?: string;
  rotationMs?: number;
};
export function createCloudApp(options: CloudOptions = {}) {
  const db =
      options.db ||
      postgres(options.databaseUrl || process.env.DATABASE_URL || ""),
    service = new CloudService(db, options),
    server = createServer(),
    wss = new WebSocketServer({ noServer: true, maxPayload: 16384 });
  const origins = new Set(
    (options.origins || String(process.env.ALLOWED_ORIGINS || "").split(","))
      .map((v) => v.trim())
      .filter(Boolean),
  );
  const secure = (req: IncomingMessage) =>
    process.env.VERCEL === "1" || req.headers["x-forwarded-proto"] === "https";
  const originOK = (req: IncomingMessage) =>
    !req.headers.origin ||
    origins.has(req.headers.origin) ||
    req.headers.origin ===
      `${secure(req) ? "https" : "http"}://${req.headers.host}`;
  const auth = (req: IncomingMessage): Auth => ({
    cookie: req.headers.cookie
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("jt_operator="))
      ?.slice(12),
    bearer: req.headers.authorization?.replace(/^Bearer /, ""),
  });
  const json = (res: ServerResponse, status: number, value: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(value));
  };
  const body = async (req: IncomingMessage) => {
    let value = "",
      size = 0;
    for await (const part of req) {
      size += part.length;
      check(size <= 16384, 413, "Payload exceeds 16 KiB.");
      value += part;
    }
    try {
      return value ? JSON.parse(value) : {};
    } catch {
      throw new CloudError(400, "Invalid JSON.");
    }
  };
  const route = (req: IncomingMessage) => {
    const url = new URL(req.url || "/", "http://localhost");
    const rewritten = url.searchParams.get("__route");
    return {
      url,
      path:
        rewritten && /^\/(api\/|ws$)/.test(rewritten)
          ? rewritten
          : url.pathname,
    };
  };
  server.on("request", async (req, res) => {
    try {
      check(originOK(req), 403, "Origin not allowed.");
      await service.ready;
      const { url, path } = route(req),
        a = auth(req);
      if (req.headers.origin && origins.has(req.headers.origin)) {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Vary", "Origin");
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        });
        res.end();
        return;
      }
      if (path.startsWith("/api/")) {
        if (!["GET", "DELETE", "HEAD"].includes(req.method || ""))
          check(
            String(req.headers["content-type"] || "").startsWith(
              "application/json",
            ),
            415,
            "Send JSON content.",
          );
        if (path === "/api/health") {
          json(res, 200, {
            ok: true,
            mode: "postgres-authoritative",
            protocol: PROTOCOL_VERSION,
            mapSignature: MAP_SIGNATURE,
            mapVersion: MAP_VERSION,
            scenarioVersion: RULES.scenario.version,
            setupRequired: !(
              await db.query("SELECT id FROM gs_operators LIMIT 1")
            ).rows.length,
          });
          return;
        }
        if (path === "/api/catalog") {
          json(res, 200, catalog);
          return;
        }
        const pokemon = path.match(/^\/api\/pokemon\/(\d+)$/);
        if (pokemon) {
          const id = Number(pokemon[1]);
          check(validPokemon(id), 404, "Choose a verified 3D Pokemon.");
          json(res, 200, { record: await service.record(id) });
          return;
        }
        if (path === "/api/operator/login" && req.method === "POST") {
          await service.limit(
            "login-" +
              (req.headers["x-forwarded-for"] || req.socket.remoteAddress),
            8,
            60000,
          );
          const b = await body(req),
            result = await service.login(b.username, b.password);
          res.setHeader(
            "Set-Cookie",
            `jt_operator=${result.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure(req) ? "; Secure" : ""}`,
          );
          json(res, 200, { operator: result.operator });
          return;
        }
        if (path === "/api/operator/me") {
          json(res, 200, { operator: await service.operator(a) });
          return;
        }
        if (path === "/api/operator/logout" && req.method === "POST") {
          if (a.cookie)
            await db.query(
              "DELETE FROM gs_operator_sessions WHERE token_hash=$1",
              [hashToken(a.cookie)],
            );
          res.setHeader(
            "Set-Cookie",
            `jt_operator=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure(req) ? "; Secure" : ""}`,
          );
          json(res, 200, { ok: true });
          return;
        }
        if (path === "/api/operator/runtime") {
          await service.operator(a);
          json(res, 200, {
            protocol: PROTOCOL_VERSION,
            mapSignature: MAP_SIGNATURE,
            scenarioVersion: RULES.scenario.version,
            disconnectGraceMs: service.graceMs,
            sessionTtlMs: 43200000,
            simulationHz: 20,
            snapshotHz: 5,
            modelVersion: QUICK_MODEL,
          });
          return;
        }
        if (path === "/api/activity") {
          json(
            res,
            200,
            await service.activityPage(
              (await service.operator(a)).id,
              url.searchParams,
            ),
          );
          return;
        }
        if (path === "/api/sessions") {
          const op = await service.operator(a);
          if (req.method === "GET") {
            json(res, 200, {
              sessions: await service.history(op.id),
              protocol: PROTOCOL_VERSION,
            });
            return;
          }
          if (req.method === "POST") {
            const b = await body(req);
            check(!b.simulated, 400, "Two real player terminals are required.");
            json(res, 201, await service.create(op.id, b.config));
            return;
          }
        }
        if (path.startsWith("/api/public/")) {
          const code = decodeURIComponent(path.slice(12)).toUpperCase(),
            r = (
              await db.query(
                "SELECT * FROM gs_rooms WHERE code=$1 AND NOT closed AND expires_at>(extract(epoch from clock_timestamp())*1000)::bigint",
                [code],
              )
            ).rows[0];
          check(
            r && r.state.scenarioVersion === RULES.scenario.version,
            404,
            "Join code not found or closed.",
          );
          const players = await service.players(db, r.id);
          r.last_tick = Date.now();
          const snapshot = service.project(
            r,
            { id: "public", role: "A", sessionId: r.id },
            players,
          );
          json(res, 200, {
            sessionId: r.id,
            code,
            phase: r.state.phase,
            slots: snapshot.net.presence,
            protocol: PROTOCOL_VERSION,
          });
          return;
        }
        if (path === "/api/join" && req.method === "POST") {
          await service.limit(
            "join-" +
              (req.headers["x-forwarded-for"] || req.socket.remoteAddress),
            15,
            60000,
          );
          const b = await body(req);
          check(
            ["A", "B"].includes(b.role) &&
              typeof b.code === "string" &&
              b.code.length < 30,
            400,
            "Choose a valid slot and code.",
          );
          const profile = playerProfile(b.profile);
          check(
            profile || typeof b.resumeToken === "string",
            400,
            PROFILE_ERROR,
          );
          if (b.profile !== undefined) check(profile, 400, PROFILE_ERROR);
          json(
            res,
            200,
            await service.join(b.code, b.role, profile, b.resumeToken),
          );
          return;
        }
        if (path === "/api/evaluation") {
          await service.operator(a);
          if (req.method === "POST") {
            throw new CloudError(
              409,
              "Offline reducer evaluation must run with npm run analytics:evaluate on a local host; live cloud timing predictions are available in the dashboard.",
            );
          }
          json(res, 200, { report: null });
          return;
        }
        const job = path.match(/^\/api\/jobs\/([\w-]+)$/);
        if (job) {
          json(res, 200, await service.job(job[1], a, req.method === "DELETE"));
          return;
        }
        const match = path.match(/^\/api\/sessions\/([\w-]+)(?:\/(.+))?$/);
        if (match) {
          const id = match[1],
            tail = match[2] || "";
          if (tail === "snapshot" && req.method === "GET") {
            json(res, 200, await service.snapshot(id, a));
            return;
          }
          if (tail === "command" && req.method === "POST") {
            await service.limit("command-" + (a.bearer || a.cookie), 12);
            json(res, 200, await service.command(id, a, await body(req)));
            return;
          }
          if (tail === "team" && req.method === "POST") {
            const b = await body(req);
            json(
              res,
              200,
              await service.command(id, a, {
                id: randomUUID(),
                seq: Number(b.seq),
                type: "TEAM",
                value: b.ids,
              }),
            );
            return;
          }
          if (tail === "preview" && req.method === "POST") {
            await service.limit("preview-" + (a.bearer || a.cookie), 3, 1500);
            json(res, 200, await service.preview(id, a, await body(req)));
            return;
          }
          if (tail === "preview/cancel" && req.method === "POST") {
            const b = await body(req);
            const result = await service.room(id, a, async (c, _r, actor) =>
              c.query(
                "UPDATE gs_previews SET status='cancelled' WHERE id=$1 AND session_id=$2 AND actor_id=$3 AND status='pending' RETURNING id",
                [String(b.previewId || ""), id, actor.id],
              ),
            );
            json(res, 200, { cancelled: !!result.rows.length });
            return;
          }
          if (
            (tail === "field-analysis" || tail === "jobs") &&
            req.method === "POST"
          ) {
            await service.limit("analysis-" + (a.bearer || a.cookie), tail === "field-analysis" ? 8 : 4, 5000);
            const b = await body(req);
            json(
              res,
              tail === "jobs" ? 202 : 200,
              await service.analyze(
                id,
                a,
                tail === "jobs" ? b.kind : "field",
                b,
              ),
            );
            return;
          }
          if (
            ["analytics", "field-analysis", "export"].includes(tail) &&
            req.method === "GET"
          ) {
            const result = await service.report(id, a, tail);
            if (tail === "export") {
              const csv = url.searchParams.get("format") === "csv";
              res.setHeader(
                "Content-Disposition",
                `attachment; filename="${id}.${csv ? "csv" : "json"}"`,
              );
              if (csv) {
                const quote = (v: unknown) =>
                  '"' + String(v ?? "").replaceAll('"', '""') + '"';
                res.writeHead(200, {
                  "Content-Type": "text/csv; charset=utf-8",
                  "Cache-Control": "no-store",
                });
                res.end(
                  "event_id,elapsed_seconds,category,source,event,server_timestamp\r\n" +
                    ((result as any).events || [])
                      .map((e: any) =>
                        [
                          e.id,
                          e.elapsed,
                          e.category,
                          e.source,
                          e.text,
                          e.created_at,
                        ]
                          .map(quote)
                          .join(","),
                      )
                      .join("\r\n"),
                );
                return;
              }
            }
            json(res, 200, result);
            return;
          }
          if (["close", "rematch"].includes(tail) && req.method === "POST") {
            const b = await body(req);
            check(!b.simulated, 400, "Two real player terminals required.");
            const cfg =
              tail === "rematch"
                ? b.config || (await service.snapshot(id, a)).state.config
                : undefined;
            json(
              res,
              tail === "rematch" ? 201 : 200,
              await service.closeRoom(id, a, cfg),
            );
            return;
          }
        }
        throw new CloudError(404, "API route not found.");
      }
      const root = resolve(options.staticDir || "dist"),
        file = resolve(root, "." + decodeURIComponent(path));
      check(
        file === root || file.startsWith(root + sep),
        403,
        "Path traversal blocked.",
      );
      let target = file;
      if (!existsSync(target) || !statSync(target).isFile()) {
        check(
          ![
            "/audio/",
            "/assets/",
            "/pokemon-sprites/",
            "/pokemon-models/",
            "/draco/",
            "/catalog/",
          ].some((v) => path.startsWith(v)),
          404,
          "Asset unavailable. Reload the application.",
        );
        target = resolve(root, "index.html");
      }
      check(existsSync(target), 503, "Build the frontend first.");
      const mime: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".ogg": "audio/ogg",
        ".mp3": "audio/mpeg",
        ".glb": "model/gltf-binary",
        ".wasm": "application/wasm",
        ".xml": "application/xml",
        ".webmanifest": "application/manifest+json",
      };
      res.writeHead(200, {
        "Content-Type": mime[extname(target)] || "application/octet-stream",
        "Cache-Control":
          extname(target) === ".html" || path === "/sw.js"
            ? "no-cache"
            : "public, max-age=3600",
      });
      res.end(readFileSync(target));
    } catch (error) {
      if (!res.headersSent)
        json(res, error instanceof CloudError ? error.status : 503, {
          error:
            error instanceof CloudError
              ? error.message
              : "Shared database temporarily unavailable. Retry shortly.",
        });
    }
  });
  server.on("upgrade", (req, socket, head) => {
    if (route(req).path !== "/ws" || !originOK(req)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  });
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    let session = "",
      a: Auth = auth(req),
      authenticated = false,
      busy = false,
      closed = false,
      queue = Promise.resolve(),
      lastPong = Date.now(),
      frames = 0,
      windowAt = Date.now();
    const connectionId = randomUUID();
    const send = (v: unknown) => {
      if (
        ws.readyState === WebSocket.OPEN &&
        ws.bufferedAmount < 2 * 1024 * 1024
      )
        ws.send(JSON.stringify(v));
    };
    const failure = (e: unknown) => {
      if (e instanceof CloudError && [401, 403, 409, 410].includes(e.status)) {
        send({
          type: e.status === 409 ? "ownership_lost" : "error",
          message: e.message,
        });
        ws.close(e.status === 409 ? 4001 : 4003, e.message.slice(0, 100));
      } else
        send({
          type: "error",
          message:
            e instanceof CloudError
              ? e.message
              : "Shared state temporarily unavailable. Reconnecting.",
        });
    };
    const motion = new Map<string, Command>();
    const takeMotion=(before=Infinity)=>{const batch=[...motion.values()].filter(c=>c.seq<before);for(const c of batch)if(motion.get(c.type)===c)motion.delete(c.type);return batch;};
    const flush=async(commands:Command[])=>{
      if(a.bearer){const frame=await service.motionFrame(session,a,commands);for(const ack of frame.acknowledgements)send(ack);send(frame.snapshot);}
      else send(await service.snapshot(session,a,true));
    };
    const authTimer = setTimeout(() => {
      if (!authenticated) ws.close(4003, "Authentication timeout");
    }, 10000);
    ws.on("message", (data) => {
      if (Date.now() - windowAt > 1000) {
        frames = 0;
        windowAt = Date.now();
      }
      if (++frames > 50) {
        ws.close(4008, "Too many input messages");
        return;
      }
      let message: any;
      try {
        message = JSON.parse(data.toString());
      } catch {
        send({ type: "error", message: "Invalid socket JSON." });
        return;
      }
      if (
        authenticated &&
        message.type === "command" &&
        ["INPUT", "LOOK"].includes(message.command?.type)
      ) {
        const v = validateCommand(message.command);
        if (!v.ok) {
          send({ type: "error", message: v.message });
          return;
        }
        if (!a.bearer) {
          send({
            type: "error",
            message: "Player movement requires a player slot.",
          });
          return;
        }
        const previous = motion.get(v.command.type);
        if (previous) {
          send({
            type: "ack",
            id: previous.id,
            ok: true,
            message: "Movement coalesced with newer input.",
          });
        }
        motion.set(v.command.type, v.command);
        return;
      }
      const priorMotion=authenticated?takeMotion(message.type==='command'?message.command?.seq:Infinity):[];
      queue = queue
        .then(async () => {
          if (closed) return;
          const m = message;
          if (!authenticated) {
            check(
              m.type === "auth" &&
                m.protocol === PROTOCOL_VERSION &&
                m.mapSignature === MAP_SIGNATURE,
              426,
              "Client/server version mismatch. Reload.",
            );
            check(["A", "B", "control"].includes(m.role), 403, "Invalid role.");
            session = String(m.sessionId);
            a = {
              cookie: a.cookie,
              ...(m.role !== "control"
                ? { bearer: String(m.credential || "") }
                : {}),
            };
            const snapshot = await service.attach(session, a, connectionId);
            check(
              snapshot.net.role === m.role,
              403,
              "Credential does not own this role.",
            );
            a.connectionId = connectionId;
            authenticated = true;
            clearTimeout(authTimer);
            send(snapshot);
            return;
          }
          if (m.type === "command") {
            if (priorMotion.length) await flush(priorMotion);
            send(await service.command(session, a, m.command));
          } else if (m.type === "resync")
            send(await service.snapshot(session, a, true));
          else throw new CloudError(400, "Unknown socket message.");
        })
        .catch(failure);
    });
    ws.on("pong", () => {
      lastPong = Date.now();
    });
    const poll = setInterval(() => {
      if (!authenticated || busy || closed) return;
      if (Date.now() - lastPong > 30000) {
        ws.terminate();
        return;
      }
      busy = true;
      const batch=takeMotion();
      queue = queue
        .then(async () => {
          if (!closed) await flush(batch);
        })
        .catch(failure)
        .finally(() => {
          busy = false;
        });
    }, 200);
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 10000);
    const rotate = setTimeout(
      () => ws.close(1012, "Function connection rotation; reconnecting"),
      options.rotationMs ?? 240000,
    );
    ws.on("close", () => {
      closed = true;
      clearTimeout(authTimer);
      clearInterval(poll);
      clearInterval(ping);
      clearTimeout(rotate);
      void queue.finally(() => {
        if (authenticated) return service.detach(session, a);
      });
    });
  });
  return {
    server,
    service,
    db,
    listen: (port = Number(process.env.PORT || 8787), host = "0.0.0.0") =>
      new Promise<number>((done) =>
        server.listen(port, host, () => done((server.address() as any).port)),
      ),
    async close() {
      for (const ws of wss.clients) ws.terminate();
      await new Promise<void>((done) => {
        server.close(() => done());
        server.closeAllConnections();
      });
      await db.close();
    },
  };
}
