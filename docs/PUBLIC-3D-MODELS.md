> Historical initial import report. Current textured model counts, runtime motion and audio are documented in [Models and music](MODELS-AND-MUSIC.md).

# Public imported 3D Pokemon models

Implemented 2026-10-25 in `C:\Pokemon Day - Among Us`. The user explicitly selected public game-derived 3D assets for a non-commercial school/community prototype with clear source/rights notices. This changes asset selection, not gameplay.

## Sources and rights

- [06wj/pokemon](https://github.com/06wj/pokemon), revision `00d96f7f18894055e7f1db44fa0df6462e5e4c8a`: real animated default Gen 1 GLBs and native action metadata.
- [Pokemon-3D-api/assets](https://github.com/Pokemon-3D-api/assets), revision `429de1288cea0d43f5b4f56305d2276e94239d65`: broad regular/regional/mega/form coverage, Draco geometry and WebP textures.
- [Upstream copyright notice](https://github.com/Pokemon-3D-api/api-server/blob/main/docs/COPYRIGHT.md). Pokemon/Nintendo/Creatures/Game Freak retain their respective character/model/animation rights. Public availability and code licenses do not grant model redistribution permission. No endorsement or such permission is claimed.

The separate model status is `prototype-acknowledged`, never `approved`; loading requires explicit prototype-manifest opt-in. The empty separately licensed-model list remains intact. [Shipped source/rights notice](../public/pokemon-models/SOURCES.html) is linked in the lobby and diagnostics. [Source lock](../assets.models.lock.json) records revisions. GLBs are unmodified; runtime instance transforms/playback adapt them to the game. Local Google Draco decoder files include Apache and three.js license notices.

## Coverage

| Representation or animation | Exact entries |
| --- | ---: |
| Full selectable catalog | 1,351 |
| Imported 3D models | 1,095 |
| Named native 3D locomotion | 218 |
| Named native 3D attacks | 219 |
| Static or idle-only 3D | 877 |
| Primary animated sprite fallback | 113 |
| Primary reference artwork/placeholder | 143 |

Locomotion and attacks are independent subsets: a model may have an attack but no walk. Unknown clips, dances and T-poses are not relabeled walk/attack. Missing clips leave a stable model or native idle plus confirmed FX, without wobble, squash, stretch or invented limb motion.

Default PokeAPI varieties use their regular source ID. Alternative forms never fall through to base species. Named regional/mega/primal/origin/Gigantamax categories and unambiguous named multiforms/fusions are matched. Opaque numeric variants and unresolved gender forms retain exact-ID fallback; female Meowstic retains its verified female sprite.

[Full coverage, per-ID mappings, missing forms and limitations](../reports/public-3d-model-coverage.json) / [runtime model registry](../public/catalog/pokemon-models.json). The separate full sprite registry remains a backup after model failure.

## Integration

The same controller handles own/remote companions, injected threats, guardians and resolution. GLTFLoader/SkeletonUtils share bounded templates while cloning independent skeletons and mixers. Models are centered, grounded and normalized using finite bounds; instance facing matches navigation. Source opacity is preserved while resolution fades remain possible. Native locomotion follows actual movement; authoritative action age drives playback, crossfades and interruption. Available recovery can finish while idle. Missing guard/hit clips are disclosed. Client animations never apply damage.

Six real animated models are bundled: Bulbasaur, Charmander, Charizard, Squirtle, Pikachu and Eevee (approximately 30 MB combined). Other models load lazily from revision-pinned remote raw URLs. First-use internet access is required for those files; failed downloads downgrade only the affected exact-ID character. No thousand-model startup download occurs.

Existing four download slots, two template loads, eight idle templates, selected-team prefetch and cleanup remain. Model size is capped at 32 MB with a 15-second download timeout. Expected byte size and pinned Git blob SHA-1 are checked in secure browser contexts. Draco workers are capped at two and served locally. Local GLB/WASM MIME types and missing-file 404 behavior are correct. Service-worker cache `ghost-shift-public-models-11` refreshes manifests network-first and caches local model/decoder files on request.

The importer checks all selected GLB2 JSON chunks, expected sizes, self-contained resources, supported required extensions, finite POSITION bounds/node transforms, real named animation channels and unique exact IDs. HTTP byte ranges avoid downloading the entire roughly 1 GB broad-source collection just to construct metadata. Binary geometry is decoded on demand: metadata validation does not claim every model was visually walked. Upstream availability, including source-history pruning, remains a runtime limitation; failed pinned URLs use honest fallback.

## Verification and gameplay

Six normal tasks, 300 active seconds, camera, canonical collision/map/navigation, Pokemon rooms, doors, operator injections, analytics, networking and persistence remain. Scenario/map/model/protocol 8 are unchanged. Existing v9 sessions stay compatible; restart the host and refresh clients. No database reset is required.

Initial real Chrome/WebSocket check passed five native skeletal movement categories, rendered Squirtle, switching, reconnect, deliberate GLB HTTP failure with same-ID fallback, injected 3D threat and remote native attack. Samples compare actual bone quaternions, not just animation time. Bulbasaur and Charmander screenshots were visually inspected. The final browser run additionally checks remote compressed Chandelure with honest static-3D behavior and native sprite fallback/camera regressions. Final results and screenshot links follow below.


The final targeted Chrome suite passed **3/3**: real 3D models (including actual remote Draco decoding and a static Chandelure), native sprite fallback and chase camera. [Browser evidence](../reports/public-3d-browser.json) includes changing native skeleton quaternions and a server-confirmed attack observed by the other client. These are sampled rendered checks; all 1,095 model JSON chunks were validated separately.

Actual gameplay captures: [Bulbasaur](screenshots/public-3d/bulbasaur-walk.png), [Charmander](screenshots/public-3d/charmander-walk.png), [Pikachu](screenshots/public-3d/pikachu-walk.png), [Eevee](screenshots/public-3d/eevee-walk.png), [Charizard](screenshots/public-3d/charizard-flight.png), [Squirtle](screenshots/public-3d/squirtle.png), [native remote attack](screenshots/public-3d/remote-attack.png), [compressed static Chandelure](screenshots/public-3d/chandelure-static-3d.png). Bulbasaur, Charmander, Charizard, remote attack and static Chandelure screenshots were visually inspected.


Final validation passed: **104/104 unit/integration tests**, **3/3 model Python tests**, **5/5 sprite Python tests**, all **1,095 model metadata records** in cached offline validation, and the production TypeScript/Vite build. The focused real-Chrome suite passed **3/3**. [Final QA summary](../reports/public-3d-qa.json). The prior full gameplay suite remains historical evidence; it was not rerun in this presentation pass. Relevant camera/encounter/fallback checks were rerun with the integrated assets.
