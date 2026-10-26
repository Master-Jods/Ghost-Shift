# Crewmates and persistent incident audio

Both trainers now render as original lightweight rounded 3D crewmates: red A and cyan B, glass visor, backpack, two short legs and no human arms. This replaces the articulated box researcher. First person remains the default; key 9 toggles third person. No hands were reintroduced. Collision and gameplay movement dimensions are unchanged.

Walking is driven by distance travelled, with alternating foot lift/forward placement, restrained body bob/roll, and a smoothed transition to idle. The local player uses predicted render movement to keep the gait from following network packet spacing. The other player's movement retains the existing server-authoritative stream. No network model or animation fetch is needed.

## References and assets

- Jennifer Moura, [Among Us - Animated](https://sketchfab.com/3d-models/among-us-animated-22f70e065eb74a90a7ee39c91137e9a4). Public model metadata lists one Walk animation and CC Attribution. Model thumbnail/proportions were inspected as reference. The mesh and procedural gait in `src/trainer3d.ts` were authored for this project; the third-party model/animation files are not bundled. Among Us characters remain associated with Innersloth; no affiliation is implied.
- Kenney, [Impact Sounds](https://kenney.nl/assets/impact-sounds), CC0-1.0. Ten original OGG footstep recordings are bundled with license and SHA256/source manifest under `public/audio/footsteps/`. Concrete variants serve facility floors; carpet variants serve medical rubber flooring. Each surface alternates five recordings with restrained pitch variation and filtering, replacing synthetic noise/oscillator footsteps.

## Alarm lifecycle

The original two-note danger alert now loops until the authoritative condition clears. An active emergency has priority and stops when resolved/cancelled or the round ends. An unengaged active Pokemon keeps the warning active until either trainer engages it; retreat restores the warning while it remains unresolved. Other unengaged Pokemon can keep an alert active during a separate battle. Clearing the emergency restores a remaining Pokemon warning. Only one loop plays; repeated snapshots do not restart it. Pause, hidden tabs and mute silence it; resume/unmute reconciles the still-active incidents. Volume obeys master/effects settings.

## Verification

- Real Chrome two-player tests passed for sustained alerts beyond four seconds, emergency priority, mute/unmute, actual battle entry, retreat and cancellation.
- Real Chrome test passed for two crewmate meshes, walking pose, 10 decoded footstep variants, step playback only while moving, key 9 and no hands.
- Gameplay screenshots inspected under `.qa/crewmates/`; counters/output are measured, not a claim of human listening review.
- Reports: `reports/crewmates-audio-qa.json` and `reports/among-shadows-danger-qa.json`.

Changes require a fresh production deployment. Service worker cache is `among-shadows-crewmates-audio-26`.
