import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  trialFixture,
  openTrialTask,
  solveTrialTask,
  confirmPreview,
} from "./helpers";
import { EMERGENCIES } from "../src/content";
import { coolantReadings, emergencyLocation } from "../src/engine";
import { controlPoint } from "../src/world";
const directory = ".qa/task-equipment";
async function layout(panel: Locator) {
  const result = await panel.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const controls = [
      ...el.querySelectorAll<HTMLElement>("button,input,select"),
    ]
      .filter((n) => n.getBoundingClientRect().width > 0)
      .map((n) => ({
        label:
          n.getAttribute("aria-label") || n.textContent?.trim() || n.tagName,
        box: n.getBoundingClientRect(),
      }));
    const overlaps = [];
    for (let i = 0; i < controls.length; i++)
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i].box,
          b = controls[j].box;
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2
        )
          overlaps.push([controls[i].label, controls[j].label]);
      }
    return {
      width: box.width,
      height: box.height,
      horizontalOverflow: el.scrollWidth > el.clientWidth + 1,
      withinViewport:
        box.left >= 0 &&
        box.right <= innerWidth + 1 &&
        box.top >= 0 &&
        box.bottom <= innerHeight + 1,
      overlaps,
    };
  });
  expect(result.horizontalOverflow).toBe(false);
  expect(result.withinViewport).toBe(true);
  expect(result.overlaps).toEqual([]);
  return result;
}
async function snapshot(page: Page, name: string, small = false) {
  const panel = page.locator(".equipment-terminal").filter({
    has: page.locator(".mechanism,.emergency-mechanism,.task-options"),
  });
  await expect(panel).toBeVisible();
  const desktop = await layout(panel);
  await panel.screenshot({ path: directory + "/" + name + ".png" });
  const sizes: Record<string, unknown> = { desktop };
  if (small) {
    for (const size of [
      { width: 1024, height: 768 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(120);
      sizes[size.width + "x" + size.height] = await layout(panel);
      await panel.screenshot({
        path: directory + "/" + name + "-" + size.width + ".png",
      });
    }
    await page.setViewportSize({ width: 1366, height: 768 });
  }
  return sizes;
}
async function setSelectors(panel: Locator, pattern: number[]) {
  for (const [n, value] of pattern.entries())
    await panel
      .getByLabel("Selector " + (n + 1), { exact: true })
      .selectOption(String(value));
}
test("all six normal tasks: real controls, wrong answers, readable layouts, coolant drag and completion", async ({
  browser,
}) => {
  test.setTimeout(180000);
  mkdirSync(directory, { recursive: true });
  const f = await trialFixture(browser),
    [a, b] = f.pages,
    report: any[] = [];
  for (const p of f.pages)
    await p.setViewportSize({ width: 1366, height: 768 });
  try {
    for (const original of [...f.room.state.tasks]) {
      const role = original.role === "B" ? "B" : "A",
        page = role === "B" ? b : a;
      await f.stage(role, original.position);
      await openTrialTask(page, f.room, original.id);
      let task = f.room.state.tasks.find((t) => t.id === original.id)!;
      let panel = page.getByRole("dialog", { name: "task overlay" });
      if (task.mode === "routing") {
        await snapshot(page, "routing-choice", true);
        await panel
          .getByRole("button", { name: "Preview shortcut a", exact: true })
          .click();
        await confirmPreview(page);
        task = f.room.state.tasks.find((t) => t.id === task.id)!;
      }
      if (task.mode === "transfer") {
        await snapshot(page, "transfer-pickup");
        await panel
          .getByRole("button", {
            name: "Retrieve research module",
            exact: true,
          })
          .click();
        await expect
          .poll(() => f.room.state.tasks.find((t) => t.id === task.id)!.carrier)
          .toBe(role);
        await panel
          .getByRole("button", { name: "Close overlay", exact: true })
          .click();
        await f.stage(role, task.destination!);
        await openTrialTask(page, f.room, task.id);
        task = f.room.state.tasks.find((t) => t.id === task.id)!;
      }
      const beforeErrors = task.errors;
      if (task.mode === "wiring") {
        await panel
          .getByRole("button", { name: "Test wiring circuit", exact: true })
          .click();
      } else if (task.mode === "signal") {
        await panel
          .getByLabel("Frequency", { exact: true })
          .selectOption(String((task.pattern[0] + 1) % 4));
        await panel
          .getByRole("button", {
            name: "Validate signal alignment",
            exact: true,
          })
          .click();
      } else if (task.mode === "coolant") {
        const slider = panel.getByRole("slider", {
          name: "Valve 1",
          exact: true,
        });
        await slider.scrollIntoViewIfNeeded();
        const box = (await slider.boundingBox())!;
        await page.mouse.move(box.x + 12, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 12, box.y + box.height / 2, {
          steps: 12,
        });
        await page.mouse.up();
        await expect(slider).toHaveValue("3");
        await expect(
          panel.getByLabel("Current flow", { exact: true }),
        ).toHaveText(coolantReadings([3, 0, 0])[1] + " L/s");
        const after = (await slider.boundingBox())!;
        const liveReadings = await panel
          .locator(".coolant-readings")
          .boundingBox();
        const terminalBox = await panel.boundingBox();
        expect(liveReadings!.y).toBeGreaterThanOrEqual(terminalBox!.y);
        expect(liveReadings!.y + liveReadings!.height).toBeLessThanOrEqual(
          terminalBox!.y + terminalBox!.height,
        );

        expect(Math.abs(after.y - box.y)).toBeLessThan(1);
        await page.waitForTimeout(700);
        await expect(slider).toHaveValue("3");
        const values = task.pattern.map((v, i) => (i === 0 ? (v + 1) % 4 : v));
        for (let i = 0; i < 3; i++)
          await panel
            .getByRole("button", {
              name: `Set ${["inlet", "bypass", "return"][i]} valve to ${values[i]}`,
              exact: true,
            })
            .click();
        await panel
          .getByRole("button", {
            name: "Validate coolant balance",
            exact: true,
          })
          .click();
      } else if (task.mode === "cooperative") {
        const wrong = task.pattern.slice(0, 2);
        wrong[0] = (wrong[0] + 1) % 4;
        await setSelectors(panel, wrong);
        await panel
          .getByRole("button", { name: "Validate local setup", exact: true })
          .click();
      } else {
        const wrong = task.pattern.slice();
        wrong[0] = (wrong[0] + 1) % 4;
        await setSelectors(panel, wrong);
        await panel
          .getByRole("button", {
            name:
              task.mode === "routing"
                ? "Validate power circuit"
                : "Verify and upload module",
            exact: true,
          })
          .click();
      }
      await expect
        .poll(() => f.room.state.tasks.find((t) => t.id === task.id)!.errors)
        .toBeGreaterThan(beforeErrors);
      await expect(panel).toContainText("The last validation did not match");
      if (task.mode === "coolant") {
        const slider = panel.getByRole("slider", {
          name: "Valve 1",
          exact: true,
        });
        await slider.scrollIntoViewIfNeeded();
        const rect = (await slider.boundingBox())!;
        const oldValue = Number(await slider.inputValue());
        await page.mouse.move(
          oldValue === 0 ? rect.x + 12 : rect.x + rect.width - 12,
          rect.y + rect.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          oldValue === 0 ? rect.x + rect.width - 12 : rect.x + 12,
          rect.y + rect.height / 2,
          { steps: 10 },
        );
        await page.mouse.up();
        const after = (await slider.boundingBox())!;
        expect(Math.abs(after.y - rect.y)).toBeLessThan(1);
        await expect(slider).toHaveValue(oldValue === 0 ? "3" : "0");
      }
      const sizes = await snapshot(page, task.mode, true);
      await solveTrialTask(page, f.room, task.id, role);
      if (task.mode === "cooperative") {
        await f.stage("B", task.secondPosition!);
        await openTrialTask(b, f.room, task.id);
        await solveTrialTask(b, f.room, task.id, "B");
        await page
          .getByRole("button", { name: "Activate stabilizer", exact: true })
          .click();
        await expect
          .poll(
            () => f.room.state.tasks.find((t) => t.id === task.id)!.activated.A,
          )
          .not.toBeUndefined();
        await b
          .getByRole("button", { name: "Activate stabilizer", exact: true })
          .click();
      }
      await expect
        .poll(() => f.room.state.tasks.find((t) => t.id === task.id)!.complete)
        .toBe(true);
      await expect(
        panel.getByRole("heading", {
          name: "Assignment complete",
          exact: true,
        }),
      ).toBeVisible();
      report.push({
        name: task.name,
        mode: task.mode,
        wrongRejected: true,
        complete: true,
        layouts: sizes,
      });
      await panel
        .getByRole("button", { name: "Return to facility", exact: true })
        .click();
      if (task.mode === "cooperative")
        await b
          .getByRole("button", { name: "Close overlay", exact: true })
          .click();
    }
    expect(f.room.state.tasks.every((t) => t.complete)).toBe(true);
    expect(f.errors).toEqual([]);
    writeFileSync(
      "reports/task-equipment-normal-qa.json",
      JSON.stringify(
        {
          tasks: report,
          errors: f.errors,
          notes:
            "Actual Chrome controls and authoritative completion; fixture stages positions to isolate terminal interaction.",
        },
        null,
        2,
      ),
    );
  } finally {
    await f.close();
  }
});
async function openEmergency(page: Page, f: any, e: any, role: "A" | "B") {
  await f.stage(role, emergencyLocation(e, role));
  await page
    .getByLabel("Task tracker", { exact: true })
    .getByRole("button")
    .filter({ has: page.locator("strong", { hasText: e.name }) })
    .click();
  await page.getByRole("button", { name: "Interact", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "emergency overlay" });
  await expect(
    panel.getByRole("heading", { name: e.name, exact: true }),
  ).toBeVisible();
  return panel;
}
async function propose(page: Page, partner: Page, localBypass = false) {
  await page
    .getByRole("button", {
      name: localBypass
        ? "Propose local bypass"
        : "Propose paired stabilization",
      exact: true,
    })
    .click();
  const preview = page.getByRole("dialog", {
    name: "Authoritative decision preview",
  });
  await expect(
    preview.getByRole("button", {
      name: "Request partner approval",
      exact: true,
    }),
  ).toBeEnabled();
  await preview
    .getByRole("button", { name: "Request partner approval", exact: true })
    .click();
  const approval = partner.getByRole("dialog", {
    name: "Authoritative decision preview",
  });
  await expect(
    approval.getByRole("button", {
      name: "Approve this proposal",
      exact: true,
    }),
  ).toBeEnabled();
  await approval
    .getByRole("button", { name: "Approve this proposal", exact: true })
    .click();
  await expect(approval).toBeHidden();
}
test("all eight injected emergency task UIs complete through legal channels, transfer and paired controls", async ({
  browser,
}) => {
  test.setTimeout(180000);
  mkdirSync(directory, { recursive: true });
  const f = await trialFixture(browser),
    [a, b] = f.pages,
    report: any[] = [];
  for (const p of f.pages)
    await p.setViewportSize({ width: 1366, height: 768 });
  f.room.state.config.eventCooldown = 0;
  f.room.state.config.eventBudget = 12;
  const actor = {
    id: "task-emergency-qa",
    role: "control" as const,
    sessionId: f.room.state.id,
  };
  let seq = 90000;
  try {
    for (const def of EMERGENCIES) {
      await f.stage("A", controlPoint(def.room, "A"));
      await f.stage("B", controlPoint(def.room, "B"));
      const preview = await f.app.preview(f.room, actor, {
        type: "INJECT",
        value: {
          kind: "emergency",
          eventKind: def.kind,
          target: "A",
          scope: def.scope,
          severity: 1,
          duration: 60,
          blocking: true,
        },
      });
      expect(preview.feasible, preview.reason).toBe(true);
      expect(
        f.app.command(f.room, actor, {
          id: randomUUID(),
          seq: seq++,
          type: "CONFIRM_PREVIEW",
          previewId: preview.id,
        }).ok,
      ).toBe(true);
      let e = f.room.state.emergencies.at(-1)!;
      let panel = await openEmergency(a, f, e, "A");
      await expect(panel).toContainText(
        "Missing this deadline ends the session immediately",
      );
      const sizes = await snapshot(a, "emergency-" + def.kind, true);
      if (def.kind === "overload") {
        await propose(a, b);
        await expect
          .poll(() => f.room.state.emergencies.at(-1)!.allocated)
          .toBe(true);
        e = f.room.state.emergencies.at(-1)!;
      }
      if (def.kind === "corruption") {
        await panel
          .getByRole("button", { name: "Retrieve data fragment", exact: true })
          .click();
        await expect
          .poll(() => f.room.state.emergencies.at(-1)!.carrier)
          .toBe("A");
        await panel
          .getByRole("button", { name: "Close overlay", exact: true })
          .click();
        e = f.room.state.emergencies.at(-1)!;
        panel = await openEmergency(a, f, e, "A");
        await snapshot(a, "emergency-corruption-upload");
      }
      if (e.scope === "both") {
        const partner = await openEmergency(b, f, e, "B");
        while (f.room.state.emergencies.at(-1)!.status === "active") {
          const progress = f.room.state.emergencies.at(-1)!.progress;
          await panel
            .getByRole("button", {
              name: "Activate my emergency control",
              exact: true,
            })
            .click();
          await partner
            .getByRole("button", {
              name: "Activate my emergency control",
              exact: true,
            })
            .click();
          await expect
            .poll(() => f.room.state.emergencies.at(-1)!.progress)
            .toBeGreaterThan(progress);
        }
        await partner
          .getByRole("button", { name: "Close overlay", exact: true })
          .click();
      } else {
        const before = e.progress;
        const wrong = (e.pattern[e.progress] + 1) % 4;
        await panel
          .getByRole("button", {
            name: ["A", "B", "C", "D"][wrong],
            exact: true,
          })
          .click();
        await expect(panel.getByRole("alert")).toBeVisible();
        expect(f.room.state.emergencies.at(-1)!.progress).toBe(before);
        while (f.room.state.emergencies.at(-1)!.status === "active") {
          const current = f.room.state.emergencies.at(-1)!;
          await panel
            .getByRole("button", {
              name: ["A", "B", "C", "D"][current.pattern[current.progress]],
              exact: true,
            })
            .click();
          await expect
            .poll(() => f.room.state.emergencies.at(-1)!.progress)
            .toBeGreaterThan(current.progress);
        }
      }
      await expect(panel).toContainText("Incident resolved");
      expect(f.room.state.phase).toBe("playing");
      report.push({
        name: def.name,
        kind: def.kind,
        scope: e.scope,
        complete: true,
        layouts: sizes,
      });
      await panel
        .getByRole("button", { name: "Close overlay", exact: true })
        .click();
    }
    expect(report).toHaveLength(8);
    expect(f.errors).toEqual([]);
    writeFileSync(
      "reports/task-equipment-emergency-qa.json",
      JSON.stringify(
        {
          emergencies: report,
          errors: f.errors,
          notes:
            "All eight actual injected emergency mechanisms resolved in Chrome. Fixture stages positions; no deadline or completion shortcut.",
        },
        null,
        2,
      ),
    );
  } finally {
    await f.close();
  }
});
test("carrier restrictions, cooperative retry and rejected local-bypass approval stay usable", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const f = await trialFixture(browser),
    [a, b] = f.pages;
  let errorsBefore = 0;
  try {
    const transport = f.room.state.tasks.find((t) => t.mode === "transfer")!;
    await f.stage("A", transport.position);
    await openTrialTask(a, f.room, transport.id);
    await a
      .getByRole("button", { name: "Retrieve research module", exact: true })
      .click();
    await expect
      .poll(
        () => f.room.state.tasks.find((t) => t.id === transport.id)!.carrier,
      )
      .toBe("A");
    await a.getByRole("button", { name: "Close overlay", exact: true }).click();
    await f.stage("B", transport.destination!);
    await openTrialTask(b, f.room, transport.id);
    const wrongCarrier = b.getByRole("dialog", { name: "task overlay" });
    await expect(wrongCarrier).toContainText("Only that trainer can upload");
    await expect(
      wrongCarrier.getByRole("button", {
        name: "Verify and upload module",
        exact: true,
      }),
    ).toHaveCount(0);
    await wrongCarrier
      .getByRole("button", { name: "Close overlay", exact: true })
      .click();
    const dual = f.room.state.tasks.find((t) => t.mode === "cooperative")!;
    await f.stage("A", dual.position);
    await f.stage("B", dual.secondPosition!);
    await openTrialTask(a, f.room, dual.id);
    await openTrialTask(b, f.room, dual.id);
    await solveTrialTask(a, f.room, dual.id, "A");
    await solveTrialTask(b, f.room, dual.id, "B");
    await a
      .getByRole("button", { name: "Activate stabilizer", exact: true })
      .click();
    await expect
      .poll(() => f.room.state.tasks.find((t) => t.id === dual.id)!.activated.A)
      .not.toBeUndefined();
    await expect
      .poll(
        () => f.room.state.tasks.find((t) => t.id === dual.id)!.activated.A,
        { timeout: 15000 },
      )
      .toBeUndefined();
    expect(f.room.state.tasks.find((t) => t.id === dual.id)!.setup).toEqual({
      A: true,
      B: true,
    });
    await expect(
      a.getByRole("button", { name: "Activate stabilizer", exact: true }),
    ).toBeEnabled();
    await a
      .getByRole("button", { name: "Activate stabilizer", exact: true })
      .click();
    await b
      .getByRole("button", { name: "Activate stabilizer", exact: true })
      .click();
    await expect
      .poll(() => f.room.state.tasks.find((t) => t.id === dual.id)!.complete)
      .toBe(true);
    for (const p of f.pages)
      await p
        .getByRole("button", { name: "Close overlay", exact: true })
        .click();
    await f.stage("A", controlPoint("electrical", "A"));
    await f.stage("B", controlPoint("electrical", "B"));
    const actor = {
        id: "bypass-ui-qa",
        role: "control" as const,
        sessionId: f.room.state.id,
      },
      preview = await f.app.preview(f.room, actor, {
        type: "INJECT",
        value: {
          kind: "emergency",
          eventKind: "overload",
          target: "A",
          scope: "either",
          severity: 1,
          duration: 60,
          blocking: true,
        },
      });
    expect(preview.feasible, preview.reason).toBe(true);
    expect(
      f.app.command(f.room, actor, {
        id: randomUUID(),
        seq: 91000,
        type: "CONFIRM_PREVIEW",
        previewId: preview.id,
      }).ok,
    ).toBe(true);
    let emergency = f.room.state.emergencies.at(-1)!;
    const originalSteps = emergency.steps;
    const panel = await openEmergency(a, f, emergency, "A");
    await panel
      .getByRole("button", { name: "Propose local bypass", exact: true })
      .click();
    const request = a.getByRole("dialog", {
      name: "Authoritative decision preview",
    });
    await request
      .getByRole("button", { name: "Request partner approval", exact: true })
      .click();
    const partner = b.getByRole("dialog", {
      name: "Authoritative decision preview",
    });
    await partner.getByRole("button", { name: "Reject", exact: true }).click();
    await expect(
      panel.getByRole("button", { name: "Propose local bypass", exact: true }),
    ).toBeVisible();
    await propose(a, b, true);
    await expect
      .poll(() => f.room.state.emergencies.at(-1)!.steps)
      .toBe(originalSteps + 1);
    while (f.room.state.emergencies.at(-1)!.status === "active") {
      emergency = f.room.state.emergencies.at(-1)!;
      await panel
        .getByRole("button", {
          name: ["A", "B", "C", "D"][emergency.pattern[emergency.progress]],
          exact: true,
        })
        .click();
      await expect
        .poll(() => f.room.state.emergencies.at(-1)!.progress)
        .toBeGreaterThan(emergency.progress);
    }
    expect(f.room.state.phase).toBe("playing");
    expect(f.errors).toEqual([]);
    writeFileSync(
      "reports/task-equipment-variants-qa.json",
      JSON.stringify(
        {
          carrierRestricted: true,
          cooperativeWindowRetry: true,
          localBypassRejectedThenApproved: true,
          extraResetRequired: true,
          resolved: true,
          errors: f.errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await f.close();
  }
});
test("an injected emergency stays visible while coolant controls remain usable", async ({
  browser,
}) => {
  const f = await trialFixture(browser),
    [a] = f.pages;
  try {
    const task = f.room.state.tasks.find((t) => t.mode === "coolant")!;
    await f.stage("A", task.position);
    await openTrialTask(a, f.room, task.id);
    await f.stage("B", controlPoint("electrical", "B"));
    const actor = {
        id: "foreground-task-qa",
        role: "control" as const,
        sessionId: f.room.state.id,
      },
      preview = await f.app.preview(f.room, actor, {
        type: "INJECT",
        value: {
          kind: "emergency",
          eventKind: "blackout",
          target: "B",
          scope: "either",
          severity: 1,
          duration: 60,
          blocking: true,
        },
      });
    expect(preview.feasible, preview.reason).toBe(true);
    expect(
      f.app.command(f.room, actor, {
        id: randomUUID(),
        seq: 93000,
        type: "CONFIRM_PREVIEW",
        previewId: preview.id,
      }).ok,
    ).toBe(true);
    const panel = a.getByRole("dialog", { name: "task overlay" });
    await expect(panel.locator(".task-critical-notice")).toContainText(
      "Critical: Blackout",
    );
    const slider = panel.getByRole("slider", { name: "Valve 1", exact: true });
    await slider.scrollIntoViewIfNeeded();
    await slider.focus();
    await slider.press("End");
    await expect(slider).toHaveValue("3");
    await expect(panel.locator(".task-critical-notice")).toBeInViewport();
    const notice = (await panel
        .locator(".task-critical-notice")
        .boundingBox())!,
      readings = (await panel.locator(".coolant-readings").boundingBox())!;
    expect(readings.y).toBeGreaterThanOrEqual(notice.y + notice.height - 1);
    await layout(panel);
    expect(f.errors).toEqual([]);
    await panel.screenshot({
      path: directory + "/coolant-during-emergency.png",
    });
  } finally {
    await f.close();
  }
});
