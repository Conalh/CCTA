# Private Playtest Notes

These notes are for a small local-development handoff only. They do not describe a public release, hosted deployment, account system, analytics service, crash reporter, matchmaking service, persistence layer, or WebTransport proof.

## Current Proof Path

- Run the prototype locally with `npm.cmd run dev`.
- Open `http://127.0.0.1:8787` for the diagnostics page.
- Open `http://127.0.0.1:8787/sandbox.html` for the renderer sandbox.
- The validated browser transport path is the WebSocket fallback behind `MessageTransport`.
- WebTransport remains pending and unproven until a real browser connects to an HTTP/3 plus TLS WebTransport endpoint.

## Before A Tester Starts

1. Confirm `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run smoke:transport`, `npm.cmd run smoke:browser-page`, and `npm.cmd run validate` pass locally.
2. Start the local server with `npm.cmd run dev`.
3. Keep the terminal visible so server errors can be copied into the test notes.
4. Tell the tester this is a diagnostics prototype, not a playable game.
5. Do not collect accounts, emails, passwords, personal data, external analytics, crash reports, or uploaded telemetry.
6. No analytics, crash reporting SaaS, remote logging, or external telemetry upload is part of this phase.

## What Testers Should Record

Ask testers to record short notes, screenshots, or screen clips for:

- Connection: browser, operating system, connection state, disconnect reason, and visible errors.
- Network: RTT range, tick rate, snapshot rate, message counts, and whether reconnect worked.
- Prediction: predicted pose, correction magnitude, pending input count, and whether values keep updating.
- Remote interpolation: whether a second local diagnostics client creates remote entity telemetry.
- Loadout: accepted or rejected status and reject reason.
- Fire: accepted or rejected state, hit or miss state, and reject reason.
- Combat: health, alive state, death tick, respawn tick, and last combat event.
- Round: round id, phase, outcome, reset timing, and last round event.
- Sandbox: render health, map id, metadata validity, camera pose, and console errors.

## Known Caveats

- This handoff is local only. It is not packaged for public distribution.
- Browser data should stay on the tester's machine unless they intentionally share screenshots or notes.
- WebSocket fallback is the proven path; WebTransport remains pending.
- Multiple local browser windows may not behave like multiple real machines.
- There is no account identity, matchmaking queue, persistence, ranking, economy, gameplay HUD, weapon presentation, or hosted deployment.
- Renderer sandbox movement is client-only inspection and does not affect server authority.

## Stop Conditions

Stop the test and capture the visible state if:

- The diagnostics page does not reach `accepted`.
- Tick or snapshot values stop updating while connected.
- The browser console reports errors.
- The sandbox reports blank rendering or invalid metadata.
- The server terminal reports an exception.

After testing, stop the dev server and confirm port `8787` has no remaining listener.
