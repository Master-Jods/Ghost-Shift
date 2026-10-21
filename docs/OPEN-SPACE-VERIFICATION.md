# Open-space facility verification

Verified 2026-10-19 on Windows, Node 22.14 and headless Chrome. [Implementation and exact removed structures](OPEN-SPACE.md).

## Completed checks

- Production TypeScript client/server and Vite build passed. The existing non-fatal WebGL vendor chunk advisory remains.
- **25 automated tests passed**: existing authority, gameplay, persistence, decision previews, input and settings checks; every ordered room pair physically traversed with both optional gates closed; seeded 3-6 objective rounds completed within 300 seconds; old geometry archived without resetting credentials/snapshots; old-map forecasts rejected.
- New open-floor regression checks cover every room's center lane, former central-block location, both equipment control points with 18-unit standing clearance, valid threat placement in all unprotected rooms, all 36 directed entrance approaches at 12-unit radius, and companions not acting as collision blockers.
- **4 browser scenarios passed**: entry; touch/settings/input safety; operator/A/B full round including containment, cooperative emergency, reconnect, tasks, analytics and both-player extraction; and the new sixteen-room first-person walk.
- Baseline walkthrough was run against the unmodified built environment before implementation and captured north/east views in every room. The final walkthrough used ordinary keyboard movement and pointer-locked yaw to visit all sixteen rooms, inspect north/east/equipment views, walk to the actual control approach and compare the player minimap world coordinates. No player teleport, artificial timer extension or global pause was used.
- The final room walk was repeated after the scanner support and vent refinements. A focused multiplayer/touch rerun checks active cooperative/transfer marker positions. No browser page errors were observed.
- Actual before/after contact sheets for every room, all installation views, and individual medical/reactor/storage/corridor views were inspected. Camera locations vary slightly because movement is live; the separate workflows are not comparable travel-time benchmarks.

## Actual captures

Open the [before/after gallery](screenshots/open-space/gallery.html). It includes all-room contact sheets, six detailed room comparisons, individual installation captures, and the JSON visit logs.

Quick views: [all previous rooms](screenshots/open-space/before-north-overview.png), [all current rooms](screenshots/open-space/after-north-overview.png), [current eastward views](screenshots/open-space/after-east-overview.png), [room installations](screenshots/open-space/installations-overview.png), [open Central Hub corridor](screenshots/open-space/hub-after-east.png), [Electrical](screenshots/open-space/electrical-installation.png), [Reactor](screenshots/open-space/reactor-installation.png), [Medical](screenshots/open-space/medical-installation.png), [Storage](screenshots/open-space/storage-installation.png).

These are screenshots of the runnable game, not concept art or fake map images. The montage images only arrange actual captures for inspection. The layout reference was the previously attached map in conversation; no separate reference-file inspection is claimed.

## Scope and remaining limits

The 16-room floor/corridor topology, spawn and extraction, intentional locks, ordinary mission lighting, materials, flashlight/audio, settings, Pokemon and director behavior remain. Old generic obstacle meshes and collision were replaced together. Required task/response equipment was moved to canonical edge installations with accessible standing points; transport destinations and both cooperative controls use those same definitions. The minimap's markers select the actual active control/delivery position rather than a stale pickup or partner control. Operator and player maps use the same obstacles and task snapshots.

The new map/model versions prevent mixing old geometry evaluations with the open-space revision. The new [generated 8-case evaluation](../reports/wings-v3-open-evaluation.json) is provenance, not visitor calibration; Brier remains 0.25 and paired recommendation time improvement is zero in this small sample. No predictive improvement is advertised.

[Host-only timing samples](open-space-performance.json) record CPU submission work, not completed GPU frames. No physical-phone performance, sustained thermal behavior, speaker/headphone quality or human wayfinding/pacing acceptance was measured. Pokemon remain billboard assets with limited views, and equipment is stylized procedural geometry. Fewer obstacles were not compensated for by making the station darker or adding fog.

Restart the server and create a new session/code for `ghost-shift-wings-v3-open`. The automatic archive policy retains existing operator credentials, historical sessions and snapshots. Production data/passwords were not reset during this task.
