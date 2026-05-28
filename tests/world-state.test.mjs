import assert from "node:assert/strict";
import test from "node:test";

import {
  EBB_TERMINAL_ARENA,
  CLIENT_INPUT_BUTTONS,
  deriveArenaCollisionGeometry,
  resolveArenaCollisionMotion
} from "../packages/shared/dist/index.js";
import * as server from "../apps/server/dist/index.js";

test("world state creates deterministic placeholder entities for assigned sessions", () => {
  assert.equal(typeof server.createWorldState, "function");

  const world = server.createWorldState({
    worldId: 4,
    firstEntityId: 200
  });

  const first = world.assignSessionEntity({
    sessionId: 10,
    slotIndex: 0
  });
  const second = world.assignSessionEntity({
    sessionId: 11,
    slotIndex: 1
  });

  assert.deepEqual(first, {
    entityId: 200,
    sessionId: 10,
    slotIndex: 0,
    active: true,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0
  });
  assert.deepEqual(second, {
    entityId: 201,
    sessionId: 11,
    slotIndex: 1,
    active: true,
    x: 2.75,
    y: 0,
    z: 0,
    yaw: 0
  });
  assert.deepEqual(world.createSnapshot(9), {
    worldId: 4,
    tick: 9,
    entityCount: 2,
    entities: [first, second]
  });
});

test("world state removes disconnected session entities and does not reuse entity ids", () => {
  assert.equal(typeof server.createWorldState, "function");

  const world = server.createWorldState({
    worldId: 5,
    firstEntityId: 300
  });

  world.assignSessionEntity({
    sessionId: 20,
    slotIndex: 0
  });
  world.assignSessionEntity({
    sessionId: 21,
    slotIndex: 1
  });
  const removed = world.removeSessionEntity(20);
  const replacement = world.assignSessionEntity({
    sessionId: 22,
    slotIndex: 0
  });

  assert.deepEqual(removed, {
    entityId: 300,
    sessionId: 20,
    slotIndex: 0,
    active: false,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0
  });
  assert.deepEqual(replacement, {
    entityId: 302,
    sessionId: 22,
    slotIndex: 0,
    active: true,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0
  });
  assert.deepEqual(world.createSnapshot(12), {
    worldId: 5,
    tick: 12,
    entityCount: 2,
    entities: [
      {
        entityId: 301,
        sessionId: 21,
        slotIndex: 1,
        active: true,
        x: 2.75,
        y: 0,
        z: 0,
        yaw: 0
      },
      replacement
    ]
  });
});

test("world state advances accepted movement inputs and ignores disconnected entities", () => {
  assert.equal(typeof server.createWorldState, "function");

  const world = server.createWorldState({
    worldId: 6,
    firstEntityId: 400
  });

  world.assignSessionEntity({
    sessionId: 30,
    slotIndex: 0
  });
  world.recordAcceptedInput(30, {
    kind: "client.input",
    sequence: 1,
    clientTimeMs: 1000,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  });
  world.advanceMovement(0.5);

  const snapshot = world.createSnapshot(15);
  assert.equal(snapshot.entities[0].z < -0.01, true);
  assert.equal(snapshot.entities[0].x, 0);
  assert.equal(snapshot.entities[0].yaw, 0);

  world.removeSessionEntity(30);
  world.advanceMovement(0.5);
  assert.deepEqual(world.createSnapshot(16).entities, []);
});

test("world state uses the default arena collision geometry for authoritative movement", () => {
  const world = server.createWorldState({
    worldId: 7,
    firstEntityId: 500
  });

  world.assignSessionEntity({
    sessionId: 40,
    slotIndex: 0
  });
  world.recordAcceptedInput(40, {
    kind: "client.input",
    sequence: 1,
    clientTimeMs: 1000,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  });

  for (let tick = 1; tick <= 10; tick += 1) {
    world.advanceMovement(0.1);
  }

  const entity = world.createSnapshot(20).entities[0];
  assert.equal(entity.x, 0);
  assert.equal(Math.abs(entity.z + 0.25) < 0.000001, true);
});

test("world state default slot starts are clear of the original arena blockers", () => {
  const geometry = deriveArenaCollisionGeometry(EBB_TERMINAL_ARENA);
  const world = server.createWorldState({
    worldId: 8,
    firstEntityId: 600
  });

  for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
    const entity = world.assignSessionEntity({
      sessionId: 50 + slotIndex,
      slotIndex
    });
    const position = {
      x: entity.x,
      z: entity.z
    };
    const resolved = resolveArenaCollisionMotion({
      geometry,
      from: position,
      desired: position
    });

    assert.deepEqual(resolved.position, position);
    assert.deepEqual(resolved.collidedBlockerIds, []);
  }
});

test("world state default slot starts keep two-player targets readable while preserving blocker proof", () => {
  const world = server.createWorldState({
    worldId: 9,
    firstEntityId: 700
  });

  const first = world.assignSessionEntity({
    sessionId: 60,
    slotIndex: 0
  });
  const second = world.assignSessionEntity({
    sessionId: 61,
    slotIndex: 1
  });

  assert.deepEqual([first.x, first.y, first.z], [0, 0, 0]);
  assert.equal(Math.hypot(second.x - first.x, second.z - first.z) >= 2.5, true);
  assert.equal(second.y, 0);
  assert.equal(second.z, 0);
});
