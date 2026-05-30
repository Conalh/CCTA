import {
  CLIENT_INPUT_BUTTONS,
  COMBAT_EVENT_KIND,
  PROTOCOL_VERSION,
  SERVER_TICK_RATE_HZ,
  TEAM,
  createServerSnapshotPlaceholder,
  getWeaponDefinition,
  isWithinPlantSite,
  teamForSlot,
  FIRE_REJECT_REASON,
  LOADOUT_REJECT_REASON,
  LOADOUT_STATUS,
  type ClientFireIntentMessage,
  type ClientInputMessage,
  type ClientLoadoutSelectMessage,
  type ClientWeaponBuyMessage,
  type ClientWeaponReloadMessage,
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
  type ServerMatchRosterMessage,
  type ServerMatchResultMessage,
  type ServerMatchStatsMessage,
  type ServerObjectiveStateMessage,
  type ServerPlayerEconomyMessage,
  type ServerRoundStateMessage,
  type ServerSnapshotMessage,
  type ServerTickMessage,
  type ServerWeaponStateMessage
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
import { createWeaponState, type WeaponStateConfig } from "./weapon-state.js";
import {
  createRoundState,
  type RoundParticipant,
  type RoundState,
  type RoundStateConfig
} from "./round-state.js";
import { createMatchStats } from "./match-stats.js";
import { createMatchProgress } from "./match-progress.js";
import { createEconomyState, type EconomyConfig } from "./economy.js";
import { createObjectiveState, type ObjectiveConfig } from "./objective.js";
import { createPlayerRegistry } from "./player-registry.js";

export type ServerClock = () => number;

export type ServerRuntimeConfig = Readonly<{
  tickRateHz: number;
  matchId?: number;
  matchCapacity?: number;
  firstSessionId?: number;
  worldId?: number;
  firstWorldEntityId?: number;
  round?: RoundStateConfig;
  weapon?: WeaponStateConfig;
  economy?: EconomyConfig;
  objective?: ObjectiveConfig;
  matchKillTarget?: number;
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
  getWeaponState(sessionId: number, serverTick?: number): ServerWeaponStateMessage | undefined;
  getEconomy(sessionId: number, serverTick?: number): ServerPlayerEconomyMessage | undefined;
  getObjectiveState(serverTick?: number): ServerObjectiveStateMessage;
  getRoundState(serverTick?: number): ServerRoundStateMessage;
  getMatchStats(serverTick?: number): ServerMatchStatsMessage;
  getMatchRoster(serverTick?: number): ServerMatchRosterMessage;
  getMatchResult(serverTick?: number): ServerMatchResultMessage;
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
  const weaponState = createWeaponState(config.weapon);
  const combatState = createCombatState({
    getDamagePerHit: (sessionId) => weaponState.getCurrentDamage(sessionId)
  });
  const roundState = createRoundState(config.round);
  const matchStats = createMatchStats();
  const matchProgress = createMatchProgress({ killTarget: config.matchKillTarget });
  const economy = createEconomyState(config.economy);
  const objective = createObjectiveState(config.objective);
  // Seeded to the idle charge so the redundant first idle broadcast is suppressed; a new
  // session still gets the live state on accept, and changes broadcast from there.
  let lastObjectiveBroadcastKey = objectiveBroadcastKey(objective.createStateMessage(0));
  const playerRegistry = createPlayerRegistry({
    defaultWeaponProfileId: config.weapon?.defaultProfileId
  });
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
        weaponState.removeSession(runtimeSession.matchAssignment?.sessionId ?? 0);
        combatState.removeSession(runtimeSession.matchAssignment?.sessionId ?? 0);
        matchStats.removeSession(runtimeSession.matchAssignment?.sessionId ?? 0);
        economy.removeSession(runtimeSession.matchAssignment?.sessionId ?? 0);
        playerRegistry.removeSession(runtimeSession.matchAssignment?.sessionId ?? 0);
        worldState.removeSessionEntity(runtimeSession.matchAssignment?.sessionId ?? 0);
        matchSession.disconnect(transport.id);
      }
      sessions.delete(transport.id);
      if (hadMatchSlot) {
        broadcastMatchUpdate();
        broadcastMatchRoster();
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
      case "client.weapon.reload":
        recordClientWeaponReload(session, message);
        break;
      case "client.weapon.buy":
        recordClientBuy(session, message);
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
    weaponState.assignSession(assignment.sessionId);
    combatState.assignEntity({
      sessionId: assignment.sessionId,
      entityId: worldEntity.entityId
    });
    matchStats.assignSession(assignment.sessionId);
    economy.assignSession(assignment.sessionId);
    playerRegistry.assignSession(assignment.sessionId, assignment.slotIndex);
    session.transport.send(response);
    session.transport.send(createMatchAssignedMessage(assignment));
    sendCombatStateToSession(assignment.sessionId);
    sendWeaponStateToSession(weaponState.createStateMessage(assignment.sessionId, lastServerTick));
    sendEconomyToSession(assignment.sessionId);
    session.transport.send(objective.createStateMessage(lastServerTick));
    broadcastMatchUpdate();
    broadcastMatchRoster();
    if (matchProgress.isMatchOver()) {
      session.transport.send(matchProgress.createResultMessage(lastServerTick));
    }
  }

  function step(tick: number, serverTimeMs = now()): void {
    lastServerTick = tick;
    const participants = getRoundParticipants();
    // The charge advances before the round decision: an armed charge suspends the
    // round's elimination/timeout logic, and a defuse/detonation forces the outcome.
    const actorCounts = getObjectiveActorCounts(participants);
    const chargeResult = objective.advance({
      serverTick: tick,
      planterCount: actorCounts.planterCount,
      defuserCount: actorCounts.defuserCount
    });
    const roundAdvance = roundState.advance({
      serverTick: tick,
      participants,
      charge: {
        armed: objective.isArmed(),
        justDefused: chargeResult.justDefused,
        justDetonated: chargeResult.justDetonated
      }
    });
    // A finished round scores for the winning side and pays out the economy; the match
    // ends when a side reaches the round target. Kills feed the scoreboard but no longer
    // decide the match.
    if (roundAdvance.roundEnded) {
      const winnerTeam = roundAdvance.winnerTeam;
      const winners = winnerTeam === undefined ? [] : participants.filter((p) => p.team === winnerTeam).map((p) => p.sessionId);
      const losers = participants
        .filter((p) => winnerTeam === undefined || p.team !== winnerTeam)
        .map((p) => p.sessionId);
      for (const sessionId of economy.awardRoundResult({ winners, losers })) {
        sendEconomyToSession(sessionId);
      }

      const matchDecided = matchProgress.recordRoundResult({
        winnerTeam,
        winnerSessionId: roundAdvance.state.winnerSessionId
      });
      if (matchDecided) {
        broadcastMatchResult();
      }
    }
    const resetCombatStates = roundAdvance.resetRound ? combatState.resetAll(tick) : [];
    const resetLoadoutStates = roundAdvance.resetRound ? loadoutState.resetAll(tick) : [];
    const resetWeaponStates = roundAdvance.resetRound ? weaponState.resetAll(tick) : [];
    if (roundAdvance.resetRound) {
      worldState.resetMovement();
      playerRegistry.resetWeapons();
      objective.reset();
    }
    const completedReloads = roundAdvance.resetRound ? [] : weaponState.advanceReloads(tick);
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
    // Broadcast the charge only when it changed, so an idle site costs nothing while a
    // live plant/defuse streams progress and the detonation countdown to everyone.
    broadcastObjectiveState(tick);

    for (const state of resetLoadoutStates) {
      sendLoadoutStateToSession(state);
    }
    for (const state of [...resetWeaponStates, ...completedReloads]) {
      sendWeaponStateToSession(state);
    }
    for (const state of [...resetCombatStates, ...respawned]) {
      sendCombatStateToSession(state.sessionId);
    }
    if (roundAdvance.resetRound) {
      broadcastMatchRoster();
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

  function getWeaponState(sessionId: number, serverTick = lastServerTick): ServerWeaponStateMessage | undefined {
    return weaponState.createStateMessage(sessionId, serverTick);
  }

  function getRoundState(serverTick = lastServerTick): ServerRoundStateMessage {
    return roundState.createStateMessage(serverTick);
  }

  function getMatchStats(serverTick = lastServerTick): ServerMatchStatsMessage {
    return matchStats.createStateMessage(serverTick);
  }

  function getMatchRoster(serverTick = lastServerTick): ServerMatchRosterMessage {
    return playerRegistry.createRosterMessage(serverTick);
  }

  function getMatchResult(serverTick = lastServerTick): ServerMatchResultMessage {
    return matchProgress.createResultMessage(serverTick);
  }

  function broadcastMatchStats(): void {
    const message = matchStats.createStateMessage(lastServerTick);
    for (const session of sessions.values()) {
      if (session.accepted) {
        session.transport.send(message);
      }
    }
  }

  function broadcastMatchResult(): void {
    const message = matchProgress.createResultMessage(lastServerTick);
    for (const session of sessions.values()) {
      if (session.accepted) {
        session.transport.send(message);
      }
    }
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

  function broadcastMatchRoster(): void {
    const message = playerRegistry.createRosterMessage(lastServerTick);
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
    if (!validation.result.accepted) {
      session.transport.send(validation.result);
      return;
    }

    const weaponFire = weaponState.tryFire({
      sessionId: session.matchAssignment.sessionId,
      serverTick: lastServerTick,
      sequence: message.sequence
    });
    if (!weaponFire.ok) {
      session.transport.send(
        createRejectedFireResult(message, {
          sessionId: session.matchAssignment.sessionId,
          serverTick: lastServerTick,
          rejectReason: weaponFire.rejectReason ?? FIRE_REJECT_REASON.notAccepted
        })
      );
      return;
    }

    session.transport.send(validation.result);
    sendWeaponStateToSession(weaponState.createStateMessage(session.matchAssignment.sessionId, lastServerTick));
    const combatResult = combatState.applyFireResult(validation.result);
    if (combatResult.applied && combatResult.state !== undefined) {
      sendCombatStateToSession(combatResult.state.targetSessionId);
      if (combatResult.state.lastEventKind === COMBAT_EVENT_KIND.death) {
        matchStats.recordKill({
          killerSessionId: combatResult.state.sourceSessionId,
          victimSessionId: combatResult.state.targetSessionId
        });
        broadcastMatchStats();
        if (economy.awardKill(combatResult.state.sourceSessionId)) {
          sendEconomyToSession(combatResult.state.sourceSessionId);
        }
      }
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

    const loadoutResult = loadoutState.selectLoadout(
      createLoadoutSelectionFromMessage(message, {
        sessionId: session.matchAssignment.sessionId,
        serverTick: lastServerTick
      })
    );
    session.transport.send(loadoutResult);
    if (loadoutResult.status === LOADOUT_STATUS.accepted && loadoutResult.profileId !== 0) {
      sendWeaponStateToSession(weaponState.setWeapon(loadoutResult.sessionId, loadoutResult.profileId));
      playerRegistry.setWeapon(loadoutResult.sessionId, loadoutResult.profileId);
      broadcastMatchRoster();
    }
  }

  function recordClientWeaponReload(
    session: MutableServerRuntimeSession,
    message: ClientWeaponReloadMessage
  ): void {
    if (!session.accepted || session.matchAssignment === undefined) {
      return;
    }

    if (!roundState.allowsFire() || !combatState.isAlive(session.matchAssignment.sessionId)) {
      return;
    }

    sendWeaponStateToSession(
      weaponState.requestReload({
        sessionId: session.matchAssignment.sessionId,
        serverTick: lastServerTick,
        sequence: message.sequence
      })
    );
  }

  function recordClientBuy(session: MutableServerRuntimeSession, message: ClientWeaponBuyMessage): void {
    if (!session.accepted || session.matchAssignment === undefined) {
      return;
    }
    const sessionId = session.matchAssignment.sessionId;
    // Buy only inside the buy window and only while alive.
    if (!roundState.allowsBuy(lastServerTick) || !combatState.isAlive(sessionId)) {
      return;
    }
    const definition = getWeaponDefinition(message.profileId);
    if (definition === undefined) {
      return;
    }
    // Already holding it: no charge, no change.
    if (weaponState.createStateMessage(sessionId, lastServerTick)?.weaponProfileId === message.profileId) {
      return;
    }
    // Charge the server-owned economy first; grant the weapon only if it was affordable.
    if (!economy.spend(sessionId, definition.price ?? 0)) {
      return;
    }
    sendWeaponStateToSession(weaponState.setWeapon(sessionId, message.profileId));
    sendEconomyToSession(sessionId);
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

  function sendWeaponStateToSession(message: ServerWeaponStateMessage | undefined): void {
    if (message === undefined) {
      return;
    }
    for (const runtimeSession of sessions.values()) {
      if (runtimeSession.accepted && runtimeSession.matchAssignment?.sessionId === message.sessionId) {
        runtimeSession.transport.send(message);
        return;
      }
    }
  }

  // Money is private: the economy message goes only to the owning session.
  function sendEconomyToSession(sessionId: number): void {
    const message = economy.createStateMessage(sessionId, lastServerTick);
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

  function getEconomy(sessionId: number, serverTick = lastServerTick): ServerPlayerEconomyMessage | undefined {
    return economy.createStateMessage(sessionId, serverTick);
  }

  function getRoundParticipants(): readonly RoundParticipant[] {
    const participants: RoundParticipant[] = [];
    for (const session of sessions.values()) {
      if (session.accepted && session.matchAssignment !== undefined) {
        const sessionId = session.matchAssignment.sessionId;
        participants.push({
          sessionId,
          team: teamForSlot(session.matchAssignment.slotIndex, matchSession.capacity),
          alive: combatState.isAlive(sessionId)
        });
      }
    }
    return participants;
  }

  // Count the live, in-site players holding use, split by side: Robbers can arm the
  // charge, Cops can defuse it. Only counts during the active round (no plant in setup).
  function getObjectiveActorCounts(
    participants: readonly RoundParticipant[]
  ): { planterCount: number; defuserCount: number } {
    if (!roundState.allowsFire()) {
      return { planterCount: 0, defuserCount: 0 };
    }
    const teamBySession = new Map(participants.map((participant) => [participant.sessionId, participant.team]));
    let planterCount = 0;
    let defuserCount = 0;
    for (const occupant of worldState.listOccupants()) {
      if (
        !combatState.isAlive(occupant.sessionId) ||
        (occupant.buttons & CLIENT_INPUT_BUTTONS.use) === 0 ||
        !isWithinPlantSite(occupant.x, occupant.z)
      ) {
        continue;
      }
      const team = teamBySession.get(occupant.sessionId);
      if (team === TEAM.robbers) {
        planterCount += 1;
      } else if (team === TEAM.cops) {
        defuserCount += 1;
      }
    }
    return { planterCount, defuserCount };
  }

  function broadcastObjectiveState(serverTick: number): void {
    const message = objective.createStateMessage(serverTick);
    const key = objectiveBroadcastKey(message);
    if (key === lastObjectiveBroadcastKey) {
      return;
    }
    lastObjectiveBroadcastKey = key;
    for (const session of sessions.values()) {
      if (session.accepted) {
        session.transport.send(message);
      }
    }
  }

  function getObjectiveState(serverTick = lastServerTick): ServerObjectiveStateMessage {
    return objective.createStateMessage(serverTick);
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
    getWeaponState,
    getEconomy,
    getObjectiveState,
    getRoundState,
    getMatchStats,
    getMatchRoster,
    getMatchResult,
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

function objectiveBroadcastKey(message: ServerObjectiveStateMessage): string {
  return `${message.chargePhase}:${message.plantProgress}:${message.defuseProgress}:${message.detonationTick}`;
}

export function createInputAckMessage(state: InputPipelineSnapshot): InputAckMessage {
  return {
    kind: "input.ack",
    sessionId: state.sessionId,
    lastAcceptedInputSequence: state.lastAcceptedInputSequence,
    droppedInputCount: state.droppedInputCount
  };
}
