> Current task UI QA (2026-10-26): all **6 normal tasks and 8 emergency types** were completed through browser controls, including coolant drag/retry, partner approval, three viewport layouts and a full keyboard-travel/joint-extraction round. See [current task equipment audit](TASK-EQUIPMENT-QA.md) and [machine-readable results](../reports/task-equipment-qa.json). The older inventory below is retained as historical documentation.

> Historical pre-v8 report. Current gameplay, map measurements, resource-free rules and validation are documented in [Route Trials revision](ROUTE-TRIALS-REVISION.md). Earlier timing/accuracy claims are not current.

# Industrial revision / task QA matrix

Current scenario: `ghost-shift-wings-v5-decisions`; protocol **6**; analytics model `ghost-shift-wings-v5-decisions-mc1`. Canonical collision map remains `aster-wings-v4-collision`.

This inventory is derived from `TASK_TYPES`, `EMERGENCIES`, the shared reducer and the option definitions. It is not a separate frontend checklist. Machine-readable case results: [task-qa-generated.json](../reports/task-qa-generated.json).

## Normal assignments

Every terminal requires the correct assigned trainer (or the appropriate A/B control for a cooperative assignment), a clear sightline and distance <=85 world units. All eight terminals and both paired controls are verified walkable; the browser room audit approaches all sixteen room installations.

| Selectable assignment | Location and inputs | Completion / alternatives | Resources and companion effects | Partner / invalid / retry |
|---|---|---|---|---|
| Route electrical circuits | Electrical, displayed channel sequence | Choose Full restoration: 2 channels and Medical/Hub shortcut available after completion. Essential systems: 3 channels; Security still controls normal shortcut access. | Full spends 2 energy exactly once at confirmation. Essential costs 0. No stamina cost. | Trainer ownership; wrong channels do not advance. Choice cannot be changed/repeated after commitment. Both routes retain mandatory completion paths. Active incident locks take precedence over normal restored access. |
| Tune communication signal | Communications, displayed frequency | Boost: correct frequency finishes immediately. Standard: tune, wait 8 active seconds, then confirm stable signal. | Boost spends 15 selected-companion stamina once, requires available companion with >=25 stamina. Standard is free and works with unavailable/fatigued companions. | Correct owner. Early stable-signal confirmation does not advance; incorrect frequency can be retried. Partner remains free. |
| Calibrate laboratory equipment | Containment Lab, three numeric gauges | Match all three displayed targets and Apply calibration. | No shared resource cost. | Correct owner; incomplete/wrong settings do not complete; retry available. |
| Balance coolant valves | Cooling Station, displayed channel sequence | All correct channels in order. | No shared cost; optional assistance advances one sequence step once and assigns companion for 3 seconds. | Correct owner; wrong inputs do not advance. Repeated assistance cannot skip multiple steps. |
| Upload research data | Archive pickup, Communications upload | Retrieve, physically carry to destination, then upload. | No shared resource/stamina cost. | Assigned carrier must upload at destination. Repeated pickup at Archive cannot complete delivery. |
| Restore access permissions | Security, displayed access symbol | Correct symbol opens its optional gate. | No shared resource cost. | Correct owner, wrong symbols do not advance; retry available. |
| Replace damaged fuse | Maintenance Workshop, indicated fuse rating | Correct fuse selection. | No shared resource cost. | Correct owner, incorrect rating does not advance; retry available. |
| Stabilize containment equipment | Reactor, separately marked A/B stabilizers | Different trainers activate their own controls within 12 active seconds. | No shared resource cost. | One trainer cannot finish both sides. A missed window clears activation state and both controls can be retried. |

No normal task expires independently. The shared configured round deadline (maximum 300 active seconds) remains authoritative. A completed task rejects repeated inputs and updates shared progress, journal, map and operator state. Full restoration does not replace the requirement to complete every assigned task.

## Injected emergencies

Solo-capable incidents are tested in A, B, either and both scopes. Reactor and containment leak force both-trainer scope. Effects cease on resolution, expiry or operator cancellation. The operator must pass placement/travel, deadline, budget and concurrency checks before activation.

| Incident | Actual mechanism | Variant / resource effects | Retry, expiry and cleanup |
|---|---|---|---|
| Blackout | Electrical, 3 indicated reset channels | A/B/either: sequential reset. Both: separate controls within 12 seconds. | Wrong channel rejected. Expiry restores lighting with bounded stamina consequence; cancellation clears effect. |
| Communications interference | Communications, 2 indicated relay reset channels | A/B/either or paired controls. No energy cost. | Quick signals unavailable to affected scope while active; restored on cleanup. Invalid input cannot advance. |
| Reactor instability | Reactor, separate stabilizers within 12 seconds | Both trainers required. | Missed coordination resets controls. Expiry uses safe bypass and at most 1 energy above the reserve. |
| Coolant failure | Cooling Station, indicated valve resets | A/B/either or both-control variant. | Local slowdown ends with cleanup; deadline miss recorded distinctly from resolution/cancellation. |
| Containment leak | Containment Lab, paired isolation controls | Both trainers, 12-second window. | Retry after reset; safe isolation and bounded stamina consequence on expiry. |
| Door lockdown | Security resets; alternate loops remain connected | Solo scope or both-control variant. | Real optional gate releases on cleanup; no route through a locked wall is fabricated. |
| Research data corruption | Retrieve at Archive, carry to Communications, restore | Solo scoped trainer or either responder; carrier must actually be at Communications. Both variant needs both responses there within 12 seconds after delivery. | A partner waiting at destination cannot remotely deliver a fragment still at Archive. Expiry isolates fragment without deleting mandatory dataset. |
| Power overload | Electrical proposal, other trainer approval, then response | Balanced: 2 energy, standard reset. Priority: 1 energy, extra solo channel **or two paired activation rounds** in both scope. | Proposer cannot self-approve; spending occurs once after approval/revalidation. Expired/rejected/cancelled requests reserve no resources. Incident cancellation clears pending request/assignment. |

## Executed automated coverage

The generated matrix contains **44 passing cases**: 10 normal task/choice paths, 30 emergency scope/allocation combinations and 4 briefing/assignment/feasibility/analysis checks. It checks ownership/range, wrong input, duplicate completion/selection, exact costs, free fallback, distinct participants, coordination reset, carrier delivery, expiry/cancellation and relevant event/receipt records. Every normal/emergency variant also undergoes JSON snapshot round-trip before continuing.

The overall suite has **77 passing tests**, including:

- Server transaction tests for read-only option previews, material-stale rejection, idempotent confirmations, reuse rejection and exact spending.
- Actual SQLite restart/rejoin for committed full restoration, receipts, access effect and briefing acknowledgment; the existing restart test retains an active emergency.
- Real API privacy checks ensure supporting event/broadcast evidence does not reveal an unseen remote threat, while the affected trainer retains the proper evidence.
- Model version/visibility checks, no frame-by-frame analyst refresh, deterministic forecasts and no species-dependent mandatory requirements.
- All-room-pair navigation with optional gates closed, real walls and open/locked-door collision, clear controls, and both A/B movement regressions.
- Scoped cancellation releases related companion assignments. Stamina restoration receipts report restoration, rather than negative spending.

Browser coverage uses actual UI and independent authenticated clients for briefing, task choices and confirmation, forecast acceptance/override, encounter counterplay, cooperative emergency after reconnect, shared completion and joint extraction. A separate audit walks through all 16 rooms using keyboard movement; touch and settings are tested in an emulated landscape viewport. See the revision report for the final browser-run result.

## Scope of the evidence

Snapshot round-trips are not separate physical-device reconnects for all 40 task/incident paths. Real socket reconnect is exercised during a cooperative emergency; real SQLite restart covers shared persistence machinery with an active incident and committed task choice. Reducer fixtures set positions to isolate interaction rules; browser navigation/extraction fixtures use ordinary movement and terminal UI. No test replaces the booth database or supplies completion flags to the real browser flow.

Physical iOS/Android acceptance, real LAN packet loss, visitor comprehension, audio listening and sustained device performance remain unmeasured. This report does not claim a bug-free system.
