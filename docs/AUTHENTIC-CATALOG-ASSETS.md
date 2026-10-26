> Historical sprite-first revision. The user subsequently chose public game-derived 3D assets for a non-commercial prototype. Current counts and rights notices: [PUBLIC-3D-MODELS.md](PUBLIC-3D-MODELS.md). The 675 native sprite assets below remain available as fallback.

# Authentic full-catalog Pokemon assets

Implemented 2026-10-25 in `C:\Pokemon Day - Among Us`. This replaces the previous 14 procedural rigs. All 1,351 exact catalog IDs remain selectable. This is a presentation revision: the v9 scenario, map, protocol 8, six tasks, 300-active-second deadline, room designs, door decisions, networking, persistence and joint extraction remain intact.

## Coverage and limits

| Representation | Exact entries |
| --- | ---: |
| Genuine eight-direction native sprite locomotion | 675 |
| Native sprite attack clips (subset of the above) | 668 |
| Static exact-ID fallback | 676 |
| Approved imported animated GLB locomotion / attacks | 0 / 0 |

Every entry has an identity/provenance/fallback record. These counts are source availability, not a claim that every client download succeeds. Runtime errors safely downgrade the affected instance. Fallback reasons: 458 permission not established, 208 exact variant missing, 10 broken/incompatible native animation candidates. No form silently borrows the default species artwork or movement. Community alternate art styles can represent the same exact canonical form; shiny/recolor/cutscene/beta variants are excluded.

Reference audit: 28 existing bundled fallback PNGs decoded, 644 remote URLs verified by HTTP HEAD only, 4 unavailable reference forms. The four are #10264 koraidon-limited-build, #10266 koraidon-swimming-build, #10268 miraidon-low-power-mode and #10270 miraidon-aquatic-mode; they show an exact-ID placeholder. Remote HEAD checks do not establish successful image decoding, ongoing availability or new redistribution permission. No additional official artwork pack was bundled.

Machine-readable evidence: [all-entry coverage and failure reasons](../reports/authentic-catalog-coverage.json), [reference availability](../reports/reference-artwork-availability.json), [deployed registry](../public/catalog/pokemon-assets.json), [source lock](../assets.sources.lock.json).

## Sources and permissions

The user confirmed this is a non-commercial school/community project. [SpriteCollab's submission/use policy](https://github.com/PMDCollab/SpriteCollab/blob/master/README.md) permits community submissions for non-commercial use with attribution under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). The importer preserves each artist ledger, names, contact metadata, source URLs and the original unmodified PNGs. [Published artist credits](../public/pokemon-sprites/CREDITS.html), source README and license copies ship with the assets; credits are linked from the lobby and operator diagnostics. Official CHUNSOFT/Nintendo/Game Freak or mixed-credit folders are excluded instead of treating the repository's community terms as permission for official game assets. Pokemon character rights remain with their owners.

Pinned SpriteCollab revision: `27da8bb6f0d5c11134127a8fccd50080c51d030a`. PokeAPI authoritative species/forms CSV revision: `2bf639e5572812a67d2b94903fdcb9d095f5aeb2`. These are recorded in `assets.sources.lock.json`; artist ledgers are checked in addition to the tracker metadata.

No downloaded GLB established asset-specific redistribution permission. Code repository licenses were not accepted as model licenses. `assets.approved-models.json` is intentionally empty. Future models require exact identity, author, asset-specific permission evidence and terms, self-contained GLB, bounded finite transforms and named real animation channels with reviewed meanings. This structural gate is not a claim of full Khronos certification or visual validation of a model that is not present.

## Animation and resolver

Resolution order is approved exact-ID GLB, then genuine exact-ID directional sprite, then clean reference artwork/ID placeholder. The same controller handles local/remote companions, operator encounters, guardians and resolving entities. `src/pokemonRig.ts` and procedural species construction were removed.

Sprite movement uses the source's eight directions, native per-frame durations and ground anchors parsed from the original shadow sheet. Actual movement speed controls bounded playback; per-instance UV geometry prevents shared texture frame corruption. Short source-clip crossfades do not stretch, wobble, bob or lunge a portrait to pretend it has anatomy. Reduced-motion idle holds a native frame. Source flight, quadruped, serpentine and hovering artwork remains species-authored.

| State | Reviewed source candidates |
| --- | --- |
| Idle | Idle |
| Follow / run | Walk (real eight-direction frame changes required) |
| Attack | Attack, Strike, SpAttack, Shoot, Punch, Bite |
| Assist | Nod, DeepBreath, Pose |
| Guard | Protect, Withdraw, Brace, Pose |
| Hit | Hurt, Pain, Cringe |
| Recover | DeepBreath, Nod, Idle |
| Resolve | Faint, Bow, Pose, Idle |

Per-entry mappings and limitations distinguish a ready Pose plus confirmed shield FX from a dedicated guard clip. Missing action animation uses a stable native pose plus server-confirmed FX; it is not counted as a native attack. Required Idle/Walk failures use the exact-ID fallback. Action age comes from authoritative encounter state, including remote playback and reconnect. Client animation completion never applies damage. Switching, interruption, resolution and failed loading release leases and mixers.

## Loading, cache and compatibility

The manifest loads lazily with a 12-second timeout. Native downloads are SHA-256 checked and dimension validated; original native assets total approximately 62.3 MB on disk, not a startup download. Four concurrent downloads, two template loads and eight unreferenced cached templates bound resource use. Only the selected teams (up to six), active companions and actual encounters are prefetched/instantiated. Prefetch is cancellable and nonblocking. Queued/in-flight loads, ImageBitmaps, geometry, materials, skeletons and mixers are released appropriately. Model loading has a 15-second timeout and preserves native-sprite backup.

Service worker cache `ghost-shift-authentic-catalog-10` invalidates the earlier presentation cache. Registry fetches are network-first; source PNG requests carry hash query keys. Native files are cached only on demand with a 128-entry limit. Missing catalog/sprite files return HTTP 404 rather than SPA HTML; source XML and Markdown have correct MIME types. Existing v9 sessions remain compatible because gameplay geometry and rules did not change. Restart the host and refresh clients to load this pass; no database reset is required.

A real reconnect check also found orphaned background analytics jobs could exhaust an owner's job limit and block encounter previews. New snapshots replace only that owner's pending background work; foreground requests can cancel their own background jobs while other owners and foreground jobs remain protected. A regression test covers this scheduling fix.

## Validation and rendered evidence

Catalog validation checks every one of the 1,351 identities and 3,150 declared clip references with zero errors. Source importer checks PNG decoding, hashes, dimensions, native anchors, directional rows, distinct locomotion frames, durations, aliases, permission ledgers and exact-form matching. Five Python policy/matching tests cover form aliases, alternate styles, gender isolation, code-license rejection and path/identity rejection.

Real Chrome/WebSocket tests passed native Eevee walking and remote attacks, Fletchling flight, Serperior body movement, Chandelure motion and injection, exact female Meowstic, selection/switching, static Pikachu fallback, deliberately failed native download, reconnect, guard/hit/resolution and cleanup. [Browser metadata](../reports/authentic-catalog-browser.json) records native frame changes and source clip IDs. These category samples supplement the full-catalog structural checks; they do not claim all 675 species were manually walked.

Actual captures: [Eevee](screenshots/authentic-catalog/eevee-quadruped-2.png), [flight](screenshots/authentic-catalog/fletchling-flight-2.png), [Serperior](screenshots/authentic-catalog/serperior-body-2.png), [hover](screenshots/authentic-catalog/chandelure-hover-2.png), [remote attack](screenshots/authentic-catalog/eevee-attack-remote-2.png), [failed download fallback](screenshots/authentic-catalog/failed-load-fallback.png), [operator catalog diagnostics](screenshots/authentic-catalog/catalog-diagnostics.png). Paired frames are included in the same directory. Flight, serpentine and remote attack screenshots were visually inspected, in addition to the Eevee capture.

Production build passed. All 102 unit/integration tests and five Python tests passed. The full Chrome suite completed with nine passing scenarios and one native-character scenario stopped by the helper's 30-second analytical-preview wait. The helper now waits up to 60 seconds, accommodating the server's 45-second computation budget plus scheduling/network time; this changes no gameplay timing. That affected scenario is rechecked separately below. The other nine scenarios cover chase camera, frontend, all six puzzles, route/key/held-companion/guardian/analytics decisions, cold-development journal loading, canonical map traversal, full two-client round, touch/settings and all room approaches.

The current [full multiplayer round evidence](../reports/authentic-catalog-full-round.json) records successful legal keyboard/WebSocket play, 6/6 tasks, carried-data reconnect and joint physical extraction. This is automated QA, not visitor performance measurement.


The affected native-character recheck **passed (1.6 minutes)** after the helper wait correction. All ten distinct browser scenarios therefore passed across the full suite and focused recheck; the first full run is honestly retained as 9 passed / 1 timeout. No renderer or gameplay change was needed for that recheck. [Final QA summary](../reports/authentic-catalog-qa.json). The successful full round used 194 active seconds.
