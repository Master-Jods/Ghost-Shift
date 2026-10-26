import { test, expect } from "@playwright/test";
import { memoryPostgres } from "../server/cloud/testDatabase";
import { createCloudApp } from "../server/cloud/app";
import {
  fillRegistration,
  acknowledgeBriefing,
  confirmPreview,
} from "./helpers";
import { randomUUID } from "node:crypto";
test("three browser terminals on separate cloud app instances share injection, analytics, movement and logs", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const db = memoryPostgres(),
    shared = { ...db, close: async () => {} },
    apps = [
      createCloudApp({
        db: shared,
        staticDir: "dist",
        bootstrapUser: "cloud-browser",
        bootstrapPassword: "cloud-browser-password",
      }),
      createCloudApp({ db: shared, staticDir: "dist" }),
      createCloudApp({ db: shared, staticDir: "dist" }),
    ],
    contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
  let pages: any[] = [],
    errors: string[] = [];
  try {
    await Promise.all(apps.map((a) => a.service.ready));
    const bases = await Promise.all(
      apps.map(
        async (a) => "http://127.0.0.1:" + (await a.listen(0, "127.0.0.1")),
      ),
    );
    const login = await apps[0].service.login(
        "cloud-browser",
        "cloud-browser-password",
      ),
      op = { cookie: login.token },
      room = await apps[0].service.create(login.operator.id);
    pages = await Promise.all(contexts.map((c) => c.newPage()));
    for (const p of pages) {
      p.on("pageerror", (e: Error) => errors.push(e.message));
      p.on("requestfailed", (r: any) => {
        if (r.url().includes("/assets/"))
          console.log("asset request failed", r.url(), r.failure()?.errorText);
      });
    }
    await contexts[0].addCookies([
      {
        name: "jt_operator",
        value: login.token,
        url: bases[0],
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    await pages[0].goto(bases[0] + "/operator");
    await expect(pages[0].getByLabel("Server session")).toHaveValue(
      room.sessionId,
    );
    for (const i of [1, 2]) {
      const page = pages[i],
        role = i === 1 ? "A" : "B";
      await page.goto(bases[i] + "/play?role=" + role + "&code=" + room.code);
      await fillRegistration(page, "Cloud Student " + role);
      await page
        .getByRole("button", { name: "JOIN SERVER SESSION", exact: true })
        .click();
      for (const id of i === 1 ? [1, 4, 7] : [25, 133, 150]) {
        await page
          .getByRole("textbox", { name: /Search Pok/ })
          .fill(String(id));
        await page
          .locator(".catalog-grid")
          .getByRole("button", { name: "Select", exact: true })
          .click();
      }
      await page
        .getByRole("button", { name: "Finalize three companions", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Read field briefing", exact: true })
        .click();
      await acknowledgeBriefing(page);
    }
    const result = await apps[0].service.command(room.sessionId, op, {
      id: randomUUID(),
      seq: 1,
      type: "START",
    });
    expect(result.ok, result.message).toBe(true);
    for (const p of pages.slice(1))
      await expect(p.locator(".third-person")).toHaveAttribute(
        "data-camera",
        "first-person",
        { timeout: 30000 },
      );
    await expect
      .poll(
        async () =>
          (await apps[0].service.snapshot(room.sessionId, op)).state.phase,
      )
      .toBe("playing");
    await pages[1].keyboard.press("Escape");
    const before = (await apps[0].service.snapshot(room.sessionId, op)).state
      .players.A.position;
    await pages[1].keyboard.down("w");
    await pages[1].waitForTimeout(800);
    await pages[1].keyboard.up("w");
    await expect
      .poll(async () => {
        const p = (await apps[0].service.snapshot(room.sessionId, op)).state
          .players.A.position;
        return Math.hypot(p.x - before.x, p.y - before.y);
      })
      .toBeGreaterThan(5);
    await pages[0]
      .getByRole("button", { name: "Live Director", exact: true })
      .click();
    await pages[0]
      .getByRole("button", { name: "Facility emergency", exact: true })
      .click();
    await pages[0]
      .getByRole("button", { name: "Preview intervention", exact: true })
      .click();
    await confirmPreview(pages[0]);
    await expect
      .poll(
        async () =>
          (await apps[2].service.snapshot(room.sessionId, op)).state.emergencies
            .length,
      )
      .toBe(1);
    for (const p of pages.slice(1))
      await expect(p.locator(".danger-signal")).toBeVisible({ timeout: 10000 });
    const player = await pages[1].evaluate(() =>
      JSON.parse(sessionStorage.getItem("jt-active-player") || "null"),
    );
    const response = await contexts[1].request.post(
      bases[1] + "/api/sessions/" + room.sessionId + "/field-analysis",
      { headers: { Authorization: "Bearer " + player.credential }, data: {} },
    );
    expect(response.ok()).toBe(true);
    const guidance = await response.json();
    expect(guidance.best.nextSteps.length).toBeGreaterThan(0);
    expect(
      guidance.best.nextSteps.some((v: any) =>
        /Resolve|reset|blackout/i.test(v.text),
      ),
    ).toBe(true);
    const logs = await apps[2].service.activityPage(
      login.operator.id,
      new URLSearchParams({ sessionId: room.sessionId }),
    );
    expect(logs.rows.some((v) => v.full_name === "Cloud Student A")).toBe(true);
    expect(logs.rows.some((v) => v.action === "INJECT")).toBe(true);
    await pages[0]
      .getByRole("button", { name: "Analytics", exact: true })
      .click();
    await expect(pages[0].locator(".telemetry-dashboard")).toBeVisible();
    expect(errors).toEqual([]);
    await pages[0].screenshot({ path: ".qa/cloud-operator.png" });
    await pages[1].screenshot({ path: ".qa/cloud-player.png" });
  } finally {
    for (const c of contexts) await c.close();
    for (const a of apps) await a.close();
    await db.close();
  }
});
