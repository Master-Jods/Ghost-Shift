# Player registration and operator activity logs

Implemented on 2026-10-26 in `C:\Pokemon Day - Among Us`.

## Player registration

The player join screen requires **Full Name**, **Block** and **Group #**, alongside the existing trainer slot and session code. Both browser and server validate input: full name 2-100 characters, block 1-50, positive whole-number group 1-9999. Unicode names are supported and surrounding/repeated whitespace is normalized. The API never substitutes a default profile for a new public registration. A forged resume token cannot bypass required fields.

Identity belongs to the authenticated participant, not whichever trainer letter currently occupies a slot. Reconnect and reload retain the saved profile. A credential rejoin cannot silently rename an existing complete profile. Existing older credentials continue working; an incomplete historical profile can be completed when explicitly rejoining with valid details. The operator's Field team cards show the current name, block and group. Player snapshots expose player names through existing aliases, while block/group profiles are supplied only to the operator.

## Operator Logs

Open **Operator > Logs**. The default session is the currently selected shift. Choose another stored session or **All authorized sessions**, search by name/block/group/session/task/Pokemon, and filter by category or actor.

The viewer provides a registration roster, newest-first records, server timestamp (Asia/Taipei), active session seconds, session code, participant identity, event/action, result and expandable details. Newest records refresh every five seconds. Loading older pages pauses live replacement so older entries stay visible; **Latest logs** returns to the latest page. Pagination uses an ID cursor and displays 100 records per page. **Export filtered CSV** follows every matching page, including records older than the visible page. CSV preserves UTF-8 names and protects text cells beginning with spreadsheet formula characters.

Recorded activity includes:

- Player registration/rejoin and authenticated connection/disconnection.
- Session creation, countdown/start, playing/success/failure transitions and session roster snapshots.
- Actual task attempts, mismatches, local cooperative setup, transport, completion and companion assignment.
- Operator Pokemon/emergency injection, actual encounter/response, battle moves/switches/results, retreat, cancellation, expiry and emergency resolution/failure.
- Door/key/route decisions, proposals, guidance acceptance/override and accepted/rejected gameplay commands.
- Room entries at persisted movement checkpoints and movement-time summaries, rather than an unbounded record for every mouse/key packet.

Task/Pokemon records inherit the authenticated actor on the authoritative transition. Commands include their readable target and public battle result where applicable. Cooperative task logs retain both trainers' separate actions; the completion record's actor is the trainer providing the final accepted input. Autonomous clock outcomes are labeled System. Duplicate command IDs reuse their acknowledgement without adding duplicate command activity.

The activity history is separate from the 200-event live snapshot buffer. Historical participant profiles remain available even after an operator releases a slot. All reads/searches/exports enforce the same operator ownership rules as sessions; player credentials cannot read operator logs. No passwords, bearer credentials or serialized private battle engine state are included in log responses.

## Persistence and upgrade

Migration **003-player-activity.sql** creates `player_profiles` and `activity_logs`, preserves existing sessions and credentials, and imports existing event text once. Historical aliases are retained; missing block/group fields show **Not recorded**, and old events with no reliable actor are **Unattributed legacy**. Earlier identity details are never fabricated. The migration runs automatically when the server opens its database. There is no scenario/map/protocol bump or database reset for this change. Service-worker cache is `ghost-shift-player-logs-15`.

Restart the host and refresh player/operator tabs after the update. New registrations require the three fields; existing compatible sessions can continue.

## Verification

- Production TypeScript/Vite build passed.
- Full unit/server suite: **125 passed**. New coverage includes required HTTP validation, forged resume rejection, immutable credential identity, access isolation, task/encounter attribution, duplicate commands, released-slot profile retention, pagination, Unicode and actual file-backed SQLite restart/migration.
- Real Chrome: two distinct registrations and required-field validation, operator roster, legal task completion and Pokemon encounter, reload, search/category filters, pagination beyond 100 rows and a downloaded full filtered CSV. A separate existing v10 run passed both emergency/battle scenarios after registration was added; entry and all-six-puzzle scenarios also passed.
- Complete two-client keyboard round passed in **142 active seconds**, including carried-data reconnect and joint extraction. All six completion records were asserted to contain the actual name/block/group, and a persisted `SESSION_SUCCESS` record was verified. In total, six browser scenarios passed across the targeted runs.
- The log pagination fixture adds 125 explicitly labeled QA records in an isolated in-memory database; actual task/encounter/start records come from real HTTP/WebSocket actions. No production data or private `.env` was edited.

Evidence: [QA summary](../reports/player-logs-qa.json), [browser report](../reports/player-logs-browser.json), [registration](screenshots/player-logs/registration.png), [task attribution](screenshots/player-logs/task-attribution.png), [encounter attribution](screenshots/player-logs/encounter-attribution.png), [log viewer](screenshots/player-logs/log-viewer.png).
