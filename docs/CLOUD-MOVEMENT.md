# Hand-free view and cloud movement latency

The first-person hand mesh and its builder were removed. First person stays at eye level; key 9 still switches between first- and third-person views. Both modes report zero first-person hand meshes. Existing companions, collision, tasks and battle interactions remain server-authoritative.

## Why cloud movement felt different

The old client sent `INPUT` every 80 ms even when idle, and sent `LOOK` on every moving refresh. On cloud, each packet ran a separate room transaction, in addition to each socket's 5 Hz heartbeat/snapshot transaction. A single transaction also waited for multiple successive database queries. Ordinary network latency therefore accumulated into a command backlog. The camera waited for authoritative 5 Hz position snapshots and then blended toward them, so every delayed update was visible.

There was also an actual region mismatch: the configured Neon hostname identifies AWS **us-east-1**, whereas prior live Vercel failure logs showed `sin1` (Singapore). The cloud function is now explicitly configured for **iad1** in `vercel.json`, close to that existing database. The database itself and its records were not moved. For future databases in another region, update the function region to match rather than retaining iad1 blindly. This reduces function-to-database travel; player-to-function Internet latency still exists.

## Changes

- Send movement immediately on key transitions, refresh held input at 10 Hz, send orientation only when movement direction changes, and send no repeated idle input. Keyboard autorepeat does not create extra packets.
- Each cloud socket retains only the latest unprocessed orientation/input state. A room update combines movement, heartbeat, sequence persistence and the resulting snapshot. Intermediate motion refreshes do not build an unbounded queue; a later stop replaces the pending input. Consequential commands retain their order: batches are captured when queued and earlier movement is drained before the action.
- Keep `SELECT ... FOR UPDATE` for the shared room. Read identity, current participants and the database clock in one query **after** acquiring that lock, so released slots/ownership changes are checked against committed state. Persist heartbeat and sequence through a CTE in the same room write. A basic frame now uses three SQL calls inside the transaction, plus one begin/settings call and one commit call. Meaningful event logs may require additional writes.
- Render immediate, bounded local camera movement against the same canonical collision geometry. Reconcile to acknowledged server positions; never change the authoritative state used by tasks, extraction, battles or analytics. Prediction stops during stalls/disconnection, menus, pause/end states and when input stops. Large server corrections/teleports snap back to the validated position. The client never submits a position or speed to the server.

The existing shared clock, presence leases and durable decisions remain in PostgreSQL. Coalescing is only for ephemeral movement state; task/battle/Director decisions are still individually validated and persisted. No global collision disabling, local authoritative rooms, extra database or new environment variable was introduced.

## Verification

- Production build passed.
- Full unit/server suite: **143 passed, 0 failed, 1 optional test skipped**. Meaningful additions cover camera response before acknowledgement, immediate stop, stall bounds, canonical wall collision, server corrections, pause/disconnect, compact cloud SQL calls, authority and slot takeover.
- Real PostgreSQL test passed across three independent TCP pools, including combined movement/heartbeat/sequence persistence, row-lock blocking, duplicate decisions and native battle state.
- Native compiled-Node cloud health/operator-login smoke passed.
- Chrome: independent cloud app instances still passed the two-player/operator injection/analytics/log smoke test. A dedicated test added **360 ms simulated network round-trip** and **8 ms per database query**, checked zero idle packets, camera motion before the delayed server input arrived, eventual authoritative motion and bounded per-frame corrections. Both camera modes have no hands. See [measured results](../reports/cloud-movement-qa.json) and [hand-free screenshot](screenshots/movement/hand-free.png).
- Additional Chrome camera-toggle/overlay/audio and stale-brand-cache checks passed. Screenshot inspected. These are local simulations; a post-deployment Internet latency/load measurement has not been performed.

Deploy with `npx.cmd vercel@latest --prod --archive=tgz`, then refresh/reconnect all terminals so the new client, function region and server pipeline are active together. Cache version: `ghost-shift-hand-free-movement-23`. No production records, private env file, commit, push or deployment were changed by this work. Only the database hostname's region was inspected for placement.
