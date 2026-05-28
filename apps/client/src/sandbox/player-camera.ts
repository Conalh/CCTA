import {
  validateArenaMapMetadata,
  type ArenaMapMetadata,
  type ArenaVector3
} from "@breachline/shared";

export const DEFAULT_PLAYER_CAMERA_EYE_HEIGHT_METERS = 1.62;

export type PlayerCameraSourcePose = Readonly<{
  x: number;
  y: number;
  z: number;
  yawRadians: number;
  pitchRadians?: number;
}>;

export type PlayerCameraPose = Readonly<{
  clampedToBounds: boolean;
  eyeHeightMeters: number;
  mapId: string;
  mapRevision: number;
  metadataValid: boolean;
  mode: "player-camera";
  pitchRadians: number;
  position: ArenaVector3;
  usedFallbackSpawn: boolean;
  yawRadians: number;
}>;

export type PlayerCameraInput = Readonly<{
  clampToBounds?: boolean;
  eyeHeightMeters?: number;
  map: ArenaMapMetadata;
  sourcePose?: PlayerCameraSourcePose;
}>;

const MAX_PITCH_RADIANS = Math.PI / 2 - 0.05;

export function derivePlayerCameraPose(input: PlayerCameraInput): PlayerCameraPose {
  const validation = validateArenaMapMetadata(input.map);
  const eyeHeightMeters = readPositiveFinite(input.eyeHeightMeters, DEFAULT_PLAYER_CAMERA_EYE_HEIGHT_METERS);
  const fallbackSource = createFallbackPlayerCameraSourcePose(input.map);
  const sourcePose = isUsableSourcePose(input.sourcePose) ? input.sourcePose : fallbackSource;
  const unclampedPosition = normalizeVector([
    sourcePose.x,
    sourcePose.y + eyeHeightMeters,
    sourcePose.z
  ]);
  const shouldClampToBounds = input.clampToBounds ?? true;
  const position = shouldClampToBounds
    ? clampPointToBounds(unclampedPosition, input.map.worldBounds.min, input.map.worldBounds.max)
    : unclampedPosition;

  return {
    clampedToBounds: !vectorsEqual(unclampedPosition, position),
    eyeHeightMeters,
    mapId: input.map.id,
    mapRevision: input.map.revision,
    metadataValid: validation.ok,
    mode: "player-camera",
    pitchRadians: readFiniteClamped(input.sourcePose?.pitchRadians, 0, -MAX_PITCH_RADIANS, MAX_PITCH_RADIANS),
    position,
    usedFallbackSpawn: sourcePose === fallbackSource,
    yawRadians: normalizeYaw(readFinite(input.sourcePose?.yawRadians, fallbackSource.yawRadians))
  };
}

export function createFallbackPlayerCameraSourcePose(map: ArenaMapMetadata): PlayerCameraSourcePose {
  const validation = validateArenaMapMetadata(map);
  const spawn = validation.ok ? map.spawnMarkers[0] : undefined;
  if (
    spawn !== undefined &&
    spawn.position.every((value) => Number.isFinite(value)) &&
    Number.isFinite(spawn.yaw)
  ) {
    return {
      x: spawn.position[0],
      y: spawn.position[1],
      z: spawn.position[2],
      yawRadians: normalizeYaw(spawn.yaw),
      pitchRadians: 0
    };
  }

  return {
    x: (map.worldBounds.min[0] + map.worldBounds.max[0]) / 2,
    y: map.worldBounds.min[1],
    z: (map.worldBounds.min[2] + map.worldBounds.max[2]) / 2,
    yawRadians: 0,
    pitchRadians: 0
  };
}

function isUsableSourcePose(sourcePose: PlayerCameraSourcePose | undefined): sourcePose is PlayerCameraSourcePose {
  return (
    sourcePose !== undefined &&
    Number.isFinite(sourcePose.x) &&
    Number.isFinite(sourcePose.y) &&
    Number.isFinite(sourcePose.z)
  );
}

function clampPointToBounds(point: ArenaVector3, min: ArenaVector3, max: ArenaVector3): ArenaVector3 {
  return [
    normalizeNumber(clamp(point[0], min[0], max[0])),
    normalizeNumber(clamp(point[1], min[1], max[1])),
    normalizeNumber(clamp(point[2], min[2], max[2]))
  ];
}

function vectorsEqual(left: ArenaVector3, right: ArenaVector3): boolean {
  return left.every((value, index) => value === right[index]);
}

function normalizeVector(value: ArenaVector3): ArenaVector3 {
  return [normalizeNumber(value[0]), normalizeNumber(value[1]), normalizeNumber(value[2])];
}

function readPositiveFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function readFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readFiniteClamped(value: number | undefined, fallback: number, min: number, max: number): number {
  return clamp(readFinite(value, fallback), min, max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeNumber(value: number): number {
  const normalized = Number(value.toFixed(6));
  return Object.is(normalized, -0) ? 0 : normalized;
}

function normalizeYaw(value: number): number {
  const twoPi = Math.PI * 2;
  const normalized = ((value + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return Object.is(normalized, -0) ? 0 : normalized;
}
