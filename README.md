# Breachline

Breachline is an original browser tactical FPS experiment inspired by the feel of early PC mod-era shooters without copying names, maps, assets, sounds, UI, weapon identities, factions, or presentation from existing games.

The project is currently in **Phase 36: Local Network-Condition Simulation**. Phases 1-19 created the repository spine, local transport loop, browser diagnostics, binary protocol, fixed match slots, input sequencing, placeholder world snapshots, a client-only Three.js greybox renderer sandbox, server-owned flat-plane placeholder movement, client-only local prediction/reconciliation, remote interpolation diagnostics, a narrow original map metadata contract, client-only player-camera integration, server-owned fire validation, server-owned combat state, a minimal authoritative loadout-selection contract, server-owned round flow, diagnostics-only developer telemetry, and local private playtest notes. Phase 20 added renderer-tooling controls for ignored local prototype GLBs without changing server authority. Phase 21 added a local-only audit command and candidate tag contract for private prototype asset review. Phase 22 added curated renderer-only sandbox presets over already-listed private assets. Phase 23 added a hand-curated renderer-only dressing plan for the original greybox arena. Phase 24 added a local networked renderer playtest page over the validated WebSocket fallback without changing protocol or server authority. Phase 25 added a local-only playtest review checklist, command, and extra developer readouts for judging networked renderer feel. Phase 26 added a shared greybox collision contract derived from the original arena metadata and applied it to server-authoritative movement. Phase 28 added a simple local first-person presentation shell to `/playtest.html` without adding weapon gameplay or authority. Phase 29 visualizes existing server-owned fire results in `/playtest.html` with abstract renderer-only tracers, impact/reject markers, and target readability accents. Phase 30 tunes those renderer-only effects for local playtest readability and expiry diagnostics without changing server authority. Phase 31 adds a local-only deterministic hit-proof helper so browser smoke can reliably aim at an existing remote placeholder and observe an accepted server-owned hit result. Phase 32 replaces the remote marker with a clearer abstract low-detail stand-in derived only from remote interpolation presentation state. Phase 33 formats existing server-owned round/combat diagnostics into compact `/playtest.html` readouts without changing gameplay authority. Phase 34 adds a local-only automated two-player browser harness that drives the existing playtest evidence path and prints a concise summary. Phase 35 uses that local evidence to tune existing spawn spacing, reset timing, and renderer-only fire/combat cue readability without changing protocol shape or weakening server authority. Phase 36 adds local-only network-condition simulation profiles around the browser `MessageTransport` path and harness evidence output without changing protocol or server authority.

## Current Direction

- Browser client with a renderer boundary that can later host a first-person scene.
- Authoritative TypeScript server prepared for WebTransport.
- Shared protocol and real-time type definitions in a workspace package.
- Transport-agnostic message adapter with a validated WebSocket fallback while WebTransport remains blocked by local HTTP/3/TLS setup.
- Browser development view for connection state, authoritative ticks, snapshot placeholders, ping RTT stats/history, observed tick/snapshot cadence, message counts/rates, uptime, and disconnect reasons.
- Client-only Three.js renderer sandbox with an original greybox test space and camera sandbox movement for inspection.
- Server-authoritative placeholder player movement driven only by accepted input commands and fixed ticks.
- Server-authoritative greybox collision against static blockers and world bounds derived from original arena metadata.
- Client-side prediction and reconciliation diagnostics layered over server authority.
- Client-side remote interpolation diagnostics layered over buffered authoritative snapshots for non-local entities.
- Original arena blockout metadata for renderer/bounds/spawn-marker inspection without gameplay integration.
- Client-only player-height camera presentation in the renderer sandbox, bounded by validated metadata and separated from server authority.
- Server-owned placeholder hitscan validation for accepted sessions, with browser diagnostics for fire result authority only.
- Server-owned placeholder combat state for health/death/respawn diagnostics only.
- Server-validated placeholder loadout state for diagnostics and server-owned combat defaults only.
- Server-owned round phase, outcome, and reset diagnostics for setup, active, ended, and reset states.
- Diagnostics-only developer telemetry that summarizes existing connection, cadence, prediction, interpolation, loadout, fire, combat, round, and error signals.
- Local private playtest notes for the proven WebSocket fallback path, browser caveats, and tester observations.
- Ignored private prototype GLB catalog controls in the renderer sandbox for local visual inspection only.
- Local-only private prototype GLB audit output and candidate tags for preview, scale-check, and replacement planning.
- Curated renderer-only private asset presets for scale, arena dressing, and equipment inspection.
- Renderer-only arena dressing placements for the original greybox map, kept separate from map metadata and gameplay authority.
- Networked renderer playtest view that combines the existing greybox renderer, client prediction/reconciliation, polished remote interpolation stand-ins, and WebSocket fallback connection path for local inspection only.
- Local-only networked playtest review checklist and command for collecting connection, movement feel, prediction correction, remote placeholder, reconnect, desktop/mobile, and error evidence.
- Renderer-only first-person placeholder hands/equipment shell in `/playtest.html`, attached to the local camera and separated from fire validation, movement, collision, snapshots, and server authority.
- Renderer-only fire-result presentation in `/playtest.html`, derived from existing `server.fire.result` diagnostics and kept separate from weapon systems, hit authority, damage, and protocol shape.
- Fire-result readability timing, mesh-based tracers, target accent visibility, deterministic local hit-proof aiming, remote stand-in readability, and effect-expiry diagnostics for local playtest review only.
- Renderer-only round/combat presentation in `/playtest.html` for phase, outcome, transition/reset cues, local health/alive state, and remote hit cues derived from existing diagnostics only.
- Local-only two-player playtest harness that starts or connects to the dev server, opens two `/playtest.html` clients, drives movement/fire/round/reconnect checks, and reports evidence without analytics or uploads.
- Local loop-feel tuning for the current two-player prototype: wider neutral server-owned slot starts, longer reset hold/readout time, and longer renderer-only fire/combat cues while preserving the existing authority boundaries.
- Local-only network simulation profiles for baseline, moderate latency, jitter, and small high-rate message drop around the browser transport adapter path.
- Original small-team tactical round design with placeholder contracts only.
- Future support for latency and loss simulation during multiplayer testing.

## Setup

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

There is no full game in Phase 36. The current validation target is that the TypeScript skeleton builds, focused tests pass, the local transport-loop smoke exchanges binary messages over the fallback adapter, the diagnostics page is served, server snapshots include server-owned placeholder position/facing data that slides or stops against shared greybox collision, prediction diagnostics reconcile to local snapshots while optionally mirroring the same collision helper for presentation feel, remote interpolation diagnostics sample non-local entities from buffered snapshots, the map metadata contract validates, the server returns authoritative fire, combat-state, loadout, and round-flow diagnostics, developer telemetry summarizes those signals without changing runtime authority, the renderer sandbox page displays a nonblank local greybox scene through a client-only player camera derived from presentation data, metadata bounds, category-filtered private previews, curated private asset presets, and optional renderer-only arena dressing placements, the networked playtest page renders the greybox with local prediction, polished remote stand-ins, a camera-attached first-person placeholder shell, abstract server-fire-result visuals, and compact round/combat readouts over the WebSocket fallback, fire-result effects remain readable long enough for local observation and clear cleanly, the local diagnostics hook can aim at an existing remote placeholder for an accepted-hit proof without changing server authority, the playtest review command prints local-only evidence instructions, the automated playtest harness can drive the two-client evidence path locally, Phase 35 tuning keeps slot starts readable and reset/fire/combat cues observable, Phase 36 network simulation can run local baseline, latency, jitter, and high-rate drop harness profiles, and the local private asset audit writes ignored output without auto-loading every GLB.

For local browser inspection, run:

```powershell
npm run dev
```

Then open the printed browser dev view URL, normally `http://127.0.0.1:8787`, and use the Connect button. The diagnostics page defaults to the matching WebSocket fallback URL and shows diagnostics for RTT, cadence, message rates, uptime, match slots, input acknowledgements, fire validation results, server-owned combat state, server-validated loadout state, server-owned round phase/outcome/reset state, world snapshots, local assigned entity position/facing reported by the server, client prediction/reconciliation status, and remote interpolation state when another accepted client is present.

Open the networked renderer playtest at:

```text
http://127.0.0.1:8787/playtest.html
```

The playtest page connects through the existing browser WebSocket fallback adapter, sends the same placeholder input command envelope as diagnostics, can send the existing `client.fire` intent, drives the local camera from client prediction/reconciliation over server snapshots, renders remote players as original low-detail stand-ins from remote interpolation, displays a simple original first-person shell attached to the camera, renders readable abstract fire-result effects from server-owned `server.fire.result` data, and formats existing round/combat diagnostics as compact playtest readouts. For local smoke only, `window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.aimAtRemoteAndFire()` can aim at the first remote placeholder and send the existing fire intent so accepted hit presentation is repeatable. Server snapshots, combat state, round state, and fire results remain authoritative. It is not a gameplay HUD and does not alter protocol, combat authority, round authority, private asset policy, or WebTransport status.

The default placeholder round is intentionally long enough for local movement-feel review, so `/playtest.html` should not hit a timeout/reset cadence during normal short tests. Focused server tests still use shorter configured rounds to prove timeout and reset behavior.

For local private playtest guidance, run:

```powershell
npm run playtest:notes
npm run playtest:review
npm run playtest:harness
npm run playtest:harness:network
```

These notes, review instructions, and harness output are for local development handoff only. They do not add analytics, crash reporting, accounts, hosted deployment, matchmaking, persistence, or any external telemetry upload. Manual playtest notes should stay under ignored `local-assets/playtest-review/`.

`npm run playtest:harness` starts `npm run dev` when port `8787` is not already serving the app, opens two local `/playtest.html` browser clients through Playwright, checks the existing WebSocket fallback path, then prints an evidence summary. `ok` means the harness observed that local browser condition. `caveat` means the command stayed honest about optional or timing-sensitive evidence. A sandboxed npm cache/network failure while fetching `@playwright/cli` is an environment blocker, not a gameplay result.

`npm run playtest:harness:network` runs the same local browser evidence path under baseline, moderate latency, jitter, and small high-rate message-drop profiles. The simulation wraps the browser `MessageTransport` path for local testing only. It reports profile settings, correction max, remote interpolation status, fire result observation, round reset observation, and console errors. It does not prove WebTransport and does not change server authority.

Open the renderer sandbox at:

```text
http://127.0.0.1:8787/sandbox.html
```

The sandbox uses local Three.js assets served by the development server and derives its greybox primitives from the Phase 13 map metadata. It can optionally preview ignored local GLBs from `apps/client/public/assets/private-prototype/` by category, curated preset, or renderer-only arena dressing toggle. Its camera movement, category previews, preset previews, and dressing placements are client-only inspection tools and do not affect server state, input validation, match state, authoritative movement, spawn authority, collision, protocol packets, map metadata, or world snapshots.

For private asset review, run:

```powershell
npm run audit:private-assets
```

The audit writes `local-assets/private-asset-audit.json`, which is ignored. See [docs/PRIVATE_ASSET_AUDIT.md](docs/PRIVATE_ASSET_AUDIT.md) for candidate tags and interpretation.

The Node dev client from Phase 2 is still available with `npm run dev:client` when a server is already running.

## Repository Layout

```text
apps/
  client/          Browser client placeholder
  server/          Authoritative server placeholder
packages/
  shared/          Shared protocol constants and message types
docs/              Focused design contracts and validation notes
```

## Key Documents

- [AGENTS.md](AGENTS.md) - instructions for future Codex agents.
- [GUARDRAILS.md](GUARDRAILS.md) - non-negotiable project rules.
- [ARCHITECTURE_SPINE.md](ARCHITECTURE_SPINE.md) - intended system boundaries.
- [CODING_STANDARDS.md](CODING_STANDARDS.md) - TypeScript, protocol, and loop standards.
- [ROADMAP.md](ROADMAP.md) - 20-goal roadmap with the current phase marked.
- [docs/NETWORKING_MODEL.md](docs/NETWORKING_MODEL.md) - WebTransport model and fallback path.
- [docs/GAMEPLAY_CONTRACT.md](docs/GAMEPLAY_CONTRACT.md) - early gameplay boundaries.
- [docs/PRIVATE_ASSET_USAGE.md](docs/PRIVATE_ASSET_USAGE.md) - local-only private prototype asset rules.
- [docs/PRIVATE_ASSET_AUDIT.md](docs/PRIVATE_ASSET_AUDIT.md) - local private GLB audit and candidate tag guide.
- [docs/NETWORKED_PLAYTEST_REVIEW.md](docs/NETWORKED_PLAYTEST_REVIEW.md) - local-only `/playtest.html` feel-review checklist.
- [docs/VALIDATION.md](docs/VALIDATION.md) - done criteria and validation reporting.

## Next Milestone

The next milestone should move toward the next renderer/playtest lane only after the Phase 36 network-condition harness keeps two-client connection, movement/collision, accepted miss/hit visuals, combat/round transition, reconnect cleanup, diagnostics, and sandbox proofs stable under at least baseline and one impaired profile.
