# Validation

Validation reports must match what actually ran.

## Phase 1 Done Criteria

Phase 1 is done when:

- `README.md` exists and describes project direction, setup, current phase, and next milestone.
- `AGENTS.md` exists and tells future agents how to work safely.
- `GUARDRAILS.md` exists and defines non-negotiable rules.
- `ARCHITECTURE_SPINE.md` exists and defines client, server, shared, networking, simulation, rendering, gameplay, and persistence boundaries.
- `CODING_STANDARDS.md` exists and defines TypeScript, module, testing, logging, error, binary protocol, and real-time loop standards.
- `ROADMAP.md` exists and includes the 20-goal roadmap with Phase 1 current.
- `docs/NETWORKING_MODEL.md` exists and explains WebTransport, datagrams, streams, ticks, snapshots, prediction/interpolation notes, and fallback.
- `docs/GAMEPLAY_CONTRACT.md` exists and defines early gameplay limits without implementation.
- `apps/client`, `apps/server`, `packages/shared`, and `docs` exist.
- Minimal TypeScript placeholders compile.
- No gameplay has been implemented.

## Phase 2 Done Criteria

Phase 2 is done when:

- `packages/shared` defines hello/accept/reject, ping/pong, client input placeholder, server tick, and server snapshot placeholder messages.
- Protocol encode/decode helpers round-trip the Phase 2 messages and reject unknown message kinds.
- `apps/server` has a fixed authoritative tick loop, minimal session tracking, ping handling, placeholder input recording, and tick/snapshot broadcasts.
- `apps/client` has a minimal dev runtime that connects, sends hello/ping/input placeholder messages, and records server responses.
- Transport code is boxed behind `MessageTransport`.
- WebTransport status is reported accurately.
- The WebSocket fallback transport smoke passes when WebTransport is blocked.
- No movement, weapons, maps, teams, matchmaking, prediction, interpolation, renderer, persistence, or real gameplay exists.

## Phase 3 Done Criteria

Phase 3 is done when:

- `apps/client` includes a browser page that runs from the local development server.
- The page connects through the transport adapter and uses the WebSocket fallback for this phase.
- The page displays connection state, server tick, last snapshot tick, ping/pong RTT, last message time, message counts, and errors.
- Connect and disconnect controls work without directly binding UI code to WebSocket APIs.
- The server can serve the browser page without changing the authoritative tick-loop contract.
- Focused connection-state tests pass.
- A browser smoke confirms live server data appears in the page, or exact manual smoke observations are reported.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No movement, weapons, maps, teams, matchmaking, prediction, interpolation, renderer, persistence, or real gameplay exists.

## Phase 4 Done Criteria

Phase 4 is done when:

- `packages/shared` defines the binary packet header with magic bytes, version, packet kind, sequence/tick, payload length, and little-endian numeric fields.
- Shared binary encode/decode helpers cover hello/accept/reject, ping/pong, client input placeholder, server tick, and server snapshot placeholder messages.
- Protocol tests prove round trips, malformed packet rejection, unsupported-version rejection, and unknown-kind rejection.
- WebSocket fallback adapters send binary payloads while `MessageTransport` keeps runtime code message-based.
- Server and browser behavior remains equivalent to Phase 3: connect, accept, ping/pong, ticks, snapshots.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No movement, weapons, maps, teams, matchmaking, prediction, interpolation, renderer, persistence, or real gameplay exists.

## Phase 5 Done Criteria

Phase 5 is done when:

- The browser diagnostics view displays RTT current/min/max/average, bounded RTT history, observed server tick rate, observed snapshot rate, message counts/rates by kind, connection uptime, and last disconnect/error reason.
- Diagnostics calculations are covered by focused reducer tests that do not require the DOM.
- Reconnect resets per-connection diagnostics and does not duplicate heartbeat or render timers.
- Existing Phase 4 binary protocol tests and transport smokes still pass.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No movement, weapons, maps, teams, matchmaking, prediction, interpolation, renderer, persistence, or real gameplay exists.

## Phase 6 Done Criteria

Phase 6 is done when:

- `packages/shared` defines binary match/session metadata messages and protocol tests cover round trips plus malformed packet rejection.
- `apps/server` owns an in-memory fixed-capacity match container with 4 default slots.
- Accepted clients receive a stable server-owned session id, slot index, match id, capacity, and connected slot count.
- Over-capacity clients receive a clear rejection reason and are not admitted into the tick/snapshot stream.
- Disconnects reduce the connected slot count and make capacity available for a later session.
- The browser dev view displays match id, session id, assigned slot, capacity, connected slot count, and rejection reason.
- Match/session model, server runtime assignment, and browser reducer behavior are covered by focused tests.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No movement, weapons, maps, teams, matchmaking, prediction, interpolation, renderer, persistence, or real gameplay exists.

## Phase 7 Done Criteria

Phase 7 is done when:

- `packages/shared` defines and tests an `input.ack` binary message while preserving the existing `client.input` packet shape.
- `apps/server` validates placeholder input only for accepted sessions with match assignments.
- Per-session input state accepts strictly increasing sequence numbers and drops duplicate or stale sequence numbers.
- Invalid numeric input values are rejected or ignored without advancing the last accepted input sequence.
- The server exposes last accepted input sequence and dropped input count through acknowledgements and focused runtime tests.
- The browser dev view displays last sent input sequence, last acknowledged sequence, input drop count, and input send rate.
- Existing match/session metadata, diagnostics, transport smokes, and fixed tick loop remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No movement, weapons, maps, teams, matchmaking, prediction, interpolation, renderer, persistence, or real gameplay exists.

## Phase 8 Done Criteria

Phase 8 is done when:

- `packages/shared` snapshot messages include tested world id, entity count, and placeholder entity/session references.
- Snapshot packet encoding remains binary, versioned, little-endian, and rejects malformed entity counts.
- `apps/server` owns a deterministic world-state shell.
- Accepted match sessions create placeholder world entities with server-owned entity ids.
- Disconnects remove placeholder entities from later snapshots.
- Server snapshots include world metadata only for accepted sessions.
- The browser dev view displays world id, world entity count, and last world snapshot tick.
- Existing match/session metadata, input acknowledgement, diagnostics, transport smokes, and fixed tick loop remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No movement, physics, collision, weapons, maps, teams, matchmaking, prediction, interpolation, lag compensation, renderer, persistence, art, HUD, or gameplay exists.

## Phase 9 Done Criteria

Phase 9 is done when:

- `apps/client` serves a separate browser renderer sandbox page.
- The sandbox uses Three.js to render a visible original greybox test space with a floor, walls, simple cover blocks, and scale references.
- Mouse-look style camera orientation works when practical.
- Keyboard-driven camera sandbox movement is client-only inspection movement and does not touch server state, input validation, match state, binary protocol shape, or world snapshots.
- The existing diagnostics page and transport behavior remain intact.
- Focused tests cover pure renderer helpers.
- A static smoke confirms the sandbox page and renderer module are served locally.
- A browser smoke confirms the canvas is nonblank and there are no console errors.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No gameplay, server-authoritative movement, physics, collision gameplay, weapons, maps pipeline, teams, matchmaking queue, prediction, interpolation, lag compensation, persistence, art pass, HUD, or combat exists.

## Phase 10 Done Criteria

Phase 10 is done when:

- `packages/shared` snapshot messages include tested per-entity `x`, `y`, `z`, and `yaw` fields.
- Snapshot packet encoding remains binary, versioned, little-endian, bounded, and rejects malformed or non-finite movement data.
- `apps/server` owns deterministic flat-plane placeholder movement state for accepted session entities.
- Movement advances only from accepted input commands on the fixed tick loop.
- Invalid, stale, duplicate, or dropped input does not move entities.
- Clients never send trusted positions.
- Disconnects remove placeholder entities from later snapshots, and entity ids remain server-owned.
- The browser diagnostics page displays the local assigned entity id, position, and yaw from server snapshots.
- `/sandbox.html` remains client-only and continues to render a nonblank greybox scene.
- Existing match/session metadata, input acknowledgement, diagnostics, transport smokes, and fixed tick loop remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No prediction, interpolation, physics engine, collision gameplay, weapons, combat, health, teams, rounds, matchmaking queue, persistence, art pipeline, map pipeline, lag compensation, anti-cheat, or gameplay HUD exists.

## Phase 11 Done Criteria

Phase 11 is done when:

- `apps/client` owns a DOM-free client prediction/reconciliation model.
- Prediction advances only from locally sent input command data and does not send or own trusted positions.
- Reconciliation treats authoritative local entity snapshots as truth, records correction magnitude, drops acknowledged inputs, and replays only pending local inputs.
- Invalid local prediction inputs or malformed snapshot data do not poison prediction state.
- Browser diagnostics display predicted position, predicted yaw, correction magnitude, pending input count, replay count, and last reconciled snapshot tick.
- Focused tests cover the prediction model and reducer integration.
- `/sandbox.html` remains client-only and continues to render a nonblank greybox scene.
- Existing protocol, server movement, match/session metadata, input acknowledgement, diagnostics, transport smokes, and fixed tick loop remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No remote-player interpolation, physics engine, collision gameplay, weapons, combat, health, teams, rounds, matchmaking queue, persistence, art pipeline, map pipeline, lag compensation, anti-cheat, or gameplay HUD exists.

## Phase 12 Done Criteria

Phase 12 is done when:

- `apps/client` owns a DOM-free remote-player interpolation model.
- The model accepts authoritative `server.snapshot` entity data, excludes the assigned local session, keeps a bounded snapshot buffer, and samples remote presentation poses at a configurable interpolation delay.
- Remote interpolation covers `x`, `y`, `z`, and wrap-safe yaw interpolation.
- Malformed, inactive, stale, out-of-order, or unusable remote data does not poison interpolation state.
- Browser diagnostics display remote entity count, buffered snapshot count, interpolation delay, last sampled tick/time, and one representative remote pose when present.
- Local prediction/reconciliation remains separate and does not use remote interpolation state.
- `/sandbox.html` remains client-only and continues to render a nonblank greybox scene.
- No server runtime or protocol changes are required.
- Existing protocol, server movement, match/session metadata, input acknowledgement, diagnostics, transport smokes, and fixed tick loop remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No renderer coupling, combat, weapons, health, teams, rounds, matchmaking queue, persistence, art pipeline, map pipeline, lag compensation, anti-cheat, or gameplay HUD exists.

## Phase 13 Done Criteria

Phase 13 is done when:

- A shared or client-owned map metadata contract describes one original arena blockout.
- The contract includes structural fields for map id, display name, revision, world bounds, blockout primitives, player scale references, neutral spawn markers, and optional labels.
- Validation helpers cover required fields, finite numeric positions/sizes, unique ids, bounded primitive counts, spawn markers inside world bounds, and empty or invalid geometry.
- One original greybox arena data module exists without copied shooter names, layouts, callouts, factions, brands, or presentation.
- `/sandbox.html`, if touched, remains client-only and renders from metadata without driving gameplay authority.
- Focused tests cover metadata validation, bounds/spawn checks, primitive count limits, original id/name conventions, and sandbox layout generation.
- Existing protocol, server runtime, match/session metadata, input acknowledgement, prediction, remote interpolation diagnostics, transport smokes, and fixed tick loop remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No combat, weapons, damage, health, teams, rounds, objectives, loadouts, matchmaking, persistence, gameplay HUD, collision gameplay, physics engine, navmesh, server map selection, authoritative spawn system, renderer-player coupling, art pipeline, or WebTransport implementation exists.

## Phase 14 Done Criteria

Phase 14 is done when:

- `apps/client` owns a DOM-free player camera model.
- The camera derives pose from existing local presentation/movement data plus configured eye height.
- The camera uses validated map metadata for loaded map id/revision, fallback spawn placement, simple bounds clamping, and metadata validation diagnostics.
- `/sandbox.html` applies the player camera pose to the Three.js camera and reports camera mode, map id, eye height, pose, and metadata validation status.
- Focused tests cover player-camera pose derivation, bounds/fallback behavior, and separation from server authority fields.
- Existing protocol, server runtime, match/session metadata, input acknowledgement, prediction, remote interpolation diagnostics, map metadata tests, transport smokes, and fixed tick loop remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No combat, weapons, damage, health, teams, rounds, objectives, loadouts, matchmaking, persistence, gameplay HUD, collision gameplay, physics engine, navmesh, server map selection, authoritative spawn system, lag compensation, art pipeline, or WebTransport implementation exists.

## Phase 15 Done Criteria

Phase 15 is done when:

- `packages/shared` defines binary `client.fire` and `server.fire.result` messages with tested round trips and malformed packet rejection.
- Fire intent carries only safe intent data: fire sequence, client timing/tick metadata, yaw, and pitch.
- Fire intent does not carry client-owned position, target id, hit result, damage, health, score, ammo, reload, weapon identity, or team/objective state.
- `apps/server` validates fire only for accepted sessions with match assignment and active server-owned world entities.
- The server computes ray origin from authoritative world state and treats yaw/pitch only as intent.
- Placeholder entity hit volumes come from the current authoritative world snapshot and do not include map collision, cover penetration, lag compensation, teams, damage, death, or scoring.
- Fire results include sequence, accepted/rejected state, hit/miss state, optional target entity/session ids, distance, server tick, and reject reason.
- Browser diagnostics show last fire send/result state without adding weapon presentation, gameplay HUD, or renderer coupling.
- Focused tests cover protocol round trips/rejection, pure hitscan math, server validation/runtime behavior, and reducer diagnostics.
- Existing diagnostics page, renderer sandbox, player camera, map metadata tests, match slots, input acknowledgements, server movement, prediction diagnostics, remote interpolation diagnostics, and transport smokes remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No damage, health, death, ammo, reloads, weapon identities, teams, objectives, matchmaking, lag compensation, persistence, art, gameplay HUD, or WebTransport implementation exists.

## Phase 16 Done Criteria

Phase 16 is done when:

- `apps/server` owns combat state for accepted session entities: health, alive/dead, death tick, respawn eligibility tick, and reset event metadata.
- Placeholder damage applies only from accepted server-owned fire results.
- Clients never send damage, health, death, target confirmation, score, respawn truth, ammo, reload state, or weapon identity.
- Shared protocol adds only the authoritative diagnostics needed for combat state and tests round trips plus malformed packet rejection.
- Dead entities stop being valid movement actors, fire sources, and hitscan targets until the server reset path restores them.
- Browser diagnostics show local combat state and last combat event without gameplay HUD, renderer weapon/death presentation, or client authority.
- Focused tests cover combat-state damage, death, dead-target rejection, respawn/reset eligibility, runtime authority gates, and reducer diagnostics.
- Existing hitscan, movement, prediction, interpolation, map metadata, renderer, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No weapon identities, ammo, reloads, teams, objectives, matchmaking, scoring, persistence, art, lag compensation, gameplay HUD, or WebTransport implementation exists.

## Phase 17 Done Criteria

Phase 17 is done when:

- `packages/shared` defines binary `client.loadout.select` and `server.loadout.state` messages with tested round trips and malformed packet rejection.
- The shared loadout contract exposes only original/generic placeholder profile ids.
- `apps/server` validates loadout selection only for accepted sessions with match assignment.
- Invalid profile ids, stale or duplicate selections, unknown sessions, and attempts before protocol acceptance produce explicit rejection reasons.
- The server owns accepted loadout state; clients never send damage, fire rate, ammo, health, score, target rules, combat outcomes, weapon identity, inventory truth, or round outcomes.
- Existing fire/combat behavior reads a server-owned placeholder loadout only for a bounded combat default, without adding a weapon system.
- Browser diagnostics show loadout profile id, status, and reject reason without gameplay HUD, renderer weapon presentation, or client authority.
- Focused tests cover shared protocol, loadout validation, runtime authority, combat-default integration, and reducer diagnostics.
- Existing combat, hitscan, movement, prediction, interpolation, map metadata, renderer, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No weapon identities, ammo, reload systems, economy, buy flow, inventory, teams, objectives, matchmaking, scoring, persistence, art, lag compensation, gameplay HUD, or WebTransport implementation exists.

## Phase 18 Done Criteria

Phase 18 is done when:

- `packages/shared` defines binary `server.round.state` diagnostics with tested round trips and malformed packet rejection.
- `apps/server` owns a round state machine for setup, active, ended, and reset phases.
- Round outcomes are computed from server-owned combat/session/tick state only; clients cannot send win/loss truth.
- Movement, fire, loadout selection, respawn, damage application, and reset behavior are gated by server-owned phase.
- The reset path restores server-owned placeholder movement, combat, and loadout state for another prototype round.
- Browser diagnostics show round id, phase, outcome, winner session, phase timing, reset timing, last event, and server tick without gameplay HUD or renderer coupling.
- Focused tests cover protocol round trips/rejection, round transitions, win/loss/reset sequencing, runtime phase gates, client outcome rejection, and reducer diagnostics.
- Existing loadout, combat, hitscan, movement, prediction, interpolation, map metadata, renderer, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No economy, buy flow, team scoring, objectives, matchmaking, ranked systems, persistence, weapon presentation, art, lag compensation, gameplay HUD, or WebTransport implementation exists.

## Phase 19 Done Criteria

Phase 19 is done when:

- `apps/client` owns a DOM-free developer telemetry formatter for existing diagnostics state.
- The browser diagnostics page displays telemetry status/readiness for connection, cadence, prediction, remote interpolation, loadout, fire, combat, round, and errors.
- Telemetry is diagnostics-only and does not change server authority, simulation timing, protocol authority, combat outcomes, round outcomes, or transport selection.
- Local private playtest notes exist and describe how to run the prototype, browser caveats, the proven WebSocket fallback path, WebTransport pending status, and what testers should record.
- Any playtest helper script only prints local notes and does not upload telemetry, add analytics, create accounts, start hosted deployment, or introduce persistence.
- Focused tests cover telemetry summaries, rejected/error states, waiting states, and private playtest note requirements.
- Existing round, loadout, combat, hitscan, movement, prediction, interpolation, map, renderer, protocol, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No economy, buy flow, matchmaking, ranked systems, persistence, weapon presentation, external telemetry upload, analytics service, crash reporting SaaS, art pipeline, gameplay HUD, or WebTransport implementation exists.

## Phase 20 Done Criteria

Phase 20 is done when:

- `apps/client` defines a renderer-only private prototype asset manifest with id, label, category, local URL, fit size, and preview position fields.
- Manifest validation covers private asset URL roots, no network URLs, no server paths, unique ids, and finite preview placement/scale values.
- `/sandbox.html` provides category controls for `arena-kit`, `industrial-dressing`, `cover-training-props`, `characters-firstperson`, and `equipment-placeholder`.
- Optional private GLB loading reports loaded/failed counts and does not crash the sandbox when assets are missing or malformed.
- `/sandbox.html` still renders a nonblank greybox scene when no private assets are available.
- Focused tests cover the manifest summary, validation failures, and category-filtered preview plans.
- Static browser-page smoke checks the sandbox controls and private asset loader wiring.
- The ignored folder `apps/client/public/assets/private-prototype/` remains ignored, and private GLB files are not moved or committed.
- Existing diagnostics, renderer, map, prediction, interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No gameplay authority, protocol changes, server simulation changes, combat, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, external asset pipeline, or WebTransport implementation exists.

## Phase 21 Done Criteria

Phase 21 is done when:

- `scripts/private-asset-audit.mjs` audits `.glb` files under `apps/client/public/assets/private-prototype/`.
- The audit extracts relative path, category, file size, mesh count, material count, texture/image count, animation count, accessor count, primitive count, and simple warning codes when present.
- The generated audit output is written to ignored `local-assets/private-asset-audit.json`.
- A source-controlled candidate tag contract/helper exists with `preview-ok`, `needs-scale-check`, `too-heavy-for-browser`, `character-reference-only`, `prop-reference-only`, and `replace-before-public`.
- Source-controlled documentation explains the audit command, ignored output path, and candidate tag interpretation.
- The sandbox manifest remains hand-curated and does not auto-load every private asset.
- Focused tests cover GLB audit parsing/summaries and candidate tag validation.
- `local-assets/` and `apps/client/public/assets/private-prototype/` remain ignored, and private GLB files are not moved or committed.
- Existing diagnostics, renderer, map, prediction, interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No gameplay authority, protocol changes, server simulation changes, combat, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 22 Done Criteria

Phase 22 is done when:

- `apps/client` defines a renderer-only curated sandbox preset contract/helper.
- The preset set includes `scale-check`, `arena-dressing`, and `equipment-check`.
- `scale-check` references one character or hands reference, one crate or cover prop, and one arena or blockout piece from the source-controlled private asset manifest.
- `arena-dressing` references a small set of industrial and arena props from the source-controlled private asset manifest.
- `equipment-check` references only placeholder equipment assets from the source-controlled private asset manifest.
- Preset validation covers unique preset ids, referenced assets existing in the source-controlled manifest, private paths only, no network URLs, no server paths, and copied shooter naming guards.
- `/sandbox.html` preserves category controls and adds separate preset controls.
- Preset loading remains optional and resilient: missing private assets report failed counts without crashing the sandbox.
- The sandbox manifest remains hand-curated and does not auto-load every private asset.
- Focused tests cover preset validation and preset preview plans.
- Static browser-page smoke checks preset controls and preset loader wiring.
- A live renderer smoke confirms `/sandbox.html` remains nonblank on desktop and mobile, category switching still works, preset switching works, missing/failed counts are handled cleanly, and no console errors appear.
- `apps/client/public/assets/private-prototype/` remains ignored, and private GLB files are not moved or committed.
- Existing diagnostics, renderer, map, prediction, interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No gameplay authority, protocol changes, server simulation changes, combat, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 23 Done Criteria

Phase 23 is done when:

- `apps/client` defines a renderer-only arena dressing plan contract/helper.
- The first dressing plan targets `arena-ebb-terminal` and references only existing private asset manifest ids.
- Dressing placements include asset id, position, yaw, fit size, and a purpose tag such as `scale-reference`, `cover-readability`, `industrial-dressing`, or `equipment-readability`.
- Dressing validation covers unique placement ids, referenced assets existing in the source-controlled manifest, finite position/yaw/fit values, placements inside map bounds, no network URLs, no server paths, and copied shooter naming guards.
- `/sandbox.html` preserves category and preset controls and adds a separate show/hide arena dressing toggle.
- `/sandbox.html` reports dressing plan/count/load status and keeps failed-load counts visible.
- Dressing loading remains optional and resilient: missing private assets report failed counts without crashing the sandbox.
- The dressing plan stays client-owned and is not written into shared map metadata, protocol packets, server world state, collision truth, cover truth, line-of-sight truth, spawn authority, or gameplay systems.
- The sandbox manifest remains hand-curated and does not auto-load every private asset.
- Focused tests cover dressing plan validation, bounds checks, safe asset references, copied-name rejection, and unresolved asset handling.
- Static browser-page smoke checks dressing controls and dressing loader wiring.
- A live renderer smoke confirms `/sandbox.html` remains nonblank on desktop and mobile, category switching still works, preset switching works, the dressing toggle works, missing/failed counts are handled cleanly, and no console errors appear.
- `apps/client/public/assets/private-prototype/` and `local-assets/` remain ignored, and private GLB files plus generated audit output are not moved or committed.
- Existing diagnostics, renderer, map, prediction, interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No gameplay authority, protocol changes, server simulation changes, collision, nav, hitboxes, gameplay cover, line-of-sight truth, combat, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 24 Done Criteria

Phase 24 is done when:

- `apps/client` serves `/playtest.html` as a separate browser page.
- The page connects through the existing browser WebSocket fallback adapter behind `MessageTransport`.
- The page sends only the existing placeholder input command envelope and current loadout-selection helper needed by the server-owned round flow.
- The local first-person camera is driven from client prediction/reconciliation presentation data, with server snapshots kept as truth.
- Remote players render as simple original placeholder markers derived from the existing remote interpolation state.
- The existing greybox arena renders without requiring private assets; missing private assets do not crash the playtest view.
- Compact developer readouts show connection state, local entity id, server position, predicted position, correction, remote count, round phase, render health, and errors.
- `/sandbox.html` remains client-only and nonblank, and the diagnostics page still connects.
- Focused DOM-free tests cover playtest input mapping, presentation-state derivation, remote placeholder derivation, and round-phase formatting.
- Static browser-page smoke checks diagnostics, `/sandbox.html`, and `/playtest.html`.
- A live browser smoke confirms `/playtest.html` connects over WebSocket fallback, local camera/server position update from input, prediction readouts populate, remote placeholders appear when a second client is practical, desktop/mobile layouts are usable, `/sandbox.html` remains nonblank, diagnostics still connects, and no console errors appear.
- `apps/client/public/assets/private-prototype/` and `local-assets/` remain ignored, and private GLB files plus generated audit output are not moved or committed.
- Existing diagnostics, renderer, map, prediction, interpolation, movement, fire, combat, loadout, round, protocol, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No protocol changes, server simulation changes, gameplay authority, combat presentation, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 25 Done Criteria

Phase 25 is done when:

- `docs/NETWORKED_PLAYTEST_REVIEW.md` provides a concise `/playtest.html` checklist for connection, local movement feel, prediction correction behavior, remote placeholder visibility, reconnect behavior, desktop/mobile usability, and known limitations.
- `npm run playtest:review` prints local-only playtest instructions and expected evidence without uploading telemetry, adding analytics, writing remote logs, creating accounts, or starting hosted services.
- Generated or manual playtest notes are directed to ignored `local-assets/playtest-review/`.
- `/playtest.html` exposes review readouts for frame health, prediction correction current/max, remote count, reconnect count, and last error.
- The default placeholder round duration does not force a timeout/reset during a short local movement-feel review window.
- Focused tests cover the review instruction helper and readout stats model.
- Static browser-page smoke checks the added playtest readout ids and helper wiring.
- A live browser smoke confirms `/playtest.html` connects over WebSocket fallback, local movement changes server-owned position, prediction correction readouts populate, a second client creates a remote placeholder when practical, reconnect works, `/sandbox.html` remains nonblank, diagnostics still connects, desktop/mobile layouts are usable, and no console errors appear.
- `apps/client/public/assets/private-prototype/` and `local-assets/` remain ignored, and private GLBs, generated notes, and generated audit output are not moved or committed.
- Existing diagnostics, renderer, map, prediction, interpolation, movement, fire, combat, loadout, round, protocol, private asset audit, sandbox preset, dressing, and transport tests remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No protocol changes, server simulation changes, gameplay authority, combat presentation, weapons, gameplay HUD, matchmaking, persistence, hosted deployment, analytics, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 26 Done Criteria

Phase 26 is done when:

- Shared code exports the original arena metadata and a greybox collision contract for world bounds plus static wall/cover blockers.
- Collision geometry is derived from original map/blockout metadata without importing client code into the server.
- Shared collision tests prove blocker derivation, world-bounds clamping, repeated stop behavior, face-slide behavior without edge snapping, diagonal corner pressure without tunneling or jitter spikes, and spawn clearance.
- Server movement applies shared collision in authoritative world state and runtime snapshots.
- Client prediction can use the same shared collision helper only for presentation feel; server snapshots remain truth.
- Focused tests cover shared collision, server movement, world-state integration, runtime snapshots, and client prediction mirroring.
- Static and live browser smoke confirm `/playtest.html` still connects over WebSocket fallback, movement updates server-owned position, blocker stop/slide behavior is observable, prediction correction readouts populate, `/sandbox.html` remains nonblank, diagnostics still connects, and no console errors appear.
- Existing protocol packets, malformed-packet rejection, combat, fire validation, loadout, round flow, diagnostics, private asset audit, sandbox preset, dressing, and transport tests remain intact.
- `apps/client/public/assets/private-prototype/` and `local-assets/` remain ignored, and private GLBs, generated notes, and generated audit output are not moved or committed.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No protocol changes, combat changes, weapon art, gameplay HUD, private asset gameplay use, matchmaking, persistence, hosted deployment, analytics, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 28 Done Criteria

Phase 28 is done when:

- `apps/client` owns a renderer-only first-person presentation shell for `/playtest.html`.
- The shell uses simple original placeholder hands/equipment geometry or already-approved ignored private prototype assets only for local renderer inspection.
- The shell is attached to the local Three.js camera and remains visible while looking, moving, colliding with greybox blockers, and sending existing fire intent.
- The shell presentation helper is DOM-free and covered by focused tests for bounded camera-space parts, original id/name conventions, motion/fire presentation states, disabled handling, and absence of authority fields.
- `/playtest.html` reports compact shell/fire presentation diagnostics without becoming a gameplay HUD.
- Existing `client.fire` and `server.fire.result` behavior stays server-owned and protocol-compatible; the shell does not affect fire validation, damage, hit results, movement, collision, snapshots, combat, round state, or server authority.
- Static and live browser smoke confirm `/playtest.html` renders nonblank, pointer look still works, movement/collision still works, first-person shell visibility stays attached to the camera, diagnostics still connects, `/sandbox.html` remains nonblank, and no console errors appear.
- Existing diagnostics, renderer sandbox, collision, prediction, interpolation, movement, fire, combat, loadout, round, protocol, private asset audit, sandbox preset, dressing, and transport tests remain intact.
- `apps/client/public/assets/private-prototype/` and `local-assets/` remain ignored, and private GLBs, generated notes, and generated audit output are not moved or committed.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No protocol changes, server runtime changes, weapon gameplay, ammo, reloads, weapon identities, score, teams, objectives, matchmaking, persistence, gameplay HUD, hosted deployment, analytics, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 29 Done Criteria

Phase 29 is done when:

- `apps/client` owns renderer-only fire-result presentation for `/playtest.html`.
- Local fire intent from the first-person shell produces abstract short-lived feedback without defining a weapon, ammo, reload, damage, score, or client authority.
- Existing authoritative `server.fire.result` data drives accepted/rejected and hit/miss presentation, including short-lived abstract tracers or impact/reject markers.
- Remote placeholder readability improves when the server-owned fire result names a target entity.
- Compact playtest diagnostics show the last visualized fire sequence, result state, hit/miss/rejected state, and active tracer count.
- Focused DOM-free tests cover presentation helper behavior, bounded active effects, stale/malformed result handling, and server-result-driven target highlighting.
- Static and live browser smoke confirm `/playtest.html` connects and renders nonblank, first-person shell remains camera-attached, fire input advances the existing fire intent sequence, server fire results are received and visualized, remote placeholders still render with two clients, movement/collision still works, diagnostics and `/sandbox.html` still work, and no console errors appear.
- Existing `client.fire` and `server.fire.result` protocol shape, server fire validation, movement, collision, snapshots, combat authority, round state, and transport selection remain unchanged.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No weapon gameplay, ammo, reloads, weapon identities, client-owned hits, client-owned damage, score, teams, objectives, matchmaking, persistence, gameplay HUD, hosted deployment, analytics, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 30 Done Criteria

Phase 30 is done when:

- `/playtest.html` fire-result visuals remain renderer-only, abstract, and server-result-driven.
- Local fire intent, accepted miss, accepted hit, rejected fire, tracer lifetime, impact markers, and remote target accent are readable during local browser playtests.
- Fire-result effects clear cleanly and expose compact diagnostics for visualized sequence, hit/result state, active tracer count, and expired effect count.
- Focused DOM-free tests cover presentation timing/readability, stale or malformed result handling, active-effect bounds, expiry, and target accent clearing.
- Static browser-page smoke checks the added playtest diagnostics and fire-result presentation bundle.
- Live browser smoke confirms `/playtest.html` connects over the WebSocket fallback, renders nonblank on desktop and mobile viewports, can show a remote placeholder with two clients, receives and visualizes server fire results, clears transient visuals on reconnect, preserves movement/collision and first-person shell behavior, keeps diagnostics and `/sandbox.html` working, and reports no console errors.
- Existing `client.fire` and `server.fire.result` protocol shape, server fire validation, movement, collision, snapshots, combat authority, round state, loadout authority, and transport selection remain unchanged.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No weapon gameplay, ammo, reloads, weapon identities, client-owned hits, client-owned damage, score, teams, objectives, matchmaking, persistence, gameplay HUD, hosted deployment, analytics, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 31 Done Criteria

Phase 31 is done when:

- `/playtest.html` has a local-only deterministic hit-proof helper for browser smoke.
- The helper aims at an existing remote placeholder and sends only the existing `client.fire` intent through the existing browser transport path.
- A live browser smoke with two `/playtest.html` clients observes a remote placeholder, an accepted miss visual, an accepted hit visual, remote target accent on hit, transient effect expiry, and reconnect cleanup.
- Focused tests cover deterministic remote aim derivation and accepted hit/miss effect expiry.
- Static browser-page smoke checks the hit-proof helper is present in the served playtest bundle.
- Existing protocol shape, server fire validation semantics, damage, combat authority, movement authority, collision authority, snapshots, loadout authority, round authority, and transport selection remain unchanged.
- Diagnostics page and `/sandbox.html` still work.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No weapon gameplay, ammo, reloads, weapon identities, client-owned hits, client-owned damage, score, teams, objectives, matchmaking, persistence, gameplay HUD, hosted deployment, analytics, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 32 Done Criteria

Phase 32 is done when:

- `/playtest.html` renders remote players through a renderer-only presentation helper in `apps/client`.
- Remote presentation consumes existing interpolated remote placeholder poses only.
- The remote stand-in has readable abstract body height, a facing marker, a target-center reference, neutral color/material treatment, stable arena-relative scale, and a subtle hit/accent response from existing fire-result presentation state.
- Compact playtest diagnostics expose remote model count, highlighted target id, and representative interpolation source tick.
- Focused DOM-free tests cover remote presentation geometry metadata, model count/source tick metadata, hit accent state, and malformed remote placeholder rejection.
- Static browser-page smoke checks the added diagnostics and remote presentation bundle.
- A live browser smoke with two `/playtest.html` clients confirms the remote stand-in appears from interpolation, facing/readability marker is present, accepted hit accent still works, movement/collision, first-person shell, and fire visuals still work, diagnostics page and `/sandbox.html` still work, and no console errors appear.
- Existing protocol shape, server runtime, snapshots, movement/collision authority, fire validation, combat/damage, loadouts, round authority, and transport selection remain unchanged.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No copied character silhouettes, uniforms, faction identity, weapon identity, gameplay HUD, teams, objectives, matchmaking, persistence, hosted deployment, analytics, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 33 Done Criteria

Phase 33 is done when:

- `/playtest.html` presents existing server-owned round and combat diagnostics through renderer-only readouts.
- Readouts cover round phase, outcome, transition cue, reset cue, local health/alive state, local combat event/cue, and remote hit cue when already derivable from existing fire-result diagnostics.
- Focused DOM-free tests cover round/combat formatting, phase-transition cue expiry, local death/reset cues, remote hit cue derivation, and malformed value handling.
- Static browser-page smoke checks the added playtest readouts and round/combat presentation bundle.
- A live browser smoke confirms `/playtest.html` connects and renders nonblank, round phase reaches active, accepted hit proof can drive existing fire/combat readouts when practical, movement/collision, first-person shell, remote player presentation, and fire visuals still work, diagnostics page and `/sandbox.html` still work, and no console errors appear.
- Existing protocol shape, server runtime, snapshots, movement/collision authority, fire validation, combat/damage authority, loadouts, round authority, and transport selection remain unchanged.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No gameplay HUD, scoreboard, economy, buy flow, teams, objectives, weapon identity, ammo, reloads, client-owned damage, client-owned health/death, client-owned round outcomes, matchmaking, persistence, hosted deployment, analytics, public asset redistribution, external asset pipeline, or WebTransport implementation exists.

## Phase 34 Done Criteria

Phase 34 is done when:

- `npm run playtest:harness` exists and remains local-only.
- The harness starts `npm run dev` when the local dev server is not reachable, or connects to an already-running local server.
- The harness opens two `/playtest.html` clients and verifies accepted connection state through the existing WebSocket fallback path.
- The harness checks primary render nonblank, remote model presence, movement/collision blocker and slide evidence, accepted miss visual, accepted hit visual through the existing diagnostics aim helper, combat death plus round ended/reset evidence when practical, reconnect transient cleanup, diagnostics page load, `/sandbox.html` load, and browser console/page errors.
- The harness prints a concise evidence summary for human review and keeps optional evidence caveats explicit.
- Focused tests cover harness summary/output parsing helpers.
- Existing protocol shape, server runtime, snapshots, movement/collision authority, fire validation, combat/damage authority, loadouts, round authority, and transport selection remain unchanged.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.
- No analytics, uploads, accounts, hosted services, persistence, remote logging, protocol changes, server authority changes, gameplay systems, teams, objectives, matchmaking, gameplay HUD, or WebTransport implementation exists.

## Phase 35 Done Criteria

Phase 35 is done when:

- The existing `npm run playtest:harness` path still passes and remains local-only over the WebSocket fallback.
- Tuning is limited to existing local loop-feel values or presentation: spawn spacing/readability, reset readability, fire visual readability, round/combat cue readability, or harness evidence text.
- Server-owned placeholder slot starts remain deterministic, clear of blockers, and readable for a two-client target while keeping movement, collision, fire, combat, and round authority on the server.
- Renderer-only fire-result and round/combat cue changes remain presentation-only and do not create gameplay HUD, weapon identity, client-owned hit results, damage, health, death, or round outcomes.
- The default reset hold is readable in local review without adding new round rules, scoring, teams, objectives, matchmaking, or persistence.
- Focused tests cover changed constants/helpers and any changed harness summary expectations.
- Existing protocol shape, transport selection, snapshots, input sequencing, movement/collision authority, fire validation, combat/damage authority, loadouts, and round authority remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.

## Phase 36 Done Criteria

Phase 36 is done when:

- Local-only network simulation profiles exist for baseline/no delay, moderate latency, jitter, and small high-rate message drop.
- The simulation is applied around the browser transport adapter or harness path, not inside gameplay rules.
- Simulation remains deterministic enough for focused tests.
- The drop profile is scoped so protocol accept, fire result, combat, loadout, and round authority messages are not intentionally dropped.
- `npm run playtest:harness:network` runs the existing local two-client `/playtest.html` evidence path across the network profiles.
- Network harness output reports profile name, simulated latency, jitter, drop rate, correction max, remote interpolation status, fire result observation, round reset observation, and console errors.
- Focused tests cover profile parsing, deterministic delay/jitter behavior, scoped drop behavior, script exposure, and summary formatting.
- Existing `npm run playtest:harness` still passes.
- Existing protocol shape, transport selection, server runtime, snapshots, input sequencing, movement/collision authority, fire validation, combat/damage authority, loadouts, and round authority remain intact.
- WebTransport remains marked pending unless a real browser WebTransport connection succeeds.

## Commands

Use these commands from the repository root:

```powershell
npm install
npm run typecheck
npm test
npm run smoke:transport
npm run smoke:browser-page
npm run validate
npm run audit:private-assets
npm run playtest:harness
npm run playtest:harness:network
```

Phase 19 also adds a local notes helper:

```powershell
npm run playtest:notes
```

This command only prints `docs/PRIVATE_PLAYTEST.md` and is not part of the repository-level `validate` script.

Phase 25 adds a local networked playtest review helper:

```powershell
npm run playtest:review
```

This command only prints local `/playtest.html` review instructions. It does not upload telemetry, write remote logs, or run analytics, and it is not part of the repository-level `validate` script.

Phase 34 adds a local automated two-player playtest harness:

```powershell
npm run playtest:harness
```

This command starts or connects to the local dev server, runs real browser automation against two `/playtest.html` clients, and prints a concise evidence summary. It uses the WebSocket fallback path, does not upload telemetry or write remote logs, and is not part of the repository-level `validate` script. If browser automation cannot fetch or run `@playwright/cli`, report the exact npm/browser error as a local automation blocker.

Phase 36 adds a local network-condition harness:

```powershell
npm run playtest:harness:network
```

This command runs the local two-client browser harness under baseline, moderate latency, jitter, and small high-rate message-drop profiles. It uses the WebSocket fallback path behind `MessageTransport`, does not upload telemetry or write remote logs, and is not part of the repository-level `validate` script. If browser automation cannot fetch or run `@playwright/cli`, report the exact npm/browser error as a local automation blocker.

Phase 21 also adds a local private asset audit:

```powershell
npm run audit:private-assets
```

This command writes `local-assets/private-asset-audit.json`. The output is intentionally ignored and is not part of the repository-level `validate` script.

`npm run validate` currently runs the focused test suite, the transport-loop smoke, and the static browser-page smoke. The static browser-page smoke checks the diagnostics page, `/sandbox.html`, and `/playtest.html`.

If the PowerShell `npm` shim is blocked by local execution policy, use the equivalent `npm.cmd` commands and report that substitution.

## Browser Smoke

Preferred automated diagnostics browser smoke:

1. Run `npm run dev`.
2. Open the printed browser dev view URL.
3. Click Connect.
4. Confirm the status changes to `accepted`.
5. Confirm match id, session id, slot index, capacity, and connected slot count are populated.
6. Confirm last sent input sequence, last acknowledged input sequence, input drop count, and input send rate are populated after placeholder input sends.
7. Confirm world id, world entity count, last world snapshot tick, local entity id, local entity position, and local entity yaw are populated from server snapshots.
8. Confirm fire validation diagnostics populate: last fire sent, last fire result, accepted/rejected state, hit/miss state, distance, target ids when present, server tick, and reject reason.
9. Confirm combat state diagnostics populate: local health, alive/dead state, death tick when dead, respawn eligibility tick when dead, and last combat event.
10. Confirm loadout diagnostics populate: profile id, status, reject reason, and selection sequence.
11. Confirm round diagnostics populate: round id, phase, outcome, winner session when present, phase timing, reset timing, last event, and round server tick.
12. Confirm developer telemetry overall status, private playtest readiness, and per-category telemetry entries are visible and update from live diagnostics.
13. Confirm predicted position, predicted yaw, correction magnitude, pending input count, replay count, and last reconciled snapshot tick are populated.
14. If practical, open a second diagnostics client and connect it so the first client reports remote entity count, buffered snapshot count, interpolation delay, sample tick/time, and a representative remote pose. If the first client has aim toward the second, fire/combat/round diagnostics may report server-owned damage, death, or reset.
15. Confirm the local entity position remains server snapshot data while the prediction fields reconcile against it after accepted placeholder input is acknowledged.
16. Confirm server tick, snapshot tick, RTT stats/history, observed tick/snapshot rates, last message time, uptime, and message counts/rates update with live data.
17. Click Disconnect, confirm `closed` and a last disconnect reason.
18. Click Connect again, confirm a new session id is assigned and world/input/fire/combat/loadout/round/prediction/remote interpolation diagnostics restart understandably.
19. Confirm no console errors appear.

Preferred renderer browser smoke:

1. Run `npm run dev`.
2. Open `http://127.0.0.1:8787/sandbox.html`.
3. Confirm a visible nonblank 3D greybox scene appears.
4. Confirm the frame counter advances.
5. Click the canvas and confirm pointer state changes when pointer lock is available.
6. Press camera sandbox movement keys and confirm the camera readout changes.
7. Confirm map id, map revision, primitive count, and spawn count are populated when the sandbox renders from metadata.
8. Confirm camera mode, eye height, player-camera pose, and metadata validation status are populated.
9. Confirm private prototype asset category controls are visible and can switch between the available groups.
10. Confirm curated private asset preset controls are visible and can switch between `scale-check`, `arena-dressing`, and `equipment-check`.
11. Confirm selected private asset category or preset reports loaded assets or failed counts cleanly.
12. Confirm the renderer-only arena dressing toggle is visible and can show/hide the dressing plan.
13. Confirm dressing plan, dressing count, dressing loaded/failed counts, and missing asset handling report cleanly.
14. Press camera sandbox movement keys and confirm the player-camera pose changes.
15. Confirm desktop and mobile viewport layouts remain usable.
16. Confirm the page reports no console errors.
17. Open `http://127.0.0.1:8787/` and confirm the diagnostics page still connects and receives live server data.

Preferred networked renderer playtest smoke:

1. Run `npm run dev`.
2. Open `http://127.0.0.1:8787/playtest.html`.
3. Confirm a visible nonblank greybox scene appears.
4. Click Connect and confirm the status changes to `accepted`.
5. Confirm local entity id, server position, predicted position, prediction correction, round phase, and render health populate.
6. Confirm prediction correction max, reconnect count, and last error readouts are visible.
7. Press movement keys and confirm the camera pose and server-owned position update from accepted input.
8. Confirm server-owned movement stops or slides against at least one original greybox blocker instead of passing through it.
9. Click primary fire and confirm the existing fire intent sequence advances.
10. Confirm a server fire result is received and the playtest page reports a visualized fire sequence, result state, hit/miss/rejected state, active tracer count, and expired effect count while effects appear and clear.
11. If practical, open a second `/playtest.html` or diagnostics client and connect it so the first playtest page reports a remote count and renders a remote placeholder; when the server result names that remote target, confirm the remote placeholder receives a readability accent.
12. For the Phase 31 accepted-hit proof, open a second `/playtest.html` client, connect both clients, then run `window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.aimAtRemoteAndFire()` in the primary client console. Confirm the returned target metadata is populated, the result reaches `accepted hit`, the remote target accent appears, active tracer count rises, expired effect count rises after the effects clear, and reconnect resets transient fire visuals.
13. For the Phase 32 remote presentation proof, confirm remote model count is greater than zero, remote source tick is populated, facing marker and target-center readouts are greater than zero, the facing/readability marker is visible on the remote stand-in, and the highlighted target id matches the hit target while the hit accent is active.
14. For the Phase 33 round/combat presentation proof, confirm round phase reaches active, round outcome reports none during the active proof, local health/life readouts populate, remote combat cue appears after the accepted-hit helper when practical, and local combat/death/reset cues are visible if the short smoke can naturally drive them.
15. For the Phase 34 automated harness proof, run `npm.cmd run playtest:harness` and confirm the summary reports two clients, render, movement/collision, accepted miss, accepted hit, combat/round, reconnect cleanup, baseline pages, and browser console results.
16. For the Phase 36 network-condition proof, run `npm.cmd run playtest:harness:network` and confirm the summary reports baseline, moderate latency, jitter, and small-drop profiles with profile settings, correction max, remote interpolation status, fire result observation, round reset observation, and console errors.
17. Click Disconnect, reconnect, and confirm readouts reset understandably and reconnect count increments.
18. Confirm desktop and mobile viewport layouts remain usable.
19. Open `http://127.0.0.1:8787/sandbox.html` and confirm it remains nonblank.
20. Open `http://127.0.0.1:8787/` and confirm the diagnostics page still connects.
21. Confirm no console errors appear.

If browser automation is unavailable, run the same steps manually and report the observed values. Do not claim the browser view works unless it connected and displayed live server data.

## Reporting Blocked Commands

If a command cannot run, report:

- Exact command.
- Exit code if available.
- Relevant error text.
- Likely reason.
- What was inspected instead.

Do not report blocked commands as passing.

## Documentation Inspection

For docs-only changes, inspect the requested deliverable list against the file tree. Report any missing file or mismatch directly.
