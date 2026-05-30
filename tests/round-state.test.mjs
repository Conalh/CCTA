import assert from "node:assert/strict";
import test from "node:test";

import {
  ROUND_EVENT_KIND,
  ROUND_OUTCOME,
  ROUND_PHASE,
  TEAM
} from "../packages/shared/dist/index.js";
import {
  DEFAULT_ROUND_ACTIVE_DURATION_TICKS,
  DEFAULT_ROUND_RESET_DURATION_TICKS,
  createRoundState
} from "../apps/server/dist/index.js";

const cop = (sessionId, alive = true) => ({ sessionId, team: TEAM.cops, alive });
const robber = (sessionId, alive = true) => ({ sessionId, team: TEAM.robbers, alive });

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

  const result = round.advance({ serverTick: 2, participants: [cop(1), robber(2)] });

  assert.equal(result.resetRound, false);
  assert.equal(result.roundEnded, false);
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

  const emptyAdvance = round.advance({ serverTick: 50, participants: [] });
  assert.equal(emptyAdvance.transitioned, false);
  assert.equal(round.createStateMessage(50).phase, ROUND_PHASE.setup);

  const occupiedAdvance = round.advance({ serverTick: 51, participants: [cop(1)] });
  assert.equal(occupiedAdvance.transitioned, true);
  assert.equal(round.createStateMessage(51).phase, ROUND_PHASE.active);
});

test("default round duration does not interrupt short movement-feel review windows", () => {
  const round = createRoundState();

  round.advance({ serverTick: 1, participants: [cop(1)] });
  round.advance({ serverTick: 601, participants: [cop(1)] });

  const state = round.createStateMessage(601);
  assert.equal(DEFAULT_ROUND_ACTIVE_DURATION_TICKS, 18_000);
  assert.equal(state.phase, ROUND_PHASE.active);
  assert.equal(state.phaseEndsTick, 18_001);
});

test("default reset hold is long enough for local round-readability review", () => {
  const round = createRoundState();

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  round.advance({ serverTick: 4, participants: [cop(1), robber(2, false)] });

  const state = round.createStateMessage(4);
  assert.equal(DEFAULT_ROUND_RESET_DURATION_TICKS >= 90, true);
  assert.equal(state.phase, ROUND_PHASE.ended);
  assert.equal(state.resetReadyTick - state.serverTick, DEFAULT_ROUND_RESET_DURATION_TICKS);
});

test("round state ends the round when a side is wiped and the survivors win", () => {
  const round = createRoundState({
    setupDurationTicks: 1,
    activeDurationTicks: 10,
    resetDurationTicks: 3
  });

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  // The lone Robber falls: the Cops win, represented by an alive Cop session.
  const ended = round.advance({ serverTick: 4, participants: [cop(1), robber(2, false)] });

  assert.equal(ended.roundEnded, true);
  assert.equal(ended.winnerTeam, TEAM.cops);
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

test("round state lets the Robbers win when the Cop side is wiped", () => {
  const round = createRoundState({ setupDurationTicks: 1, activeDurationTicks: 10, resetDurationTicks: 3 });

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  const ended = round.advance({ serverTick: 4, participants: [cop(1, false), robber(2)] });

  assert.equal(ended.roundEnded, true);
  assert.equal(ended.winnerTeam, TEAM.robbers);
  assert.equal(round.createStateMessage(4).outcome, ROUND_OUTCOME.elimination);
  assert.equal(round.createStateMessage(4).winnerSessionId, 2);
});

test("round state ends in a draw with no winner when both sides fall together", () => {
  const round = createRoundState({ setupDurationTicks: 1, activeDurationTicks: 10, resetDurationTicks: 3 });

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  const ended = round.advance({ serverTick: 4, participants: [cop(1, false), robber(2, false)] });

  assert.equal(ended.roundEnded, true);
  assert.equal(ended.winnerTeam, undefined);
  assert.equal(round.createStateMessage(4).outcome, ROUND_OUTCOME.elimination);
  assert.equal(round.createStateMessage(4).winnerSessionId, 0);
});

test("round state awards a timeout round to the defending Cops", () => {
  const round = createRoundState({
    setupDurationTicks: 1,
    activeDurationTicks: 3,
    resetDurationTicks: 2
  });

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  // Time runs out with both sides alive: the defenders (Cops) hold the site.
  const ended = round.advance({ serverTick: 4, participants: [cop(1), robber(2)] });

  assert.equal(ended.roundEnded, true);
  assert.equal(ended.winnerTeam, TEAM.cops);
  assert.equal(round.createStateMessage(4).phase, ROUND_PHASE.ended);
  assert.equal(round.createStateMessage(4).outcome, ROUND_OUTCOME.timeout);
  assert.equal(round.createStateMessage(4).winnerSessionId, 1);
});

test("round state opens the buy window through setup and the early active round", () => {
  const round = createRoundState({
    setupDurationTicks: 2,
    activeDurationTicks: 100,
    resetDurationTicks: 3,
    buyGraceTicks: 5
  });

  // Setup: the buy window is open regardless of tick.
  assert.equal(round.allowsBuy(0), true);

  round.advance({ serverTick: 2, participants: [cop(1), robber(2)] });
  // Active started at tick 2; the buy grace keeps the window open for buyGraceTicks.
  assert.equal(round.allowsBuy(2), true);
  assert.equal(round.allowsBuy(7), true);
  assert.equal(round.allowsBuy(8), false);
});

test("round state emits reset and starts the next setup round", () => {
  const round = createRoundState({
    setupDurationTicks: 1,
    activeDurationTicks: 3,
    resetDurationTicks: 2
  });

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  round.advance({ serverTick: 2, participants: [cop(1), robber(2, false)] });

  const resetResult = round.advance({ serverTick: 4, participants: [cop(1), robber(2, false)] });
  assert.equal(resetResult.resetRound, true);
  assert.equal(round.createStateMessage(4).phase, ROUND_PHASE.reset);
  assert.equal(round.createStateMessage(4).lastEventKind, ROUND_EVENT_KIND.reset);

  const nextSetupResult = round.advance({ serverTick: 5, participants: [cop(1), robber(2)] });
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

const armed = { armed: true, justDefused: false, justDetonated: false };

test("a defused charge ends the round for the Cops", () => {
  const round = createRoundState({ setupDurationTicks: 1, activeDurationTicks: 100, resetDurationTicks: 3 });

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  const ended = round.advance({
    serverTick: 5,
    participants: [cop(1), robber(2)],
    charge: { armed: true, justDefused: true, justDetonated: false }
  });

  assert.equal(ended.roundEnded, true);
  assert.equal(ended.winnerTeam, TEAM.cops);
  assert.equal(round.createStateMessage(5).outcome, ROUND_OUTCOME.defuse);
  assert.equal(round.createStateMessage(5).winnerSessionId, 1);
});

test("a detonated charge ends the round for the Robbers", () => {
  const round = createRoundState({ setupDurationTicks: 1, activeDurationTicks: 100, resetDurationTicks: 3 });

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  const ended = round.advance({
    serverTick: 5,
    participants: [cop(1), robber(2)],
    charge: { armed: false, justDefused: false, justDetonated: true }
  });

  assert.equal(ended.roundEnded, true);
  assert.equal(ended.winnerTeam, TEAM.robbers);
  assert.equal(round.createStateMessage(5).outcome, ROUND_OUTCOME.detonation);
  assert.equal(round.createStateMessage(5).winnerSessionId, 2);
});

test("an armed charge suspends elimination so the bomb decides the round", () => {
  const round = createRoundState({ setupDurationTicks: 1, activeDurationTicks: 100, resetDurationTicks: 3 });

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  // Robbers are wiped, but the charge is live: the round must NOT end on elimination.
  const held = round.advance({
    serverTick: 5,
    participants: [cop(1), robber(2, false)],
    charge: armed
  });

  assert.equal(held.roundEnded, false);
  assert.equal(round.createStateMessage(5).phase, ROUND_PHASE.active);
});

test("an armed charge suspends the round clock until it detonates", () => {
  const round = createRoundState({ setupDurationTicks: 1, activeDurationTicks: 3, resetDurationTicks: 3 });

  round.advance({ serverTick: 1, participants: [cop(1), robber(2)] });
  // The round clock expired (tick 4 > 3) but the live charge overrides the timeout.
  const held = round.advance({ serverTick: 4, participants: [cop(1), robber(2)], charge: armed });
  assert.equal(held.roundEnded, false);
  assert.equal(round.createStateMessage(4).phase, ROUND_PHASE.active);

  // Once it detonates, the Robbers take the round.
  const blown = round.advance({
    serverTick: 5,
    participants: [cop(1), robber(2)],
    charge: { armed: false, justDefused: false, justDetonated: true }
  });
  assert.equal(blown.roundEnded, true);
  assert.equal(blown.winnerTeam, TEAM.robbers);
});
