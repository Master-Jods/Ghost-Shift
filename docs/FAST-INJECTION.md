# Fast operator injection

Implemented 2026-10-25 in `C:\Pokemon Day - Among Us`.

## Root cause and correction

Every INJECT preview previously awaited a Monte Carlo response-policy comparison through the shared analytical worker queue. Even valid placement/authority checks could therefore wait for simulation and other jobs. Pokemon metadata could additionally wait on an external PokeAPI request or stale-record refresh before the review appeared.

Injection review now returns authoritative placement, feasibility, costs and known effects directly. It does not submit or await an analytics job. Invalid actions also return their current rejection without a simulation. Confirmation still revalidates current material conditions, placement, cooldown, authority, limits and response time atomically. Preview expiry, idempotence, budget accounting, persistence and the three-second Pokemon telegraph are retained.

Exact names/types for all 1,351 selectable species/forms are bundled in `public/catalog/identities.json`, using PokeAPI CSV revision `2bf639e5572812a67d2b94903fdcb9d095f5aeb2`. Injection uses this local authoritative identity index, overwriting untrusted supplied names/types. No network request is needed for injection, including uncached regional/forms. Companion selection/stat fetching remains separate. Regenerate metadata with `npm.cmd run catalog:identities` when maintaining the catalog; exact identity mismatches fail the generator rather than guessing a base form.

## Analytics behavior

Rules-only reviews expose `analysisMode: rules-only`, an explicit `not_computed` source and zero samples with no numerical outcome claim. Their UI shows actual placement/effects, not a fake probability or `Best Plan Found` recommendation. Zero-sample reviews are not recorded as forecasts, so calibration/history is not polluted. Actual Predictive/Prescriptive jobs still use the newly injected authoritative state through the existing live invalidation/recomputation path; simulation has not been replaced by a hardcoded result. Other valid player consequence previews retain their simulation path.

No mission/gameplay redesign was made. Protocol/scenario/map/model remain compatible; the optional preview mode and source tag are backward compatible. SW cache is `ghost-shift-fast-injection-13`. Restart the host and refresh operator/player tabs; no database reset is required.

## Measurements and checks

The real operator UI was tested with two live Chrome player clients:

| Injection | Click to completed review | Confirm to active server state |
| --- | ---: | ---: |
| Pokemon | 263 ms | 118 ms |
| Facility event | 144 ms | 112 ms |

These are local test measurements, not a deployment SLA or visitor benchmark. The Pokemon was also observed in both clients' entity state. Model downloads and the intentional three-second materialization warning are separate from injection authorization. [Machine-readable browser measurements](../reports/injection-latency-browser.json).

Four targeted tests passed: complete exact-form identity/type coverage, offline external services plus saturated analytics for both injection types, no fabricated forecast rows, idempotent confirmation, authoritative metadata overrides, and immediate invalid-action rejection. The real-browser injection scenario passed. Screenshots: [Pokemon review](screenshots/fast-injection/pokemon-review.png), [event review](screenshots/fast-injection/event-review.png). Production build passed; final full regression results follow below.


Final full regression run passed **111/111 unit/integration tests**, with the four new offline/busy-worker checks included. Production build and the real operator/two-client browser scenario passed. The Pokemon review screenshot was visually inspected. [Final QA summary](../reports/fast-injection-qa.json). No production server was stopped, and no private environment or production database was manually edited.
