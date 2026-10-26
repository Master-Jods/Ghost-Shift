> The original synth battle effects described here were replaced by [recorded battle audio](RECORDED-BATTLE-AUDIO.md) after user feedback. Hand, UI/music and cry provenance details remain applicable where unchanged.

# Single right hand, louder music and battle/typing audio

Implemented 2026-10-26 in `C:\Pokemon Day - Among Us`.

## Presentation

First person now shows exactly **one blocky right hand/forearm**, angled at the lower right, following the requested Minecraft-style framing. It sits inward enough to remain visible beside the Field Analyst panel. The left arm was removed. Existing key9 third-person switching hides the arm; returning restores it. The arm is cosmetic and reduced-motion/disposal behavior remains intact.

## Louder sound and operator music

Music bus gain is 1.8 times the slider value; default music is 0.85. Button feedback output gain was raised from 0.22 to 0.65, with distinct lower typing gain. Default effects are 0.95. Existing output compressor and master/effects/music controls remain; mute and hidden-tab behavior still silence everything. This changes the audio signal level, not the user's OS/speaker volume.

Audio settings version3 applies the louder floor values once. Unlike the earlier legacy-silent migration, an existing explicit mute at version2 is preserved. Subsequent user volume and mute choices are saved normally.

The operator console now uses the original background music arrangement instead of forcing music off. It starts with a real user gesture, including login input focus/typing. Player exploration, battle and danger arrangements remain. Button/link and selection effects apply to both operator and player pages.

Text input, deletion, paste and composition input generate short typing feedback in editable fields, including login, name and search. Rapid events are bounded to avoid overlapping noise; typing sounds do not read, retain or log the typed text or password. Muted/hidden pages do not sound.

## Showdown research and battle audio

Primary sources inspected: [official client battle-sound.ts](https://github.com/smogon/pokemon-showdown-client/blob/master/play.pokemonshowdown.com/src/battle-sound.ts), [official battle animations](https://github.com/smogon/pokemon-showdown-client/blob/master/play.pokemonshowdown.com/src/battle-animations.ts), [move animations](https://github.com/smogon/pokemon-showdown-client/blob/master/play.pokemonshowdown.com/src/battle-animations-moves.ts), and [Showdown audio directory](https://play.pokemonshowdown.com/audio/).

The inspected client has battle music and Pokemon cry playback; its move animation source does not provide a per-attack sound-effect library to import. Therefore attacks, hit/guard/recovery/resolve feedback use **original synthesized type-based effects**, not falsely labeled Showdown attack recordings. Fire/dragon use a low fiery burst, electric/steel a sharp buzz, water/ice a filtered sweep, psychic/ghost/fairy layered tones, and physical/other types a strike/air burst.

Actual cries are imported through the [PokeAPI cries repository](https://github.com/PokeAPI/cries), which documents Showdown, Veekun and The Sounds Resource as upstream sources. Direct Showdown downloads returned HTTP403, so no direct-host bypass was attempted. Pinned mirror revision: `b3a9044bb839b5e3152aaa536c7b463a0fcf0140`. Ten exact-ID cries are bundled (1,4,6,7,25,133,197,609,10001,10117); other IDs load lazily from the pinned mirror. Cries are decoded once into a bounded16-entry cache with at most two active cry voices. A missing/unavailable cry remains silent while the original attack effect still plays. Original owners retain cry rights, under the existing user-selected non-commercial prototype use; no separate owner license is claimed. [Asset provenance/checksums](../public/audio/SOURCES.json).

Battle effects follow the server's actual timed cues for both participants in the local player's encounter. Attacks, hits, guard, healing and fainting are keyed to incident/request/side/kind/time and played once, including final winning-turn cues. A miss or immunity does not invent a hit cue. Merely refreshing snapshots does not replay sound. Gameplay HP/PP, RNG and decisions remain unchanged. Both local and remote cries use the effects bus and master mute. Operator music does not cause player battles to play remotely on the console.

## Verification and update

Production TypeScript/Vite build passed. Full unit/server suite: **130 passed**, including the one-right-arm geometry/third-person visibility test. Focused real Chrome checks verify operator music-only waveform, music gain, typing-only waveform while keys are actually pressed, mute, single-hand count, key9 behavior, actual accepted Showdown attack/impact audio, two decoded/played Pokemon cries and no refresh replay. All ten bundled cry files are separately decoded in Chrome; upstream Pikachu's MP3 header is preserved despite its `.ogg` filename and is decoded by WebAudio. Waveform tests are real generated output; no human listening review is claimed.

Evidence: [operator/typing/asset decoding report](../reports/single-hand-audio-operator.json), [battle report](../reports/single-hand-audio-battle.json), [hand screenshot](screenshots/single-hand-audio/right-hand.png), [battle screenshot](screenshots/single-hand-audio/battle.png).

Restart the host and refresh player/operator tabs to load cache `ghost-shift-single-hand-battle-audio-18`. Use the visible sound control if explicitly muted. No database reset, gameplay scenario or map/protocol change is required.
