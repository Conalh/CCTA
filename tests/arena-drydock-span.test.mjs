import assert from "node:assert/strict";
import test from "node:test";

import {
  DRYDOCK_SPAN_ARENA,
  deriveArenaCollisionGeometry,
  validateArenaMapMetadata
} from "../packages/shared/dist/index.js";
import { createGreyboxLayoutFromMap } from "../apps/client/dist/sandbox/greybox-layout.js";

const forbiddenNames = /\b(counter|strike|valve|dust|dust2|mirage|inferno|nuke|terrorist|counter-terrorist)\b/i;

test("drydock span arena passes the map metadata contract with original naming", () => {
  const result = validateArenaMapMetadata(DRYDOCK_SPAN_ARENA);

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.match(DRYDOCK_SPAN_ARENA.id, /^arena-[a-z0-9-]+$/);
  assert.equal(forbiddenNames.test(`${DRYDOCK_SPAN_ARENA.id} ${DRYDOCK_SPAN_ARENA.displayName}`), false);
  const allText = [
    ...DRYDOCK_SPAN_ARENA.primitives.map((primitive) => primitive.label),
    ...DRYDOCK_SPAN_ARENA.spawnMarkers.map((spawn) => spawn.label),
    ...(DRYDOCK_SPAN_ARENA.labels ?? []).map((label) => label.text)
  ].join(" ");
  assert.equal(forbiddenNames.test(allText), false);
});

test("drydock span arena provides eight neutral spawns mirrored across the midline", () => {
  const spawns = DRYDOCK_SPAN_ARENA.spawnMarkers;
  assert.equal(spawns.length, 8);
  assert.equal(spawns.every((spawn) => spawn.role === "neutral"), true);

  const north = spawns.filter((spawn) => spawn.position[2] < 0);
  const south = spawns.filter((spawn) => spawn.position[2] > 0);
  assert.equal(north.length, 4);
  assert.equal(south.length, 4);

  // Every north spawn has a south spawn mirrored in z with the same x and opposite facing.
  for (const northSpawn of north) {
    const mirror = south.find(
      (southSpawn) =>
        southSpawn.position[0] === northSpawn.position[0] &&
        southSpawn.position[2] === -northSpawn.position[2]
    );
    assert.ok(mirror, `missing mirror for ${northSpawn.id}`);
    assert.equal(northSpawn.yaw, 0);
    assert.equal(mirror.yaw, Math.PI);
  }
});

test("drydock span spawns are clear of derived collision blockers", () => {
  const geometry = deriveArenaCollisionGeometry(DRYDOCK_SPAN_ARENA);
  const radius = geometry.playerRadiusMeters;

  // Conservative axis-aligned clearance: a spawn outside every blocker's
  // radius-expanded AABB cannot overlap it, so all eight starts are spawn-safe.
  const spawnClear = (x, z) =>
    geometry.blockers.every(
      (blocker) =>
        x <= blocker.min[0] - radius ||
        x >= blocker.max[0] + radius ||
        z <= blocker.min[1] - radius ||
        z >= blocker.max[1] + radius
    );

  for (const spawn of DRYDOCK_SPAN_ARENA.spawnMarkers) {
    assert.equal(spawnClear(spawn.position[0], spawn.position[2]), true, `${spawn.id} overlaps a blocker`);
  }
});

test("drydock span arena renders a greybox layout from its metadata", () => {
  const layout = createGreyboxLayoutFromMap(DRYDOCK_SPAN_ARENA);

  assert.equal(
    layout.length,
    DRYDOCK_SPAN_ARENA.primitives.length + DRYDOCK_SPAN_ARENA.playerScaleReferences.length
  );
  assert.equal(layout.every((primitive) => primitive.id.startsWith("map-")), true);
});
