# Replacement recorded battle effects

Updated 2026-10-26 in `C:\Pokemon Day - Among Us` after the user disliked the previous live battle sound.

The live battle mixer now uses locally bundled **recorded Kenney foley**, replacing the buzzy square/sawtooth attack synthesis. Eleven short recordings from [RPG Audio](https://kenney.nl/assets/rpg-audio) and [Impact Sounds](https://kenney.nl/assets/impact-sounds) are included with their original **CC0** licenses and per-file SHA256/source metadata in `public/audio/battle/SOURCES.json`. The recordings are 121,004 bytes combined (see source metadata for exact size). They are decoded once, then reused.

Attack types select different filtered/rate-adjusted whoosh, cloth sweep and release sounds. Actual hits use a punch impact; guard, recovery and fainting use short softer samples. Durations are capped at 0.30-0.55seconds, gain is restrained, filtering removes excessive high frequencies, and short fades prevent abrupt endings. At most four recorded battle voices can play simultaneously. The existing master/effects/mute/visibility controls apply.

Real Pokemon cries are quieter and restricted to encounter entry/new active species. They no longer fire for every attack, and only one cry plays at a time. Their previous pinned source/provenance remains unchanged. Duplicate legacy hit, resolution and radio tones caused by battle state changes are suppressed; the actual server cue is the battle sound authority. Misses do not generate invented hits. New snapshots do not replay completed sound cues. Gameplay mechanics, battle results, map and analytics are unchanged.

Settings > Audio now includes **Battle sound volume**, **Test battle attack** and **Test battle impact**. Preview buttons await sample decoding so the first click can work. They respect mute and the battle slider; setting battle volume to zero silences battle samples/cries without muting UI/music. These controls let the user evaluate the revised sound before starting an encounter. Background music, operator music, typing and button feedback retain their current behavior.

Build and full unit/server suite passed: **131 tests**. New sample integrity tests verify local file checksums, OGG format, attribution, mapping, bounded gains/filtering and duration. Chrome verifies real operator music/typing output, decoding, actual accepted battle turns using recorded samples, two quieter entry cries, no per-move cry repetition and no snapshot replay. The final rerun also verifies preview buttons and independent battle-volume zero. These are real output waveform/decode checks, not a human listening review or a guarantee of subjective preference.

Evidence: `reports/recorded-battle-audio-qa.json`, `reports/single-hand-audio-operator.json`, `reports/single-hand-audio-battle.json`. Source/licenses: `/audio/battle/SOURCES.json`, `/audio/battle/LICENSE-rpg-audio.txt`, `/audio/battle/LICENSE-impact-sounds.txt`.

Restart the host and reload tabs for service-worker cache `ghost-shift-recorded-battle-audio-19`. No database reset or new shift is required solely for this audio replacement.
