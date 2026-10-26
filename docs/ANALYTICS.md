> Historical pre-v8 report. Current gameplay, map measurements, resource-free rules and validation are documented in [Route Trials revision](ROUTE-TRIALS-REVISION.md). Earlier timing/accuracy claims are not current.

# Ghost Shift analytics

Current version: `ghost-shift-wings-v5-decisions-mc1`, method `monte-carlo-actual-rules`. [Fresh 16-scenario evaluation](../reports/industrial-v5-evaluation.json): 13 successful time pairs, MAE 5.31 seconds, Brier 0.14844, matched policy difference 1.08 seconds with unchanged 81.25% success. These generated checks do not establish visitor accuracy or human improvement. Historical v4/v3 reports are incompatible as current-rule evidence. See [current implementation and limitations](INDUSTRIAL-REVISION.md).

## Observed data

SQLite retains selected companion records, task inputs/completions, incident activation/response/outcome, director commands, resources, recommendation decisions, previews/approvals, timed snapshots and outcome pairs. Raw render frames are not event records. Session JSON/CSV export remains operator-owned.

Task completion and joint extraction are actual state outcomes. A successful completion time is null for failed/incomplete runs. Emergency response time measures activation to first qualifying response; resolution time measures activation to successful resolution. Missed, expired, cancelled, contained and defeated outcomes remain distinct. Encounter response/resolution have corresponding timestamps. Movement seconds count actual displacement; task interaction seconds count server-accepted terminal attempts, including logged calibration mismatches, at one modeled second per attempt, not inferred time spent reading a panel. Coordination delay counts the union of approval/cooperative waiting seconds; category overlaps are explicit, and blocked-input seconds are separate. Replanning latency is active time from the latest active incident (or shift start) to accepted refreshed guidance.

Compare severity/difficulty and no-, low- and high-intervention cohorts separately. Low intervention is at most two director commands and total injected severity at most four. Companion assistance is recorded per task/incident; guidance accept/override records remain separately inspectable. Generated standardized events must not be pooled with manual human sessions.

## Predictive

Seeded continuations execute ordinary movement, task input, cooperative response, companion, encounter and power-approval actions against the shared reducer and navigation/collision rules. Reaction delay and movement pace are bounded declared assumptions, not fitted visitor behavior. The rollout has no access to arbitrary future operator choices. Unseen partner position uses a disclosed room representative rather than exact hidden coordinates.

Every forecast assumes no additional manual injections after the snapshot/proposed action. Success fraction includes incomplete outcomes. Remaining mean and central 80% interval cover successful rollouts only; missing means are unavailable rather than fabricated. Emergency resolution time, emergency-miss risk and resource-shortage risk are derived from the simulated results. Small sample extremes such as 0%/100% are not guarantees.

## Prescriptive and what-if

Four bounded candidate policies vary responder priority, route/task order, attack versus containment, selected/strongest/stamina companion choice and balanced/priority power. Comparisons use matched seeds and label the best candidate Best Plan Found. A feasible legal policy may still miss the deadline; no global optimality claim is made. Accepting guidance requires requester ownership, completed job, current material conditions and a new consequence confirmation. Acceptance logs guidance; actual human actions are still required. What-if changes a clone, reports changed assumptions and leaves live state untouched.

Forecast/planning/evaluation jobs run off the authoritative event loop, have sample/time/queue limits, support cancellation and expose provenance. Stale material conditions, authority, range and resources are rechecked when a consequence commits. History forecast/outcome pairing reports MAE only for successful outcomes and retains its sample count.

## Evaluation interpretation

Separate smoke seeds 1–4 and held-out scenario seeds 1001–1008 are disclosed. Fixed scenario variations include normal starts and legal idle delays that leave deadline pressure. Half of observed runs receive predefined standardized events; forecasts assume none, so the distribution shift is explicit. Scores are generated-system checks against a fixed time guess and 0.5 deadline baseline. They are not visitor accuracy estimates, and a lack of matched recommendation improvement must not be advertised as an improvement.
