# Third-person horror revision

The player route now opens on an original full-screen haunted-facility scene. A dedicated distressed dimensional Pokémon: Ghost Shift title, restrained environmental movement, distinct menu, session input and operator access replace the old specimen-card hero. The operator uses the same steel/bone/crimson identity while preserving clear map, table, chart and input surfaces.

## Controls

- WASD or arrows move relative to the fixed north-up elevated camera. W moves up the map; D moves right. Trainer facing follows movement.
- Touch: left movement stick and on-screen interaction/utility buttons. No pointer lock or right-side look is required.
- E / Interact: approach nearby visible equipment or an encounter. Q: companion selection. TAB: task journal. M: expanded labeled map. F: trainer flashlight. Escape: close overlays.
- Settings retain quality, render scale, brightness, audio, reduced movement/flashing, HUD and minimap controls. The camera has no rotation, sensitivity or head-bob control.
- Local overlays stop that trainer's input and keep normal keyboard focus. They do not pause the shared active clock.

The camera follows with a short position filter, fixed elevation and stable pitch. Roofs are omitted and perimeter walls use a low cutaway. This deliberately avoids camera-wall collision snaps while retaining collision and depth-tested equipment. The operator retains its independent overhead map.

## Gameplay and rules

Two real trainers each choose exactly three distinct catalog entries. All species keep universal task/encounter actions. Briefing acknowledgments are versioned for the third-person controls. Missions remain at most 300 active seconds, start without hostiles, and require both trainers physically at extraction after required work and blocking incidents. The operator remains the only source of manual injections.

Rooms expand into adjacent margins while retaining centers and wing relationships. Narrow passages widen to 90 world units. The canonical floor union, equipment, colliders, portals and gate definitions feed rendering, navigation, collision, terminals, placement and both maps. Distinct room installations remain along edges: breakers, reactor/stabilizers, medical scanner/bed, relay equipment, CCTV/access screens, containment units and storage racks.

Nine normal task types now expose concrete manipulation controls. Server validation still owns proximity, role, option costs, target/step matching, cooperative timing and completion. Data delivery additionally validates a checksum at Communications. The UI never sends a task-completed flag. Wrong inputs are retryable and logged; optional companion assistance leaves the final interaction to a trainer.

Field Analyst retains explicit Diagnostic, Predictive and Prescriptive sections, real shared spending previews/approvals and consequence receipts. Forecasts use legal reducer continuations and explicitly assume no unknown future operator injections. Artwork never supplies decorative invented analytics.

## Evidence and limits

See `OVERHAUL-QA.md` for actual executed checks, screenshots and physical-device gaps; `HORROR-ASSETS.md` for sources, generation prompt and frame-based versus procedural coverage. Older presentation/QA documents describe historical first-person revisions and are superseded for current controls by this document.

Saved rounds from previous scenario versions are archived by the existing migration guard, with operators, credentials and history preserved. New scenario: `ghost-shift-wings-v6-third-person`; new map signature prefix: `aster-wings-v5-spacious`; analytical model: `ghost-shift-wings-v6-third-person-mc1`. Old generated evaluations are incompatible with the new geometry/task pool.

Cooperative controls use fractional server active timestamps with a bounded 350 ms receipt allowance beyond the advertised 12-second window. No client-provided clock is accepted. Background player adviser work occupies at most one analytical worker; interactive decisions retain access to the other. Obsolete pending adviser jobs are cancelled when material conditions change.
