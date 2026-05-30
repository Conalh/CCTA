import assert from "node:assert/strict";
import test from "node:test";

import {
  FOUNDRY_ROW_ARENA,
  PLANT_SITE,
  deriveArenaCollisionGeometry,
  getArenaMetadataById,
  resolveArenaMetadata,
  validateArenaMapMetadata
} from "../packages/shared/dist/index.js";
import { createGreyboxLayoutFromMap } from "../apps/client/dist/sandbox/greybox-layout.js";

const forbiddenNames = /\b(counter|strike|valve|dust|dust2|mirage|inferno|nuke|terrorist|counter-terrorist)\b/i;

test("foundry row passes the map metadata contract with original naming", () => {
  const result = validateArenaMapMetadata(FOUNDRY_ROW_ARENA);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.match(FOUNDRY_ROW_ARENA.id, /^arena-[a-z0-9-]+$/);
  const allText = [
    FOUNDRY_ROW_ARENA.displayName,
    ...FOUNDRY_ROW_ARENA.primitives.map((primitive) => primitive.label),
    ...FOUNDRY_ROW_ARENA.spawnMarkers.map((spawn) => spawn.label),
    ...(FOUNDRY_ROW_ARENA.labels ?? []).map((label) => label.text)
  ].join(" ");
  assert.equal(forbiddenNames.test(allText), false);
});

test("foundry row has eight slot starts: four defending Cops north, four attacking Robbers south", () => {
  assert.equal(FOUNDRY_ROW_ARENA.spawnMarkers.length, 8);
  assert.equal(FOUNDRY_ROW_ARENA.slotStarts?.length, 8);

  const starts = FOUNDRY_ROW_ARENA.slotStarts ?? [];
  // Lower half (slots 0-3) are the Cops in the north (z < 0); upper half the Robbers in the south.
  assert.equal(starts.slice(0, 4).every((start) => start.position[2] < 0), true);
  assert.equal(starts.slice(4, 8).every((start) => start.position[2] > 0), true);
});

test("foundry row spawns and the charge site are clear of derived collision blockers", () => {
  const geometry = deriveArenaCollisionGeometry(FOUNDRY_ROW_ARENA);
  const radius = geometry.playerRadiusMeters;
  const clear = (x, z) =>
    geometry.blockers.every(
      (blocker) =>
        x <= blocker.min[0] - radius ||
        x >= blocker.max[0] + radius ||
        z <= blocker.min[1] - radius ||
        z >= blocker.max[1] + radius
    );

  for (const spawn of FOUNDRY_ROW_ARENA.spawnMarkers) {
    assert.equal(clear(spawn.position[0], spawn.position[2]), true, `${spawn.id} overlaps a blocker`);
  }
  // The charge site centre must be plantable (collision-clear).
  assert.equal(clear(PLANT_SITE.x, PLANT_SITE.z), true, "charge site overlaps a blocker");
});

test("foundry row renders a greybox layout and resolves by id", () => {
  const layout = createGreyboxLayoutFromMap(FOUNDRY_ROW_ARENA);
  assert.equal(layout.length, FOUNDRY_ROW_ARENA.primitives.length + FOUNDRY_ROW_ARENA.playerScaleReferences.length);

  assert.equal(getArenaMetadataById("foundry-row")?.id, "arena-foundry-row");
  assert.equal(getArenaMetadataById("arena-foundry-row")?.id, "arena-foundry-row");
  assert.equal(getArenaMetadataById("nope"), undefined);
  assert.equal(resolveArenaMetadata("nope").id, "arena-drydock-span"); // falls back to the default
});
