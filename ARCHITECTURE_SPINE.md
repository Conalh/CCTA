# Architecture Spine

Breachline uses a simple TypeScript monorepo split into client, server, and shared protocol packages. This document defines the ownership boundaries between those packages; the active milestone is tracked in [ROADMAP.md](ROADMAP.md). The client renderer, authoritative simulation spine, and network loop now exist as proven prototypes, while full gameplay remains intentionally deferred.

## Top-Level Shape

```text
apps/client
  Browser runtime, input capture, rendering integration, client network adapter.

apps/server
  WebTransport listener, session management, authoritative tick loop, match state.

packages/shared
  Protocol constants, message shapes, shared identifiers, serialization rules, and pure structural metadata contracts.

docs
  Design contracts, validation notes, and milestone decisions.
```

## Client Boundary

The client owns browser-facing concerns:

- Canvas or WebGL renderer integration.
- User input capture and local presentation.
- Client network connection setup.
- Future prediction and interpolation buffers.
- Client-only renderer camera presentation over validated map metadata.
- Local debug visualizations.

The client must not own authoritative simulation, damage, round outcomes, score, inventory truth, or anti-cheat decisions.

## Server Boundary

The server owns all game truth:

- WebTransport session lifecycle.
- Authentication placeholder decisions until real identity exists.
- Fixed-rate authoritative tick loop.
- Input acceptance, sequencing, and validation.
- Match state, health, death, round flow, hit confirmation, scoring, and loadout truth.
- Snapshot creation and replication policy.

The server must not import browser renderer code or depend on DOM APIs.

## Shared Boundary

`packages/shared` owns contracts that both client and server need:

- Protocol version constants.
- Message kinds and payload shapes.
- Tick-rate constants that define the target contract.
- Small value types that are stable across the wire.
- Pure structural map metadata contracts when a milestone needs client/server-readable bounds or marker descriptions.
- Pure greybox collision contracts derived from original map metadata when both server movement and client presentation need the same static blocker/world-bounds shape.

Shared code must not include:

- Renderer state.
- Server-only simulation implementations.
- Browser-only input APIs.
- Map renderer implementations, art pipelines, collision gameplay, spawn authority, or map selection policy.
- Persistence adapters.
- Large gameplay systems that would make client authority ambiguous.

## Networking Model

The intended transport is WebTransport over HTTP/3. Reliable streams are reserved for connection setup, control messages, and ordered low-frequency data. Datagrams are reserved for time-sensitive input and snapshots once the prototype reaches those milestones.

See [docs/NETWORKING_MODEL.md](docs/NETWORKING_MODEL.md) for the detailed plan.

## Simulation Loop

The server will run a fixed authoritative tick loop. The initial target is 60 Hz, represented by `SERVER_TICK_RATE_HZ` in `packages/shared`.

Future loop stages:

1. Accept timestamped input frames.
2. Validate and queue inputs by client sequence.
3. Advance the authoritative world at a fixed tick interval.
4. Emit snapshots tagged with server tick and protocol version.
5. Record enough diagnostics to test latency and packet loss behavior.

No variable-frame gameplay logic should be introduced into the server simulation.

## Rendering Boundary

Rendering belongs in `apps/client` only. The renderer will consume interpolated presentation state derived from server snapshots. It must not mutate authoritative state directly.

The renderer integration point should remain replaceable until the project proves basic networking and simulation.

Phase 14 adds a client-only first-person camera model for the renderer sandbox. It may use local presentation pose, metadata bounds, neutral spawn markers as view fallbacks, and eye-height configuration. It must not choose authoritative spawns, send trusted positions, own collision gameplay, or change server snapshots.

Phase 26 adds server-authoritative greybox collision for placeholder movement. The server consumes shared collision geometry derived from original map metadata and remains the source of truth for stopped or sliding positions. Client prediction may use the same shared helper for presentation feel, but reconciliation still accepts server snapshots as truth.

## Gameplay Systems

Full gameplay systems are deferred. The early contract is limited to small teams, original arena maps, hitscan weapons, round flow, health/death, and simple loadouts. The contract exists so future work has direction; the prototypes built so far (placeholder hitscan, combat state, loadout, round flow) stay deliberately narrow until a milestone expands them.

See [docs/GAMEPLAY_CONTRACT.md](docs/GAMEPLAY_CONTRACT.md).

## Persistence Policy

The prototype has no database and no player account persistence. Future persistence must be added only after the multiplayer loop proves useful.

Allowed before persistence exists:

- In-memory match state.
- Process-local debug configuration.
- Local development logs.

Not allowed until a milestone requires them:

- Account systems.
- Ranked progression.
- Inventories.
- Cosmetic unlocks.
- Permanent stats.

## Latency And Loss Testing

Future networking code should expose a narrow simulation layer for artificial latency, jitter, packet loss, and reordering. That layer belongs near transport/session handling and must not leak into gameplay rules.
