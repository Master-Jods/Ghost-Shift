> Historical revision. Current first-person camera, real Showdown battles, fast live predictions and fatal emergency rules are documented in [v10](V10-CRITICAL-INCIDENTS.md). Asset provenance and earlier measurements below remain historical evidence.

> Historical pre-v8 report. Current gameplay, map measurements, resource-free rules and validation are documented in [Route Trials revision](ROUTE-TRIALS-REVISION.md). Earlier timing/accuracy claims are not current.

# Field analytics and readable task targets

Implemented locally on 2026-10-24. Model: `ghost-shift-wings-v7-canonical-layout-mc2`. Scenario/map rules remain unchanged.

## What was missing

The previous compact display exposed only extraction counts and successful mean time. Prescriptions contained a single immediate action for each trainer, even though the model simulated an entire continuation. Material invalidation omitted incident severity, scope, deadlines and power-system state. A four-second client delay also delayed recomputation. All task modes displayed Greek codes, including numeric coolant gauges and fuse ratings; coolant readout units appeared only on the final value.

## Prediction

The HUD requests eight seeded reducer rollouts per policy and compares four policies with matched seeds. Results include joint extraction versus deadline failure, successful completion time/range, remaining deadline margin, low-reserve risk, mean ending energy, unfinished assignments, and individual current emergency/encounter resolution, miss/expiry and still-active outcomes. Old missed incidents no longer inflate current-incident risk. Incident failure consequences and Pokemon counterplay come directly from game definitions and appear while simulations are pending.

The simulations use actual server task, door, movement, resource, stamina, incident and extraction rules. Route ordering uses canonical navigation path lengths, including carried-fragment destinations and separate paired controls. Urgent/blocking emergencies take priority over encounters in response-oriented policies. Task-first is retained as an explicit alternative for noncritical interruptions.

## Prescription

Each rollout records accepted reducer actions and completion/extraction transitions. The selected policy exposes a chronological, timestamped joint sequence for both trainers, including travel, companion changes, channel/target values, paid/free task options, data transport, signal waiting and paired controls. The displayed trace comes from the median-duration successful rollout; if none succeed, it is clearly labelled incomplete. Repeated inputs are collapsed.

The objective ranks joint extraction frequency first, successful completion time second and low-energy risk third. This is the most efficient policy found in a bounded four-policy search, not a mathematical global optimum. Both trainers act in parallel. Accepting guidance records a decision; it does not automate play.

## Refresh and stale results

Material keys now include incident identity/species, behavior, severity, target/scope, origin/control locations, expiry, blocking status, response progress, allocation and system state. Ordinary frame/yaw churn and pursuit animation do not trigger per-frame analysis. Time refreshes use ten-second active-time bands.

A received changed snapshot immediately hides old forecasts and ordered sequences. Current facts/consequences appear immediately, while replacement Monte Carlo results arrive asynchronously. Requests debounce at 100ms with a 1.75-second per-trainer request spacing compatible with server rate limits. Superseded jobs are cancelled, including requests whose creation finishes after cleanup; inactive components cannot overwrite newer results. Hidden duplicate HUD panels do not launch competing analyses. Server material revalidation still rejects stale acceptance. Operator views also withhold stale estimates and can inspect the full recorded joint sequence.

"Immediate" means immediate invalidation and current rule-based facts, not instant computation or guaranteed predictions. Future arbitrary operator actions are unknown. Only player-disclosed incidents are supplied to player forecasts. These are generated conditional outcomes, not visitor-calibrated probabilities.

## Task targets

`src/taskLabels.ts` supplies mode-aware targets. Channel controls use readable A/B/C/D labels consistently across wiring, relays, access codes, checksums and emergency resets. Coolant targets and actual/target gauges show pressure (kPa), flow (L/s) and return temperature (degrees C). Signal targets remain numeric settings; fuse targets specify amperage/voltage/material; paired controls show the coordination requirement. Server answers remain numeric, so saved task progress is compatible.

Frontend service-worker cache is advanced to `ghost-shift-analytics-2`. Restart the server and refresh clients to load new compiled code. This change requires no scenario archival or production database migration.

## Verification

New reducer tests cover read-only rollout traces, chronological two-trainer actions, resources, real emergency and Pokemon injections, material invalidation and numeric target mapping. Browser regression covers every normal minigame, the authoritative operator preview/confirmation flow, event-driven analytics refresh and Pokemon outcome/sequence refresh. Final build and all 100 unit checks pass. Every normal minigame passes browser QA; multiplayer encounter, emergency reconnect and joint extraction regression also passed during this revision. The generated 16-scenario evaluation is `reports/field-analytics-evaluation.json`: successful-time MAE 4.79 seconds (14 successful pairs), Brier 0.1484375. These small generated results are not visitor calibration. Existing layout, camera and multiplayer behavior is preserved.

Final live injection browser test passed through operator previews and confirmations for both Blackout and Gengar, checking replacement incident forecasts and ordered prescriptions. Rendered coolant and injection screenshots are retained in `docs/screenshots/analytics/`. The browser assertions wait for asynchronous simulations rather than reading a transient updating state.
