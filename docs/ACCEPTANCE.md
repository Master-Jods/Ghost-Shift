# Ghost Shift verification and physical acceptance

Current 2026-10-21 revision: [industrial interface, tradeoffs and analytics](INDUSTRIAL-REVISION.md), [task QA matrix](TASK-QA-MATRIX.md). Older dated results below are historical.

Current revision: 2026-10-20, Windows / Node 22.14. See [collision and task journal verification](COLLISION-JOURNAL-VERIFICATION.md) for current geometry, cache agreement, journal/input behavior and screenshots. The 2026-10-19 checks below remain historical evidence.

## Automated checks

- `npm.cmd test`: 25 rule/server/input/navigation/presentation/archive tests passed.
- `npm.cmd run build`: strict client/server TypeScript checks and Vite production build passed.
- `npm.cmd run test:e2e`: 4 browser tests passed; the integrated test uses three independently authenticated Chrome browser contexts.
- The full browser flow selects exactly three entries per trainer, including IDs 10001/10002 beyond the initial API page, then starts threat-free. Actual keyboard movement and mouse-look cross the shared collision map. The operator previews/confirms Gengar injection; the target scouts, guards and contains it. A cooperative emergency survives a browser reconnect and is resolved at separate controls. Normal objectives and joint physical extraction complete before 300 seconds. Persisted KPI values match the actual session and the operator forecast screen runs a real worker job.
- Rule/server coverage includes every supported threat's universal counterplay, solo/cooperative emergency controls, overload partner approval/priority steps, carried corruption, event caps/budgets, blocked and late placement, telegraph, expiry cleanup, pause/deadline behavior, stale/duplicate/unauthorized confirmations, SQLite restart recovery, credential preservation, export authorization and extracted-responder rejection.
- Production database received a consistent pre-migration backup in `backups/`; migration 002 applied. Existing operator creation was idempotent and preserved its password.
- Player world, operator overview, encounter preview, extraction and analytics captures under ignored `.qa/ghost-*.png` were inspected.

Browser tests start an isolated ephemeral backend and database. They do not replace the booth database, bypass task completion, teleport trainers or inject completion flags. The navigation test helper reads shared geometry to select normal keyboard inputs; task/response actions use visible UI controls. Fixtures use deterministic cached metadata and official bundled artwork. They are automated clients, not measured visitors.

## Physical acceptance — pending

- [ ] Two real player phones/tablets and a third operator on the intended LAN.
- [ ] Touch joystick and look behavior on target iOS/Android browsers.
- [ ] Fullscreen, pointer-lock, audio-permission, landscape and reduced-motion checks.
- [ ] Real packet loss, disconnect/rejoin and host restart during a shared incident.
- [ ] Cache/offline artwork fallback on those devices.
- [ ] Visitor comprehension, accessibility, route finding and five-minute pacing.
- [ ] Sustained device thermal/battery/frame-time behavior.

No automated pass establishes physical-device suitability or human forecast calibration. The player renderer is WebGL facility geometry with depth-tested billboard Pokémon; no full-catalog polygon models are claimed.

The atmospheric presentation revision adds emulated landscape touch, slot replacement/readiness, input-focus/overlay safety, quality, mixer unlock and accessibility checks. Physical audio listening and device performance remain pending. See PRESENTATION.md and PRESENTATION-VERIFICATION.md for exact scope and captured evidence.

Current open-space revision includes a keyboard-driven first-person audit through all sixteen rooms, real control approaches and before/after captures. See [OPEN-SPACE-VERIFICATION.md](OPEN-SPACE-VERIFICATION.md).
