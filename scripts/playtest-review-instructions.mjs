export function createPlaytestReviewInstructions() {
  return `# Phase 25 Networked Playtest Feel Review

This command prints a local-only checklist for /playtest.html. It does not upload telemetry, start analytics, create accounts, or write remote logs.

Run:

1. npm.cmd run dev
2. Open http://127.0.0.1:8787/playtest.html
3. Optional automated harness: npm.cmd run playtest:harness
4. Optional notes path: local-assets/playtest-review/<date>-notes.md

Collect evidence:

- Connection: connection reaches accepted over the WebSocket fallback, and WebTransport remains pending/unproven.
- Local movement feel: press movement keys and record whether the camera and server-owned position changes feel stable.
- Prediction correction: record prediction correction current/max and whether large corrections are visible or repeated.
- Remote presentation: if practical, connect a second local client and record remote count, remote model count, remote source tick, facing marker readability, and target-center readability.
- Accepted hit proof: with two local clients connected, use the browser console helper window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.aimAtRemoteAndFire() on the primary client to aim at the first remote placeholder and send the existing client.fire intent. Record accepted hit, highlighted remote target, tracer expiry, and reconnect cleanup.
- Round/combat presentation: record round phase/outcome, transition/reset cue, local health/life, local combat cue, and remote combat cue after the accepted-hit proof when available.
- Automated harness: record the npm.cmd run playtest:harness summary for two clients, render, movement/collision, accepted miss, accepted hit, combat/round, reconnect cleanup, baseline pages, browser console, and any explicit caveat lines.
- Reconnect: disconnect and reconnect, then record reconnect count, session change, and whether readouts reset understandably.
- Errors: record last error, browser console errors, and server terminal errors.
- Desktop and mobile: check desktop and mobile viewport usability for readouts and controls.
- Baseline pages: confirm /sandbox.html renders nonblank and / still connects.

Keep manual notes, screenshots, and clips local unless the tester intentionally shares them. Store generated or manual notes under local-assets/playtest-review/ so they remain ignored by git.
`;
}
