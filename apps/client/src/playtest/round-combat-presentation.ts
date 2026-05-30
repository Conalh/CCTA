import {
  COMBAT_EVENT_KIND,
  ROUND_EVENT_KIND,
  ROUND_OUTCOME,
  ROUND_PHASE,
  teamForSlot,
  teamName,
  type MatchRosterEntry,
  type TeamId
} from "@breachline/shared";

export const ROUND_COMBAT_PRESENTATION_CUE_DURATION_MS = 1800 as const;

export type RoundCombatPresentationTone =
  | "waiting"
  | "setup"
  | "active"
  | "ended"
  | "reset"
  | "damage"
  | "dead";

export type RoundCombatPresentationInput = Readonly<{
  damage?: number;
  deathTick?: number;
  lastCombatEventKind?: number;
  lastCombatEventSequence?: number;
  lastCombatEventTick?: number;
  lastFireAccepted?: boolean;
  lastFireHit?: boolean;
  lastFireResultSequence?: number;
  lastFireTargetEntityId?: number;
  lastFireTargetSessionId?: number;
  lastRoundEventKind?: number;
  lastRoundEventSequence?: number;
  lastRoundEventTick?: number;
  lastRoundServerTick?: number;
  localAlive?: boolean;
  localHealth?: number;
  localMaxHealth?: number;
  localSessionId?: number;
  nowMs: number;
  respawnEligibleTick?: number;
  rosterEntries?: readonly MatchRosterEntry[];
  roundId?: number;
  roundOutcome?: number;
  roundPhase?: number;
  roundResetReadyTick?: number;
  roundWinnerSessionId?: number;
  sourceSessionId?: number;
  targetSessionId?: number;
}>;

export type RoundCombatPresentationState = Readonly<{
  lastCombatCueAtMs: number | undefined;
  lastCombatEventKey: string | undefined;
  lastRemoteCombatCueAtMs: number | undefined;
  lastRemoteFireSequence: number | undefined;
  lastRoundTransitionAtMs: number | undefined;
  localCombatCueActive: boolean;
  localCombatCueLabel: string;
  localCombatEventLabel: string;
  localHealthLabel: string;
  localLifeLabel: string;
  observedRoundId: number | undefined;
  observedRoundPhase: number | undefined;
  presentationTone: RoundCombatPresentationTone;
  remoteCombatCueActive: boolean;
  remoteCombatCueLabel: string;
  remoteCombatTargetEntityId: number | undefined;
  remoteCombatTargetSessionId: number | undefined;
  resetCueLabel: string;
  respawnCueLabel: string;
  roundBannerActive: boolean;
  roundBannerLabel: string;
  roundOutcomeLabel: string;
  roundPhaseLabel: string;
  roundTransitionActive: boolean;
  roundTransitionLabel: string;
  roundWinnerLabel: string;
}>;

const NO_LABEL = "-";

export function createInitialRoundCombatPresentationState(): RoundCombatPresentationState {
  return {
    lastCombatCueAtMs: undefined,
    lastCombatEventKey: undefined,
    lastRemoteCombatCueAtMs: undefined,
    lastRemoteFireSequence: undefined,
    lastRoundTransitionAtMs: undefined,
    localCombatCueActive: false,
    localCombatCueLabel: NO_LABEL,
    localCombatEventLabel: NO_LABEL,
    localHealthLabel: NO_LABEL,
    localLifeLabel: NO_LABEL,
    observedRoundId: undefined,
    observedRoundPhase: undefined,
    presentationTone: "waiting",
    remoteCombatCueActive: false,
    remoteCombatCueLabel: NO_LABEL,
    remoteCombatTargetEntityId: undefined,
    remoteCombatTargetSessionId: undefined,
    resetCueLabel: NO_LABEL,
    respawnCueLabel: NO_LABEL,
    roundBannerActive: false,
    roundBannerLabel: NO_LABEL,
    roundOutcomeLabel: NO_LABEL,
    roundPhaseLabel: NO_LABEL,
    roundTransitionActive: false,
    roundTransitionLabel: NO_LABEL,
    roundWinnerLabel: NO_LABEL
  };
}

export function updateRoundCombatPresentationState(
  previous: RoundCombatPresentationState,
  input: RoundCombatPresentationInput
): RoundCombatPresentationState {
  const nowMs = readFinite(input.nowMs, previous.lastRoundTransitionAtMs ?? 0);
  const roundPhase = readInteger(input.roundPhase);
  const roundId = readPositiveInteger(input.roundId);
  const transition = readRoundTransition(previous, {
    nowMs,
    roundId,
    roundPhase
  });
  const localCombatCue = readLocalCombatCue(previous, input, nowMs);
  const remoteCombatCue = readRemoteCombatCue(previous, input, nowMs);
  const roundWinnerLabel = formatRoundWinner(input);
  const roundBanner = readRoundBanner(input, roundWinnerLabel);

  return {
    lastCombatCueAtMs: localCombatCue.lastCueAtMs,
    lastCombatEventKey: localCombatCue.lastEventKey,
    lastRemoteCombatCueAtMs: remoteCombatCue.lastCueAtMs,
    lastRemoteFireSequence: remoteCombatCue.lastFireSequence,
    lastRoundTransitionAtMs: transition.lastTransitionAtMs,
    localCombatCueActive: localCombatCue.active,
    localCombatCueLabel: localCombatCue.label,
    localCombatEventLabel: formatCombatEvent(input),
    localHealthLabel: formatHealth(input.localHealth, input.localMaxHealth),
    localLifeLabel: formatLife(input.localAlive),
    observedRoundId: roundPhase === undefined ? undefined : roundId,
    observedRoundPhase: roundPhase,
    presentationTone: readPresentationTone(input, localCombatCue.active),
    remoteCombatCueActive: remoteCombatCue.active,
    remoteCombatCueLabel: remoteCombatCue.label,
    remoteCombatTargetEntityId: remoteCombatCue.targetEntityId,
    remoteCombatTargetSessionId: remoteCombatCue.targetSessionId,
    resetCueLabel: formatResetCue(input),
    respawnCueLabel: formatRespawnCue(input),
    roundBannerActive: roundBanner.active,
    roundBannerLabel: roundBanner.label,
    roundOutcomeLabel: formatRoundOutcome(input.roundOutcome),
    roundPhaseLabel: formatRoundPhase(input.roundPhase),
    roundTransitionActive: transition.active,
    roundTransitionLabel: transition.label,
    roundWinnerLabel
  };
}

function readRoundBanner(
  input: RoundCombatPresentationInput,
  roundWinnerLabel: string
): Readonly<{ active: boolean; label: string }> {
  // The banner shows only once the server has decided a round outcome, during the
  // ended/reset result window. The outcome and winner are server-owned; the client
  // never decides who won.
  const outcome = readInteger(input.roundOutcome);
  const decided = outcome === ROUND_OUTCOME.elimination || outcome === ROUND_OUTCOME.timeout;
  const inResultWindow =
    input.roundPhase === ROUND_PHASE.ended || input.roundPhase === ROUND_PHASE.reset;
  if (!decided || !inResultWindow) {
    return { active: false, label: NO_LABEL };
  }

  if (roundWinnerLabel !== NO_LABEL) {
    // Sides are plural: "Cops win the round" / "Robbers win the round".
    return { active: true, label: `${roundWinnerLabel} win the round` };
  }
  if (outcome === ROUND_OUTCOME.timeout) {
    return { active: true, label: "Round over — time" };
  }
  // A decided round with no winning side: both sides fell together.
  return { active: true, label: "Round draw" };
}

function formatRoundWinner(input: RoundCombatPresentationInput): string {
  const winnerSessionId = readPositiveInteger(input.roundWinnerSessionId);
  if (winnerSessionId === undefined) {
    return NO_LABEL;
  }

  // The winner session is server-owned (server.round.state); the client only resolves it
  // to the winning side via that session's spawn slot and never decides a winner.
  const team = resolveTeamForSession(input.rosterEntries, winnerSessionId);
  return team === undefined ? NO_LABEL : teamName(team);
}

function resolveTeamForSession(
  entries: readonly MatchRosterEntry[] | undefined,
  sessionId: number
): TeamId | undefined {
  if (entries === undefined) {
    return undefined;
  }

  for (const entry of entries) {
    if (readPositiveInteger(entry?.sessionId) !== sessionId) {
      continue;
    }
    return typeof entry?.slotIndex === "number" ? teamForSlot(entry.slotIndex) : undefined;
  }
  return undefined;
}

function readRoundTransition(
  previous: RoundCombatPresentationState,
  input: Readonly<{
    nowMs: number;
    roundId?: number;
    roundPhase?: number;
  }>
): Readonly<{
  active: boolean;
  label: string;
  lastTransitionAtMs?: number;
}> {
  if (input.roundPhase === undefined) {
    return {
      active: false,
      label: NO_LABEL,
      lastTransitionAtMs: undefined
    };
  }

  let label = previous.roundTransitionLabel;
  let lastTransitionAtMs = previous.lastRoundTransitionAtMs;
  const phaseChanged =
    previous.observedRoundPhase !== undefined && previous.observedRoundPhase !== input.roundPhase;
  const roundChanged =
    !phaseChanged &&
    previous.observedRoundId !== undefined &&
    input.roundId !== undefined &&
    previous.observedRoundId !== input.roundId;

  if (phaseChanged) {
    label = `${formatRoundPhase(previous.observedRoundPhase)} -> ${formatRoundPhase(input.roundPhase)}`;
    lastTransitionAtMs = input.nowMs;
  } else if (roundChanged) {
    label = `round ${previous.observedRoundId} -> ${input.roundId}`;
    lastTransitionAtMs = input.nowMs;
  }

  const active = lastTransitionAtMs !== undefined &&
    input.nowMs - lastTransitionAtMs <= ROUND_COMBAT_PRESENTATION_CUE_DURATION_MS;
  return {
    active,
    label: active ? label : NO_LABEL,
    lastTransitionAtMs: active ? lastTransitionAtMs : undefined
  };
}

function readLocalCombatCue(
  previous: RoundCombatPresentationState,
  input: RoundCombatPresentationInput,
  nowMs: number
): Readonly<{
  active: boolean;
  label: string;
  lastCueAtMs?: number;
  lastEventKey?: string;
}> {
  const eventKind = readInteger(input.lastCombatEventKind);
  const eventKey = readCombatEventKey(input);
  let label = previous.localCombatCueLabel;
  let lastCueAtMs = previous.lastCombatCueAtMs;
  let lastEventKey = previous.lastCombatEventKey;

  if (
    eventKind !== undefined &&
    eventKind !== COMBAT_EVENT_KIND.none &&
    eventKey !== undefined &&
    eventKey !== previous.lastCombatEventKey
  ) {
    label = formatCombatCue(eventKind);
    lastCueAtMs = nowMs;
    lastEventKey = eventKey;
  }

  const active = lastCueAtMs !== undefined &&
    nowMs - lastCueAtMs <= ROUND_COMBAT_PRESENTATION_CUE_DURATION_MS &&
    label !== NO_LABEL;
  return {
    active,
    label: active ? label : NO_LABEL,
    lastCueAtMs: active ? lastCueAtMs : undefined,
    lastEventKey
  };
}

function readRemoteCombatCue(
  previous: RoundCombatPresentationState,
  input: RoundCombatPresentationInput,
  nowMs: number
): Readonly<{
  active: boolean;
  label: string;
  lastCueAtMs?: number;
  lastFireSequence?: number;
  targetEntityId?: number;
  targetSessionId?: number;
}> {
  const sequence = readPositiveInteger(input.lastFireResultSequence);
  const targetEntityId = readPositiveInteger(input.lastFireTargetEntityId);
  const targetSessionId = readPositiveInteger(input.lastFireTargetSessionId);
  const localSessionId = readPositiveInteger(input.localSessionId);
  const hitRemoteEntity =
    sequence !== undefined &&
    input.lastFireAccepted === true &&
    input.lastFireHit === true &&
    targetEntityId !== undefined &&
    (localSessionId === undefined || targetSessionId !== localSessionId);

  let label = previous.remoteCombatCueLabel;
  let lastCueAtMs = previous.lastRemoteCombatCueAtMs;
  let lastFireSequence = previous.lastRemoteFireSequence;
  let activeTargetEntityId = previous.remoteCombatTargetEntityId;
  let activeTargetSessionId = previous.remoteCombatTargetSessionId;

  if (sequence !== undefined && sequence !== previous.lastRemoteFireSequence) {
    lastFireSequence = sequence;
    if (hitRemoteEntity) {
      label = `remote hit entity ${targetEntityId}`;
      lastCueAtMs = nowMs;
      activeTargetEntityId = targetEntityId;
      activeTargetSessionId = targetSessionId;
    } else {
      label = NO_LABEL;
      lastCueAtMs = undefined;
      activeTargetEntityId = undefined;
      activeTargetSessionId = undefined;
    }
  }

  const active = lastCueAtMs !== undefined &&
    nowMs - lastCueAtMs <= ROUND_COMBAT_PRESENTATION_CUE_DURATION_MS &&
    label !== NO_LABEL;
  return {
    active,
    label: active ? label : NO_LABEL,
    lastCueAtMs: active ? lastCueAtMs : undefined,
    lastFireSequence,
    targetEntityId: active ? activeTargetEntityId : undefined,
    targetSessionId: active ? activeTargetSessionId : undefined
  };
}

function readPresentationTone(
  input: RoundCombatPresentationInput,
  localCombatCueActive: boolean
): RoundCombatPresentationTone {
  if (input.roundPhase === ROUND_PHASE.reset) {
    return "reset";
  }
  if (input.localAlive === false) {
    return "dead";
  }
  if (localCombatCueActive && input.lastCombatEventKind === COMBAT_EVENT_KIND.damage) {
    return "damage";
  }
  switch (input.roundPhase) {
    case ROUND_PHASE.setup:
      return "setup";
    case ROUND_PHASE.active:
      return "active";
    case ROUND_PHASE.ended:
      return "ended";
    case ROUND_PHASE.reset:
      return "reset";
    default:
      return "waiting";
  }
}

function formatHealth(health: number | undefined, maxHealth: number | undefined): string {
  const safeHealth = readNonNegativeInteger(health);
  const safeMaxHealth = readPositiveInteger(maxHealth);
  return safeHealth === undefined || safeMaxHealth === undefined ? NO_LABEL : `${safeHealth}/${safeMaxHealth}`;
}

function formatLife(value: boolean | undefined): string {
  if (value === undefined) {
    return NO_LABEL;
  }
  return value ? "alive" : "dead";
}

function formatCombatEvent(input: RoundCombatPresentationInput): string {
  const eventKind = readInteger(input.lastCombatEventKind);
  switch (eventKind) {
    case undefined:
      return NO_LABEL;
    case COMBAT_EVENT_KIND.none:
      return "none";
    case COMBAT_EVENT_KIND.damage: {
      const damage = readNonNegativeInteger(input.damage);
      const source = readPositiveInteger(input.sourceSessionId);
      if (damage !== undefined && source !== undefined) {
        return `damage ${damage} from session ${source}`;
      }
      return "damage";
    }
    case COMBAT_EVENT_KIND.death: {
      const source = readPositiveInteger(input.sourceSessionId);
      return source === undefined ? "death" : `death by session ${source}`;
    }
    case COMBAT_EVENT_KIND.respawn:
      return "respawn";
    case COMBAT_EVENT_KIND.reset:
      return "reset";
    default:
      return `unknown ${eventKind}`;
  }
}

function formatCombatCue(eventKind: number): string {
  switch (eventKind) {
    case COMBAT_EVENT_KIND.damage:
      return "local damage";
    case COMBAT_EVENT_KIND.death:
      return "local down";
    case COMBAT_EVENT_KIND.respawn:
      return "local respawn";
    case COMBAT_EVENT_KIND.reset:
      return "local reset";
    default:
      return NO_LABEL;
  }
}

function formatResetCue(input: RoundCombatPresentationInput): string {
  const resetReadyTick = readPositiveInteger(input.roundResetReadyTick);
  const serverTick = readNonNegativeInteger(input.lastRoundServerTick);
  if (resetReadyTick !== undefined && serverTick !== undefined && resetReadyTick > serverTick) {
    return `reset in ${resetReadyTick - serverTick} ticks`;
  }
  if (input.roundPhase === ROUND_PHASE.reset) {
    return "resetting";
  }
  if (input.lastRoundEventKind === ROUND_EVENT_KIND.reset) {
    return "reset";
  }
  return NO_LABEL;
}

function formatRespawnCue(input: RoundCombatPresentationInput): string {
  // Respawn timing is server-owned (combat respawn-eligible tick vs the latest server
  // tick). The client only formats it while the local player is down and never decides
  // when a respawn happens.
  if (input.localAlive !== false) {
    return NO_LABEL;
  }

  const eligibleTick = readPositiveInteger(input.respawnEligibleTick);
  const serverTick = readNonNegativeInteger(input.lastRoundServerTick);
  if (eligibleTick !== undefined && serverTick !== undefined && eligibleTick > serverTick) {
    return `respawn in ${eligibleTick - serverTick} ticks`;
  }
  return "down";
}

function formatRoundPhase(value: number | undefined): string {
  switch (value) {
    case undefined:
      return NO_LABEL;
    case ROUND_PHASE.setup:
      return "setup";
    case ROUND_PHASE.active:
      return "active";
    case ROUND_PHASE.ended:
      return "ended";
    case ROUND_PHASE.reset:
      return "reset";
    default:
      return `unknown ${value}`;
  }
}

function formatRoundOutcome(value: number | undefined): string {
  switch (value) {
    case undefined:
      return NO_LABEL;
    case ROUND_OUTCOME.none:
      return "none";
    case ROUND_OUTCOME.elimination:
      return "elimination";
    case ROUND_OUTCOME.timeout:
      return "timeout";
    default:
      return `unknown ${value}`;
  }
}

function readCombatEventKey(input: RoundCombatPresentationInput): string | undefined {
  const eventKind = readInteger(input.lastCombatEventKind);
  if (eventKind === undefined || eventKind === COMBAT_EVENT_KIND.none) {
    return undefined;
  }

  const sequence = readPositiveInteger(input.lastCombatEventSequence);
  const tick = readPositiveInteger(input.lastCombatEventTick);
  if (sequence === undefined && tick === undefined) {
    return undefined;
  }

  return `${eventKind}:${sequence ?? 0}:${tick ?? 0}`;
}

function readInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function readNonNegativeInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function readPositiveInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function readFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
