import assert from "node:assert/strict";
import test from "node:test";

import {
  buildArenaFromNodes,
  extractNodeBounds,
  formatArenaModule,
  parseGlbContainer
} from "../scripts/arena-import.mjs";
import { validateArenaMapMetadata } from "../packages/shared/dist/index.js";

function box(min, max) {
  return { type: "VEC3", componentType: 5126, count: 8, min, max };
}

function approx(actual, expected, tolerance = 0.02) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} ~= ${expected}`);
}

// A synthetic glTF block-out exercising translation, scale, and a 90-degree Y rotation.
const SAMPLE_GLTF = {
  asset: { version: "2.0" },
  scene: 0,
  scenes: [{ nodes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }],
  nodes: [
    { name: "wall_north", mesh: 0, translation: [0, 1.5, -10] },
    { name: "cover_crate", mesh: 1, translation: [3, 0.6, 0] },
    { name: "floor_plate", mesh: 2, translation: [0, -0.1, 0] },
    { name: "wall_scaled", mesh: 3, translation: [8, 1.5, 0], scale: [2, 3, 0.4] },
    { name: "wall_rot", mesh: 0, translation: [-8, 1.5, 0], rotation: [0, 0.70710678, 0, 0.70710678] },
    { name: "spawn_cops_1", translation: [-6, 0, -8] },
    { name: "spawn_cops_2", translation: [-2, 0, -8] },
    { name: "spawn_cops_3", translation: [2, 0, -8] },
    { name: "spawn_cops_4", translation: [6, 0, -8] },
    { name: "spawn_robbers_1", translation: [-6, 0, 8] },
    { name: "spawn_robbers_2", translation: [-2, 0, 8] },
    { name: "spawn_robbers_3", translation: [2, 0, 8] },
    { name: "spawn_robbers_4", translation: [6, 0, 8] }
  ],
  meshes: [
    { primitives: [{ attributes: { POSITION: 0 } }] },
    { primitives: [{ attributes: { POSITION: 1 } }] },
    { primitives: [{ attributes: { POSITION: 2 } }] },
    { primitives: [{ attributes: { POSITION: 3 } }] }
  ],
  accessors: [
    box([-5, -1.5, -0.15], [5, 1.5, 0.15]),
    box([-0.7, -0.6, -0.7], [0.7, 0.6, 0.7]),
    box([-10, -0.1, -10], [10, 0.1, 10]),
    box([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5])
  ]
};

test("extractNodeBounds resolves world AABBs through translation, scale, and rotation", () => {
  const nodes = extractNodeBounds(SAMPLE_GLTF);
  const byName = new Map(nodes.map((node) => [node.name, node]));

  const wall = byName.get("wall_north");
  approx(wall.max[0] - wall.min[0], 10);
  approx(wall.max[2] - wall.min[2], 0.3);

  // A 2x3x0.4 scale on a unit cube becomes those exact world dimensions.
  const scaled = byName.get("wall_scaled");
  approx(scaled.max[0] - scaled.min[0], 2);
  approx(scaled.max[1] - scaled.min[1], 3);
  approx(scaled.max[2] - scaled.min[2], 0.4);

  // A 90-degree Y rotation swaps the X and Z extents of the wall.
  const rotated = byName.get("wall_rot");
  approx(rotated.max[0] - rotated.min[0], 0.3);
  approx(rotated.max[2] - rotated.min[2], 10);

  // An empty (spawn) is recorded as a point at its world translation.
  const spawn = byName.get("spawn_cops_1");
  assert.equal(spawn.hasMesh, false);
  assert.deepEqual(spawn.translation, [-6, 0, -8]);
});

test("buildArenaFromNodes produces a contract-valid arena with kinds, spawns, and slot starts", () => {
  const nodes = extractNodeBounds(SAMPLE_GLTF);
  const { metadata, warnings } = buildArenaFromNodes(nodes, { id: "test-yard", displayName: "Test Yard" });

  assert.equal(metadata.id, "arena-test-yard");
  assert.equal(metadata.displayName, "Test Yard");
  assert.equal(metadata.primitives.length, 5);

  const wall = metadata.primitives.find((primitive) => primitive.id === "wall-north");
  assert.equal(wall.kind, "wall");
  approx(wall.position[2], -10);
  approx(wall.size[0], 10);
  assert.equal(metadata.primitives.find((primitive) => primitive.id === "cover-crate").kind, "cover");
  assert.equal(metadata.primitives.find((primitive) => primitive.id === "floor-plate").kind, "floor");

  // Four Cops then four Robbers, ordered, with matching slot starts and side-default yaw.
  assert.equal(metadata.spawnMarkers.length, 8);
  assert.equal(metadata.slotStarts.length, 8);
  assert.deepEqual(metadata.slotStarts[0], { position: [-6, 0, -8], yaw: 0 });
  assert.equal(metadata.slotStarts[4].yaw, Math.PI);
  assert.deepEqual(metadata.slotStarts[4].position, [-6, 0, 8]);

  // The whole point: the generated arena passes the same contract the hand-written maps do.
  const validation = validateArenaMapMetadata(metadata);
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.ok, true);
  assert.deepEqual(warnings, []);
});

test("buildArenaFromNodes warns and omits slot starts without a full 4+4 spawn slate", () => {
  const gltf = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0, 1, 2] }],
    nodes: [
      { name: "wall_a", mesh: 0, translation: [0, 1.5, -5] },
      { name: "spawn_cops_1", translation: [-3, 0, -4] },
      { name: "spawn_robbers_1", translation: [3, 0, 4] }
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [box([-3, -1.5, -0.15], [3, 1.5, 0.15])]
  };
  const { metadata, warnings } = buildArenaFromNodes(extractNodeBounds(gltf), { id: "arena-tiny" });

  assert.equal(metadata.slotStarts, undefined);
  assert.equal(metadata.spawnMarkers.length, 2);
  assert.ok(warnings.some((warning) => warning.includes("slotStarts omitted")));
  assert.equal(validateArenaMapMetadata(metadata).ok, true);
});

test("buildArenaFromNodes skips unclassified nodes and rejects an empty result", () => {
  const decor = [{ name: "random_prop", hasMesh: true, min: [0, 0, 0], max: [1, 1, 1], translation: [0.5, 0.5, 0.5] }];
  assert.throws(() => buildArenaFromNodes(decor, { id: "arena-empty" }), /No wall\/cover\/floor objects/);
});

test("parseGlbContainer reads the JSON chunk of a binary glTF", () => {
  const payload = { asset: { version: "2.0" }, marker: 42 };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  const padding = (4 - (jsonBytes.length % 4)) % 4;
  const chunkBytes = new Uint8Array(jsonBytes.length + padding).fill(0x20);
  chunkBytes.set(jsonBytes);

  const total = 12 + 8 + chunkBytes.length;
  const glb = new Uint8Array(total);
  const view = new DataView(glb.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, chunkBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  glb.set(chunkBytes, 20);

  const { json, bin } = parseGlbContainer(glb);
  assert.deepEqual(json, payload);
  assert.equal(bin, undefined);
});

test("formatArenaModule emits a typed, importable arena module", () => {
  const nodes = extractNodeBounds(SAMPLE_GLTF);
  const { metadata } = buildArenaFromNodes(nodes, { id: "test-yard" });
  const moduleText = formatArenaModule(metadata);

  assert.match(moduleText, /import type \{ ArenaMapMetadata \} from "\.\/map-metadata\.js";/);
  assert.match(moduleText, /export const TEST_YARD_ARENA: ArenaMapMetadata =/);
  assert.match(moduleText, /"id": "arena-test-yard"/);
});
