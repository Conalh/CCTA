# Gameplay Contract

This contract gives future gameplay work a narrow direction. It describes intended boundaries, not the current implementation; the active milestone is tracked in [ROADMAP.md](../ROADMAP.md).

## Core Shape

- Small teams.
- Original arena maps.
- Short round flow.
- Server-authoritative hitscan combat.
- Health and death states owned by the server.
- Simple loadouts validated by the server.

## Teams

Teams should use original names and visual identities. Avoid real-world faction branding and avoid names associated with existing shooter franchises.

Early prototypes may use neutral placeholders such as `teamA` and `teamB` until an original setting is defined.

## Maps

Maps should be compact original arenas built for quick tactical decisions. Do not copy layouts, callout structures, prop arrangements, or recognizable silhouettes from existing games.

Early map work should start as greybox blockouts with explicit original design notes.

Phase 13 introduces only a metadata contract for original greybox blockouts. Map metadata may describe structural bounds, blockout primitives, neutral spawn markers, scale references, and labels. It must not implement spawn authority, collision gameplay, objectives, art direction, texture sets, recognizable callouts, or copied layouts.

Phase 14 may place a client-only first-person camera against validated map metadata for renderer inspection. This camera is not player authority, spawn authority, collision gameplay, or server map selection.

Phase 20 may preview ignored private prototype GLBs inside `/sandbox.html` by local asset category. These previews are renderer tooling only: they are not map selection, collision gameplay, spawn authority, weapon presentation, equipment truth, art pipeline import, or server state.

Phase 21 may audit ignored private prototype GLBs and attach local candidate tags for preview, scale-check, and replacement planning. The audit is renderer/tooling documentation only: it is not map selection, collision gameplay, spawn authority, equipment truth, public asset approval, art pipeline import, or server state.

Phase 22 may group already-listed private prototype GLBs into curated `/sandbox.html` preview presets for local visual inspection. These presets are renderer tooling only: they are not map selection, gameplay scenes, spawn authority, collision gameplay, equipment truth, public identity, art approval, protocol data, or server state.

Phase 23 may place a hand-curated set of already-listed private prototype GLBs as renderer-only dressing over `arena-ebb-terminal` in `/sandbox.html`. These placements are visual inspection data only: they are not map metadata, spawn authority, collision truth, cover truth, line-of-sight truth, hitboxes, navigation, gameplay blockers, public identity, protocol data, or server state.

Phase 24 may combine the existing greybox renderer with the existing WebSocket fallback, client prediction/reconciliation, and remote interpolation in `/playtest.html`. This page is a local renderer playtest view only: it is not a gameplay HUD, collision truth, spawn authority, server map selection, combat presentation, private asset promotion, protocol data, or server state.

Phase 25 may add a local-only checklist, review command, and developer readouts around `/playtest.html` so testers can record connection, movement feel, prediction correction, remote placeholder, reconnect, desktop/mobile, and error observations. This review layer is not a gameplay HUD, analytics pipeline, matchmaking system, persistence layer, public playtest package, combat presentation, score system, or server authority.

Phase 26 may derive a server-readable greybox collision contract from the original arena metadata. It may stop or slide placeholder movement against static wall/cover blockers and world bounds, with server snapshots remaining truth. It must not turn renderer dressing or private prototype assets into gameplay collision, cover truth, line-of-sight truth, hit validation, spawn authority, navmesh, objectives, combat logic, or map selection.

Phase 28 may add a local first-person presentation shell to `/playtest.html` using simple original placeholder hands/equipment geometry. This shell is renderer-only and camera-attached. It may visually react to movement, blocker contact, and local fire-intent presentation, but it must not define weapon identity, ammo, reloads, damage, hit results, equipment truth, gameplay HUD, protocol data, collision, movement, snapshots, server fire validation, or server authority.

Phase 29 may add renderer-only fire-result presentation to `/playtest.html`. It may show abstract local fire-intent feedback, server-result-driven tracers, impact/reject markers, and remote target readability accents derived from existing `server.fire.result` data. It must not define weapon identity, ammo, reloads, client-owned hit results, client-owned damage, score, equipment truth, gameplay HUD, protocol data, server fire validation, movement, collision, snapshots, combat authority, or round authority.

Phase 30 may tune that fire-result presentation for readability in local browser playtests. It may adjust abstract effect lifetime, fade, tracer thickness, impact/reject marker readability, remote target accent visibility, and compact diagnostics. It must not define weapon identity, ammo, reloads, client-owned hit results, client-owned damage, score, equipment truth, gameplay HUD, protocol data, server fire validation, movement, collision, snapshots, combat authority, loadout authority, or round authority.

Phase 31 may add a local-only diagnostics hook for `/playtest.html` that aims at an already-rendered remote placeholder and sends the existing fire intent so accepted hit presentation can be repeatably inspected. This helper must stay smoke tooling only. It must not place entities, define weapon behavior, define gameplay UI, send client-owned hit results, send damage, change server fire validation, change protocol data, change movement/collision/snapshot authority, or change combat authority.

Phase 32 may polish `/playtest.html` remote-player presentation with an original low-detail renderer stand-in, facing marker, target-center reference, neutral materials, and hit accent response. It must consume existing remote interpolation presentation data only. It must not define copied character silhouettes, uniforms, faction identity, weapon identity, gameplay HUD, teams, client-owned remote positions, client-owned hit results, damage, protocol data, server snapshots, movement/collision authority, fire validation, or combat authority.

Phase 33 may present existing server-owned round and combat diagnostics in `/playtest.html` as compact renderer/playtest readouts. It may show phase, outcome, transition/reset cues, local health/alive state, local combat events, and remote hit cues derived from existing fire-result diagnostics. It must not define a gameplay HUD, scoreboard, economy UI, buy flow, teams, objectives, weapon identity, ammo, reloads, client-owned damage, client-owned health/death, client-owned round outcomes, protocol data, server snapshots, combat authority, round authority, movement/collision authority, or fire validation.

Phase 34 may automate the existing local two-client `/playtest.html` evidence path. The harness may drive movement keys, existing fire intent, the local accepted-hit diagnostic helper, reconnect, diagnostics page load, and sandbox page load. It must not define gameplay systems, add authority, change protocol/server behavior, upload telemetry, create accounts, write remote logs, start hosted services, add persistence, or treat browser evidence as WebTransport proof.

Phase 35 may tune existing local loop-feel values based on Phase 34 harness evidence: neutral placeholder slot spacing, server-owned reset hold readability, and renderer-only fire/combat cue durations. It must not add new gameplay systems, protocol data, spawn authority rules, combat rules, scoring, teams, objectives, matchmaking, persistence, gameplay HUD, weapon identity, or client-owned movement/fire/combat/round authority.

Phase 36 may add local-only network-condition simulation around the browser transport/harness path. It may simulate baseline, latency, jitter, and small high-rate message drop so the existing renderer/playtest loop can be observed under impairment. It must not define gameplay balance, lag compensation, matchmaking, hosted playtest services, analytics, scoring, economy, weapon behavior, protocol data, or client-owned movement/fire/combat/round authority.

Phase 37 opens a deliberate gameplay-meaning milestone with a server-authoritative kill/death stats feed. The server tallies kills and deaths only from combat death events it already owns, and broadcasts an authoritative `server.match.stats` message on each confirmed kill; the client mirrors it as a diagnostics-only field that clears on reconnect. It must not add client-owned kills, deaths, standings, scores, win/loss, teams, economy, objectives, weapon identity, ammo, reloads, persistence, matchmaking, ranked systems, server snapshots, combat authority, round authority, movement/collision authority, or fire validation. The only new protocol data is the reliable stats broadcast.

Phase 38 may present that existing `server.match.stats` feed in `/playtest.html` as a read-only kill/death scoreboard. It may order rows for readability and highlight the local session, but every kill and death value comes straight from the broadcast and the board clears on reconnect. It must not compute kills, deaths, scores, standings, or a winner on the client, and it must not add client-owned authority, teams, economy, buy flow, objectives, weapon identity, ammo, reloads, persistence, matchmaking, ranked systems, protocol data, server snapshots, combat authority, round authority, movement/collision authority, or fire validation.

Phase 39 makes weapons exist as server-authoritative state. The server keeps a per-session weapon record (identity, per-hit damage, fire cadence, magazine ammo, and reload state) sourced from an original weapon catalog of three originally-named hitscan profiles. Accepted fire is gated by that record (weapon cooldown, empty magazine, mid-reload), damage flows from the equipped weapon, reload progresses on server ticks, and the loadout selection that already existed now picks which catalog weapon a session carries. Each change is mirrored by a reliable `server.weapon.state` message that the client stores as diagnostics-only state and clears on reconnect. It must not add client-owned weapon identity, client-owned ammo/reload/damage, an ammo HUD or any gameplay HUD, weapon art/models/sounds, economy, buy flow, teams, objectives, persistence, matchmaking, ranked systems, server snapshots, round authority, movement/collision authority, or copied weapon names and identities.

Phase 40 makes players exist as a server-authoritative match roster. The server keeps a per-session player record (a neutral original callsign drawn from a fixed handle pool, the fixed match slot already assigned at hello, and the equipped weapon profile already owned by the weapon registry) and broadcasts a reliable `server.match.roster` message whenever the roster changes: on join, on leave, on an accepted loadout change, and on round reset. The client mirrors it as diagnostics-only state that clears on reconnect. Callsigns never cross the wire — the protocol carries a compact numeric handle id that resolves to a callsign only at the presentation/diagnostics layer. It must not add client-owned identity, avatars, skins, nameplates, persistent profiles, accounts, teams, parties, economy, objectives, a gameplay HUD, persistence, matchmaking, ranked systems, server snapshots, combat/round/movement authority, or copied callsigns and franchise identities.

Phase 41 may present that existing `server.match.roster` feed in `/playtest.html` as a read-only participant panel. It may order rows for readability (by slot index) and highlight the local session, but callsign, equipped weapon, and slot all come straight from the broadcast — the callsign is resolved from the numeric handle id and the weapon label from the shared catalog — and the panel clears on reconnect. It must not compute identity, standings, kills, deaths, scores, or a winner on the client, and it must not add client-owned authority, avatars, skins, nameplates, teams, economy, objectives, persistence, matchmaking, ranked systems, protocol data, server snapshots, combat authority, round authority, movement/collision authority, or fire validation.

Phase 42 may extend the existing local two-client `/playtest.html` harness to assert the server-owned roster end to end. The harness reads the diagnostics-only roster view state from each client, confirms both clients observe a two-entry roster with distinct handle-derived callsigns and the server-default weapon, confirms the two clients resolve different local callsigns, and confirms a disconnect shrinks the remaining client's observed roster. It prints the roster evidence in its human-review summary. It must not add authority, identity, or protocol data; it only reads existing view state. It must not upload telemetry, create accounts, write remote logs, start hosted services, add persistence, or treat browser evidence as WebTransport proof.

Phase 43 may label the read-only kill/death scoreboard with roster-resolved callsigns by joining the existing `server.match.stats` feed with the existing `server.match.roster` view state at the presentation layer. Kills and deaths still come straight from the stats broadcast, the callsign is resolved from the numeric handle id the roster already carries, and a scoreboard row for a session with no current roster entry falls back to a neutral `session <id>` label rather than fabricating identity. The board still declares no winner and clears on reconnect with the rest of the diagnostics-only view state. It must not compute kills, deaths, scores, standings, or a winner on the client, and it must not add client-owned identity, avatars, skins, nameplates, teams, economy, objectives, persistence, matchmaking, ranked systems, protocol data, server snapshots, combat authority, round authority, movement/collision authority, or fire validation.

Phase 44 may extend the local two-client `/playtest.html` harness to assert the roster-labelled scoreboard end to end. After the harness confirms a kill, it reads the diagnostics-only scoreboard view state and confirms the scored rows carry roster-resolved callsigns (with kills/deaths sourced from the broadcast), printing the evidence in its human-review summary. Because the scoreboard only populates on a confirmed kill, the harness reports a caveat honestly when no kill is scored, and a scored session with no roster entry surfaces as a neutral session label rather than a fabricated callsign. It must not add authority, identity, or protocol data; it only reads existing view state. It must not upload telemetry, create accounts, write remote logs, start hosted services, add persistence, or treat browser evidence as WebTransport proof.

Phase 45 may extend the validate-included browser-page smoke (`smoke:browser-page`) to assert the Phase 41 roster panel markup and the Phase 43 scoreboard markup (`#playtest-roster-summary`, `#playtest-roster-rows`, `#playtest-scoreboard-summary`, `#playtest-scoreboard-rows`) plus the playtest module's roster/scoreboard presentation wiring, so these read-only surfaces are guarded by the always-run smoke instead of only the manual harness. The smoke remains a static fetch-based check: it must not start a real browser, drive gameplay, change protocol/server behavior, upload telemetry, or treat its result as WebTransport proof.

Phase 46 may label the read-only round/combat presentation with the server-owned round winner's roster-resolved callsign. The round outcome and the winning session id come straight from `server.round.state` (already mirrored on the client); the presentation resolves that session id to its roster callsign, falls back to a neutral `session <id>` label when no roster entry is present, and shows no winner callsign when the server reports no winner session (timeout/none). The winner is never decided or computed on the client. It must not add client-owned win/loss, standings, scores, identity, avatars, skins, nameplates, teams, economy, objectives, persistence, matchmaking, ranked systems, protocol data, server snapshots, combat authority, round authority, movement/collision authority, or fire validation.

Phase 47 may extend the local two-client `/playtest.html` harness to assert the round-winner callsign end to end. After the harness observes an elimination, it reads the diagnostics-only round-winner view state and confirms it resolves to the surviving participant's roster callsign (the primary client is the killer, so the winner is its own callsign), printing the evidence in its human-review summary. A round with no winner observed, or a winner that does not resolve to the expected callsign, is reported as an honest caveat rather than a fabricated result. It must not add authority, identity, or protocol data; it only reads existing view state. It must not upload telemetry, create accounts, write remote logs, start hosted services, add persistence, or treat browser evidence as WebTransport proof.

Phase 48 may surface the server-owned match occupancy (connected slots of capacity) as a read-only readout in `/playtest.html`. The occupancy and capacity come straight from the existing server match-update message already mirrored on the client; the readout only formats the mirrored values, computes no occupancy of its own, and falls back to a neutral label before the first match update or on malformed values. It must not add client-owned slot assignment, capacity, matchmaking, lobby flow, persistence, teams, economy, protocol data, server snapshots, combat authority, round authority, movement/collision authority, or fire validation.

Phase 49 may extend the local two-client `/playtest.html` harness to assert the server-owned match occupancy end to end. With both clients connected the harness reads the diagnostics-only occupancy view state and confirms it reflects two connected slots of capacity; after the primary disconnects it confirms the remaining client's observed occupancy drops to one connected slot of capacity. The evidence is printed in the human-review summary, with an honest caveat when occupancy is never observed. It must not add authority, identity, or protocol data; it only reads existing view state. It must not upload telemetry, create accounts, write remote logs, start hosted services, add persistence, or treat browser evidence as WebTransport proof.

Phase 50 may author a new original arena, Drydock Span (`arena-drydock-span`), sized for the eight-player match capacity. It is a mirrored two-end greybox: north and south spawn clusters of four neutral spawns each face a contested midline, with cover symmetric about the midline so neither end holds a layout advantage. The arena must pass the existing map metadata contract (bounded counts, positive geometry inside world bounds, original naming) and must be authored as data only — this phase adds the arena module and its validation/structure tests but does not yet change the server collision arena, the slot starts, or the renderer default (that wiring is a later phase). All geometry, names, and labels must stay original with no copied shooter map names or layouts.

Phase 51 may make Drydock Span the default arena end to end. The server world-state derives its authoritative collision geometry from Drydock Span and positions the eight fixed slot starts on its mirrored spawns (a north cluster facing -z, a south cluster facing +z), each collision-clear by construction. The client mirrors the same arena: the client-prediction collision geometry, the playtest renderer greybox, and the playtest player camera all use Drydock Span so prediction stays in parity with the server and the playtest renders the new map. Ebb Terminal remains a valid, tested arena used by the renderer sandbox and the collision/camera helper tests. This phase only swaps which arena is the default and repositions the existing fixed slot starts; it must not add client-owned spawn selection, dynamic spawn assignment, matchmaking, teams, protocol data, server snapshots beyond the existing shape, combat/round authority changes, or hitscan occlusion.

Phase 62 adds a server-authoritative jump. The shared, tested vertical-motion step (gravity + jump velocity on the flat plane) is integrated only on the server each tick from a new `jump` input button; the resulting height travels in the existing snapshot `y` field, so every client (and remote players) see the arc. The client does not integrate gravity — it follows the authoritative height from snapshots — so there is no vertical prediction to diverge and no vertical jitter. Jump launches only from the ground (no double-jump) and collision stays 2D (a pure vertical arc that lands back on the plane). Space jumps. It must not add client-owned height/velocity, 3D collision, flight, or protocol shape changes (the `y` field already exists; only a button bit is added).

Competitive loop (original-named, staged): two sides — **Cops** (defenders) vs **Robbers** (attackers) — derived purely from the spawn slot the server already owns (lower-half slots are Cops, upper-half Robbers), so there is no new authority surface; joins are balanced across sides. Rounds resolve by side: a round ends when one side is fully eliminated (the survivors win) or, on timeout, the defending Cops hold. The winning side scores a round, and the match ends when a side reaches the round target (the existing `killTarget` wire field now counts round wins). The round/match result carries a representative session of the winning side; the client resolves it to the side's name for the banners ("Cops win the round/match"). Kills still feed the scoreboard but no longer decide the match. The weapon catalog expands to one of each class — sniper, revolver pistol, smg, shotgun, rifle — as server-owned data (selectable once the buy menu exists). Still to come, each its own phase: round economy (money), a buy menu, the plant/defuse objective ("charge"), and grenade + armor. No copied side/weapon/objective names.

Phase 64 adds an optional, self-hostable match registry and a main-menu server browser — a deliberate, opt-in step beyond the original local-only stance. A new `apps/registry` HTTP service holds a discovery list only: hosts publish a validated, bounded announcement (name, ws/wss join URL, map, build, players, capacity) treated as hostile input, keep it alive with heartbeats under a TTL, and unlist on shutdown. Publishing is opt-in per host (`host:match` advertises only when `BREACHLINE_REGISTRY_URL` is set), so a plain LAN match never broadcasts itself. The client's `/playtest.html` opens on a main-menu server browser that fetches the registry's build-filtered list, merges it with a local recent-servers history (localStorage), and connects on click or manual ws/link entry; the menu hides once connected and returns on disconnect. The registry must not own or relay gameplay truth — reported player counts are presentation hints, and once a client connects the game server in `apps/server` stays fully authoritative. It must not add accounts, analytics, persistence, or a new wire protocol for the live game; the registry is a separate discovery service. Actually exposing the registry on the public internet is a deployment step; the service is proven self-hostable locally.

Phase 63 adds a server-authoritative crouch, visible to all. A new `crouch` input button makes the server reduce the player's planar move speed (×0.5, shared `DEFAULT_PLAYER_CROUCH_SPEED_MULTIPLIER`) and mark a crouch stance that broadcasts to everyone: the stance rides a flag packed into the snapshot entity `active` field (`SNAPSHOT_ENTITY_FLAGS`), so the 28-byte entity stride and protocol shape are unchanged. The crouch stance lowers the shared eye point (`playerEyeHeightMeters`: 1.62 standing / 1.0 crouched) used by the hitscan source and target, the local camera, and the remote stand-in, so a crouched player ducks a level shot and crouched models squash. The client mirrors the same ×0.5 multiplier in prediction so crouch-walking stays in parity, but ownership is the server's — the client never decides its own speed, stance, or eye height. Hold Ctrl or C to crouch. It must not add a new packet kind, change the entity stride, let the client own the crouch flag/speed/eye height, or add stance-based gameplay beyond the slower speed and lowered hitbox.

Phase 60 may separate the developer diagnostics from the game view in `/playtest.html`. The dense diagnostics readout grid ships hidden by default so the playtest reads as a clean game (crosshair, HUD, scoreboard, roster, banners), and a controls-bar button plus the Backquote key toggle the readout back on for debugging. It is purely presentation/visibility: the diagnostics still read from the same view state, no readout is removed, and it adds no authority, protocol, or server change.

Phase 59 validates the first playable two-human match end to end. The local two-client harness runs its dev server with a frag limit of 1 so its single confirmed kill ends the match, then reads the diagnostics-only match-over view state and confirms the match banner names the winner (the primary, the killer), printing a `- match result:` line with an honest caveat when the match is not decided. The playtest review instructions document the real host-a-match flow (host:match, connect, aim/shoot/reload, death/respawn, round and match banners) as the first playable-match proof, with honest local-prototype caveats. It must not add authority, identity, or protocol data; it only reads existing view state and documents the local flow.

Phase 58 may add a local LAN host/join flow so a second human can connect. `npm run host:match` binds the existing transport-loop server to a LAN-reachable address (default `0.0.0.0`) and prints the shareable `/playtest.html` join URL for each LAN IPv4 address, computed by a tested pure helper from the host's own network interfaces. The transport-loop server config also forwards an optional match kill target so the frag limit is hostable. It stays strictly local: no accounts, no hosted services, no analytics, no persistence, no remote logging — the join URLs are plain LAN addresses to share only on a trusted network. It must not add matchmaking, public/internet hosting, or any external service.

Phase 57 introduces a server-owned match win condition for the playable match. The server tracks a kill-target frag limit and declares the first session to reach it the match winner, derived only from the kill tallies the match-stats feed already owns. A new reliable `server.match.result` message broadcasts the match-over flag, the winning session id, and the kill target; the client mirrors it as diagnostics-only state that clears on reconnect and renders a read-only "match over" banner naming the winner's roster-resolved callsign. The match outcome is never client-decided: the client only displays server-owned match state. It must not add client-owned win/loss, scores, standings, economy, teams, ranked systems, persistence, or matchmaking. (Gameplay freeze on match-over is intentionally out of scope for this phase; the decided result is surfaced read-only.)

Phase 56 may add a centered round-winner banner to the playable-match overlay, alongside the already-visible read-only scoreboard and roster. The banner is a tested `roundBanner` projection that shows only once the server has decided a round outcome (the ended/reset result window): it names the server-owned winner's roster-resolved callsign on an elimination, or reports the outcome on a timeout. The client never decides the winner or the outcome; it only formats server-owned round state. It must not add client-owned win/loss, standings, scores, protocol data, or server authority changes.

Phase 55 deliberately lifts the Phase 39 "no ammo HUD" guard to read-only display only. It may add a weapon and ammo readout to the playable-match HUD, sourced straight from the server-owned `server.weapon.state` already mirrored on the client: the weapon name resolves from the broadcast profile id via the shared catalog, and the ammo readout formats the mirrored magazine count and size (showing a reloading state while the server-owned reload is in flight). Both are tested pure formatters. It must not set ammo, reload state, weapon identity, or damage on the client, and it must not add an economy, buy flow, weapon switching authority, or protocol data.

Phase 54 deliberately narrows the long-standing "no gameplay HUD" guard to "read-only server-owned HUD only" for the first playable match. It may add a readable player HUD to `/playtest.html` showing health, alive/dead state, and a respawn countdown, all sourced straight from the server-owned combat/round state already mirrored on the client (the respawn countdown is a tested `respawnCueLabel` derived from the server-owned respawn-eligible tick versus the latest server tick, shown only while the local player is down). The HUD displays server truth only: it must not compute health, damage, death, respawn timing, or any win/loss on the client, and it must not add ammo to this panel (that is a separate phase), economy, teams, or protocol data.

Phase 53 may add a centered crosshair and a brief read-only hitmarker to `/playtest.html`. The crosshair is a static aim reference. The hitmarker is a short flash gated solely by a server-confirmed accepted hit (`server.fire.result` with hit), computed as a tested `hitmarkerActive` signal in the DOM-free fire-result presentation; it never reflects a client-decided hit and clears on its own after a short duration. It must not add client-owned hits, damage, ammo, or score, and it must not change protocol shape or server authority.

Phase 52 may finish the human input path in `/playtest.html` toward a playable match. Pointer-lock mouse-look aim and left-click-to-fire already exist; this phase adds a reload key (KeyR) and a `reload()` local diagnostics hook that send the existing `client.weapon.reload` intent. Reload stays intent-only: the server decides whether a reload starts and owns all ammo/reload truth. It must not add client-owned ammo, reload state, damage, or hit decisions, and it must not change protocol shape, server authority, or transport selection.

## Players

Players exist server-side as a per-session roster entry keyed by the authoritative session id. Each entry pairs a neutral original callsign (resolved from a fixed handle pool) with the session's fixed match slot and its server-owned equipped weapon profile. Identity is never client-owned: the server assigns the handle on join, frees it on leave, and is the only source of the roster.

The roster crosses the wire as `server.match.roster`, carrying numeric session id, handle id, weapon profile id, and slot index only. Callsigns, avatars, skins, and nameplates are not protocol data; the handle id resolves to a callsign at the diagnostics layer. The client mirrors the roster for local inspection and clears it on reconnect. `/playtest.html` also projects that diagnostics-only roster into a read-only participant panel (callsign, equipped weapon, slot, local-session highlight) that declares no authority and shows no standings.

Callsigns and any future player identity must stay original. Avoid real-world names and names associated with existing shooter franchises.

## Weapons

The initial combat model is planned around hitscan weapons. Weapon identities, names, sounds, models, and roles must be original.

Future weapon work must keep server authority over:

- Fire validation.
- Hit confirmation.
- Damage.
- Ammunition truth.
- Reload state.

Phase 15 introduces only a placeholder server-owned hitscan validation path. It proves that clients send intent while the server owns hit/no-hit results. It does not introduce weapon identities, damage, health, death, ammo, reloads, teams, scoring, lag compensation, map collision, or weapon presentation.

Phase 39 makes the above server authority concrete: an original three-weapon catalog gives each session a server-owned weapon with identity, per-hit damage, fire cadence, magazine ammo, and reload state. Fire is gated by that state and damage is sourced from it; the client only mirrors `server.weapon.state` for diagnostics. Weapon names, roles, and any future presentation stay original. No client-owned weapon truth, ammo HUD, weapon art, or economy is introduced.

## Round Flow

The intended round flow is simple:

1. Lobby or match warm start.
2. Round setup.
3. Active round.
4. Win/loss resolution.
5. Short reset into the next round.

Phase 18 introduces only a server-owned placeholder round-flow prototype. The server advances setup, active, ended, and reset phases; derives elimination or timeout outcomes from server-owned session/combat/tick state; gates movement, fire, loadout selection, respawn, and damage by phase; and resets server-owned placeholder movement, combat, and loadout state for another prototype round.

Phase 18 does not introduce teams, scoring, objectives, economy, buy flow, matchmaking, ranked systems, persistence, gameplay HUD, renderer round presentation, weapon presentation, art, lag compensation, or client-owned win/loss decisions.

During Phase 25 renderer-feel review, the default placeholder active round lasts long enough that normal local movement checks do not hit a timeout/reset loop. Focused round-flow tests may still configure short durations to prove setup, timeout, ended, reset, and next-round transitions.

Phase 19 developer telemetry may summarize round, combat, fire, loadout, prediction, interpolation, and connection diagnostics for local inspection. It is not a gameplay HUD, scoreboard, spectator view, analytics pipeline, or public playtest package.

No economy, ranked progression, cosmetics, or long-term inventory exists in the prototype yet.

## Health And Death

Health, damage, death, and respawn eligibility are server-owned. The client may display these states but must not determine them.

Phase 16 introduces only a placeholder server-owned combat-state layer. It applies placeholder damage from accepted server fire results, gates dead actors from movement/fire/target eligibility, and restores them through a minimal server-owned reset timer. It does not introduce scoring, teams, objectives, ammo, reloads, weapon identities, art, lag compensation, or gameplay HUD.

## Loadouts

Loadouts should be simple and server validated. Use placeholders until an original equipment direction is designed.

Phase 17 introduces only one generic placeholder profile id, `baseline`, plus server validation for accepted match sessions. The server owns accepted loadout state and may use it only as a placeholder combat default. Clients do not send damage, fire rate, ammo, reload state, health, score, target rules, combat outcomes, weapon identity, inventory contents, or round truth.

Phase 17 does not introduce weapon identities, ammo, reloads, economy, buy/loadout UI flow, inventory, teams, scoring, persistence, art, sounds, gameplay HUD, or renderer weapon presentation.

Phase 39 retires the single `baseline` placeholder: the selectable profile ids are now the three originally-named weapons in the server weapon catalog, and an accepted selection sets which catalog weapon the session carries. Loadout selection stays server-validated and phase-gated; it still carries no client-owned damage, ammo, reload, or weapon truth.

## Explicit Deferrals

Client prediction, remote interpolation, and server-authoritative greybox collision now exist as narrow prototypes (see [ROADMAP.md](../ROADMAP.md) for the milestones that introduced them). The following remain out of scope until their roadmap goal:

- Full movement and combat gameplay. The existing movement, hitscan, and combat-state prototypes stay deliberately narrow.
- Authored art, map selection, and navigation systems.
- Gameplay user interface / HUD.
- Matchmaking.
- Persistence.
- Cosmetics.
- Ranking.
