import {
  COMBAT_EVENT_KIND,
  FIRE_REJECT_REASON,
  type CombatEventKind,
  type ServerCombatStateMessage,
  type ServerFireResultMessage,
  type WorldSnapshotMetadata
} from "@breachline/shared";

export const DEFAULT_COMBAT_MAX_HEALTH = 100 as const;
export const DEFAULT_COMBAT_DAMAGE_PER_HIT = 50 as const;
export const DEFAULT_RESPAWN_DELAY_TICKS = 3 as const;
// Fraction of each incoming hit that armor absorbs (until the armor pool depletes).
export const ARMOR_ABSORB_FRACTION = 0.5 as const;

export const COMBAT_APPLY_REJECT_REASON = {
  notAccepted: "not-accepted",
  missed: "missed",
  sourceUnknown: "source-unknown",
  sourceDead: "source-dead",
  targetUnknown: "target-unknown",
  targetDead: "target-dead"
} as const;

export type CombatApplyRejectReason =
  (typeof COMBAT_APPLY_REJECT_REASON)[keyof typeof COMBAT_APPLY_REJECT_REASON];

export type CombatStateConfig = Readonly<{
  maxHealth?: number;
  damagePerHit?: number;
  respawnDelayTicks?: number;
  getDamagePerHit?: (sourceSessionId: number) => number | undefined;
}>;

export type CombatEntityInput = Readonly<{
  sessionId: number;
  entityId: number;
}>;

export type CombatDamageInput = Readonly<{
  targetSessionId: number;
  sourceSessionId: number;
  amount: number;
  serverTick: number;
  sequence?: number;
}>;

export type CombatSessionState = Omit<ServerCombatStateMessage, "kind" | "serverTick">;

export type CombatApplyResult = Readonly<{
  applied: boolean;
  rejectReason?: CombatApplyRejectReason;
  state?: CombatSessionState;
  // The target's armor after this hit (when applied), so the runtime can broadcast it.
  armor?: number;
}>;

export type CombatState = Readonly<{
  assignEntity(input: CombatEntityInput): CombatSessionState;
  removeSession(sessionId: number): CombatSessionState | undefined;
  isAlive(sessionId: number): boolean;
  getSessionState(sessionId: number): CombatSessionState | undefined;
  applyFireResult(result: ServerFireResultMessage): CombatApplyResult;
  // Direct server-authoritative damage (e.g. a grenade blast), through the same armor/death
  // path as a hitscan hit.
  applyDamage(input: CombatDamageInput): CombatApplyResult;
  // Armor is a server-owned damage buffer, separate from the broadcast combat state.
  setArmor(sessionId: number, amount: number): boolean;
  getArmor(sessionId: number): number;
  advanceRespawns(serverTick: number): readonly CombatSessionState[];
  resetAll(serverTick: number): readonly CombatSessionState[];
  createCombatEligibleWorldSnapshot(worldSnapshot: WorldSnapshotMetadata): WorldSnapshotMetadata;
  createStateMessage(sessionId: number, serverTick: number): ServerCombatStateMessage | undefined;
}>;

type MutableCombatSessionState = {
  sessionId: number;
  entityId: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  deathTick: number;
  respawnEligibleTick: number;
  lastEventKind: CombatEventKind;
  lastEventTick: number;
  lastEventSequence: number;
  sourceSessionId: number;
  targetSessionId: number;
  damage: number;
  armor: number;
};

export function createCombatState(config: CombatStateConfig = {}): CombatState {
  const maxHealth = readPositiveUint16(config.maxHealth ?? DEFAULT_COMBAT_MAX_HEALTH, "maxHealth");
  const damagePerHit = readPositiveUint16(config.damagePerHit ?? DEFAULT_COMBAT_DAMAGE_PER_HIT, "damagePerHit");
  const respawnDelayTicks = readUint32(config.respawnDelayTicks ?? DEFAULT_RESPAWN_DELAY_TICKS, "respawnDelayTicks");
  const getDamagePerHit = config.getDamagePerHit;
  const sessions = new Map<number, MutableCombatSessionState>();

  function assignEntity(input: CombatEntityInput): CombatSessionState {
    const sessionId = readPositiveUint32(input.sessionId, "sessionId");
    const entityId = readPositiveUint32(input.entityId, "entityId");
    const state: MutableCombatSessionState = {
      sessionId,
      entityId,
      health: maxHealth,
      maxHealth,
      alive: true,
      deathTick: 0,
      respawnEligibleTick: 0,
      lastEventKind: COMBAT_EVENT_KIND.none,
      lastEventTick: 0,
      lastEventSequence: 0,
      sourceSessionId: 0,
      targetSessionId: 0,
      damage: 0,
      armor: 0
    };
    sessions.set(sessionId, state);
    return toReadonlyState(state);
  }

  function removeSession(sessionIdValue: number): CombatSessionState | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    if (state === undefined) {
      return undefined;
    }
    sessions.delete(sessionId);
    return toReadonlyState(state);
  }

  function isAlive(sessionIdValue: number): boolean {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    return sessions.get(sessionId)?.alive === true;
  }

  function getSessionState(sessionIdValue: number): CombatSessionState | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    return state === undefined ? undefined : toReadonlyState(state);
  }

  function applyFireResult(result: ServerFireResultMessage): CombatApplyResult {
    if (!result.accepted) {
      return {
        applied: false,
        rejectReason: COMBAT_APPLY_REJECT_REASON.notAccepted
      };
    }

    if (!result.hit) {
      return {
        applied: false,
        rejectReason: COMBAT_APPLY_REJECT_REASON.missed
      };
    }

    const source = sessions.get(result.sessionId);
    if (source === undefined) {
      return {
        applied: false,
        rejectReason: COMBAT_APPLY_REJECT_REASON.sourceUnknown
      };
    }

    if (!source.alive) {
      return {
        applied: false,
        rejectReason: COMBAT_APPLY_REJECT_REASON.sourceDead,
        state: toReadonlyState(source)
      };
    }

    const target = sessions.get(result.targetSessionId);
    if (target === undefined) {
      return {
        applied: false,
        rejectReason: COMBAT_APPLY_REJECT_REASON.targetUnknown
      };
    }

    if (!target.alive) {
      return {
        applied: false,
        rejectReason: COMBAT_APPLY_REJECT_REASON.targetDead,
        state: toReadonlyState(target)
      };
    }

    const resolvedDamagePerHit = readPositiveUint16(
      getDamagePerHit?.(source.sessionId) ?? damagePerHit,
      "damagePerHit"
    );
    return applyDamageToTarget(target, resolvedDamagePerHit, result.sessionId, result.serverTick, result.sequence);
  }

  // Shared damage application: armor absorbs a fraction of the hit (capped by the pool)
  // before it reaches health, then health/death/event fields are updated.
  function applyDamageToTarget(
    target: MutableCombatSessionState,
    incoming: number,
    sourceSessionId: number,
    serverTick: number,
    sequence: number
  ): CombatApplyResult {
    const absorbed = target.armor > 0 ? Math.min(target.armor, Math.floor(incoming * ARMOR_ABSORB_FRACTION)) : 0;
    target.armor -= absorbed;
    const healthDamage = incoming - absorbed;
    const nextHealth = Math.max(0, target.health - healthDamage);
    const died = nextHealth === 0;
    target.health = nextHealth;
    target.alive = !died;
    target.deathTick = died ? serverTick : 0;
    target.respawnEligibleTick = died ? serverTick + respawnDelayTicks : 0;
    target.lastEventKind = died ? COMBAT_EVENT_KIND.death : COMBAT_EVENT_KIND.damage;
    target.lastEventTick = serverTick;
    target.lastEventSequence = sequence;
    target.sourceSessionId = sourceSessionId;
    target.targetSessionId = target.sessionId;
    target.damage = healthDamage;

    return {
      applied: true,
      state: toReadonlyState(target),
      armor: target.armor
    };
  }

  function applyDamage(input: CombatDamageInput): CombatApplyResult {
    const target = sessions.get(readPositiveUint32(input.targetSessionId, "targetSessionId"));
    if (target === undefined) {
      return { applied: false, rejectReason: COMBAT_APPLY_REJECT_REASON.targetUnknown };
    }
    if (!target.alive) {
      return { applied: false, rejectReason: COMBAT_APPLY_REJECT_REASON.targetDead, state: toReadonlyState(target) };
    }
    const incoming = Math.max(0, Math.trunc(input.amount));
    if (incoming <= 0) {
      return { applied: false, rejectReason: COMBAT_APPLY_REJECT_REASON.missed, state: toReadonlyState(target) };
    }
    return applyDamageToTarget(target, incoming, input.sourceSessionId, readUint32(input.serverTick, "serverTick"), input.sequence ?? 0);
  }

  function setArmor(sessionIdValue: number, amount: number): boolean {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    if (state === undefined) {
      return false;
    }
    state.armor = Math.max(0, Math.min(0xffff, Math.trunc(amount)));
    return true;
  }

  function getArmor(sessionIdValue: number): number {
    return sessions.get(readPositiveUint32(sessionIdValue, "sessionId"))?.armor ?? 0;
  }

  function advanceRespawns(serverTick: number): readonly CombatSessionState[] {
    const tick = readUint32(serverTick, "serverTick");
    const respawned: CombatSessionState[] = [];
    for (const state of sessions.values()) {
      if (!state.alive && state.respawnEligibleTick !== 0 && tick >= state.respawnEligibleTick) {
        state.health = state.maxHealth;
        state.alive = true;
        state.deathTick = 0;
        state.respawnEligibleTick = 0;
        state.lastEventKind = COMBAT_EVENT_KIND.respawn;
        state.lastEventTick = tick;
        state.lastEventSequence = 0;
        state.sourceSessionId = 0;
        state.targetSessionId = state.sessionId;
        state.damage = 0;
        respawned.push(toReadonlyState(state));
      }
    }
    return respawned;
  }

  function resetAll(serverTick: number): readonly CombatSessionState[] {
    const tick = readUint32(serverTick, "serverTick");
    const resetStates: CombatSessionState[] = [];
    for (const state of sessions.values()) {
      state.health = state.maxHealth;
      state.alive = true;
      state.deathTick = 0;
      state.respawnEligibleTick = 0;
      state.lastEventKind = COMBAT_EVENT_KIND.reset;
      state.lastEventTick = tick;
      state.lastEventSequence = 0;
      state.sourceSessionId = 0;
      state.targetSessionId = state.sessionId;
      state.damage = 0;
      // Armor does not carry between rounds: re-buy it each round.
      state.armor = 0;
      resetStates.push(toReadonlyState(state));
    }
    return resetStates;
  }

  function createCombatEligibleWorldSnapshot(worldSnapshot: WorldSnapshotMetadata): WorldSnapshotMetadata {
    const entities = worldSnapshot.entities.filter((entity) => entity.active && sessions.get(entity.sessionId)?.alive === true);
    return {
      ...worldSnapshot,
      entityCount: entities.length,
      entities
    };
  }

  function createStateMessage(
    sessionIdValue: number,
    serverTick: number
  ): ServerCombatStateMessage | undefined {
    const state = getSessionState(sessionIdValue);
    return state === undefined
      ? undefined
      : {
          kind: "server.combat.state",
          serverTick: readUint32(serverTick, "serverTick"),
          ...state
        };
  }

  return {
    assignEntity,
    removeSession,
    isAlive,
    getSessionState,
    applyFireResult,
    applyDamage,
    setArmor,
    getArmor,
    advanceRespawns,
    resetAll,
    createCombatEligibleWorldSnapshot,
    createStateMessage
  };
}

export function createSourceDeadFireResult(result: ServerFireResultMessage): ServerFireResultMessage {
  return {
    ...result,
    accepted: false,
    hit: false,
    targetEntityId: 0,
    targetSessionId: 0,
    distance: 0,
    rejectReason: FIRE_REJECT_REASON.sourceDead
  };
}

function toReadonlyState(state: MutableCombatSessionState): CombatSessionState {
  return {
    sessionId: state.sessionId,
    entityId: state.entityId,
    health: state.health,
    maxHealth: state.maxHealth,
    alive: state.alive,
    deathTick: state.deathTick,
    respawnEligibleTick: state.respawnEligibleTick,
    lastEventKind: state.lastEventKind,
    lastEventTick: state.lastEventTick,
    lastEventSequence: state.lastEventSequence,
    sourceSessionId: state.sourceSessionId,
    targetSessionId: state.targetSessionId,
    damage: state.damage
  };
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

function readPositiveUint16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 0xffff) {
    throw new Error(`${field} must be a positive unsigned 16-bit integer, got ${value}.`);
  }
  return value;
}
