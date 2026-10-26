## Latest completed: crewmates, sustained alerts, recorded steps and live guidance

- Two original 3D crewmates (red A / cyan B), distance-driven walking with smoothed stop, default first person and key9 toggle preserved; no hands. Reference and license details: docs/CREWMATE-AUDIO.md.
- Danger loops persist for unresolved emergencies and unengaged active Pokemon. Emergency priority; battle engagement stops that Pokemon warning, retreat restores it. Mute/pause/hidden tabs silence and resume reconciles current state. One loop, no restart on snapshots.
- Ten Kenney CC0 recorded footsteps with concrete/carpet surface variation replace synthetic walking noise. Included license/source hashes under public/audio/footsteps.
- Shared live guidance uses current canonical paths/doors, current positions, remaining task work, carrier/paired constraints and urgent incidents. Always visible even if forecasting HTTP fails; completed tasks disappear immediately. Updates countdown text each active second. Position grid changes refresh forecasts without waiting for a room change. Clock refresh and bounded request throttling/retry retained.
- Fast route/workload model mc2 no longer always forces the power task first. Predictive glance leads with ETA, interval, deadline risk/margin and raw sample counts; expanded view includes 30/60-second delay sensitivity. It remains a conditional timing model, not full battle replay or visitor calibration; no global optimality claim.
- Dashboard tab explanation is saved at docs/OPERATOR-DASHBOARD-GUIDE.md. User requested this explanation urgently and received it in chat.
- Verification: production build, native cloud ESM health/login runtime check, 148 regression tests passed / one optional PostgreSQL test skipped. Browser tests passed for crewmates/recorded footsteps, sustained alarm/battle entry/retreat/cancellation, real task completion while forecast API fails, dashboard forecasting/live battle/fatal deadline and emergency instructions.
- Reports: reports/crewmates-audio-qa.json, reports/among-shadows-danger-qa.json, reports/live-guidance-qa.json, reports/v10-browser.json. Gameplay screenshots were inspected; audio output was measured, no human listening QA claim.
- Not pushed or deployed. Current service-worker cache: among-shadows-crewmates-audio-26.

## Latest completed: landing registration and replacement danger audio

- Removed Group # from player landing form; Full Name and Block remain required. Shared server/client validation accepts an omitted/blank group, while retaining legacy group values in existing records.
- Replaced the sweeping oscillator siren with original pre-rendered two-note warning pulses, a subdued low impact and quiet room reflections. Emergency and Pokemon alerts differ, start immediately without downloads, and preserve mute/cancellation/no-snapshot-replay behavior.
- Bumped service worker cache to among-shadows-registration-alert-25.
- Verification: production build, 12 local/cloud server tests, waveform bounds/envelope test, and both real-browser registration/log attribution and two-player injection-audio tests passed. Browser audio output was measured; no human listening review is claimed.
- Changes are local, not pushed/deployed by this task.

# Latest work: coolant controls + complete task UI QA (2026-10-26)

User reported coolant slider/flow mismatch and requested UI/spacing QA of every task. Reworked TaskMechanism: separate coupled readings from named inlet/bypass/return valves, native immediate onInput + keyboard + exact0-3 buttons, fixed reading/control geometry, pinned gauges, persistent retry-feedback footprint (no mid-drag shift), structured target cards, clear wire/socket stages, real signal units, saved/pending/retry feedback and carrier restriction. TaskPanel now returns the input promise so repeated submissions are disabled until response. Completion state has a saved header/action. Extracted EmergencyMechanism with live timer, channel steps, paired readiness, approval plans, pending/rejection flow and resolved-safe status. New taskEquipment.css imported last; consistent spacing/width/scrolling/sticky close, foreground task notices for new emergencies, preview z-order preserved. No rule/DB/env changes. Cache ghost-shift-task-equipment-24.

QA: all6normal +8emergency actual Chrome control completion, wrong answers/retries; layouts1366x768/1024x768/844x390 all no horizontal overflow or overlapping controls. Native coolant drag, coupled flow output, keyboard solution, preserved draft across snapshots, stable second drag after invalid validation verified. Non-carrier upload restriction, cooperative missed-window retry, overload local bypass rejection->approval and extra reset passed. New emergency notice remained visible with usable coolant controls. Separate full two-browser keyboard-travel round passed, including carried-data reload and joint extraction,145 active seconds. Form audits stage terminal positions; full round does actual travel. Unit/server143pass/0fail/1optional skip, finalbuildpassed, no browser pageerrors. Screenshots inspected. No human listening/visitor pacing or live-deployment claim.

Artifacts: docs/TASK-EQUIPMENT-QA.md, reports/task-equipment-{qa,normal-qa,emergency-qa,variants-qa}.json, reports/route-trials-browser-run.json updated; screenshots docs/screenshots/task-equipment/. Tests tests/task-equipment.spec.ts (4 focused scenarios), helpers now use actual keyboard range input rather than fill. No commit/push/deploy performed; user must run npx.cmd vercel@latest --prod --archive=tgz and refresh.

---

# Latest work: remove hands + cloud movement (2026-10-26)

User requested no hand and smoother cloud movement. Removed firstPersonHands.ts + obsolete unit test, all renderer hand creation/update/disposal; updated camera/audio browser checks for zero hands and retained key9. Added bounded MovementPrediction (shared collision, immediate local camera only, acknowledged server reconciliation, stalls stop at500ms, authority untouched). NetworkTransport exposes current input/last acknowledgement/RTT; local+cloud snapshots carry optional lastCommandSeq. PlayerApp sends immediate key transitions, held refresh10Hz, orientation only on change, no idle packets or keyboard autorepeat packets.

Cloud socket coalesces latest pending INPUT/LOOK, captures batches at enqueue time to preserve consequential action order, combines frame/heartbeat/snapshot. Cloud room still row-locked; after-lock identity/player/DBclock read consolidated; save CTE persists sequence+heartbeat atomically with room. Basic frame3 SQL calls in transaction + BEGIN(settings) + COMMIT. No independent function room cache. Verified real PostgreSQL fast frame across3pools.

Important observed region mismatch: private DATABASE_URL hostname region derived safely as us-east-1; earlier live logs sin1. Configured api/cloud.ts regions=[iad1] to match current Neon database; official Vercel schema passed. No credentials/host URL printed or env edited. No production DB writes, deployment, commit or push for this task. User must redeploy archive command and refresh clients. Cache ghost-shift-hand-free-movement-23.

Validation: production build passed, full suite143pass/0fail/1optional skipped; focused10pass; realPG1pass; native emitted Node health/login smoke passed; cloud3-terminal Chrome smoke + delayed movement Chrome passed; camera toggle/audio/cache Chrome3pass. Delayed test360msRTT+8ms/query: camera21.59 units before server received input (server0 at100ms),52movingrenderframes,max9.71unit framejump, no idle traffic or pageerrors. No live post-deploy latency claim. docs/CLOUD-MOVEMENT.md, reports/cloud-movement-qa.json, docs/screenshots/movement/hand-free.png inspected. Follow-up local final build/browser pass checks may update numeric timings.

---

# Latest follow-up: stale title cache (2026-10-26)

User screenshot still showed GHOST SHIFT. Direct live HTTP checks of /horror/title.svg and / returned Among the Shadows; live /sw.js already version21. Local fix: new title asset path /horror/among-the-shadows-title.svg; title/legacy path/manifest now network-first with cached offline fallback; optional preload failures cannot block new SW installation; cache ghost-shift-brand-cache-22. Production build passed; tests/brand-cache.spec.ts passed with seeded obsolete SVG entries and offline fallback. No deployment/push performed. Immediate user remedy: Ctrl+Shift+R/Incognito for already-live new branding; deploy local cache hardening via normal archive command.

---

# Latest work: Among the Shadows + global danger alarms (2026-10-26)

User requested Ghost Shift -> Among the Shadows throughout the system and danger audio with Pok?mon/emergency injection red lights. Implemented shared branding.ts; player entry/lobby/HUD, operator sign-in/sidebar/history, browser title, PWA name, SVG title artwork, displayed scenario name and export filenames updated. Kept internal scenario IDs/versions, settings and session keys stable. Package display slug is among-the-shadows (package and lock root matched). SVG text fitted within original layout; actual title/player screenshots inspected.

Added IncidentAlarmTracker and root mixer danger sirens: fresh authoritative incident IDs, once per client, global audible range, lower Pok?mon vs higher emergency pulses, master/effects/mute/hidden/paused/finished/resolution cancellation, no snapshot replay. Spatial renderer no longer duplicates old materialize/emergency beep; original issue was the 750-unit cutoff/distance attenuation. Existing battle foley unchanged. SW cache ghost-shift-among-shadows-danger-21. Public audio source notice includes original sirens.

Validation: full suite 140 passed / 0 failed / 1 optional skipped; build passed; native compiled Node health/login smoke passed; two-player Chrome alarm/branding test passed with actual waveform, remote distance2097.9, mute/no replay, resolution, both alert types, no page errors. Added docs/AMONG-THE-SHADOWS.md, reports/among-shadows-danger-qa.json and docs/screenshots/among-shadows/{title,player}.png. Updated existing entry browser test title expectation. No human listening claim. No commit/push/deploy performed; user must redeploy with npx.cmd vercel@latest --prod --archive=tgz and refresh to see live changes. Private env/database untouched for this task.

---

# Latest live login recovery (2026-10-26)

User's cloud password reset hit a 10s connection timeout. Safe connection diagnostics (secret values not printed) showed valid Neon pooled URL/DNS; initial TCP attempt timed out, subsequent authenticated query succeeded. Cloud CLI now allows a 30s connection timeout; runtime retains its existing 10s setting. No SSL verification was disabled.

Actual cause of incorrect credentials was an absent account, not an existing password mismatch: configured username operator had no row; gs_operators was empty; live health setupRequired=true. Ran authorized cloud:operator using private local env values (not printed), then cloud:operator:check confirmed accountExists=true/passwordMatchesEnvironment=true. Live https://among-the-shadows.vercel.app/api/health returned200 and setupRequired=false. A real login request using those env values returned200; temporary verification login was immediately logged out. User can now log in with username operator and their local env password. No env file edited, existing accounts overwritten, sessions/logs cleared, or deployment/push performed. CLI/store change typechecked successfully.

---

# Latest deployment fix: native Node ESM imports (2026-10-26)

Live Vercel Runtime Logs confirmed `ERR_MODULE_NOT_FOUND` for `/var/task/server/cloud/app` from `api/cloud.js`, causing both health and operator login to return platform 500 before any credential check. Corrected all relative imports in the transitive cloud dependency graph to explicit `.js` (TypeScript bundler resolution maps these to source .ts). Vercel function includeFiles now explicitly bundles public/catalog/pokemon-assets.json, required at Showdown module initialization. Prior config fixes remove UTF-8 BOM from vercel.json/.vercelignore and use string brace globs for includeFiles/excludeFiles. No private env/DB changed.

Added `npm run test:cloud:runtime`: emits JavaScript, starts the native Node ESM app with isolated PGlite, checks catalog packaging, migrations, health and operator login without tsx or Vite. Native smoke passed. Redeploy with `npx.cmd vercel@latest --prod --archive=tgz` before retrying the live URL. No new deployment/push performed by this fix.

---

# Current handoff: Vercel + external PostgreSQL (2026-10-26)

Implemented in `C:\Pokemon Day - Among Us`. `api/cloud.ts` exports a Node HTTP/ws server; `vercel.json` routes the frontend/API/upgrade requests. `server/cloud/` contains PostgreSQL schema, pooled store, shared room service, cloud API, CLI, read-only SQLite importer and isolated real-PostgreSQL test runner. The local SQLite/LAN entry point remains intact.

Every cloud room operation uses a PostgreSQL row lock, database clock and atomic state/command/log commit. State, native battle serialization, previews, proposals, ownership leases and analytics jobs are durable across function instances. Snapshot refresh is 5 Hz per terminal. Finite WebSocket connections rotate/reconnect; command retries are idempotent. Shared sorted-JSON fingerprints fix PostgreSQL JSONB property-order changes. Player snapshots redact private battle state. Source SQLite is never opened by the cloud runtime.

Setup instructions: `docs/VERCEL-DEPLOYMENT.md`. Cloud commands: `cloud:migrate`, `cloud:operator`, `cloud:start`, `cloud:import -- PATH_TO_BACKUP.sqlite`. Import BEFORE account bootstrap into an empty cloud database to preserve operator identity. Compatible active imports pause safely; old scenarios and every source table remain archived. Existing passwords/cloud states are not overwritten. `.env.example` has commented cloud settings; `.vercelignore` excludes secrets/local databases.

Verification: full regression 135 passed / 0 failed / 1 optional test skipped; final focused cloud suite 5 passed; separate real PostgreSQL test passed across three TCP pools, including native Showdown persistence and duplicate attacks; Chrome smoke passed across three app instances with two players and operator; final production build passed. Screenshots `docs/screenshots/vercel-cloud/`; report `reports/vercel-cloud-qa.json`. Optional real test command: `npm run test:cloud:postgres`; temporary cluster stays under `.qa` and shuts down gracefully.

Not live yet: user must supply pooled TLS `DATABASE_URL` and private operator credentials in Vercel, enable Fluid Compute and match function/database regions. No external database/project was provisioned, and no deployment, commit or push was performed. Private `.env` and production SQLite were not read/modified. Cloud interactive what-if/forecast/plans use the fast route/workload model with explicit assumptions. Heavy offline reducer evaluation remains a local CLI operation; the cloud rejects attempts to launch it explicitly. No real Vercel latency/capacity claim. SW cache is `ghost-shift-postgres-cloud-20`.

---

# Current handoff: recorded battle sound replacement (2026-10-26)

User disliked live battle sounds. Replaced actual battle playback with11locallybundled recorded CC0 Kenney foley,121004bytes, from creator RPG Audio/Impact Sounds packs. Sourcechecksums/licenses public/audio/battle/. New battleAudio.ts maps attacktypes/hit/guard/recover/faint to short filtered/rate-adjusted samples. No square/sawtooth synth on actual battle path. Bounded4voices, short fades, capped.30-.55s, restrainedgain. Realcryvolume.55->.2timesbattlevolume, max1active, entry/newactivespeciesonly, nevereveryattack. Duplicatelegacyhit/resolve/radiobeeps suppressed. Servercuetiming/idempotence retained; nosoundfabricatedfor misses.

Settings>Audio now has Battle sound volume(.7default) and Test battle attack/Test battle impact previewbuttons. Firstpreview awaitsdecode; mute andbattlevolume0respected. Music/operator/typing/buttons unchanged. public/audio/SOURCES.json updated to distinguish Kenney CC0 effects from Pokemoncryrights.

Buildpassed;131fullunit/server tests;3finalfocused sample/presentation checks;2finalChrome scenarios passed. Actual recorded battle playback,11decoded samples,quieter entrycries,nosnapshot/per-movecryreplay,previewbuttons,battlevolume0 verified. Operator music/typing waveform still passes. Nohumanlistening review claimed; user canaudition previewcontrols. Reports reports/recorded-battle-audio-qa.json and reports/single-hand-audio-{operator,battle}.json; docs docs/RECORDED-BATTLE-AUDIO.md; earlier synthdoc marked superseded.

Restart host/refresh tabs for ghost-shift-recorded-battle-audio-19. NoDBreset/newshift needed solelyforaudio. No .env/productionDB edit, commit orpush.

---

# Current handoff: single right arm and expanded battle/UI audio (2026-10-26)

Completed directly in `C:\Pokemon Day - Among Us`. One Minecraft-style right hand/forearm replaces both hands, angled lower-right and inset to remain visible beside analytics. Key9 thirdperson still hides it. Music gain1.8x slider, defaultmusic.85/effects.95, button gain.22->.65. Settings audioVersion3 raises levels once while preserving explicit version2 mute; later choices persist.

GameAudio now plays operator music and input typing feedback (counts only, no typed text captured/logged). Original typed attack/impact/guard/heal/resolve effects follow actual server battle cues, keyed once by incident/request/side/kind/time. Final winning-turn cues retained; misses do not fabricate hits. Ten real Pokemon cries bundled (1,4,6,7,25,133,197,609,10001,10117), pinned PokeAPI/cries b3a9044bb839b5e3152aaa536c7b463a0fcf0140. Mirror documents Showdown/Veekun/SoundsResource origin. Direct Showdown host returned403; no bypass. Original Showdown client/audio directory researched: BGM/cries present, no per-move attack recordings found. Attack effects are explicitly original synth, not mislabeled imported recordings. Other exactID cries lazy remote,16decoded cache/max2active; missingcry falls back to original effect. Source hashes/rights notice public/audio/SOURCES.json. Pikachu source filename.ogg is actuallyMP3; WebAudio decoded successfully. Correct static audio MIME/404.

Build passed;130unit/server checks passed;4focused Chrome scenarios passed across runs and final2audio reruns passed. All10cries decoded inChrome. Operator music-only and typing-only RMS measured; actualCharizard/Eevee turn plays4effects/2cries, no snapshot replay. Finalrightarm screenshot inspected, nohumanlistening claim. Reports reports/single-hand-audio-{qa,operator,battle}.json; docs docs/SINGLE-HAND-AND-BATTLE-AUDIO.md; screenshots docs/screenshots/single-hand-audio/.

Restart host/refresh tabs for SW ghost-shift-single-hand-battle-audio-18. No .env/productionDB edit, reset, commit or push. Existing1108only selection remains.

---

# Current handoff: mandatory 3D catalog, hands/key9 and audio recovery (2026-10-26)

Completed in `C:\Pokemon Day - Among Us`. Public `/api/catalog` exposes exactly the1108 accepted textured3D models. TEAM/selectedRecords and operator injection validation share the same restricted index. Picker no longer relies on a client-side model filter that could deadlock before registry load. Old full registry remains provenance/diagnostics only.

`firstPersonHands.ts`: camera-attached hands/sleeves, cosmetic motion and disposal. `9` toggles default first-person to prior collision-aware third-person chase rig, unhides trainer and hides hands; returns on nextpress. Typing/repeats/overlays suppressed. Movement and gameplay unchanged.

Audio legacy saved muted/zero levels migrate once through audioVersion2. Pointer/key gestures unlock from form fields too. Visible but unfocused tabs no longer silenced by document.hasFocus; hidden tabs silent. Enable control restores zero master/music/effects. Original horror score/SFX retained.

Build passed;129 unit/server tests and5 targeted Chrome scenarios passed. Hands/thirdperson visuals inspected. Audio tested from old muted zero-volume storage with actual analyser output. Reports `reports/camera-audio-fix-qa.json`, `reports/camera-audio-fix-browser.json`; docs `docs/3D-SELECTION-CAMERA-AUDIO.md`; screenshots `docs/screenshots/camera-audio-fix/`.

SW ghost-shift-3d-camera-audio-17. Restart host/refresh tabs. No DB reset. Prefer newshift if oldteams contain nowexcluded IDs. No commit/push or .env/productionDB changes.

---

# Current handoff: textured 3D motion and original horror score (2026-10-26)

Repository `C:\Pokemon Day - Among Us`. User asked to fix non-3D/static Pokemon and add button sounds plus scary background music. Completed the usable-source/runtime motion/audio work directly; remaining asset gaps are explicitly documented. No push/commit, `.env` edit, production DB reset or stopping of the user's host.

- Final registry **1,108 textured 3D models** (13 added exact forms), **221 native locomotion / 249 native attack** mappings. **243 variants still lack an accepted exact 3D source**; no claim of universal coverage. Added named/explicit textured variants from existing pinned Pokemon-3D-api source. Picker/operator show model availability; optional player 3D-only filter keeps full catalog available.
- A HOME source initially appeared to add 180 files. Visual inspection found missing textures/distorted meshes; those source entries/files were **rejected**, not shipped. Final source lock contains only the prior two accepted pinned source repositories. New material quality gate rejects bare placeholder-only exports. `reports/model-source-audit.json` explains the rejected candidate. Do not restore the untextured HOME manifest or its files from `.qa` research caches.
- `runtimePokemonRig.ts`: native clips take priority; missing clips use original bind-aware skeletal motion, or bounded root motion for unrigged textured meshes. Restores transforms each update to avoid drift; independent instances, reduced-motion support, actual movement/server battle cues; no gameplay/collision/damage changes. Render diagnostics distinguish `native`, `runtime-rig`, `runtime-root`. 887 lack native locomotion and use runtime fallback.
- Bundled model IDs: [1,4,6,7,25,133,197,609,10001,10117]. Remote assets stay pinned/lazy with prior download/checksum/fallback limits. Existing prototype source/rights authorization/credits retained.
- Shared singleton `FacilityAudio` owned by `GameAudio` at app root replaces per-renderer audio ownership. Original procedural horror chord/melody/pulse score, adaptive menu/explore/battle/danger modes, app-wide button/link/change sounds, old positional SFX preserved. Master/music/effects/ambience buses, visible sound toggle, first-interaction browser unlock, focus/visibility mute, bounded voices, cleanup. New defaults enable sound; existing saved mute is honored. Player settings sync through existing audio event.
- Build passed, **128 unit/server tests passed**, **4 Python model tests passed**, all1108 metadata records validated offline. **5 unique focused Chrome scenarios passed across runs**; final two visual/audio reruns passed. Real analyser RMS verified music-only and button-only output/mute; no human listening claim. Native models, runtime bone/root changes, stationary injections, actual battle, Draco/fallback and touch/settings verified. Textured Umbreon/Deoxys Attack/battle stage visually inspected; not all models were visually audited.
- Docs `docs/MODELS-AND-MUSIC.md`; QA `reports/models-music-qa.json`, `reports/models-music-browser.json`, `reports/music-browser.json`; screenshots `docs/screenshots/models-music/`. Earlier docs marked historical where superseded.
- SW `ghost-shift-models-music-16`; scenario/map/protocol and server DB schema unchanged. Restart host and refresh tabs; no DB reset/new shift required solely for this change. If saved mute is on, use **Sound off / Enable**.

---

# Current handoff: player registration and operator activity logs (2026-10-26)

Completed the user's request directly in `C:\Pokemon Day - Among Us`. Preserve all earlier uncommitted work. No commit/push, private `.env` edit, production DB reset or stopping of the existing host was performed.

- New public player registrations require Full Name, Block and Group #. Shared client/server validation supports Unicode names; group is a positive integer 1-9999. Browser reload/reconnect retains identity; credential rejoin cannot rename a completed profile. Existing credentials still work, and incomplete historical profiles can be completed on an explicit valid rejoin.
- Additive migration `server/migrations/003-player-activity.sql` creates `player_profiles` and `activity_logs`. Runs once automatically; existing events import as unattributed legacy instead of fabricated identity. Profile history survives slot release and host restart. No scenario/map/protocol bump; old compatible rounds can continue.
- Operator Field team cards show real names/block/group. New **Logs** navigation (`src/OperatorLogs.tsx`) reads operator-only `/api/activity`, with session/name/block/group/task/Pokemon search, category/actor filters, live five-second refresh, keyset pagination and complete filtered UTF-8 CSV export. Export walks older pages and guards spreadsheet formula text. Times use Asia/Taipei and active session seconds.
- Attributed records include registration/rejoin, authenticated connections, session transitions, tasks/errors, encounters/public battle results, emergencies/injections, route/key/door decisions, guidance/proposals, accepted/rejected gameplay commands, and movement/room summaries. Actual actor ID and profile are snapshotted on each record; system clock outcomes stay System. Existing command idempotence remains. Private credentials and serialized battle internals are excluded. Block/group profiles are operator-only in snapshots.
- Production build passed, **125 unit/server tests passed**, **6 unique Chrome scenarios passed across targeted runs**. New registration/logging scenario exercises distinct A/B profiles, actual task and Pokemon encounter, reload, search, >100 rows and downloaded complete CSV. Complete keyboard six-task/reconnect/joint-extraction round passed in **142 active seconds**, asserting all six completion logs have names/block/groups and SESSION_SUCCESS persists. Registration and task-log screenshots visually inspected.
- Reports: `reports/player-logs-qa.json`, `reports/player-logs-browser.json`; screenshots `docs/screenshots/player-logs/`; documentation `docs/PLAYER-REGISTRATION-AND-LOGS.md`. SW cache `ghost-shift-player-logs-15`.
- User next step: restart the host and refresh player/operator tabs. Migration is automatic; do not delete/reset SQLite. No new shift is required solely for this additive change (earlier v10 rules still require a v10-compatible shift).

---

# Current handoff: v10 critical incidents, live analytics and Showdown (2026-10-26)

Repository: `C:\Pokemon Day - Among Us`. Completed the latest seven-point gameplay/dashboard request directly. User clarified the fatal 60-second rule applies only to injected emergencies/scenarios, not Pokemon battles. Preserve all prior uncommitted work. No push/commit, private `.env` edit, production DB reset or stopping of the user's existing host performed.

- Live `server/quickAnalysis.ts` compares four route/responder timing schedules (64 samples each) through a direct POST field-analysis endpoint. No queued full reducer replay for player predictions. Current facts/prescriptions update immediately; numeric estimates refresh every 5s, expire after 10 active seconds. Optional Pokemon outcomes and actual route/door tradeoff comparisons retained. Explicit uncertain workload assumptions, not visitor calibrated.
- New global `DangerAlert`: red pulsing edges/announcements on both players, persistent emergency countdown, static reduced-flash mode, concurrent Pokemon announcement during an emergency.
- Every injected emergency is blocking with exactly 60 active seconds. Unresolved deadline immediately fails the session; pause freezes active time. Detailed terminal instructions retained. Pokemon timer remains separate. Impossible one-minute response placements are rejected.
- Actual server-only `@pkmn/sim@0.10.11` Pokemon Showdown battles replace runtime Scout/Guard/Attack/Contain counters. Gen9 custom singles, level50, source moves/PP/HP/types/abilities/status/accuracy/speed, forced healthy switches. Actual results drive 3D/sprite animations. Private serialized engine/RNG persists across SQLite restart, never sent in snapshots; stale requests/legacy bypasses rejected. Cosmetic form mappings disclosed. Existing source/rights notices unchanged.
- First-person head camera restored. Own trainer hidden, companions and partner retained; follower spacing/local camera fade avoids overlap.
- `OperatorDashboard.tsx`: 4 KPI cards, actual completion funnel/outcome donut, response matrix, predictive/prescriptive tabs, cloned sandbox; real current-version stored/live data and honest empty states. Advanced records remain below.
- Final production build passed. Full unit/server suite **121/121 passed**. **15 unique real Chrome scenarios passed across targeted regression runs**; final three reruns passed. Full legal two-client keyboard six-task round/reconnect/joint extraction completed in **145 active seconds**. Rendered first-person, battle, emergency and dashboard screenshots inspected. `reports/v10-qa.json`, `reports/v10-browser.json`, `docs/screenshots/v10/`.
- Scenario `ghost-shift-v10-critical-incidents`; briefing `critical-incidents-briefing-10`; SW `ghost-shift-critical-incidents-14`; protocol8; unchanged canonical map. Live timing model `ghost-shift-v10-route-workload-mc1`; offline surrogate reducer audit uses separate model version. Restart host, reload clients, **create a new shift**. Old incompatible sessions archive with history/credentials retained; do not reset DB.
- Full implementation/source/limitations report: `docs/V10-CRITICAL-INCIDENTS.md`. Previous handoffs below are historical where superseded.

---

# Current handoff: fast operator injection (2026-10-25)

Repository `C:\Pokemon Day - Among Us`. User reported events/Pokemon injection was very slow. Fixed directly; preserve all earlier uncommitted work. No commit/push, private `.env` or production DB edit, or stopping of the user's host performed.

- Root cause: every INJECT review blocked on MC response-policy comparison and shared workers; Pokemon preview could also wait 4.5s on PokeAPI/stale record refresh.
- `makePreview` now returns local authoritative rules/placement/effects immediately for INJECT and invalid actions; no analytical worker job is submitted. Other valid player previews retain simulations. Confirmation still revalidates authority/current state, placement, cooldown, limits, budget, response time and idempotence.
- `public/catalog/identities.json`: all 1,351 exact names/types, PokeAPI pinned CSV revision `2bf639e5572812a67d2b94903fdcb9d095f5aeb2`. `injectionRecord` uses local metadata and replaces spoofed names/types. `catalog:identities` refresh script. Companion selection/stat lookup unchanged.
- Preview optional `analysisMode: rules-only`; honest not_computed / n=0 placeholder; no displayed fake probability or Best Plan claim. Store already excludes n=0 forecast rows. Actual live analytics continue to invalidate/recompute from the injected state.
- Real Chrome operator/two-player scenario passed: Pokemon review 263ms, confirm-to-state 118ms; event review 144ms, confirm-to-state 112ms. Local measurements only. Both clients received the injected entity; three-second Pokemon warning/model downloading remain distinct.
- Four focused unit/integration checks passed, including offline API and saturated jobs, exact variants, spoof rejection, no fake forecast rows and duplicate confirmation. Production build passed. Final full unit/integration suite 111/111 passed; real browser scenario/build/diff check passed. QA `reports/fast-injection-qa.json`.
- SW `ghost-shift-fast-injection-13`; same scenario/map/model/protocol and existing sessions. Restart host and refresh operator/player tabs; no DB reset.
- Docs `docs/FAST-INJECTION.md`; measured evidence `reports/injection-latency-browser.json`; screenshots `docs/screenshots/fast-injection/`. The previous 3D/battle work below remains current.

---

# Current handoff: live battle and stationary threat animation (2026-10-25)

Repository `C:\Pokemon Day - Among Us`. User asked for visible game-like battle animation and idle animation on stationary injected Pokemon. Implemented directly, preserving previous public-prototype model source authorization and all uncommitted work. No commit/push, private `.env`, production DB edit or stopping of user host requested/performed.

- New lazy `src/BattleScene.tsx` replaces static VS portraits in EncounterPanel with a live shared-asset 3D/native-sprite stage. Own/target models face each other; native animations, typed projectile/impact, guard shield, ambient particles and resolution fade. Sticky stage remains visible while controls scroll. Independent skeleton/mixers, shared cache/downloads, bounded resolution and full close/unmount disposal.
- Optional authoritative `Threat.motion` stamps engage challenge, accepted counter reaction and resolution. Pure `battlePresentation.ts` provides deterministic world-clock visual cues and consistent responder-facing for both clients. Cosmetic challenge animation does not deal damage. Legacy snapshots without motion still work. Pursuit uses real speed; stationary native Idle loops without world movement. Every threat has a subtle typed aura; static 3D bodies remain honestly static/reference, with animated effects only.
- Current asset availability unchanged: 1095 3D entries, 205 native Idle, 219 Attack, 62 Hit, 0 dedicated Guard. No fake clips or generic body bounce. Missing native body animation remains a source limitation. Existing 113 primary sprite / 143 reference fallbacks remain.
- Reconnect browser check found duplicate ENCOUNTER submission when reopening an already engaged target. Interact and tracker shortcut now reopen the existing battle directly, preserving HP.
- Same Scout > Guard/Support > Attack/Contain gameplay, cooldown/preparation, six tasks, 300 active seconds, three companions, doors, operator authority, analytics and joint extraction. Optional cosmetic data does not require protocol/map/model/schema reset. SW `ghost-shift-battle-animation-12`; restart host and refresh clients, no DB reset.
- Browser initial run: native idle/stage attack passed before exposing reconnect bug; corrected battle + chase run 2/2 passed; accompanying GLB/Draco/static-fallback model scenario passed in initial run. Three distinct relevant scenarios passed across runs. Build passed. Three new pure/reducer tests passed. Full unit run 107/107 passed. Final containment reaction uses target hit without HP damage; focused engine/reaction checks 18/18 passed afterward. Final production build passed. QA `reports/battle-animation-qa.json`.
- Docs `docs/BATTLE-ANIMATION.md`; evidence `reports/battle-animation-browser.json`; actual screenshots `docs/screenshots/battle-animation/`. Previous 3D asset sources/rights report remains `docs/PUBLIC-3D-MODELS.md`.

Body animation still depends on genuine compatible source clips. The added aura/particles are explicitly cosmetic effects, not claimed as imported native idle. Battle presentation has not introduced a four-move turn/PP/player-HP system.

---

# Current handoff: real public 3D Pokemon imports (2026-10-25)

Repository `C:\Pokemon Day - Among Us`. User explicitly chose public game-derived models for a non-commercial prototype with source/rights notices. That choice supersedes the prior creator-licensed-only selection for this prototype. No owner redistribution license is claimed; no model was falsely labeled licensed/approved.

- `public/catalog/pokemon-models.json`: 1,095 exact-ID 3D models; 218 named native locomotion, 219 native attacks, 877 static/idle-only. Remaining primary representations: 113 native sprites, 143 reference/placeholder. All 1,351 catalog IDs remain selectable. No base-form substitution for unresolved variants (female Meowstic stays its exact female sprite).
- Animated Gen 1 source `06wj/pokemon` pinned `00d96f7f18894055e7f1db44fa0df6462e5e4c8a`; broad source `Pokemon-3D-api/assets` pinned `429de1288cea0d43f5b4f56305d2276e94239d65`. Sources retain Pokemon/Nintendo/Creatures/Game Freak rights. Explicit status `prototype-acknowledged` and manifest opt-in, separate from empty `assets.approved-models.json` licensed list.
- Six actual animated GLBs bundled (#1,4,6,7,25,133), roughly 30 MB. Others are immutable lazy remote downloads; failed GLBs fall through to native sprites/exact reference. Draco decoder runs locally with 2-worker cap and license files. Four download slots/two template loads/eight idle-template cache remain. Source byte lengths and Git blob hashes checked in secure contexts.
- Genuine skeleton clones/mixers, finite scale/ground/center/facing, source materials, source-native idle/run/attack, authoritative age and interruption. Static/idle-only 3D is disclosed and does not pretend to have locomotion. Procedural rigs remain removed.
- SW `ghost-shift-public-models-11`; manifests network-first; local GLB/decoder cache on request. Correct GLB/WASM MIME/404 handling. Gameplay/scenario/map/model/protocol 8 unchanged. Existing v9 sessions compatible. Restart host and refresh clients; no DB reset for this pass.
- Browser checks: real model scenario passed, then final 3/3 native sprite fallback/chase/3D suite passed, including actual remote Draco Chandelure, server-confirmed remote attack, real changing bone quaternions, selection/reconnect and intentional HTTP failure. Screenshots visually inspected. Final 104/104 unit/integration tests, 3 model Python tests, 5 sprite Python tests, offline all-model metadata validation and production build passed. QA `reports/public-3d-qa.json`.
- Commands: `models:sync`, cached `models:validate`, `models:test`; source/JSON cache `.qa/model-import` ignored. Report `docs/PUBLIC-3D-MODELS.md`; model coverage `reports/public-3d-model-coverage.json`; browser evidence `reports/public-3d-browser.json`; captures `docs/screenshots/public-3d/`; source lock `assets.models.lock.json`.
- No commit/push requested. User's `.env`, production DB and existing host were not manually changed/stopped. Preserve previous uncommitted work. Prior sprite-only/zero-3D primary coverage below is historical; sprite assets remain useful backups.

Limits: 877 models lack verified walk clips; 256 entries lack an unambiguous model. Model binary geometry decodes on demand; full-catalog JSON validation is not a visual walk-through of every species. Source URLs can become unavailable; nonbundled first-use requires network. No rights-holder permission is claimed.

---

# Current handoff: authentic catalog assets (2026-10-25)

Repository: `C:\Pokemon Day - Among Us`. Implemented attachment `d8aa8762-23dc-4a86-864a-6f2adb5a89c6` directly. User confirmed non-commercial school/community use. No commit/push requested; preserve earlier uncommitted work. Private `.env`, production DB and the existing user host were not manually changed/stopped.

- Replaced 14 procedural rigs with exact-form full-catalog registry: 1,351 IDs; 675 genuine directional animated sprites; 668 native attacks; 676 static fallbacks; zero approved imported GLBs. Four fallback forms have no available reference and show exact-ID placeholders. No arbitrary form substitution.
- Community-original SpriteCollab CC BY-NC 4.0 sources only, pinned and artist-credited; official/mixed credits excluded. Source/permission evidence, exact associations, native PNGs, XML, anchors, hashes and clip semantics ship with the catalog. `assets.approved-models.json` remains empty until asset-specific permission and meaningful clips are established.
- Shared lazy controller for own/remote companions and injected/guardian threats; source-native eight directions/durations, actual movement-rate playback, authoritative encounter age, independent UVs, bounded caching/concurrency, cancellable team prefetch, timeouts, fallback and GPU cleanup. No fake portrait bob/deformation.
- Scene/gameplay unchanged: v9 scenario/map/model/briefing, protocol 8; SW is `ghost-shift-authentic-catalog-10`. Existing v9 sessions remain compatible; restart host and refresh clients, no DB reset required for this presentation pass.
- Reconnect browser testing discovered orphan background analytics jobs blocked foreground encounter previews. Same-owner background work now supersedes/cancels safely; other-owner/foreground jobs protected. Regression covered.
- Validation: all 1,351 entries, 3,150 clip references, zero importer errors; 5 Python pipeline tests; 102 unit/integration tests passed; targeted native real-Chrome scenario passed. Full browser run: 9 passed / 1 analytical-helper timeout at 30 seconds. Helper corrected to 60 seconds; affected native-character recheck passed. All 10 distinct scenarios validated across suite/recheck. Full two-client round: 194 active seconds, 6/6 tasks, reconnect and joint extraction. Evidence in `reports/authentic-catalog-qa.json` and `docs/AUTHENTIC-CATALOG-ASSETS.md`.
- Report `docs/AUTHENTIC-CATALOG-ASSETS.md`; coverage `reports/authentic-catalog-coverage.json`; references `reports/reference-artwork-availability.json`; real captures `docs/screenshots/authentic-catalog/`; browser metadata `reports/authentic-catalog-browser.json`. Prior v9 procedural reports/counts below are historical.
- Refresh assets with Python/Pillow via `npm.cmd run assets:sync`; cached offline validation `npm.cmd run assets:validate`; policy tests `npm.cmd run assets:test`. Runtime needs only Node/npm and bundled artifacts. Source cache `.qa/catalog-assets` is ignored.

Remaining limits: no qualified animated GLB models; 676 entries lack approved native movement assets; remote reference URLs can fail; browser category checks do not visually verify every catalog species. Native sprites are genuine 2D directional source animations, not 3D models.

---

# Current handoff: v9 Pokemon characters and room identity (2026-10-25)

Repository: `C:\Pokemon Day - Among Us`. Implemented the latest attachment locally; preserve all previous uncommitted work below. No commit/push requested. No private `.env` or production database manually edited; the user's existing host was not stopped.

- Scenario `ghost-shift-v9-pokemon-rooms`; map `aster-wings-v9-pokemon-rooms:47aa0356`; protocol 8; model `ghost-shift-v9-pokemon-rooms-mc1`; briefing `pokemon-rooms-briefing-9`; SW `ghost-shift-characters-9`.
- Original articulated procedural rigs for exact IDs 1,4,6,7,25,41,92,93,94,95,129,132,133,150. Eight authored clip states; anatomy-specific limbs/wings/segments, independent mixers/crossfades, authoritative actions/hit reactions, target-facing attacks, wall-clearance wing folding/coiling, bounded shared cache and cleanup.
- Imported GLB coverage is 0. All 1,351 catalog entries remain selectable; 1,337 retain their own static reference-art fallback. No form substitution. Operator Reference exposes coverage/provenance. GLTF adapter exists but no imported pack is claimed as verified.
- Canonical collision-aware side/rear following with ordinary catch-up at at most 1.25x movement speed. Safe reposition only beyond 800 units or invalid current geometry. Companions do not block trainers. Lobby code preloading and explicit Vite prebundle entries fix first-load dependency reloads.
- Shared `src/roomIdentity.ts`: Oak Lab, Joy Clinic, Rotom Relay, Power Plant, Infinity Core, Cerulean Pumps, Aether Wing, Silph Office, Poke Mart, Ball Workshop, Trainer Hall/Reception, Indigo Command, Evac Gate; stable IDs/connections retained. Lab/clinic have four extra wall-side furniture footprints shared with collision/nav/camera/maps. Nurse Joy is non-graphic scenery, not a spawned enemy.
- Existing two-player, six-task, 300-active-second rules, three companions each, no stamina/shared energy, operator-only incidents, doors/key/held-latch tradeoffs, analytics and joint extraction remain.
- Final build passed; **97/97** unit/integration checks. Full Chrome suite **9 passed / 1 cold-dev-loader failure**; after the preload/prebundle fix, affected characters/chase/fresh-cache journal rechecks **3/3 passed**. All 10 distinct scenarios validated across suite/rechecks. Full keyboard/WebSocket round **199 active seconds**, 6/6, carried-data reconnect, both physically extracted.
- Fresh v9 balance: 12/12 generated bounded runs succeed; physical representative shortcut 9.24s / fallback 26.27s; fastest observed legal automated run 108s. Fresh 16-scenario evaluation: time MAE 17s on 12 successful pairs; Brier .00390625; matched baseline/recommendation both 75% success, recommendation 1.5s slower on mutual successes. No visitor calibration or proven efficiency advantage.
- Full report: `docs/POKEMON-CHARACTERS-AND-ROOMS.md`. Screenshots: `docs/screenshots/pokemon-characters/`. Evidence: `reports/pokemon-character-coverage.json`, `pokemon-character-browser.json`, `pokemon-characters-qa.json`, `pokemon-rooms-browser-run.json`, `pokemon-rooms-balance.json`, `pokemon-rooms-evaluation.json`. The previous v8 full-round result is preserved at `reports/route-trials-browser-run-v8.json`.

Restart host, refresh both clients, create a NEW shift. Old geometry/scenario snapshots archive without deleting credentials/history. Remaining work is expanded true model coverage, individual species art refinement, real-device/visitor playtesting and intervention cohorts. All older counts/models/dimensions below are historical.

---

# Current handoff: v8 six-task Route Trials (2026-10-24)

Implemented the latest attachment directly in `C:\Pokemon Day - Among Us`. Preserve all existing uncommitted camera/layout/analytics work below. No commit or push requested. Private `.env` and production SQLite were not edited; the existing user-owned server was not stopped.

- Scenario `ghost-shift-v8-six-route-trials`; map `aster-wings-v8-route-trials:926ab262`; protocol 8; briefing `route-trials-briefing-8`; model `ghost-shift-v8-six-route-trials-mc2`.
- Exactly six real normal puzzles, two authenticated trainers, three companions each, maximum 300 active seconds, no starting hostiles, joint physical extraction. Stamina/shared-energy rules and current UI/metrics removed; battle HP preserved.
- Expanded canonical map, research unlock, shared atomic access key, exclusive A/B route controls, held passage/permanent latch repair, explicit guardian-gate links and safe final gates.
- Reducer-driven predictive/prescriptive analysis compares eight policies, actual legal route overlays, current incident outcomes and joint action sequences. Material changes invalidate immediately; clock-only refreshes wait for running work and estimates expire after 45 active seconds. Undisclosed blockers return an explicit unavailable numerical forecast without exposing hidden identity.
- Final build passed; 90/90 unit/integration checks; 9/9 real-Chrome browser scenarios. Full two-client keyboard round: 186 active seconds, all six tasks, carried-data reconnect, both extracted, no browser errors.
- Actual full-speed route: Electrical > Medical shortcut 9.24s versus 26.27s fallback. Fastest observed automated legal round 108s, not a global bound. Generated cohorts: 6/6 successes at 165-235s without interventions and 6/6 at 172-256s with bounded intervention. No visitor calibration claims.
- Final generated evaluation: 16 scenarios, 12 successful time pairs, MAE 17.25s, Brier 0.00390625. Equal-assumption tasks-first baseline and selected policy both 75% success; selected policy 0.33s slower on 12 mutually successful pairs. No demonstrated policy advantage or visitor calibration.
- Reports: `reports/route-trials-qa.json`, `reports/route-trials-balance.json`, `reports/route-trials-browser-run.json`, `reports/route-trials-evaluation.json`. Full report/screenshots: `docs/ROUTE-TRIALS-REVISION.md`, `docs/screenshots/route-trials/`.

Restart the existing host when ready, refresh both clients, and create a NEW shift. Incompatible saved sessions are archived with historical snapshots/credentials preserved. Do not resume the v7 session with v8 geometry. Real visitor playtesting and repeated/high-severity operator cohorts remain future balance work.

Everything below is historical context; prior counts, model accuracy and map dimensions are superseded by this v8 handoff.

---

# Latest work: field analytics and task labels (2026-10-24)

User asked for predictive outcomes, efficient full joint prescriptions, live replanning after operator events/Pokemon, and readable task targets. Implemented locally; no commit/push requested. See `docs/FIELD-ANALYTICS-REVISION.md` for design, assumptions and validation.

New model `ghost-shift-wings-v7-canonical-layout-mc2`, same scenario/map. Field HUD compares four policies with eight rollouts each, shows per-incident outcomes/resources/deadline margins, and an actual reducer-derived chronological joint action trace. Immediate material invalidation with asynchronous recomputation and no stale prescription. New target helper uses A-D channels, real coolant units, numeric signal and fuse specifications. New SW cache `ghost-shift-analytics-2`. Server restart/client refresh required; no data migration needed.

Validation: final build + 100/100 unit checks passed. Browser minigames and live event/Pokemon injection tests passed; multiplayer regression also passed. Evaluation: `reports/field-analytics-evaluation.json` (16 generated scenarios, MAE 4.79s on 14 successful pairs, Brier 0.1484375; not visitor calibrated). Screenshots: `docs/screenshots/analytics/`.

Preserve all previous uncommitted camera/layout work below. No private environment/database changes.

---

# Project handoff ? canonical layout correction

Updated 2026-10-24. Repository: `C:\Pokemon Day - Among Us` (the environment still names the obsolete `C:\Jigsaw Trials` writable root). Current base on main: `67f4637`. Preserve the preceding uncommitted shoulder-camera/environment work along with this revision.

## Current request and result

The user asked to make actual rooms/walls/entrances match the intended minimap, including collision, navigation, camera, maps and stale sessions. Implemented locally:

- Exact union derivation in `src/layoutGeometry.ts`, with the same 16 rooms / 43 source floor rectangles and all 152 true structural walls unchanged. Exact room mounting edges replace the 10-unit sampler; 70 disjoint floor/ceiling tiles replace overlapping flat surfaces.
- Removed 42 decorative doorway assemblies (84 posts, 42 lintels, 84 floating/guessed signs). Logical open room contacts no longer generate doorway structures. Existing room-specific machinery, horror dressing and wall-mounted room signs remain.
- Player and operator maps use only exact union walls as structural borders; removed independently stroked closed room/corridor rectangles. Open gate outlines are dashed/unfilled; closed gates remain solid/validated.
- Renderer and chase camera share physical wall bounds. Equipment mounts retain the existing 5-unit grid, preserving every prior control/spawn/equipment collider. Shared collision, navigation and interaction obstruction stay active.
- Behind-character camera, 3D trainers, Pok?mon, all tasks/emergencies, manual operator injections, analytics, real multiplayer, 300-second deadline and joint extraction are retained.

## Verification

- Production build passed; only existing nonfatal WebGL vendor chunk-size advisory remains.
- `npm.cmd test`: 96/96 passed. Includes unique/one-sided walls, exact mounting edges, floor coverage, all-room paths with gates closed, open/closed gate camera sweeps, actual Three.js mesh raycasts at trainer/sign/camera heights, and SQLite archival without losing history/credentials.
- Targeted real Chrome audit passed: keyboard crosses all 53 crossable region contacts, including short corners; player SVG and operator Canvas geometry agree with canonical data. Approach fixtures are isolated; the separate room circuit performs connected keyboard traversal without repositioning. Final sequential browser suite passed 9/9 in 5.1 minutes, including all 16 rooms/control approaches, tasks/emergencies, real multiplayer joint extraction and touch input.
- Fresh generated current-model evaluation: 16 scenarios, 14 successful time pairs, MAE 4.79 seconds, Brier 0.1328125; not visitor calibration or proof of human navigation improvement.
- [Full root-cause report and browser screenshots](docs/CANONICAL-LAYOUT-FIX.md).
- [Machine-readable connection inventory](reports/layout-connectivity.json).
- [Current generated evaluation](reports/canonical-layout-evaluation.json).

## Run / compatibility

```powershell
Set-Location 'C:\Pokemon Day - Among Us'
npm.cmd run build
npm.cmd start
```

Stop an old host first; create a NEW shift at `http://localhost:8787/operator`. Both players join `/play`, choose/finalize three companions, acknowledge briefing, then the operator starts.

Map `aster-wings-v6-canonical`, scenario `ghost-shift-wings-v7-canonical-layout`, model `ghost-shift-wings-v7-canonical-layout-mc1`, protocol 6. SW cache `ghost-shift-canonical-layout-1`. The map signature now includes exact walls and open region contacts. Startup archives incompatible shifts while preserving snapshots/history/credentials; mismatched socket geometry stops movement rather than mixing old and new layouts.

Private `.env`, production SQLite and operator password were not modified. Changes remain local and uncommitted; no new push or deployment was requested. Test hosts close after verification. Physical phones/tablets, booth LAN/packet loss, sustained GPU/thermal performance, audio listening and visitor wayfinding remain on-site acceptance work. Existing true corridor bends/perimeter returns remain because they are part of the intended minimap geometry.
