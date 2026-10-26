import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { postgres } from "./cloud/store";
import { CloudService } from "./cloud/service";
import { BRIEFING_VERSION, reduce } from "../src/engine";
import { center } from "../src/world";
import { startEncounter } from "./showdownBattle";
test(
  "real PostgreSQL: separate TCP pools serialize room writes, retries and clocks",
  { skip: process.env.CLOUD_EMBEDDED_POSTGRES !== "1", timeout: 90000 },
  async () => {
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    mkdirSync(".qa", { recursive: true });
    const directory = resolve(".qa", "postgres-cloud-" + randomUUID());
    assert(
      directory.startsWith(resolve(".qa") + "\\") ||
        directory.startsWith(resolve(".qa") + "/"),
    );
    const probe = createServer();
    await new Promise<void>((done) =>
      probe.listen(0, "127.0.0.1", () => done()),
    );
    const port = (probe.address() as any).port;
    await new Promise<void>((done) => probe.close(() => done()));
    const cluster = new EmbeddedPostgres({
      databaseDir: directory,
      user: "postgres",
      password: "local-test-password",
      port,
      persistent: true,
      postgresFlags: ["-h", "127.0.0.1"],
      onLog: () => {},
      onError: () => {},
    });
    let pools: ReturnType<typeof postgres>[] = [];
    try {
      await cluster.initialise();
      await cluster.start();
      await cluster.createDatabase("cloud_test");
      const url = `postgresql://postgres:local-test-password@127.0.0.1:${port}/cloud_test`;
      pools = [postgres(url), postgres(url), postgres(url)];
      const services = pools.map((db) => new CloudService(db));
      await Promise.all(services.map((s) => s.ready));
      const [a, b, c] = services;
      await a.createOperator("tcp-test", "tcp-test-password");
      const login = await a.login("tcp-test", "tcp-test-password"),
        op = { cookie: login.token },
        room = await a.create(login.operator.id),
        id = room.sessionId,
        pa = await b.join(room.code, "A", {
          fullName: "TCP A",
          block: "4A",
          groupNumber: "4",
        }),
        pb = await c.join(room.code, "B", {
          fullName: "TCP B",
          block: "4A",
          groupNumber: "4",
        }),
        aa = { bearer: pa.credential },
        ab = { bearer: pb.credential };
      await b.attach(id, aa, "tcp-a");
      await c.attach(id, ab, "tcp-b");
      let seq = 0;
      const cmd = (type: string, value?: unknown, extra: any = {}) => ({
        id: randomUUID(),
        seq: ++seq,
        type,
        value,
        ...extra,
      });
      for (const auth of [aa, ab]) {
        assert((await b.command(id, auth, cmd("TEAM", [1, 4, 7]))).ok);
        assert(
          (await c.command(id, auth, cmd("ACK_BRIEFING", BRIEFING_VERSION))).ok,
        );
      }
      assert((await a.command(id, op, cmd("START"))).ok);
      await pools[0].query(
        "UPDATE gs_rooms SET last_tick=last_tick-5000 WHERE id=$1",
        [id],
      );
      await a.snapshot(id, op);
      const { preview } = await b.preview(id, op, {
          type: "INJECT",
          value: {
            kind: "emergency",
            eventKind: "blackout",
            target: "A",
            scope: "either",
            severity: 1,
            duration: 60,
            blocking: true,
          },
        }),
        command = cmd("CONFIRM_PREVIEW", null, { previewId: preview.id });
      const results = await Promise.all(
        Array.from({ length: 9 }, (_, i) =>
          services[i % 3].command(id, op, command),
        ),
      );
      assert(
        results.every((r) => r.ok),
        results[0].message,
      );
      assert(results.every((r) => r.stateVersion === results[0].stateVersion));
      assert.equal((await c.snapshot(id, op)).state.emergencies.length, 1);
      assert.equal(
        Number(
          (
            await pools[0].query(
              "SELECT count(*) AS n FROM gs_commands WHERE session_id=$1 AND id=$2",
              [id, command.id],
            )
          ).rows[0].n,
        ),
        1,
      );
      const motion=await b.motionFrame(id,aa,[cmd('LOOK',0),cmd('INPUT',{x:0,y:0})]);
      assert(motion.acknowledgements.every(v=>v.ok));
      assert.equal((await c.snapshot(id,aa)).net.lastCommandSeq,motion.snapshot.net.lastCommandSeq);
      let release!: () => void, locked!: () => void;
      const lockReady = new Promise<void>((r) => (locked = r)),
        gate = new Promise<void>((r) => (release = r));
      const lock = pools[0].transaction(async (tx) => {
        await tx.query("SELECT id FROM gs_rooms WHERE id=$1 FOR UPDATE", [id]);
        locked();
        await gate;
      });
      await lockReady;
      let finished = false;
      const queued = b.snapshot(id, op).then((v) => {
        finished = true;
        return v;
      });
      await new Promise((r) => setTimeout(r, 150));
      assert.equal(
        finished,
        false,
        "A different pool must wait for the room lock.",
      );
      release();
      await lock;
      await queued;
      const before = (await a.snapshot(id, op)).state.worldTime;
      await new Promise((r) => setTimeout(r, 250));
      const snaps = await Promise.all(
        Array.from({ length: 12 }, (_, i) => services[i % 3].snapshot(id, op)),
      );
      const elapsed = Math.max(...snaps.map((v) => v.state.worldTime)) - before;
      assert(
        elapsed >= 0.2 && elapsed < 1.5,
        "Concurrent readers must not multiply elapsed game time: " + elapsed,
      );
      // Stage a legal encounter in the test fixture, persist the private native
      // simulator, then make/retry an actual move through different TCP pools.
      let battleState = (await a.snapshot(id, op)).state;
      battleState.emergencies = [];
      battleState.threats = [];
      battleState.director.lastInjection = -999;
      battleState.players.A.position = center("hub");
      battleState.players.B.position = center("medical");
      battleState = reduce(battleState, {
        type: "INJECT",
        role: "control",
        value: {
          kind: "threat",
          pokemonId: 4,
          target: "A",
          severity: 1,
          duration: 120,
          scope: "either",
          blocking: false,
        },
      });
      for (let i = 0; i < 12; i++)
        battleState = reduce(battleState, { type: "FRAME", value: 0.25 });
      const threat = battleState.threats[0];
      assert(threat);
      battleState.players.A.position = {
        x: threat.position.x + 45,
        y: threat.position.y,
      };
      battleState = reduce(battleState, {
        type: "ENCOUNTER",
        role: "A",
        value: threat.instanceId,
      });
      startEncounter(battleState, battleState.threats[0], "A");
      await pools[0].query("UPDATE gs_rooms SET state=$2::jsonb WHERE id=$1", [
        id,
        JSON.stringify(battleState),
      ]);
      const battle = battleState.threats[0].battle!;
      const attack = cmd("BATTLE_MOVE", {
        id: threat.instanceId,
        turn: battle.turn,
        requestId: battle.requestId,
        move: 1,
      });
      const attacked = await b.command(id, aa, attack);
      assert(attacked.ok, attacked.message);
      assert.deepEqual(await c.command(id, aa, attack), attacked);
      const privateState = (
        await pools[2].query("SELECT state FROM gs_rooms WHERE id=$1", [id])
      ).rows[0].state;
      assert(privateState.threats[0].battleState);
      assert(privateState.threats[0].battle.requestId > battle.requestId);
      assert.equal(
        (await c.snapshot(id, aa)).state.threats[0].battleState,
        undefined,
      );
      console.log(
        "Verified PostgreSQL row locks, clock, idempotency and native battle persistence across three TCP pools.",
      );
    } finally {
      for (const db of pools) await db.close();
      const binaryPackage =
        "@embedded-postgres/" +
        (process.platform === "win32" ? "windows" : process.platform) +
        "-" +
        process.arch;
      try {
        const binaries = await import(binaryPackage);
        await promisify(execFile)(
          binaries.pg_ctl,
          ["-D", directory, "-m", "fast", "-w", "stop"],
          { windowsHide: true },
        );
        (cluster as any).process = undefined;
      } catch {
        await cluster.stop().catch(() => {});
      }
    }
  },
);
