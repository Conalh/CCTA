import {
  ROUND_EVENT_KIND,
  ROUND_OUTCOME,
  ROUND_PHASE,
  type RoundEventKind,
  type RoundOutcome,
  type RoundPhase,
  type ServerRoundStateMessage
} from "@breachline/shared";

export const DEFAULT_ROUND_SETUP_DURATION_TICKS = 0 as const;
export const DEFAULT_ROUND_ACTIVE_DURATION_TICKS = 18_000 as const;
export const DEFAULT_ROUND_RESET_DURATION_TICKS = 90 as const;
export const DEFAULT_FIRST_ROUND_ID = 1 as const;

export type RoundStateConfig = Readonly<{
  firstRoundId?: number;
  setupDurationTicks?: number;
  activeDurationTicks?: number;
  resetDurationTicks?: number;
}>;

export type RoundAdvanceInput = Readonly<{
  serverTick: number;
  activeSessionIds: readonly number[];
  aliveSessionIds: readonly number[];
}>;

export type RoundAdvanceResult = Readonly<{
  resetRound: boolean;
  transitioned: boolean;
  state: ServerRoundStateMessage;
}>;

export type RoundState = Readonly<{
  allowsMovement(): boolean;
  allowsFire(): boolean;
  allowsRespawn(): boolean;
  allowsLoadoutSelection(): boolean;
  advance(input: RoundAdvanceInput): RoundAdvanceResult;
  createStateMessage(serverTick: number): ServerRoundStateMessage;
}>;

type MutableRoundState = {
  roundId: number;
  phase: RoundPhase;
  outcome: RoundOutcome;
  winnerSessionId: number;
  phaseStartedTick: number;
  phaseEndsTick: number;
  resetReadyTick: number;
  lastEventKind: RoundEventKind;
  lastEventTick: number;
  lastEventSequence: number;
};

export function createRoundState(config: RoundStateConfig = {}): RoundState {
  const firstRoundId = readPositiveUint32(config.firstRoundId ?? DEFAULT_FIRST_ROUND_ID, "firstRoundId");
  const setupDurationTicks = readUint32(
    config.setupDurationTicks ?? DEFAULT_ROUND_SETUP_DURATION_TICKS,
    "setupDurationTicks"
  );
  const activeDurationTicks = readPositiveUint32(
    config.activeDurationTicks ?? DEFAULT_ROUND_ACTIVE_DURATION_TICKS,
    "activeDurationTicks"
  );
  const resetDurationTicks = readUint32(
    config.resetDurationTicks ?? DEFAULT_ROUND_RESET_DURATION_TICKS,
    "resetDurationTicks"
  );

  const state: MutableRoundState = {
    roundId: firstRoundId,
    phase: ROUND_PHASE.setup,
    outcome: ROUND_OUTCOME.none,
    winnerSessionId: 0,
    phaseStartedTick: 0,
    phaseEndsTick: setupDurationTicks,
    resetReadyTick: 0,
    lastEventKind: ROUND_EVENT_KIND.setup,
    lastEventTick: 0,
    lastEventSequence: 1
  };

  function advance(input: RoundAdvanceInput): RoundAdvanceResult {
    const serverTick = readUint32(input.serverTick, "serverTick");
    let transitioned = false;
    let resetRound = false;

    const activeSessionIds = uniquePositiveSessionIds(input.activeSessionIds);
    if (state.phase === ROUND_PHASE.setup && activeSessionIds.length > 0 && serverTick >= state.phaseEndsTick) {
      transitionToActive(serverTick);
      transitioned = true;
    } else if (state.phase === ROUND_PHASE.active) {
      const aliveSessionIds = uniquePositiveSessionIds(input.aliveSessionIds).filter((sessionId) =>
        activeSessionIds.includes(sessionId)
      );

      if (activeSessionIds.length >= 2 && aliveSessionIds.length <= 1) {
        transitionToEnded(serverTick, ROUND_OUTCOME.elimination, aliveSessionIds[0] ?? 0);
        transitioned = true;
      } else if (serverTick >= state.phaseEndsTick) {
        transitionToEnded(serverTick, ROUND_OUTCOME.timeout, 0);
        transitioned = true;
      }
    } else if (state.phase === ROUND_PHASE.ended && serverTick >= state.resetReadyTick) {
      transitionToReset(serverTick);
      transitioned = true;
      resetRound = true;
    } else if (state.phase === ROUND_PHASE.reset && serverTick > state.phaseStartedTick) {
      transitionToSetup(serverTick);
      transitioned = true;
    }

    return {
      resetRound,
      transitioned,
      state: createStateMessage(serverTick)
    };
  }

  function transitionToActive(serverTick: number): void {
    state.phase = ROUND_PHASE.active;
    state.outcome = ROUND_OUTCOME.none;
    state.winnerSessionId = 0;
    state.phaseStartedTick = serverTick;
    state.phaseEndsTick = addTicks(serverTick, activeDurationTicks);
    state.resetReadyTick = 0;
    recordEvent(ROUND_EVENT_KIND.active, serverTick);
  }

  function transitionToEnded(serverTick: number, outcome: RoundOutcome, winnerSessionId: number): void {
    state.phase = ROUND_PHASE.ended;
    state.outcome = outcome;
    state.winnerSessionId = readUint32(winnerSessionId, "winnerSessionId");
    state.phaseStartedTick = serverTick;
    state.phaseEndsTick = serverTick;
    state.resetReadyTick = addTicks(serverTick, resetDurationTicks);
    recordEvent(ROUND_EVENT_KIND.ended, serverTick);
  }

  function transitionToReset(serverTick: number): void {
    state.phase = ROUND_PHASE.reset;
    state.phaseStartedTick = serverTick;
    state.phaseEndsTick = serverTick;
    state.resetReadyTick = serverTick;
    recordEvent(ROUND_EVENT_KIND.reset, serverTick);
  }

  function transitionToSetup(serverTick: number): void {
    state.roundId = addTicks(state.roundId, 1);
    state.phase = ROUND_PHASE.setup;
    state.outcome = ROUND_OUTCOME.none;
    state.winnerSessionId = 0;
    state.phaseStartedTick = serverTick;
    state.phaseEndsTick = addTicks(serverTick, setupDurationTicks);
    state.resetReadyTick = 0;
    recordEvent(ROUND_EVENT_KIND.setup, serverTick);
  }

  function recordEvent(eventKind: RoundEventKind, serverTick: number): void {
    state.lastEventKind = eventKind;
    state.lastEventTick = serverTick;
    state.lastEventSequence = addTicks(state.lastEventSequence, 1);
  }

  function createStateMessage(serverTick: number): ServerRoundStateMessage {
    return {
      kind: "server.round.state",
      serverTick: readUint32(serverTick, "serverTick"),
      roundId: state.roundId,
      phase: state.phase,
      outcome: state.outcome,
      winnerSessionId: state.winnerSessionId,
      phaseStartedTick: state.phaseStartedTick,
      phaseEndsTick: state.phaseEndsTick,
      resetReadyTick: state.resetReadyTick,
      lastEventKind: state.lastEventKind,
      lastEventTick: state.lastEventTick,
      lastEventSequence: state.lastEventSequence
    };
  }

  return {
    allowsMovement: () => state.phase === ROUND_PHASE.active,
    allowsFire: () => state.phase === ROUND_PHASE.active,
    allowsRespawn: () => state.phase === ROUND_PHASE.active,
    allowsLoadoutSelection: () => state.phase === ROUND_PHASE.setup,
    advance,
    createStateMessage
  };
}

function uniquePositiveSessionIds(values: readonly number[]): number[] {
  return [...new Set(values.map((value) => readPositiveUint32(value, "sessionId")))];
}

function addTicks(left: number, right: number): number {
  return readUint32(left + right, "tick");
}

function readUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${field} must be an unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}

function readPositiveUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 0xffffffff) {
    throw new Error(`${field} must be a positive unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}
