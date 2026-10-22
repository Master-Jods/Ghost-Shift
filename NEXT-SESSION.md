# Project handoff — Ghost Shift industrial revision

Updated 2026-10-22. Current repository: `C:\Pokemon Day - Among Us` (renamed from `C:\Jigsaw Trials`).

Latest specification: `C:\Users\USER\.codex\attachments\bd5db95c-9b89-4c56-980c-29e5a573e67d\Pasted text.txt`.

## Implemented

- Shared red industrial presentation across player entry, team selection, lobby, HUD, tasks, encounters, settings, results and operator pages, with original decorative SVG and responsive layouts.
- Landing/lobby/in-game manual and eight illustrated briefing steps. Server requires both current acknowledgments before starting; reconnect preserves them, configuration/team changes invalidate them. Briefing time is outside the active clock.
- Real circuit restoration and signal calibration alternatives with different authoritative energy, stamina, timing and access effects; preview, confirmation and persisted consequence receipts.
- Contextual encounter explanations, counterplay, disabled-action reasons and server action feedback.
- Visible Field Analyst WHY / WHAT NEXT / BEST ACTION, current evidence, bounded Monte Carlo comparisons, concrete joint next steps, acceptance/override records and stale markers. Matching operator intelligence. No autoplay.
- Correct task/incident assignment release, corruption carrier delivery, cooperative priority overload rounds, cancellation cleanup, resource reservations and cost-once guards.
- Stale-preview recovery keeps the error in the active decision dialog; a duplicate global toast can no longer cover Refresh preview. Browser regression exercises partner-selection invalidation, no spending on rejection and normal refresh/confirmation.
- Player evidence and forecasts exclude undisclosed remote threats, including event/broadcast details.
- Preserved first-person multiplayer, all-catalog selection, three companions, manual operator injections, 300-second active deadline, shared collision, task journal and joint extraction.

## Verification and evidence

- `npm.cmd test`: 77 passing unit/integration tests.
- Generated task QA: 44 passing cases across normal alternatives, emergency scopes/allocations, briefing, assignment, feasibility and analysis; snapshot continuation plus real SQLite restart/rejoin and socket reconnect coverage.
- `npm.cmd run build`: passed; existing nonfatal WebGL vendor chunk-size advisory remains.
- `npm.cmd run test:e2e`: 6/6 passed in the final sequential suite (3.4 minutes), including all 16 rooms, three-client joint extraction, stale-preview recovery and emulated landscape touch. See `docs/INDUSTRIAL-REVISION.md`. Fixtures use real keyboard movement and terminal controls; material-stale decisions follow the visible Refresh preview flow.
- Fresh evaluation: `reports/industrial-v5-evaluation.json`, 16 held-out generated scenarios, 13 successful time pairs, Brier 0.1484375, remaining-time MAE 5.31 seconds. Generated checks are not visitor calibration or proof of human performance improvement.
- Full report: [Industrial revision](docs/INDUSTRIAL-REVISION.md).
- QA inventory: [Task QA matrix](docs/TASK-QA-MATRIX.md).

## Run

Stop the existing host with Ctrl+C, then:

```powershell
Set-Location 'C:\Pokemon Day - Among Us'
npm.cmd run build
npm.cmd start
```

Open `http://localhost:8787/operator` and create a NEW shift. Both players join `/play`, select three companions, finalize, read the briefing and acknowledge **I understand — Ready** before the operator starts.

Map `aster-wings-v4-collision`, scenario `ghost-shift-wings-v5-decisions`, protocol **6**, model `ghost-shift-wings-v5-decisions-mc1`, service-worker cache `ghost-shift-industrial-decisions-5c`. Old scenario sessions are archived on startup; stored history remains. Do not reset the production database or operator credentials.

Private `.env`, production database and operator password were not modified. The user authorized committing and pushing this revision to `origin/main` on 2026-10-22. Previous pushed base is `c44fe5a`; use `git log -1` and `git status -sb` for the resulting revision and sync state. No deployment was requested. No user host is left running by this task; test servers close after verification.

Physical phones/tablets, booth LAN, packet loss, audio listening, sustained performance and first-time visitor pacing remain on-site acceptance work. Existing Pokémon companions remain depth-tested billboards. Older reports are historical and do not validate the revised model.
