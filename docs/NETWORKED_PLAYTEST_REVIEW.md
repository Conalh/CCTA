# Networked Playtest Review

Phase 25 is a local-only feel-review checkpoint for `/playtest.html`. It helps judge whether the current networked renderer path is stable enough before adding new gameplay systems.

Manual notes, screenshots, and clips should stay under ignored `local-assets/playtest-review/` unless a tester intentionally shares them. No analytics, crash reporter, remote logging, account capture, hosted telemetry, or upload pipeline exists in this phase. WebTransport remains pending and unproven; the proven local path is still the WebSocket fallback behind `MessageTransport`.

## Automated Harness

- Run `npm.cmd run playtest:harness` from the repository root.
- The command starts the local dev server if `http://127.0.0.1:8787` is not already reachable, opens two local `/playtest.html` clients, and prints a concise evidence summary.
- `ok` means the harness observed that browser condition during the run. `caveat` means optional or timing-sensitive evidence was not observed and should be reviewed manually before treating that area as proven.
- The harness covers two accepted clients, nonblank render, remote model presence, movement/collision blocker and slide evidence, accepted miss, accepted hit, combat/round transition when practical, reconnect cleanup, diagnostics page load, sandbox load, and browser console/page errors.
- If the command fails while fetching `@playwright/cli`, report the npm error as a local automation environment blocker. Do not treat that as gameplay, transport, or renderer evidence.

## Connection

- Start with `npm.cmd run dev`.
- Open `http://127.0.0.1:8787/playtest.html`.
- Connect and confirm the status reaches `accepted`.
- Record the browser, operating system, server URL, session id if visible in automation, disconnect reason, and visible error text.

## Local Movement Feel

- Press movement keys and watch the camera pose plus server-owned position readout.
- Record whether motion starts, stops, and turns predictably.
- Treat this as placeholder movement inspection only, not final movement gameplay.

## Prediction Correction Behavior

- Record prediction correction current/max.
- Note visible snaps, repeated corrections, or values that keep growing.
- Local prediction remains presentation-only and must reconcile to server snapshots.

## Remote Placeholder Visibility

- If practical, open a second `/playtest.html` client and connect it.
- Confirm the first client reports a remote count, remote model count, and remote source tick.
- Confirm the remote stand-in shows readable body height, facing direction, and a target-center reference while remaining abstract and team-neutral.
- Record whether the remote presentation appears stable enough for inspection.

## Accepted Hit Proof

- With two local `/playtest.html` clients connected, use the primary client browser console only for this local diagnostic helper:
  `window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.aimAtRemoteAndFire()`.
- Confirm the helper returns a target entity id, target session id, yaw, pitch, and distance for the first remote placeholder.
- Confirm the primary client reports `accepted hit`, a highlighted remote target id, active tracer count, and then expired effects after the transient visuals clear.
- Treat this helper as smoke tooling only. It sets local presentation aim and sends the existing `client.fire` intent; it does not define gameplay UI, client-owned hits, damage, server placement, protocol data, or weapon behavior.

## Round And Combat Presentation

- Confirm `/playtest.html` reports round phase, outcome, round cue, reset cue, health, life, combat event, combat cue, and remote combat cue as compact readouts.
- During a normal two-client smoke, the phase should reach `active`, outcome should remain `none`, and health/life should populate from server-owned combat diagnostics.
- After the accepted-hit proof, record whether the primary client shows a remote combat cue and whether the target client shows damage/death/reset cues if the short local pass naturally reaches them.
- Treat these readouts as playtest presentation only, not a gameplay HUD, score screen, economy flow, team UI, or client-owned combat/round truth.

## Reconnect Behavior

- Disconnect and reconnect from the same page.
- Confirm reconnect count increments and the page reaches `accepted` again.
- Record whether readouts reset understandably and whether the last error is clear.

## Desktop And Mobile Usability

- Check a normal desktop viewport and a narrow mobile viewport.
- Confirm controls, canvas, frame health, correction current/max, remote count, reconnect count, and last error remain readable.
- Record any overlapping or inaccessible controls.

## Known Limitations

- This is not a gameplay HUD, score screen, weapon view, objective flow, matchmaking flow, or public playtest package.
- Renderer dressing and private prototype assets are visual inspection aids only and do not define collision, cover truth, map truth, combat truth, or public art identity.
- Local multi-window tests do not prove real network conditions.
- WebTransport remains pending until a browser connects to a real HTTP/3 plus TLS WebTransport endpoint.
