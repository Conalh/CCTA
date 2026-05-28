# Networking Model

## Why WebTransport

WebTransport is the intended browser transport because it supports modern low-latency multiplayer patterns in the browser:

- Reliable streams for ordered control data.
- Unreliable datagrams for time-sensitive state that can be dropped.
- Browser-native APIs without requiring a native client.
- A model that can later support latency and packet-loss testing.

The tradeoff is local setup complexity. WebTransport requires HTTP/3 and TLS, which can block early development if certificates or runtime support are not ready.

## Reliable Streams

Reliable streams should carry data that must arrive in order:

- Protocol version handshake.
- Session acceptance or rejection.
- Ping/pong control messages.
- Match assignment.
- Low-frequency configuration.
- Round lifecycle diagnostics.

Reliable streams must not become the default path for high-rate snapshots or input if the data can be superseded.

## Datagrams

Datagrams should carry data where freshness matters more than guaranteed delivery:

- Future client input frames.
- Future server snapshots.
- Future lightweight telemetry.

Datagram messages must include enough sequence or tick information to detect stale packets, drops, and reordering.

## Tick-Rate Assumptions

The initial authoritative server target is 60 Hz. This is a target contract, not proof that every hosted environment will sustain it.

Early measurements should track:

- Server tick duration.
- Tick drift.
- Snapshot cadence.
- Input queue depth.
- Datagram drop behavior.
- Client-observed round-trip time.

## Input And Snapshot Model

The intended future flow:

1. Client samples input at a fixed cadence.
2. Client sends sequenced input frames to the server.
3. Server validates inputs and advances authoritative state on fixed ticks.
4. Server sends snapshots tagged with tick numbers.
5. Client renders interpolated state and later may predict local motion.

Phase 1 does not implement this flow. It only defines where the flow will live.

## Prediction And Interpolation Notes

Prediction and interpolation are future client systems. They must be layered on top of server authority:

- Prediction may estimate local presentation only.
- Reconciliation must accept server correction.
- Interpolation should use buffered snapshots and never invent server truth.
- Remote players should be rendered from snapshot history, not current local guesses.

## Fallback If HTTP/3 Or TLS Blocks

If local WebTransport setup blocks the next milestone, use a temporary loopback fallback only to prove protocol shape and authoritative tick behavior.

Allowed fallback:

- Local HTTP or WebSocket control path for ping/tick proof.
- Same shared protocol message shapes.
- Clear documentation that this is temporary.

Not allowed fallback:

- Redesigning the project around a different permanent transport without a new milestone decision.
- Building gameplay while WebTransport remains unproven.
- Hiding TLS or HTTP/3 blockers in success reports.

## Phase 2 Transport Spike Result

Phase 2 validates the transport loop through a WebSocket fallback behind the shared `MessageTransport` adapter. The fallback uses the same shared protocol helpers as the future WebTransport path.

WebTransport was not claimed as working. The blocker is local server support: the current Node/TypeScript stack does not include an HTTP/3 plus TLS WebTransport server endpoint that a browser can connect to. Until that exists, WebSocket is the temporary local proof path.

The validated fallback proves:

- Client connects to a local server.
- Client sends hello, ping, and input-placeholder messages.
- Server accepts the protocol version, returns pong, records input sequence numbers, and emits fixed-rate tick plus snapshot-placeholder messages.
- Runtime code depends on the transport adapter, not directly on WebSocket APIs.

## Phase 4 Binary Packet Draft

Phase 4 replaces the JSON placeholder protocol with a compact binary packet layer in `packages/shared`. The transport adapters send binary payloads, but client and server runtime code still work with typed protocol messages through `MessageTransport`.

All multi-byte numeric fields use **little-endian** byte order.

### Header

Every packet starts with a 12-byte header:

| Offset | Size | Field | Notes |
| --- | ---: | --- | --- |
| 0 | 1 | Magic byte 0 | ASCII `B` (`0x42`) |
| 1 | 1 | Magic byte 1 | ASCII `L` (`0x4c`) |
| 2 | 1 | Protocol version | Current value is `1` |
| 3 | 1 | Packet kind | Numeric kind from shared protocol constants |
| 4 | 4 | Sequence or tick | Unsigned 32-bit little-endian; `0` when not relevant |
| 8 | 4 | Payload length | Unsigned 32-bit little-endian byte count |

### Packet Kinds

| Kind | Message |
| ---: | --- |
| 1 | `protocol.hello` |
| 2 | `protocol.accept` |
| 3 | `protocol.reject` |
| 4 | `ping` |
| 5 | `pong` |
| 6 | `client.input` placeholder |
| 7 | `server.tick` |
| 8 | `server.snapshot` placeholder |
| 9 | `match.assigned` |
| 10 | `match.update` |
| 11 | `input.ack` |
| 12 | `client.fire` |
| 13 | `server.fire.result` |
| 14 | `server.combat.state` |
| 15 | `client.loadout.select` |
| 16 | `server.loadout.state` |
| 17 | `server.round.state` |

### Payloads

- `protocol.hello`: UTF-8 client name. The header version is passed through so the server can return `protocol.reject`.
- `protocol.accept`: `serverTickRateHz` as unsigned 16-bit little-endian.
- `protocol.reject`: UTF-8 reason.
- `ping`: `clientTimeMs` as 64-bit float.
- `pong`: `clientTimeMs` and `serverTimeMs` as 64-bit floats.
- `client.input`: `clientTimeMs` as 64-bit float, `buttons` as unsigned 32-bit integer, `yaw` as 32-bit float, `pitch` as 32-bit float.
- `server.tick`: `serverTimeMs` as 64-bit float.
- `server.snapshot`: `serverTimeMs` as 64-bit float, `sessionCount` as unsigned 32-bit integer, `worldId` as unsigned 32-bit integer, `entityCount` as unsigned 16-bit integer, then `entityCount` placeholder entity records. Each entity record is `entityId` as unsigned 32-bit integer, `sessionId` as unsigned 32-bit integer, `slotIndex` as unsigned 16-bit integer, `active` as unsigned 16-bit flags, then `x`, `y`, `z`, and `yaw` as 32-bit floats.
- `match.assigned`: `matchId` and `sessionId` as unsigned 32-bit integers, then `slotIndex`, `capacity`, and `connectedSlots` as unsigned 16-bit integers.
- `match.update`: `matchId` as an unsigned 32-bit integer, then `capacity` and `connectedSlots` as unsigned 16-bit integers.
- `input.ack`: `sessionId`, `lastAcceptedInputSequence`, and `droppedInputCount` as unsigned 32-bit integers.
- `client.fire`: `clientTimeMs` as 64-bit float, `clientTick` as unsigned 32-bit integer, `yaw` as 32-bit float, and `pitch` as 32-bit float. The header sequence is the fire sequence.
- `server.fire.result`: `sessionId` and `serverTick` as unsigned 32-bit integers, `flags` as unsigned 16-bit flags for accepted/hit, `rejectReason` as unsigned 16-bit enum, `targetEntityId` and `targetSessionId` as unsigned 32-bit integers, and `distance` as a 32-bit float. The header sequence is the fire sequence.
- `server.combat.state`: `sessionId`, `entityId`, `deathTick`, `respawnEligibleTick`, `lastEventTick`, `lastEventSequence`, `sourceSessionId`, `targetSessionId`, and `damage` as unsigned 32-bit integers; `health`, `maxHealth`, `flags`, and `lastEventKind` as unsigned 16-bit integers. The header tick is the server tick.
- `client.loadout.select`: `profileId` as an unsigned 16-bit enum plus a reserved unsigned 16-bit field. The header sequence is the loadout selection sequence.
- `server.loadout.state`: `sessionId` and `sequence` as unsigned 32-bit integers; `profileId`, `status`, `rejectReason`, and a reserved field as unsigned 16-bit integers. The header tick is the server tick.
- `server.round.state`: `roundId`, `winnerSessionId`, `phaseStartedTick`, `phaseEndsTick`, `resetReadyTick`, `lastEventTick`, and `lastEventSequence` as unsigned 32-bit integers; `phase`, `outcome`, `lastEventKind`, and a reserved field as unsigned 16-bit integers. The header tick is the server tick.

Malformed packets, invalid magic, payload length mismatches, unsupported non-hello versions, and unknown packet kinds must be rejected.

## Phase 6 Match Session Metadata

Phase 6 adds a server-owned in-memory match container with a fixed capacity of 4 placeholder slots. Accepted clients receive `protocol.accept`, then `match.assigned`, then `match.update` through the existing `MessageTransport` seam. Over-capacity clients receive `protocol.reject` with the reason `Match is full.` and are not admitted into the authoritative tick/snapshot stream.

Disconnects mark the slot disconnected and make that capacity available to a later transport session. A reconnect receives a new server-owned `sessionId`; slot indexes may be reused after disconnect. This is session metadata only, not matchmaking, teams, spawning, movement, loadouts, or gameplay state.

## Phase 7 Input Command Pipeline

Phase 7 keeps the existing `client.input` packet shape and treats it as a placeholder command envelope. Runtime code sends it through `MessageTransport`; the server validates it only after protocol acceptance and match assignment.

For each accepted session, the server tracks:

- Server-owned `sessionId`.
- Last accepted input sequence.
- Count of dropped stale, duplicate, or invalid placeholder inputs.

Input sequence numbers must be strictly increasing for that session. Duplicate or stale sequence numbers are ignored and do not advance the last accepted sequence. Non-finite `clientTimeMs`, `yaw`, or `pitch`, invalid button masks, or invalid sequence numbers are also ignored. The server responds with `input.ack` so the browser can show input-pipeline diagnostics, but no movement, physics, prediction, interpolation, or gameplay state is produced in this phase.

## Phase 8 World Snapshot Shell

Phase 8 adds a server-owned in-memory world state shell. It exists only to prove that authoritative world metadata can be produced and serialized in snapshots.

The world shell tracks:

- Stable `worldId`.
- Deterministic placeholder `entityId` values.
- Server-owned `sessionId` references from accepted match assignments.
- Slot indexes for connected placeholder player entities.

When a session is accepted into a match slot, the server creates a placeholder world entity. When that session disconnects, the entity is removed from later snapshots. Snapshots include world id, tick, entity count, and active entity/session references. Phase 8 did not include movement, physics, collision, map gameplay, teams, weapons, prediction, interpolation, or renderer state.

## Phase 10 Server Movement Snapshot

Phase 10 extends the snapshot entity record with server-owned placeholder position and facing fields:

- `x`, `y`, and `z` describe the server-owned placeholder entity location.
- `yaw` describes server-owned flat-plane facing.
- The server advances these fields only on the fixed tick loop from accepted `client.input` button and yaw data.
- Clients never send trusted positions.
- Invalid, stale, duplicate, or dropped input does not update movement state.
- The browser diagnostics page may display these fields, but it must not treat them as prediction, interpolation, renderer integration, combat state, or gameplay HUD data.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 16 Server-Owned Combat State

Phase 16 adds `server.combat.state` as an authoritative diagnostic message. The server owns health, alive/dead state, death tick, respawn eligibility tick, minimal reset events, and last combat event metadata. Clients do not send damage, health, death, respawn truth, score, target confirmation, ammo, or reload state.

Damage is applied only when the runtime has already produced an accepted server-owned fire result. Dead entities are not valid movement actors, firing sources, or hitscan targets until the server advances to their respawn eligibility tick and restores them through the reset path. This phase does not add teams, scoring, ammo, reloads, weapon identity, map collision, lag compensation, persistence, art, or gameplay HUD.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 17 Server-Validated Loadout State

Phase 17 adds a narrow `client.loadout.select` intent and `server.loadout.state` diagnostic response. The client sends only a loadout selection sequence and one shared generic placeholder profile id. It does not send damage, fire rate, ammo, reload state, health, score, target rules, combat outcomes, weapon identity, inventory contents, or round truth.

The server validates loadout selection only after protocol acceptance and match assignment. The server owns the accepted loadout state and may use it only as a placeholder combat default for later authoritative fire/combat resolution. Rejections are explicit for not accepted, no match assignment, invalid profile id, stale sequence, and already-selected state.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 18 Server-Owned Round State

Phase 18 adds `server.round.state` as a server-to-client diagnostics message. It reports only server-owned round id, phase, outcome, winner session when one exists, phase timing, reset timing, and last round event metadata.

Clients do not send round-state commands or outcomes. The server derives elimination from accepted session/combat state and derives timeout from authoritative ticks. Movement, fire, loadout selection, respawn, damage application, and reset behavior are gated by the current round phase. The reset path restores server-owned placeholder movement, combat, and loadout state for another prototype round.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 19 Developer Telemetry

Phase 19 adds browser developer telemetry derived from already-observed diagnostics state. It may summarize connection state, tick/snapshot cadence, prediction, remote interpolation, loadout, fire, combat, round, and error status for local inspection.

Telemetry must stay local and diagnostics-only:

- It must not alter packet cadence, simulation timing, server authority, combat outcomes, round outcomes, or transport selection.
- It must not bypass `MessageTransport` or read browser transport APIs outside the adapter layer.
- It must not upload analytics, crash reports, logs, traces, or tester data to an external service.
- WebSocket fallback remains the proven local path; WebTransport remains pending until a real browser connects over HTTP/3 plus TLS.

## Phase 24 Networked Renderer Playtest

Phase 24 adds `/playtest.html` as a local browser renderer view over the existing WebSocket fallback path. It still connects through the browser transport adapter and handles protocol messages through `MessageTransport`; it does not construct browser transport APIs in renderer code.

The playtest page may send the same placeholder `client.input` command envelope used by diagnostics and may derive local presentation from prediction/reconciliation plus authoritative snapshots. Remote placeholders may be rendered from buffered remote interpolation state. The page must not change protocol shape, server simulation, round authority, combat authority, or WebTransport status.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 29 Renderer Fire-Result Presentation

Phase 29 does not change transport behavior or packet shape. `/playtest.html` visualizes existing `client.fire` and `server.fire.result` traffic after it has already crossed the `MessageTransport` boundary.

The client may render abstract local fire-intent feedback and server-result-driven tracers, impact/reject markers, and target readability accents. These visuals are presentation only: they do not create client-owned hit results, damage, target truth, ammo, reload state, movement authority, collision truth, snapshot data, combat outcomes, round outcomes, or new transport behavior.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 30 Fire-Result Readability Review

Phase 30 does not change transport behavior, packet shape, server fire validation, or authority. It only tunes `/playtest.html` presentation over already-received `server.fire.result` data.

The client may lengthen renderer-only effect lifetimes, use thicker abstract tracer geometry, improve target-accent visibility, and expose compact expiry diagnostics. These changes do not alter `client.fire`, `server.fire.result`, movement, collision, combat, snapshots, round state, loadout authority, or transport selection.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 31 Authoritative Hit-Result Readability Proof

Phase 31 does not change transport behavior, packet shape, server fire validation, or authority. It adds a local-only `/playtest.html` diagnostics hook that computes a presentation aim toward an existing remote placeholder and sends the existing `client.fire` intent through the same browser transport path.

The resulting accepted hit is still owned by the server and arrives as the existing `server.fire.result` message. The helper does not place server entities, send client-owned hit data, alter snapshots, bypass `MessageTransport`, change damage/combat rules, or promote WebTransport status.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 32 Remote Player Presentation Polish

Phase 32 does not change transport behavior, packet shape, snapshots, server runtime, movement/collision authority, or fire validation. `/playtest.html` still receives authoritative snapshots through `MessageTransport`, updates the existing remote interpolation state, and renders only the interpolated remote presentation poses.

The client may replace the renderer-only remote placeholder geometry with a clearer abstract stand-in, facing marker, target-center reference, and hit accent derived from existing fire-result presentation state. These visuals do not create client-owned positions, hit results, damage, teams, loadouts, weapon identity, snapshot data, or new transport behavior.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 33 Round/Combat Playtest Presentation

Phase 33 does not change transport behavior, packet shape, snapshots, server runtime, round authority, combat/damage authority, movement/collision authority, fire validation, loadout authority, or transport selection. `/playtest.html` only formats already-received `server.round.state`, `server.combat.state`, and `server.fire.result` diagnostics after they cross the `MessageTransport` boundary.

The client may show compact renderer/playtest readouts for phase, outcome, transition/reset cues, local health/alive state, local combat event, and remote hit cues derived from existing fire-result diagnostics. These readouts do not create client-owned round outcomes, damage, health, death, respawn truth, score, teams, objectives, weapon identity, economy, or gameplay HUD behavior.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 34 Local Playtest Harness

Phase 34 does not change transport behavior, packet shape, snapshots, server runtime, authority, or transport selection. `npm run playtest:harness` is local automation around the existing browser pages: it starts or connects to the local dev server, opens two `/playtest.html` clients, and drives the already-existing WebSocket fallback path through `MessageTransport`.

The harness output is evidence for local browser behavior only. It must not be treated as WebTransport proof, internet playtest telemetry, hosted deployment readiness, analytics, or a gameplay networking change.

## Phase 35 Local Loop-Feel Tuning

Phase 35 does not change transport behavior, packet shape, snapshots, or transport selection. It tunes existing server-owned placeholder start spacing and reset timing plus renderer-only presentation cue lifetimes after the data has already crossed the `MessageTransport` boundary.

The proven local path remains the WebSocket fallback. WebTransport remains pending until a real browser connects over HTTP/3 plus TLS.

## Phase 36 Local Network-Condition Simulation

Phase 36 adds a local-only browser `MessageTransport` simulation wrapper for `/playtest.html` harness runs. It can delay inbound and outbound messages, add deterministic jitter, and drop a small percentage of high-rate/superseding messages under named profiles.

The simulation layer is test tooling only:

- It does not change packet shape, encoding, protocol version, server runtime, or transport selection.
- It does not bypass `MessageTransport`; it wraps an already-created browser WebSocket fallback transport.
- It does not change server authority for movement, collision, fire validation, combat, loadouts, snapshots, or round state.
- The drop profile is scoped away from protocol accept, fire result, combat, and round authority messages so local harnesses can still prove the authoritative loop.
- Harness evidence remains local browser evidence over the WebSocket fallback, not WebTransport proof.

The proven local path remains the WebSocket fallback. WebTransport remains pending until a real browser connects over HTTP/3 plus TLS.

## Phase 25 Networked Playtest Feel Review

Phase 25 adds only a local review layer around `/playtest.html`. The page may expose extra developer readouts for frame health, prediction correction current/max, remote count, reconnect count, and last error so testers can record local feel evidence.

The review command and checklist must not upload telemetry, start analytics, write remote logs, alter transport selection, change packet cadence, or change server authority. Manual notes should remain under ignored `local-assets/playtest-review/`.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 26 Server-Authoritative Greybox Collision

Phase 26 does not change packet shape or transport behavior. Server snapshots continue to carry only server-owned entity position and yaw fields, but those positions are now advanced through shared greybox collision derived from original arena metadata.

Client prediction may mirror the same shared collision helper to reduce visible correction at static blockers. This is presentation-only; the server remains authoritative and reconciliation must still accept snapshot positions as truth.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 15 Server-Owned Fire Validation

Phase 15 adds a narrow `client.fire` intent and `server.fire.result` response. The client sends only fire sequence, client timing metadata, and aim yaw/pitch. The client does not send position, target id, hit result, damage, health, score, ammo, weapon identity, or any authoritative combat outcome.

The server validates fire intent only for accepted sessions with match assignment and an active server-owned world entity. The ray origin comes from the current authoritative world snapshot. Aim yaw/pitch are treated only as intent. Placeholder entity hit volumes are derived from active server-owned world entities, excluding the firing entity. There is no map collision, cover penetration, lag compensation, teams, damage, death, ammo, reload, or scoring in this phase.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.

## Phase 11 Client Prediction And Reconciliation

Phase 11 adds client-side prediction as a presentation-only system in `apps/client`.

The client may:

- Record locally sent input command envelopes.
- Advance a predicted local pose for diagnostics.
- Reconcile that predicted pose against the local entity in authoritative `server.snapshot` messages.
- Drop acknowledged inputs and replay only pending local inputs after a correction.
- Display prediction error, pending input count, replay count, and last reconciled snapshot tick.

The client must not:

- Send trusted positions to the server.
- Modify authoritative world state.
- Import server movement modules.
- Treat prediction as renderer integration, remote-player interpolation, combat state, or gameplay authority.

Server snapshots remain the source of truth. This still uses the WebSocket fallback locally; WebTransport is pending until HTTP/3 plus TLS support exists.

## Phase 12 Remote Snapshot Interpolation

Phase 12 adds client-side interpolation for remote presentation diagnostics only.

The client may:

- Buffer a bounded history of authoritative `server.snapshot` entity metadata.
- Exclude the assigned local session from remote interpolation.
- Sample non-local entity poses at a fixed interpolation delay.
- Interpolate `x`, `y`, `z`, and yaw across buffered snapshots.
- Display remote interpolation diagnostics in the browser dev view.

The client must not:

- Send trusted remote positions.
- Modify authoritative world state.
- Feed remote interpolation into local prediction/reconciliation.
- Couple interpolation into `/sandbox.html` or Three.js rendering yet.
- Treat interpolation as lag compensation, combat logic, gameplay HUD, or server authority.

This remains a local WebSocket fallback proof. WebTransport is still pending until a real browser can connect to an HTTP/3 plus TLS WebTransport server endpoint.
