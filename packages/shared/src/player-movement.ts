// Server-authoritative vertical motion (jump + gravity) on the flat arena plane. This is a
// pure Euler step the server runs each tick; the client does not integrate gravity (it
// follows the authoritative height from snapshots), so there is no vertical prediction to
// diverge. Collision stays 2D (x/z) -- jump is a vertical arc that lands back on the ground.

export const DEFAULT_PLAYER_GRAVITY_METERS_PER_SECOND_SQUARED = 24 as const;
export const DEFAULT_PLAYER_JUMP_SPEED_METERS_PER_SECOND = 7 as const;
export const DEFAULT_PLAYER_GROUND_Y = 0 as const;
export const DEFAULT_PLAYER_VERTICAL_MAX_DELTA_SECONDS = 0.1 as const;

// Crouch is server-authoritative: it slows planar movement and lowers the stance, which
// lowers the eye point (used by the camera, the remote model, and hitscan) so a crouched
// player can duck a level shot.
export const DEFAULT_PLAYER_CROUCH_SPEED_MULTIPLIER = 0.5 as const;
export const DEFAULT_PLAYER_STANDING_EYE_HEIGHT_METERS = 1.62 as const;
export const DEFAULT_PLAYER_CROUCH_EYE_HEIGHT_METERS = 1.0 as const;

export function playerEyeHeightMeters(crouched: boolean): number {
  return crouched ? DEFAULT_PLAYER_CROUCH_EYE_HEIGHT_METERS : DEFAULT_PLAYER_STANDING_EYE_HEIGHT_METERS;
}

export type PlayerVerticalMotionState = Readonly<{
  y: number;
  verticalVelocity: number;
}>;

export type PlayerVerticalMotionStep = Readonly<{
  deltaSeconds: number;
  jump: boolean;
  gravity?: number;
  jumpSpeed?: number;
  groundY?: number;
  maxDeltaSeconds?: number;
}>;

export function isPlayerOnGround(state: PlayerVerticalMotionState, groundY: number = DEFAULT_PLAYER_GROUND_Y): boolean {
  return state.y <= groundY + 1e-6 && state.verticalVelocity <= 0;
}

export function advancePlayerVerticalMotion(
  state: PlayerVerticalMotionState,
  step: PlayerVerticalMotionStep
): PlayerVerticalMotionState {
  const groundY = readFinite(step.groundY, DEFAULT_PLAYER_GROUND_Y);
  const gravity = readPositiveFinite(step.gravity, DEFAULT_PLAYER_GRAVITY_METERS_PER_SECOND_SQUARED);
  const jumpSpeed = readPositiveFinite(step.jumpSpeed, DEFAULT_PLAYER_JUMP_SPEED_METERS_PER_SECOND);
  const maxDeltaSeconds = readPositiveFinite(step.maxDeltaSeconds, DEFAULT_PLAYER_VERTICAL_MAX_DELTA_SECONDS);
  const deltaSeconds = clamp(readFinite(step.deltaSeconds, 0), 0, maxDeltaSeconds);

  let y = readFinite(state.y, groundY);
  let verticalVelocity = readFinite(state.verticalVelocity, 0);
  if (deltaSeconds <= 0) {
    return { y: normalizeNumber(y), verticalVelocity: normalizeNumber(verticalVelocity) };
  }

  // Jump only launches from the ground; holding jump rejumps on the next landing.
  if (step.jump === true && isPlayerOnGround({ y, verticalVelocity }, groundY)) {
    verticalVelocity = jumpSpeed;
  }

  verticalVelocity -= gravity * deltaSeconds;
  y += verticalVelocity * deltaSeconds;
  if (y <= groundY) {
    y = groundY;
    verticalVelocity = 0;
  }

  return { y: normalizeNumber(y), verticalVelocity: normalizeNumber(verticalVelocity) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readPositiveFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeNumber(value: number): number {
  const normalized = Number(value.toFixed(6));
  return Object.is(normalized, -0) ? 0 : normalized;
}
