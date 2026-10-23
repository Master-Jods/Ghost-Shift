# Executed QA — third-person horror revision

The revision is tested against isolated SQLite databases and local authenticated WebSocket clients. No test replaces a private booth database. Test-generated forecasts are conditional simulations, not human visitor measurements.

## Verification results

- Production build passed (TypeScript client/server and Vite).
- 84 automated tests passed, including 45 generated task/incident matrix rows.
- All seven browser suites passed in the full acceptance run. The three-client round completed with four assignments, two interventions, reconnect and physical joint extraction in 79 active seconds. All 16 rooms were traversed separately through real keyboard movement.
- After the final billboard ground-pivot refinement, the targeted normal-minigame/animation/visual and touch suites were run again.
- `git diff --check` passed. Vite's separate WebGL bundle remains above its default size warning threshold.

A selected set of actual screenshots is retained in `reports/third-person-screenshots/`; see [visual gallery](../reports/OVERHAUL-VISUALS.md). The larger capture set and raw logs remain under ignored `.qa/`.

## Task and incident matrix

`npm test` writes the detailed machine-readable rows to `reports/task-qa-generated.json`. The matrix covers every normal type and supported emergency scope/plan, plus proximity, ownership, wrong input, retry, duplicate completion, snapshot serialization, shared resources, assistance and release, paired timing/reset, expiry/cancel and consequence receipts.

| Normal task | Actual interaction | Server checks | Browser evidence |
|---|---|---|---|
| Electrical wiring | Select lead / matching symbol socket; optional mouse drag | Current sequence target, role, range, obstruction | `horror-task-wiring.png` |
| Power routing | Close indicated physical relay branches | Committed full/essential option, energy, sequence | `horror-task-circuit.png`; industrial option/receipt |
| Fuse replacement | Select specified rating, then insert | Exact amperage index, range, owner | `horror-task-fuse.png`; wrong fuse does not finish |
| Communication tuning | Align signal/frequency; confirm after settling or paid boost | Target, eight active seconds for standard, stamina | `horror-task-signal.png`; both options in reducer matrix |
| Coolant balance | Turn pressure/flow/temperature valves into safe sectors | All three target settings together | `horror-task-valves.png` |
| Calibration | Align three gauge needles | All three targets, wrong values logged | `horror-task-calibrate.png` |
| Data transport | Retrieve in Archive, carry to Communications, select checksum/upload | Same carrier, destination proximity, checksum | `horror-task-upload.png`; incorrect checksum rejected |
| Access restore | Enter marked access symbol | Exact symbol and owner | `horror-task-access.png` |
| Cooperative stabilization | Different trainers operate their own controls | Active server-time window; repeated same role cannot finish | `horror-task-containment.png` |

Emergency matrix includes Blackout, Communications interference, Reactor instability, Coolant failure, Containment leak, Door lockdown, carried Research corruption and Power overload (balanced/priority, solo/paired where supported). It exercises valid and invalid scopes, responses, power shortages, same-player approval rejection, timed reset, successful responses, expired/missed and cancelled cleanup. Separate engine tests cover every specialized threat and neutral encounters, Guard/Scout/Support requirements, attack/containment, resource bounds, deadline and both-player extraction.

## Browser suites and evidence

- `frontend.spec.ts`: title, manual, real-session entry, operator link and disabled empty-code joining.
- `horror.spec.ts`: original title scene, current manual, trainer A/B changing run frames over real commands, reconnect, every normal minigame through network commands, wrong gauge/fuse/checksum retries, operator login/overview. Terminal-position fixtures isolate UI mechanics; this suite is not evidence of walking every task route.
- `industrial.spec.ts`: actual keyboard traversal to power equipment, authoritative cost preview, stale preview rejection, shared spending, consequence receipt, diagnostic/predictive/prescriptive panel and operator analytics.
- `journal.spec.ts`: TAB ownership, input stop, focus traversal, expanded/tracked minimap markers and development collision inspection.
- `presentation.spec.ts`: emulated landscape touch stick, fixed camera, settings persistence, audio unlock/mute, low quality, reduced motion/flashes, overlay input safety and 844×390 layout. It does not establish physical-phone performance.
- `network.spec.ts`: three authenticated browser identities, full catalog including alternate varieties, operator threat/paired emergency, scout/guard/containment, reconnect, normal tasks and physical joint extraction under the active deadline.
- `rooms.spec.ts`: actual keyboard movement through every one of the 16 rooms; standing at each equipment control, canonical minimap positions and screenshots. No teleport/speed change is used for traversal.

Screenshots live under `.qa/`: `horror-entry.png`, `horror-operator-login.png`, `horror-operator.png`, `horror-game.png`, `horror-trainers-running.png`, `horror-task-*.png`, `industrial-analyst.png`, `industrial-phone.png`, `ghost-extraction.png`, `ghost-analytics.png`, and `room-audit-after/*-equipment.png`. The per-room audit JSON lists actual visited positions and elapsed time. These are rendered Chrome captures, not design mockups.

## Bugs found and addressed

- Old corridor boundary expectations were updated to the widened canonical floor union; no deleted corridor edge remains as an invisible collider.
- First-person pointer-lock assumptions were removed from active input and replaced with fixed-camera keyboard/touch checks.
- The tracker overlapped the touch joystick in landscape; the two now occupy separate lanes.
- A small-screen rule stretched the compact adviser across the header; its width/expanded placement is now bounded.
- Floating high signs/services from the roofed renderer were adapted to cutaway presentation.
- Movement updates now stop after a trainer extracts; late acknowledgements cannot leave a spurious rejection toast on the successful outcome.
- Data transport formerly accepted an unchecked upload interaction; delivery now verifies the terminal checksum.
- Full collision scans made long analytical continuations needlessly expensive; a static spatial broad phase now narrows candidates while exact canonical collision tests remain unchanged. A full-geometry comparison regression covers multiple radii and gate states.
- Background analytical jobs could delay an operator preview; background concurrency is capped and obsolete jobs are cancelled, leaving interactive capacity.
- Scenario/model/map versions now prevent restoring incompatible old geometry or pooling old forecasts with this revision.

## Remaining practical checks

Use two real phones/tablets and an operator device on the actual LAN. Check touchscreen ergonomics, Safari/WebGL context behavior, thermal throttling, device audio, browser fullscreen permissions, LAN loss/rejoin and visitor comprehension/pacing. Headless Chrome on this Mac does not establish those results. Pokémon use procedural fallback rather than species-specific frame sheets; authentic per-species limb animation remains outside that coverage. Uncached alternate-species art/metadata needs internet; if all art sources fail, a labeled species-ID card appears instead of an invisible companion. Vite reports a large WebGL chunk; it is loaded separately from entry UI. This report does not claim the game is bug-free.
