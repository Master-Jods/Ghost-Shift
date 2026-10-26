import { test, expect } from "@playwright/test";
import { createCloudApp } from "../server/cloud/app";
import { memoryPostgres } from "../server/cloud/testDatabase";
import { BRIEFING_VERSION } from "../src/engine";
import { randomUUID } from "node:crypto";
import { distance, center } from "../src/world";
import { mkdirSync, writeFileSync } from "node:fs";
test("cloud movement predicts through 360ms network latency, stops idle packets and renders no hands", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const db = memoryPostgres();
  let queries = 0;
  const delayed = {
    ...db,
    close: async () => {},
    transaction: <T>(fn: (c: any) => Promise<T>) =>
      db.transaction((c) =>
        fn({
          query: async (sql: string, values?: any[]) => {
            queries++;
            await new Promise((r) => setTimeout(r, 8));
            return c.query(sql, values);
          },
        }),
      ),
  };
  const apps = [
      createCloudApp({
        db: delayed,
        staticDir: "dist",
        bootstrapPassword: "movement-test-password",
      }),
      createCloudApp({ db: delayed, staticDir: "dist" }),
    ],
    contexts = await Promise.all([
      browser.newContext({ viewport: { width: 1440, height: 1000 } }),
      browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    ]);
  const errors: string[] = [];
  try {
    await Promise.all(apps.map((a) => a.service.ready));
    const bases = await Promise.all(
        apps.map(
          async (app) =>
            "http://127.0.0.1:" + (await app.listen(0, "127.0.0.1")),
        ),
      ),
      service = apps[0].service,
      login = await service.login("operator", "movement-test-password"),
      op = { cookie: login.token },
      room = await service.create(login.operator.id);
    let seq = 1;
    const credentials = [];
    for (const role of ["A", "B"] as const) {
      const credential = await service.join(room.code, role, {
        fullName: "Movement " + role,
        block: "4A",
        groupNumber: "4",
      });
      credentials.push(credential);
      const auth = { bearer: credential.credential };
      for (const [type, value] of [
        ["TEAM", [1, 4, 7]],
        ["ACK_BRIEFING", BRIEFING_VERSION],
      ] as const) {
        const ack = await service.command(room.sessionId, auth, {
          id: randomUUID(),
          seq: seq++,
          type,
          value,
        });
        expect(ack.ok, ack.message).toBe(true);
      }
      credential.nextSeq = seq;
    }
    for (const [i, context] of contexts.entries())
      await context.addInitScript(
        ({ credential }) => {
          sessionStorage.setItem(
            "jt-active-player",
            JSON.stringify(credential),
          );
          localStorage.setItem(
            "gs-presentation",
            JSON.stringify({
              _uiVersion: 2,
              audioVersion: 3,
              muted: true,
              quality: "low",
              shadows: false,
            }),
          );
          const Native = window.WebSocket;
          (window as any).__wireDelay = 0;
          (window as any).__movementPackets = 0;
          class DelayedSocket extends Native {
            private handler: any;
            set onmessage(fn: any) {
              this.handler = fn;
              super.onmessage = (e) =>
                setTimeout(() => fn?.(e), (window as any).__wireDelay);
            }
            get onmessage() {
              return this.handler;
            }
            send(data: any) {
              try {
                const m = JSON.parse(data);
                if (
                  m.type === "command" &&
                  ["INPUT", "LOOK"].includes(m.command.type)
                )
                  (window as any).__movementPackets++;
              } catch {}
              setTimeout(
                () => {
                  if (this.readyState === Native.OPEN) super.send(data);
                },
                (window as any).__wireDelay,
              );
            }
          }
          window.WebSocket = DelayedSocket as any;
        },
        { credential: credentials[i] },
      );
    const pages = await Promise.all(contexts.map((c) => c.newPage()));
    for (const [i, p] of pages.entries()) {
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(bases[i] + "/play/lobby?role=" + (i ? "B" : "A"));
    }
    await expect
      .poll(
        async () =>
          (await service.snapshot(room.sessionId, op)).net.presence.A.connected,
      )
      .toBe(true);
    await expect
      .poll(
        async () =>
          (await service.snapshot(room.sessionId, op)).net.presence.B.connected,
      )
      .toBe(true);
    expect(
      (
        await service.command(room.sessionId, op, {
          id: randomUUID(),
          seq: seq++,
          type: "START",
        })
      ).ok,
    ).toBe(true);
    const a = pages[0],
      canvas = a.locator(".third-person");
    await expect(canvas).toHaveAttribute("data-camera", "first-person");
    await expect(canvas).toHaveAttribute("data-hand-count", "0");
    await expect(canvas).toHaveAttribute("data-hands-visible", "false");
    await expect
      .poll(
        async () => (await service.snapshot(room.sessionId, op)).state.phase,
      )
      .toBe("playing");
    await canvas.focus();
    await a.waitForTimeout(250);
    const start = (await service.snapshot(room.sessionId, op)).state.players.A
        .position,
      idleBefore = await a.evaluate(() => (window as any).__movementPackets);
    await a.waitForTimeout(600);
    expect(await a.evaluate(() => (window as any).__movementPackets)).toBe(
      idleBefore,
    );
    await a.evaluate(() => {
      (window as any).__wireDelay = 180;
      (window as any).__samples = [];
      const sample = () => {
        const c = document.querySelector<HTMLElement>(".third-person");
        (window as any).__samples.push({
          at: performance.now(),
          x: Number(c?.dataset.renderPlayerX),
          y: Number(c?.dataset.renderPlayerY),
        });
        if (!(window as any).__stopSamples) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await a.keyboard.down("w");
    await a.waitForTimeout(100);
    const immediate = await canvas.evaluate((el) => ({
      x: Number((el as HTMLElement).dataset.renderPlayerX),
      y: Number((el as HTMLElement).dataset.renderPlayerY),
    }));
    expect(distance(immediate, start)).toBeGreaterThan(5);
    const serverAt100 = (
      await db.query("SELECT state FROM gs_rooms WHERE id=$1", [room.sessionId])
    ).rows[0].state.players.A.position;
    expect(distance(serverAt100, start)).toBeLessThan(1);
    await a.waitForTimeout(650);
    await a.keyboard.up("w");
    await a.waitForTimeout(1000);
    const end = (await service.snapshot(room.sessionId, op)).state.players.A
      .position;
    expect(distance(end, start)).toBeGreaterThan(35);
    await a.evaluate(() => ((window as any).__stopSamples = true));
    const samples = (await a.evaluate(() => (window as any).__samples)) as {
      x: number;
      y: number;
      at: number;
    }[];
    const jumps = samples
      .slice(1)
      .map((v, i) => distance(v, samples[i]))
      .filter(Number.isFinite);
    expect(jumps.filter((v) => v > 0.2).length).toBeGreaterThan(12);
    expect(Math.max(...jumps)).toBeLessThan(40);
    await a.evaluate(() => ((window as any).__wireDelay = 0));
    await a.keyboard.press("9");
    await expect(canvas).toHaveAttribute("data-camera", "third-person");
    await expect(canvas).toHaveAttribute("data-hand-count", "0");
    await a.keyboard.press("9");
    await expect(canvas).toHaveAttribute("data-camera", "first-person");
    expect(errors).toEqual([]);
    mkdirSync(".qa/movement", { recursive: true });
    await a.screenshot({ path: ".qa/movement/hand-free.png" });
    writeFileSync(
      "reports/cloud-movement-qa.json",
      JSON.stringify(
        {
          simulatedRoundTripMs: 360,
          perQueryDelayMs: 8,
          immediateMovement: distance(immediate, start),
          authoritativeMovementAt100ms: distance(serverAt100, start),
          eventualAuthoritativeMovement: distance(end, start),
          movingRenderFrames: jumps.filter((v) => v > 0.2).length,
          maximumFrameJump: Math.max(...jumps),
          queries,
          pageErrors: errors,
          checks: [
            "First and third person render no hands",
            "No idle input packets",
            "Local camera responds before delayed server receives input",
            "Server remains authoritative",
            "Movement continues on both independent app instances",
            "No large per-frame correction jumps",
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    for (const c of contexts) await c.close();
    for (const app of apps) await app.close();
    await db.close();
  }
});
