import {
  DRYDOCK_SPAN_ARENA,
  deriveArenaCollisionGeometry,
  type ArenaCollisionGeometry,
  type ArenaMapMetadata,
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
  // The arena to host: drives collision geometry and the fixed slot starts. Defaults to
  // Drydock Span when omitted.
  arena?: ArenaMapMetadata;
}>;

type SlotStart = { x: number; y: number; z: number; yaw: number };

export type SessionEntityInput = Readonly<{
  sessionId: number;
  slotIndex: number;
}>;

export type WorldEntity = SnapshotEntityReference;
export type WorldStateSnapshot = WorldSnapshotMetadata;

// A ground-truth read of where each session sits and what its latest accepted input
// held. The objective uses this to find who is standing on the plant site pressing use.
export type WorldOccupant = Readonly<{
  sessionId: number;
  x: number;
  z: number;
  buttons: number;
}>;

export type WorldState = Readonly<{
  readonly worldId: number;
  assignSessionEntity(input: SessionEntityInput): WorldEntity;
  removeSessionEntity(sessionId: number): WorldEntity | undefined;
  recordAcceptedInput(sessionId: number, input: ClientInputMessage): void;
  advanceMovement(deltaSeconds: number, options?: WorldMovementOptions): void;
  resetMovement(): readonly WorldEntity[];
  createSnapshot(tick: number): WorldStateSnapshot;
  listOccupants(): readonly WorldOccupant[];
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

// Slot starts sit on Drydock Span's eight neutral spawns: a north cluster (slots
// 0-3, facing -z) and a south cluster (slots 4-7, facing +z) across the contested
// midline. Each position is collision-clear by construction (it is an arena spawn
// marker), and the harness pair (slots 0/1) shares the north end for a clear line.
const DEFAULT_SLOT_STARTS = [
  { x: -4.5, y: 0, z: -16.5, yaw: 0 },
  { x: 4.5, y: 0, z: -16.5, yaw: 0 },
  { x: -12, y: 0, z: -16.5, yaw: 0 },
  { x: 12, y: 0, z: -16.5, yaw: 0 },
  { x: -4.5, y: 0, z: 16.5, yaw: Math.PI },
  { x: 4.5, y: 0, z: 16.5, yaw: Math.PI },
  { x: -12, y: 0, z: 16.5, yaw: Math.PI },
  { x: 12, y: 0, z: 16.5, yaw: Math.PI }
] as const;

export function createWorldState(config: WorldStateConfig = {}): WorldState {
  const arena = config.arena ?? DRYDOCK_SPAN_ARENA;
  const worldId = readPositiveUint32(config.worldId ?? DEFAULT_WORLD_ID, "worldId");
  const collisionGeometry =
    config.collisionGeometry === false
      ? undefined
      : config.collisionGeometry ?? deriveArenaCollisionGeometry(arena);
  // The arena's slot starts when it declares them; otherwise the engine default (Drydock).
  const slotStarts: readonly SlotStart[] =
    arena.slotStarts !== undefined
      ? arena.slotStarts.map((start) => ({
          x: start.position[0],
          y: start.position[1],
          z: start.position[2],
          yaw: start.yaw
        }))
      : DEFAULT_SLOT_STARTS;
  let nextEntityId = readPositiveUint32(
    config.firstEntityId ?? DEFAULT_FIRST_WORLD_ENTITY_ID,
    "firstEntityId"
  );
  const entitiesBySessionId = new Map<number, MutableWorldEntity>();

  function createInitialMovementForSlot(slotIndex: number): PlayerMovementState {
    const slotStart = slotStarts[slotIndex] ?? slotStarts[0];
    return createInitialPlayerMovementState({
      x: slotStart.x,
      y: slotStart.y,
      z: slotStart.z,
      yaw: slotStart.yaw
    });
  }

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

  function listOccupants(): readonly WorldOccupant[] {
    const occupants: WorldOccupant[] = [];
    for (const entity of entitiesBySessionId.values()) {
      occupants.push({
        sessionId: entity.sessionId,
        x: entity.movement.x,
        z: entity.movement.z,
        buttons: entity.latestInput?.buttons ?? 0
      });
    }
    return occupants;
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
    createSnapshot,
    listOccupants
  };
}

function toReadonlyEntity(entity: MutableWorldEntity): WorldEntity {
  return {
    crouched: entity.movement.crouched,
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
