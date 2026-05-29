import {
  CLIENT_INPUT_BUTTONS,
  DEFAULT_PLAYER_CROUCH_SPEED_MULTIPLIER,
  resolveArenaCollisionMotion,
  type ArenaCollisionGeometry,
  type ClientInputMessage,
  type SnapshotEntityReference
} from "@breachline/shared";

export const DEFAULT_CLIENT_PREDICTION_STEP_SECONDS = 1 / 60;
// Mirrors the server run speed (DEFAULT_PLAYER_MOVE_SPEED_METERS_PER_SECOND) so
// prediction stays in parity; the server owns the authoritative value.
export const DEFAULT_CLIENT_PREDICTION_SPEED_METERS_PER_SECOND = 3.96;
export const DEFAULT_CLIENT_PREDICTION_HISTORY_LIMIT = 64;

export type ClientPredictedPose = Readonly<{
  x: number;
  y: number;
  z: number;
  yaw: number;
}>;

export type ClientPredictionState = Readonly<{
  authoritativePose: ClientPredictedPose | undefined;
  predictedPose: ClientPredictedPose | undefined;
  pendingInputs: readonly ClientInputMessage[];
  lastCorrectionMagnitude: number | undefined;
  lastReconciledSnapshotTick: number | undefined;
  replayedInputCount: number;
}>;

export type ClientPredictionOptions = Readonly<{
  collisionGeometry?: ArenaCollisionGeometry;
  collisionRadiusMeters?: number;
  stepSeconds?: number;
  speedMetersPerSecond?: number;
  historyLimit?: number;
  maxReplayInputs?: number;
}>;

export type ClientPredictionReconcileInput = Readonly<{
  snapshotTick: number;
  lastAcknowledgedInputSequence?: number;
}> &
  ClientPredictionOptions;

export function createInitialClientPredictionState(): ClientPredictionState {
  return {
    authoritativePose: undefined,
    predictedPose: undefined,
    pendingInputs: [],
    lastCorrectionMagnitude: undefined,
    lastReconciledSnapshotTick: undefined,
    replayedInputCount: 0
  };
}

export function recordClientPredictionInput(
  state: ClientPredictionState,
  input: ClientInputMessage,
  options: ClientPredictionOptions = {}
): ClientPredictionState {
  if (!isValidPredictionInput(input)) {
    return state;
  }

  const pendingInputs = appendPendingInput(state.pendingInputs, input, options.historyLimit);
  return {
    ...state,
    pendingInputs,
    predictedPose:
      state.predictedPose === undefined ? undefined : advancePredictedPose(state.predictedPose, input, options)
  };
}

export function acknowledgeClientPredictionInputs(
  state: ClientPredictionState,
  lastAcknowledgedInputSequence: number
): ClientPredictionState {
  if (!Number.isInteger(lastAcknowledgedInputSequence) || lastAcknowledgedInputSequence < 0) {
    return state;
  }

  return {
    ...state,
    pendingInputs: state.pendingInputs.filter((input) => input.sequence > lastAcknowledgedInputSequence)
  };
}

export function reconcileClientPredictionWithSnapshot(
  state: ClientPredictionState,
  entity: SnapshotEntityReference,
  input: ClientPredictionReconcileInput
): ClientPredictionState {
  const authoritativePose = readAuthoritativePose(entity);
  if (authoritativePose === undefined || !Number.isInteger(input.snapshotTick) || input.snapshotTick < 0) {
    return state;
  }

  const lastAcknowledgedInputSequence = input.lastAcknowledgedInputSequence ?? 0;
  const pendingInputs = state.pendingInputs.filter(
    (pendingInput) => pendingInput.sequence > lastAcknowledgedInputSequence
  );
  const replayLimit = Math.max(0, input.maxReplayInputs ?? pendingInputs.length);
  const replayInputs = pendingInputs.slice(Math.max(0, pendingInputs.length - replayLimit));
  let predictedPose = authoritativePose;

  for (const pendingInput of replayInputs) {
    predictedPose = advancePredictedPose(predictedPose, pendingInput, input);
  }

  return {
    authoritativePose,
    predictedPose,
    pendingInputs,
    lastCorrectionMagnitude:
      state.predictedPose === undefined ? 0 : calculateCorrectionMagnitude(state.predictedPose, authoritativePose),
    lastReconciledSnapshotTick: input.snapshotTick,
    replayedInputCount: replayInputs.length
  };
}

function advancePredictedPose(
  pose: ClientPredictedPose,
  input: ClientInputMessage,
  options: ClientPredictionOptions
): ClientPredictedPose {
  if (!isValidPredictionInput(input)) {
    return pose;
  }

  const stepSeconds = options.stepSeconds ?? DEFAULT_CLIENT_PREDICTION_STEP_SECONDS;
  const speedMetersPerSecond =
    options.speedMetersPerSecond ?? DEFAULT_CLIENT_PREDICTION_SPEED_METERS_PER_SECOND;
  if (!Number.isFinite(stepSeconds) || stepSeconds <= 0 || !Number.isFinite(speedMetersPerSecond)) {
    return pose;
  }

  const yaw = normalizeYaw(input.yaw);
  const forwardIntent =
    Number(hasButton(input.buttons, CLIENT_INPUT_BUTTONS.forward)) -
    Number(hasButton(input.buttons, CLIENT_INPUT_BUTTONS.backward));
  const rightIntent =
    Number(hasButton(input.buttons, CLIENT_INPUT_BUTTONS.right)) -
    Number(hasButton(input.buttons, CLIENT_INPUT_BUTTONS.left));
  const intentLength = Math.hypot(forwardIntent, rightIntent);
  const normalizedForward = intentLength > 1 ? forwardIntent / intentLength : forwardIntent;
  const normalizedRight = intentLength > 1 ? rightIntent / intentLength : rightIntent;
  // Match the server's crouch slow-down so crouch-walking does not desync horizontally.
  const crouchMultiplier = hasButton(input.buttons, CLIENT_INPUT_BUTTONS.crouch)
    ? DEFAULT_PLAYER_CROUCH_SPEED_MULTIPLIER
    : 1;
  const distance = speedMetersPerSecond * crouchMultiplier * stepSeconds;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const desired = {
    x: pose.x + (forwardX * normalizedForward + rightX * normalizedRight) * distance,
    z: pose.z + (forwardZ * normalizedForward + rightZ * normalizedRight) * distance
  };
  const position =
    options.collisionGeometry === undefined
      ? desired
      : resolveArenaCollisionMotion({
          geometry: options.collisionGeometry,
          from: {
            x: pose.x,
            z: pose.z
          },
          desired,
          radiusMeters: options.collisionRadiusMeters
        }).position;

  return {
    x: position.x,
    y: pose.y,
    z: position.z,
    yaw
  };
}

function appendPendingInput(
  pendingInputs: readonly ClientInputMessage[],
  input: ClientInputMessage,
  historyLimit = DEFAULT_CLIENT_PREDICTION_HISTORY_LIMIT
): readonly ClientInputMessage[] {
  const nextInputs = [...pendingInputs.filter((pendingInput) => pendingInput.sequence !== input.sequence), input].sort(
    (left, right) => left.sequence - right.sequence
  );
  return nextInputs.slice(Math.max(0, nextInputs.length - Math.max(0, historyLimit)));
}

function readAuthoritativePose(entity: SnapshotEntityReference): ClientPredictedPose | undefined {
  if (
    !entity.active ||
    !Number.isFinite(entity.x) ||
    !Number.isFinite(entity.y) ||
    !Number.isFinite(entity.z) ||
    !Number.isFinite(entity.yaw)
  ) {
    return undefined;
  }

  return {
    x: entity.x,
    y: entity.y,
    z: entity.z,
    yaw: normalizeYaw(entity.yaw)
  };
}

function calculateCorrectionMagnitude(left: ClientPredictedPose, right: ClientPredictedPose): number {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function hasButton(buttons: number, mask: number): boolean {
  return (buttons & mask) !== 0;
}

function isValidPredictionInput(input: ClientInputMessage): boolean {
  return (
    Number.isInteger(input.sequence) &&
    input.sequence >= 0 &&
    Number.isFinite(input.clientTimeMs) &&
    Number.isInteger(input.buttons) &&
    input.buttons >= 0 &&
    input.buttons <= 0xffffffff &&
    Number.isFinite(input.yaw) &&
    Number.isFinite(input.pitch)
  );
}

function normalizeYaw(value: number): number {
  const twoPi = Math.PI * 2;
  const normalized = ((value + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return Object.is(normalized, -0) ? 0 : normalized;
}
