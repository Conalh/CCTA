import {
  CLIENT_INPUT_BUTTONS,
  ROUND_PHASE,
  SERVER_TICK_RATE_HZ,
  createClientInputPlaceholder,
  type ArenaMapMetadata,
  type ClientInputMessage,
  type RoundPhase
} from "@breachline/shared";

import type { ConnectionStatus, ConnectionViewState, LocalEntityPosition } from "../browser/connection-state.js";
import { EBB_TERMINAL_ARENA } from "../maps/ebb-terminal.js";
import {
  derivePlayerCameraPose,
  type PlayerCameraPose,
  type PlayerCameraSourcePose
} from "../sandbox/player-camera.js";

export type Vector3Tuple = readonly [number, number, number];

export type NetworkedPlaytestInputOptions = Readonly<{
  clientTimeMs: number;
  keys: ReadonlySet<string>;
  pitchRadians?: number;
  sequence: number;
  yawRadians?: number;
}>;

export type NetworkedPlaytestRemotePlaceholder = Readonly<{
  entityId: number;
  id: string;
  position: Vector3Tuple;
  sessionId: number;
  shape: "remote-placeholder";
  slotIndex: number;
  sourceTick: number;
  yawRadians: number;
}>;

export type NetworkedPlaytestRemoteAim = Readonly<{
  distanceMeters: number;
  pitchRadians: number;
  targetEntityId: number;
  targetSessionId: number;
  yawRadians: number;
}>;

export type NetworkedPlaytestRemoteAimInput = Readonly<{
  localCameraPosition: Vector3Tuple;
  remotePlaceholders: readonly NetworkedPlaytestRemotePlaceholder[];
  targetEntityId?: number;
  targetEyeHeightMeters?: number;
}>;

export type NetworkedPlaytestPresentation = Readonly<{
  connectionStatus: ConnectionStatus;
  error: string | undefined;
  localCameraPose: PlayerCameraPose;
  localCameraSource: "predicted" | "authoritative" | "fallback";
  localEntityId: number | undefined;
  localSessionId: number | undefined;
  mapId: string;
  mapRevision: number;
  predictedPosition: Vector3Tuple | undefined;
  predictionCorrectionMagnitude: number | undefined;
  remoteEntityCount: number;
  remotePlaceholders: readonly NetworkedPlaytestRemotePlaceholder[];
  roundPhase: RoundPhase | undefined;
  roundPhaseLabel: string;
  serverPosition: Vector3Tuple | undefined;
}>;

export type NetworkedPlaytestReviewStats = Readonly<{
  acceptedConnectionCount: number;
  lastConnectionStatus: ConnectionStatus;
  lastError: string | undefined;
  predictionCorrectionMaxMagnitude: number | undefined;
  reconnectCount: number;
}>;

export type NetworkedPlaytestReviewStatsInput = Readonly<{
  connectionStatus: ConnectionStatus;
  error: string | undefined;
  predictionCorrectionMagnitude: number | undefined;
}>;

export type NetworkedPlaytestMotionContact = "unknown" | "idle" | "moving" | "blocked" | "sliding";

export type NetworkedPlaytestMotionContactInput = Readonly<{
  currentServerPosition?: Vector3Tuple;
  forwardIntent: number;
  hasMoveIntent: boolean;
  previousServerPosition?: Vector3Tuple;
  rightIntent: number;
  stationaryEpsilonMeters?: number;
  yawRadians: number;
}>;

export type NetworkedPlaytestPresentationInput = Readonly<{
  lookPitchRadians?: number;
  lookYawRadians?: number;
  map?: ArenaMapMetadata;
  state: ConnectionViewState;
}>;

const MAX_PITCH_RADIANS = Math.PI / 2 - 0.05;
export const NETWORKED_PLAYTEST_INPUT_RATE_HZ = SERVER_TICK_RATE_HZ;
export const NETWORKED_PLAYTEST_INPUT_INTERVAL_MS = 1000 / NETWORKED_PLAYTEST_INPUT_RATE_HZ;
export const NETWORKED_PLAYTEST_CAMERA_SMOOTHING_RATE = 32 as const;
export const NETWORKED_PLAYTEST_CAMERA_SNAP_DISTANCE_METERS = 2 as const;

export type NetworkedPlaytestCameraSmoothingInput = Readonly<{
  deltaSeconds: number;
  previousPosition?: Vector3Tuple;
  smoothingRate?: number;
  snapDistanceMeters?: number;
  targetPosition: Vector3Tuple;
}>;

export function createNetworkedPlaytestInputMessage(
  input: NetworkedPlaytestInputOptions
): ClientInputMessage {
  return {
    ...createClientInputPlaceholder(
      readNonNegativeInteger(input.sequence, 0),
      readFinite(input.clientTimeMs, Date.now())
    ),
    buttons: readMovementButtons(input.keys),
    yaw: normalizeYaw(readFinite(input.yawRadians, 0)),
    pitch: clamp(readFinite(input.pitchRadians, 0), -MAX_PITCH_RADIANS, MAX_PITCH_RADIANS)
  };
}

export function deriveNetworkedPlaytestAimAtRemote(
  input: NetworkedPlaytestRemoteAimInput
): NetworkedPlaytestRemoteAim | undefined {
  const cameraPosition = readVector(input.localCameraPosition);
  if (cameraPosition === undefined) {
    return undefined;
  }

  const targetEntityId = readPositiveInteger(input.targetEntityId);
  const remote = targetEntityId === undefined
    ? input.remotePlaceholders.find(isUsableRemotePlaceholder)
    : input.remotePlaceholders.find(
      (placeholder) => placeholder.entityId === targetEntityId && isUsableRemotePlaceholder(placeholder)
    );
  if (remote === undefined) {
    return undefined;
  }

  const targetEyeHeightMeters = readPositiveFinite(input.targetEyeHeightMeters, 1.62);
  const targetPosition: Vector3Tuple = [
    remote.position[0],
    normalizeNumber(remote.position[1] + targetEyeHeightMeters),
    remote.position[2]
  ];
  const deltaX = targetPosition[0] - cameraPosition[0];
  const deltaY = targetPosition[1] - cameraPosition[1];
  const deltaZ = targetPosition[2] - cameraPosition[2];
  const horizontalDistance = Math.hypot(deltaX, deltaZ);
  const distanceMeters = Math.hypot(horizontalDistance, deltaY);
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0.001 || !Number.isFinite(horizontalDistance)) {
    return undefined;
  }

  return {
    distanceMeters: normalizeNumber(distanceMeters),
    pitchRadians: normalizeNumber(clamp(Math.atan2(deltaY, horizontalDistance), -MAX_PITCH_RADIANS, MAX_PITCH_RADIANS)),
    targetEntityId: remote.entityId,
    targetSessionId: remote.sessionId,
    yawRadians: normalizeYaw(Math.atan2(-deltaX, -deltaZ))
  };
}

export function createNetworkedPlaytestPresentation(
  input: NetworkedPlaytestPresentationInput
): NetworkedPlaytestPresentation {
  const map = input.map ?? EBB_TERMINAL_ARENA;
  const localCameraSource = readLocalCameraSource(input.state);
  const localCameraPose = derivePlayerCameraPose({
    clampToBounds: false,
    map,
    sourcePose: applyLookOverride(localCameraSource.pose, input.lookYawRadians, input.lookPitchRadians)
  });
  const remotePlaceholders = input.state.remoteInterpolationState.interpolatedRemotePoses.map((pose) => ({
    entityId: pose.entityId,
    id: `remote-${pose.entityId}`,
    position: toVector3Tuple({
      x: pose.x,
      y: pose.y,
      z: pose.z
    }),
    sessionId: pose.sessionId,
    shape: "remote-placeholder" as const,
    slotIndex: pose.slotIndex,
    sourceTick: pose.sourceTick,
    yawRadians: pose.yaw
  }));

  return {
    connectionStatus: input.state.status,
    error: input.state.error,
    localCameraPose,
    localCameraSource: localCameraSource.source,
    localEntityId: input.state.localEntityId,
    localSessionId: input.state.sessionId,
    mapId: map.id,
    mapRevision: map.revision,
    predictedPosition: toOptionalVector3Tuple(input.state.predictedLocalEntityPosition),
    predictionCorrectionMagnitude: input.state.predictionCorrectionMagnitude,
    remoteEntityCount: input.state.remoteEntityCount,
    remotePlaceholders,
    roundPhase: input.state.roundPhase,
    roundPhaseLabel: formatPlaytestRoundPhase(input.state.roundPhase),
    serverPosition: toOptionalVector3Tuple(input.state.localEntityPosition)
  };
}

export function smoothNetworkedPlaytestCameraPosition(
  input: NetworkedPlaytestCameraSmoothingInput
): Vector3Tuple {
  if (input.previousPosition === undefined) {
    return input.targetPosition;
  }

  const distance = Math.hypot(
    input.targetPosition[0] - input.previousPosition[0],
    input.targetPosition[1] - input.previousPosition[1],
    input.targetPosition[2] - input.previousPosition[2]
  );
  const snapDistanceMeters = readPositiveFinite(
    input.snapDistanceMeters,
    NETWORKED_PLAYTEST_CAMERA_SNAP_DISTANCE_METERS
  );
  if (distance >= snapDistanceMeters) {
    return input.targetPosition;
  }

  const deltaSeconds = clamp(readFinite(input.deltaSeconds, 0), 0, 0.1);
  const smoothingRate = readPositiveFinite(input.smoothingRate, NETWORKED_PLAYTEST_CAMERA_SMOOTHING_RATE);
  const alpha = 1 - Math.exp(-smoothingRate * deltaSeconds);
  return [
    normalizeNumber(lerp(input.previousPosition[0], input.targetPosition[0], alpha)),
    normalizeNumber(lerp(input.previousPosition[1], input.targetPosition[1], alpha)),
    normalizeNumber(lerp(input.previousPosition[2], input.targetPosition[2], alpha))
  ];
}

export function classifyNetworkedPlaytestMotionContact(
  input: NetworkedPlaytestMotionContactInput
): NetworkedPlaytestMotionContact {
  if (!input.hasMoveIntent) {
    return "idle";
  }
  if (input.previousServerPosition === undefined || input.currentServerPosition === undefined) {
    return "unknown";
  }

  const stationaryEpsilonMeters = readPositiveFinite(input.stationaryEpsilonMeters, 0.015);
  const deltaX = input.currentServerPosition[0] - input.previousServerPosition[0];
  const deltaZ = input.currentServerPosition[2] - input.previousServerPosition[2];
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance <= stationaryEpsilonMeters) {
    return "blocked";
  }

  const yaw = normalizeYaw(input.yawRadians);
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const forwardDelta = deltaX * forwardX + deltaZ * forwardZ;
  const rightDelta = deltaX * rightX + deltaZ * rightZ;
  const wantedForward = Math.abs(input.forwardIntent) > 0;
  const wantedRight = Math.abs(input.rightIntent) > 0;
  const forwardBlocked =
    wantedForward && Math.abs(forwardDelta) <= stationaryEpsilonMeters;
  const lateralMotion = Math.abs(rightDelta) > stationaryEpsilonMeters;

  if (forwardBlocked && (wantedRight || lateralMotion)) {
    return "sliding";
  }

  return "moving";
}

export function formatPlaytestRoundPhase(value: RoundPhase | number | undefined): string {
  switch (value) {
    case undefined:
      return "-";
    case ROUND_PHASE.setup:
      return "setup";
    case ROUND_PHASE.active:
      return "active";
    case ROUND_PHASE.ended:
      return "ended";
    case ROUND_PHASE.reset:
      return "reset";
    default:
      return `unknown ${value}`;
  }
}

export function createInitialNetworkedPlaytestReviewStats(): NetworkedPlaytestReviewStats {
  return {
    acceptedConnectionCount: 0,
    lastConnectionStatus: "disconnected",
    lastError: undefined,
    predictionCorrectionMaxMagnitude: undefined,
    reconnectCount: 0
  };
}

export function updateNetworkedPlaytestReviewStats(
  stats: NetworkedPlaytestReviewStats,
  input: NetworkedPlaytestReviewStatsInput
): NetworkedPlaytestReviewStats {
  const acceptedTransition =
    input.connectionStatus === "accepted" && stats.lastConnectionStatus !== "accepted";
  const acceptedConnectionCount = stats.acceptedConnectionCount + (acceptedTransition ? 1 : 0);
  const reconnectCount =
    stats.reconnectCount + (acceptedTransition && stats.acceptedConnectionCount > 0 ? 1 : 0);
  const correctionMagnitude = readUsableCorrectionMagnitude(input.predictionCorrectionMagnitude);

  return {
    acceptedConnectionCount,
    lastConnectionStatus: input.connectionStatus,
    lastError: readLastError(stats.lastError, input.error),
    predictionCorrectionMaxMagnitude:
      correctionMagnitude === undefined
        ? stats.predictionCorrectionMaxMagnitude
        : Math.max(stats.predictionCorrectionMaxMagnitude ?? 0, correctionMagnitude),
    reconnectCount
  };
}

function readLocalCameraSource(state: ConnectionViewState): Readonly<{
  pose: PlayerCameraSourcePose | undefined;
  source: "predicted" | "authoritative" | "fallback";
}> {
  if (isUsablePosition(state.predictedLocalEntityPosition)) {
    return {
      pose: {
        x: state.predictedLocalEntityPosition.x,
        y: state.predictedLocalEntityPosition.y,
        z: state.predictedLocalEntityPosition.z,
        yawRadians: readFinite(state.predictedLocalEntityYaw, readFinite(state.localEntityYaw, 0)),
        pitchRadians: 0
      },
      source: "predicted"
    };
  }

  if (isUsablePosition(state.localEntityPosition)) {
    return {
      pose: {
        x: state.localEntityPosition.x,
        y: state.localEntityPosition.y,
        z: state.localEntityPosition.z,
        yawRadians: readFinite(state.localEntityYaw, 0),
        pitchRadians: 0
      },
      source: "authoritative"
    };
  }

  return {
    pose: undefined,
    source: "fallback"
  };
}

function applyLookOverride(
  pose: PlayerCameraSourcePose | undefined,
  yawRadians: number | undefined,
  pitchRadians: number | undefined
): PlayerCameraSourcePose | undefined {
  if (pose === undefined) {
    return undefined;
  }

  return {
    ...pose,
    yawRadians: normalizeYaw(readFinite(yawRadians, pose.yawRadians)),
    pitchRadians: clamp(readFinite(pitchRadians, pose.pitchRadians ?? 0), -MAX_PITCH_RADIANS, MAX_PITCH_RADIANS)
  };
}

function readMovementButtons(keys: ReadonlySet<string>): number {
  let buttons = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) {
    buttons |= CLIENT_INPUT_BUTTONS.forward;
  }
  if (keys.has("KeyS") || keys.has("ArrowDown")) {
    buttons |= CLIENT_INPUT_BUTTONS.backward;
  }
  if (keys.has("KeyA") || keys.has("ArrowLeft")) {
    buttons |= CLIENT_INPUT_BUTTONS.left;
  }
  if (keys.has("KeyD") || keys.has("ArrowRight")) {
    buttons |= CLIENT_INPUT_BUTTONS.right;
  }
  return buttons;
}

function isUsablePosition(position: LocalEntityPosition | undefined): position is LocalEntityPosition {
  return (
    position !== undefined &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Number.isFinite(position.z)
  );
}

function isUsableRemotePlaceholder(
  placeholder: NetworkedPlaytestRemotePlaceholder
): boolean {
  return (
    readPositiveInteger(placeholder.entityId) !== undefined &&
    readPositiveInteger(placeholder.sessionId) !== undefined &&
    readVector(placeholder.position) !== undefined
  );
}

function toOptionalVector3Tuple(position: LocalEntityPosition | undefined): Vector3Tuple | undefined {
  return position === undefined ? undefined : toVector3Tuple(position);
}

function toVector3Tuple(position: LocalEntityPosition): Vector3Tuple {
  return [normalizeNumber(position.x), normalizeNumber(position.y), normalizeNumber(position.z)];
}

function readVector(value: Vector3Tuple | undefined): Vector3Tuple | undefined {
  if (
    value === undefined ||
    value.length !== 3 ||
    !value.every((entry) => Number.isFinite(entry))
  ) {
    return undefined;
  }

  return [normalizeNumber(value[0]), normalizeNumber(value[1]), normalizeNumber(value[2])];
}

function readNonNegativeInteger(value: number, fallback: number): number {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function readPositiveInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function readFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readPositiveFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function readUsableCorrectionMagnitude(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function readLastError(previous: string | undefined, value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? previous : value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(left: number, right: number, alpha: number): number {
  return left + (right - left) * alpha;
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
