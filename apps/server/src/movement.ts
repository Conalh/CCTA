import {
  CLIENT_INPUT_BUTTONS,
  advancePlayerVerticalMotion,
  resolveArenaCollisionMotion,
  type ArenaCollisionGeometry,
  type ClientInputMessage
} from "@breachline/shared";

export const DEFAULT_PLAYER_MOVE_SPEED_METERS_PER_SECOND = 3.6 as const;
export const DEFAULT_MAX_MOVEMENT_DELTA_SECONDS = 0.1 as const;

export type PlayerMovementState = Readonly<{
  x: number;
  y: number;
  z: number;
  yaw: number;
  verticalVelocity: number;
}>;

export type InitialPlayerMovementStateInput = Partial<PlayerMovementState>;

export type PlayerMovementStep = Readonly<{
  collisionGeometry?: ArenaCollisionGeometry;
  collisionRadiusMeters?: number;
  deltaSeconds: number;
  speedMetersPerSecond?: number;
  maxDeltaSeconds?: number;
}>;

const MOVEMENT_BUTTON_MASK =
  CLIENT_INPUT_BUTTONS.forward |
  CLIENT_INPUT_BUTTONS.backward |
  CLIENT_INPUT_BUTTONS.left |
  CLIENT_INPUT_BUTTONS.right;

export function createInitialPlayerMovementState(
  input: InitialPlayerMovementStateInput = {}
): PlayerMovementState {
  return {
    x: readFiniteOrDefault(input.x, 0),
    y: readFiniteOrDefault(input.y, 0),
    z: readFiniteOrDefault(input.z, 0),
    yaw: normalizeYaw(readFiniteOrDefault(input.yaw, 0)),
    verticalVelocity: readFiniteOrDefault(input.verticalVelocity, 0)
  };
}

export function advancePlayerMovement(
  state: PlayerMovementState,
  input: ClientInputMessage,
  step: PlayerMovementStep
): PlayerMovementState {
  if (!isValidMovementInput(input) || !Number.isFinite(step.deltaSeconds) || step.deltaSeconds <= 0) {
    return state;
  }

  const maxDeltaSeconds = step.maxDeltaSeconds ?? DEFAULT_MAX_MOVEMENT_DELTA_SECONDS;
  const speedMetersPerSecond = step.speedMetersPerSecond ?? DEFAULT_PLAYER_MOVE_SPEED_METERS_PER_SECOND;
  const deltaSeconds = Math.min(step.deltaSeconds, maxDeltaSeconds);
  if (!Number.isFinite(speedMetersPerSecond) || speedMetersPerSecond < 0 || !Number.isFinite(deltaSeconds)) {
    return state;
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
  const distance = speedMetersPerSecond * deltaSeconds;
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const desired = {
    x: state.x + (forwardX * normalizedForward + rightX * normalizedRight) * distance,
    z: state.z + (forwardZ * normalizedForward + rightZ * normalizedRight) * distance
  };
  const position =
    step.collisionGeometry === undefined
      ? desired
      : resolveArenaCollisionMotion({
          geometry: step.collisionGeometry,
          from: {
            x: state.x,
            z: state.z
          },
          desired,
          radiusMeters: step.collisionRadiusMeters
        }).position;

  // Vertical motion is server-authoritative; the jump button launches from the ground and
  // gravity returns the player to the plane. Collision stays 2D, so this is a pure arc.
  const vertical = advancePlayerVerticalMotion(
    { y: state.y, verticalVelocity: state.verticalVelocity },
    {
      deltaSeconds,
      jump: hasButton(input.buttons, CLIENT_INPUT_BUTTONS.jump),
      maxDeltaSeconds
    }
  );

  return {
    x: position.x,
    y: vertical.y,
    z: position.z,
    yaw,
    verticalVelocity: vertical.verticalVelocity
  };
}

function hasButton(buttons: number, mask: number): boolean {
  return (buttons & mask) !== 0;
}

function isValidMovementInput(input: ClientInputMessage): boolean {
  return (
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

function readFiniteOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function extractMovementButtons(buttons: number): number {
  if (!Number.isInteger(buttons) || buttons < 0 || buttons > 0xffffffff) {
    return 0;
  }

  return buttons & MOVEMENT_BUTTON_MASK;
}
