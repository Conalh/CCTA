import {
  PROTOCOL_VERSION,
  SERVER_TICK_RATE_HZ,
  createServerSnapshotPlaceholder,
  FIRE_REJECT_REASON,
  LOADOUT_REJECT_REASON,
  LOADOUT_STATUS,
  type ClientFireIntentMessage,
  type ClientInputMessage,
  type ClientLoadoutSelectMessage,
  type InputAckMessage,
  type MatchAssignedMessage,
  type MatchUpdateMessage,
  type MessageTransport,
  type PingMessage,
  type PongMessage,
  type ProtocolAcceptMessage,
  type ProtocolHelloMessage,
  type ProtocolMessage,
  type ProtocolRejectMessage,
  type ServerCombatStateMessage,
  type ServerLoadoutStateMessage,
  type ServerRoundStateMessage,
  type ServerSnapshotMessage,
  type ServerTickMessage
} from "@breachline/shared";

import {
  DEFAULT_FIRST_SESSION_ID,
  DEFAULT_MATCH_CAPACITY,
  DEFAULT_MATCH_ID,
  createFixedMatchSession,
  type MatchAssignment
} from "./match-session.js";
import { createInputPipeline, type InputPipeline, type InputPipelineSnapshot } from "./input-pipeline.js";
import {
  DEFAULT_FIRST_WORLD_ENTITY_ID,
  DEFAULT_WORLD_ID,
  createWorldState,
  type WorldState,
  type WorldStateSnapshot
} from "./world-state.js";
import {
  createRejectedFireResult,
  validateServerFireIntent
} from "./hitscan.js";
import {
  createCombatState,
  createSourceDeadFireResult
} from "./combat-state.js";
import {
  createLoadoutSelectionFromMessage,
  createLoadoutState,
  createRejectedLoadoutState
} from "./loadout-state.js";
import {
  createRoundState,
  type RoundState,
  type RoundStateConfig
} from "./round-state.js";

export type ServerClock = () => number;

export type ServerRuntimeConfig = Readonly<{
  tickRateHz: number;
  matchId?: number;
  matchCapacity?: number;
  firstSessionId?: number;
  worldId?: number;
  firstWorldEntityId?: number;
  round?: RoundStateConfig;
  now?: ServerClock;
}>;

export type ServerRuntimeSession = Readonly<{
  transport: MessageTransport;
  accepted: boolean;
  inputSequences: readonly number[];
}>;

type MutableServerRuntimeSession = {
  transport: MessageTransport;
  accepted: boolean;
  matchAssignment: MatchAssignment | undefined;
  lastAcceptedFireSequence: number;
  inputPipeline: InputPipeline | undefined;
  unsubscribeMessage: () => void;
  unsubscribeClose: () => void;
};

export type ServerRuntime = Readonly<{
  attachSession(session: MessageTransport): void;
  connectedSessionCount(): number;
  connectedMatchSlotCount(): number;
  getSessionInputSequences(sessionId: string): readonly number[];
  getSessionInputState(sessionId: string): InputPipelineSnapshot | undefined;
  getWorldSnapshot(tick: number): WorldStateSnapshot;
  getCombatState(sessionId: number, serverTick?: number): ServerCombatStateMessage | undefined;
  getLoadoutState(sessionId: number, serverTick?: number): ServerLoadoutStateMessage | undefined;
  getRoundState(serverTick?: number): ServerRoundStateMessage;
  step(tick: number, serverTimeMs?: number): void;
  close(): void;
}>;

export const DEFAULT_SERVER_CONFIG: ServerRuntimeConfig = {
  tickRateHz: SERVER_TICK_RATE_HZ
};

export function createServerRuntime(config: ServerRuntimeConfig = DEFAULT_SERVER_CONFIG): ServerRuntime {
  const sessions = new Map<string, MutableServerRuntimeSession>();
  const now = config.now ?? Date.now;
  const matchSession = createFixedMatchSession({
    matchId: config.matchId ?? DEFAULT_MATCH_ID,
    capacity: config.matchCapacity ?? DEFAULT_MATCH_CAPACITY,
    firstSessionId: config.firstSessionId ?? DEFAULT_FIRST_SESSION_ID
  });
  const worldState = createWorldState({
    worldId: config.worldId ?? DEFAULT_WORLD_ID,
    firstEntityId: config.firstWorldEntityId ?? DEFAULT_FIRST_WORLD_ENTITY_ID
  });
  const loadoutState = createLoadoutState();
  const combatState = createCombatState({
    getDamagePerHit: (sessionId) => loadoutState.getCombatDamagePerHit(sessionId)
  });
  const roundState = createRoundState(config.round);
  let lastServerTick = 0;

  function attachSession(transport: MessageTransport): void {
    const runtimeSession: MutableServerRuntimeSession = {
      transport,
      accepted: false,
      matchAssignment: undefined,
      lastAcceptedFireSequence: 0,
      inputPipeline: undefined,
      unsubscribeMessage: () => {},
      unsubscribeClose: () => {}
    };

    runtimeSession.unsubscribeMessage = transport.onMessage((message) => {
      handleMessage(runtimeSession, message);
    });
    runtimeSession.unsubscribeClose = transport.onClose(() => {
      const hadMatchSlot = runtimeSession.matchAssignment !== undefined;
      if (hadMatchSlot) {
        loadoutState.removeSession(runtimeSession.matchAssignment?.sessionId ?? 0);
        combatState.removeSession(runtimeSession.matchAssignment?.sessionId ?? 0);
        worldState.removeSessionEntity(runtimeSession.matchAssignment?.sessionId ?? 0);
        matchSession.disconnect(transport.id);
      }
      sessions.delete(transport.id);
      if (hadMatchSlot) {
        broadcastMatchUpdate();
      }
    });
    sessions.set(transport.id, runtimeSession);
  }

  function handleMessage(session: MutableServerRuntimeSession, message: ProtocolMessage): void {
    switch (message.kind) {
      case "protocol.hello":
        handleHello(session, message);
        break;
      case "ping":
        if (session.accepted) {
          session.transport.send(createPong(message, now()));
        }
        break;
      case "client.input":
        if (session.accepted && session.matchAssignment !== undefined && session.inputPipeline !== undefined) {
          recordClientInput(
            session,
            message,
            worldState,
            (sessionId) => roundState.allowsMovement() && combatState.isAlive(sessionId)
          );
        }
        break;
      case "client.fire":
        recordClientFire(session, message);
        break;
      case "client.loadout.select":
        recordClientLoadout(session, message);
        break;
      default:
        break;
    }
  }

  function handleHello(session: MutableServerRuntimeSession, message: ProtocolHelloMessage): void {
    // A session completes connection setup exactly once. Re-running it for an already-accepted
    // session would reset authoritative state — a hostile or buggy client could heal/revive its
    // combat state, teleport its world entity back to spawn, and reset input sequencing to replay
    // old inputs. Ignore the duplicate; a rejected assignment leaves accepted false so retries work.
    if (session.accepted) {
      return;
    }

    const response = acceptProtocolHello(message, config.tickRateHz);
    if (response.kind === "protocol.reject") {
      session.transport.send(response);
      return;
    }

    const assignment = matchSession.assign(session.transport.id);
    if (!assignment.ok) {
      session.transport.send({
        kind: "protocol.reject",
        protocolVersion: PROTOCOL_VERSION,
        reason: assignment.reason
      });
      return;
    }

    session.accepted = true;
    session.matchAssignment = assignment;
    session.inputPipeline = createInputPipeline({
      sessionId: assignment.sessionId
    });
    const worldEntity = worldState.assignSessionEntity({
      sessionId: assignment.sessionId,
      slotIndex: assignment.slotIndex
    });
    loadoutState.assignSession(assignment.sessionId);
    combatState.assignEntity({
      sessionId: assignment.sessionId,
      entityId: worldEntity.entityId
    });
    session.transport.send(response);
    session.transport.send(createMatchAssignedMessage(assignment));
    sendCombatStateToSession(assignment.sessionId);
    broadcastMatchUpdate();
  }

  function step(tick: number, serverTimeMs = now()): void {
    lastServerTick = tick;
    const activeSessionIds = getAcceptedSessionIds();
    const aliveSessionIds = activeSessionIds.filter((sessionId) => combatState.isAlive(sessionId));
    const roundAdvance = roundState.advance({
      serverTick: tick,
      activeSessionIds,
      aliveSessionIds
    });
    const resetCombatStates = roundAdvance.resetRound ? combatState.resetAll(tick) : [];
    const resetLoadoutStates = roundAdvance.resetRound ? loadoutState.resetAll(tick) : [];
    if (roundAdvance.resetRound) {
      worldState.resetMovement();
    }
    const respawned = roundState.allowsRespawn() ? combatState.advanceRespawns(tick) : [];
    worldState.advanceMovement(1 / config.tickRateHz, {
      canMoveSession: (sessionId) => roundState.allowsMovement() && combatState.isAlive(sessionId)
    });
    const tickMessage = createServerTick(tick, serverTimeMs);
    const roundMessage = roundState.createStateMessage(tick);
    const snapshotMessage = createServerSnapshot(
      tick,
      serverTimeMs,
      matchSession.connectedSlotCount(),
      worldState.createSnapshot(tick)
    );

    for (const session of sessions.values()) {
      if (session.accepted) {
        session.transport.send(tickMessage);
        session.transport.send(roundMessage);
        session.transport.send(snapshotMessage);
      }
    }

    for (const state of resetLoadoutStates) {
      sendLoadoutStateToSession(state);
    }
    for (const state of [...resetCombatStates, ...respawned]) {
      sendCombatStateToSession(state.sessionId);
    }
  }

  function connectedSessionCount(): number {
    return sessions.size;
  }

  function connectedMatchSlotCount(): number {
    return matchSession.connectedSlotCount();
  }

  function getSessionInputSequences(sessionId: string): readonly number[] {
    return sessions.get(sessionId)?.inputPipeline?.acceptedSequences() ?? [];
  }

  function getSessionInputState(sessionId: string): InputPipelineSnapshot | undefined {
    return sessions.get(sessionId)?.inputPipeline?.snapshot();
  }

  function getWorldSnapshot(tick: number): WorldStateSnapshot {
    return worldState.createSnapshot(tick);
  }

  function getCombatState(sessionId: number, serverTick = lastServerTick): ServerCombatStateMessage | undefined {
    return combatState.createStateMessage(sessionId, serverTick);
  }

  function getLoadoutState(sessionId: number, serverTick = lastServerTick): ServerLoadoutStateMessage | undefined {
    return loadoutState.getStateMessage(sessionId, serverTick);
  }

  function getRoundState(serverTick = lastServerTick): ServerRoundStateMessage {
    return roundState.createStateMessage(serverTick);
  }

  function broadcastMatchUpdate(): void {
    const message = createMatchUpdateMessage(
      matchSession.matchId,
      matchSession.capacity,
      matchSession.connectedSlotCount()
    );

    for (const session of sessions.values()) {
      if (session.accepted) {
        session.transport.send(message);
      }
    }
  }

  function close(): void {
    for (const session of sessions.values()) {
      session.unsubscribeMessage();
      session.unsubscribeClose();
      session.transport.close();
    }
    sessions.clear();
  }

  function recordClientFire(session: MutableServerRuntimeSession, message: ClientFireIntentMessage): void {
    if (!session.accepted) {
      session.transport.send(
        createRejectedFireResult(message, {
          sessionId: 0,
          serverTick: lastServerTick,
          rejectReason: FIRE_REJECT_REASON.notAccepted
        })
      );
      return;
    }

    if (session.matchAssignment === undefined) {
      session.transport.send(
        createRejectedFireResult(message, {
          sessionId: 0,
          serverTick: lastServerTick,
          rejectReason: FIRE_REJECT_REASON.noMatchAssignment
        })
      );
      return;
    }

    if (!roundState.allowsFire()) {
      session.transport.send(
        createRejectedFireResult(message, {
          sessionId: session.matchAssignment.sessionId,
          serverTick: lastServerTick,
          rejectReason: FIRE_REJECT_REASON.roundInactive
        })
      );
      return;
    }

    if (!combatState.isAlive(session.matchAssignment.sessionId)) {
      session.transport.send(
        createSourceDeadFireResult(
          createRejectedFireResult(message, {
            sessionId: session.matchAssignment.sessionId,
            serverTick: lastServerTick,
            rejectReason: FIRE_REJECT_REASON.sourceDead
          })
        )
      );
      return;
    }

    const validation = validateServerFireIntent({
      fireIntent: message,
      lastAcceptedFireSequence: session.lastAcceptedFireSequence,
      serverTick: lastServerTick,
      sessionId: session.matchAssignment.sessionId,
      worldSnapshot: combatState.createCombatEligibleWorldSnapshot(worldState.createSnapshot(lastServerTick))
    });
    session.lastAcceptedFireSequence = validation.nextLastAcceptedFireSequence;
    session.transport.send(validation.result);
    const combatResult = combatState.applyFireResult(validation.result);
    if (combatResult.applied && combatResult.state !== undefined) {
      sendCombatStateToSession(combatResult.state.targetSessionId);
    }
  }

  function recordClientLoadout(session: MutableServerRuntimeSession, message: ClientLoadoutSelectMessage): void {
    if (!session.accepted) {
      session.transport.send(
        createRejectedLoadoutState({
          sequence: message.sequence,
          serverTick: lastServerTick,
          rejectReason: LOADOUT_REJECT_REASON.notAccepted
        })
      );
      return;
    }

    if (session.matchAssignment === undefined) {
      session.transport.send(
        createRejectedLoadoutState({
          sequence: message.sequence,
          serverTick: lastServerTick,
          rejectReason: LOADOUT_REJECT_REASON.noMatchAssignment
        })
      );
      return;
    }

    if (!roundState.allowsLoadoutSelection()) {
      session.transport.send(createRoundLockedLoadoutState(message, session.matchAssignment.sessionId, lastServerTick));
      return;
    }

    session.transport.send(
      loadoutState.selectLoadout(
        createLoadoutSelectionFromMessage(message, {
          sessionId: session.matchAssignment.sessionId,
          serverTick: lastServerTick
        })
      )
    );
  }

  function sendCombatStateToSession(sessionId: number): void {
    const message = combatState.createStateMessage(sessionId, lastServerTick);
    if (message === undefined) {
      return;
    }

    for (const runtimeSession of sessions.values()) {
      if (runtimeSession.accepted && runtimeSession.matchAssignment?.sessionId === sessionId) {
        runtimeSession.transport.send(message);
        return;
      }
    }
  }

  function sendLoadoutStateToSession(message: ServerLoadoutStateMessage): void {
    for (const runtimeSession of sessions.values()) {
      if (runtimeSession.accepted && runtimeSession.matchAssignment?.sessionId === message.sessionId) {
        runtimeSession.transport.send(message);
        return;
      }
    }
  }

  function getAcceptedSessionIds(): readonly number[] {
    const sessionIds: number[] = [];
    for (const session of sessions.values()) {
      if (session.accepted && session.matchAssignment !== undefined) {
        sessionIds.push(session.matchAssignment.sessionId);
      }
    }
    return sessionIds;
  }

  return {
    attachSession,
    connectedSessionCount,
    connectedMatchSlotCount,
    getSessionInputSequences,
    getSessionInputState,
    getWorldSnapshot,
    getCombatState,
    getLoadoutState,
    getRoundState,
    step,
    close
  };
}

export function acceptProtocolHello(
  message: ProtocolHelloMessage,
  serverTickRateHz: number = SERVER_TICK_RATE_HZ
): ProtocolAcceptMessage | ProtocolRejectMessage {
  if (message.protocolVersion !== PROTOCOL_VERSION) {
    return {
      kind: "protocol.reject",
      protocolVersion: PROTOCOL_VERSION,
      reason: "Unsupported protocol version."
    };
  }

  return {
    kind: "protocol.accept",
    protocolVersion: PROTOCOL_VERSION,
    serverTickRateHz
  };
}

export function createPong(message: PingMessage, serverTimeMs: number): PongMessage {
  return {
    kind: "pong",
    sequence: message.sequence,
    clientTimeMs: message.clientTimeMs,
    serverTimeMs
  };
}

export function createServerTick(tick: number, serverTimeMs: number): ServerTickMessage {
  return {
    kind: "server.tick",
    tick,
    serverTimeMs
  };
}

export function createServerSnapshot(
  tick: number,
  serverTimeMs: number,
  sessionCount: number,
  worldSnapshot?: WorldStateSnapshot
): ServerSnapshotMessage {
  return createServerSnapshotPlaceholder(tick, serverTimeMs, sessionCount, worldSnapshot);
}

export function createMatchAssignedMessage(assignment: MatchAssignment): MatchAssignedMessage {
  return {
    kind: "match.assigned",
    matchId: assignment.matchId,
    sessionId: assignment.sessionId,
    slotIndex: assignment.slotIndex,
    capacity: assignment.capacity,
    connectedSlots: assignment.connectedSlots
  };
}

export function createMatchUpdateMessage(
  matchId: number,
  capacity: number,
  connectedSlots: number
): MatchUpdateMessage {
  return {
    kind: "match.update",
    matchId,
    capacity,
    connectedSlots
  };
}

function createRoundLockedLoadoutState(
  message: ClientLoadoutSelectMessage,
  sessionId: number,
  serverTick: number
): ServerLoadoutStateMessage {
  return {
    kind: "server.loadout.state",
    serverTick,
    sequence: message.sequence,
    sessionId,
    profileId: 0,
    status: LOADOUT_STATUS.rejected,
    rejectReason: LOADOUT_REJECT_REASON.roundLocked
  };
}

function recordClientInput(
  session: MutableServerRuntimeSession,
  message: ClientInputMessage,
  worldState: WorldState,
  canRecordInput: (sessionId: number) => boolean
): void {
  if (session.inputPipeline === undefined) {
    return;
  }

  const result = session.inputPipeline.record(message);
  if (
    result.accepted &&
    session.matchAssignment !== undefined &&
    canRecordInput(session.matchAssignment.sessionId)
  ) {
    worldState.recordAcceptedInput(session.matchAssignment.sessionId, message);
  }
  session.transport.send(createInputAckMessage(session.inputPipeline.snapshot()));
}

export function createInputAckMessage(state: InputPipelineSnapshot): InputAckMessage {
  return {
    kind: "input.ack",
    sessionId: state.sessionId,
    lastAcceptedInputSequence: state.lastAcceptedInputSequence,
    droppedInputCount: state.droppedInputCount
  };
}
