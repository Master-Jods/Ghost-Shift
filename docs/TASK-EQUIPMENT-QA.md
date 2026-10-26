# Task equipment UI and interaction QA (2026-10-26)

The actual task panels were revised and exercised in Chrome. The audit covers all **six normal tasks**, all **eight injected emergency types**, wrong-input retries, role/carrier restrictions, partner approval/rejection, cooperative timing-window retry and completed-task feedback. Layouts were checked at **1366x768**, **1024x768** and **844x390**; no horizontal panel overflow, viewport clipping of the panel itself or overlapping interactive controls was found. Long panels scroll vertically with a visible close control.

## Coolant control

The old presentation placed valve sliders under individual pressure/flow/temperature gauges, even though the valves are coupled. This made the second slider look like a direct flow control. Live readings also scrolled away while adjusting the valves. The new panel separates inlet/bypass/return controls from the three shared readings and states which readings each valve affects.

- Local readings update on native input events immediately; dragging does not wait for a server command.
- Each valve still has the four valid positions 0-3 required by the authoritative rules. Drag, keyboard Home/End/arrow keys and exact-position buttons all work.
- Readings show the current value, target, safe range and explicit too-high/too-low/in-range status. They remain visible while the valve bank scrolls on laptop layouts.
- Slider geometry and retry-feedback footprints remain stable while values change, including dragging again after a rejected validation. A live snapshot does not reset the draft positions.
- Validation remains explicit and server-authoritative. All three readings must satisfy the existing tolerance; the task is not auto-completed by editing sliders.

The browser test drags the first valve to its endpoint, checks the resulting flow against the real coupled formula, checks the track's vertical position, waits through snapshots, submits a wrong balance, drags again without a track shift, then completes the task through keyboard input.

## Shared panel improvements

Target settings are structured by lead, selector, frequency/phase or checksum instead of a long, heavily spaced target-code line. Selectors display real units, wiring has numbered lead/socket stages, and the circuit preview is bounded to its container. Controls have consistent gaps, readable labels and full-width validation actions. Pending submissions disable repeat validation and display saving feedback. Wrong input preserves valid progress and has a clear retry message. Transfer controls explain which trainer carries the module. Cooperative panels distinguish setup readiness from activation and show the pairing window. Successful normal tasks show a clear saved/completed state.

Emergency panels share readable instructions, a 60-second deadline display, channel targets, paired-control readiness and explicit plan cards. A pending overload request explains who must approve. Local bypass explains its extra reset. A resolved incident stops showing an active deadline warning. A new emergency remains explicit in a sticky notice even while a normal task is in the foreground, without covering the coolant readings or controls. Global danger audio/red effects remain intact.

## Completed browser cases

| Normal task | Interaction verified |
|---|---|
| Electrical Wiring | Rejected incomplete circuit, four saved lead/socket connections, successful circuit test |
| Door Power Routing | Shortcut preview/confirmation, wrong selector rejection, correct route validation |
| Communications Calibration | Actual MHz/degrees selection, wrong alignment rejection, correct validation |
| Coolant Control | Pointer drag, live coupled readings, stable retry drag, keyboard positions and correct balance |
| Research Data Transport | Pickup, actual carrier upload, wrong checksum retry and non-carrier restriction |
| Dual Stabilization | Separate A/B setups, wrong setup retry, timed activation, missed-window retry with setup retained |

| Emergency | Interaction verified |
|---|---|
| Blackout | Wrong-channel rejection, all required channel resets |
| Communications interference | Required relay channels and resolution |
| Reactor instability | Separate timed A/B controls |
| Coolant failure | Required valve reset channels |
| Containment leak | Separate paired controls and completion |
| Door lockdown | Security reset channels and resolution |
| Research data corruption | Pickup, delivery to Rotom Relay and remaining upload response |
| Power overload | Partner-approved paired plan; separate rejected-then-approved local-bypass case with the extra reset |

## Verification and artifacts

- Unit/server suite: **143 passed, 0 failed, 1 optional test skipped**.
- Production build passed.
- All normal-task and emergency form audits passed, including the three viewport sizes and actual authoritative completion. Additional carrier/cooperative/approval and foreground-emergency tests passed.
- A separate complete two-browser round used ordinary keyboard travel through canonical routes, reconnected while carrying the research module, finished all six tasks and physically extracted both trainers in **145 active seconds**, within the unchanged 300-second deadline. Automated play is not visitor pacing evidence.
- Browser page errors: none. Representative screenshots were inspected; no human listening or live-production QA is claimed.

[Combined QA report](../reports/task-equipment-qa.json), [normal task cases](../reports/task-equipment-normal-qa.json), [emergency cases](../reports/task-equipment-emergency-qa.json), [additional flows](../reports/task-equipment-variants-qa.json), [full-round record](../reports/route-trials-browser-run.json).

Screenshots: [coolant controls](screenshots/task-equipment/coolant.png), [wiring](screenshots/task-equipment/wiring.png), [overload plans](screenshots/task-equipment/emergency-overload.png), [coolant during an emergency](screenshots/task-equipment/coolant-during-emergency.png). The form-only audits stage players at terminals to isolate controls; the full-round audit separately verifies actual travel and extraction.

No game rule, database, production credential or saved session schema was changed. Deploy local changes with `npx.cmd vercel@latest --prod --archive=tgz`, then refresh all terminals. Cache version: `ghost-shift-task-equipment-24`. No commit, push or live deployment was performed by this task.
