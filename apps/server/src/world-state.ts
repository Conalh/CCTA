import {
  EBB_TERMINAL_ARENA,
  deriveArenaCollisionGeometry,
  type ArenaCollisionGeometry,
  type ClientInputMessage,
  type SnapshotEntityReference,
  type WorldSnapshotMetadata
} from "@breachline/shared";

import {
  advancePlayerMovement,
  createInitialPlayerMovementState,
  type PlayerMovementState
} from "./movement.js";

export const DEFAULT_WORLD_ID = 1 as const;
export const DEFAULT_FIRST_WORLD_ENTITY_ID = 1 as const;

export type WorldStateConfig = Readonly<{
  collisionGeometry?: ArenaCollisionGeometry | false;
  collisionRadiusMeters?: number;
  worldId?: number;
  firstEntityId?: number;
}>;

export type SessionEntityInput = Readonly<{
  sessionId: number;
  slotIndex: number;
}>;

export type WorldEntity = SnapshotEntityReference;
export type WorldStateSnapshot = WorldSnapshotMetadata;

export type WorldState = Readonly<{
  readonly worldId: number;
  assignSessionEntity(input: SessionEntityInput): WorldEntity;
  removeSessionEntity(sessionId: number): WorldEntity | undefined;
  recordAcceptedInput(sessionId: number, input: ClientInputMessage): void;
  advanceMovement(deltaSeconds: number, options?: WorldMovementOptions): void;
  resetMovement(): readonly WorldEntity[];
  createSnapshot(tick: number): WorldStateSnapshot;
}>;

export type WorldMovementOptions = Readonly<{
  canMoveSession?: (sessionId: number) => boolean;
}>;

type MutableWorldEntity = {
  entityId: number;
  sessionId: number;
  slotIndex: number;
  active: boolean;
  movement: PlayerMovementState;
  latestInput: ClientInputMessage | undefined;
};

const DEFAULT_SLOT_STARTS = [
  { x: 0, y: 0, z: 0, yaw: 0 },
  { x: 2.75, y: 0, z: 0, yaw: 0 },
  { x: -2.75, y: 0, z: 0, yaw: 0 },
  { x: 0, y: 0, z: 2.75, yaw: 0 },
  { x: -6.5, y: 0, z: -5, yaw: 0 },
  { x: 6.5, y: 0, z: -5, yaw: 0 },
  { x: -6.5, y: 0, z: 5, yaw: 0 },
  { x: 6.5, y: 0, z: 5, yaw: 0 }
] as const;

export function createWorldState(config: WorldStateConfig = {}): WorldState {
  const worldId = readPositiveUint32(config.worldId ?? DEFAULT_WORLD_ID, "worldId");
  const collisionGeometry =
    config.collisionGeometry === false
      ? undefined
      : config.collisionGeometry ?? deriveArenaCollisionGeometry(EBB_TERMINAL_ARENA);
  let nextEntityId = readPositiveUint32(
    config.firstEntityId ?? DEFAULT_FIRST_WORLD_ENTITY_ID,
    "firstEntityId"
  );
  const entitiesBySessionId = new Map<number, MutableWorldEntity>();

  function assignSessionEntity(input: SessionEntityInput): WorldEntity {
    const sessionId = readPositiveUint32(input.sessionId, "sessionId");
    const slotIndex = readUint16(input.slotIndex, "slotIndex");
    const existing = entitiesBySessionId.get(sessionId);
    if (existing !== undefined) {
      existing.active = true;
      existing.slotIndex = slotIndex;
      existing.movement = createInitialMovementForSlot(slotIndex);
      existing.latestInput = undefined;
      return toReadonlyEntity(existing);
    }

    const entity: MutableWorldEntity = {
      entityId: nextEntityId,
      sessionId,
      slotIndex,
      active: true,
      movement: createInitialMovementForSlot(slotIndex),
      latestInput: undefined
    };
    nextEntityId += 1;
    entitiesBySessionId.set(sessionId, entity);
    return toReadonlyEntity(entity);
  }

  function removeSessionEntity(sessionIdValue: number): WorldEntity | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const entity = entitiesBySessionId.get(sessionId);
    if (entity === undefined) {
      return undefined;
    }

    entitiesBySessionId.delete(sessionId);
    return {
      ...toReadonlyEntity(entity),
      active: false
    };
  }

  function createSnapshot(tick: number): WorldStateSnapshot {
    const entities = Array.from(entitiesBySessionId.values(), toReadonlyEntity);
    return {
      worldId,
      tick: readUint32(tick, "tick"),
      entityCount: entities.length,
      entities
    };
  }

  function recordAcceptedInput(sessionIdValue: number, input: ClientInputMessage): void {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const entity = entitiesBySessionId.get(sessionId);
    if (entity !== undefined) {
      entity.latestInput = input;
    }
  }

  function advanceMovement(deltaSeconds: number, options: WorldMovementOptions = {}): void {
    for (const entity of entitiesBySessionId.values()) {
      if (options.canMoveSession !== undefined && !options.canMoveSession(entity.sessionId)) {
        continue;
      }
      if (entity.latestInput !== undefined) {
        entity.movement = advancePlayerMovement(entity.movement, entity.latestInput, {
          collisionGeometry,
          collisionRadiusMeters: config.collisionRadiusMeters,
          deltaSeconds
        });
      }
    }
  }

  function resetMovement(): readonly WorldEntity[] {
    const resetEntities: WorldEntity[] = [];
    for (const entity of entitiesBySessionId.values()) {
      entity.active = true;
      entity.movement = createInitialMovementForSlot(entity.slotIndex);
      entity.latestInput = undefined;
      resetEntities.push(toReadonlyEntity(entity));
    }
    return resetEntities;
  }

  return {
    worldId,
    assignSessionEntity,
    removeSessionEntity,
    recordAcceptedInput,
    advanceMovement,
    resetMovement,
    createSnapshot
  };
}

function createInitialMovementForSlot(slotIndex: number): PlayerMovementState {
  const slotStart = DEFAULT_SLOT_STARTS[slotIndex] ?? DEFAULT_SLOT_STARTS[0];
  return createInitialPlayerMovementState({
    x: slotStart.x,
    y: slotStart.y,
    z: slotStart.z,
    yaw: slotStart.yaw
  });
}

function toReadonlyEntity(entity: MutableWorldEntity): WorldEntity {
  return {
    entityId: entity.entityId,
    sessionId: entity.sessionId,
    slotIndex: entity.slotIndex,
    active: entity.active,
    x: entity.movement.x,
    y: entity.movement.y,
    z: entity.movement.z,
    yaw: entity.movement.yaw
  };
}

function readUint16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new Error(`${field} must be an unsigned 16-bit integer, got ${value}.`);
  }
  return value;
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
