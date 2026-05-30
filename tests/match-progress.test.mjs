import assert from "node:assert/strict";
import test from "node:test";

import { TEAM } from "../packages/shared/dist/index.js";
import { createMatchProgress, DEFAULT_MATCH_KILL_TARGET } from "../apps/server/dist/index.js";

test("match progress declares the match when a side reaches the round target", () => {
  const progress = createMatchProgress({ killTarget: 2 });
  assert.equal(progress.isMatchOver(), false);

  // A draw round (no winner) scores nothing.
  assert.equal(progress.recordRoundResult({ winnerTeam: undefined, winnerSessionId: 0 }), false);
  assert.equal(progress.roundWins(TEAM.cops), 0);

  // Cops win round one: below the target, no match decision.
  assert.equal(progress.recordRoundResult({ winnerTeam: TEAM.cops, winnerSessionId: 1 }), false);
  assert.equal(progress.roundWins(TEAM.cops), 1);
  // Robbers take a round in between.
  assert.equal(progress.recordRoundResult({ winnerTeam: TEAM.robbers, winnerSessionId: 2 }), false);

  // Cops reach the target: the match is decided exactly once (transition returns true).
  assert.equal(progress.recordRoundResult({ winnerTeam: TEAM.cops, winnerSessionId: 7 }), true);
  assert.equal(progress.isMatchOver(), true);
  assert.equal(progress.winnerSessionId(), 7);
  assert.equal(progress.roundWins(TEAM.cops), 2);

  // Already decided: no further transition even as rounds keep resolving.
  assert.equal(progress.recordRoundResult({ winnerTeam: TEAM.robbers, winnerSessionId: 2 }), false);
  assert.equal(progress.winnerSessionId(), 7);

  assert.deepEqual(progress.createResultMessage(50), {
    kind: "server.match.result",
    serverTick: 50,
    matchOver: true,
    winnerSessionId: 7,
    killTarget: 2,
    copsRoundWins: 2,
    robbersRoundWins: 1
  });

  progress.reset();
  assert.equal(progress.isMatchOver(), false);
  assert.equal(progress.winnerSessionId(), 0);
  assert.equal(progress.roundWins(TEAM.cops), 0);
  assert.equal(progress.roundWins(TEAM.robbers), 0);
});

test("match progress defaults to a positive round target with a pending result", () => {
  const progress = createMatchProgress();
  assert.equal(progress.killTarget, DEFAULT_MATCH_KILL_TARGET);
  assert.deepEqual(progress.createResultMessage(0), {
    kind: "server.match.result",
    serverTick: 0,
    matchOver: false,
    winnerSessionId: 0,
    killTarget: DEFAULT_MATCH_KILL_TARGET,
    copsRoundWins: 0,
    robbersRoundWins: 0
  });
});
