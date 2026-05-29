import {
  DRYDOCK_SPAN_ARENA,
  deriveArenaCollisionGeometry,
  type ClientFireIntentMessage,
  type ClientInputMessage,
  type CombatEventKind,
  type FireRejectReason,
  type LoadoutProfileId,
  type LoadoutRejectReason,
  type LoadoutStatus,
  type MatchRosterEntry,
  type MatchStatsEntry,
  type ProtocolMessage,
  type RoundEventKind,
  type RoundOutcome,
  type RoundPhase,
  type WeaponEventKind
} from "@breachline/shared";

import {
  acknowledgeClientPredictionInputs,
  createInitialClientPredictionState,
  recordClientPredictionInput,
  reconcileClientPredictionWithSnapshot,
  type ClientPredictedPose,
  type ClientPredictionState
} from "../prediction.js";
import {
  createInitialRemoteInterpolationState,
  recordRemoteInterpolationSnapshot,
  sampleRemoteInterpolation,
  type RemoteInterpolationState,
  type RemotePresentationPose
} from "../interpolation.js";

export type ConnectionStatus = "disconnected" | "connecting" | "accepted" | "rejected" | "closed" | "error";

const DEFAULT_CLIENT_ARENA_COLLISION_GEOMETRY = deriveArenaCollisionGeometry(DRYDOCK_SPAN_ARENA);

export type RttStats = Readonly<{
  currentMs: number | undefined;
  minMs: number | undefined;
  maxMs: number | undefined;
  averageMs: number | undefined;
}>;

export type LocalEntityPosition = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type ConnectionViewState = Readonly<{
  status: ConnectionStatus;
  serverTick: number | undefined;
  lastSnapshotTick: number | undefined;
  lastRttMs: number | undefined;
  rttHistoryMs: readonly number[];
  rttStats: RttStats;
  matchId: number | undefined;
  sessionId: number | undefined;
  slotIndex: number | undefined;
  matchCapacity: number | undefined;
  connectedSlots: number | undefined;
  matchRejectionReason: string | undefined;
  lastSentInputSequence: number | undefined;
  lastAcknowledgedInputSequence: number | undefined;
  droppedInputCount: number | undefined;
  inputSendRateHz: number | undefined;
  worldId: number | undefined;
  worldEntityCount: number | undefined;
  lastWorldSnapshotTick: number | undefined;
  localEntityId: number | undefined;
  localEntityPosition: LocalEntityPosition | undefined;
  localEntityYaw: number | undefined;
  predictedLocalEntityPosition: LocalEntityPosition | undefined;
  predictedLocalEntityYaw: number | undefined;
  predictionCorrectionMagnitude: number | undefined;
  lastReconciledSnapshotTick: number | undefined;
  pendingPredictionInputCount: number;
  replayedPredictionInputCount: number;
  predictionState: ClientPredictionState;
  remoteEntityCount: number;
  remoteInterpolationBufferedSnapshotCount: number;
  remoteInterpolationDelayMs: number;
  lastRemoteInterpolationTick: number | undefined;
  lastRemoteInterpolationTimeMs: number | undefined;
  representativeRemoteEntityId: number | undefined;
  representativeRemoteEntityPosition: LocalEntityPosition | undefined;
  representativeRemoteEntityYaw: number | undefined;
  remoteInterpolationState: RemoteInterpolationState;
  lastSentFireSequence: number | undefined;
  lastFireResultSequence: number | undefined;
  lastFireResultServerTick: number | undefined;
  lastFireAccepted: boolean | undefined;
  lastFireHit: boolean | undefined;
  lastFireTargetEntityId: number | undefined;
  lastFireTargetSessionId: number | undefined;
  lastFireDistance: number | undefined;
  lastFireRejectReason: FireRejectReason | undefined;
  fireSendRateHz: number | undefined;
  localCombatEntityId: number | undefined;
  localHealth: number | undefined;
  localMaxHealth: number | undefined;
  localAlive: boolean | undefined;
  localDeathTick: number | undefined;
  localRespawnEligibleTick: number | undefined;
  lastCombatEventKind: CombatEventKind | undefined;
  lastCombatEventTick: number | undefined;
  lastCombatEventSequence: number | undefined;
  lastCombatSourceSessionId: number | undefined;
  lastCombatTargetSessionId: number | undefined;
  lastCombatDamage: number | undefined;
  loadoutProfileId: LoadoutProfileId | 0 | undefined;
  loadoutStatus: LoadoutStatus | undefined;
  loadoutRejectReason: LoadoutRejectReason | undefined;
  lastLoadoutSequence: number | undefined;
  lastLoadoutServerTick: number | undefined;
  weaponProfileId: LoadoutProfileId | 0 | undefined;
  weaponAmmoInMagazine: number | undefined;
  weaponMagazineSize: number | undefined;
  weaponReloading: boolean | undefined;
  weaponReloadCompleteTick: number | undefined;
  lastWeaponEventKind: WeaponEventKind | undefined;
  lastWeaponEventSequence: number | undefined;
  lastWeaponServerTick: number | undefined;
  roundId: number | undefined;
  roundPhase: RoundPhase | undefined;
  roundOutcome: RoundOutcome | undefined;
  roundWinnerSessionId: number | undefined;
  roundPhaseStartedTick: number | undefined;
  roundPhaseEndsTick: number | undefined;
  roundResetReadyTick: number | undefined;
  lastRoundEventKind: RoundEventKind | undefined;
  lastRoundEventTick: number | undefined;
  lastRoundEventSequence: number | undefined;
  lastRoundServerTick: number | undefined;
  matchStats: readonly MatchStatsEntry[];
  lastMatchStatsServerTick: number | undefined;
  matchRoster: readonly MatchRosterEntry[];
  lastMatchRosterServerTick: number | undefined;
  observedTickRateHz: number | undefined;
  observedSnapshotRateHz: number | undefined;
  lastMessageTimeMs: number | undefined;
  connectedAtMs: number | undefined;
  lastDisconnectReason: string | undefined;
  messageCounts: Readonly<Record<string, number>>;
  messageRatesPerSecond: Readonly<Record<string, number>>;
  pendingPings: Readonly<Record<number, number>>;
  inputSendTimesMs: readonly number[];
  fireSendTimesMs: readonly number[];
  tickMessageTimesMs: readonly number[];
  snapshotMessageTimesMs: readonly number[];
  historyLimit: number;
  error: string | undefined;
}>;

export type ConnectionViewStateOptions = Readonly<{
  historyLimit?: number;
}>;

export type ConnectionViewEvent =
  | Readonly<{
      type: "connecting";
      nowMs: number;
    }>
  | Readonly<{
      type: "message";
      nowMs: number;
      message: ProtocolMessage;
    }>
  | Readonly<{
      type: "ping-sent";
      sequence: number;
      clientTimeMs: number;
    }>
  | Readonly<{
      type: "input-sent";
      sequence: number;
      clientTimeMs: number;
      message?: ClientInputMessage;
    }>
  | Readonly<{
      type: "fire-sent";
      sequence: number;
      clientTimeMs: number;
      message?: ClientFireIntentMessage;
    }>
  | Readonly<{
      type: "closed";
      nowMs: number;
      reason?: string;
    }>
  | Readonly<{
      type: "error";
      nowMs: number;
      error: string;
    }>;

export function createInitialConnectionViewState(
  _nowMs: number,
  options: ConnectionViewStateOptions = {}
): ConnectionViewState {
  const historyLimit = options.historyLimit ?? 32;
  return {
    status: "disconnected",
    serverTick: undefined,
    lastSnapshotTick: undefined,
    lastRttMs: undefined,
    rttHistoryMs: [],
    rttStats: createEmptyRttStats(),
    matchId: undefined,
    sessionId: undefined,
    slotIndex: undefined,
    matchCapacity: undefined,
    connectedSlots: undefined,
    matchRejectionReason: undefined,
    lastSentInputSequence: undefined,
    lastAcknowledgedInputSequence: undefined,
    droppedInputCount: undefined,
    inputSendRateHz: undefined,
    worldId: undefined,
    worldEntityCount: undefined,
    lastWorldSnapshotTick: undefined,
    localEntityId: undefined,
    localEntityPosition: undefined,
    localEntityYaw: undefined,
    predictedLocalEntityPosition: undefined,
    predictedLocalEntityYaw: undefined,
    predictionCorrectionMagnitude: undefined,
    lastReconciledSnapshotTick: undefined,
    pendingPredictionInputCount: 0,
    replayedPredictionInputCount: 0,
    predictionState: createInitialClientPredictionState(),
    remoteEntityCount: 0,
    remoteInterpolationBufferedSnapshotCount: 0,
    remoteInterpolationDelayMs: createInitialRemoteInterpolationState().interpolationDelayMs,
    lastRemoteInterpolationTick: undefined,
    lastRemoteInterpolationTimeMs: undefined,
    representativeRemoteEntityId: undefined,
    representativeRemoteEntityPosition: undefined,
    representativeRemoteEntityYaw: undefined,
    remoteInterpolationState: createInitialRemoteInterpolationState(),
    lastSentFireSequence: undefined,
    lastFireResultSequence: undefined,
    lastFireResultServerTick: undefined,
    lastFireAccepted: undefined,
    lastFireHit: undefined,
    lastFireTargetEntityId: undefined,
    lastFireTargetSessionId: undefined,
    lastFireDistance: undefined,
    lastFireRejectReason: undefined,
    fireSendRateHz: undefined,
    localCombatEntityId: undefined,
    localHealth: undefined,
    localMaxHealth: undefined,
    localAlive: undefined,
    localDeathTick: undefined,
    localRespawnEligibleTick: undefined,
    lastCombatEventKind: undefined,
    lastCombatEventTick: undefined,
    lastCombatEventSequence: undefined,
    lastCombatSourceSessionId: undefined,
    lastCombatTargetSessionId: undefined,
    lastCombatDamage: undefined,
    loadoutProfileId: undefined,
    loadoutStatus: undefined,
    loadoutRejectReason: undefined,
    lastLoadoutSequence: undefined,
    lastLoadoutServerTick: undefined,
    weaponProfileId: undefined,
    weaponAmmoInMagazine: undefined,
    weaponMagazineSize: undefined,
    weaponReloading: undefined,
    weaponReloadCompleteTick: undefined,
    lastWeaponEventKind: undefined,
    lastWeaponEventSequence: undefined,
    lastWeaponServerTick: undefined,
    roundId: undefined,
    roundPhase: undefined,
    roundOutcome: undefined,
    roundWinnerSessionId: undefined,
    roundPhaseStartedTick: undefined,
    roundPhaseEndsTick: undefined,
    roundResetReadyTick: undefined,
    lastRoundEventKind: undefined,
    lastRoundEventTick: undefined,
    lastRoundEventSequence: undefined,
    lastRoundServerTick: undefined,
    matchStats: [],
    lastMatchStatsServerTick: undefined,
    matchRoster: [],
    lastMatchRosterServerTick: undefined,
    observedTickRateHz: undefined,
    observedSnapshotRateHz: undefined,
    lastMessageTimeMs: undefined,
    connectedAtMs: undefined,
    lastDisconnectReason: undefined,
    messageCounts: {},
    messageRatesPerSecond: {},
    pendingPings: {},
    inputSendTimesMs: [],
    fireSendTimesMs: [],
    tickMessageTimesMs: [],
    snapshotMessageTimesMs: [],
    historyLimit,
    error: undefined
  };
}

export function reduceConnectionViewState(
  state: ConnectionViewState,
  event: ConnectionViewEvent
): ConnectionViewState {
  switch (event.type) {
    case "connecting":
      return {
        ...resetConnectionDiagnostics(state),
        status: "connecting",
        error: undefined
      };
    case "ping-sent":
      return {
        ...state,
        pendingPings: {
          ...state.pendingPings,
          [event.sequence]: event.clientTimeMs
        }
      };
    case "input-sent":
      return reduceInputSent(state, event.sequence, event.clientTimeMs, event.message);
    case "fire-sent":
      return reduceFireSent(state, event.sequence, event.clientTimeMs);
    case "closed":
      return {
        ...state,
        status: "closed",
        lastMessageTimeMs: event.nowMs,
        lastDisconnectReason: event.reason ?? "closed"
      };
    case "error":
      return {
        ...state,
        status: "error",
        error: event.error,
        lastDisconnectReason: event.error,
        lastMessageTimeMs: event.nowMs
      };
    case "message":
      return reduceMessage(state, event.message, event.nowMs);
  }
}

function reduceMessage(state: ConnectionViewState, message: ProtocolMessage, nowMs: number): ConnectionViewState {
  const nextCounts = {
    ...state.messageCounts,
    [message.kind]: (state.messageCounts[message.kind] ?? 0) + 1
  };
  const baseState = {
    ...state,
    lastMessageTimeMs: nowMs,
    messageCounts: nextCounts,
    messageRatesPerSecond: calculateMessageRates(nextCounts, state.connectedAtMs, nowMs)
  };

  switch (message.kind) {
    case "protocol.accept":
      return {
        ...baseState,
        status: "accepted",
        connectedAtMs: state.connectedAtMs ?? nowMs,
        messageRatesPerSecond: calculateMessageRates(nextCounts, state.connectedAtMs ?? nowMs, nowMs),
        error: undefined
      };
    case "protocol.reject":
      return {
        ...baseState,
        status: "rejected",
        error: message.reason,
        matchRejectionReason: message.reason
      };
    case "match.assigned":
      return {
        ...baseState,
        matchId: message.matchId,
        sessionId: message.sessionId,
        slotIndex: message.slotIndex,
        matchCapacity: message.capacity,
        connectedSlots: message.connectedSlots,
        matchRejectionReason: undefined,
        error: undefined
      };
    case "match.update":
      return {
        ...baseState,
        matchId: message.matchId,
        matchCapacity: message.capacity,
        connectedSlots: message.connectedSlots
      };
    case "input.ack":
      return applyPredictionView({
        ...baseState,
        sessionId: message.sessionId,
        lastAcknowledgedInputSequence: message.lastAcceptedInputSequence,
        droppedInputCount: message.droppedInputCount
      }, acknowledgeClientPredictionInputs(state.predictionState, message.lastAcceptedInputSequence));
    case "server.tick":
      return reduceTick({
        ...baseState,
        serverTick: message.tick
      }, nowMs);
    case "server.snapshot":
      // Out-of-order delivery (the Phase 36 jitter profile, and the intended datagram
      // transport) can land an older snapshot after a newer one. Applying it would rewind
      // the local pose and reconcile prediction backwards, so a non-newer tick only updates
      // arrival diagnostics. Mirrors the staleness guard in recordRemoteInterpolationSnapshot.
      if (state.lastSnapshotTick !== undefined && message.tick <= state.lastSnapshotTick) {
        return reduceSnapshot(baseState, nowMs);
      }
      const localEntity = message.entities?.find((entity) => entity.sessionId === state.sessionId);
      const reducedSnapshotState = reduceSnapshot({
        ...baseState,
        lastSnapshotTick: message.tick,
        lastWorldSnapshotTick: message.tick,
        worldId: message.worldId,
        worldEntityCount: message.entityCount,
        localEntityId: localEntity?.entityId,
        localEntityPosition:
          localEntity === undefined
            ? undefined
            : {
                x: localEntity.x,
                y: localEntity.y,
                z: localEntity.z
              },
        localEntityYaw: localEntity?.yaw
      }, nowMs);
      const snapshottedState =
        state.sessionId === undefined
          ? reducedSnapshotState
          : applyRemoteInterpolationView(
              reducedSnapshotState,
              sampleRemoteInterpolation(
                recordRemoteInterpolationSnapshot(state.remoteInterpolationState, message, {
                  localSessionId: state.sessionId
                }),
                message.serverTimeMs
              )
            );
      return localEntity === undefined
        ? snapshottedState
        : applyPredictionView(
            snapshottedState,
            reconcileClientPredictionWithSnapshot(state.predictionState, localEntity, {
              snapshotTick: message.tick,
              lastAcknowledgedInputSequence: state.lastAcknowledgedInputSequence,
              collisionGeometry: DEFAULT_CLIENT_ARENA_COLLISION_GEOMETRY
            })
          );
    case "pong":
      return reducePong(baseState, message.sequence, message.clientTimeMs, nowMs);
    case "server.fire.result":
      return {
        ...baseState,
        sessionId: message.sessionId === 0 ? state.sessionId : message.sessionId,
        lastFireResultSequence: message.sequence,
        lastFireResultServerTick: message.serverTick,
        lastFireAccepted: message.accepted,
        lastFireHit: message.hit,
        lastFireTargetEntityId: message.targetEntityId === 0 ? undefined : message.targetEntityId,
        lastFireTargetSessionId: message.targetSessionId === 0 ? undefined : message.targetSessionId,
        lastFireDistance: message.distance,
        lastFireRejectReason: message.rejectReason
      };
    case "server.combat.state":
      return {
        ...baseState,
        sessionId: message.sessionId,
        localCombatEntityId: message.entityId,
        localHealth: message.health,
        localMaxHealth: message.maxHealth,
        localAlive: message.alive,
        localDeathTick: message.deathTick === 0 ? undefined : message.deathTick,
        localRespawnEligibleTick: message.respawnEligibleTick === 0 ? undefined : message.respawnEligibleTick,
        lastCombatEventKind: message.lastEventKind,
        lastCombatEventTick: message.lastEventTick === 0 ? undefined : message.lastEventTick,
        lastCombatEventSequence: message.lastEventSequence === 0 ? undefined : message.lastEventSequence,
        lastCombatSourceSessionId: message.sourceSessionId === 0 ? undefined : message.sourceSessionId,
        lastCombatTargetSessionId: message.targetSessionId === 0 ? undefined : message.targetSessionId,
        lastCombatDamage: message.damage
      };
    case "server.loadout.state":
      return {
        ...baseState,
        sessionId: message.sessionId === 0 ? state.sessionId : message.sessionId,
        loadoutProfileId: message.profileId,
        loadoutStatus: message.status,
        loadoutRejectReason: message.rejectReason,
        lastLoadoutSequence: message.sequence,
        lastLoadoutServerTick: message.serverTick
      };
    case "server.weapon.state":
      return {
        ...baseState,
        sessionId: message.sessionId === 0 ? state.sessionId : message.sessionId,
        weaponProfileId: message.weaponProfileId,
        weaponAmmoInMagazine: message.ammoInMagazine,
        weaponMagazineSize: message.magazineSize,
        weaponReloading: message.reloading,
        weaponReloadCompleteTick: message.reloadCompleteTick === 0 ? undefined : message.reloadCompleteTick,
        lastWeaponEventKind: message.lastEventKind,
        lastWeaponEventSequence: message.lastEventSequence === 0 ? undefined : message.lastEventSequence,
        lastWeaponServerTick: message.serverTick
      };
    case "server.round.state":
      return {
        ...baseState,
        roundId: message.roundId,
        roundPhase: message.phase,
        roundOutcome: message.outcome,
        roundWinnerSessionId: message.winnerSessionId === 0 ? undefined : message.winnerSessionId,
        roundPhaseStartedTick: message.phaseStartedTick,
        roundPhaseEndsTick: message.phaseEndsTick,
        roundResetReadyTick: message.resetReadyTick === 0 ? undefined : message.resetReadyTick,
        lastRoundEventKind: message.lastEventKind,
        lastRoundEventTick: message.lastEventTick,
        lastRoundEventSequence: message.lastEventSequence,
        lastRoundServerTick: message.serverTick
      };
    case "server.match.stats":
      return {
        ...baseState,
        matchStats: message.entries,
        lastMatchStatsServerTick: message.serverTick
      };
    case "server.match.roster":
      return {
        ...baseState,
        matchRoster: message.entries,
        lastMatchRosterServerTick: message.serverTick
      };
    default:
      return baseState;
  }
}

function reducePong(
  state: ConnectionViewState,
  sequence: number,
  fallbackClientTimeMs: number,
  nowMs: number
): ConnectionViewState {
  const sentTimeMs = state.pendingPings[sequence] ?? fallbackClientTimeMs;
  const pendingPings = { ...state.pendingPings };
  delete pendingPings[sequence];
  const rttMs = Math.max(0, nowMs - sentTimeMs);
  const rttHistoryMs = appendBounded(state.rttHistoryMs, rttMs, state.historyLimit);

  return {
    ...state,
    lastRttMs: rttMs,
    rttHistoryMs,
    rttStats: calculateRttStats(rttHistoryMs),
    pendingPings
  };
}

function reduceInputSent(
  state: ConnectionViewState,
  sequence: number,
  clientTimeMs: number,
  message?: ClientInputMessage
): ConnectionViewState {
  const inputSendTimesMs = appendBounded(state.inputSendTimesMs, clientTimeMs, state.historyLimit);
  const inputState = {
    ...state,
    lastSentInputSequence: sequence,
    inputSendTimesMs,
    inputSendRateHz: calculateObservedRate(inputSendTimesMs)
  };
  return message === undefined
    ? inputState
    : applyPredictionView(
        inputState,
        recordClientPredictionInput(state.predictionState, message, {
          collisionGeometry: DEFAULT_CLIENT_ARENA_COLLISION_GEOMETRY
        })
      );
}

function reduceFireSent(
  state: ConnectionViewState,
  sequence: number,
  clientTimeMs: number
): ConnectionViewState {
  const fireSendTimesMs = appendBounded(state.fireSendTimesMs, clientTimeMs, state.historyLimit);
  return {
    ...state,
    lastSentFireSequence: sequence,
    fireSendTimesMs,
    fireSendRateHz: calculateObservedRate(fireSendTimesMs)
  };
}

function reduceTick(state: ConnectionViewState, nowMs: number): ConnectionViewState {
  const tickMessageTimesMs = appendBounded(state.tickMessageTimesMs, nowMs, state.historyLimit);
  return {
    ...state,
    tickMessageTimesMs,
    observedTickRateHz: calculateObservedRate(tickMessageTimesMs)
  };
}

function reduceSnapshot(state: ConnectionViewState, nowMs: number): ConnectionViewState {
  const snapshotMessageTimesMs = appendBounded(state.snapshotMessageTimesMs, nowMs, state.historyLimit);
  return {
    ...state,
    snapshotMessageTimesMs,
    observedSnapshotRateHz: calculateObservedRate(snapshotMessageTimesMs)
  };
}

function resetConnectionDiagnostics(state: ConnectionViewState): ConnectionViewState {
  return {
    ...state,
    serverTick: undefined,
    lastSnapshotTick: undefined,
    lastRttMs: undefined,
    rttHistoryMs: [],
    rttStats: createEmptyRttStats(),
    matchId: undefined,
    sessionId: undefined,
    slotIndex: undefined,
    matchCapacity: undefined,
    connectedSlots: undefined,
    matchRejectionReason: undefined,
    lastSentInputSequence: undefined,
    lastAcknowledgedInputSequence: undefined,
    droppedInputCount: undefined,
    inputSendRateHz: undefined,
    worldId: undefined,
    worldEntityCount: undefined,
    lastWorldSnapshotTick: undefined,
    localEntityId: undefined,
    localEntityPosition: undefined,
    localEntityYaw: undefined,
    predictedLocalEntityPosition: undefined,
    predictedLocalEntityYaw: undefined,
    predictionCorrectionMagnitude: undefined,
    lastReconciledSnapshotTick: undefined,
    pendingPredictionInputCount: 0,
    replayedPredictionInputCount: 0,
    predictionState: createInitialClientPredictionState(),
    remoteEntityCount: 0,
    remoteInterpolationBufferedSnapshotCount: 0,
    remoteInterpolationDelayMs: createInitialRemoteInterpolationState().interpolationDelayMs,
    lastRemoteInterpolationTick: undefined,
    lastRemoteInterpolationTimeMs: undefined,
    representativeRemoteEntityId: undefined,
    representativeRemoteEntityPosition: undefined,
    representativeRemoteEntityYaw: undefined,
    remoteInterpolationState: createInitialRemoteInterpolationState(),
    lastSentFireSequence: undefined,
    lastFireResultSequence: undefined,
    lastFireResultServerTick: undefined,
    lastFireAccepted: undefined,
    lastFireHit: undefined,
    lastFireTargetEntityId: undefined,
    lastFireTargetSessionId: undefined,
    lastFireDistance: undefined,
    lastFireRejectReason: undefined,
    fireSendRateHz: undefined,
    localCombatEntityId: undefined,
    localHealth: undefined,
    localMaxHealth: undefined,
    localAlive: undefined,
    localDeathTick: undefined,
    localRespawnEligibleTick: undefined,
    lastCombatEventKind: undefined,
    lastCombatEventTick: undefined,
    lastCombatEventSequence: undefined,
    lastCombatSourceSessionId: undefined,
    lastCombatTargetSessionId: undefined,
    lastCombatDamage: undefined,
    loadoutProfileId: undefined,
    loadoutStatus: undefined,
    loadoutRejectReason: undefined,
    lastLoadoutSequence: undefined,
    lastLoadoutServerTick: undefined,
    weaponProfileId: undefined,
    weaponAmmoInMagazine: undefined,
    weaponMagazineSize: undefined,
    weaponReloading: undefined,
    weaponReloadCompleteTick: undefined,
    lastWeaponEventKind: undefined,
    lastWeaponEventSequence: undefined,
    lastWeaponServerTick: undefined,
    roundId: undefined,
    roundPhase: undefined,
    roundOutcome: undefined,
    roundWinnerSessionId: undefined,
    roundPhaseStartedTick: undefined,
    roundPhaseEndsTick: undefined,
    roundResetReadyTick: undefined,
    lastRoundEventKind: undefined,
    lastRoundEventTick: undefined,
    lastRoundEventSequence: undefined,
    lastRoundServerTick: undefined,
    matchStats: [],
    lastMatchStatsServerTick: undefined,
    matchRoster: [],
    lastMatchRosterServerTick: undefined,
    observedTickRateHz: undefined,
    observedSnapshotRateHz: undefined,
    lastMessageTimeMs: undefined,
    connectedAtMs: undefined,
    messageCounts: {},
    messageRatesPerSecond: {},
    pendingPings: {},
    inputSendTimesMs: [],
    fireSendTimesMs: [],
    tickMessageTimesMs: [],
    snapshotMessageTimesMs: [],
    error: undefined
  };
}

function createEmptyRttStats(): RttStats {
  return {
    currentMs: undefined,
    minMs: undefined,
    maxMs: undefined,
    averageMs: undefined
  };
}

function calculateRttStats(values: readonly number[]): RttStats {
  if (values.length === 0) {
    return createEmptyRttStats();
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return {
    currentMs: values[values.length - 1],
    minMs: Math.min(...values),
    maxMs: Math.max(...values),
    averageMs: sum / values.length
  };
}

function calculateObservedRate(timesMs: readonly number[]): number | undefined {
  if (timesMs.length < 2) {
    return undefined;
  }

  const elapsedMs = timesMs[timesMs.length - 1] - timesMs[0];
  if (elapsedMs <= 0) {
    return undefined;
  }

  return ((timesMs.length - 1) / elapsedMs) * 1000;
}

function calculateMessageRates(
  counts: Readonly<Record<string, number>>,
  connectedAtMs: number | undefined,
  nowMs: number
): Readonly<Record<string, number>> {
  if (connectedAtMs === undefined || nowMs <= connectedAtMs) {
    return {};
  }

  const elapsedSeconds = (nowMs - connectedAtMs) / 1000;
  const rates: Record<string, number> = {};
  for (const [kind, count] of Object.entries(counts)) {
    rates[kind] = count / elapsedSeconds;
  }
  return rates;
}

function appendBounded(values: readonly number[], value: number, limit: number): readonly number[] {
  if (limit <= 0) {
    return [];
  }

  const nextValues = [...values, value];
  return nextValues.slice(Math.max(0, nextValues.length - limit));
}

function applyPredictionView(
  state: ConnectionViewState,
  predictionState: ClientPredictionState
): ConnectionViewState {
  return {
    ...state,
    predictionState,
    predictedLocalEntityPosition: toLocalPosition(predictionState.predictedPose),
    predictedLocalEntityYaw: predictionState.predictedPose?.yaw,
    predictionCorrectionMagnitude: predictionState.lastCorrectionMagnitude,
    lastReconciledSnapshotTick: predictionState.lastReconciledSnapshotTick,
    pendingPredictionInputCount: predictionState.pendingInputs.length,
    replayedPredictionInputCount: predictionState.replayedInputCount
  };
}

function toLocalPosition(pose: ClientPredictedPose | undefined): LocalEntityPosition | undefined {
  return pose === undefined
    ? undefined
    : {
        x: pose.x,
        y: pose.y,
        z: pose.z
      };
}

function applyRemoteInterpolationView(
  state: ConnectionViewState,
  remoteInterpolationState: RemoteInterpolationState
): ConnectionViewState {
  return {
    ...state,
    remoteInterpolationState,
    remoteEntityCount: remoteInterpolationState.remoteEntityCount,
    remoteInterpolationBufferedSnapshotCount: remoteInterpolationState.snapshots.length,
    remoteInterpolationDelayMs: remoteInterpolationState.interpolationDelayMs,
    lastRemoteInterpolationTick: remoteInterpolationState.lastInterpolatedTick,
    lastRemoteInterpolationTimeMs: remoteInterpolationState.lastInterpolatedTimeMs,
    representativeRemoteEntityId: remoteInterpolationState.representativeRemotePose?.entityId,
    representativeRemoteEntityPosition: toRemotePosition(remoteInterpolationState.representativeRemotePose),
    representativeRemoteEntityYaw: remoteInterpolationState.representativeRemotePose?.yaw
  };
}

function toRemotePosition(pose: RemotePresentationPose | undefined): LocalEntityPosition | undefined {
  return pose === undefined
    ? undefined
    : {
        x: pose.x,
        y: pose.y,
        z: pose.z
      };
}
