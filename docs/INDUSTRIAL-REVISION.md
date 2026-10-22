# Red industrial / visible analytics revision

Implemented 2026-10-21; final verification 2026-10-22, against the supplied revised specification. This is a local update to the existing repository; the production database, credentials and private `.env` were preserved.

## How to experience it

1. Stop an existing host, run `npm.cmd run build`, then `npm.cmd start`.
2. In `/operator`, create a **new shift**. Old scenario sessions remain historical and are archived on startup.
3. Each trainer joins their own slot, selects three companions, finalizes the team and opens **Read field briefing**. The illustrated eight-step briefing ends with **I understand - Ready** (the UI uses an em dash). Both acknowledgments must be present before Start shift is accepted. Lobby/briefing time is outside the mission clock; reconnect preserves acknowledgment and progress.
4. Use the landing **HOW TO PLAY**, lobby **How to play**, or in-game **Help** for the manual. TAB / Tasks, M / Objectives, sensitivity, touch controls and the larger minimap remain available.
5. At Electrical circuit assignments, preview **Full wing restoration** versus **Essential systems**. At Communications frequency assignments, preview **Companion-assisted boost** versus **Standard calibration**. The task pool varies by session seed; these assignments are selectable normal task types, not guaranteed in every random round.
6. The **FIELD ANALYST** card explains WHY, WHAT NEXT and BEST ACTION. Expand it for evidence, conditional estimates, model assumptions and compared policies. Task/incident panels integrate analysis in their own expandable section; preview review temporarily replaces the underlying panel, avoiding stacked visible modals.
7. Confirmation commits actual costs once. Receipts identify real spending, restoration, task progress, access or incident changes. A prediction invalidated by the decision is marked outdated and refreshed. Accepting guidance records intent only; it never autoplays or spends without the normal required actions.
8. Operator Overview and Analytics show the corresponding field guidance, persisted player forecasts, stale markers, model/version assumptions, chosen options, receipts and accepted/overridden recommendations. Existing outcome pairs, event timeline, cohorts, exports and worker jobs remain available. The compared policy also supplies concrete next steps for Trainer A and Trainer B, including the selected available companion and station/incident interaction.

## Presentation

The shared `industrial.css` tokens provide near-black surfaces, crimson branding, off-white body text, readable gray secondary text and separate green/amber semantic states. The old olive player/daylight operator skins were retired after screenshot inspection showed they overrode the new design. Heading typography, body sizes, controls, focus treatment, charts and operator map labels were enlarged. The HUD adapts around the minimap, left tracker and touch joystick instead of scaling every panel over the camera.

The corner webs, worn plate and stylized dried paint shapes are original non-graphic SVG/CSS decoration behind content. Existing official Pokemon artwork and companions retain the Pokemon identity. No Lethal Company artwork or Jigsaw branding was added.

## Authoritative choices and defect fixes

- Full wing restoration costs 2 energy at confirmed option selection, shortens its circuit sequence to 2 channels and makes the Medical/Hub shortcut available when completed; active incident locks still apply. Essential systems uses 3 channels and no energy. Mandatory work remains feasible. Optional spending cannot consume the energy required by an active overload or a pending power proposal.
- Communications boost costs 15 stamina once and needs an available selected companion with at least 25 stamina. A correct boosted frequency completes immediately. Standard costs nothing; tune, allow 8 active seconds, then confirm. It remains available with fatigued/unavailable companions.
- Priority overload really adds a solo reset channel; its both-player variant now requires a second synchronized activation round. Balanced costs more energy and needs one standard paired round.
- Repeated companion assistance cannot repeatedly skip task steps. Related assignments release on completion/resolution/cancellation and timed assignments release normally.
- A corruption fragment cannot be restored by a distant partner until its carrier actually reaches Communications.
- Cancellation clears related pending requests/effects; missed paired windows reset cleanly and record the retry state.
- Preview fingerprints include actual task progress, option, carrier and activation state. Reused, stale, duplicate and unaffordable operations cannot double-charge.
- The briefing is server-owned. Missing/stale acknowledgment cannot ready a player or start the shift. Team/configuration changes and released slots invalidate readiness/acknowledgment; reconnect does not restart briefing or active time.

## Analytics methods and current evaluation

Model: **ghost-shift-wings-v5-decisions-mc1**. Method: **monte-carlo-actual-rules**. Policies execute legal movement, normal task choices, calibrated timing, incident controls, companion response and approval actions through the shared authoritative reducer/collision geometry. Player snapshots and supporting event/broadcast evidence redact undisclosed remote threat details; player forecasts also exclude those threats and use a disclosed room representative for an unseen partner.

The analyst refreshes after material events/state changes and 30-second deadline bands, including partner room, selection, availability and material stamina thresholds, with a debounce, shared request deduplication and at least 4 seconds between new requests. It never requests on each render frame. There are 4 samples per player policy/choice comparison; estimates may honestly be unavailable, stale or have no successful time population. Reaction/pace assumptions are declared; arbitrary future manual injections are unknown. Acceptance still undergoes a fresh server preview/confirmation.

The fresh [16-scenario evaluation](../reports/industrial-v5-evaluation.json) supersedes v4 as current model evidence:

| Measure | Generated result |
|---|---:|
| Held-out scenarios | 16, seeds 1001-1016 |
| Separate smoke seeds | 1-4 |
| Successful time-pair population | 13 |
| Successful remaining-time MAE | 5.31 seconds |
| Fixed 150-second baseline MAE | 119.31 seconds |
| Deadline Brier score | 0.14844 |
| Fixed 0.5 deadline baseline Brier | 0.25 |
| Matched successful pairs | 13 |
| Mean paired policy time difference | 1.08 seconds faster for selected policy |
| Baseline / selected-policy success | 81.25% / 81.25% |

These are small generated-system checks, not measured visitors. Half the observed runs have predefined standardized events while forecasts assume none; that distribution shift is explicit in the report. The 1.08-second modeled difference is not a validated human performance improvement. Historical reports remain archived and are excluded by model/scenario version.

## Verification

- Production TypeScript and Vite build passed; the existing WebGL vendor chunk-size advisory is nonfatal.
- **77 unit/integration tests passed**. The [complete QA inventory and results](TASK-QA-MATRIX.md) includes 44 task/incident/choice/state cases, plus server transaction, restart, visibility and navigation coverage.
- The final sequential browser suite passed **6/6 in 3.4 minutes**, including three independent browser clients through joint extraction, all 16 rooms, explicit stale-preview recovery and an 844x390 emulated landscape phone. Reviewed captures are listed below.

The geometry remains `aster-wings-v4-collision`; scenario is `ghost-shift-wings-v5-decisions`; protocol is **6**; the service-worker shell version changed. Previous rule evaluations are not reused. Stored history/operator credentials remain intact. No public deployment was performed. The user subsequently authorized committing and pushing this revision to GitHub on 2026-10-22.

## Remaining acceptance limits

Actual target phones/tablets, intended booth LAN, packet loss, audio listening, long-session performance and first-time visitor pacing still require physical acceptance. The Pokemon renderer retains depth-tested billboard companions. Forecasts assume cooperative legal actions with declared timing; they do not model arbitrary future operator choices or establish visitor-calibrated probabilities.

## Inspected rendered evidence

The following captures come from isolated real Chrome browser sessions, not mockups:

- [Player landing](screenshots/industrial/industrial-entry.png), [manual](screenshots/industrial/industrial-manual.png), [team selection](screenshots/industrial/industrial-team.png).
- [Required illustrated briefing](screenshots/industrial/industrial-briefing.png).
- [Task alternatives](screenshots/industrial/industrial-task-options.png), [conditional option preview](screenshots/industrial/industrial-option-preview.png), [actual consequence](screenshots/industrial/industrial-consequence.png).
- [Visible Field Analyst](screenshots/industrial/industrial-analyst.png), [contextual encounter](screenshots/industrial/industrial-encounter.png).
- [Operator overview](screenshots/industrial/industrial-operator.png), [operator analytics](screenshots/industrial/industrial-analytics.png).
- [844x390 landscape HUD](screenshots/industrial/industrial-phone.png), [phone task journal](screenshots/industrial/industrial-phone-journal.png).
- [Actual joint extraction](screenshots/industrial/extraction.png).

The keyboard test driver originally treated any small camera-relative component as a full diagonal key. At some yaw angles this sent the robot into a real corridor corner instead of along the route. Diagnostic traces confirmed live input and an unpaused mission. The driver evaluates the next legal displacement and remaining route cost for each of the eight ordinary keyboard directions, then reasserts the chosen held keys. This handles camera angles and real corridor corners without altering collision. Actual collision and ordinary movement rules were preserved; no teleport or completed-task shortcut was added to the browser flow. The corrected driver completed the full multiplayer and all-room scenarios.

Concurrent partner activity can correctly invalidate a preview while it is being reviewed. The browser fixture now follows the visible Refresh preview flow for an explicit material-stale rejection, then reviews and confirms the fresh option. It does not suppress stale checks or bypass confirmation.

Final browser inspection also reproduced a real recovery issue: a duplicate network error toast intercepted clicks on Refresh preview after a material-stale rejection. Network errors are now shown inside the active decision dialog, with the global toast reserved for when no decision is open. The industrial browser scenario explicitly changes the partner selection, verifies rejection without spending, refreshes through the visible button and confirms the new preview. No forced clicks or stale-validation bypass are used.
