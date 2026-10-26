> Historical v8 rules/balance report. The current v9 character/room revision is documented in [POKEMON-CHARACTERS-AND-ROOMS.md](POKEMON-CHARACTERS-AND-ROOMS.md).

# Route Trials / six-task gameplay revision

Current implementation: scenario `ghost-shift-v8-six-route-trials`, map `aster-wings-v8-route-trials`, protocol 8, model `ghost-shift-v8-six-route-trials-mc2`. Implemented directly in the existing local checkout. No private environment or production database was edited during QA.

## Rules and mechanisms

Two real trainers each select three catalog Pokemon, acknowledge the current briefing, then cooperate within at most 300 active seconds. There are always exactly six normal task instances: Electrical Wiring, Door Power Routing, Communications Calibration, Coolant Control, Research Data Transport and Dual Stabilization. Configuration rejects variable task counts and removed resource parameters. Old resource and recovery commands are no longer authorized.

Stamina/shared energy are absent from authoritative state, spending, recovery, task requirements, battle restrictions, configuration, previews, HUD, guidance and current metrics. Companion availability is activity-based. Battle integrity/HP, identification, preparation and counter cooldowns remain. Every valid species can complete mandatory puzzles; bounded species modifiers only affect encounter counters.

Wiring saves four letter/color endpoint matches and requires a test; correct matches survive a failed test. Routing validates three selectors after choosing a mutually exclusive powered shortcut. Communications requires both frequency and phase. Coolant uses coupled pressure/flow/temperature equations and server-validated +/-2-unit safe bands. Data transport requires physical carry and all three checksum channels. Dual Stabilization requires separate two-channel setups and authenticated activations within 12.35 server seconds (12 seconds plus bounded transport allowance); a miss resets activation only.

Optional companion assistance advances one wire, remains busy for three active seconds and cannot complete the whole puzzle. Other normal mechanisms remain manual. A held-passage Pokemon stays at the mechanism visually and cannot join a second activity; available reserves remain usable.

## Canonical layout and progression

The footprint is expanded to 6290 x 4930 world units. Movement speed remains 185 units/s. Original open room interiors and horror styling remain; room walls come from the exact room/corridor union, with disjoint floor/ceiling tiles and no decorative doorway shells.

The cross-wing Medical/Power shortcut and separated western fallback connector create meaningful route differences. The earlier incidental Medical/Security/corridor overlap was removed. Research access is task-unlocked, routes A/B are switchable from Electrical, west access can be companion-held or permanently repaired, and extraction entrances have actual final gates. Unlock tasks are reachable with optional doors closed; the nonfinal fallback graph remains connected.

Final gate rectangles derive from the full canonical extraction openings. QA identified and removed a side gap caused by treating a merged room/corridor opening as a narrow doorway. Closed final access is now unreachable through navigation and physical collision. Once released, final gates remain open while extraction eligibility still checks all six tasks and blocking incidents; late injections therefore cannot entrap a trainer inside.

A shared override key opens eligible research/latch access only. Confirmation revalidates the key and state atomically, and duplicate commands are idempotent. It never completes normal work. Route switching, recall, guardian deployment and lockdown check doorway occupancy. Recall/latch repair release the correct owner's Pokemon. Ghost/camera obstruction and both maps use the same gate geometry/state.

Guardian links are explicit gate IDs, never a guessed nearest door. The deployment closes the linked gate; a three-second encounter telegraph precedes counter actions. Defeat/containment clears the correct seal and local effects; expiry/cancellation clean up the incident without pretending a successful guardian response. Emergency severity increases solo reset steps or paired response rounds. Cooperative data-corruption incidents preserve a carrier and then require both Communications controls; the carrier restriction cannot prevent the partner from responding. Remote projections retain public gate closure state without disclosing hidden encounter identity. An undisclosed extraction blocker prevents numerical mission forecasts: the adviser explicitly reports insufficient known information instead of simulating an impossible extraction or inventing a percentage. Such unavailable estimates are excluded from forecast accuracy records.

## Analytics and timing

The actual reducer drives all rollouts and action traces. Eight policy candidates compare parallel/joint/swapped assignments, responder priorities, battle/containment versus noncritical bypass, route A/B, key spending/preservation and held access. Ranking prioritizes sampled joint extraction, successful completion time, then travel. The trace is a representative successful run, or explicitly labelled incomplete when no tested run succeeds. This is a bounded best found, not a proof of global optimality.

Player forecasts include only disclosed incidents; unseen partner positions use disclosed room representatives. Four matched-seed runs per policy keep jobs bounded. Normal puzzle solving adds an explicit generated 5-14 seconds on first arrival per trainer; seeded reaction and movement assumptions are not measured visitor behavior. Predictions assume no further unknown manual injections.

Material changes invalidate displayed forecasts immediately. Clock-only refreshes wait for an in-flight job instead of cancelling it every 30-second boundary; this fixes two-client worker starvation. Stable estimates identify their snapshot time, refresh after approximately 30 active seconds, and expire after 45 seconds. Acceptance checks snapshot age as well as material state. Facts and failure consequences update from the snapshot while simulations run asynchronously. Stale jobs are cancelled, cleanup covers late job creation, and hidden duplicate panels do not compete. Material revalidation still applies when confirming decisions.

Computed route alternatives report their current door/target assumptions, travel and decision/encounter contribution, key use and companion impact. Navigation-grid distances are labelled estimates. The balance report separately traces actual legal movement at full input, which is used for the delivery route-time examples.

## KPI definitions

- Normal completion: completed required instances / 6, separate from additional incidents.
- Joint success: both physical arrivals after eligibility; successful completion time excludes incomplete runs.
- Travel: actual server displacement time per trainer. Parallel trainer seconds overlap.
- Task interaction: actual active server time while a trainer has a valid nearby terminal open; not one fabricated second per click. Errors/retries are recorded separately.
- Coordination: union of active pending approval/paired waiting seconds; approval and paired subcategories can overlap and must not be added blindly.
- Guardian battle/containment: encounter response-to-resolution interval, separate from creation-to-resolution travel/response delay.
- Companion assignment: sum of busy companion seconds; parallel assignments can overlap round time.
- Override usage, door changes, incident response/resolution, intervention count/severity and cohort are persisted with the scenario version.

## Measured feasibility

`reports/route-trials-balance.json` contains physical route traces and generated whole-round fixtures. Representative Electrical-to-Medical: 9.24s through Shortcut A versus 26.27s through Workshop > Security > Arrival. Other recorded pairs also meet the approximate 8-12 / 25-35 second targets.

The fastest observed automated legal run is 108 active seconds; it is not a mathematical lower bound or a visitor pacing claim. Six explicit modeled cohorts finish in 165-235 seconds without added interventions and 172-256 seconds with a bounded standardized intervention. This is evidence of initial five-minute feasibility for parallel work, not a guarantee against arbitrary repeated operator choices.

## QA record

Final production build passed. All 90 unit/integration checks passed; all 9 sequential real-Chrome browser scenarios passed in the final frozen-source run (9.3 minutes). The existing large WebGL vendor chunk warning remains nonfatal. The complete two-client keyboard round finished successfully in 186 active seconds, with all six tasks, carried-data reconnect, both physical arrivals and no recorded browser errors. Tests explicitly separate controlled terminal/door/room approach fixtures from the complete two-client keyboard traversal, carried-data reconnect and physical joint extraction.

An earlier integration run exposed periodic forecast cancellation under two-client worker contention; the final refresh scheduling fix and regression passed. The preview refresh fixture now waits for the actual bounded analytical request rather than using an unrelated 15-second default. Other fixes include final-gate side gaps, dynamic gates incorrectly baked into navigation, shared-boundary overlap, cooperative corruption carrier authorization, and hidden-blocker forecast correctness.

Meaningful regressions cover no resource restrictions, fixed six-task initialization, all puzzle stages, wrong-input preservation, key idempotency, gate occupancy, guardian identity/gate state, independent task reachability, held assignments/recall/repair, final-gate coverage and safe late blocking, real collision/camera geometry, authoritative time, map signatures and old-session archival.

Remaining balance work is real visitor playtesting: puzzle comprehension, two-person communication, lower-end device performance, accessibility and repeated/high-severity operator cohorts. Conditional/generated estimates are not real-world accuracy guarantees. Historical pre-v8 evaluations remain preserved and are excluded from current comparisons. The current policy benchmark gives the tasks-first baseline and recommended policy the same generated puzzle, reaction, movement and intervention assumptions. An earlier zero-puzzle-delay baseline was an unfair comparison and is not used for the final policy improvement result.

## Inspected rendered artifacts

Screenshots were opened and visually inspected, in addition to DOM, network and geometry assertions:

- [Readable coupled coolant readings](screenshots/route-trials/coolant.png)
- [Mutually exclusive door decisions and real fallback sequence](screenshots/route-trials/door-tradeoffs.png)
- [Canonical operator facility map](screenshots/route-trials/operator-map.png)
- [Live guardian guidance](screenshots/route-trials/guardian-analytics.png)
- [Containment consequence and reopened gate](screenshots/route-trials/guardian-resolved.png)
- [Successful physical joint extraction](screenshots/route-trials/joint-extraction.png)

The room audit uses controlled room-center approach fixtures. It is not claimed as a single uninterrupted facility tour. The separate full-round test uses real keyboard travel and no terminal staging.

## Final current-model evaluation

`reports/route-trials-evaluation.json` contains 16 generated held-out scenarios under `ghost-shift-v8-six-route-trials-mc2`. Snapshots begin after 0, 30, 90 or 180 idle active seconds; this includes intentionally late/incomplete continuations, rather than representing 16 fresh visitor rounds. Half of observed continuations receive predefined interventions that the forecasts do not assume.

- Time MAE: **17.25 seconds**, on 12 successful observed outcomes with defined predicted times.
- Deadline Brier score: **0.00390625**, on all 16 generated outcomes. This small synthetic sample does not establish real-world calibration.
- Matched policy comparison: tasks-first baseline and selected plan both succeed in **12/16 (75%)**. Among the 12 mutually successful pairs, the selected plan is **0.33 seconds slower on average**. No measured policy advantage is demonstrated by this set; recommendations remain the best found within the sampled search, not a guarantee of optimal efficiency.
- The comparison uses equal generated puzzle/reaction/movement/intervention assumptions; the previous zero-delay baseline has been replaced. Real visitor cohorts and more diverse repeated/high-severity interventions are still required.

See [machine-readable QA](../reports/route-trials-qa.json), [physical route/balance traces](../reports/route-trials-balance.json), [full browser round](../reports/route-trials-browser-run-v8.json) and [evaluation rows](../reports/route-trials-evaluation.json).
