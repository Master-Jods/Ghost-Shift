# Collision and task journal revision — 2026-10-20

This revision implements the latest movement/minimap/tracker/journal request. It preserves the facility, authoritative multiplayer reducer, companions, manual Director interventions and actual-rule Monte Carlo analytics.

## Collision diagnosis and fix

Three reproducible geometry issues were found in code:

1. Equipment collision used the whole reserved rectangular service bay. Empty space between visible coolant pipes and alongside reactor controls was solid.
2. The renderer independently rounded the floor union onto a 10-unit grid. Canonical room/corridor coordinates include 5-unit offsets, so wall placement could disagree with authoritative geometry.
3. Expanding rectangular props by the player radius as a square rejected otherwise clear diagonal approaches.

`src/world.ts` now supplies the exact floor-union wall segments and 23 colliders around actual solid pieces. Renderer, authoritative movement, navigation, legacy compatibility renderer, minimap and operator overview consume that geometry. Circle/AABB nearest-point checks preserve the player radius of 11 without adding square corner blocks. Real walls, visible props and closed gates remain solid. Followers remain cosmetic collision-free companions. There is no separate physics engine or optimistic client movement correction to patch.

Concrete regressions cover the Cooling gap at (1100,415), Reactor bay corner at (72,480), the exact x=165 boundary, visible pipes/pods, rounded corners and closed/open gates. Both A and B execute authoritative movement through the former empty-bay blocker. Navigation checks every room pair with both optional gates locked; a browser walks through all 16 rooms and approaches their controls through ordinary keyboard input.

No live host was available when the issue was investigated. These are reproduced code defects; a stale build on the user's particular previous session was not proven.

## Build agreement

Current map: `aster-wings-v4-collision`; protocol: **5**; scenario: `ghost-shift-wings-v4-collision`; analytics model: `ghost-shift-wings-v4-collision-mc1`.

The geometry signature hashes canonical floors, solid props, gate definitions and player radius. WebSocket authentication requires the exact signature and protocol; snapshots are checked again before accepting positions. A mismatch disables movement, requests a service-worker update, invalidates this game's caches and reloads once. Repeated mismatch displays the host-update requirement. Missing hashed `/assets/` files return 404 rather than SPA HTML. Development watches backend source changes. Old-map sessions are archived on host startup without replacing their stored snapshots or operator credentials.

Restart the host after building and create a new shift code. Manual browser-cache deletion is not the update mechanism.

## Player behavior

- Desktop minimap defaults to 440px; the size setting spans 180–600px and adapts to narrow viewports. Labels are screen-space text with contrast backing and abbreviations. Current room, facing, canonical walls/doors, permitted partner, known objectives and tracked location remain live. Expand map and Close are visible controls.
- The left tracker shows shared completion, assignment, room, status and participation. Its normal list can collapse while the separate emergency section remains visible. Incident order stays stable.
- TAB opens the detailed journal from the gameplay surface. TAB closes it from the dialog surface; Tab on controls retains ordinary focus navigation. Escape and Close also work. Tasks provides touch access. Opening clears movement/touch input, stops authoritative input and releases pointer lock. Camera input is gated while open; the shared mission keeps running. Relocking requires an explicit world/Mouse look click.
- Selecting an assignment tracks its server-derived destination on the tracker, minimap and existing depth-tested world marker. Transfer stages and A/B controls are listed separately in the journal. No route is drawn through walls. Completion and emergency lifecycle derive from snapshots; cancellation/missed status remains distinct from resolution.
- Instructions cover the implemented controls, 12-active-second coordination window, carrier delivery, overload costs/approval, prerequisites and extraction blocking. Exact terminal target symbols and undiscovered threats remain private.

## Verification and evidence

- `npm.cmd test`: **31 passed**.
- `npm.cmd run build`: client/server TypeScript and production bundling passed. The existing WebGL vendor size advisory remains nonfatal.
- `npm.cmd run test:e2e`: **5 passed (2.8 minutes)**. The scenarios cover entry, emulated touch/settings, all-room traversal, three-context multiplayer/extraction, and the new live journal/development collision inspection. The final sequential suite passed.
- The GPU-heavy browser files run sequentially; each multiplayer scenario still uses independent real browser contexts. An earlier concurrent room audit missed its steering target; the isolated audit passed. Diagnostic failures now include target, position, input, phase and visited rooms.
- New browser checks hold W, open TAB under pointer lock, verify stopped position/yaw, continuing mission time and partner signals, normal Tab behavior in settings/journal controls, selected map markers, emergency injection through a real preview/confirmation, collapse persistence and cancellation.
- Socket tests reject missing/stale signatures and old protocol before authenticating; valid snapshot/health signatures agree, missing assets return 404.
- F9 debug is off initially, displays exact walls/props/gates/player circle in development, and cannot be enabled in production. It was actually inspected through Vite in Chrome.

Inspected screenshots in the workspace:

- [Desktop HUD](screenshots/collision-journal/journal-hud-v4.png)
- [Task journal](screenshots/collision-journal/task-journal-v4.png)
- [Expanded map](screenshots/collision-journal/expanded-map-v4.png)
- [Development collision overlay](screenshots/collision-journal/collision-debug-v4.png)
- [Landscape touch journal](screenshots/collision-journal/journal-touch-v4.png)

The [fresh generated evaluation](../reports/wings-v4-collision-evaluation.json) uses 8 held-out scenarios, 6 successful timed pairs, Brier 0.25 and zero matched recommendation time improvement. It is not visitor data or evidence of improved recommendation accuracy. Historical versions remain excluded from current runtime evaluations.

## Remaining acceptance limits

Browser checks use headless Chrome on Windows and emulated touch. Physical iOS/Android devices, booth LAN packet loss, audio listening, sustained performance and visitor pacing still require on-site acceptance. The debug overlay is for development and does not expose live threat locations. Existing Pokémon remain depth-tested billboard artwork.

This revision used isolated test databases and did not modify the production database, credentials or run a deployment.
