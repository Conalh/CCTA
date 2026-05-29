import assert from "node:assert/strict";
import test from "node:test";

import { EBB_TERMINAL_ARENA } from "../apps/client/dist/maps/ebb-terminal.js";
import {
  DEFAULT_PLAYER_CAMERA_EYE_HEIGHT_METERS,
  createFallbackPlayerCameraSourcePose,
  derivePlayerCameraPose
} from "../apps/client/dist/sandbox/player-camera.js";

test("player camera derives camera pose from local presentation data plus eye height", () => {
  const pose = derivePlayerCameraPose({
    map: EBB_TERMINAL_ARENA,
    sourcePose: {
      x: 1.25,
      y: 0.1,
      z: -2.5,
      yawRadians: 0.5,
      pitchRadians: -0.15
    },
    eyeHeightMeters: 1.6
  });

  assert.equal(pose.mode, "player-camera");
  assert.equal(pose.mapId, EBB_TERMINAL_ARENA.id);
  assert.equal(pose.mapRevision, EBB_TERMINAL_ARENA.revision);
  assert.deepEqual(pose.position, [1.25, 1.7, -2.5]);
  assert.equal(pose.yawRadians, 0.5);
  assert.equal(pose.pitchRadians, -0.15);
  assert.equal(pose.eyeHeightMeters, 1.6);
  assert.equal(pose.metadataValid, true);
  assert.equal(pose.usedFallbackSpawn, false);
  assert.equal(pose.clampedToBounds, false);
});

test("player camera falls back to neutral map spawn when local presentation is unavailable", () => {
  const fallbackSource = createFallbackPlayerCameraSourcePose(EBB_TERMINAL_ARENA);
  const pose = derivePlayerCameraPose({
    map: EBB_TERMINAL_ARENA,
    sourcePose: undefined
  });

  assert.deepEqual(fallbackSource, {
    x: 0,
    y: 0,
    z: -5.8,
    yawRadians: 0,
    pitchRadians: 0
  });
  assert.deepEqual(pose.position, [0, DEFAULT_PLAYER_CAMERA_EYE_HEIGHT_METERS, -5.8]);
  assert.equal(pose.usedFallbackSpawn, true);
  assert.equal(pose.metadataValid, true);
});

test("player camera clamps presentation pose to map bounds without collision gameplay", () => {
  const pose = derivePlayerCameraPose({
    map: EBB_TERMINAL_ARENA,
    sourcePose: {
      x: 999,
      y: 99,
      z: -999,
      yawRadians: Number.NaN,
      pitchRadians: Number.NaN
    },
    eyeHeightMeters: 1.62
  });

  assert.deepEqual(pose.position, [14, 4, -11]);
  assert.equal(pose.yawRadians, 0);
  assert.equal(pose.pitchRadians, 0);
  assert.equal(pose.clampedToBounds, true);
  assert.equal(pose.usedFallbackSpawn, false);
});

test("player camera can opt out of bounds clamping for networked presentation", () => {
  const pose = derivePlayerCameraPose({
    clampToBounds: false,
    map: EBB_TERMINAL_ARENA,
    sourcePose: {
      x: 12,
      y: 0,
      z: -12,
      yawRadians: 0,
      pitchRadians: 0
    },
    eyeHeightMeters: 1.62
  });

  assert.deepEqual(pose.position, [12, 1.62, -12]);
  assert.equal(pose.clampedToBounds, false);
});

test("player camera reports invalid metadata and avoids server authority fields", () => {
  const invalidMap = {
    ...EBB_TERMINAL_ARENA,
    id: "bad-map-id",
    displayName: ""
  };
  const sourcePose = {
    x: 1,
    y: 0,
    z: 1,
    yawRadians: 0,
    pitchRadians: 0,
    entityId: 123,
    sessionId: 456,
    worldId: 789
  };
  const pose = derivePlayerCameraPose({
    map: invalidMap,
    sourcePose
  });

  assert.equal(pose.metadataValid, false);
  assert.equal("entityId" in pose, false);
  assert.equal("sessionId" in pose, false);
  assert.equal("worldId" in pose, false);
});
