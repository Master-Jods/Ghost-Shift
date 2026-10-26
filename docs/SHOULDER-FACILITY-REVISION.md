> Historical revision. Current first-person camera, real Showdown battles, fast live predictions and fatal emergency rules are documented in [v10](V10-CRITICAL-INCIDENTS.md). Asset provenance and earlier measurements below remain historical evidence.

# Shoulder camera and damaged facility

Implemented locally on 2026-10-23 against attachment `c28c6d5d-13bf-4a1b-ae64-003b27d8d026` on base `67f4637`.

## References and result

The repository landing artwork (`public/horror/aster-night-clean.png`) was visually inspected. Its cool industrial palette, wet equipment edges, failed containment, distressed surfaces and localized emergency accents guide the world. No separate Minecraft camera attachment was available in this message. The written behind-character relationship was implemented and reviewed in rendered gameplay; no match to an unseen image is claimed. This is an original stylized real-time facility, not a photorealistic reproduction of the landing painting.

The player renderer now builds full 108-unit walls and ceilings instead of the 24-unit cutaway. The map, open floor union, substantial equipment colliders, navigation, threat placement, terminal positions, minimap and operator overhead geometry are unchanged. No decorative debris or puddle adds a collider. No hostile Pok?mon is introduced by environmental dressing.

## Play and camera controls

Restart the host after `npm.cmd run build` / `npm.cmd start`. Join a new shift, finalize three companions and acknowledge the field briefing on both terminals.

- WASD/arrows and the left touch stick move relative to camera yaw. Trainer facing follows actual movement, independently of orbit yaw.
- Hold the right mouse button and drag to orbit. Clicking the world requests mouse lock; move the mouse to look, Escape releases it. Touch-drag the visible world to orbit. No pointer lock is required for right-drag, touch, terminal buttons or keyboard movement.
- Settings expose mouse/touch sensitivity, invert pitch, field of view and chase distance (56?140 world units). Default distance is 94; trainer height is about 52; pivot height is 40; default framing looks forward from just above the shoulders.
- Pitch is clamped from -0.12 to 0.36 radians. The rig has no roll or overhead mode. Camera collision sweeps from the pivot against full canonical walls, closed gates and the visible substantial equipment bounds. It retracts immediately for safety and eases outward; positional follow is smoothed. Only the local trainer fades at very short clearance.
- E / Interact uses trainer distance and canonical line of sight, never camera distance. Nearby valid equipment has a ground highlight and named prompt. Menus release mouse lock, clear movement, and gate orbit input. Closing preserves yaw/pitch; the shared clock and partner continue.

## World dressing

| Area | Environmental details |
| --- | --- |
| Containment | Empty damaged and intact research housings, one broken window with original radial crack decal, loose restraint/door hardware, triangular glass fragments, failed feeds, escaped-specimen label, water and pipe damage. The intact chamber has transparent cylindrical glass. |
| Medical | Examination/recovery equipment, displaced pad and paperwork, stained bed/floor, bloodied wall handprint, failed scanner display. Controls and standing space remain clear. |
| Electrical | Open dark breaker bays, exposed copper/insulated cables, displaced cover, hanging service wires, optional bounded sparks. |
| Reactor / Cooling | Recognizable original machinery, broken coolant outlet, low-shine puddles, condensation/grime, localized warning lamps and leaking service lines. |
| Storage / Workshop | Wall racks with organized containers, a selected fallen item within its solid bay, abandoned paperwork and worn work surfaces; open center preserved. |
| Communications / Security / Archive / Emergency | Broken or offline feeds, glass impact decal, disturbed work surface. Working task controls are identified by the authoritative interaction highlight rather than decorative screen contents. |
| Corridors / gathering / extraction | Edge leaks, shallow damp patches, restrained wall distress, ceiling services and readable destination signs; no repeated freestanding crates. |

Blood trails, smears and handprints are deterministic original canvas textures applied to world planes at floors, beds or walls. They are not a screen tint or randomly scattered circles. Glass fragments are shallow triangles at chamber edges. Water uses irregular transparent material maps, low roughness and bounded expanding ripple/drip meshes, with no scene-wide reflection pass. Cooler ambient light, proximity light pools and a trainer flashlight retain navigation visibility. Emergency lamps are local accents; rooms are not uniformly red.

All new trainer meshes, geometric dressing and canvas textures are authored in source. No new external textures or Minecraft assets were imported. Existing Pok?mon assets and licensing attribution remain in `HORROR-ASSETS.md`.

## Representation, performance and evidence

Trainers A and B now use original articulated 3D researchers with different uniforms, caps and backpacks. Limbs run with measured travel, facing follows authoritative yaw, and interaction/reaction/victory states remain tied to shared snapshots. They do not rotate into camera-facing paper sprites. Existing Pok?mon retain species artwork fallback, upright yaw-only billboards, world-depth occlusion, grounded shadows and travel/action poses. Back/front selection follows relative viewing direction. These Pok?mon remain 2D, not fully modeled 3D characters.

Static opaque additions are merged by material, decals reuse six small 256px textures, materials are shared, and drips/ripples/sparks are bounded. Low quality disables animated drips/ripples; Reduced motion stops them; Reduced flashing suppresses sparks and monitor intermittency. Full-scene mirror reflections and heavy post effects are not added. Textures, geometries, materials, trainer rigs and event handlers are disposed with the renderer.

The backend rules, scenario/model/protocol and shared map versions are retained; this revision changes presentation and local camera input, not forecast action costs or world paths. Previous generated rule evaluations are not presented as visual or device acceptance. Private `.env`, production SQLite and credentials were not modified. No push or deployment was performed for this request.

## Verification

- Production build: passed (existing nonfatal WebGL vendor chunk advisory).
- Unit/integration suite: 88 passed, including new shoulder framing, all-room wall sweep/recovery, closed/open gate sweep and camera-relative vector checks. Existing navigation, line-of-sight, server validation, restart, reconnect, task alternatives and incident cases remain included.
- Full sequential browser suite: **8/8 passed in 4.5 minutes**. Covers shoulder framing/orbit, every normal minigame, real choice confirmation/analyst/operator evidence, journal, three authenticated browser clients through encounter + emergency/reconnect + joint extraction, touch movement/orbit/settings, and keyboard traversal/standing/minimap alignment in all 16 rooms.
- After the final surface/weathering and sign-legibility refinements, production build and targeted camera/visual tests were repeated. The targeted camera + complete minigame checks passed 2/2; the final sign/service-pipe placement build then passed the camera capture scenario again (17.5 seconds). Actual captures below use that final build.
- Camera-room screenshots use explicitly placed test fixtures to isolate visual framing. Orbit uses normal right-drag input; movement and interactions use ordinary controls. The separate all-room circuit and three-client extraction use real keyboard navigation without teleports.
- Real captures: [Containment](screenshots/shoulder/chase-containment.png), [wet corridor](screenshots/shoulder/chase-wet-corridor.png), [Medical](screenshots/shoulder/chase-medical.png), [Electrical](screenshots/shoulder/chase-electrical.png), [Cooling](screenshots/shoulder/chase-cooling.png), [Storage](screenshots/shoulder/chase-storage.png), [Security](screenshots/shoulder/chase-security.png), [door framing](screenshots/shoulder/chase-door.png), [task interaction](screenshots/shoulder/chase-task.png).

Physical phones, booth LAN/packet loss, audio listening and sustained GPU/thermal performance remain acceptance work. Automated browser rendering and generated tests do not establish physical-device performance or visitor comprehension. Close camera collision can briefly reduce local-character opacity; it does not remove walls. Materials and trainer geometry are deliberately stylized, and Pok?mon silhouettes may expose their billboard nature from lateral angles.
