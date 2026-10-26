# Textured 3D motion and original horror music

Updated 2026-10-26 in `C:\Pokemon Day - Among Us`.

## Final model coverage

The accepted registry now contains **1,108 textured 3D models**, 13 more than the previous 1,095. Added exact forms include Deoxys Attack/Defense/Speed, Paldean Tauros breeds, Ash Greninja, Ultra Necrozma, Eternamax Eternatus, Eiscue Noice, Gimmighoul Roaming and the named Koraidon sprint/Miraidon aquatic builds. The selectable catalog remains 1,351 entries; **243 exact variants still have no accepted 3D model** and retain their original exact-ID sprite/art fallback. They are never silently replaced with a different species or form.

The picker and operator selected-Pokemon panel now show model availability before committing. The player picker includes an optional **Show only Pokemon with verified 3D models** filter. Network failures can still fall back on individual clients, even where a model is present in the registry.

Native clip-name matching also recognizes additional authored wait/physical/special-attack naming patterns. There are now **221 native locomotion mappings** and **249 native attack mappings**. Unknown ArmatureAction/Dance/T-pose clips are not relabeled walk/attack.

## Motion when source clips are missing

Native clips always take priority. Missing clips use original runtime motion on the imported model: bind-pose-aware joint motion when a skeleton is available, or bounded root motion for unrigged meshes. Grounded movement, hover/flight, tail/head motion, attack lunge, guard and recoil follow actual movement or authoritative battle timing. Restore-before-update avoids accumulating transform drift. Instances own their transforms/materials/mixers; motion is cosmetic and never changes collision, position authority, damage or task rules. Reduced-motion settings reduce the motion.

**887** accepted models lack native locomotion and use this runtime fallback. This is not a claim that every source has a fully authored game walk cycle. Unrigged models cannot acquire new true limb animation from a missing skeleton; the fallback animates their existing model root. Runtime versus native origin is exposed in rendering diagnostics and battle labels. Stationary injected Pokemon animate without moving their authoritative spawn position.

Ten common models are bundled locally: 1, 4, 6, 7, 25, 133, 197, 609, 10001 and 10117. Others remain lazy downloads from pinned revisions. Native game-derived models retain the previously authorized non-commercial prototype source/rights notice. Source repositories: [06wj/pokemon](https://github.com/06wj/pokemon) and [Pokemon-3D-api/assets](https://github.com/Pokemon-3D-api/assets). This update does not claim a redistribution license from Pokemon's owners.

## Rejected source

A public Pokemon HOME export repository initially appeared to add 180 models, but actual rendered inspection showed untextured/deformed assets. Sample GLBs had no images and only placeholder material names; no separate textures exist in the repository tree. Those assets and their candidate registry entries were rejected and removed before the final build. The final count is **1,108**, not the preliminary 1,275. A new importer quality gate rejects untextured placeholder-only materials. [Source audit](../reports/model-source-audit.json).

## Original score and button sounds

A shared app-level WebAudio engine now works at entry, selection, menus and gameplay. The original horror score combines repeating minor/dissonant chord progressions, low pulses and sparse high notes. Its arrangement accelerates for battles and critical emergencies. This is composed procedural music, not just the existing motor/noise ambience, and requires no external music download or copyrighted soundtrack.

Buttons/links produce short musical feedback for mouse, touch and keyboard activation. Selects, toggles and sliders have change feedback. Existing positional footsteps, doors, tasks, attacks and alarms still use the same bounded effects bus. The global engine avoids duplicate contexts when the WebGL renderer mounts/unmounts.

Audio starts after a real browser interaction. New settings default to sound enabled, while saved mute choices are retained. Use the visible **Sound on / Sound off** button, or Settings > Audio. Independent master, **music**, effects and ambience controls apply immediately. Hidden/unfocused pages fade silent; voices are bounded and cleanup stops the score scheduler/context. Existing browser autoplay rules still apply.

## Verification

- Production TypeScript/Vite build passed; 128 unit/server tests passed.
- Four Python model tests passed, including exact-form mapping, native naming and rejection of bare placeholder materials. Offline metadata validation passed for all 1,108 accepted models and pinned bundled checksums.
- Five unique Chrome scenarios passed across focused runs: native battle animation; existing GLB/native locomotion/download fallback; touch/audio/settings; original music/button RMS output and mute/mixer; textured exact forms/runtime idle/walk/injected battle animation. The final two model/audio scenarios were rerun after final root/skeleton origin labeling.
- Music-only RMS and button-only RMS were measured separately with the other buses at zero, proving actual generated output. This is not a human listening review.
- Rendered Umbreon, Deoxys Attack form and battle stage were inspected. Upstream GLB metadata validation is not a claim of visually inspecting every model. No gameplay rules, map, scenario, protocol, server database or private `.env` were changed for this presentation update.

Evidence: [QA](../reports/models-music-qa.json), [motion browser report](../reports/models-music-browser.json), [audio measurements](../reports/music-browser.json), [Umbreon](screenshots/models-music/model-197.png), [Deoxys Attack](screenshots/models-music/model-10001.png), [runtime battle](screenshots/models-music/runtime-battle.png), [audio settings](screenshots/models-music/audio-settings.png).

Restart the host and refresh player/operator tabs to install cache `ghost-shift-models-music-16`. No database reset or new shift is required solely for this update. If a previous mute preference is saved, enable sound with the visible sound button.
