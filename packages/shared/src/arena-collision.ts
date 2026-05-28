import type {
  ArenaBlockoutPrimitive,
  ArenaMapMetadata
} from "./map-metadata.js";

export const DEFAULT_ARENA_COLLISION_RADIUS_METERS = 0.35 as const;
export const ARENA_COLLISION_LIMITS = {
  maxStaticBlockers: 64
} as const;

export type ArenaCollisionPoint = Readonly<{
  x: number;
  z: number;
}>;

export type ArenaCollisionWorldBounds = Readonly<{
  min: readonly [number, number];
  max: readonly [number, number];
}>;

export type ArenaCollisionBlockerKind = "wall" | "cover";

export type ArenaCollisionBlocker = Readonly<{
  id: string;
  sourcePrimitiveId: string;
  kind: ArenaCollisionBlockerKind;
  min: readonly [number, number];
  max: readonly [number, number];
}>;

export type ArenaCollisionGeometry = Readonly<{
  mapId: string;
  revision: number;
  playerRadiusMeters: number;
  worldBounds: ArenaCollisionWorldBounds;
  blockers: readonly ArenaCollisionBlocker[];
}>;

export type ArenaCollisionGeometryOptions = Readonly<{
  playerRadiusMeters?: number;
}>;

export type ArenaCollisionMotionInput = Readonly<{
  geometry: ArenaCollisionGeometry;
  from: ArenaCollisionPoint;
  desired: ArenaCollisionPoint;
  radiusMeters?: number;
}>;

export type ArenaCollisionMotionResult = Readonly<{
  position: ArenaCollisionPoint;
  collidedWithWorldBounds: boolean;
  collidedBlockerIds: readonly string[];
}>;

type Axis = "x" | "z";

export function deriveArenaCollisionGeometry(
  map: ArenaMapMetadata,
  options: ArenaCollisionGeometryOptions = {}
): ArenaCollisionGeometry {
  const playerRadiusMeters = readPositiveFinite(
    options.playerRadiusMeters,
    DEFAULT_ARENA_COLLISION_RADIUS_METERS
  );
  const blockers = map.primitives
    .filter(isCollisionPrimitive)
    .slice(0, ARENA_COLLISION_LIMITS.maxStaticBlockers)
    .map(toCollisionBlocker);

  return {
    mapId: map.id,
    revision: map.revision,
    playerRadiusMeters,
    worldBounds: {
      min: [map.worldBounds.min[0], map.worldBounds.min[2]],
      max: [map.worldBounds.max[0], map.worldBounds.max[2]]
    },
    blockers
  };
}

export function resolveArenaCollisionMotion(
  input: ArenaCollisionMotionInput
): ArenaCollisionMotionResult {
  const radiusMeters = readPositiveFinite(input.radiusMeters, input.geometry.playerRadiusMeters);
  const from = readCollisionPoint(input.from);
  const desired = readCollisionPoint(input.desired) ?? from;
  const clampedFrom = clampPointToWorldBounds(from, input.geometry.worldBounds, radiusMeters);
  const collidedBlockerIds = new Set<string>();
  let collidedWithWorldBounds = clampedFrom.collided;

  const resolvedX = moveAlongAxis({
    axis: "x",
    blockers: input.geometry.blockers,
    bounds: input.geometry.worldBounds,
    from: clampedFrom.position,
    radiusMeters,
    target: desired.x
  });
  collidedWithWorldBounds = collidedWithWorldBounds || resolvedX.collidedWithWorldBounds;
  for (const blockerId of resolvedX.collidedBlockerIds) {
    collidedBlockerIds.add(blockerId);
  }

  const resolvedZ = moveAlongAxis({
    axis: "z",
    blockers: input.geometry.blockers,
    bounds: input.geometry.worldBounds,
    from: resolvedX.position,
    radiusMeters,
    target: desired.z
  });
  collidedWithWorldBounds = collidedWithWorldBounds || resolvedZ.collidedWithWorldBounds;
  for (const blockerId of resolvedZ.collidedBlockerIds) {
    collidedBlockerIds.add(blockerId);
  }

  return {
    position: resolvedZ.position,
    collidedWithWorldBounds,
    collidedBlockerIds: [...collidedBlockerIds]
  };
}

function moveAlongAxis(input: Readonly<{
  axis: Axis;
  blockers: readonly ArenaCollisionBlocker[];
  bounds: ArenaCollisionWorldBounds;
  from: ArenaCollisionPoint;
  radiusMeters: number;
  target: number;
}>): ArenaCollisionMotionResult {
  const axisIndex = input.axis === "x" ? 0 : 1;
  const otherAxisIndex = input.axis === "x" ? 1 : 0;
  const axisValue = input.axis === "x" ? input.from.x : input.from.z;
  const otherAxisValue = input.axis === "x" ? input.from.z : input.from.x;
  const minBound = input.bounds.min[axisIndex] + input.radiusMeters;
  const maxBound = input.bounds.max[axisIndex] - input.radiusMeters;
  let target = clamp(input.target, minBound, maxBound);
  let collidedWithWorldBounds = target !== input.target;
  const collidedBlockerIds = new Set<string>();

  if (target === axisValue) {
    return {
      position: updateAxis(input.from, input.axis, target),
      collidedWithWorldBounds,
      collidedBlockerIds: []
    };
  }

  const direction = target > axisValue ? 1 : -1;
  for (const blocker of input.blockers) {
    const expanded = expandBlocker(blocker, input.radiusMeters);
    if (!valueWithinOpenRange(otherAxisValue, expanded.min[otherAxisIndex], expanded.max[otherAxisIndex])) {
      continue;
    }

    const nearBoundary = direction > 0 ? expanded.min[axisIndex] : expanded.max[axisIndex];
    const farBoundary = direction > 0 ? expanded.max[axisIndex] : expanded.min[axisIndex];
    const startsInside =
      axisValue > expanded.min[axisIndex] &&
      axisValue < expanded.max[axisIndex];
    const crossesBoundary =
      direction > 0
        ? axisValue <= nearBoundary && target > nearBoundary
        : axisValue >= nearBoundary && target < nearBoundary;

    if (startsInside) {
      target =
        direction > 0
          ? target >= farBoundary ? farBoundary : axisValue
          : target <= farBoundary ? farBoundary : axisValue;
      collidedBlockerIds.add(blocker.id);
      continue;
    }

    if (crossesBoundary) {
      target =
        direction > 0
          ? Math.min(target, nearBoundary)
          : Math.max(target, nearBoundary);
      collidedBlockerIds.add(blocker.id);
    }
  }

  target = clamp(target, minBound, maxBound);
  collidedWithWorldBounds = collidedWithWorldBounds || target === minBound || target === maxBound;

  return {
    position: updateAxis(input.from, input.axis, target),
    collidedWithWorldBounds,
    collidedBlockerIds: [...collidedBlockerIds]
  };
}

function isCollisionPrimitive(
  primitive: ArenaBlockoutPrimitive
): primitive is ArenaBlockoutPrimitive & { kind: ArenaCollisionBlockerKind } {
  return primitive.kind === "wall" || primitive.kind === "cover";
}

function toCollisionBlocker(primitive: ArenaBlockoutPrimitive & { kind: ArenaCollisionBlockerKind }): ArenaCollisionBlocker {
  const halfX = primitive.size[0] / 2;
  const halfZ = primitive.size[2] / 2;
  return {
    id: `collision-${primitive.id}`,
    sourcePrimitiveId: primitive.id,
    kind: primitive.kind,
    min: [primitive.position[0] - halfX, primitive.position[2] - halfZ],
    max: [primitive.position[0] + halfX, primitive.position[2] + halfZ]
  };
}

function expandBlocker(
  blocker: ArenaCollisionBlocker,
  radiusMeters: number
): ArenaCollisionBlocker {
  return {
    ...blocker,
    min: [blocker.min[0] - radiusMeters, blocker.min[1] - radiusMeters],
    max: [blocker.max[0] + radiusMeters, blocker.max[1] + radiusMeters]
  };
}

function clampPointToWorldBounds(
  point: ArenaCollisionPoint,
  bounds: ArenaCollisionWorldBounds,
  radiusMeters: number
): Readonly<{ position: ArenaCollisionPoint; collided: boolean }> {
  const x = clamp(point.x, bounds.min[0] + radiusMeters, bounds.max[0] - radiusMeters);
  const z = clamp(point.z, bounds.min[1] + radiusMeters, bounds.max[1] - radiusMeters);
  return {
    position: { x, z },
    collided: x !== point.x || z !== point.z
  };
}

function readCollisionPoint(point: ArenaCollisionPoint): ArenaCollisionPoint {
  return {
    x: Number.isFinite(point.x) ? point.x : 0,
    z: Number.isFinite(point.z) ? point.z : 0
  };
}

function updateAxis(point: ArenaCollisionPoint, axis: Axis, value: number): ArenaCollisionPoint {
  return axis === "x"
    ? {
        x: normalizeNumber(value),
        z: point.z
      }
    : {
        x: point.x,
        z: normalizeNumber(value)
      };
}

function valueWithinOpenRange(value: number, min: number, max: number): boolean {
  return value > min && value < max;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readPositiveFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeNumber(value: number): number {
  const normalized = Number(value.toFixed(6));
  return Object.is(normalized, -0) ? 0 : normalized;
}
