import assert from "node:assert/strict";
import test from "node:test";

import {
  GRENADE_BLAST_RADIUS_METERS,
  GRENADE_MAX_DAMAGE,
  advanceGrenadeMotion,
  grenadeBlastDamage,
  grenadeThrowDirection
} from "../packages/shared/dist/index.js";

const BOUNDS = { minX: -19.5, maxX: 19.5, minZ: -19.5, maxZ: 19.5 };

test("throw direction faces -z at yaw 0 and tilts up with pitch", () => {
  const flat = grenadeThrowDirection(0, 0);
  assert.equal(Math.abs(flat.x) < 1e-9, true);
  assert.equal(Math.abs(flat.z + 1) < 1e-9, true); // -z
  assert.equal(Math.abs(flat.y) < 1e-9, true);
  assert.equal(grenadeThrowDirection(0, Math.PI / 4).y > 0, true); // looking up throws up
});

test("a grenade arcs under gravity and comes to rest on the floor", () => {
  let motion = { position: { x: 0, y: 1.5, z: 0 }, velocity: { x: 0, y: 6, z: -10 } };
  let landedTick = -1;
  for (let tick = 0; tick < 600; tick += 1) {
    motion = advanceGrenadeMotion(motion, 1 / 60, BOUNDS);
    if (motion.position.y <= 0 && landedTick < 0) {
      landedTick = tick;
    }
  }
  assert.equal(landedTick > 0, true); // it eventually lands
  assert.equal(motion.position.y, 0); // rests on the floor
  assert.deepEqual(motion.velocity, { x: 0, y: 0, z: 0 }); // and stops
  assert.equal(motion.position.z >= BOUNDS.minZ, true); // never leaves the arena
});

test("blast damage is full at the centre and falls to zero at the edge", () => {
  assert.equal(grenadeBlastDamage(0), GRENADE_MAX_DAMAGE);
  assert.equal(grenadeBlastDamage(GRENADE_BLAST_RADIUS_METERS), 0);
  assert.equal(grenadeBlastDamage(GRENADE_BLAST_RADIUS_METERS + 1), 0);
  const mid = grenadeBlastDamage(GRENADE_BLAST_RADIUS_METERS / 2);
  assert.equal(mid > 0 && mid < GRENADE_MAX_DAMAGE, true);
});
