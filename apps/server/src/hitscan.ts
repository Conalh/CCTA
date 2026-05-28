import {
  FIRE_REJECT_REASON,
  type ClientFireIntentMessage,
  type FireRejectReason,
  type ServerFireResultMessage,
  type SnapshotEntityReference,
  type WorldSnapshotMetadata
} from "@breachline/shared";

export const DEFAULT_HITSCAN_MAX_DISTANCE_METERS = 60 as const;
export const DEFAULT_HITSCAN_ENTITY_RADIUS_METERS = 0.55 as const;
export const DEFAULT_HITSCAN_EYE_HEIGHT_METERS = 1.62 as const;

export type HitscanRayInput = Readonly<{
  sourceSessionId: number;
  yaw: number;
  pitch: number;
  worldSnapshot: WorldSnapshotMetadata;
  maxDistanceMeters?: number;
  entityRadiusMeters?: number;
  eyeHeightMeters?: number;
}>;

export type HitscanCastResult = Readonly<{
  hit: boolean;
  targetEntityId: number;
  targetSessionId: number;
  distance: number;
}>;

export type FireValidationInput = Readonly<{
  fireIntent: ClientFireIntentMessage;
  lastAcceptedFireSequence: number;
  serverTick: number;
  sessionId: number;
  worldSnapshot: WorldSnapshotMetadata;
}>;

export type FireValidationResult = Readonly<{
  result: ServerFireResultMessage;
  nextLastAcceptedFireSequence: number;
}>;

const MISS_RESULT: HitscanCastResult = {
  hit: false,
  targetEntityId: 0,
  targetSessionId: 0,
  distance: 0
};

const MAX_PITCH_RADIANS = Math.PI / 2 - 0.05;

export function castHitscanRay(input: HitscanRayInput): HitscanCastResult {
  const source = input.worldSnapshot.entities.find(
    (entity) => entity.sessionId === input.sourceSessionId && entity.active
  );
  if (source === undefined || !isValidAim(input.yaw, input.pitch)) {
    return MISS_RESULT;
  }

  const radius = readPositiveFinite(input.entityRadiusMeters, DEFAULT_HITSCAN_ENTITY_RADIUS_METERS);
  const maxDistance = readPositiveFinite(input.maxDistanceMeters, DEFAULT_HITSCAN_MAX_DISTANCE_METERS);
  const eyeHeight = readPositiveFinite(input.eyeHeightMeters, DEFAULT_HITSCAN_EYE_HEIGHT_METERS);
  const origin = toEyePoint(source, eyeHeight);
  const direction = aimToDirection(input.yaw, input.pitch);
  let nearest: HitscanCastResult | undefined;

  for (const entity of input.worldSnapshot.entities) {
    if (!entity.active || entity.sessionId === source.sessionId || !isFiniteEntity(entity)) {
      continue;
    }

    const target = toEyePoint(entity, eyeHeight);
    const targetDelta = {
      x: target.x - origin.x,
      y: target.y - origin.y,
      z: target.z - origin.z
    };
    const projectedDistance = dot(targetDelta, direction);
    if (projectedDistance <= 0 || projectedDistance > maxDistance) {
      continue;
    }

    const closestPoint = {
      x: origin.x + direction.x * projectedDistance,
      y: origin.y + direction.y * projectedDistance,
      z: origin.z + direction.z * projectedDistance
    };
    const perpendicularDistance = distanceBetween(closestPoint, target);
    if (perpendicularDistance > radius) {
      continue;
    }

    const candidate: HitscanCastResult = {
      hit: true,
      targetEntityId: entity.entityId,
      targetSessionId: entity.sessionId,
      distance: normalizeDistance(projectedDistance)
    };
    if (nearest === undefined || candidate.distance < nearest.distance) {
      nearest = candidate;
    }
  }

  return nearest ?? MISS_RESULT;
}

export function validateServerFireIntent(input: FireValidationInput): FireValidationResult {
  if (input.fireIntent.sequence <= input.lastAcceptedFireSequence) {
    return rejectFire(input, FIRE_REJECT_REASON.staleSequence, input.lastAcceptedFireSequence);
  }

  if (!isValidAim(input.fireIntent.yaw, input.fireIntent.pitch)) {
    return rejectFire(input, FIRE_REJECT_REASON.invalidAim, input.lastAcceptedFireSequence);
  }

  const source = input.worldSnapshot.entities.find(
    (entity) => entity.sessionId === input.sessionId && entity.active
  );
  if (source === undefined) {
    return rejectFire(input, FIRE_REJECT_REASON.noActiveEntity, input.lastAcceptedFireSequence);
  }

  const hit = castHitscanRay({
    sourceSessionId: input.sessionId,
    yaw: input.fireIntent.yaw,
    pitch: input.fireIntent.pitch,
    worldSnapshot: input.worldSnapshot
  });
  const nextLastAcceptedFireSequence = input.fireIntent.sequence;
  return {
    nextLastAcceptedFireSequence,
    result: {
      kind: "server.fire.result",
      sequence: input.fireIntent.sequence,
      sessionId: input.sessionId,
      serverTick: input.serverTick,
      accepted: true,
      hit: hit.hit,
      targetEntityId: hit.targetEntityId,
      targetSessionId: hit.targetSessionId,
      distance: hit.distance,
      rejectReason: FIRE_REJECT_REASON.none
    }
  };
}

export function createRejectedFireResult(
  fireIntent: ClientFireIntentMessage,
  input: Readonly<{
    sessionId: number;
    serverTick: number;
    rejectReason: FireRejectReason;
  }>
): ServerFireResultMessage {
  return {
    kind: "server.fire.result",
    sequence: fireIntent.sequence,
    sessionId: input.sessionId,
    serverTick: input.serverTick,
    accepted: false,
    hit: false,
    targetEntityId: 0,
    targetSessionId: 0,
    distance: 0,
    rejectReason: input.rejectReason
  };
}

function rejectFire(
  input: FireValidationInput,
  rejectReason: FireRejectReason,
  nextLastAcceptedFireSequence: number
): FireValidationResult {
  return {
    nextLastAcceptedFireSequence,
    result: createRejectedFireResult(input.fireIntent, {
      sessionId: input.sessionId,
      serverTick: input.serverTick,
      rejectReason
    })
  };
}

function aimToDirection(yaw: number, pitch: number): Readonly<{ x: number; y: number; z: number }> {
  const horizontalScale = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * horizontalScale,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * horizontalScale
  };
}

function toEyePoint(
  entity: SnapshotEntityReference,
  eyeHeight: number
): Readonly<{ x: number; y: number; z: number }> {
  return {
    x: entity.x,
    y: entity.y + eyeHeight,
    z: entity.z
  };
}

function isFiniteEntity(entity: SnapshotEntityReference): boolean {
  return (
    Number.isFinite(entity.x) &&
    Number.isFinite(entity.y) &&
    Number.isFinite(entity.z) &&
    Number.isFinite(entity.yaw)
  );
}

function isValidAim(yaw: number, pitch: number): boolean {
  return Number.isFinite(yaw) && Number.isFinite(pitch) && pitch >= -MAX_PITCH_RADIANS && pitch <= MAX_PITCH_RADIANS;
}

function dot(
  left: Readonly<{ x: number; y: number; z: number }>,
  right: Readonly<{ x: number; y: number; z: number }>
): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function distanceBetween(
  left: Readonly<{ x: number; y: number; z: number }>,
  right: Readonly<{ x: number; y: number; z: number }>
): number {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function readPositiveFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeDistance(value: number): number {
  const normalized = Number(value.toFixed(6));
  return Object.is(normalized, -0) ? 0 : normalized;
}
