# Vercel + external PostgreSQL

The frontend and Node HTTP/WebSocket server run in **one Vercel project**. Durable accounts, profiles, room state, native battle state, analytics, command receipts and logs live in external PostgreSQL. No SQLite file or continuously running LAN host is required in this mode.

## Deploy a new cloud database

1. Import this GitHub repository into Vercel with the Vite framework preset. Keep the committed `vercel.json`; build is `npm run build`, output is `dist`, Node is 22.x. Enable **Fluid Compute** in the project settings; WebSockets require it.
2. Create an external PostgreSQL database, for example through the [Vercel Marketplace](https://vercel.com/marketplace?category=storage). Use the provider's **pooled PostgreSQL URL with TLS** as the server environment variable `DATABASE_URL`. Keep database and Vercel function regions close together. Select the function region in the Vercel project settings to match the database region.
3. Set `OPERATOR_USER` and a private `OPERATOR_PASSWORD` of at least 10 characters in Vercel environment variables. Do not put secrets in any `VITE_` variable. The initial account is created on the first request; an existing username's password is never overwritten. Alternatively run the migration/operator CLI against the cloud database before deployment. Production and Preview should use separate databases.
4. Deploy. `/api/health` must return `mode: "postgres-authoritative"` and `setupRequired: false`. The first request applies idempotent schema migrations under a PostgreSQL advisory lock. No credentials are returned by health checks. If a database is unavailable the API returns a retryable 503 rather than creating a separate local room.
5. Operator laptop opens `https://YOUR-DOMAIN/operator`, signs in, creates a shift and shares its code. Both player laptops open `https://YOUR-DOMAIN/play`, enter their full name/block/group, choose different slots and use **the same code**. They use the same deployment URL. Three Vercel projects are unnecessary.

The server accepts its own origin automatically, including the deployment's HTTPS host. `ALLOWED_ORIGINS` is optional for additional trusted origins. Existing same-origin API calls and `/ws` use rewrites to `api/cloud.ts`; cookies stay HttpOnly, SameSite=Strict and Secure on Vercel.

## Test cloud mode locally

Put the private connection URL in a local `.env` (never commit it), then:

```powershell
npm.cmd ci
npm.cmd run cloud:migrate
npm.cmd run cloud:operator
npm.cmd run build
npm.cmd run cloud:start
```

Open `http://localhost:8787/operator` and `/play`. For frontend hot reload, run `npm run dev:client` separately; its existing proxy reaches the cloud server on port 8787. `npm start` and `npm run dev` continue to use the existing SQLite/LAN implementation. Cloud mode has its own entry point, so deploying does not open or reset a local database.

## Import existing SQLite records

Stop the old LAN server and take a SQLite backup first. Set `DATABASE_URL` to the intended external database. **Import into an empty cloud database before bootstrap creates accounts**, so operator IDs/usernames retain their original identity:

```powershell
npm.cmd run cloud:import -- "C:\PATH\TO\BACKUP.sqlite"
```

The importer opens the source read-only and commits all PostgreSQL writes in one transaction. It preserves operator password hashes, player credential hashes/profiles, session snapshots, command receipts, activity and forecasts. Every source table is also archived verbatim in `gs_legacy_rows`, including previous scenarios, released-player identities, outcomes and decisions; session exports include these original records. Re-running does not overwrite existing cloud room state. Conflicting operator identities cause a rollback rather than silently reassigning ownership.

Compatible active rounds are imported **paused**, with movement cleared. Rejoin using the original browser slot credentials, connect both players, then let the operator resume. Incompatible scenarios remain closed historical records. Login cookies and pending proposals/previews are archived without reactivation. An old browser credential works only if that browser still retains it; otherwise use a new shift. Do not run the LAN and cloud servers against separate copies of a supposedly shared live round.

## How shared authority works

- Every observation/action obtains `SELECT ... FOR UPDATE` on its room, authenticates the current identity, advances the shared reducer from PostgreSQL `clock_timestamp()`, applies/revalidates the action, and saves the state/receipts/logs in the same transaction. Separate function instances never keep their own authoritative room copies.
- Snapshots poll that shared row at 5 Hz per connected terminal. Movement advances in up-to-50 ms substeps using the existing collision reducer; idle clock catch-up uses up-to-250 ms steps. Native Showdown battle serialization stays private in the room JSON and is removed from client snapshots.
- Connection ownership and short presence leases live in PostgreSQL. A new tab supersedes the previous socket across instances. Lease expiry plus the configured disconnect grace protects the session with a pause. Operator resume is explicit. Killing an instance does not erase a room.
- A cold or idle instance does not need a background simulation loop. The next transaction advances elapsed active time to the database clock, including emergency deadlines, up to disconnect protection. This is deferred calculation of the same shared clock, not a timer reset. There is no autonomous processing during a period with no requests; its elapsed result is applied when a request resumes.
- WebSockets rotate after 240 seconds, before the configured 300-second function limit; the existing client reconnects with the same credential and retries pending decisions. Persisted command IDs make retries idempotent. Hard termination is recovered through the same shared state/lease mechanism. Maps, deadline, tasks, companions, animations and audio use the existing gameplay code.
- Preview fingerprints and player analysis keys use sorted JSON keys, so PostgreSQL JSONB key reordering cannot invalidate an unchanged decision. Field guidance and its completed job/result/context are persisted and can be read on another instance.

## Scope and operational limits

This is intended for the requested two-player plus operator booth. A room serializes its writes; nearby PostgreSQL latency matters for movement. Polling/input traffic consumes database and Vercel Function usage. This implementation does not establish free-tier capacity or production latency guarantees. Scale/load-test before increasing simultaneous sessions. Use a pooled connection URL; each warm function instance uses a small pool of at most three connections.

The cloud's interactive prediction, plan comparison and cloned what-if workspaces use the same fast route/workload Monte Carlo as field guidance, with explicit timing-model assumptions. They do not run a full native battle replay. Historical offline reducer evaluation remains a **local CLI** operation (`npm run analytics:evaluate`); the cloud API returns an explicit explanation if asked to launch it instead of pretending to schedule an in-memory background job. Existing evaluation archives are preserved by import.

No database, Vercel project or live deployment is created by this code change. Supply the private managed-database URL and deploy in your account to complete infrastructure setup. `.vercelignore` and function exclusions keep local databases, backups and `.env` files out of deployment artifacts.

## Verification commands

```powershell
npm.cmd test
npm.cmd run test:cloud
npm.cmd run test:cloud:postgres
npm.cmd run build
npx.cmd playwright test tests/cloud.spec.ts --workers=1
```

`test:cloud` exercises the PostgreSQL SQL/JSON engine with PGlite, separate services, durable retries, ownership, stale sequences, forecasts, expiry and read-only SQLite import. PGlite serializes transactions itself; it is not evidence of multi-connection row locking. `test:cloud:postgres` starts an isolated real PostgreSQL cluster under `.qa`, uses three independent TCP pools, and checks actual row locking, duplicate commands and clock consistency. Its data stays under `.qa`; it does not use `DATABASE_URL`, modify the operating-system user accounts or touch the production SQLite file. The browser smoke test uses three separate app instances sharing a test database. These local tests do not constitute a live Vercel deployment test.

Primary platform references: [Vercel WebSockets](https://vercel.com/docs/functions/websockets), [SQLite limitations](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel), [Function limits](https://vercel.com/docs/functions/limitations). WebSockets are currently supported on Vercel; the problem addressed here is durable shared state and finite connection lifetime.

Local verification on 2026-10-26: full suite 135 passed / 0 failed / 1 optional skipped; final focused cloud suite 5 passed; real PostgreSQL test 1 passed; three-terminal Chrome test 1 passed; production build passed. [Machine-readable record](../reports/vercel-cloud-qa.json), [player emergency screenshot](screenshots/vercel-cloud/player.png), [operator dashboard screenshot](screenshots/vercel-cloud/operator.png).
