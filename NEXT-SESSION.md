# Project handoff - latest request completed

Updated 2026-10-20. The user resumed the collision/minimap/task-journal request. Implementation and verification are complete; no implementation remains paused.

Latest specification: C:\Users\USER\.codex\attachments\e612a781-231f-4e76-ba36-fc75e0bcf020\Pasted text.txt

## Current result

- Exact shared wall boundaries and solid-piece equipment colliders replace oversized empty-bay blockers. Walls and locked gates remain solid; followers do not collide.
- Map signature / protocol agreement, service-worker cache update and missing-asset handling protect against stale client/server geometry.
- Readable 440px desktop minimap, screen-space room labels, size setting and expanded view.
- Collapsible left normal-task tracker with persistent separate active emergencies.
- Detailed server-derived task journal via TAB / Tasks, tracked map/world objective, real progress, prerequisites, equipment, resources, partner and deadline information.
- Safe overlay input stops movement, releases pointer lock and gates look; mission and partner continue. Controls retain normal Tab traversal. Close with Escape, visible Close or TAB from the journal surface.
- Development-only F9 collision inspection, disabled by default and unavailable in production.

## Verification

- npm.cmd test: 31 passed.
- npm.cmd run build: TypeScript and production bundling passed; nonfatal WebGL vendor chunk-size advisory remains.
- npm.cmd run test:e2e: 5 passed (2.8 minutes) in the final sequential suite: entry, journal/debug, three-browser multiplayer/extraction, emulated touch/settings and all 16 rooms/control approaches.
- An earlier concurrent room audit missed a steering target; isolated audit and final sequential suite passed. Expensive browser files now run sequentially; multiplayer still uses three independent clients.
- Actual HUD, journal, expanded map, touch journal, room captures and development debug overlay were inspected.
- Fresh evaluation: reports/wings-v4-collision-evaluation.json. Generated scenarios, not visitor calibration; no recommendation improvement claimed.

Full findings and evidence: [Collision and journal verification](docs/COLLISION-JOURNAL-VERIFICATION.md).

## Running the project

Workspace: C:\Jigsaw Trials, Windows PowerShell, Node 22.14. Stop an existing host with Ctrl+C, then:

```powershell
npm.cmd run build
npm.cmd start
```

Open http://localhost:8787/operator and create a NEW shift code. Use separate player browsers/contexts at /play; each chooses three companions and readies before the operator starts. Development: npm.cmd run dev. Development F9 toggles collision inspection.

Map: aster-wings-v4-collision. Scenario: ghost-shift-wings-v4-collision. Protocol: 5. Analytics: ghost-shift-wings-v4-collision-mc1. Older-map sessions are archived on host startup, preserving snapshots/history and credentials. Do not reset the production database or operator password.

No production database, private settings or credentials were modified during this revision. No deployment, agents or background host were started for the user; test servers close after verification.

Physical phones/tablets, intended booth LAN, audio listening, sustained performance and visitor pacing remain on-site acceptance work. See docs/ACCEPTANCE.md. No specific stale build from the user's original live session was proven; reproduced code defects are distinguished from that uncertainty in the report.
