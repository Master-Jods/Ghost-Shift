> Historical v9 room/character report. Its 14 procedural rigs have been replaced by the [authentic full-catalog asset pipeline](AUTHENTIC-CATALOG-ASSETS.md). Room geometry and gameplay remain current.

# Pokemon character presence and facility identity

Implemented directly in the existing checkout on 2026-10-25. Existing two-trainer networking, exactly six normal tasks, at most 300 active seconds, three unrestricted companion choices each, operator-only hostile deployment, shared key/door tradeoffs, no stamina/shared energy, and joint physical extraction remain authoritative.

## Animated coverage and provenance

The renderer now uses original articulated 3D procedural rigs for these exact IDs:

| IDs | Species | Locomotion |
| --- | --- | --- |
| 1 | Bulbasaur | Four-legged gait |
| 4, 7, 25 | Charmander, Squirtle, Pikachu | Leg/arm gait, tails and body actions |
| 6, 41 | Charizard, Zubat | Articulated wing strokes and flight |
| 92, 93 | Gastly, Haunter | Floating head/cloud segments; Haunter hands |
| 94, 150 | Gengar, Mewtwo | Biped limbs and body actions |
| 95 | Onix | Chained serpentine segment motion |
| 129 | Magikarp | Tail and fin motion |
| 132 | Ditto | Amorphous lobes/body motion |
| 133 | Eevee | Four-legged gait, tail and ears |

**14 procedural rig entries; 0 imported GLB assets; 0 newly bundled animated directional sprite packs.** All 1,351 existing catalog entries remain selectable. The other 1,337 exact species/form IDs retain their own existing front/back/reference-art fallback. Those portraits are static; they are not presented as running animation. Form IDs are never silently mapped to another species or default form. A missing reference image preserves an ID-labelled placeholder.

Every declared rig is constructed and tested for articulated tracks. The browser scenario renders Pikachu, Charizard, Onix, Gastly and the Gengar threat, exercises confirmed attacks visible on the other client, and checks Meowstic-female #10025 fallback/reconnect. This does not claim every declared rig has undergone individual human visual inspection or full-catalog animation coverage.

Geometry and animation clips are authored in `src/pokemonRig.ts`; no official game models or third-party model pack were imported. These are deliberately stylized fan representations. Authorship of geometry/code does not grant rights to Pokemon characters, names or branding. Existing artwork provenance is the [PokeAPI sprites repository](https://github.com/PokeAPI/sprites), whose [LICENCE.txt](https://raw.githubusercontent.com/PokeAPI/sprites/master/LICENCE.txt) identifies image copyright separately from its repository CC0 distribution. Existing Three.js licensing is preserved in `docs/licenses/three-LICENSE.txt`; no new model licensing is implied by the library license.

## Animation framework

`src/pokemonAssets.ts` is the exact-ID registry: path/recipe, representation, clip aliases, scale, ground offset, facing correction, movement category and provenance. `src/pokemonCharacter.ts` provides the reusable loader/cache/controller. It also supports verified GLTF assets through GLTFLoader and SkeletonUtils cloning when a compatible asset and its source/license are actually registered; no empty GLB claim is counted as coverage.

Eight authored clip states cover idle, locomotion, attack, assist, guard, hit, recovery and resolution. Following chooses idle/locomotion from actual displacement; assigned Pokemon stay at their mechanism. Each instance has an independent AnimationMixer and 0.14-second action crossfades. Joint tracks animate feet, arms, wings, head, tail or segmented body according to anatomy. Attack clips include anticipation, action, follow-through and recovery, with a procedural body lunge in addition to existing effects. Guard/attack face the encounter target. Stationary companions stop running.

Gameplay decisions and damage remain server-authoritative. Accepted player motion serials/timestamps drive actions on both clients; confirmed HP changes drive threat hit reactions. Resolution uses the active elapsed clock and fades the resolved character. Reconnect uses current snapshot state/age and does not restart an expired attack. Pausing freezes presentation clips alongside authoritative time. Animation speed never controls simulation speed or damage.

## Following, loading and cleanup

`src/companionNavigation.ts` follows a side/rear formation using canonical line-of-sight, navigation and swept collision. Ordinary motion is bounded to 1.25 times trainer speed, with no repeated corner teleports. Only a gap over 800 world units or an invalid current point permits safe repositioning, principally spawn/staging/invalidated geometry. Companions add no player colliders. Visual interpolation also respects collision instead of cutting through corners.

Registry scale is a facility fitting policy, not literal canonical species size. Small species remain visible; larger/winged species are bounded. Characters use lit materials, depth occlusion and contact shadows. Broad wings fold and long segmented bodies coil when canonical nearby clearance is limited; this reduces doorway/wall clipping without adding player blockers. Only selected companions, assigned companions and active/resolving threats instantiate assets. No full catalog model download occurs. The lazy renderer code is preloaded during lobby preparation; Vite prebundles its GLTF/SkeletonUtils dependencies to avoid cold-load reloads during a live shift. Shared template loading is limited to two concurrent jobs; at most eight unreferenced templates stay cached. Instances release mixers, cloned materials and skeleton resources; template eviction disposes shared geometry/material/texture resources. Exact-ID portraits remain usable while a model loads or fails.

Operator **Reference > Character asset coverage** shows active/selected/reserve metadata and missing coverage, without adding asset-coverage warnings to the player HUD. Canvas diagnostics expose representation, clip state/time and joint poses for development/browser checks.

## Room-name mapping

`src/roomIdentity.ts` supplies full names, short map labels and subtitles. Stable room IDs, room shapes and connections are retained.

| Stable ID | Current display name |
| --- | --- |
| arrival | Trainer Reception |
| hub | Trainer Assembly Hall |
| electrical | Power Plant Control |
| comms | Rotom Relay Station |
| medical | Nurse Joy's Pokemon Clinic |
| reactor | Infinity Energy Core |
| cooling | Cerulean Pump Station |
| containment | Aether Containment Wing |
| archive | Professor Oak's Research Lab |
| security | Silph Security Office |
| storage | Poke Mart Supply Depot |
| workshop | Poke Ball Workshop |
| west / east | West / East Service Corridor |
| emergency | Indigo Emergency Command |
| exit | Trainer Evacuation Gate |

Names propagate to physical equipment signs, player/expanded/operator maps, room headers, task tracker/journal, transport instructions, emergency guidance, injection targeting, analytics routes and new receipts. Canvas map hover and SVG details expose full names where short labels are needed. JSON session exports include the stable-ID room identity mapping. Stored historical event text remains historical rather than being rewritten. These are fictional themed rooms within this facility, not recreated canonical locations.

## Environment

Oak Lab has a Pokedex workstation, research bench, Pokeball specimens, books, filing cabinets, damaged glass and old monitors; additional wall-side bench/library furniture gives the room a research identity beyond its task terminal. Joy Clinic has a six-ball healing machine, damaged monitor, recovery bed, reception/medical supplies, stained bedding/curtains and a recognizable pink-haired, capped Nurse Joy figure with restrained blood marks. She is environmental storytelling, not an actor or auto-spawned enemy.

Rotom relay displays waveforms/antennae; Power Plant has breakers and Pokemon power research; Infinity Core has stabilizers; Cerulean has pumps/valves/leaks; Aether has damaged specimen chambers; Silph has CCTV/access equipment; Poke Mart has potion stock; Ball Workshop has ball assemblies/tools. Existing grounded blood, grime, water, broken-glass and horror lighting remain. Lab/clinic local lighting uses bounded flicker and honors reduced-flash/motion settings.

Room boundaries and connections are unchanged. New lab/clinic wall furniture has explicit canonical footprints shared by rendering, movement collision, navigation, map obstacles and camera height checks. It does not generate doorway frames or partitions. Existing central floors, task controls and entrances remain open. Decorative blood, curtains against solid walls, shallow puddles and small debris add no invisible colliders.

## Versioning and validation

Scenario `ghost-shift-v9-pokemon-rooms`; map `aster-wings-v9-pokemon-rooms` plus its computed signature; model `ghost-shift-v9-pokemon-rooms-mc1`; briefing `pokemon-rooms-briefing-9`; protocol remains 8. Incompatible previous geometry/scenario snapshots are archived without deleting history or credentials. Current analytics use the new model/version, with old evaluations excluded. No private environment file or production database was manually edited during QA. Restart the host, refresh clients, and create a new shift.

Production build passed. All **97 unit/integration tests passed**. The full sequential Chrome suite passed 9/10; the development journal initially failed during cold dependency discovery. After adding shared prebundle entries and lobby renderer preloading, all three affected browser rechecks passed (characters, chase camera, journal with a fresh Vite cache). All 10 distinct browser scenarios are therefore validated across the full suite and affected rechecks. This is not represented as a single fresh final 10/10 run.

The complete two-client WebSocket/keyboard round finished in **199 active seconds**, all six tasks completed, carried data survived reconnect, and both trainers physically extracted. The separate layout run crossed every intended contact and compared player/operator geometry; the 16-room audit used independent room-center approach fixtures.

Regressions cover exact species/form identity, real joint/wing/segmented locomotion, stopping, attack interruption/recovery, remote confirmed actions, model switching/mixer cleanup, bounded cache leases, failed/unverified model recovery, safe companion following, wing folding/body coiling, clear canonical openings, camera collision, unchanged tasks/emergencies/deadline/extraction, and history/version preservation. Remaining limits include static fallback coverage, stylized low-poly geometry rather than imported production model fidelity, limited individual-species visual audits, and the need for real-device/visitor performance and balance testing.


## Genuine rendered examples

These screenshots were captured from actual gameplay clients; selected images were opened for visual inspection. No generated mockup is used as QA evidence. Frame pairs and joint-pose samples verify motion, rather than inferring animation from a single static screenshot.

- [Pikachu running, frame 1](screenshots/pokemon-characters/pikachu-run-1.png) / [frame 2](screenshots/pokemon-characters/pikachu-run-2.png)
- [Charizard flight, frame 1](screenshots/pokemon-characters/charizard-flight-1.png) / [frame 2](screenshots/pokemon-characters/charizard-flight-2.png)
- [Confirmed Pikachu attack, remote player's view](screenshots/pokemon-characters/pikachu-attack-remote.png)
- [Gastly moving](screenshots/pokemon-characters/gastly-hover.png), [Onix body movement](screenshots/pokemon-characters/onix-motion.png)
- [Professor Oak's Research Lab](screenshots/pokemon-characters/oak-lab.png), [additional research benches](screenshots/pokemon-characters/oak-benches.png)
- [Nurse Joy Clinic and figure](screenshots/pokemon-characters/joy-clinic.png), [recovery beds and stained curtains](screenshots/pokemon-characters/joy-recovery-beds.png)
- [Renamed operator map](screenshots/pokemon-characters/operator-map.png), [asset diagnostics](screenshots/pokemon-characters/asset-coverage.png)

Machine-readable evidence: [coverage](../reports/pokemon-character-coverage.json), [character samples](../reports/pokemon-character-browser.json), [full round](../reports/pokemon-rooms-browser-run.json), [QA](../reports/pokemon-characters-qa.json).


## Current-version analytics / balance smoke evaluation

Fresh reports use model `ghost-shift-v9-pokemon-rooms-mc1` and map signature `aster-wings-v9-pokemon-rooms:47aa0356`; older v8 results are historical. The actual movement balance report still finds a representative 9.24-second Electrical/Power Plant to Medical/Joy Clinic shortcut versus 26.27 seconds via the connected fallback. The fastest observed automated legal round is 108 seconds, not a mathematical or visitor-pacing bound. All 12 bounded generated balance continuations succeed. The separate real two-browser round takes 199 active seconds.

The 16 generated evaluation scenarios include snapshots after 0/30/90/180 idle active seconds and predefined interventions in half of observed continuations. Successful time MAE is **17 seconds on 12 pairs**; deadline Brier is **0.00390625**. Matched tasks-first and selected policies both succeed in **12/16**; the selected plan is **1.5 seconds slower on average** on mutually successful pairs. No efficiency advantage or visitor calibration is claimed. Gameplay advice remains a conditional bounded best found under stated assumptions, with material invalidation and fresh computation after incidents/door/task changes.

[Current balance traces](../reports/pokemon-rooms-balance.json) and [current evaluation rows](../reports/pokemon-rooms-evaluation.json) preserve the v9 provenance separately from v8 reports.
