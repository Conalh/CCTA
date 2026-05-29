import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PLAYER_GRAVITY_METERS_PER_SECOND_SQUARED,
  DEFAULT_PLAYER_JUMP_SPEED_METERS_PER_SECOND,
  advancePlayerVerticalMotion,
  isPlayerOnGround
} from "../packages/shared/dist/index.js";

const STEP = 1 / 60;

test("player vertical motion launches a jump only from the ground and lands back on it", () => {
  const onGround = { y: 0, verticalVelocity: 0 };
  assert.equal(isPlayerOnGround(onGround), true);

  // A jump from the ground adds upward velocity and leaves the plane.
  const launched = advancePlayerVerticalMotion(onGround, { deltaSeconds: STEP, jump: true });
  assert.equal(launched.y > 0, true);
  assert.equal(launched.verticalVelocity > 0, true);
  assert.equal(isPlayerOnGround(launched), false);

  // Holding jump mid-air does not double-jump: velocity only decays under gravity.
  const stillRising = advancePlayerVerticalMotion(launched, { deltaSeconds: STEP, jump: true });
  assert.equal(stillRising.verticalVelocity < launched.verticalVelocity, true);

  // Integrate the full arc; it peaks above the ground and returns to rest at y = 0.
  let state = advancePlayerVerticalMotion(onGround, { deltaSeconds: STEP, jump: true });
  let peak = state.y;
  let landed = false;
  for (let i = 0; i < 240; i += 1) {
    state = advancePlayerVerticalMotion(state, { deltaSeconds: STEP, jump: false });
    peak = Math.max(peak, state.y);
    if (state.y === 0 && state.verticalVelocity === 0) {
      landed = true;
      break;
    }
  }
  assert.equal(landed, true);
  const expectedPeak =
    DEFAULT_PLAYER_JUMP_SPEED_METERS_PER_SECOND ** 2 /
    (2 * DEFAULT_PLAYER_GRAVITY_METERS_PER_SECOND_SQUARED);
  assert.equal(Math.abs(peak - expectedPeak) < 0.2, true);
});

test("player vertical motion holds the ground at rest and clamps oversized steps", () => {
  // Standing still stays grounded every tick (gravity is absorbed by the ground clamp).
  assert.deepEqual(
    advancePlayerVerticalMotion({ y: 0, verticalVelocity: 0 }, { deltaSeconds: STEP, jump: false }),
    { y: 0, verticalVelocity: 0 }
  );

  // A huge delta is clamped so a fall cannot tunnel below the ground.
  const clamped = advancePlayerVerticalMotion(
    { y: 0.5, verticalVelocity: 0 },
    { deltaSeconds: 10, jump: false, maxDeltaSeconds: 0.1 }
  );
  assert.equal(clamped.y >= 0, true);

  // Rejump is allowed once back on the ground.
  const rejump = advancePlayerVerticalMotion({ y: 0, verticalVelocity: 0 }, { deltaSeconds: STEP, jump: true });
  assert.equal(rejump.verticalVelocity > 0, true);
});
