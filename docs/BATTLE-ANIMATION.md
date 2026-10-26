> Historical revision. Current first-person camera, real Showdown battles, fast live predictions and fatal emergency rules are documented in [v10](V10-CRITICAL-INCIDENTS.md). Asset provenance and earlier measurements below remain historical evidence.

# Visible battle and stationary threat animation

Implemented 2026-10-25 in `C:\Pokemon Day - Among Us`.

## What changed

The encounter panel previously showed two static portrait images while actual world animation was mostly hidden behind the modal. It now mounts a lazy live battle stage using the same exact-ID model/sprite resolver, shared asset cache and independent native skeleton/mixers as the world. The stage stays visible while the controls scroll. A model's source-authored attack is visible beside a typed projectile, impact feedback and guard shield. There is no full-screen flashing, arbitrary root bouncing or body deformation to impersonate native movement.

Stationary injected models with real Idle clips keep playing those clips at their fixed gameplay positions. Engagements face a deterministic responding companion rather than whichever client is rendering. Pursuing threats use actual movement speed. Accepted engagements, attacks/containment and resolution now stamp optional cosmetic threat motion in authoritative snapshots, so both clients and reconnects see consistent reaction ages. Native hit clips play when present; otherwise an impact effect accompanies the native idle/reference pose. A periodic challenge animation is cosmetic and non-damaging: it is not a newly introduced enemy damage turn.

Every visible threat also has a subtle typed presence aura. The battle stage uses small orbiting ambient particles for stationary presence. These effects respect pause, reduced motion and reduced flashes. They are not counted as skeleton animation. Native sources are unchanged: currently **205** imported model entries have mapped native Idle, **219** have Attack, **62** have Hit and **0** have a dedicated Guard mapping. Static models remain explicitly labeled `3D reference + ambient effects`; missing native body animation is not concealed by an invented clip. Source sprites/reference artwork are retained after model failure.

A reconnect test found that reopening an active encounter submitted a duplicate ENCOUNTER request and hid the battle behind a new preview. The UI now reopens the existing engagement directly, including the tracker shortcut. It does not enter a second battle or reset HP.

## Current battle rules

Approach the real threat, interact and confirm the existing decision preview. Scout if unidentified, then Guard or Support before each Attack or Contain attempt. Attack lowers integrity; Contain increases containment. Preparation is consumed, and the existing counter cooldown is enforced. Repeat to defeat/contain, or retreat and keep exploring. Partner actions remain available. Damage/progress is resolved by the server; canvas animation cannot deal damage or complete an encounter.

The five-minute deadline continues while the panel is open. Six tasks, three companions, universal task compatibility, operator injection rules, door decisions, canonical world geometry, analytics, networking and persistence remain. Cosmetic fields are optional for old v9 snapshots. Protocol/scenario/map/model versions remain current; SW cache is `ghost-shift-battle-animation-12`. Restart host and refresh clients, without a database reset.

## Resource behavior

Only one extra battle WebGL stage mounts while an encounter panel is open. It shares character templates/downloads with the world, clones independent actors, caps pixel ratio, and disposes actors, geometry, materials, animation frame, ResizeObserver and renderer/context on close. No new asset catalog or model pack is downloaded by this change. Missing WebGL/model support keeps exact-ID reference appearances available.

## Verification

Three pure/reducer tests passed: accepted versus rejected visual actions, persisted authoritative reaction timing, deterministic facing/legacy snapshots, cosmetic challenge immutability and phase labels. The initial browser run verified native idle with unchanged world position, live native attacking skeletons and HP feedback, then exposed the duplicate-engagement reconnect bug above. That bug was corrected and the affected browser check is rerun separately. The accompanying real-model/Draco/fallback regression passed in the initial run. Final verification and actual screenshots are recorded below after completion.


The corrected live-battle/reconnect and chase-camera run passed **2/2**. The earlier real-model/Draco/fallback case also passed, so all three distinct relevant browser scenarios passed across the initial run and corrected recheck. [Battle browser evidence](../reports/battle-animation-browser.json) records stationary idle bone changes with unchanged world position, native attacks, authoritative HP/reaction timing, reconnect and release on defeat. [Actual battle-stage capture](screenshots/battle-animation/live-battle.png) and [resolved state](screenshots/battle-animation/resolved.png) were produced by the real browser; the live stage was visually inspected.


Final production build passed. Full unit/integration run passed **107/107**; after the final containment-reaction correction, the focused engine/reaction run passed **18/18**. That correction leaves containment HP unchanged and uses a target reaction instead of an apparent enemy damage turn. [QA summary](../reports/battle-animation-qa.json). No new model-source permission or binary-model import was introduced by this presentation pass.
