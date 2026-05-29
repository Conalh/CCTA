import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_INPUT_BUTTONS,
  EBB_TERMINAL_ARENA,
  deriveArenaCollisionGeometry
} from "../packages/shared/dist/index.js";
import {
  DEFAULT_CLIENT_PREDICTION_SPEED_METERS_PER_SECOND,
  createInitialClientPredictionState,
  recordClientPredictionInput,
  reconcileClientPredictionWithSnapshot
} from "../apps/client/dist/index.js";
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

function entity(overrides = {}) {
  return {
    entityId: 10,
    sessionId: 20,
    slotIndex: 0,
    active: true,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    ...overrides
  };
}

test("client prediction records presentation-only local input without authority", () => {
  const seeded = reconcileClientPredictionWithSnapshot(
    createInitialClientPredictionState(),
    entity({
      x: 0,
      y: 0,
      z: 0,
      yaw: 0
    }),
    {
      snapshotTick: 10,
      lastAcknowledgedInputSequence: 0
    }
  );
  const predicted = recordClientPredictionInput(
    seeded,
    input({
      sequence: 2,
      buttons: CLIENT_INPUT_BUTTONS.forward,
      yaw: 0
    }),
    {
      stepSeconds: 0.1,
      speedMetersPerSecond: 3
    }
  );

  assert.equal(predicted.pendingInputs.length, 1);
  assert.equal(predicted.authoritativePose.z, 0);
  assert.equal(predicted.predictedPose.z < 0, true);
  assert.equal(predicted.predictedPose.y, 0);
  assert.equal(predicted.predictedPose.yaw, 0);
});

test("client prediction default speed matches the tuned server movement feel", () => {
  const seeded = reconcileClientPredictionWithSnapshot(
    createInitialClientPredictionState(),
    entity({
      x: 0,
      y: 0,
      z: 0,
      yaw: 0
    }),
    {
      snapshotTick: 10,
      lastAcknowledgedInputSequence: 0
    }
  );
  const predicted = recordClientPredictionInput(
    seeded,
    input({
      sequence: 2,
      buttons: CLIENT_INPUT_BUTTONS.forward,
      yaw: 0
    }),
    {
      stepSeconds: 1
    }
  );

  assert.equal(DEFAULT_CLIENT_PREDICTION_SPEED_METERS_PER_SECOND, 3.96);
  assert.equal(Math.abs(predicted.predictedPose.z + 3.96) < 0.000001, true);
});

test("client prediction reconciles to server authority and replays unacknowledged input", () => {
  let state = reconcileClientPredictionWithSnapshot(
    createInitialClientPredictionState(),
    entity({
      x: 0,
      y: 0,
      z: 0,
      yaw: 0
    }),
    {
      snapshotTick: 10,
      lastAcknowledgedInputSequence: 0
    }
  );
  state = recordClientPredictionInput(
    state,
    input({
      sequence: 2,
      buttons: CLIENT_INPUT_BUTTONS.forward,
      yaw: 0
    }),
    {
      stepSeconds: 0.1,
      speedMetersPerSecond: 3
    }
  );
  state = recordClientPredictionInput(
    state,
    input({
      sequence: 3,
      buttons: CLIENT_INPUT_BUTTONS.right,
      yaw: 0
    }),
    {
      stepSeconds: 0.1,
      speedMetersPerSecond: 3
    }
  );

  const reconciled = reconcileClientPredictionWithSnapshot(
    state,
    entity({
      x: 0,
      y: 0,
      z: -1.2,
      yaw: 0
    }),
    {
      snapshotTick: 12,
      lastAcknowledgedInputSequence: 2,
      stepSeconds: 0.1,
      speedMetersPerSecond: 3
    }
  );

  assert.equal(reconciled.lastReconciledSnapshotTick, 12);
  assert.equal(reconciled.pendingInputs.length, 1);
  assert.equal(reconciled.pendingInputs[0].sequence, 3);
  assert.equal(reconciled.replayedInputCount, 1);
  assert.deepEqual(reconciled.authoritativePose, {
    x: 0,
    y: 0,
    z: -1.2,
    yaw: 0
  });
  assert.equal(reconciled.predictedPose.x > 0, true);
  assert.equal(reconciled.predictedPose.z, -1.2);
  assert.equal(reconciled.lastCorrectionMagnitude > 0, true);
});

test("client prediction ignores malformed presentation inputs and invalid snapshots", () => {
  const initial = createInitialClientPredictionState();
  const afterInvalidInput = recordClientPredictionInput(
    initial,
    input({
      sequence: 2,
      buttons: CLIENT_INPUT_BUTTONS.forward,
      yaw: Number.NaN
    })
  );
  const afterInvalidSnapshot = reconcileClientPredictionWithSnapshot(
    afterInvalidInput,
    entity({
      x: Number.NaN,
      z: -1
    }),
    {
      snapshotTick: 20,
      lastAcknowledgedInputSequence: 2
    }
  );

  assert.deepEqual(afterInvalidInput, initial);
  assert.deepEqual(afterInvalidSnapshot, initial);
});

test("client prediction can mirror shared arena collision for presentation feel only", () => {
  const collisionGeometry = deriveArenaCollisionGeometry(EBB_TERMINAL_ARENA);
  const seeded = reconcileClientPredictionWithSnapshot(
    createInitialClientPredictionState(),
    entity({
      x: 0,
      y: 0,
      z: 0,
      yaw: 0
    }),
    {
      snapshotTick: 10,
      lastAcknowledgedInputSequence: 0,
      collisionGeometry
    }
  );
  const predicted = recordClientPredictionInput(
    seeded,
    input({
      sequence: 2,
      buttons: CLIENT_INPUT_BUTTONS.forward,
      yaw: 0
    }),
    {
      collisionGeometry,
      stepSeconds: 1,
      speedMetersPerSecond: 3.6
    }
  );

  assert.equal(predicted.authoritativePose.z, 0);
  assert.equal(Math.abs(predicted.predictedPose.z + 0.25) < 0.000001, true);
  assert.equal(predicted.predictedPose.y, 0);
});

test("client prediction collision mirror stays close to authoritative movement through stop and slide", () => {
  const collisionGeometry = deriveArenaCollisionGeometry(EBB_TERMINAL_ARENA);
  let prediction = reconcileClientPredictionWithSnapshot(
    createInitialClientPredictionState(),
    entity({
      x: 0,
      y: 0,
      z: 0,
      yaw: 0
    }),
    {
      snapshotTick: 1,
      lastAcknowledgedInputSequence: 0,
      collisionGeometry
    }
  );
  let authority = server.createInitialPlayerMovementState({ x: 0, y: 0, z: 0, yaw: 0 });
  let sequence = 1;

  for (const buttons of [
    ...Array.from({ length: 30 }, () => CLIENT_INPUT_BUTTONS.forward),
    ...Array.from({ length: 20 }, () => CLIENT_INPUT_BUTTONS.right)
  ]) {
    sequence += 1;
    const message = input({
      sequence,
      buttons,
      yaw: 0
    });
    prediction = recordClientPredictionInput(prediction, message, {
      collisionGeometry,
      stepSeconds: 1 / 60,
      speedMetersPerSecond: 3.6
    });
    authority = server.advancePlayerMovement(authority, message, {
      collisionGeometry,
      deltaSeconds: 1 / 60,
      speedMetersPerSecond: 3.6
    });

    assert.equal(Math.abs(prediction.predictedPose.x - authority.x) < 0.000001, true);
    assert.equal(Math.abs(prediction.predictedPose.z - authority.z) < 0.000001, true);
  }

  assert.equal(Math.abs(authority.z + 0.25) < 0.000001, true);
  assert.equal(authority.x > 0.5, true);
});
