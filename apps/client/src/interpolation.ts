import type { ServerSnapshotMessage, SnapshotEntityReference } from "@breachline/shared";

export const DEFAULT_REMOTE_INTERPOLATION_DELAY_MS = 100;
export const DEFAULT_REMOTE_INTERPOLATION_BUFFER_LIMIT = 32;

export type RemotePresentationPose = Readonly<{
  entityId: number;
  sessionId: number;
  slotIndex: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  crouched: boolean;
  sourceTick: number;
}>;

export type RemoteInterpolationSnapshot = Readonly<{
  tick: number;
  serverTimeMs: number;
  remoteEntities: readonly RemotePresentationPose[];
}>;

export type RemoteInterpolationState = Readonly<{
  snapshots: readonly RemoteInterpolationSnapshot[];
  interpolatedRemotePoses: readonly RemotePresentationPose[];
  representativeRemotePose: RemotePresentationPose | undefined;
  remoteEntityCount: number;
  interpolationDelayMs: number;
  bufferLimit: number;
  lastInterpolatedTick: number | undefined;
  lastInterpolatedTimeMs: number | undefined;
}>;

export type RemoteInterpolationOptions = Readonly<{
  interpolationDelayMs?: number;
  bufferLimit?: number;
}>;

export type RemoteInterpolationSnapshotOptions = RemoteInterpolationOptions &
  Readonly<{
    localSessionId: number | undefined;
  }>;

export function createInitialRemoteInterpolationState(
  options: RemoteInterpolationOptions = {}
): RemoteInterpolationState {
  return {
    snapshots: [],
    interpolatedRemotePoses: [],
    representativeRemotePose: undefined,
    remoteEntityCount: 0,
    interpolationDelayMs: readPositiveFinite(
      options.interpolationDelayMs,
      DEFAULT_REMOTE_INTERPOLATION_DELAY_MS
    ),
    bufferLimit: readPositiveInteger(options.bufferLimit, DEFAULT_REMOTE_INTERPOLATION_BUFFER_LIMIT),
    lastInterpolatedTick: undefined,
    lastInterpolatedTimeMs: undefined
  };
}

export function recordRemoteInterpolationSnapshot(
  state: RemoteInterpolationState,
  snapshot: ServerSnapshotMessage,
  options: RemoteInterpolationSnapshotOptions
): RemoteInterpolationState {
  if (!isValidSessionId(options.localSessionId) || !isValidSnapshotHeader(snapshot)) {
    return state;
  }

  const lastSnapshot = state.snapshots[state.snapshots.length - 1];
  if (
    lastSnapshot !== undefined &&
    (snapshot.tick <= lastSnapshot.tick || snapshot.serverTimeMs <= lastSnapshot.serverTimeMs)
  ) {
    return state;
  }

  const remoteEntities = readRemoteEntities(snapshot, options.localSessionId);
  if (remoteEntities === undefined) {
    return state;
  }

  const bufferLimit = readPositiveInteger(options.bufferLimit, state.bufferLimit);
  const snapshots = appendBounded(
    state.snapshots,
    {
      tick: snapshot.tick,
      serverTimeMs: snapshot.serverTimeMs,
      remoteEntities
    },
    bufferLimit
  );

  return {
    ...state,
    snapshots,
    remoteEntityCount: remoteEntities.length,
    bufferLimit,
    interpolationDelayMs: readPositiveFinite(options.interpolationDelayMs, state.interpolationDelayMs),
    ...(remoteEntities.length === 0
      ? {
          interpolatedRemotePoses: [],
          representativeRemotePose: undefined,
          lastInterpolatedTick: undefined,
          lastInterpolatedTimeMs: undefined
        }
      : {})
  };
}

export function sampleRemoteInterpolation(
  state: RemoteInterpolationState,
  latestServerTimeMs: number
): RemoteInterpolationState {
  if (!Number.isFinite(latestServerTimeMs) || state.snapshots.length === 0) {
    return state;
  }

  const targetTimeMs = latestServerTimeMs - state.interpolationDelayMs;
  const [olderSnapshot, newerSnapshot, sampleTimeMs] = chooseSnapshotPair(state.snapshots, targetTimeMs);
  const interpolatedRemotePoses = interpolateRemotePoses(olderSnapshot, newerSnapshot, sampleTimeMs);

  return {
    ...state,
    interpolatedRemotePoses,
    representativeRemotePose: interpolatedRemotePoses[0],
    remoteEntityCount: state.snapshots[state.snapshots.length - 1].remoteEntities.length,
    lastInterpolatedTick: newerSnapshot.tick,
    lastInterpolatedTimeMs: sampleTimeMs
  };
}

function readRemoteEntities(
  snapshot: ServerSnapshotMessage,
  localSessionId: number
): readonly RemotePresentationPose[] | undefined {
  const remoteEntities: RemotePresentationPose[] = [];

  for (const entity of snapshot.entities) {
    if (entity.sessionId === localSessionId || !entity.active) {
      continue;
    }

    const pose = readRemotePose(entity, snapshot.tick);
    if (pose === undefined) {
      return undefined;
    }

    remoteEntities.push(pose);
  }

  return remoteEntities;
}

function readRemotePose(entity: SnapshotEntityReference, sourceTick: number): RemotePresentationPose | undefined {
  if (
    !isValidEntityId(entity.entityId) ||
    !isValidSessionId(entity.sessionId) ||
    !isValidSlotIndex(entity.slotIndex) ||
    !Number.isFinite(entity.x) ||
    !Number.isFinite(entity.y) ||
    !Number.isFinite(entity.z) ||
    !Number.isFinite(entity.yaw)
  ) {
    return undefined;
  }

  return {
    entityId: entity.entityId,
    sessionId: entity.sessionId,
    slotIndex: entity.slotIndex,
    x: entity.x,
    y: entity.y,
    z: entity.z,
    yaw: normalizeYaw(entity.yaw),
    crouched: entity.crouched === true,
    sourceTick
  };
}

function chooseSnapshotPair(
  snapshots: readonly RemoteInterpolationSnapshot[],
  targetTimeMs: number
): readonly [RemoteInterpolationSnapshot, RemoteInterpolationSnapshot, number] {
  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];
  if (snapshots.length === 1 || targetTimeMs <= firstSnapshot.serverTimeMs) {
    return [firstSnapshot, snapshots[1] ?? firstSnapshot, firstSnapshot.serverTimeMs];
  }

  for (let index = 0; index < snapshots.length - 1; index += 1) {
    const olderSnapshot = snapshots[index];
    const newerSnapshot = snapshots[index + 1];
    if (targetTimeMs >= olderSnapshot.serverTimeMs && targetTimeMs <= newerSnapshot.serverTimeMs) {
      return [olderSnapshot, newerSnapshot, targetTimeMs];
    }
  }

  return [lastSnapshot, lastSnapshot, lastSnapshot.serverTimeMs];
}

function interpolateRemotePoses(
  olderSnapshot: RemoteInterpolationSnapshot,
  newerSnapshot: RemoteInterpolationSnapshot,
  sampleTimeMs: number
): readonly RemotePresentationPose[] {
  if (olderSnapshot === newerSnapshot) {
    return newerSnapshot.remoteEntities;
  }

  const elapsedMs = newerSnapshot.serverTimeMs - olderSnapshot.serverTimeMs;
  if (elapsedMs <= 0) {
    return [];
  }

  const alpha = Math.min(1, Math.max(0, (sampleTimeMs - olderSnapshot.serverTimeMs) / elapsedMs));
  const newerByEntityId = new Map(newerSnapshot.remoteEntities.map((entity) => [entity.entityId, entity]));
  const interpolatedPoses: RemotePresentationPose[] = [];

  for (const olderPose of olderSnapshot.remoteEntities) {
    const newerPose = newerByEntityId.get(olderPose.entityId);
    if (newerPose === undefined || newerPose.sessionId !== olderPose.sessionId) {
      continue;
    }

    interpolatedPoses.push({
      entityId: olderPose.entityId,
      sessionId: olderPose.sessionId,
      slotIndex: newerPose.slotIndex,
      x: lerp(olderPose.x, newerPose.x, alpha),
      y: lerp(olderPose.y, newerPose.y, alpha),
      z: lerp(olderPose.z, newerPose.z, alpha),
      yaw: interpolateYaw(olderPose.yaw, newerPose.yaw, alpha),
      crouched: newerPose.crouched,
      sourceTick: newerSnapshot.tick
    });
  }

  return interpolatedPoses;
}

function appendBounded<T>(values: readonly T[], value: T, limit: number): readonly T[] {
  const nextValues = [...values, value];
  return nextValues.slice(Math.max(0, nextValues.length - limit));
}

function isValidSnapshotHeader(snapshot: ServerSnapshotMessage): boolean {
  return (
    snapshot.kind === "server.snapshot" &&
    Number.isInteger(snapshot.tick) &&
    snapshot.tick >= 0 &&
    Number.isFinite(snapshot.serverTimeMs) &&
    snapshot.serverTimeMs >= 0 &&
    Array.isArray(snapshot.entities)
  );
}

function isValidEntityId(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isValidSessionId(value: number | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidSlotIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

function readPositiveFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function readPositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function lerp(left: number, right: number, alpha: number): number {
  const value = left + (right - left) * alpha;
  return Object.is(value, -0) ? 0 : value;
}

function interpolateYaw(left: number, right: number, alpha: number): number {
  return normalizeYaw(left + shortestYawDelta(left, right) * alpha);
}

function shortestYawDelta(left: number, right: number): number {
  const twoPi = Math.PI * 2;
  return ((right - left + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
}

function normalizeYaw(value: number): number {
  if (value >= -Math.PI && value <= Math.PI) {
    return Object.is(value, -0) ? 0 : value;
  }

  const twoPi = Math.PI * 2;
  const normalized = ((value + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return Object.is(normalized, -0) ? 0 : normalized;
}
