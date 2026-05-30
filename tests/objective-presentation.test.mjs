import assert from "node:assert/strict";
import test from "node:test";

import {
  CHARGE_PHASE,
  DEFUSE_DURATION_TICKS,
  PLANT_DURATION_TICKS,
  PLANT_SITE,
  SERVER_TICK_RATE_HZ,
  TEAM
} from "../packages/shared/dist/index.js";
import {
  createObjectiveHudView,
  createObjectivePromptView
} from "../apps/client/dist/playtest/objective-presentation.js";

test("objective hud stays hidden for an untouched idle charge", () => {
  assert.equal(createObjectiveHudView({ chargePhase: CHARGE_PHASE.idle }).visible, false);
  assert.equal(createObjectiveHudView({ chargePhase: undefined }).visible, false);
});

test("objective hud shows plant progress while the charge is being armed", () => {
  const view = createObjectiveHudView({
    chargePhase: CHARGE_PHASE.idle,
    plantProgress: PLANT_DURATION_TICKS / 2
  });
  assert.equal(view.visible, true);
  assert.equal(view.tone, "arming");
  assert.equal(view.detail, "50%");
  assert.equal(view.progress, 0.5);
});

test("objective hud shows the detonation countdown once armed", () => {
  const view = createObjectiveHudView({
    chargePhase: CHARGE_PHASE.planted,
    detonationTick: 100 + SERVER_TICK_RATE_HZ * 35,
    serverTick: 100,
    tickRateHz: SERVER_TICK_RATE_HZ
  });
  assert.equal(view.tone, "armed");
  assert.equal(view.detail, "0:35");
  assert.equal(view.progress, undefined);
});

test("objective hud surfaces a defuse in progress with its own bar", () => {
  const view = createObjectiveHudView({
    chargePhase: CHARGE_PHASE.planted,
    defuseProgress: DEFUSE_DURATION_TICKS / 4,
    detonationTick: 1000,
    serverTick: 940,
    tickRateHz: SERVER_TICK_RATE_HZ
  });
  assert.equal(view.tone, "defusing");
  assert.equal(view.progress, 0.25);
  assert.equal(view.detail, "0:01");
});

test("objective hud reports terminal outcomes", () => {
  assert.equal(createObjectiveHudView({ chargePhase: CHARGE_PHASE.defused }).tone, "defused");
  assert.equal(createObjectiveHudView({ chargePhase: CHARGE_PHASE.detonated }).tone, "detonated");
});

test("objective prompt invites a Robber on the idle site to plant", () => {
  const view = createObjectivePromptView({
    localTeam: TEAM.robbers,
    localAlive: true,
    localX: PLANT_SITE.x,
    localZ: PLANT_SITE.z,
    chargePhase: CHARGE_PHASE.idle
  });
  assert.equal(view.visible, true);
  assert.match(view.text, /plant/i);
});

test("objective prompt invites a Cop on the armed charge to defuse", () => {
  const view = createObjectivePromptView({
    localTeam: TEAM.cops,
    localAlive: true,
    localX: PLANT_SITE.x,
    localZ: PLANT_SITE.z,
    chargePhase: CHARGE_PHASE.planted
  });
  assert.equal(view.visible, true);
  assert.match(view.text, /defuse/i);
});

test("objective prompt stays hidden off-site, when dead, or for the wrong side/phase", () => {
  const base = { localTeam: TEAM.robbers, localAlive: true, localX: PLANT_SITE.x, localZ: PLANT_SITE.z, chargePhase: CHARGE_PHASE.idle };
  assert.equal(createObjectivePromptView({ ...base, localZ: PLANT_SITE.z + 50 }).visible, false); // off-site
  assert.equal(createObjectivePromptView({ ...base, localAlive: false }).visible, false); // dead
  // A Cop cannot plant; a Robber cannot defuse.
  assert.equal(createObjectivePromptView({ ...base, localTeam: TEAM.cops }).visible, false);
  assert.equal(
    createObjectivePromptView({ ...base, localTeam: TEAM.cops, chargePhase: CHARGE_PHASE.idle }).visible,
    false
  );
});
