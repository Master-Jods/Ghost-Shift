> Current update: [Open-space organization](OPEN-SPACE.md) supersedes the v2 equipment placement described below. Graphics/settings architecture is retained.

# Ghost Shift: WebGL facility and wings v2

This revision implements the latest supplied specification and the three visible reference images: the previous low-resolution corridor, the target industrial first-person interior, and the Among Us room-adjacency schematic. The target informed matte painted walls, bolted trim, ceiling services, wall-mounted lettering/posters, volumetric equipment, practical lighting and believable scale. The schematic informed topology, not copied image assets or exact room proportions. This is an achievable original interpretation, not an exact visual match.

## Environment and renderer

The primary renderer is now Three.js WebGL. `facility3d.ts` builds solid room surfaces, structural trim, door frames, ceiling beams/trays, pipes, vents, shelves/crates, control cabinets, beds and cylindrical research equipment. Footprints come from the same `world.ts` geometry used by server collision. Wall surfaces derive from the boundary of the union of rooms and corridors; overlap does not introduce internal walls. Generated surfaces use a consistent world texture scale. Signs and original protocol diagrams attach to actual walls/entrances. No sign billboards float through rooms. Batch merging reuses materials and reduces draw calls.

A hemisphere fill, three nearby room lights, emissive fixtures and a camera flashlight light the scene. One budgeted flashlight shadow map is enabled on Medium/High when Shadows is on (512/1024). Low retains optional soft contact shadows without a flashlight shadow map. Blackout retains readable backup light. Actual nearby fog/fatigue/frost threats affect the local presentation. Post-processing controls tone/fog presentation; brightness controls exposure. No bloom dependency or borrowed game environment assets are used.

The handheld scanner, sleeve and glove use original solid geometry. Close walls lower it. Camera roll is always zero. Head bob and impact shake default to zero, have real intensity settings, respect reduced motion, and never change authoritative position/yaw or interaction selection. Pokemon remain alpha-cropped camera-facing sprites with available front/back artwork, actual depth testing, correct ground anchoring, contact shadows and smooth interpolation. Very close own companions fade rather than filling the entire camera. They are not skeletal 3D models. Small original procedural cues follow confirmed server state; pending submission remains distinct from confirmed outcomes.

The previous Canvas raycaster is retained as an explicitly labeled WebGL-unavailable fallback. Vertical look and 3D flashlight shadows are unavailable in that fallback; primary WebGL checks assert the actual renderer so fallback success cannot masquerade as WebGL verification.

## Mouse and local settings

`look.ts` integrates relative pixels directly in radians/pixel, independently of frame delta. A synchronous input accumulator prevents React batching from dropping successive deltas. There is one mounted mouse listener, with cleanup; pointer lock uses unbounded horizontal relative motion, pitch clamps at +/-1.15 radians, and aim has no roll. Optional smoothing affects the rendered camera only and defaults off. Pointer-lock loss, blur, hidden tabs, equipment panels and decision previews clear held movement/touch state. UI interactions cannot rotate the player. Local panels do not pause the mission.

Settings work on entry, lobby and in-game, persist in localStorage before play, sanitize saved values, and have Reset to Defaults:

| Section | Functional controls |
|---|---|
| Controls | Mouse slider and numeric value (0.0001-0.008 rad/pixel; default 0.003), independent touch sensitivity, invert Y, optional smoothing, control reference |
| Camera | Horizontal FOV 60-100 degrees (default 78), bob and shake intensities, reduced motion/flashing |
| Graphics | Low/Medium/High, render scale 0.5-1.5, contact/flashlight shadows, tone/fog post-processing, brightness, actual render-loop FPS counter |
| Audio | Mute and independent master/effects/ambience gains; original procedural positional effects and machinery |
| Interface | Minimap size 160-320px with responsive cap, north-up/heading-up, scaling of compact HUD controls |

Base internal width caps are 480/960/1600 for Low/Medium/High, before render scale; aspect follows the actual viewport. Audio starts muted and needs user interaction. Graphics settings are local device preferences; they do not change session difficulty, timer, physics rate or network cadence.

## Shared map and navigation

`MAP_VERSION=aster-wings-v2`, scenario `ghost-shift-wings-v2`, analytical model `ghost-shift-wings-v2-mc1`. Sixteen rooms form a central hub, west reactor/security/medical/maintenance loop, eastern labs/navigation/emergency loop, and southern storage/comms/extraction routes. Shared floor rectangles, solid equipment, door definitions, spawns, room centers and interaction points drive rendering, server collision, navigation, operator placement/map and player map. Corridors are 55-80 units wide at connectors, with an 11-unit player radius and 185 units/second base speed. Task selection remains a feasible seeded 3-6 objective subset with a cooperative final mechanism and a maximum 300 active seconds.

A cached reverse navigation field replaces the old rounded-cell next-step cache. It checks swept player clearance rather than choosing a path through a corner. The same path distance feeds director response feasibility and actual-rule predictive continuations. All room pairs are physically traversed in tests with both optional shortcuts closed, including controls/spawn clearance. Map reachability is independent of completing a task behind a locked door.

The upper-right player minimap draws actual shared floor/equipment/door geometry, a high-contrast player arrow and current room. Known assignments, visited-room task markers, extraction and server-permitted partner position are displayed. Communications interference hides the partner radio marker. It never plots threats or private clues. North-up is the default; heading-up rotates the geometry and arrow consistently. M/Objectives opens a labeled expanded map and legend. Entry labels, entrance lettering, local depth-tested task rings and valid corridor path distances support navigation. There is no straight route arrow through walls.

On server startup, snapshots with incompatible scenario geometry are archived by closing their sessions. Old snapshots, history and credentials are retained; a new room/code is needed. A database regression verifies this behavior. Old evaluation/report versions are excluded from current analytics. [New generated evaluation](../reports/wings-v2-evaluation.json) uses the new map; 8 held-out generated scenarios are not visitor calibration, and the sample found no matched recommendation improvement.

## Assets and licensing

All new facility textures, diagrams, signage, props and scanner geometry are original procedural code assets. The supplied game screenshots/maps are visual/topological references only; their pixels and proprietary environment/audio assets are not bundled. Three.js 0.186.1 is MIT licensed; its notice is retained in [licenses/three-LICENSE.txt](licenses/three-LICENSE.txt). Existing Pokemon art/front/back assets and catalog remain sourced through the existing PokeAPI/PokeAPI sprites pipeline (`scripts/cache-assets.mjs`, `src/data.ts`); Pokemon character/art rights remain with their respective owners. They are not relabeled as original or freely licensed assets. No new third-party image or audio pack was downloaded.

## Run and validation

From `C:\Jigsaw Trials`, run `npm.cmd run build`, then `npm.cmd start`. Existing dependencies are recorded in package-lock.json; a clean checkout uses `npm.cmd ci`. Player: `http://localhost:8787/play`; operator: `http://localhost:8787/operator`. Restart a previously running server before using the new scenario. Keep existing private .env, credentials and database; start a new session for the new map.

See [verification and actual screenshots](PRESENTATION-VERIFICATION.md). Physical phone/GPU/thermal testing, listening checks and human five-minute pacing remain separate acceptance work. Pokemon sprites have limited views; there are no full-catalog polygon characters, articulated hands, multilevel geometry or hardware room-light shadows. The WebGL library produces a Vite chunk-size advisory; player rendering is lazy-loaded and separate from the entry/operator bundle.
