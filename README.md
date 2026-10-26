# Pokemon: Among the Shadows

Display branding is now **Among the Shadows**, with global danger sirens for operator-injected Pok?mon and emergencies. [Current changes and verification](docs/AMONG-THE-SHADOWS.md).

First-person hands are removed, and cloud movement now combines input/snapshot updates with bounded camera prediction. The function region matches the existing US East database. [Movement changes and verification](docs/CLOUD-MOVEMENT.md).

Two networked trainers, six normal tasks and a maximum of 300 active seconds in an expanded horror research facility. Each trainer chooses three distinct catalog Pokemon. Any valid team can finish every mandatory puzzle. There is no stamina or shared-energy system.

## Task equipment UI

Coolant readings and valve controls are separated, with immediate local feedback, pinned readings and stable drag/retry layouts. All six normal tasks and eight emergencies have been exercised through real controls. [Current task UI audit and screenshots](docs/TASK-EQUIPMENT-QA.md).

## Current character and room revision

The full 1,351-entry catalog uses imported textured GLBs wherever an accepted exact species/form is available. **1,108 entries have 3D models**, with **221 native locomotion** and **249 native attack** mappings. Missing clips use original runtime skeletal/root motion; these are distinguished from native game clips. **243 variants retain an explicitly labeled exact-ID 2D fallback**. The picker offers a 3D-only filter. Ten commonly used models are bundled; others load lazily from pinned public sources. Original horror music, button sounds and independent music/effects/ambience controls are available from the first browser interaction. [Current verification and limitations](docs/MODELS-AND-MUSIC.md).

The user explicitly selected public game-derived assets for this non-commercial school/community prototype. Pokemon owners retain asset rights; public availability and code licenses do not grant model redistribution permission. The source/rights notice ships in the lobby and operator diagnostics. [3D coverage, source revisions, actual screenshots and validation](docs/PUBLIC-3D-MODELS.md). Prior creator-credited sprites remain fallback; the earlier procedural rigs remain removed.

Room IDs and connections remain stable, with Pokemon identities including Professor Oak's Research Lab, Nurse Joy's Pokemon Clinic, Rotom Relay Station and Power Plant Control. Lab/clinic furniture footprints are canonical across collision, navigation, camera and maps. The Nurse Joy figure is non-graphic environmental storytelling; no hostile is automatically spawned. The [previous room revision](docs/POKEMON-CHARACTERS-AND-ROOMS.md) documents room geometry; its procedural character counts are historical.

## Vercel deployment

The cloud entry point uses external PostgreSQL for shared live rooms, accounts, profiles, analytics and logs. One Vercel URL serves both players and the operator. SQLite remains available for local/LAN play. See [cloud setup, SQLite import and verification](docs/VERCEL-DEPLOYMENT.md). Set `DATABASE_URL` and private operator credentials in Vercel before deploying; no live infrastructure is provisioned by the code change.

## Run locally

Use Node 22.14+ and npm. The SQLite experimental warning on Node 22 is expected.

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run operator:create
npm.cmd run build
npm.cmd start
```

Keep operator credentials in the private `.env`; do not commit that file. Existing operators remain valid. The default server listens on port 8787: open `http://localhost:8787/operator` and `http://localhost:8787/play`. The operator creates a session, shares its join code, waits for both finalized three-Pokemon teams and current briefing acknowledgments, then starts the shift. Both player terminals must be connected.

For development, `npm.cmd run dev` starts the existing client/server workflow. Settings, audio, camera orbit, task tracking, TAB journal, the labeled minimap and operator overhead map remain available.

## Current gameplay

Every playable round initializes exactly these six normal tasks:

1. **Electrical Wiring:** four saved endpoint matches using channel letters and colors, followed by a circuit test. Incorrect wires are identified while valid progress stays saved.
2. **Door Power Routing:** choose Shortcut A or B, configure the three circuit selectors, then validate. Powering one route closes the other. Return to Electrical to switch again.
3. **Communications Calibration:** tune the displayed frequency and phase together, then verify alignment.
4. **Coolant Control:** tune three interconnected valves. Pressure, flow and return-temperature readings change together; each displayed safe range is validated by the server.
5. **Research Data Transport:** retrieve the module at Archive, carry it physically to Communications, then verify the three-channel checksum. Carried data and puzzle progress survive reconnect.
6. **Dual Stabilization:** both trainers complete their own local setup, then activate separate controls within 12 active seconds. A missed window resets activation, preserving local setup.

The displayed trainer is a suggested parallel assignment; either trainer can help with solo mechanisms. Paired mechanisms still require distinct authenticated trainers. A companion may assist one wire substep, but never skips the whole puzzle.

No hostile Pokemon spawn automatically. Operator emergencies and encounters are additional incidents, counted separately from the six normal tasks. Severity increases incident reset steps or paired rounds. Neither injections nor decisions extend the deadline. Both trainers must physically enter the extraction arrival region after all six tasks and extraction-blocking incidents are cleared.

## Doors and visible tradeoffs

Open **Routes** or the map's door-controls panel to inspect each lock, its control room and the available fallback.

- **Guardian shortcuts:** the operator explicitly links an encounter to an eligible nonfinal gate. Defeating that guardian in battle restores access. A longer connected route remains available. Occupied gates cannot be sealed.
- **Shared override key:** the team starts with one key. At an eligible access/latch control, spend it for immediate access or preserve it and finish the normal unlock. An override does not complete any normal task. Server confirmation revalidates the key atomically.
- **Switchable shortcuts:** route A and route B are mutually exclusive. Switching requires returning to Electrical; closures onto either trainer are rejected.
- **Companion-held passage:** leave one Pokemon maintaining the west mechanism, switch to an available reserve, or complete the three-stage latch repair for permanent access. Busy Pokemon cannot join another mechanism or encounter. Recall cannot close a gate onto a trainer; a fallback remains connected.
- **Extraction:** gates cover the complete canonical entrances. Once released they stay open, so a late blocking incident cannot trap a remaining trainer inside. The extraction eligibility check still blocks escape until required incidents clear.

## Map and measured balance

Rooms, corridor floors, boundary walls, doors, collision, navigation, task anchors, both maps and camera obstruction derive from the shared canonical geometry in `src/world.ts` and `src/layoutGeometry.ts`. Small horror decals and debris have no hidden movement colliders. Movement remains 185 world units per second at full input.

The historical v8 `reports/route-trials-balance.json` records legal movement traces. A representative Electrical-to-Medical route takes **9.24s through Shortcut A** and **26.27s through the fallback** (Electrical > Workshop > Security > Arrival > Medical). These are measured examples, not hardcoded gameplay or analytical constants. Journal/minimap routes follow actual walkable paths.

The same report records the fastest observed automated legal continuation, explicit puzzle/reaction assumptions and bounded-injection cohorts. Automated results do not replace real visitor playtesting. The six-task rule design is documented in [the gameplay revision](docs/ROUTE-TRIALS-REVISION.md); its v8 timings/evaluation are historical. Current character/room validation is recorded in the new revision report.

## Live analytics, critical incidents and battles (v10)

Player predictions use a fast route/workload timing Monte Carlo directly on the authoritative server. Four responder/route schedules are compared using 64 matched timing samples each. The panel shows conditional extraction probability, successful remaining time/range, emergency deadline risk and an ordered two-trainer sequence. Current tasks, progress, canonical paths and incident deadlines drive the schedule. Changes invalidate old results immediately; factual instructions appear while numeric estimates refresh. Stable estimates refresh every five seconds and expire after ten active seconds. These timing assumptions are not visitor-calibrated or a full battle/reducer simulation; future operator injections are unknown. The old detailed reducer audit remains an offline tool with a separate model version.

Both players receive an injection announcement with a pulsing red screen edge. Every injected emergency is blocking and has exactly **60 active seconds** to resolve. Missing that deadline immediately fails the session. Emergency terminals explain the response inputs, transport or paired controls. Pause freezes active clocks. Pokemon encounters keep their own operator-selected timer; their expiry does not apply the emergency-loss rule.

Battles run the actual server-side **Pokemon Showdown simulator (`@pkmn/sim` 0.10.11)**: Gen 9 custom singles, three companions versus one injected opponent, level 50. Players select source-learnset moves or healthy reserves; Showdown resolves PP, HP, accuracy, type effectiveness, abilities, status and fainting. Actual turn results drive native model attacks and typed effects. Retreat preserves that encounter's progress. Some cosmetic forms map to a compatible simulator form, disclosed in the battle panel. This is not the full Showdown online client. Source assets retain their existing source/rights notices.

Gameplay now uses a **first-person eye-level camera**. The partner and Pokemon remain visible; the local follower fades only when overlapping the camera. The operator Analytics page is a live dashboard with four KPI cards, completion funnel, actual outcome donut, response matrix, predictive comparisons, prescriptive sequence and a cloned Monte Carlo sandbox. Empty metrics stay empty until records exist.

See [implementation, verification and limitations](docs/V10-CRITICAL-INCIDENTS.md).

## Versions and saved sessions

- Scenario: `ghost-shift-v10-critical-incidents`
- Map: `aster-wings-v9-pokemon-rooms` plus its unchanged canonical geometry signature
- Protocol: `8`
- Live model: `ghost-shift-v10-route-workload-mc1`
- Offline reducer audit: `ghost-shift-v10-reducer-audit-mc1`
- Briefing: `critical-incidents-briefing-10`

Restart the host and create a **new shift** after updating. Incompatible saved sessions are archived with their snapshots, credentials and history preserved. Do not reset the database. Refresh both player tabs and the operator tab to load the new service worker and frontend.

## QA and evaluation

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npx.cmd tsx server/balance-report.ts
npm.cmd run analytics:evaluate
```

Unit coverage includes all six mechanisms, recoverable wrong inputs, activity-based availability, safe door closures, key spending, guardian links, map/camera geometry, authoritative deadlines, networking, persistence and archived versions. Browser fixtures distinguish controlled mechanism/room inspections from the separate complete two-client keyboard traversal. See current reports and `docs/ROUTE-TRIALS-REVISION.md` for actual results and limitations.

Older presentation, canonical-layout and analytics reports remain historical references; their accuracy and timing claims do not apply to this expanded six-task ruleset.

## Refresh and validate Pokemon assets

Runtime use only needs Node/npm; regenerating assets also needs Python 3.10+ and `python -m pip install -r requirements-assets.txt`.

```powershell
npm.cmd run assets:sync
npm.cmd run assets:validate
npm.cmd run assets:test
```

`assets:sync` fetches pinned source metadata and approved original PNGs, rebuilds every exact catalog entry and audits reference availability. `assets:validate` uses the importer cache offline; a fresh checkout must first run the online sync. `assets:references` can refresh the separate reference audit after deleting its ignored `.qa/catalog-assets/reference-availability.json` cache. Remote HEAD checks establish availability, not decoded artwork or redistribution permission. Approved future GLBs require explicit per-asset evidence in `assets.approved-models.json`. Artist credits are linked in the lobby and operator diagnostics at `/pokemon-sprites/CREDITS.html`.

## Refresh public prototype 3D models

```powershell
npm.cmd run models:sync
npm.cmd run models:validate
npm.cmd run models:test
```

Online sync audits all exact candidates using pinned GLB JSON ranges, updates the separate model registry and downloads six common models locally. Other models remain lazy remote GLBs; internet access is needed on first use and failures retain exact-ID sprite/art fallback. Offline validation requires the ignored importer cache from an earlier sync. This records prototype use; it does not put game-derived models into the separately licensed `assets.approved-models.json` list. Source details: `/pokemon-models/SOURCES.html`.

## Live battle animation

Encounters now show a live 3D/native-sprite battle stage instead of static versus portraits. Native idle, attack and available hit clips use the shared character system; typed projectile, impact, shield and ambient threat effects make confirmed actions visible. The stage remains visible while controls scroll. Actual Showdown moves, PP, HP and faint/switch rules now drive those animations; the mission timer keeps running. [Current battle behavior, limitations and rendered QA](docs/V10-CRITICAL-INCIDENTS.md).

## Fast operator injection

Live Director injection reviews now check authoritative placement/rules immediately, without waiting for Monte Carlo. All 1,351 exact names/types are local, so injection does not wait for PokeAPI either. Confirmation retains current revalidation and the existing Pokemon warning; actual analytics recompute separately from the updated session. [Root cause, measured latency and verification](docs/FAST-INJECTION.md). Maintain the identity bundle with `npm.cmd run catalog:identities` after catalog updates.

## Player registration and operator logs

Players enter Full Name, Block and Group # when joining. The identity persists through reconnect and appears on operator Field team cards. Open **Operator > Logs** for persistent, attributed session/task/Pokemon/emergency/battle/action history, searchable filters, older records and full filtered CSV export. Timestamps include server time and active session seconds. Existing records/credentials are preserved by an automatic additive migration. [Details and verification](docs/PLAYER-REGISTRATION-AND-LOGS.md).

## Current 3D motion and horror music

There are 1,108 accepted textured 3D models; 243 exact catalog variants retain a clearly labeled 2D fallback. The picker has a 3D-only filter. Native source clips are preferred; missing clips use original runtime joint/root motion. Original horror music and button sounds play from the first browser interaction, with independent music/effects/ambience controls and a visible mute button. [Coverage, sources, limitations and verification](docs/MODELS-AND-MUSIC.md).

## Current selection and camera controls

Only the 1,108 verified textured 3D entries are selectable or injectable; the server rejects excluded catalog IDs. First-person view displays hands. Press **9** in gameplay to toggle the behind-the-character third-person camera and press again to return. Camera switching is ignored while typing or using overlays. Audio settings from the old silent version are upgraded once to audible levels; subsequent mute choices remain saved. Sound unlocks on pointer/key gestures, including non-button fields. Hidden tabs stay silent. [Fix report](docs/3D-SELECTION-CAMERA-AUDIO.md).

## Single-hand and expanded audio update

First person now shows one Minecraft-style right arm; key9 still toggles third person. Background music and button feedback are louder, the operator console plays music, editable fields have typing sounds, and accepted battle turns play type-based attack/impact effects plus available real Pokemon cries. Mute and individual buses remain available. [Source research, behavior and verification](docs/SINGLE-HAND-AND-BATTLE-AUDIO.md).

Battle effects now use short recorded CC0 Kenney whooshes/impacts in place of the earlier synth tones. Cries play quietly on entry, with an independent battle sound slider and preview buttons in Audio settings. [Current battle audio](docs/RECORDED-BATTLE-AUDIO.md).
