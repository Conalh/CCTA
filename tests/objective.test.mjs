import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFUSE_DURATION_TICKS,
  DETONATION_DELAY_TICKS,
  PLANT_DURATION_TICKS,
  PLANT_SITE,
  isWithinPlantSite
} from "../packages/shared/dist/index.js";

test("plant site sits in the Cops' half clear of the walls", () => {
  assert.equal(PLANT_SITE.z < 0, true); // north (defender) half
  assert.equal(PLANT_SITE.radius > 0, true);
  // The footprint stays well inside the +/-19.5 arena walls.
  assert.equal(PLANT_SITE.x - PLANT_SITE.radius > -19.5, true);
  assert.equal(PLANT_SITE.z - PLANT_SITE.radius > -19.5, true);
});

test("isWithinPlantSite measures the circular footprint", () => {
  assert.equal(isWithinPlantSite(PLANT_SITE.x, PLANT_SITE.z), true);
  assert.equal(isWithinPlantSite(PLANT_SITE.x, PLANT_SITE.z + PLANT_SITE.radius - 0.01), true);
  assert.equal(isWithinPlantSite(PLANT_SITE.x, PLANT_SITE.z + PLANT_SITE.radius + 0.5), false);
  // Spawn lines are far outside the site.
  assert.equal(isWithinPlantSite(0, 16.5), false);
  assert.equal(isWithinPlantSite(0, -16.5), false);
});

test("objective durations are positive and detonation outlasts a defuse", () => {
  assert.equal(PLANT_DURATION_TICKS > 0, true);
  assert.equal(DEFUSE_DURATION_TICKS > PLANT_DURATION_TICKS, true);
  assert.equal(DETONATION_DELAY_TICKS > DEFUSE_DURATION_TICKS, true);
});
