# Open-space room organization

This revision implements the first-person environment/readability specification from the latest supplied attachment. The earlier Among Us reference remains visible in conversation; no separate original map-image asset was found or claimed in the project. The established sixteen-room wing topology, floor union, corridor links, spawn points, extraction and two intentional gates are retained.

## Changes

The previous procedural template stamped three floor obstacles into each of thirteen rooms: two corner objects and one central block. All 39 template footprints and their corresponding meshes were replaced by 16 purposeful edge installations. Their combined reserved footprint is now 21,300 square world units, compared with 38,220 before (about 44% less). More relevant to movement, every room center and every former central-block midpoint is now clear.

| Space | Purposeful equipment and organization |
|---|---|
| Central Hub / Arrival | Wall research/check-in information; open gathering floor |
| Electrical | Shallow wall breaker bank and cable service tray |
| Reactor | One wall-side reactor assembly and two accessible stabilizer controls |
| Medical | One wall-side examination bed and supported companion-scanner assembly |
| Containment | Two wall-side research pods with accessible response controls |
| Cooling | Organized pipes and valve wheels at the wall |
| Communications / Security / East Service / Emergency Control | Compact wall consoles or displays; no central workstation blocks |
| Archive | One shallow data rack at the wall |
| Storage | One grouped supply bay with two boxes and a broad through-route |
| Workshop | One edge workbench/tool rack |
| West Service / Extraction | Shallow orientation/extraction status information; clear passage |

Full-height doorway posts that extended into passage openings have been removed. Their replacements are thin colored wall strips outside the opening and an overhead header. Entrance signs come from clearance-checked intervals in the actual shared floor union; overlapping rectangles no longer create duplicate frames or label shallow wall notches as doors. There are 36 directed room entrances with a checked 12-unit-radius approach on both sides.

Physical signs identify the room from outside and the next connected destination from inside. Destination selection uses valid shared navigation, rather than an arrow drawn through a wall. One high room identifier and a room color accent are used per installation. Repeated room-number plaques, large protocol posters and generic freestanding equipment have been removed. Original matte materials, normal light levels, flashlight, sound, ceiling services, real vent grilles and restrained machinery motion remain. Fog or extra darkness was not added to compensate for fewer props.

## One definition for physical space and mechanisms

`world.ts` now exports `roomWalls`, `roomPortals`, `roomEquipment` and `controlPoint`. Each equipment definition has an actual wall anchor, orientation, reserved bounds and two accessible standing/control points. The renderer builds the equipment there. The v4 correction derives separate solid-piece colliders inside these reserved bounds; exact floor-union wall segments and those colliders are shared by server movement, navigation and both maps. Reserved service-bay bounds are not collision bodies. Tasks, carried-data destinations and emergency mechanisms use the real standing points next to their equipment, replacing center-of-room interaction targets. Both cooperative controls and both response travel paths are validated. The universal actions, costs, timer, roster selection, manual director behavior and multiplayer synchronization are retained.

The map/scenario version is `aster-wings-v3-open` / `ghost-shift-wings-v3-open`; the analytical model is `ghost-shift-wings-v3-open-mc1`. Old room coordinates are archived on the next server startup using the existing migration policy. Snapshots, operator credentials and history remain intact; create a new room/code. Earlier evaluation artifacts remain historical and are excluded by version. The current generated check is [wings-v3-open-evaluation.json](../reports/wings-v3-open-evaluation.json), with no visitor-calibration or recommendation-improvement claim.

## Verification

See [open-space verification](OPEN-SPACE-VERIFICATION.md) for actual before/after room captures, the browser walk through every room, multiplayer regression, collision checks and remaining acceptance work. No production database, private settings or operator password was reset during implementation.

The version and evaluation paragraph above records the earlier v3 layout revision. Current v4 collision, map agreement and journal evidence: [Collision and journal verification](COLLISION-JOURNAL-VERIFICATION.md).
