> Historical wings v2 record. Current environment changes and checks are in [OPEN-SPACE-VERIFICATION.md](OPEN-SPACE-VERIFICATION.md).

# WebGL wings v2: verification and actual captures

Verified locally on Windows / Node 22.14 / headless Chrome, 2026-10-19. [Implementation, controls, map migration and asset provenance](PRESENTATION.md).

## Checks performed

- `npm.cmd run build`: client/server TypeScript and Vite production build pass. Vite reports a non-fatal 523kB WebGL vendor chunk advisory. The game renderer is lazy-loaded; entry/operator code does not initialize a renderer.
- `npm.cmd test`: **23/23 pass**. Includes all existing authority, persistence, catalog, gameplay and preview tests plus displacement integration, pitch clamp, settings sanitization, geometry migration/archival and refusal to forecast an incompatible map.
- `npm.cmd run test:e2e`: **3/3 pass**: real-session entry, the three-client operator/A/B full multiplayer round, and touch/settings/accessibility/input safety. A final multiplayer rerun additionally checks minimap world-coordinate alignment after navigation at multiple room positions. A focused touch rerun verifies the refined north-up expanded map.
- Actual browser WebGL is asserted (`data-renderer=webgl`); a fallback cannot satisfy the graphics tests.
- Mouse input: equal 1,440-pixel horizontal displacement is dispatched in 30 and 144 browser events, producing equal 4.32-radian increments at default sensitivity. The pure integrator also checks 30/60/144 batches. This tests event integration; it is not a physical-mouse polling or measured multi-refresh-rate hardware experiment.
- Vertical look clamps at +/-1.15 radians; no roll. Pointer-lock entry/exit, settings/UI mouse isolation, held-input stop, focused-slider Escape and genuine Chrome DevTools touch movement/look are exercised.
- Settings: entry-page calibration survives reload before joining; Reset to Defaults, low quality, motion/flashes, tone processing, muted/master-zero audio context unlock, invert Y, FPS, heading-up minimap and stored size work. Local settings do not pause the shared round.
- Navigation: all **256 ordered room pairs** traverse the actual collision/move functions with both optional shortcuts closed. Spawns and objective/cooperative controls remain walkable. Twelve seeded generated runs cover task counts 3-6 within 300 active seconds.
- Multiplayer: arbitrary teams, full catalog selection, live director preview/confirm, Gengar materialization/scout/Guard/Contain, cooperative reactor emergency, reconnect, normal objectives, both-player physical extraction, KPI consistency and a completed analytical worker job pass. No browser page errors were reported.
- Map revisions preserve old snapshots and operator credentials while archiving incompatible sessions. Archived-map forecast requests are rejected instead of evaluating old coordinates against new geometry.

## Actual screenshots

[Before WebGL](screenshots/before-webgl.png) · [Current exploration](screenshots/exploration.png) · [Gengar in the world](screenshots/encounter.png) · [Materialization](screenshots/materialization.png) · [Touch](screenshots/touch.png) · [Settings from entry](screenshots/settings.png) · [Expanded map](screenshots/expanded-map.png) · [Reactor room](screenshots/reactor.png) · [Operator plan](screenshots/operator.png) · [Adviser](screenshots/adviser.png) · [Terminal](screenshots/terminal.png) · [Joint extraction](screenshots/extraction.png).

These are captures of the runnable application, not mockups. The before image is from the earlier verified Canvas revision; the supplied first screenshot is the additional user reference. Images were inspected against the target's wall/prop/lighting/scale characteristics. The target is an art-direction reference, not an exact-match claim. Room codes in captures are isolated test fixtures.

## Timing evidence

| Preset | Internal resolution | Observed render-call CPU submission sample |
|---|---|---:|
| Medium | 960x600 | 2.05 ms |
| Low | 480x270 | 15.01 ms |

These are separate one-second samples on this host. WebGL submission time excludes GPU completion, compositing, network and input latency. Concurrent workload is uncontrolled. It is **not** an end-to-end FPS benchmark or a physical phone measurement, and cannot be compared directly with the old software renderer's CPU pixel work. The optional displayed FPS counts actual animation callbacks but does not establish hardware suitability. [Exact captured values/scope](presentation-performance.json).

## Predictive provenance and remaining acceptance

[Current generated evaluation](../reports/wings-v2-evaluation.json) uses `ghost-shift-wings-v2-mc1`, 8 held-out generated scenarios (1001-1008), current navigation and the authoritative reducer. Its 6 timed successful cases and declared intervention distribution are not visitor calibration. Brier equals the 0.25 baseline in this small sample; paired recommendation time improvement is zero. No predictive or prescriptive improvement is advertised.

Physical iOS/Android touch/permissions, actual mouse/device refresh rates, sustained GPU/thermal behavior, speakers/headphones, LAN reliability and visitor pacing still require target-device/human acceptance. Pokemon remain billboard artwork with limited front/back views; there are no skeletal catalog models, articulated hand models or exact Lethal Company visuals. Only the flashlight has a hardware shadow budget; room fill lights and sprite contact shadows are approximations. The labeled compatibility renderer has fewer features.
