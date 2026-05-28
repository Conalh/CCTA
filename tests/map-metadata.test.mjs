import assert from "node:assert/strict";
import test from "node:test";

import {
  ARENA_MAP_METADATA_LIMITS,
  EBB_TERMINAL_ARENA,
  validateArenaMapMetadata
} from "../packages/shared/dist/index.js";
import {
  createGreyboxLayout,
  createGreyboxLayoutFromMap,
  getGreyboxLayoutMetadata
} from "../apps/client/dist/sandbox/greybox-layout.js";

const forbiddenNames = /\b(counter|strike|valve|dust|dust2|mirage|inferno|nuke|terrorist|counter-terrorist)\b/i;

function validMap(overrides = {}) {
  return {
    id: "arena-test-yard",
    displayName: "Test Yard",
    revision: 1,
    worldBounds: {
      min: [-10, -0.25, -8],
      max: [10, 4, 8]
    },
    primitives: [
      {
        id: "floor-plate",
        kind: "floor",
        label: "Floor plate",
        position: [0, -0.1, 0],
        size: [18, 0.2, 14]
      },
      {
        id: "center-cover",
        kind: "cover",
        label: "Center cover",
        position: [0, 0.6, 0],
        size: [2, 1.2, 1]
      }
    ],
    playerScaleReferences: [
      {
        id: "scale-standing",
        label: "Standing scale",
        position: [-8, 0.9, -6],
        radiusMeters: 0.35,
        heightMeters: 1.8
      }
    ],
    spawnMarkers: [
      {
        id: "spawn-north",
        label: "North neutral spawn",
        role: "neutral",
        position: [0, 0, -5],
        yaw: 0
      },
      {
        id: "spawn-south",
        label: "South neutral spawn",
        role: "neutral",
        position: [0, 0, 5],
        yaw: Math.PI
      }
    ],
    labels: [
      {
        id: "label-midline",
        text: "Midline",
        position: [0, 1, 0]
      }
    ],
    ...overrides
  };
}

test("map metadata validation accepts the original Phase 13 arena contract", () => {
  const result = validateArenaMapMetadata(EBB_TERMINAL_ARENA);

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.match(EBB_TERMINAL_ARENA.id, /^arena-[a-z0-9-]+$/);
  assert.equal(forbiddenNames.test(`${EBB_TERMINAL_ARENA.id} ${EBB_TERMINAL_ARENA.displayName}`), false);
  assert.equal(EBB_TERMINAL_ARENA.spawnMarkers.every((spawn) => spawn.role === "neutral"), true);
});

test("map metadata validation reports required fields and original id/name conventions", () => {
  const result = validateArenaMapMetadata({
    ...validMap(),
    id: "dust2",
    displayName: "",
    revision: 0
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.field === "id"), true);
  assert.equal(result.errors.some((error) => error.field === "displayName"), true);
  assert.equal(result.errors.some((error) => error.field === "revision"), true);
});

test("map metadata validation rejects duplicate ids, invalid geometry, and non-finite numbers", () => {
  const result = validateArenaMapMetadata(
    validMap({
      primitives: [
        {
          id: "duplicate-id",
          kind: "floor",
          label: "Floor",
          position: [0, -0.1, 0],
          size: [18, 0.2, 14]
        },
        {
          id: "duplicate-id",
          kind: "cover",
          label: "Bad cover",
          position: [Number.NaN, 0, 0],
          size: [0, 1, 1]
        }
      ]
    })
  );

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.message.includes("duplicate")), true);
  assert.equal(result.errors.some((error) => error.field.includes("position")), true);
  assert.equal(result.errors.some((error) => error.field.includes("size")), true);
});

test("map metadata validation enforces bounded primitive counts and spawn markers inside world bounds", () => {
  const primitives = Array.from({ length: ARENA_MAP_METADATA_LIMITS.maxPrimitives + 1 }, (_, index) => ({
    id: `cover-${index}`,
    kind: "cover",
    label: `Cover ${index}`,
    position: [0, 0.5, 0],
    size: [1, 1, 1]
  }));
  const result = validateArenaMapMetadata(
    validMap({
      primitives,
      spawnMarkers: [
        {
          id: "spawn-outside",
          label: "Outside neutral spawn",
          role: "neutral",
          position: [99, 0, 0],
          yaw: 0
        }
      ]
    })
  );

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.field === "primitives"), true);
  assert.equal(result.errors.some((error) => error.field.includes("spawnMarkers")), true);
});

test("sandbox greybox layout derives render primitives from map metadata", () => {
  const layout = createGreyboxLayoutFromMap(EBB_TERMINAL_ARENA);
  const defaultLayout = createGreyboxLayout();
  const metadata = getGreyboxLayoutMetadata();

  assert.equal(layout.length, EBB_TERMINAL_ARENA.primitives.length + EBB_TERMINAL_ARENA.playerScaleReferences.length);
  assert.equal(defaultLayout.length, layout.length);
  assert.equal(metadata.mapId, EBB_TERMINAL_ARENA.id);
  assert.equal(metadata.revision, EBB_TERMINAL_ARENA.revision);
  assert.equal(metadata.spawnMarkerCount, EBB_TERMINAL_ARENA.spawnMarkers.length);
  assert.equal(layout.every((primitive) => primitive.id.startsWith("map-")), true);
});
