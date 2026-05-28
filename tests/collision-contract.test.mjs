import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ARENA_COLLISION_RADIUS_METERS,
  EBB_TERMINAL_ARENA,
  deriveArenaCollisionGeometry,
  resolveArenaCollisionMotion
} from "../packages/shared/dist/index.js";

test("shared collision geometry derives static blockers from the original arena metadata", () => {
  const geometry = deriveArenaCollisionGeometry(EBB_TERMINAL_ARENA);

  assert.equal(geometry.mapId, "arena-ebb-terminal");
  assert.equal(geometry.revision, EBB_TERMINAL_ARENA.revision);
  assert.equal(geometry.playerRadiusMeters, DEFAULT_ARENA_COLLISION_RADIUS_METERS);
  assert.deepEqual(geometry.worldBounds, {
    min: [-9.5, -7.5],
    max: [9.5, 7.5]
  });
  assert.equal(geometry.blockers.length, 8);
  assert.equal(geometry.blockers.some((blocker) => blocker.sourcePrimitiveId === "floor-plate"), false);
  assert.equal(geometry.blockers.some((blocker) => blocker.sourcePrimitiveId === "central-sill"), true);
  assert.equal(new Set(geometry.blockers.map((blocker) => blocker.id)).size, geometry.blockers.length);
});

test("collision motion clamps the player radius inside world bounds", () => {
  const geometry = {
    mapId: "arena-test-bounds",
    revision: 1,
    playerRadiusMeters: DEFAULT_ARENA_COLLISION_RADIUS_METERS,
    worldBounds: {
      min: [-9.5, -7.5],
      max: [9.5, 7.5]
    },
    blockers: []
  };
  const resolved = resolveArenaCollisionMotion({
    geometry,
    from: { x: 0, z: 0 },
    desired: { x: 99, z: 99 }
  });

  assert.equal(resolved.collidedWithWorldBounds, true);
  assert.equal(resolved.position.x, 9.5 - DEFAULT_ARENA_COLLISION_RADIUS_METERS);
  assert.equal(resolved.position.z, 7.5 - DEFAULT_ARENA_COLLISION_RADIUS_METERS);
});

test("collision motion stops against blockers and allows sliding along the open axis", () => {
  const geometry = {
    mapId: "arena-test-collision",
    revision: 1,
    playerRadiusMeters: 0.25,
    worldBounds: {
      min: [-5, -5],
      max: [5, 5]
    },
    blockers: [
      {
        id: "blocker-center",
        sourcePrimitiveId: "center-cover",
        kind: "cover",
        min: [-0.5, -0.5],
        max: [0.5, 0.5]
      }
    ]
  };

  const stopped = resolveArenaCollisionMotion({
    geometry,
    from: { x: 0, z: 1.4 },
    desired: { x: 0, z: 0 }
  });
  assert.equal(stopped.position.x, 0);
  assert.equal(stopped.position.z, 0.75);
  assert.deepEqual(stopped.collidedBlockerIds, ["blocker-center"]);

  const slid = resolveArenaCollisionMotion({
    geometry,
    from: { x: 0, z: 1.4 },
    desired: { x: 0.4, z: 0 }
  });
  assert.equal(slid.position.x, 0.4);
  assert.equal(slid.position.z, 0.75);
  assert.deepEqual(slid.collidedBlockerIds, ["blocker-center"]);
});

test("collision motion slides tangentially along a blocker face without edge snapping", () => {
  const geometry = {
    mapId: "arena-test-face-slide",
    revision: 1,
    playerRadiusMeters: 0.25,
    worldBounds: {
      min: [-5, -5],
      max: [5, 5]
    },
    blockers: [
      {
        id: "blocker-center",
        sourcePrimitiveId: "center-cover",
        kind: "cover",
        min: [-0.5, -0.5],
        max: [0.5, 0.5]
      }
    ]
  };

  const resolved = resolveArenaCollisionMotion({
    geometry,
    from: { x: 0, z: 0.75 },
    desired: { x: 0.3, z: 0.75 }
  });

  assert.equal(resolved.position.x, 0.3);
  assert.equal(resolved.position.z, 0.75);
  assert.deepEqual(resolved.collidedBlockerIds, []);
});

test("collision motion resolves diagonal corner pressure without tunneling or jitter spikes", () => {
  const geometry = {
    mapId: "arena-test-corner",
    revision: 1,
    playerRadiusMeters: 0.25,
    worldBounds: {
      min: [-4, -4],
      max: [4, 4]
    },
    blockers: [
      {
        id: "blocker-east-face",
        sourcePrimitiveId: "east-face",
        kind: "wall",
        min: [0, -1],
        max: [1, 1]
      },
      {
        id: "blocker-north-face",
        sourcePrimitiveId: "north-face",
        kind: "wall",
        min: [-1, 0],
        max: [1, 1]
      }
    ]
  };
  let position = { x: -1.5, z: -1.5 };

  for (let step = 0; step < 12; step += 1) {
    const desired = {
      x: position.x + 0.25,
      z: position.z + 0.25
    };
    const resolved = resolveArenaCollisionMotion({
      geometry,
      from: position,
      desired
    });
    const stepDistance = Math.hypot(
      resolved.position.x - position.x,
      resolved.position.z - position.z
    );

    assert.equal(stepDistance <= Math.hypot(0.25, 0.25) + 0.000001, true);
    assert.equal(isInsideExpandedBlocker(resolved.position, geometry.blockers[0], 0.25), false);
    assert.equal(isInsideExpandedBlocker(resolved.position, geometry.blockers[1], 0.25), false);
    position = resolved.position;
  }

  assert.equal(position.z <= -0.25, true);
});

test("original arena spawn markers start clear of collision blockers", () => {
  const geometry = deriveArenaCollisionGeometry(EBB_TERMINAL_ARENA);

  for (const spawn of EBB_TERMINAL_ARENA.spawnMarkers) {
    const position = {
      x: spawn.position[0],
      z: spawn.position[2]
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

function isInsideExpandedBlocker(point, blocker, radiusMeters) {
  return (
    point.x > blocker.min[0] - radiusMeters &&
    point.x < blocker.max[0] + radiusMeters &&
    point.z > blocker.min[1] - radiusMeters &&
    point.z < blocker.max[1] + radiusMeters
  );
}
