# Historical Canvas revision

Superseded by [WebGL wings v2](PRESENTATION.md). The following describes the earlier revision only.

# Atmospheric presentation overhaul

This release retains Ghost Shift's authoritative rules, full catalog, two-player cooperative objectives, manual Live Director, five-minute deadline, persistence and analytics. No new cloud service or rendering dependency is required. New presentation runs against the existing shared facility geometry.

## Implemented art direction

The player world now uses original deterministic worn-metal, painted-panel, concrete, grating, cabinet and ceiling materials. Perspective floor/ceiling casting, room light pools, an actual flashlight cone, readable blackout backup fill, emergency tint, gradual power restoration and restrained distance haze replace flat wall fills. Original pixel equipment includes relay consoles, utility pipe/valve fixtures, ventilation fans, research pods, signs, scanner and flashlight. Solid obstacle geometry still comes from the authoritative map; decorative equipment is cosmetic or attached to the existing obstacle/room surfaces.

The renderer remains genuine 2.5D raycasting. Its occupancy grid is built from `world.ts`, cached for static geometry and patched for changed doors. Per-column depth clips sprites against walls. Door panels slide open and closed cosmetically while authoritative state remains responsible for collision and interaction. Contact shadows, consistent world scale, cached light-tinted sprites, available front/back views and restrained idle translation ground Pokémon. Their authoritative follower positions now stay in walkable, visible space; this changes cosmetic following rather than task/combat rules.

Supported threat presentation includes actual-position materialization, Gengar decoys, localized Gastly fog, Rotom electrical strokes, Chandelure light contribution, restrained Darkrai tint and Froslass frost edging. Active threats stay in the world; a transient warning becomes a compact tracker. Containment/impact/resolution effects are driven by confirmed progress and outcomes, not an optimistic button animation.

## Animation and sound

`presentation.ts` observes immutable authoritative snapshots, deduplicates event cues, skips historical replay on reconnect and bounds active cosmetic cues to 40. It never commits an outcome. Task acceptance/mismatch, activation, companion selection, Guard/Support, damage, containment, emergency onset/recovery, door state and extraction receive distinct feedback. Input submission is explicitly labeled pending, and server-confirmed feedback remains separate. Tools have restrained idle/walk sway, raise/lower, switch and counter/containment response. Close walls lower the foreground device. No jumping, crouching, sprinting or extra stamina system was added.

`audio.ts` synthesizes original sounds with Web Audio: surface-sensitive footsteps, low machinery/ventilation, door motion, switches, task success/error, radio, threat warning, battle/counter, containment and extraction. Stereo direction and distance attenuation provide positional cues. Alarms are rate-limited and effects are capped at 12 simultaneous voices. One context and separate master/effects/ambience buses are used; scheduled sources and listeners are disposed. No proprietary game audio is included.

Audio is muted by default. Open player Settings, enable facility audio, then adjust Master, Effects and Ambience independently. Browsers require user interaction to unlock audio. Muting/zero gain is functional, and background focus/visibility suppresses the mixer. Automated verification confirms context unlock and control state; listening quality and target-speaker/headphone behavior still need human/device checks.

## Interfaces and input

Exploration HUD now has a small timer/objective, compact active/reserve companions, partner status, contextual interaction brackets and a brief warning with a persistent compact incident tracker. The world dominates the screen. Equipment terminals retain real sequences, tuning, gauges, transport and cooperative controls with mechanical button response, actual progression and clear confirmed success/error feedback. Battle controls expose real Guard/Support/counter requirements and availability rather than accepting meaningless repeated presses.

Consequence previews show actionable known effects, partner impact, resource cost, conditional forecast and recommended compared policy first. Full effects, alternatives and model assumptions are progressively disclosed. The same confirmation/approval/revalidation protocol is preserved.

Settings include sensitivity, Low/Standard/High render width caps (480/720/960), reduced camera/tool motion, reduced flashing and post-processing. OS reduced-motion preference is respected unless explicitly overridden. Pointer-lock exit, blur, hidden-tab changes and local overlays clear held movement. Escape closes equipment even while a form control has focus. Right-side touch-look now snapshots movement delta before React state updates; this fixes a genuine deferred-reference bug. Touch movement and look remain independent.

The catalog has persistent team slots, direct slot replacement, exact numeric-ID search and clear unsaved-team readiness. Only the visible page/details load. The default page and supported companions/threats now have 34 bundled front/back sprite sets plus optional official artwork; every other catalog entry remains selectable with existing remote/fallback behavior. Existing PokéAPI/PokeAPI sprite provenance is retained; the new facility materials, equipment and sounds are original code assets. No Lethal Company assets, map or layout were copied.

Operator control is deliberately separate: a light research-station website, legible overhead plan, room numbers, player orientation, companion dots, threat/emergency markers, actual placement validation, grouped KPIs and an observed incident interval chart. The chart plots recorded activation, first response, outcome and injected severity; it does not invent historical measurements.

## Run and verification

```powershell
Set-Location -LiteralPath 'C:\Jigsaw Trials'
npm.cmd run build
npm.cmd start
```

Players: http://localhost:8787/play. Operator: http://localhost:8787/operator. Keep the existing .env/database/operator account. This presentation update needs no additional migration. See the main README for three-device LAN setup, complete controls and Live Director operation.

Checks: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e`. New tests verify that cosmetic cues never invent/mutate outcomes, remain bounded and deduplicate across snapshots/reconnects. Browser coverage includes the original three-client full round plus real CDP touch movement/look, slot replacement/readiness, quality settings, mixer unlock, reduced-motion/flashing preferences, post-processing, and stopping input when equipment opens. The test databases are isolated.

Actual browser screenshots are in `docs/screenshots/`; performance samples are described in `docs/PRESENTATION-VERIFICATION.md`. A render-function CPU sample is not end-to-end FPS, input latency or a physical-phone benchmark. Real target-device, speaker/headphone, sustained performance and visitor pacing acceptance remain pending.

## Remaining representation limits

Pokémon use front/back billboards where assets exist, otherwise a front view or labeled fallback. These are not unique skeletal walk cycles, lateral directional animation sets, or full 3D models. Motion is restrained translation, following and state feedback; no static portrait is advertised as a complete walking animation. Lighting is software approximated with contact shadows and depth occlusion rather than hardware shadow maps. The facility remains a single-level 2.5D environment. Physical-device performance and audio quality have not been established by headless Chrome.
