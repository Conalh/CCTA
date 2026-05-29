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
