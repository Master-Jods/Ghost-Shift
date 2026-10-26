import {confirmPreview} from './helpers';
﻿import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { trialFixture } from "./helpers";
import { center, distance } from "../src/world";
test("Among the Shadows branding and sustained incident alarms stop on engagement and resolution", async ({
  browser,
}) => {
  test.setTimeout(180000);
  mkdirSync(".qa/among-shadows", { recursive: true });
  const f = await trialFixture(browser),
    [a, b] = f.pages;
  const stats = async (p: any) =>
    JSON.parse(
      (await p.locator("html").getAttribute("data-game-audio")) || "{}",
    );
  const actor = {
    id: "danger-qa",
    role: "control" as const,
    sessionId: f.room.state.id,
  };
  let seq = 90000;
  const inject = async (kind: "threat" | "emergency", pokemonId = 133) => {
    const value =
      kind === "threat"
        ? {
            kind,
            pokemonId,
            target: "B",
            severity: 1,
            duration: 120,
            scope: "either",
            blocking: false,
          }
        : {
            kind,
            eventKind: "blackout",
            target: "B",
            severity: 1,
            duration: 60,
            scope: "either",
            blocking: true,
          };
    const p = await f.app.preview(f.room, actor, { type: "INJECT", value });
    expect(p.feasible, p.reason).toBe(true);
    const ack = f.app.command(f.room, actor, {
      id: randomUUID(),
      seq: seq++,
      type: "CONFIRM_PREVIEW",
      previewId: p.id,
    });
    expect(ack.ok, ack.message).toBe(true);
  };
  try {
    f.room.state.config.eventCooldown = 0;
    await f.stage("A", center("arrival"));
    await f.stage("B", center("hub"));
    for (const p of f.pages) {
      await expect(p).toHaveTitle("Pok\u00e9mon: Among the Shadows");
      await expect(p.locator(".player-top .wordmark b")).toHaveText(
        "AMONG THE SHADOWS",
      );
      await p.evaluate(() => {
        const saved = JSON.parse(
          localStorage.getItem("gs-presentation") || "{}",
        );
        window.dispatchEvent(
          new CustomEvent("ghost-audio-unlock", {
            detail: {
              ...saved,
              muted: false,
              master: 0.8,
              music: 0,
              effects: 1,
              ambience: 0,
              reducedFlashes: false,
            },
          }),
        );
      });
      await expect.poll(async () => (await stats(p)).ready).toBe(true);
    }
    await inject("threat");
    const threat = f.room.state.threats[0];
    expect(
      distance(f.room.state.players.A.position, threat.position),
    ).toBeGreaterThan(750);
    for (const p of f.pages) {
      await expect(p.locator(".danger-signal")).toBeVisible();
      await expect.poll(async () => (await stats(p)).dangerAlarms).toBe(1);
      expect((await stats(p)).dangerKind).toBe("pokemon");
      await expect
        .poll(async () => (await stats(p)).level, { intervals: [30] })
        .toBeGreaterThan(0.001);
    }
    await a.waitForTimeout(4100);
    for (const p of f.pages) {
      expect((await stats(p)).dangerAlarms).toBe(1);
      await expect.poll(async () => (await stats(p)).dangerActive).toBe(true);
    }
    await inject("emergency");
    for (const p of f.pages) {
      await expect.poll(async () => (await stats(p)).dangerAlarms).toBe(2);
      expect((await stats(p)).dangerKind).toBe("emergency");
      await expect(p.locator(".danger-banner")).toContainText(
        "CRITICAL EMERGENCY",
      );
    }
    // Stop an in-flight siren with the real mute control, then ensure old snapshots
    // and an unmute cannot replay this same already-announced incident.
    await a
      .getByRole("button", { name: "Mute music and sound", exact: true })
      .click();
    await expect.poll(async () => (await stats(a)).dangerActive).toBe(false);
    await a.waitForTimeout(400);
    await expect.poll(async () => (await stats(a)).level).toBeLessThan(0.0001);
    await a
      .getByRole("button", { name: "Enable music and sound", exact: true })
      .click();
    await a.waitForTimeout(600);
    expect((await stats(a)).dangerAlarms).toBe(3);
    // Resolving/cancelling the current incident also stops its alarm.
    const emergency = f.room.state.emergencies[0];
    expect(f.cmd("CANCEL_EVENT", emergency.id).ok).toBe(true);
    await expect.poll(async () => (await stats(b)).dangerKind).toBe("pokemon");
    await a.waitForTimeout(700);
    for (const p of f.pages) {expect((await stats(p)).dangerAlarms).toBeGreaterThanOrEqual(3);expect((await stats(p)).dangerActive).toBe(true);}
    // Engage using the real interaction and authoritative preview.
    await f.stage('B',{x:threat.position.x+45,y:threat.position.y});
    await b.getByRole('button',{name:'Interact',exact:true}).click();
    await confirmPreview(b);
    await expect(b.getByLabel('Live battle stage',{exact:true})).toBeVisible();
    for(const p of f.pages)await expect.poll(async()=>(await stats(p)).dangerActive).toBe(false);
    await b.getByRole('button',{name:'Retreat / return to field',exact:true}).click();
    for(const p of f.pages)await expect.poll(async()=>(await stats(p)).dangerActive).toBe(true);
    expect(f.cmd('CANCEL_EVENT',threat.instanceId).ok).toBe(true);
    for(const p of f.pages)await expect.poll(async()=>(await stats(p)).dangerActive).toBe(false);
    const report = {
      a: await stats(a),
      b: await stats(b),
      remoteDistance: distance(
        f.room.state.players.A.position,
        threat.position,
      ),
      pageErrors: f.errors,
      checks: [
        "Both player HUDs/browser tabs rebranded",
        "Remote Pokemon alarm audible beyond old 750-unit sound radius",
        "Emergency has a distinct sustained alert and red warning",
        "Actual mixed output measured",
        "Loop remains active beyond four seconds without restarting on snapshots",
        "Mute stops the alarm; unmute restores an unresolved warning",
        "Engagement silences Pokemon alert, retreat resumes; cancellation stops it",
      ],
    };
    expect(f.errors).toEqual([]);
    writeFileSync(
      "reports/among-shadows-danger-qa.json",
      JSON.stringify(report, null, 2),
    );
    await a.screenshot({ path: ".qa/among-shadows/player.png" });
    const entry = await f.contexts[0].newPage();
    await entry.goto(f.base + "/play");
    await expect(
      entry.getByRole("heading", {
        name: "Pok\u00e9mon: Among the Shadows",
        exact: true,
      }),
    ).toBeVisible();
    await entry.screenshot({ path: ".qa/among-shadows/title.png" });
    await entry.goto(f.base + "/operator");
    await expect(
      entry.getByRole("heading", {
        name: "Pok\u00e9mon: Among the Shadows",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await f.close();
  }
});
