import {
  ROUND_EVENT_KIND,
  ROUND_OUTCOME,
  ROUND_PHASE,
  TEAM,
  type RoundEventKind,
  type RoundOutcome,
  type RoundPhase,
  type ServerRoundStateMessage,
  type TeamId
} from "@breachline/shared";

export const DEFAULT_ROUND_SETUP_DURATION_TICKS = 0 as const;
export const DEFAULT_ROUND_ACTIVE_DURATION_TICKS = 18_000 as const;
export const DEFAULT_ROUND_RESET_DURATION_TICKS = 90 as const;
// Buy window: the buy menu stays open through setup and the first few seconds of the
// active round (so a fresh spawn can shop even with no freeze time). At 60 Hz this is
// six seconds.
export const DEFAULT_ROUND_BUY_GRACE_TICKS = 360 as const;
export const DEFAULT_FIRST_ROUND_ID = 1 as const;

export type RoundStateConfig = Readonly<{
  firstRoundId?: number;
  setupDurationTicks?: number;
  activeDurationTicks?: number;
  resetDurationTicks?: number;
  buyGraceTicks?: number;
}>;

export type RoundParticipant = Readonly<{
  sessionId: number;
  team: TeamId;
  alive: boolean;
}>;

// The objective's bearing on the round, derived from the charge state machine. When the
// charge is armed, the bomb governs the round: neither a team wipe nor the round clock can
// end it — only a defuse (Cops win) or detonation (Robbers win) resolves the round.
export type RoundChargeState = Readonly<{
  armed: boolean;
  justDefused: boolean;
  justDetonated: boolean;
}>;

export type RoundAdvanceInput = Readonly<{
  serverTick: number;
  participants: readonly RoundParticipant[];
  charge?: RoundChargeState;
}>;

export type RoundAdvanceResult = Readonly<{
  resetRound: boolean;
  transitioned: boolean;
  // True only on the active -> ended transition this tick, so the runtime scores the
  // round exactly once. winnerTeam is the side that won (undefined on a draw).
  roundEnded: boolean;
  winnerTeam: TeamId | undefined;
  state: ServerRoundStateMessage;
}>;

export type RoundState = Readonly<{
  allowsMovement(): boolean;
  allowsFire(): boolean;
  allowsRespawn(): boolean;
  allowsLoadoutSelection(): boolean;
  allowsBuy(serverTick: number): boolean;
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
  const buyGraceTicks = readUint32(config.buyGraceTicks ?? DEFAULT_ROUND_BUY_GRACE_TICKS, "buyGraceTicks");

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
    let roundEnded = false;
    let winnerTeam: TeamId | undefined;

    const participants = readParticipants(input.participants);

    if (state.phase === ROUND_PHASE.setup && participants.length > 0 && serverTick >= state.phaseEndsTick) {
      transitionToActive(serverTick);
      transitioned = true;
    } else if (state.phase === ROUND_PHASE.active) {
      const charge = input.charge;
      const presentTeams = distinctTeams(participants);

      if (charge?.justDefused) {
        // The Cops cut the charge: defenders take the round.
        winnerTeam = TEAM.cops;
        transitionToEnded(serverTick, ROUND_OUTCOME.defuse, firstSessionOnTeam(participants, TEAM.cops));
        transitioned = true;
        roundEnded = true;
      } else if (charge?.justDetonated) {
        // The charge blew: attackers take the round.
        winnerTeam = TEAM.robbers;
        transitionToEnded(serverTick, ROUND_OUTCOME.detonation, firstSessionOnTeam(participants, TEAM.robbers));
        transitioned = true;
        roundEnded = true;
      } else if (charge?.armed) {
        // The charge is live: a team wipe and the round clock are both suspended. Only the
        // defuse/detonation outcomes above can end the round now.
      } else {
        const aliveParticipants = participants.filter((participant) => participant.alive);
        const aliveTeams = distinctTeams(aliveParticipants);

        if (presentTeams.length >= 2 && aliveTeams.length <= 1) {
          // One side is wiped: the surviving side wins (a draw if both fell together).
          winnerTeam = aliveTeams.length === 1 ? aliveTeams[0] : undefined;
          const winnerSessionId =
            winnerTeam === undefined ? 0 : firstSessionOnTeam(aliveParticipants, winnerTeam);
          transitionToEnded(serverTick, ROUND_OUTCOME.elimination, winnerSessionId);
          transitioned = true;
          roundEnded = true;
        } else if (serverTick >= state.phaseEndsTick) {
          // Time expired with no live charge: the defenders (Cops) hold.
          winnerTeam = presentTeams.includes(TEAM.cops)
            ? TEAM.cops
            : presentTeams.length === 1
              ? presentTeams[0]
              : undefined;
          const winnerSessionId =
            winnerTeam === undefined ? 0 : firstSessionOnTeam(participants, winnerTeam);
          transitionToEnded(serverTick, ROUND_OUTCOME.timeout, winnerSessionId);
          transitioned = true;
          roundEnded = true;
        }
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
      roundEnded,
      winnerTeam,
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
    // The buy window: all of setup, plus the buy-grace window into the active round.
    allowsBuy: (serverTick) =>
      state.phase === ROUND_PHASE.setup ||
      (state.phase === ROUND_PHASE.active &&
        readUint32(serverTick, "serverTick") - state.phaseStartedTick <= buyGraceTicks),
    advance,
    createStateMessage
  };
}

function readParticipants(values: readonly RoundParticipant[]): RoundParticipant[] {
  const seen = new Set<number>();
  const result: RoundParticipant[] = [];
  for (const participant of values) {
    if (!Number.isInteger(participant?.sessionId) || participant.sessionId < 1 || seen.has(participant.sessionId)) {
      continue;
    }
    seen.add(participant.sessionId);
    result.push({ sessionId: participant.sessionId, team: participant.team, alive: participant.alive === true });
  }
  return result;
}

function distinctTeams(participants: readonly RoundParticipant[]): TeamId[] {
  return [...new Set(participants.map((participant) => participant.team))];
}

function firstSessionOnTeam(participants: readonly RoundParticipant[], team: TeamId): number {
  return participants.find((participant) => participant.team === team)?.sessionId ?? 0;
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
