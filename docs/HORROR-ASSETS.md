# Artwork and animation sources

## Original revision assets

- `public/horror/aster-night-clean.png`: original artwork generated with the built-in imagegen tool for this revision. Not copied from a Steam header. It contains a haunted research corridor, Gengar/Haunter, broken glass, moonlight, industrial detail and blood trails. Generated output is not a license to Pokémon trademarks/characters; this remains a fan project.
- `public/horror/title.svg`: project-authored layered vector typography with outline, offset dimensional extrusion, displaced/distressed edges, scratches, blood masks and individually drawn drips. Accessible title text lives in `HorrorTitle.tsx`. It uses local system display-font fallbacks; no proprietary font file is distributed. Barlow Condensed supports the surrounding interface.
- `public/horror/blood.svg`: project-authored irregular splash silhouettes, narrow trails, smears, droplets and a displaced texture mask. Kept away from analytical surfaces and inputs.
- `public/trainers/a-atlas.svg`, `b-atlas.svg`: original vector trainer sprite sheets. Rebuild with `node scripts/create-trainers.mjs`. Manifest specifies CC0-1.0 for this original trainer artwork. No external trainer assets or fonts are embedded.
- CSS fog drift, restrained title drip and original procedural facility audio. Motion respects the OS reduced-motion preference and the saved player setting. Audio remains muted until explicitly enabled by user interaction.

The three supplied Steam images were downloaded into ignored `.qa/references/` and visually inspected. Reference observations: shadow-framed figures and converging industrial perspectives; distressed bone lettering; asymmetric dripping crimson title shapes; film/print texture; sparse light against deep black. These images are not shipped as application assets.

## Generation prompt

Built-in imagegen, `stylized-concept`: original wide cinematic haunted Pokémon research facility, left third dark negative space for navigation, foreground scratched dirty blood-streaked glass, recognizable sinister Gengar behind broken containment glass, Haunter deeper in the facility, long industrial corridor, cold moonlight, restrained crimson emergency light, dangling cables, specimen chambers, thin fog, blood trail, tactile steel, premium painted survival-horror composition. No UI, text, watermark, or copied game-header composition. A follow-up edit removes incidental lettering while preserving scene composition.

## Existing sources retained

Pokémon official artwork/front/back sprites remain sourced through the existing PokéAPI sprite repository URLs in `src/data.ts` and the bundled files in `public/pokemon`. Pokémon assets and characters belong to their respective rights holders; this revision does not relicense them. The full catalog includes alternate varieties and remains independently searchable. No complete attack/run sheet is claimed from PokéAPI.

Bundled Barlow, Barlow Condensed, and IBM Plex Mono retain their SIL Open Font License texts under `public/fonts/*-LICENSE.txt`. No new font dependency was introduced.

## Animation coverage

| Asset | Coverage | Technique |
|---|---|---|
| Trainer A | 4 facing directions × idle, run, interact, encounter reaction, victory × 6 frames | Original transparent atlas; actual arm/leg pose changes |
| Trainer B | Same coverage | Distinct cap-free hair, goggles, silhouette, equipment and outfit |
| Every Pokémon ID with loadable artwork | Idle, follow/run, assist, guard, attack, hit, recover, containment/resolution | Species-preserving procedural fallback, front/back imagery where available |
| Full frame-based species animations | None bundled by this revision | Do not describe procedural transformations as frame sheets |

Run phase follows world distance (8 units per trainer frame), rather than a fixed looping timer. Both clients read authoritative facing and one-shot motion timestamps. Action animations expire on server time, freeze with mission pauses and do not replay on reconnect. Motion never changes server collision. Pokémon fallback keeps a grounded pivot, contact shadow, anticipation, lunge, squash/recovery, hit lean, separate rest/guard effects and type-colored attack trails (water arcs, electrical zigzags, fire agitation). It does not invent a generic replacement species. Static source art cannot produce authentic species-specific limb animation; that requires separately licensed/created sheets.

All animation textures load lazily, use bounded rendered height, alpha testing, depth testing and an eviction cache. Followers have no player collider. Cutaway geometry omits roofs and reduces perimeter walls for camera visibility; equipment colliders still derive from `world.ts`.
