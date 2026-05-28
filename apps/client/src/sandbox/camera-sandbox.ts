export type Vector3Tuple = readonly [number, number, number];

export type SandboxCameraState = Readonly<{
  lookSensitivityRadiansPerPixel: number;
  moveSpeedMetersPerSecond: number;
  pitchRadians: number;
  position: Vector3Tuple;
  yawRadians: number;
}>;

export type SandboxLookDelta = Readonly<{
  movementX: number;
  movementY: number;
}>;

export type SandboxMoveIntent = Readonly<{
  deltaSeconds: number;
  forward: number;
  right: number;
  up: number;
}>;

export type InitialSandboxCameraStateOptions = Readonly<{
  pitchRadians?: number;
  position?: Vector3Tuple;
  yawRadians?: number;
}>;

const MAX_PITCH_RADIANS = Math.PI / 2 - 0.05;

export function createInitialSandboxCameraState(options: InitialSandboxCameraStateOptions = {}): SandboxCameraState {
  return {
    lookSensitivityRadiansPerPixel: 0.0025,
    moveSpeedMetersPerSecond: 4.2,
    pitchRadians: options.pitchRadians ?? -0.04,
    position: options.position ?? [0, 1.65, 5.8],
    yawRadians: options.yawRadians ?? 0
  };
}

export function applySandboxLook(state: SandboxCameraState, delta: SandboxLookDelta): SandboxCameraState {
  return {
    ...state,
    yawRadians: state.yawRadians - delta.movementX * state.lookSensitivityRadiansPerPixel,
    pitchRadians: clamp(
      state.pitchRadians - delta.movementY * state.lookSensitivityRadiansPerPixel,
      -MAX_PITCH_RADIANS,
      MAX_PITCH_RADIANS
    )
  };
}

export function applySandboxMovement(state: SandboxCameraState, intent: SandboxMoveIntent): SandboxCameraState {
  const deltaSeconds = Math.max(0, Math.min(intent.deltaSeconds, 0.1));
  const forward = clamp(intent.forward, -1, 1);
  const right = clamp(intent.right, -1, 1);
  const up = clamp(intent.up, -1, 1);
  const planarLength = Math.hypot(forward, right);
  const normalizedForward = planarLength > 1 ? forward / planarLength : forward;
  const normalizedRight = planarLength > 1 ? right / planarLength : right;
  const distance = state.moveSpeedMetersPerSecond * deltaSeconds;
  const forwardVector = [-Math.sin(state.yawRadians), 0, -Math.cos(state.yawRadians)] as const;
  const rightVector = [Math.cos(state.yawRadians), 0, -Math.sin(state.yawRadians)] as const;
  const [x, y, z] = state.position;

  return {
    ...state,
    position: [
      x + (forwardVector[0] * normalizedForward + rightVector[0] * normalizedRight) * distance,
      y + up * distance,
      z + (forwardVector[2] * normalizedForward + rightVector[2] * normalizedRight) * distance
    ]
  };
}

export function createSandboxMoveIntentFromKeys(keys: ReadonlySet<string>, deltaSeconds: number): SandboxMoveIntent {
  return {
    deltaSeconds,
    forward: Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
    right: Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
    up: Number(keys.has("Space")) - Number(keys.has("ShiftLeft") || keys.has("ShiftRight"))
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
