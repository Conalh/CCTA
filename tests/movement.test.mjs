import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_INPUT_BUTTONS,
  EBB_TERMINAL_ARENA,
  deriveArenaCollisionGeometry
} from "../packages/shared/dist/index.js";
import * as server from "../apps/server/dist/index.js";

function input(overrides = {}) {
  return {
    kind: "client.input",
    sequence: 1,
    clientTimeMs: 1000,
    buttons: 0,
    yaw: 0,
    pitch: 0,
    ...overrides
  };
}

test("movement advances flat-plane position from accepted input buttons and yaw", () => {
  assert.equal(typeof server.advancePlayerMovement, "function");

  const moved = server.advancePlayerMovement(
    server.createInitialPlayerMovementState({ x: 0, y: 0, z: 0, yaw: 0 }),
    input({
      buttons: CLIENT_INPUT_BUTTONS.forward | CLIENT_INPUT_BUTTONS.right,
      yaw: Math.PI / 2
    }),
    {
      deltaSeconds: 1,
      speedMetersPerSecond: 2,
      maxDeltaSeconds: 1
    }
  );

  assert.equal(Math.hypot(moved.x, moved.z) <= 2.000001, true);
  assert.equal(moved.y, 0);
  assert.equal(moved.yaw, Math.PI / 2);
});

test("default server movement speed is tuned for the current playtest feel", () => {
  const moved = server.advancePlayerMovement(
    server.createInitialPlayerMovementState({ x: 0, y: 0, z: 0, yaw: 0 }),
    input({
      buttons: CLIENT_INPUT_BUTTONS.forward,
      yaw: 0
    }),
    {
      deltaSeconds: 1,
      maxDeltaSeconds: 1
    }
  );

  assert.equal(server.DEFAULT_PLAYER_MOVE_SPEED_METERS_PER_SECOND, 3.6);
  assert.equal(Math.abs(moved.z + 3.6) < 0.000001, true);
});

test("movement clamps oversized fixed-tick delta and ignores invalid values", () => {
  const initial = server.createInitialPlayerMovementState({ x: 0, y: 0, z: 0, yaw: 0 });
  const moved = server.advancePlayerMovement(
    initial,
    input({
      buttons: CLIENT_INPUT_BUTTONS.forward,
      yaw: 0
    }),
    {
      deltaSeconds: 10,
      speedMetersPerSecond: 3,
      maxDeltaSeconds: 0.25
    }
  );

  assert.equal(Math.abs(moved.z) <= 0.750001, true);
  assert.deepEqual(
    server.advancePlayerMovement(
      initial,
      input({
        buttons: CLIENT_INPUT_BUTTONS.forward,
        yaw: Number.NaN
      }),
      {
        deltaSeconds: 1,
        speedMetersPerSecond: 3,
        maxDeltaSeconds: 1
      }
    ),
    initial
  );
});

test("server movement launches a server-owned jump from the jump button and lands", () => {
  const initial = server.createInitialPlayerMovementState({ x: 0, y: 0, z: 0, yaw: 0 });
  const jumped = server.advancePlayerMovement(
    initial,
    input({ buttons: CLIENT_INPUT_BUTTONS.jump, yaw: 0 }),
    { deltaSeconds: 1 / 60, speedMetersPerSecond: 3.6 }
  );

  // Jump raises height and vertical velocity but does not move the player on the plane.
  assert.equal(jumped.y > 0, true);
  assert.equal(jumped.verticalVelocity > 0, true);
  assert.equal(jumped.x, 0);
  assert.equal(jumped.z, 0);

  // Releasing the jump button lets gravity return the player to the ground.
  let state = jumped;
  let peak = jumped.y;
  for (let tick = 0; tick < 240; tick += 1) {
    state = server.advancePlayerMovement(
      state,
      input({ buttons: 0, yaw: 0 }),
      { deltaSeconds: 1 / 60, speedMetersPerSecond: 3.6 }
    );
    peak = Math.max(peak, state.y);
    if (state.y === 0 && state.verticalVelocity === 0) {
      break;
    }
  }
  assert.equal(peak > 0.5, true);
  assert.equal(state.y, 0);
  assert.equal(state.verticalVelocity, 0);
});

test("server movement crouch slows planar speed and marks the stance", () => {
  const step = { deltaSeconds: 1, speedMetersPerSecond: 3.6, maxDeltaSeconds: 1 };
  const standing = server.advancePlayerMovement(
    server.createInitialPlayerMovementState({ x: 0, y: 0, z: 0, yaw: 0 }),
    input({ buttons: CLIENT_INPUT_BUTTONS.forward, yaw: 0 }),
    step
  );
  const crouched = server.advancePlayerMovement(
    server.createInitialPlayerMovementState({ x: 0, y: 0, z: 0, yaw: 0 }),
    input({ buttons: CLIENT_INPUT_BUTTONS.forward | CLIENT_INPUT_BUTTONS.crouch, yaw: 0 }),
    step
  );

  assert.equal(standing.crouched, false);
  assert.equal(crouched.crouched, true);
  // Crouch-walking covers less ground over the same time.
  assert.equal(Math.abs(crouched.z) < Math.abs(standing.z), true);
  // The default crouch multiplier is one half.
  assert.equal(Math.abs(Math.abs(crouched.z) - Math.abs(standing.z) / 2) < 1e-6, true);
});

test("server movement stops against arena collision blockers when collision geometry is provided", () => {
  const collisionGeometry = deriveArenaCollisionGeometry(EBB_TERMINAL_ARENA);
  const moved = server.advancePlayerMovement(
    server.createInitialPlayerMovementState({ x: 0, y: 0, z: 0, yaw: 0 }),
    input({
      buttons: CLIENT_INPUT_BUTTONS.forward,
      yaw: 0
    }),
    {
      collisionGeometry,
      deltaSeconds: 1,
      speedMetersPerSecond: 3.6,
      maxDeltaSeconds: 1
    }
  );

  assert.equal(moved.x, 0);
  assert.equal(moved.y, 0);
  assert.equal(Math.abs(moved.z + 0.25) < 0.000001, true);
  assert.equal(moved.yaw, 0);
});

test("server movement keeps blocker stops stable across repeated forward input", () => {
  const collisionGeometry = deriveArenaCollisionGeometry(EBB_TERMINAL_ARENA);
  let position = server.createInitialPlayerMovementState({ x: 0, y: 0, z: 0, yaw: 0 });

  for (let tick = 0; tick < 60; tick += 1) {
    position = server.advancePlayerMovement(
      position,
      input({
        buttons: CLIENT_INPUT_BUTTONS.forward,
        yaw: 0
      }),
      {
        collisionGeometry,
        deltaSeconds: 1 / 60,
        speedMetersPerSecond: 3.6
      }
    );
  }

  assert.equal(position.x, 0);
  assert.equal(position.y, 0);
  assert.equal(Math.abs(position.z + 0.25) < 0.000001, true);
});

test("server movement slides along blocker faces without snapping across the blocker", () => {
  const collisionGeometry = deriveArenaCollisionGeometry(EBB_TERMINAL_ARENA);
  const stopped = server.createInitialPlayerMovementState({ x: 0, y: 0, z: -0.25, yaw: 0 });
  const moved = server.advancePlayerMovement(
    stopped,
    input({
      buttons: CLIENT_INPUT_BUTTONS.right,
      yaw: 0
    }),
    {
      collisionGeometry,
      deltaSeconds: 1 / 60,
      speedMetersPerSecond: 3.6
    }
  );

  assert.equal(moved.x > 0, true);
  assert.equal(moved.x < 0.07, true);
  assert.equal(Math.abs(moved.z + 0.25) < 0.000001, true);
});

test("server movement resolves against world bounds when no blocker is present", () => {
  const collisionGeometry = {
    mapId: "arena-test-bounds",
    revision: 1,
    playerRadiusMeters: 0.25,
    worldBounds: {
      min: [-1, -1],
      max: [1, 1]
    },
    blockers: []
  };
  const moved = server.advancePlayerMovement(
    server.createInitialPlayerMovementState({ x: 0.7, y: 0, z: 0, yaw: 0 }),
    input({
      buttons: CLIENT_INPUT_BUTTONS.right,
      yaw: 0
    }),
    {
      collisionGeometry,
      deltaSeconds: 1,
      speedMetersPerSecond: 3,
      maxDeltaSeconds: 1
    }
  );

  assert.equal(moved.x, 0.75);
  assert.equal(moved.y, 0);
  assert.equal(moved.z, 0);
});
