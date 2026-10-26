> Historical pre-v8 report. Current gameplay, map measurements, resource-free rules and validation are documented in [Route Trials revision](ROUTE-TRIALS-REVISION.md). Earlier timing/accuracy claims are not current.

# Canonical map / world layout correction

Implemented 2026-10-24 in `C:\Pokemon Day - Among Us`, preserving the preceding local shoulder-camera revision.

## Root cause and audit

The structural wall perimeter already came from the union of the minimap's room/corridor rectangles. The audit did **not** find duplicate closed room shells in that perimeter, and deleting its real walls would have changed the intended map. The mismatches were in the additional rendering and map layers:

1. A separate 10-unit room-edge sampler generated **42 decorative entrance assemblies**. Each added two posts, a lintel and two floating signs, even where room rectangles overlapped corridors or met another threshold nearby. Eight pairs of frame starts were within 55 world units. These assemblies made continuous floor junctions look like repeated doors or vestibules. Their destination signs guessed the nearest path rather than identifying a defined adjacent connection.
2. The player map drew each room as a stroked closed rectangle before drawing the real perimeter. The operator map stroked both room and corridor rectangles. Those strokes looked like walls across open joins; the two maps also used different border rendering.
3. Room-edge mounting intervals were sampled in 10-unit steps while the actual layout has fractional and 5-unit edges. One West Service mounting edge extended 2.5 units off the exact perimeter. Floors and ceilings were independently drawn for all overlapping input rectangles, producing overlapping coplanar surfaces at joins.
4. Camera wall boxes independently expanded segment endpoints and centered wall thickness on the floor line; rendered wall thickness lies outside that line. This introduced a small extra camera obstruction around real returns.

## Implemented correction

`src/world.ts` retains the intended room/corridor inventory. `src/layoutGeometry.ts` derives its exact union perimeter, room mounting edges, open region contacts and non-overlapping floor/ceiling tiles. Those outputs feed the renderer, shared collision/navigation, camera, player map and operator map.

- Removed all **84 decorative posts, 42 decorative lintels and 84 floating threshold signs**. No replacement structural frames, partitions, shells or guessed entrances were added. Room names and equipment signs stay on actual solid walls; room-specific horror installations remain separate from structure.
- Both maps now draw **only canonical wall segments** as structural borders. Room fills and labels retain the intended spatial organization. Open gates use an unfilled dashed outline; closed gates retain a solid marked barrier.
- Floor/ceiling rendering uses 70 disjoint merged tiles, covering the same union exactly once. These are coplanar surface pieces, not new rooms or partitions.
- Camera and renderer use the same physical wall bounds. Open connections remain clear at trainer, sign and chase-camera heights.
- Equipment uses exact wall intervals with the existing 5-unit mount grid. All prior task controls, spawn points, equipment colliders and canonical floor/wall coordinates remain identical; no task relocation was necessary.
- The original shared movement, line-of-sight and navigation still enforce actual walls, substantial visible equipment and closed gates. Removed decorative frames had no server colliders, so no invented physics removal is claimed. No global collision bypass was introduced.

### Preserved reference geometry

| Representation | Audited result |
| --- | --- |
| Labeled rooms | 16, same shapes/coordinates |
| Input floor inventory | Same 43 room/corridor rectangles |
| Floor inventory SHA-256 | `5e89ded16b8b626968ca7d2d2c92433b3dcbbd6b9d56ae678d24e96a81276dba` |
| True wall segments | Same 152 unique perimeter segments |
| Equipment colliders / task controls / spawns | Unchanged |
| Decorative doorway assemblies | 42 ? 0 |
| Independent closed-rectangle map outlines | Removed |
| Logical region-edge contacts | 64 exact intervals; not 64 doors |
| Crossable region contacts | 53, including short corner overlaps omitted by the old broad frame filter |

The remaining shallow/non-crossable region contacts are rectangle overlap corners, not designated doorways. They receive no doorway frames or entrance markers. Actual floor boundaries, including real returns around voids, remain visible on both maps. The fix does not enlarge the minimap to accommodate extra renderer structures.

## Verification and evidence

- Production TypeScript / Vite build passed (existing nonfatal WebGL vendor chunk advisory).
- **96 unit/integration tests passed**. New tests cover adjacent/overlapping rectangle joins, unique walls with exactly one solid side, exact mounting edges, one-time surface coverage, direct movement/line-of-sight/navigation/camera clearance at broad passages and short contacts, and incompatible-session archival with preserved SQLite history/credentials.
- Actual Three.js render meshes are raycast across passages at heights 40, 70, 87 and 103. This catches renderer-only posts, crossbars, hanging signs or partitions even when they are absent from physics. These CPU geometry checks use canvas stubs for texture creation; they are not claimed as visual inspection.
- The targeted real Chrome audit passed: all **53 traversable contacts crossed using keyboard input**; rendered player-map wall coordinates and operator-map geometry exactly match canonical coordinates. Each contact starts from an isolated approach fixture; no task-completed flags or teleport shortcuts are used to perform the crossing. The separate full-room audit walks the connected facility circuit without repositioning.
- Full sequential browser suite: **9/9 passed in 5.1 minutes**. It includes all normal minigames, real three-client encounters/emergency reconnect/joint extraction, adviser decisions, touch/camera input, maps and all 16 rooms/control approaches.
- Machine-readable evidence: [layout connectivity](../reports/layout-connectivity.json), [53 real browser crossings](../reports/layout-browser-crossings.json), and [16-room connected walking audit](../reports/layout-room-audit.json).

Actual rendered captures are retained in `docs/screenshots/layout/`: [same corridor fixture before](screenshots/layout/corridor-before.png) and [after](screenshots/layout/corridor-after.png), [Medical approach](screenshots/layout/layout-medical.png), [Electrical approach](screenshots/layout/layout-electrical.png), [Cooling approach](screenshots/layout/layout-cooling.png), [Security approach](screenshots/layout/layout-security.png), [Storage approach](screenshots/layout/layout-storage.png), [player map](screenshots/layout/layout-player-map.png), [operator map](screenshots/layout/layout-operator-map.png), [Central Hub](screenshots/layout/hub.png), and [Storage equipment](screenshots/layout/storage.png). These are browser captures, not mockups. The before capture belongs to the preceding shoulder build.

## Cache / saved-session handling

Map version: `aster-wings-v6-canonical`; signature is recorded in the generated report. Scenario: `ghost-shift-wings-v7-canonical-layout`; model: `ghost-shift-wings-v7-canonical-layout-mc1`; protocol remains 6. The signature now covers canonical walls and exact region connections as well as floors, equipment and gates. The service-worker cache is `ghost-shift-canonical-layout-1`. Existing socket signature/version guards reject mismatched clients and stop movement until the host/client agree.

Restart the existing host after building, then create a **new shift**. Startup archives incompatible saved sessions without deleting their history, snapshots, participants or operator credentials. The isolated restart test verifies that old codes cannot resume as current sessions. Private `.env`, production SQLite and passwords were not changed.

The current model has a fresh [16-scenario generated evaluation](../reports/canonical-layout-evaluation.json): 14 successful time pairs, remaining-time MAE 4.79 seconds, deadline Brier score 0.1328125. It is not visitor calibration or evidence of human navigation improvement. Older model evaluations are excluded by version.

## Remaining limits

Physical phone/tablet behavior, booth LAN/packet loss, sustained GPU/thermal performance and first-time visitor wayfinding require on-site acceptance. The facility keeps its intended corridor bends and real perimeter returns. Pok?mon remain grounded 2D artwork billboards; the behind-character 3D trainers/camera, five-minute clock, multiplayer, task rules, manual operator injections and joint extraction are preserved. Changes are local; no push or deployment was performed for this request.
