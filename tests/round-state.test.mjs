import assert from "node:assert/strict";
import test from "node:test";

import {
  ROUND_EVENT_KIND,
  ROUND_OUTCOME,
  ROUND_PHASE
} from "../packages/shared/dist/index.js";
import {
  DEFAULT_ROUND_ACTIVE_DURATION_TICKS,
  DEFAULT_ROUND_RESET_DURATION_TICKS,
  createRoundState
} from "../apps/server/dist/index.js";

test("round state advances setup to active with sequenced server-owned events", () => {
  const round = createRoundState({
    setupDurationTicks: 2,
    activeDurationTicks: 10,
    resetDurationTicks: 3
  });

  assert.deepEqual(round.createStateMessage(0), {
    kind: "server.round.state",
    serverTick: 0,
    roundId: 1,
    phase: ROUND_PHASE.setup,
    outcome: ROUND_OUTCOME.none,
    winnerSessionId: 0,
    phaseStartedTick: 0,
    phaseEndsTick: 2,
    resetReadyTick: 0,
    lastEventKind: ROUND_EVENT_KIND.setup,
    lastEventTick: 0,
    lastEventSequence: 1
  });

  const result = round.advance({
    serverTick: 2,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1, 2]
  });

  assert.equal(result.resetRound, false);
  assert.deepEqual(round.createStateMessage(2), {
    kind: "server.round.state",
    serverTick: 2,
    roundId: 1,
    phase: ROUND_PHASE.active,
    outcome: ROUND_OUTCOME.none,
    winnerSessionId: 0,
    phaseStartedTick: 2,
    phaseEndsTick: 12,
    resetReadyTick: 0,
    lastEventKind: ROUND_EVENT_KIND.active,
    lastEventTick: 2,
    lastEventSequence: 2
  });
});

test("round state does not age out of setup before accepted sessions exist", () => {
  const round = createRoundState({
    setupDurationTicks: 0,
    activeDurationTicks: 10,
    resetDurationTicks: 3
  });

  const emptyAdvance = round.advance({
    serverTick: 50,
    activeSessionIds: [],
    aliveSessionIds: []
  });
  assert.equal(emptyAdvance.transitioned, false);
  assert.equal(round.createStateMessage(50).phase, ROUND_PHASE.setup);

  const occupiedAdvance = round.advance({
    serverTick: 51,
    activeSessionIds: [1],
    aliveSessionIds: [1]
  });
  assert.equal(occupiedAdvance.transitioned, true);
  assert.equal(round.createStateMessage(51).phase, ROUND_PHASE.active);
});

test("default round duration does not interrupt short movement-feel review windows", () => {
  const round = createRoundState();

  round.advance({
    serverTick: 1,
    activeSessionIds: [1],
    aliveSessionIds: [1]
  });
  round.advance({
    serverTick: 601,
    activeSessionIds: [1],
    aliveSessionIds: [1]
  });

  const state = round.createStateMessage(601);
  assert.equal(DEFAULT_ROUND_ACTIVE_DURATION_TICKS, 18_000);
  assert.equal(state.phase, ROUND_PHASE.active);
  assert.equal(state.phaseEndsTick, 18_001);
});

test("default reset hold is long enough for local round-readability review", () => {
  const round = createRoundState();

  round.advance({
    serverTick: 1,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1, 2]
  });
  round.advance({
    serverTick: 4,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1]
  });

  const state = round.createStateMessage(4);
  assert.equal(DEFAULT_ROUND_RESET_DURATION_TICKS >= 90, true);
  assert.equal(state.phase, ROUND_PHASE.ended);
  assert.equal(state.resetReadyTick - state.serverTick, DEFAULT_ROUND_RESET_DURATION_TICKS);
});

test("round state ends active phase on elimination and schedules reset", () => {
  const round = createRoundState({
    setupDurationTicks: 1,
    activeDurationTicks: 10,
    resetDurationTicks: 3
  });

  round.advance({
    serverTick: 1,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1, 2]
  });
  round.advance({
    serverTick: 4,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1]
  });

  assert.deepEqual(round.createStateMessage(4), {
    kind: "server.round.state",
    serverTick: 4,
    roundId: 1,
    phase: ROUND_PHASE.ended,
    outcome: ROUND_OUTCOME.elimination,
    winnerSessionId: 1,
    phaseStartedTick: 4,
    phaseEndsTick: 4,
    resetReadyTick: 7,
    lastEventKind: ROUND_EVENT_KIND.ended,
    lastEventTick: 4,
    lastEventSequence: 3
  });
});

test("round state ends active phase on timeout without client-owned winner", () => {
  const round = createRoundState({
    setupDurationTicks: 1,
    activeDurationTicks: 3,
    resetDurationTicks: 2
  });

  round.advance({
    serverTick: 1,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1, 2]
  });
  round.advance({
    serverTick: 4,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1, 2]
  });

  assert.equal(round.createStateMessage(4).phase, ROUND_PHASE.ended);
  assert.equal(round.createStateMessage(4).outcome, ROUND_OUTCOME.timeout);
  assert.equal(round.createStateMessage(4).winnerSessionId, 0);
});

test("round state emits reset and starts the next setup round", () => {
  const round = createRoundState({
    setupDurationTicks: 1,
    activeDurationTicks: 3,
    resetDurationTicks: 2
  });

  round.advance({
    serverTick: 1,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1, 2]
  });
  round.advance({
    serverTick: 2,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1]
  });

  const resetResult = round.advance({
    serverTick: 4,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1]
  });
  assert.equal(resetResult.resetRound, true);
  assert.equal(round.createStateMessage(4).phase, ROUND_PHASE.reset);
  assert.equal(round.createStateMessage(4).lastEventKind, ROUND_EVENT_KIND.reset);

  const nextSetupResult = round.advance({
    serverTick: 5,
    activeSessionIds: [1, 2],
    aliveSessionIds: [1, 2]
  });
  assert.equal(nextSetupResult.resetRound, false);
  assert.deepEqual(round.createStateMessage(5), {
    kind: "server.round.state",
    serverTick: 5,
    roundId: 2,
    phase: ROUND_PHASE.setup,
    outcome: ROUND_OUTCOME.none,
    winnerSessionId: 0,
    phaseStartedTick: 5,
    phaseEndsTick: 6,
    resetReadyTick: 0,
    lastEventKind: ROUND_EVENT_KIND.setup,
    lastEventTick: 5,
    lastEventSequence: 5
  });
});
