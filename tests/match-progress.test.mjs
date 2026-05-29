import assert from "node:assert/strict";
import test from "node:test";

import { createMatchProgress, DEFAULT_MATCH_KILL_TARGET } from "../apps/server/dist/index.js";

test("match progress declares the first session to reach the server-owned kill target", () => {
  const progress = createMatchProgress({ killTarget: 3 });
  assert.equal(progress.isMatchOver(), false);

  // Below the target: no decision.
  assert.equal(
    progress.evaluate([
      { sessionId: 1, kills: 2, deaths: 0 },
      { sessionId: 2, kills: 1, deaths: 2 }
    ]),
    false
  );
  assert.equal(progress.isMatchOver(), false);

  // Reaching the target decides the match exactly once (transition returns true).
  assert.equal(
    progress.evaluate([
      { sessionId: 1, kills: 3, deaths: 0 },
      { sessionId: 2, kills: 1, deaths: 3 }
    ]),
    true
  );
  assert.equal(progress.isMatchOver(), true);
  assert.equal(progress.winnerSessionId(), 1);

  // Already decided: no further transition even as tallies climb.
  assert.equal(progress.evaluate([{ sessionId: 2, kills: 9, deaths: 0 }]), false);
  assert.equal(progress.winnerSessionId(), 1);

  assert.deepEqual(progress.createResultMessage(50), {
    kind: "server.match.result",
    serverTick: 50,
    matchOver: true,
    winnerSessionId: 1,
    killTarget: 3
  });

  progress.reset();
  assert.equal(progress.isMatchOver(), false);
  assert.equal(progress.winnerSessionId(), 0);
});

test("match progress defaults to a positive kill target with a pending result", () => {
  const progress = createMatchProgress();
  assert.equal(progress.killTarget, DEFAULT_MATCH_KILL_TARGET);
  assert.deepEqual(progress.createResultMessage(0), {
    kind: "server.match.result",
    serverTick: 0,
    matchOver: false,
    winnerSessionId: 0,
    killTarget: DEFAULT_MATCH_KILL_TARGET
  });
});
