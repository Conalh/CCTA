# Roadmap

The roadmap is intentionally milestone-based. Each goal should leave the project in a verifiable state before the next one begins.

## 20-Goal Plan

1. Project Spine - docs, guardrails, TypeScript workspace, and minimal shared/client/server placeholders.
2. Transport Loop Spike - transport-agnostic adapter, WebSocket fallback, ping/input placeholders, fixed authoritative tick loop, tick/pong/snapshot placeholders.
3. Local Browser Connection-State View - browser dev page displays connection state, ticks, snapshots, RTT, last message time, and message counts.
4. Shared Binary Protocol Draft - compact packet header, little-endian binary payloads, tested encode/decode, and binary WebSocket fallback transport.
5. Transport Diagnostics - browser diagnostics for RTT stats/history, observed tick/snapshot cadence, message counts/rates, uptime, and disconnect/error reporting.
6. Minimal authoritative match session with fixed player slots.
7. Input command pipeline with sequencing and server validation.
8. Placeholder world state snapshots without movement gameplay.
9. Basic first-person renderer sandbox with original greybox test space.
10. Server-authoritative player movement prototype.
11. Client prediction and reconciliation prototype.
12. Snapshot interpolation for remote players.
13. Original arena blockout pipeline and map metadata contract.
14. Renderer/player-camera integration over stable map metadata.
15. Hitscan validation prototype with server-owned hit results.
16. Health, death, respawn gating, and round reset prototype.
17. Simple original loadout contract and server validation.
18. Small-team round flow with win/loss conditions.
19. Developer telemetry and private playtest packaging notes.
20. Private prototype asset catalog and sandbox preview controls.

## Post-20 Tooling Milestones

21. Private asset audit and candidate tags.
22. Curated sandbox asset presets.
23. Renderer-only arena dressing plan.
24. Networked renderer playtest view.
25. Networked playtest feel review.
26. Server-authoritative greybox collision.
27. Collision feel stabilization and browser evidence.
28. Renderer-only first-person presentation shell.
29. Renderer-only fire-result presentation.
30. Fire-result presentation readability review.
31. Authoritative hit-result readability proof.
32. Renderer-only remote player presentation polish.
33. Renderer-only round/combat playtest presentation.
34. Local two-player playtest harness.
35. Local loop-feel review and tuning.
36. Local network-condition simulation.

## Gameplay Milestones

37. Server-authoritative kill/death stats feed (first gameplay-meaning slice).
38. Read-only in-renderer kill/death scoreboard.
39. Server-authoritative weapons (original catalog, ammo/reload/damage truth).
40. Server-authoritative player roster (stable identity, broadcast roster).
41. Read-only in-renderer participant panel.
42. Local two-client harness asserts the server-owned roster end to end.
43. Read-only scoreboard labelled with roster-resolved callsigns.
44. Local two-client harness asserts the roster-labelled scoreboard end to end.
45. Validate-included smoke guards the roster and scoreboard presentation surfaces.
46. Round outcome labelled with the server-owned winner's callsign.
47. Local two-client harness asserts the round-winner callsign end to end.
48. Read-only server-owned match occupancy readout in the playtest view.
49. Local two-client harness asserts the server-owned match occupancy end to end.
50. New original eight-player arena (Drydock Span) authored as validated data.
51. **Current: Drydock Span wired as the default arena end to end (server collision, slot starts, renderer, camera).**

## Phase 8 Status

Phase 8 is complete because:

- The shared binary snapshot packet includes tested world id, entity count, and bounded placeholder entity/session references.
- The authoritative server owns a deterministic world state shell.
- Connected match slots are represented as placeholder world entities only.
- Disconnects remove placeholder entities from later world snapshots.
- The browser dev view reports world id, world entity count, and last world snapshot tick.
- Existing match/session metadata, input acknowledgements, transport diagnostics, binary protocol behavior, and the fixed tick loop remain intact.
- WebTransport status remains honest.
- No gameplay has been implemented.
- Validation results are reported honestly.

## Phase 9 Status

Phase 9 is complete because:

- The browser serves a separate renderer sandbox page at `/sandbox.html`.
- The sandbox uses Three.js in `apps/client` to render an original greybox test space with a floor, walls, cover blocks, and scale references.
- The sandbox camera supports mouse-look style orientation and keyboard-driven client-only inspection movement.
- Camera sandbox movement does not touch server state, input validation, match state, binary protocol shape, or world snapshots.
- The existing diagnostics page and WebSocket fallback validation remain intact.
- Browser smoke verifies a visible nonblank 3D scene and no console errors.
- WebTransport status remains honest.
- No gameplay has been implemented.

## Phase 10 Status

Phase 10 is complete because:

- The shared binary snapshot packet includes tested per-entity `x`, `y`, `z`, and `yaw` fields.
- The authoritative server owns flat-plane placeholder movement state for accepted session entities.
- Movement advances only from accepted input commands on the fixed tick loop.
- Invalid, stale, duplicate, or dropped input does not move entities.
- Disconnects remove server-owned entities from later snapshots, and entity ids remain server-owned.
- The browser diagnostics page reports local assigned entity id, position, and yaw from server snapshots.
- The renderer sandbox remains client-only and does not read or drive server state.
- Existing protocol, match/session, input acknowledgement, transport diagnostics, and browser smokes remain intact.
- WebTransport status remains honest.
- No gameplay, prediction, interpolation, physics, combat, teams, matchmaking queue, persistence, or art pipeline has been implemented.

## Phase 11 Status

Phase 11 is complete because:

- The client owns a presentation-only prediction state module in `apps/client`.
- Prediction advances only from locally sent input command data and never sends or owns trusted positions.
- Reconciliation accepts authoritative local entity snapshots as truth, records correction magnitude, drops acknowledged inputs, and replays only pending local inputs.
- Browser diagnostics show predicted position, predicted yaw, correction magnitude, pending input count, replay count, and last reconciled snapshot tick.
- The server, binary protocol, authoritative movement, input validation, match/session slots, and renderer sandbox remain intact.
- Remote-player interpolation remains deferred to Phase 12.
- WebTransport status remains honest.
- No gameplay, physics, collision, combat, teams, matchmaking queue, lag compensation, persistence, or art pipeline has been implemented.

## Phase 12 Status

Phase 12 is complete because:

- The client owns a DOM-free remote interpolation model in `apps/client`.
- Remote interpolation accepts authoritative `server.snapshot` entity data, excludes the assigned local session, keeps bounded history, and samples presentation poses at a fixed interpolation delay.
- Remote pose interpolation covers `x`, `y`, `z`, and yaw with wrap-safe shortest-path handling.
- Malformed, stale, inactive, or unusable remote entity data is ignored without changing server truth.
- Browser diagnostics show remote entity count, buffered snapshot count, interpolation delay, sample tick/time, and one representative remote pose when a non-local entity exists.
- Local prediction/reconciliation remains separate from remote interpolation.
- The server runtime, binary protocol, authoritative movement, match/session slots, input validation, and renderer sandbox remain intact.
- WebTransport status remains honest.
- No renderer coupling, gameplay HUD, combat, teams, matchmaking queue, lag compensation, persistence, or art pipeline has been implemented.

## Phase 13 Status

Phase 13 is complete because:

- Shared code defines a pure structural arena map metadata contract and validation helper.
- The first blockout data module is an original greybox arena with map id, display name, revision, bounds, primitives, player scale references, neutral spawn markers, and labels.
- Validation covers required fields, finite positions/sizes, unique child ids, bounded counts, positive geometry, original id/name conventions, and spawn markers inside world bounds.
- `/sandbox.html` derives its greybox primitive layout from the map metadata and exposes loaded map id, revision, primitive count, and spawn count as diagnostics.
- The map contract does not drive server runtime, protocol packets, spawn authority, collision gameplay, matchmaking, combat, persistence, art, or UI flow.
- WebTransport status remains honest.

## Phase 14 Status

Phase 14 is complete because:

- The client owns a pure player-camera module in `apps/client`.
- The player camera derives browser presentation pose from local client presentation data plus configured eye height.
- The player camera uses validated map metadata for map id/revision, fallback spawn placement, metadata-valid reporting, and simple world-bounds clamping.
- The renderer sandbox applies the player camera pose to Three.js and exposes camera mode, eye height, pose, loaded map id, and metadata validation diagnostics.
- The camera remains client-only and does not send trusted positions or alter server runtime, protocol packets, movement authority, match slots, world snapshots, spawn authority, collision gameplay, or combat.
- WebTransport status remains honest.

## Phase 15 Status

Phase 15 is complete because:

- Shared binary protocol defines `client.fire` and `server.fire.result` messages with explicit packet kinds, little-endian payloads, and malformed packet rejection.
- Fire intent carries fire sequence, client time/tick metadata, yaw, and pitch only. It does not carry client-owned position, target id, hit result, damage, health, score, ammo, or weapon identity.
- The server validates fire only through accepted runtime sessions with match assignment and active server-owned world entities.
- The server computes ray origin from authoritative world entity state and uses aim yaw/pitch only as intent.
- Placeholder hit volumes are derived from the current server-owned world snapshot, excluding the firing entity and inactive entities.
- Fire results include sequence, server tick, accepted/rejected state, hit/miss state, optional target entity/session ids, distance, and reject reason.
- Browser diagnostics display fire send/result state without weapon presentation or gameplay HUD.
- Existing diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, input acknowledgements, server movement, prediction diagnostics, remote interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.
- No damage, health, death, ammo, reloads, weapon identities, teams, objectives, matchmaking, lag compensation, persistence, art, or gameplay HUD has been implemented.

## Phase 16 Status

Phase 16 is complete because:

- The server owns an in-memory combat state for accepted session entities: health, alive/dead state, death tick, respawn eligibility tick, and reset events.
- Placeholder damage is applied only from accepted server-owned fire results.
- Clients never send damage, health, death, target confirmation, score, or respawn truth.
- The shared binary protocol includes a `server.combat.state` diagnostic message with tested round trips and malformed packet rejection.
- Dead entities stop moving, cannot fire, and are removed from server-owned hitscan target eligibility until the server respawn reset restores them.
- Browser diagnostics display local combat state and last combat event without renderer coupling or gameplay HUD.
- Existing fire validation authority, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, input acknowledgements, server movement, prediction diagnostics, remote interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.
- No weapon identities, ammo, reloads, teams, objectives, matchmaking, scoring, persistence, art, lag compensation, or gameplay HUD has been implemented.

## Phase 17 Status

Phase 17 is complete because:

- Shared binary protocol defines `client.loadout.select` and `server.loadout.state` messages with tested round trips and malformed packet rejection.
- The only selectable shared profile is an original generic placeholder id, `baseline`.
- The server validates loadout selection only for accepted sessions with match assignment.
- Invalid profile ids, stale or duplicate selections, unknown sessions, and attempts before protocol acceptance produce explicit diagnostic rejection reasons.
- The server owns accepted loadout state and uses it only for a placeholder combat default.
- Clients do not send damage, fire rate, ammo, health, score, target rules, combat outcomes, weapon identity, or inventory truth.
- Browser diagnostics display loadout profile, status, reject reason, and sequence without gameplay HUD or renderer weapon presentation.
- Existing combat authority, fire validation authority, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, input acknowledgements, server movement, prediction diagnostics, remote interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.
- No weapon identities, ammo, reloads, economy, buy flow, inventory, teams, objectives, matchmaking, scoring, persistence, art, lag compensation, or gameplay HUD has been implemented.

## Phase 18 Status

Phase 18 is complete because:

- Shared binary protocol defines `server.round.state` diagnostics with tested round trips and malformed packet rejection.
- The server owns a narrow round state machine for setup, active, ended, and reset phases.
- Elimination and timeout outcomes are computed from server-owned combat/session state; clients cannot send round outcomes.
- Movement, fire, loadout selection, respawn, damage application, and reset behavior are gated by the server-owned phase.
- The reset path restores server-owned placeholder movement, combat, and loadout state for another prototype round.
- Browser diagnostics display round id, phase, outcome, winner session, phase timing, reset timing, last event, and server tick without gameplay HUD or renderer coupling.
- Existing loadout, combat, fire validation, movement, prediction, remote interpolation, map metadata, renderer sandbox, and transport tests remain intact.
- WebTransport status remains honest.
- No economy, buy flow, team scoring, objectives, matchmaking, ranked systems, persistence, weapon presentation, art, lag compensation, or gameplay HUD has been implemented.

## Phase 19 Status

Phase 19 is complete because:

- The browser diagnostics page includes a developer telemetry summary for connection, tick/snapshot cadence, prediction, remote interpolation, loadout, fire, combat, round, and error state.
- Telemetry is derived from existing client diagnostics state and does not change server truth, simulation timing, combat outcomes, round outcomes, protocol authority, or transport selection.
- Private playtest notes describe only local development handoff steps, browser caveats, the proven WebSocket fallback path, and tester observations to record.
- The playtest notes and script do not add accounts, persistence, hosted deployment, matchmaking, analytics services, crash reporting SaaS, remote logging, or external telemetry upload.
- Existing round flow, loadout, combat, fire validation, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, input acknowledgements, server movement, prediction diagnostics, remote interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.
- No economy, buy flow, team scoring, objectives, matchmaking, ranked systems, persistence, weapon presentation, art, lag compensation, or gameplay HUD has been implemented.

## Phase 20 Status

Phase 20 is complete because:

- The client owns a renderer-only private prototype asset manifest with ids, labels, categories, local URLs, fit sizing, and preview positions.
- Manifest validation rejects network URLs, server paths, duplicate ids, non-private asset paths, and non-finite preview placement or scale values.
- `/sandbox.html` exposes category controls for `arena-kit`, `industrial-dressing`, `cover-training-props`, `characters-firstperson`, and `equipment-placeholder`.
- Optional private GLB loading is resilient: missing or bad local assets increment failed counts and do not crash the sandbox.
- `/sandbox.html` remains nonblank even when private assets are unavailable because the original greybox scene remains the baseline renderer proof.
- The private asset folder remains ignored and no private GLB files are moved or committed.
- Existing diagnostics, renderer sandbox, player camera, map metadata, prediction, remote interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport status remains honest.
- No gameplay authority, protocol shape, server simulation, combat, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, or copied shooter presentation has been implemented.

## Phase 21 Status

Phase 21 is complete because:

- `npm run audit:private-assets` scans ignored private prototype GLBs and writes ignored local output to `local-assets/private-asset-audit.json`.
- The audit records relative path, category, file size, mesh/material/texture/image/animation/accessor/primitive/node/scene counts, warning codes, and candidate tags without loading private assets into gameplay.
- The source-controlled candidate tag contract defines `preview-ok`, `needs-scale-check`, `too-heavy-for-browser`, `character-reference-only`, `prop-reference-only`, and `replace-before-public`.
- Documentation explains how to run the audit and how to interpret candidate tags.
- The sandbox manifest remains hand-curated and does not auto-load every private asset.
- `local-assets/` and `apps/client/public/assets/private-prototype/` remain ignored.
- Existing diagnostics, renderer sandbox, player camera, map metadata, prediction, remote interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport status remains honest.
- No gameplay authority, protocol shape, server simulation, combat, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, or copied shooter presentation has been implemented.

## Phase 22 Status

Phase 22 is complete because:

- The client owns a renderer-only curated preset contract for sandbox private asset previews.
- The preset set includes `scale-check`, `arena-dressing`, and `equipment-check`.
- Preset validation covers unique preset ids, manifest asset references, private asset paths, no network URLs, no server paths, and copied shooter naming guards.
- `/sandbox.html` preserves category controls and adds separate preset controls.
- Preset loading reuses the existing optional private asset loader, so missing local assets increment failed counts instead of crashing the sandbox.
- The sandbox manifest remains hand-curated and does not auto-load every private asset.
- The private asset folder remains ignored and no private GLB files are moved or committed.
- Existing diagnostics, renderer sandbox, player camera, map metadata, prediction, remote interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport status remains honest.
- No gameplay authority, protocol shape, server simulation, combat, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, or copied shooter presentation has been implemented.

## Phase 23 Status

Phase 23 is complete because:

- The client owns a renderer-only arena dressing plan contract/helper in `apps/client`.
- The first dressing plan targets `arena-ebb-terminal` and uses only existing source-controlled private asset manifest ids.
- Dressing validation covers unique placement ids, manifest asset references, finite positions/yaw/fit size, map-bounds placement, no network URLs, no server paths, and copied shooter naming guards.
- `/sandbox.html` keeps category and preset controls while adding a separate show/hide arena dressing toggle.
- Dressing loading remains optional and resilient: missing local private assets increment failed counts instead of crashing the sandbox.
- The dressing plan stays out of shared map metadata, server world state, protocol packets, spawn authority, collision truth, line-of-sight truth, and gameplay cover logic.
- The sandbox manifest remains hand-curated and does not auto-load every private asset.
- The private asset folder and local audit output remain ignored and no private GLB files are moved or committed.
- Existing diagnostics, renderer, map metadata, player camera, prediction, remote interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport status remains honest.
- No gameplay authority, protocol shape, server simulation, combat, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, or copied shooter presentation has been implemented.

## Phase 24 Status

Phase 24 is complete because:

- `/playtest.html` is served as a separate browser page for local networked renderer inspection.
- The page connects through the existing browser WebSocket fallback adapter behind `MessageTransport`.
- The page sends the existing placeholder input command envelope and loadout selection needed for the current server-owned round flow.
- The local first-person camera uses client prediction/reconciliation presentation data while server snapshots remain truth.
- Remote players render only as simple original placeholder markers derived from the existing remote interpolation state.
- The existing greybox arena renders without requiring private assets, and missing private assets do not crash the playtest view.
- Compact readouts show connection state, local entity id, server position, predicted position, correction, remote count, round phase, render health, and errors.
- `/sandbox.html` and the diagnostics page remain available and unchanged in role.
- The private asset folder and local audit output remain ignored and no private GLB files are moved or committed.
- Existing diagnostics, renderer, map, prediction, interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport status remains honest.
- No protocol shape, server authority, combat, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, external asset pipeline, or copied shooter presentation has been implemented.

## Phase 25 Status

Phase 25 is complete because:

- `/playtest.html` exposes local-only review readouts for frame health, prediction correction current/max, remote count, reconnect count, and last error.
- A focused checklist document defines connection, local movement feel, prediction correction behavior, remote placeholder visibility, reconnect behavior, desktop/mobile usability, and known limitation checks.
- `npm run playtest:review` prints local playtest instructions and expected evidence without uploading telemetry or writing remote logs.
- Manual playtest notes remain under ignored `local-assets/playtest-review/` when used.
- Existing diagnostics, renderer, map, prediction, interpolation, movement, fire, combat, loadout, round, protocol, private asset audit, sandbox preset, dressing, and transport tests remain intact.
- WebTransport status remains honest.
- No protocol shape, server authority, gameplay systems, combat presentation, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, external asset pipeline, analytics, or copied shooter presentation has been implemented.

## Phase 26 Status

Phase 26 is complete because:

- Shared code owns the original arena metadata and a small greybox collision contract for world bounds plus static wall/cover blockers.
- Collision geometry is derived from original map/blockout primitives; floors and private prototype assets do not become gameplay blockers.
- Server movement applies shared collision and publishes authoritative stopped or sliding positions in snapshots.
- Client prediction may use the same shared collision helper only for local presentation feel, while reconciliation still accepts server snapshots as truth.
- Focused collision-feel checks cover repeated blocker stops, face slides without far-edge snapping, diagonal corner pressure, world bounds, spawn clearance, and client-prediction parity.
- Existing protocol packets, combat, fire validation, loadout, round flow, private asset policy, renderer sandbox, and WebSocket fallback transport remain unchanged.
- WebTransport status remains honest.
- No weapon art, gameplay HUD, private asset gameplay use, matchmaking, persistence, hosted deployment, protocol shape change, or copied shooter presentation has been implemented.

## Phase 28 Status

Phase 28 is complete because:

- `/playtest.html` owns a renderer-only first-person presentation shell in `apps/client`.
- The shell uses simple original placeholder geometry for local hands/equipment and is attached to the Three.js camera.
- The shell presentation helper is DOM-free and tested for camera-local transforms, bounded part counts, original placeholder ids, motion/fire presentation states, and absence of authority fields.
- Existing `client.fire` intent and `server.fire.result` authority stay unchanged; the playtest page may send fire intent, but it does not send damage, hit results, target truth, ammo, reload, weapon identity, score, or authoritative position.
- The shell does not affect server movement, collision, snapshots, fire validation, combat, round state, protocol packets, or transport selection.
- Compact playtest diagnostics report shell status and fire intent sequence for local inspection only.
- Existing diagnostics, renderer sandbox, collision, prediction, interpolation, movement, fire, combat, loadout, round, protocol, private asset audit, sandbox preset, dressing, and transport tests remain intact.
- WebTransport status remains honest.
- No gameplay HUD, weapon gameplay, ammo/reload loop, weapon identity, teams, objectives, matchmaking, persistence, hosted deployment, art pipeline, public asset redistribution, or copied shooter presentation has been implemented.

## Phase 29 Status

Phase 29 is complete because:

- `/playtest.html` owns renderer-only fire-result presentation in `apps/client`.
- Local fire intent gets abstract camera-space feedback without defining a weapon, ammo, reload, damage, score, or client-owned hit result.
- Existing server-owned `server.fire.result` diagnostics drive short-lived abstract tracer, impact, reject, and remote-target readability visuals.
- The fire-result presentation helper is DOM-free and tested for local intent effects, accepted hit/miss visualization, rejected result visualization, bounded active effects, expiry, stale result rejection, and malformed data handling.
- Compact playtest diagnostics report the visualized fire sequence, result state, hit/miss/rejected state, and active tracer count.
- Existing `client.fire` and `server.fire.result` protocol shape, server fire validation, combat authority, movement, collision, snapshots, round state, and transport selection remain unchanged.
- WebTransport status remains honest.
- No weapon gameplay, ammo, reloads, weapon identities, client-owned hits, client-owned damage, teams, objectives, matchmaking, persistence, gameplay HUD, hosted deployment, public asset redistribution, art pipeline, or copied shooter presentation has been implemented.

## Phase 30 Status

Phase 30 is complete because:

- `/playtest.html` keeps fire-result presentation renderer-only, abstract, and driven by existing `server.fire.result` diagnostics.
- Local fire intent, accepted miss, accepted hit, rejected fire, tracers, impact markers, and remote target accent readability are tuned for local playtest observation.
- Fire-result effect lifetimes are long enough to inspect during desktop and mobile browser smokes, then clear cleanly.
- Compact playtest diagnostics include visualized sequence, hit/result state, active tracer count, and expired effect count.
- DOM-free tests cover timing/readability, expiry, stale/malformed result handling, and target accent clearing.
- Existing `client.fire` and `server.fire.result` protocol shape, server fire validation, combat authority, movement, collision, snapshots, round state, loadout authority, and transport selection remain unchanged.
- WebTransport status remains honest.
- No weapon gameplay, ammo, reloads, weapon identities, client-owned hits, client-owned damage, teams, objectives, matchmaking, persistence, gameplay HUD, hosted deployment, public asset redistribution, art pipeline, or copied shooter presentation has been implemented.

## Phase 31 Status

Phase 31 is complete because:

- `/playtest.html` exposes a local-only diagnostics hook for deterministic accepted-hit smoke testing.
- The hook computes a presentation aim from the local camera to an existing remote placeholder and sends the existing `client.fire` intent.
- Accepted hit presentation remains driven only by server-owned `server.fire.result` messages.
- Accepted miss, accepted hit, remote target accent, transient expiry, and reconnect cleanup stay renderer-only and testable.
- Focused tests cover deterministic remote aim derivation and clean accepted hit/miss effect expiry.
- Existing protocol shape, server hit validation, damage, combat authority, movement authority, collision authority, snapshots, loadout authority, round authority, and transport selection remain unchanged.
- WebTransport status remains honest.
- No weapon gameplay, ammo, reloads, weapon identities, client-owned hits, client-owned damage, teams, objectives, matchmaking, persistence, gameplay HUD, hosted deployment, public asset redistribution, art pipeline, or copied shooter presentation has been implemented.

## Phase 32 Status

Phase 32 is complete because:

- `/playtest.html` renders remote players through a renderer-only presentation helper in `apps/client`.
- Remote presentation consumes existing remote interpolation placeholders only.
- The remote stand-in has a readable abstract body height, facing marker, target-center reference, neutral material colors, and subtle hit accent driven by existing fire-result presentation state.
- Compact diagnostics report remote model count, highlighted target id, and representative interpolation source tick.
- DOM-free tests cover remote presentation metadata, hit accent state, source tick reporting, and malformed placeholder rejection.
- Existing protocol shape, server runtime, snapshots, movement/collision authority, fire validation, combat/damage, loadouts, round authority, and transport selection remain unchanged.
- WebTransport status remains honest.
- No copied character silhouettes, uniforms, faction identity, weapon identity, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, art pipeline, or copied shooter presentation has been implemented.

## Phase 33 Status

Phase 33 is complete because:

- `/playtest.html` formats existing server-owned round and combat diagnostics through a renderer-only presentation helper in `apps/client`.
- Compact readouts show round phase, outcome, transition cue, reset cue, local health/alive state, local combat event/cue, and remote hit cue derived from existing fire-result diagnostics.
- DOM-free tests cover phase/outcome formatting, transition expiry, local death/reset cues, remote hit cue derivation, and malformed value handling.
- The presentation does not define a gameplay HUD, scoreboard, economy, buy flow, teams, objectives, weapon identity, ammo, reloads, or client-owned win/loss/damage/health/death.
- Existing protocol shape, server runtime, snapshots, movement/collision authority, fire validation, combat/damage authority, loadouts, round authority, and transport selection remain unchanged.
- WebTransport status remains honest.

## Phase 34 Status

Phase 34 is complete because:

- `npm run playtest:harness` runs a local-only automated browser harness for `/playtest.html`.
- The harness starts `npm run dev` when the local dev server is not already reachable, or connects to the existing local server when it is.
- The harness opens two local `/playtest.html` clients over the existing WebSocket fallback path and verifies two accepted clients, nonblank primary render, remote model presence, movement/collision blocker and slide evidence, accepted miss visual, accepted hit visual, combat death plus round ended/reset evidence when observed, reconnect transient cleanup, diagnostics page load, `/sandbox.html` load, and zero browser console/page errors.
- The harness prints a concise human-review evidence summary and does not upload analytics, create accounts, write remote logs, start hosted services, add persistence, or change server authority.
- Focused tests cover the harness summary and Playwright result parsing helpers.
- Existing protocol shape, server runtime, snapshots, movement/collision authority, fire validation, combat/damage authority, loadouts, round authority, and transport selection remain unchanged.
- WebTransport status remains honest.

## Phase 35 Status

Phase 35 is complete because:

- The Phase 34 harness evidence is used as the baseline for local two-client loop-feel tuning.
- Server-owned placeholder slot starts give the second player a more readable neutral separation while preserving the first slot's blocker/collision proof path.
- The default round reset hold is long enough for local elimination/reset review without adding new round rules or client authority.
- Renderer-only fire-result and round/combat cue lifetimes are slightly longer for local observation.
- The harness summary reports reset cue detail when available.
- Existing protocol shape, transport selection, snapshots, movement/collision authority, fire validation, combat/damage authority, loadouts, and round authority remain intact.
- WebTransport status remains honest.

## Phase 36 Status

Phase 36 is current when validation passes because:

- `/playtest.html` can opt into local-only network simulation through a browser-side `MessageTransport` wrapper.
- Simulation profiles cover baseline/no delay, moderate latency, jitter, and small high-rate message drop.
- The drop profile is scoped to superseding/high-rate messages such as input, tick, snapshot, ping, and pong; protocol accept, fire result, combat, and round authority messages are not intentionally dropped.
- `npm run playtest:harness:network` runs the local two-client browser evidence path across the network profiles.
- Harness output reports profile settings, prediction correction max, remote interpolation status, fire result observation, round reset observation, and console errors.
- Existing protocol shape, transport selection, server runtime, snapshots, movement/collision authority, fire validation, combat/damage authority, loadouts, and round authority remain intact.
- WebTransport status remains honest.

## Phase 37 Status

Phase 37 is current when validation passes because:

- The proof spine is reviewed as fully server-authoritative, so the deliberate next step is match-level meaning rather than another presentation/diagnostics lane. This phase opens the gameplay milestone with the smallest honest slice: a server-owned kill/death stat feed.
- The server tallies kills and deaths only from combat death events it already owns. A confirmed kill credits the killer and charges the victim a death; a self-inflicted or untracked-killer death charges only the victim death and never resurrects a tally for an unknown session.
- The authoritative `server.match.stats` message reports a server tick, an entry count, and an insertion-ordered per-session `{ sessionId, kills, deaths }` line, encoded as a reliable control message in the shared binary protocol (uint16 count plus reserved pad plus fixed 12-byte records, mirroring the snapshot layout and its malformed-packet guards).
- Stats are broadcast only when a kill is confirmed, never on join or leave, so existing message-kind ordering remains intact.
- The client treats match stats as a diagnostics-only view-state field; it is reset on reconnect and adds no client-owned authority, no gameplay HUD, and no win/loss rule.
- No new combat, damage, health, death, respawn, round, movement, collision, loadout, or transport behavior is introduced; this phase derives meaning purely from events the server already produces.
- Existing protocol shape, transport selection, server runtime, snapshots, movement/collision authority, fire validation, combat/damage authority, loadouts, and round authority remain intact.
- WebTransport status remains honest.

## Phase 38 Status

Phase 38 is current when validation passes because:

- `/playtest.html` presents the authoritative `server.match.stats` feed as a read-only kill/death scoreboard panel built by a pure presentation projection.
- The scoreboard mirrors the broadcast exactly: every kill and death value comes straight from `server.match.stats`, and the client never infers tallies from local fire input or predicted state.
- Rows are ordered for readability (kills, then fewest deaths, then session id) and the local session is highlighted, but ordering is presentation-only and the board declares no winner.
- The board is a projection of the diagnostics-only match-stats view state, so it clears automatically on reconnect with the rest of the per-connection diagnostics.
- Malformed or partial stat entries are dropped without poisoning the board, consistent with the prototype's hostile-client posture.
- Existing protocol shape, transport selection, server runtime, snapshots, movement/collision authority, fire validation, combat/damage authority, loadouts, round authority, and the match-stats feed remain intact.
- WebTransport status remains honest.

## Phase 39 Status

Phase 39 is current when validation passes because:

- Weapons now exist as server-authoritative per-session state. An original three-weapon catalog (originally-named hitscan profiles) gives each session a weapon record carrying identity, per-hit damage, fire-interval cadence in ticks, magazine ammo, and reload duration, all validated as bounded positive integers with non-empty original names.
- The server weapon-state module owns assign, switch, fire, reload, and reset. Accepted fire is gated by weapon cooldown, empty magazine, and mid-reload, and combat damage is sourced from the equipped weapon instead of a fixed placeholder constant.
- The existing loadout selection now chooses which catalog weapon a session carries; the single `baseline` placeholder is retired in favor of the named profiles, and selection stays server-validated and phase-gated.
- Reload is server-owned: a client may request a reload, but the server decides whether it starts, advances it on its own ticks, and refills the magazine only through server-owned reload, switch, or round reset. The client never sets ammo, reload state, or damage.
- A reliable `server.weapon.state` message reports each change. The client mirrors it as diagnostics-only view state that clears on reconnect and adds no ammo HUD, no client-owned weapon truth, and no client-owned damage/ammo/reload.
- Existing protocol shape, transport selection, server runtime, snapshots, movement/collision authority, fire validation, combat/damage authority, round authority, loadout authority, and the match-stats feed and scoreboard remain intact.
- WebTransport status remains honest.

## Transport Decision

Phase 2 keeps WebTransport as the intended browser transport, but validates the runtime loop through a WebSocket fallback. The blocker is local WebTransport server support: this stack does not yet provide an HTTP/3 plus TLS server endpoint for browser WebTransport.

## Phase 40 Status

Phase 40 is current when validation passes because:

- Players now exist as a server-authoritative match roster. A shared player-handle pool supplies eight original neutral callsigns (`Vesper`, `Quill`, `Tundra`, `Marlow`, `Ember`, `Cairn`, `Drift`, `Sable`) keyed by a compact numeric handle id, each validated as a positive uint16 handle with a non-empty original callsign.
- The server owns a player registry keyed by session id. Each accepted session is assigned the lowest free handle on join, carries its server-owned equipped weapon profile and fixed match slot, and frees its handle on leave; the registry never trusts client-reported identity.
- An authoritative `server.match.roster` message reports the current participants (numeric session id, handle id, weapon profile id, slot index) and is broadcast on join, leave, accepted loadout change, and round reset. It reuses the proven variable-length control-message layout (uint16 count plus reserved pad plus fixed 12-byte records) with the same malformed-packet guards.
- Callsigns never cross the wire: the protocol carries only the numeric handle id, which resolves to a callsign at the client diagnostics/presentation layer. The client mirrors the roster as diagnostics-only view state that clears on reconnect.
- A round reset returns every session to the default weapon and rebroadcasts the roster, keeping the mirrored client diagnostics consistent with server truth.
- Existing round flow, loadout, weapon authority, combat, fire validation, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, input acknowledgements, server movement, prediction diagnostics, remote interpolation diagnostics, match-stats authority, the read-only scoreboard, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 41 Status

Phase 41 is current when validation passes because:

- `/playtest.html` presents the authoritative `server.match.roster` feed as a read-only participant panel built by a pure presentation projection, mirroring the Phase 38 scoreboard pattern.
- The panel mirrors the broadcast exactly: callsign, equipped weapon, and slot all come straight from the roster. The callsign is resolved from the numeric handle id at the presentation layer, the weapon label is resolved from the shared catalog, and the client never invents participants or identity.
- Rows are ordered for readability (by slot index, then session id) and the local session is highlighted, but the panel declares no authority: it shows no kills, deaths, score, standings, or winner.
- The panel is a projection of the diagnostics-only roster view state, so it clears automatically on reconnect with the rest of the per-connection diagnostics.
- Malformed or partial roster entries are dropped without poisoning the panel (non-positive session ids, unknown handle ids, and non-integer slots are discarded), and an unselected weapon profile renders as a neutral pending label rather than fabricating a weapon.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed and scoreboard, the roster feed, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 42 Status

Phase 42 is current when validation passes because:

- `npm run playtest:harness` now asserts the server-owned roster end to end, so roster identity is proven across a real two-client connection rather than only in unit projection.
- The harness opens two `/playtest.html` clients and reads the diagnostics-only roster view state from each. It waits for both clients to observe a two-entry roster before sampling.
- Each client observes both participants with distinct handle-derived callsigns, the server-default weapon, and stable slot ordering. The harness records each client's local callsign and confirms the two clients resolve different local callsigns from the numeric handle id.
- A primary disconnect is reflected as a one-entry roster on the remaining peer client, read from the same diagnostics-only view state and captured during the existing disconnect/reconnect window.
- The harness prints the roster evidence in its human-review summary (`- roster:` line) without uploading analytics, writing remote logs, or starting hosted services. A focused test covers both the healthy roster summary and an incomplete-roster fail line.
- No client-invented identity is introduced: callsigns are still resolved at the presentation layer from the numeric handle id the server already broadcasts, and the harness only reads existing view state.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed and scoreboard, the roster feed and participant panel, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 43 Status

Phase 43 is current when validation passes because:

- `/playtest.html` labels the read-only kill/death scoreboard with roster-resolved callsigns by joining the existing `server.match.stats` feed with the existing `server.match.roster` view state at the presentation layer.
- The join is presentation-only: kills and deaths still come straight from `server.match.stats`, the callsign resolves from the numeric handle id the roster already carries, and the client never infers tallies or invents participants.
- A scoreboard row for a session with no current roster entry falls back to a neutral `session <id>` label rather than fabricating identity, consistent with the prototype's hostile-client posture. Malformed roster entries (non-positive session ids, unknown handle ids) are dropped during the join and leave the affected row on the neutral fallback.
- The scoreboard still declares no winner, and the labelled board clears on reconnect with the rest of the diagnostics-only view state. The resolved callsign is also exposed on the diagnostics view state for review.
- The change is backward compatible: with no roster present the scoreboard keeps its prior neutral session labels, so the existing scoreboard projection and tests are unchanged in spirit.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed, the roster feed and participant panel, the two-client harness roster assertion, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 44 Status

Phase 44 is current when validation passes because:

- `npm run playtest:harness` now asserts the roster-labelled scoreboard end to end: after the harness confirms a kill, it reads the diagnostics-only scoreboard view state and confirms the scored rows carry roster-resolved callsigns rather than bare session ids.
- Kills and deaths in the evidence are sourced from the broadcast; the harness only reads existing view state and adds no authority, identity, or protocol data.
- The harness prints a `- scoreboard callsigns:` line in its human-review summary. Because the scoreboard only populates on a confirmed kill, the harness reports a caveat honestly when no kill is scored, and a scored session with no roster entry surfaces as a neutral session label rather than a fabricated callsign.
- Focused tests cover the healthy scoreboard-callsign summary, the no-kill caveat, and the unresolved-row caveat.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed and roster-labelled scoreboard, the roster feed and participant panel, the two-client harness roster assertion, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 45 Status

Phase 45 is current when validation passes because:

- The validate-included browser-page smoke (`smoke:browser-page`) now asserts the Phase 41 roster panel markup and the Phase 43 scoreboard markup (`#playtest-roster-summary`, `#playtest-roster-rows`, `#playtest-scoreboard-summary`, `#playtest-scoreboard-rows`) so these read-only surfaces are guarded by the always-run smoke rather than only by the manual harness.
- The smoke also asserts the served playtest module wires the roster and scoreboard presentations (`createRosterPresentation`, `createScoreboardPresentation`), catching a silent loss of those projections.
- The smoke remains a static fetch-based check: it starts no real browser, drives no gameplay, and asserts no server authority. It still passes for the diagnostics, sandbox, and playtest pages with the existing asserted ids intact.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed and roster-labelled scoreboard, the roster feed and participant panel, the two-client harness assertions, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 46 Status

Phase 46 is current when validation passes because:

- `/playtest.html` labels the read-only round/combat presentation with the server-owned round winner's roster-resolved callsign, so an elimination outcome reads as "who won" rather than only "what happened".
- The label is presentation-only: the outcome and winning session id come straight from `server.round.state` (already mirrored on the client), the callsign resolves from the roster's numeric handle id, and the client never decides or computes a winner.
- A winner session with no current roster entry falls back to a neutral `session <id>` label rather than fabricating identity, and a round with no winner session reported (timeout/none) shows no winner callsign.
- The winner readout (`#playtest-round-winner`) is exposed on the diagnostics view state, guarded by the browser-page smoke, and clears on reconnect with the rest of the diagnostics-only view state. Focused tests cover the resolved, neutral-fallback, and no-winner cases.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed and roster-labelled scoreboard, the roster feed and participant panel, the two-client harness assertions, the browser-page smoke, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 47 Status

Phase 47 is current when validation passes because:

- `npm run playtest:harness` now asserts the round-winner callsign end to end: after the harness observes an elimination, it reads the diagnostics-only round-winner view state and confirms it resolves to the surviving participant's roster callsign (the primary client is the killer, so the winner is its own callsign), sourced from the server-owned round state.
- The harness prints a `- round winner:` line in its human-review summary. A round with no winner observed, or a winner that does not resolve to the expected local callsign, is reported as an honest caveat rather than a fabricated result.
- The harness only reads existing view state and adds no authority, identity, or protocol data. Focused tests cover the healthy winner line, the no-winner caveat, and the not-local-callsign caveat.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed and roster-labelled scoreboard, the roster feed and participant panel, the round-winner label, the browser-page smoke, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 48 Status

Phase 48 is current when validation passes because:

- `/playtest.html` shows a read-only match occupancy readout (connected slots of capacity) formatted straight from the already-mirrored server-owned match-update state, complementing the roster (identities) with slot-occupancy context relevant to the larger-player-count target.
- The readout is presentation-only: occupancy and capacity come straight from the server match-update, the client computes no occupancy of its own, and the readout falls back to a neutral label before the first match update or on malformed values.
- The occupancy readout (`#playtest-match-occupancy`) is exposed on the diagnostics view state and guarded by the browser-page smoke. A focused test covers the formatting, including the pre-match and malformed-value fallbacks.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed and roster-labelled scoreboard, the roster feed and participant panel, the round-winner label and its harness assertion, the browser-page smoke, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 49 Status

Phase 49 is current when validation passes because:

- `npm run playtest:harness` now asserts the server-owned match occupancy end to end: with both clients connected it reads the diagnostics-only occupancy view state and confirms it reflects two connected slots of capacity, and after the primary disconnects it confirms the remaining client's observed occupancy drops to one connected slot of capacity.
- The harness prints a `- match occupancy:` line in its human-review summary and reports an honest caveat when occupancy does not read as two-of-capacity then shrink to one-of-capacity.
- The harness only reads existing view state and adds no authority, identity, or protocol data. A focused test covers the healthy occupancy line and the does-not-shrink caveat.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed and roster-labelled scoreboard, the roster feed and participant panel, the round-winner label, the match occupancy readout, the browser-page smoke, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 50 Status

Phase 50 is current when validation passes because:

- A new original arena, Drydock Span (`arena-drydock-span`), is authored in shared as validated data sized for the eight-player match capacity.
- It is a mirrored two-end greybox: four north and four south neutral spawns face a contested midline, with cover symmetric about the midline so neither end holds a layout advantage. It passes the existing map metadata contract (bounded counts, positive geometry inside ~40×40 world bounds, original naming) and renders a greybox layout from its metadata.
- The arena is data only this phase: the server collision arena, the slot starts, and the renderer default are unchanged, so there is no behavior change yet. Ebb Terminal remains the small test arena.
- Focused tests cover metadata validity, the eight-spawn mirrored structure, original naming, and a conservative clearance check confirming every spawn is clear of the derived collision blockers.
- Existing round flow, loadout, weapon authority, combat, fire validation, the match-stats feed and roster-labelled scoreboard, the roster feed and participant panel, the round-winner label, the match occupancy readout and its harness assertion, the browser-page smoke, diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, prediction/interpolation diagnostics, and transport smokes remain intact.
- WebTransport status remains honest.

## Phase 51 Status

Phase 51 is current when validation passes because:

- Drydock Span is now the default arena end to end. The server world-state derives its authoritative collision geometry from Drydock Span, and the eight fixed slot starts sit on its mirrored spawns (north cluster slots 0-3 facing -z, south cluster slots 4-7 facing +z), each collision-clear by construction.
- The client mirrors the same arena: the client-prediction collision geometry, the playtest renderer greybox, and the playtest player camera all use Drydock Span, so client prediction stays in parity with the server and the playtest renders the new map.
- Ebb Terminal remains a valid, tested arena: the renderer sandbox still loads it and the collision/movement/camera/prediction helper tests still exercise it explicitly.
- The spawn-dependent server and world-state tests were updated for the new slot starts, and the two-client harness runs green end to end on the new default arena (movement contact, accepted miss/hit, elimination, winner, scoreboard, occupancy, zero console errors).
- Server authority is unchanged: hitscan still has no arena occlusion, slot starts remain fixed (no client-owned or dynamic spawn selection), and no protocol shape, matchmaking, teams, or persistence was added.
- WebTransport status remains honest.

## Roadmap: First Playable Match

Goal: **two humans on different machines connect to one Breachline server and actually shoot each other through a complete, readable round loop** — the first time the proven server-authoritative mechanics become a game someone can sit down and play, not just a harness can drive.

What already exists (proven): server-authoritative connect, movement+collision on the eight-player Drydock Span arena, validated hitscan, damage/health/death, round setup/active/ended/reset, weapons with ammo/reload, kill/death stats, player roster/callsigns, and read-only diagnostics for all of it. The two-client harness already drives one client to kill another and observes the elimination. The gap to a *playable* match is human I/O, reachability, and readable feedback — not new core authority.

Milestones (each stays server-authoritative, original, and validated; HUD milestones are the deliberate, scoped place where the long-standing "no gameplay HUD" guard is relaxed for exactly the read-only feedback a player needs):

52. **Human aim and fire controls.** ✅ Done. Pointer-lock mouse-look aim and left-click-to-fire already existed; added a reload key (KeyR) and a `reload()` diagnostics hook sending the existing `client.weapon.reload` intent. Reload stays intent-only (server owns ammo/reload). The browser-page smoke guards the reload wiring.
53. **Crosshair + hit feedback.** ✅ Done. A static centered crosshair plus a brief read-only hitmarker gated only by a server-confirmed accepted hit (a tested `hitmarkerActive` signal in the fire-result presentation). No client-decided hits; the marker clears on its own. Smoke guards the crosshair/hitmarker markup.
54. **Readable player HUD (deliberate HUD relaxation).** ✅ Done. A bottom-center HUD shows read-only health, alive/dead state, and a server-owned respawn countdown (tested `respawnCueLabel` from the respawn-eligible tick vs latest server tick). This intentionally narrows the "no gameplay HUD" guard to "read-only server-owned HUD only." Smoke guards the HUD markup.
55. **Weapon/ammo readout.** ✅ Done. The HUD now shows the server-owned weapon name (resolved from the broadcast profile id) and a magazine ammo readout (with a reloading state), via tested pure formatters. This intentionally lifts the Phase 39 "no ammo HUD" guard to read-only display only. Smoke guards the weapon/ammo markup and wiring.
56. **Always-visible match scoreboard + roster panel polish.** ✅ Done. The callsign-labelled scoreboard and roster were already always-visible overlays; added a centered round-winner banner (tested `roundBanner` projection) that names the server-owned winner on an elimination and reports the outcome on a timeout, shown only during the decided result window. Smoke guards the banner markup.
57. **Server-owned match win condition.** ✅ Done. The server tracks a kill-target frag limit and declares the first session to reach it the match winner, from the kill tallies it already owns. A new reliable `server.match.result` message (round-trip tested) broadcasts match-over + winner + target; the client mirrors it (clears on reconnect) and shows a read-only "match over" banner with the winner's callsign. No client-owned win/loss. (Gameplay freeze on match-over deferred.)
58. **LAN reachability + host/join flow.** ✅ Done. `npm run host:match` binds the transport-loop server LAN-reachable (default `0.0.0.0`) and prints a shareable `/playtest.html` join URL per LAN IPv4 (tested pure helper over the host's network interfaces). The server config now forwards an optional match kill target. Strictly local — no accounts, hosted services, analytics, or persistence.
59. **Two-human local match validation.** Extend the harness/playtest review so a real two-person match (connect → aim → shoot → die → respawn → match end) is exercised and documented as the first playable-match proof, with honest caveats.

Out of scope for this roadmap (still deferred, would need their own decisions): public/internet hosting, matchmaking queues, teams, economy/buy, ranked systems, persistence/accounts, anti-cheat beyond the existing server authority, art/audio pass, and player avatars/skins. The first match is intentionally a small original 1v1-to-8 free-for-all on Drydock Span.

Each milestone keeps the invariants: the server owns hits, damage, health, death, spawns, round and match outcomes; the client only sends intents and renders server-owned truth; transports stay abstracted; originality holds; and `npm run validate` plus the local harness stay green before each commit.
