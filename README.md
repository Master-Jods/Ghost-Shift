# POKÉMON: GHOST SHIFT

A runnable cooperative research game for two real trainers and one operator. Players use a first-person WebGL facility view (with a labeled compatibility fallback); the operator watches a separate overhead facility map and manually introduces encounters and emergencies. The Node HTTP/WebSocket server owns collision, timers, team validation, resources, previews and outcomes. React/TypeScript/Vite supply the clients; SQLite stores the session history.

## Red industrial / visible analytics revision

The current experience includes a player manual, required illustrated briefing, real power/calibration choices, contextual encounter help, consequence receipts and visible Field Analyst guidance. See [revision and verification](docs/INDUSTRIAL-REVISION.md) and the [task QA matrix](docs/TASK-QA-MATRIX.md). Both trainers acknowledge the briefing after finalizing their teams; the operator starts afterward.

## Open-space facility revision

The open-room organization, edge-mounted room equipment, controlled yaw/pitch, shared wing layout, upper-right minimap, full player settings, handheld scanner, confirmed-action animation and optional spatial procedural audio are documented in [docs/PRESENTATION.md](docs/PRESENTATION.md). Player Settings provides sensitivity, render quality, reduced motion/flashing, post-processing and separate Master/Effects/Ambience controls. Audio starts muted and requires an explicit interaction. The latest room-by-room before/after audit is in [open-space verification](docs/OPEN-SPACE-VERIFICATION.md).

## Run on Windows

Use Node 22.14+ (Node 22 prints an experimental SQLite warning).

```powershell
Set-Location -LiteralPath 'C:\Pokemon Day - Among Us'
npm.cmd ci
# Keep your existing private .env and existing operator credentials.
npm.cmd run db:migrate
npm.cmd run operator:create
npm.cmd run build
npm.cmd start
```

Stop any previous server with Ctrl+C first. `operator:create` preserves an existing account and password. A new installation needs a private `.env`, based on `.env.example`, with OPERATOR_USER and OPERATOR_PASSWORD set. Passwords are hashed with scrypt; there is no public default password. Do not replace an existing .env or delete the database.

Production player entry: http://localhost:8787/play. Operator: http://localhost:8787/operator. Sign in, create a session, and copy the generated GS-prefixed code or the per-trainer invitation links. No join code is hardcoded. Browser refresh retains the owned slot in that tab. A separate tab/context/device is needed for each identity.

For development, `npm.cmd run dev` starts the backend and Vite; use http://localhost:5173/play and /operator. Production serves the built frontend directly on port 8787.

## Three devices

Host and all three browsers must share a reachable LAN. On the host, use `ipconfig` to find its LAN address, then open `http://HOST-IP:8787/operator` on the operator device and `http://HOST-IP:8787/play` on each player device. Permit Node/port 8787 through the host firewall. HOST defaults to 0.0.0.0. Configure ALLOWED_ORIGINS for additional split frontend origins; same-origin host URLs work directly. Trusted HTTPS certificates may be configured with TLS_CERT/TLS_KEY. Fullscreen, pointer lock, audio and installability depend on browser permissions and secure-context rules; keyboard/touch gameplay remains available without fullscreen.

The operator creates a room. A joins slot A; B joins slot B. Each selects exactly three distinct catalog entries, finalizes the team and marks ready. Both real player sockets and current briefing acknowledgments are required before the operator starts. Briefing and the three-second countdown are outside active mission time. A round starts with no threats and does not require any injection to be completable.

## Player controls and objectives

- WASD or arrows: movement relative to camera; mouse look via the world or Mouse look button.
- E / Interact: face a nearby terminal or encounter. Q: companions. TAB / Tasks: detailed task journal. M: expanded map. F: flashlight. Escape: release pointer lock and close local panels.
- Touch: left movement joystick, drag right side to turn, on-screen Interact and utility buttons. Use landscape. Settings include reduced camera motion and optional encounter sound cues.
- One companion follows visibly; two stay in reserve. Switch available companions through the HUD or team panel. Engaged, assigned, recovering or exhausted companions cannot be freely swapped into conflicting work.
- Every species can Assist, Scout, Guard, Battle and Contain. Official base-stat metadata gives only a bounded 0.85–1.15 custom modifier; offline metadata uses 1.0. No species, type or exact roster is required.

The shared facility has 16 rooms arranged around a central hub, western reactor/medical wing, eastern lab/navigation wing and southern storage/extraction loops, with optional task gates and temporary seals. The first-person renderer, overhead map, legal movement, pathfinder and incident placement use `src/world.ts`. Wall-mounted entrance signs, the upper-right geometry-based minimap, expanded M map and objective tracker guide players.

Each round selects 3–6 normal objectives from circuit sequences, signal tuning, gauge calibration, valve sequences, data transport/upload, access-code restoration, fuse selection and dual stabilization. Terminal target values are explicit. Errors can be retried. Cooperative stabilization uses separate trainer controls within a 12-active-second window and resets safely if missed. Companion assistance advances a sequence step where applicable but never replaces its final terminal interaction.

Finish required tasks and all currently blocking incidents, then both trainers physically enter the extraction airlock. A trainer who extracts waits there; the outcome is joint. The maximum is 300 active seconds. Global/operator/disconnect pauses exclude time; local overlays and forecasts do not pause either trainer. Adding an event never extends the deadline.

## Live Director

Open Live Director during an unpaused active shift. Choose a specialized Pokémon, search the full catalog for a generic normalized encounter, or choose a facility emergency. Set target, severity, duration, scope and extraction-blocking status. Click the operator map for explicit Pokémon placement, or use server-owned trainer facing for a visible point in front of A/B. Emergency controls use their designated facility room; their preview map shows the actual response location.

Preview shows known effects, resources, authoritative placement/validation, conditional Monte Carlo results, alternatives and partner impact. Confirm revalidates the current state. Stale previews, walls/props, protected arrival/extraction placement, budget/cooldown violations, exhausted active-event limits and infeasible emergency response windows are rejected with a reason. Each injection consumes one event-budget unit; cancellation does not refund it. A configurable 0–30 second cooldown, bounded active threats/emergencies, and 15–120 second event duration prevent unbounded stacking. Pokémon have a three-second telegraph before environmental effects or combat actions.

Players must perform real response actions; dismissing an alert resolves nothing. Cancel incident is an explicitly logged operator recovery action. Expiry is recorded separately as a threat expiration or emergency deadline miss; bounded automatic safe recovery clears its effect. It never silently counts as a successful response.

### Threat behaviors (custom game rules)

| Pokémon | Effect | Universal counterplay |
|---|---|---|
| Gengar | Decoy silhouette/signature | Scout, then prepare containment or battle |
| Haunter | Periodic nearby ambush stamina pressure | Guard and counter, or retreat |
| Gastly | Local visibility fog | Scout clears effect |
| Rotom | Nearby terminal interference | Assist suppresses jam |
| Chandelure | At most three energy siphons; reserve never below two | Assist, contain or leave zone |
| Darkrai | Nightmare tint and bounded fatigue pulses | Guard, contain or retreat/recover |
| Mimikyu | Concealed encounter signature | Scout before offensive action |
| Banette | Nearby recovery-item tool disruption | Guard/Contain remain available; Assist suppresses |
| Dusknoir | Pursuit within a bounded origin radius | Guard, contain or leave its territory |
| Froslass | Local movement slowdown | Scout breaks frost |
| Spiritomb | Temporary optional-shortcut seal | Assist removes seal; other loops stay connected |
| Zoroark | False silhouette and unverified signal | Scout identifies the authentic target |

Every attack/contain attempt needs a preceding Guard or Support, an identified target, proximity, an available selected companion and a 1.5-second action cooldown. Preparation is consumed per attempt. Support restores bounded stamina; containment and battle have independent progress. Retreat frees only that trainer, never freezes the partner. Other catalog Pokémon use a clearly labeled generic encounter.

### Emergency mechanisms

| Emergency | Response location / mechanism | Expiry recovery |
|---|---|---|
| Blackout | Electrical: indicated circuit sequence | Backup lights; bounded affected-companion stamina pulse |
| Communications interference | Communications: relay reset and tuning channels | Relay clears; recorded missed. Partner quick-signals unavailable during affected interference |
| Reactor instability | Reactor: separate A/B stabilizers within 12 seconds | Safe bypass; one energy only if above reserve |
| Coolant failure | Cooling: valve sequence; nearby movement slows | Frost clears |
| Containment leak | Containment: separate A/B isolation nodes | Safe isolation and bounded stamina pulse |
| Door lockdown | Security: access mechanism; alternative loops remain | Temporary gate releases |
| Research corruption | Archive pickup, then actual transport to Communications | Corrupted fragment isolated; normal dataset retained |
| Power overload | Electrical: propose shared power, partner approves, then reset | Safe trip, no permanent resource reservation |

Solo mechanisms support A, B or either trainer, and a both-control variant. Reactor/leak require both. Both-control emergencies use two distinct positions. Balanced overload costs two energy; priority bypass costs one and adds a reset step. Previews and approvals check the event, proposer proximity and current shared resources again. Approval expiry does not reserve power.

## Persistence and recovery

`server/migrations/002-ghost-shift.sql` adds catalog records, selected teams, normal tasks, incident instances, director commands and Ghost Shift metrics. Migration is automatic on server/CLI startup and idempotent. Schema 3 / scenario ghost-shift-wings-v5-decisions / protocol 6 supersede the old scenario. Previous sessions are archived and remain exportable; old scenario forecasts/evaluations are excluded from Ghost Shift analytics. Existing operators, hashed passwords, login records and historical rows are preserved.

The existing `data/jigsaw.sqlite` filename is retained deliberately to avoid abandoning your database; it is a compatibility path, not the current product name. `npm.cmd run db:backup` creates a consistent SQLite backup. Do not copy/delete live SQLite WAL files as a reset mechanism.

Commands use participant sequences and idempotent command IDs. Confirmations, spending, snapshots and meaningful events commit transactionally. Position/render frames are not stored as event spam; timed snapshots preserve movement and orientation. A lost device reconnects to its owned slot. After disconnect grace, a mission pauses safely; operator resumes when appropriate. Server restart restores active incidents and timer state safely paused. Resolved/cancelled threats do not respawn. Operator can cancel a bad incident, release a stale slot through the session API, or open a new room.

## Complete catalog and assets

The checked-in complete PokéAPI `/pokemon` index currently contains 1,351 entries, including alternate Pokémon varieties exposed by that endpoint. It is not limited to the first response page, and `/pokemon-form` is a separate API resource outside this picker scope. Search operates on the full cached index; only 12 cards and three concurrent detail requests render/load at once. Each player selects exactly three distinct valid IDs, and the server uses canonical records. Duplicates, invented IDs and forged stats are rejected. Both trainers may share the same species.

`npm.cmd run catalog:refresh` follows all API pages and validates count/uniqueness before updating `public/catalog/index.json`. `node scripts/cache-assets.mjs` refreshes optional official artwork/sprites and metadata for the 34 bundled entries; this asset set does not restrict selectable teams. Detail requests have timeouts, a seven-day database cache, official bundled records and neutral offline fallback. Artwork falls back to sprite then a labeled placeholder. Official API documentation: https://pokeapi.co/docs/v2#pokemon. Internet is needed for uncached remote artwork/metadata, not core booth networking or full-index search.

## Analytics and evaluation

Descriptive/diagnostic screens read persisted gameplay, actual incident response timestamps, movement/task interaction time, resources, event traces and intervention cohorts. Task interaction seconds count server-accepted terminal attempts (including logged calibration mismatches) at one modeled second per attempt; movement seconds count actual server displacement. Coordination delay is a union of active approval/cooperative waiting seconds; individual categories may overlap. Blocked-route input seconds are reported separately. Response time is activation until first qualifying response; resolution time is activation until successful resolution. Deadline misses and cancellations remain distinct. Completion-time averages and observed forecast MAE use successful outcomes; deadline-success denominators retain incomplete outcomes.

Predictive uses seeded Monte Carlo **legal continuations through the actual reducer and collision map**, with bounded reaction delay and movement pace. `ghost-shift-wings-v5-decisions-mc1` assumes **no further unknown manual injections**. It reports successful remaining mean and central 80% range, deadline success, incomplete samples, emergency resolution time and shortage risk. It does not predict arbitrary operator behavior. An estimate of 100% is a small generated sample result, not a guarantee.

Prescriptive compares responder/priority routes, battle versus containment, selected/strongest/stamina companion strategies and balanced/priority power using matched random seeds. It reports Best Plan Found, not a proven global optimum. Accepting guidance requires a fresh authorized plan and consequence confirmation; it logs replanning latency and leaves actual movement/actions to the humans. What-if computes on cloned state and explicitly preserves the live round. Jobs are bounded, cancellable and owned by their requester.

`npm.cmd run analytics:evaluate` generates `reports/evaluation.json` and stores a new versioned report. EVALUATION_SEEDS controls held-out count. The report separates tuning smoke seeds from whole held-out scenarios and compares simple completion/deadline baselines. Half the observed generated runs use predefined standardized events while the forecast assumes none; that distribution shift is explicit. Manual human runs and standardized/generated evaluation must not be pooled. No real visitor calibration or measured five-minute pacing is claimed. See [current generated results and caveats](docs/ANALYTICS.md); `reports/evaluation.md` remains historical.

Intervention cohorts: no injection; low (at most two interventions and injected severity total at most four); high otherwise. Compare severity, assisted companion work, advice use and event outcome alongside timing. History provides actual JSON/CSV export. The operator Analytics view includes provenance, cohort counts and observed forecast/outcome pairs.

## Verification

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Core/server tests cover complete-catalog validation, arbitrary teams, all supported threat counterplay, solo/cooperative emergencies, actual map connectivity, collision/placement, authority, telegraph, limits, deadlines, expiry cleanup, persistence, duplicate commands and physical joint extraction. Browser tests create an isolated database and real authenticated operator/A/B browser contexts, select alternate entries beyond the first catalog page, drive actual keyboard/mouse inputs, inject/contain a threat, respond cooperatively after reconnect and complete assignments/extraction. Test databases never replace the booth database. Visual captures are under ignored `.qa/ghost-*.png`.

Physical-device acceptance remains separate: run two real phones/tablets plus operator on the booth LAN, check touch/mouse/fullscreen/audio behavior, disconnect/rejoin during an incident, and measure visitor comprehension/pacing. Browser emulation and headless bots do not establish those results. The facility now uses solid WebGL geometry; Pokemon retain depth-tested billboard artwork with available front/back views. Incompatible old map sessions are archived on startup; create a new shift code. Local/simulated demo modes from the previous scenario are not offered in this release; use two real players or automated tests.

Environment organization and current equipment/control layout: [Open-space facility](docs/OPEN-SPACE.md).

Current collision/minimap/task journal changes, verified root causes, controls, update behavior and evidence: [Collision and journal verification](docs/COLLISION-JOURNAL-VERIFICATION.md).
