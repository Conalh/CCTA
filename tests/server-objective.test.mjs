import assert from "node:assert/strict";
import test from "node:test";

import { CHARGE_PHASE } from "../packages/shared/dist/index.js";
import { createObjectiveState } from "../apps/server/dist/index.js";

const CONFIG = { plantDurationTicks: 3, defuseDurationTicks: 4, detonationDelayTicks: 10 };

function advancePlant(objective, ticks, startTick) {
  let result;
  for (let i = 0; i < ticks; i += 1) {
    result = objective.advance({ serverTick: startTick + i, planterCount: 1, defuserCount: 0 });
  }
  return result;
}

test("a charge arms after a continuous plant and sets a detonation tick", () => {
  const objective = createObjectiveState(CONFIG);
  let result = objective.advance({ serverTick: 100, planterCount: 1, defuserCount: 0 });
  assert.equal(result.phase, CHARGE_PHASE.idle);
  assert.equal(result.plantProgress, 1);

  result = objective.advance({ serverTick: 101, planterCount: 1, defuserCount: 0 });
  assert.equal(result.phase, CHARGE_PHASE.idle); // 2/3

  result = objective.advance({ serverTick: 102, planterCount: 1, defuserCount: 0 });
  assert.equal(result.phase, CHARGE_PHASE.planted);
  assert.equal(result.justPlanted, true);
  assert.equal(result.detonationTick, 102 + CONFIG.detonationDelayTicks);
  assert.equal(objective.isArmed(), true);
});

test("leaving the site before the plant completes resets progress", () => {
  const objective = createObjectiveState(CONFIG);
  objective.advance({ serverTick: 1, planterCount: 1, defuserCount: 0 });
  objective.advance({ serverTick: 2, planterCount: 1, defuserCount: 0 }); // 2/3
  const dropped = objective.advance({ serverTick: 3, planterCount: 0, defuserCount: 0 });
  assert.equal(dropped.plantProgress, 0);
  assert.equal(dropped.phase, CHARGE_PHASE.idle);
});

test("a Cop defuses the armed charge before it detonates", () => {
  const objective = createObjectiveState(CONFIG);
  advancePlant(objective, 3, 0); // armed at tick 2, detonates at 12

  let result;
  for (let i = 0; i < CONFIG.defuseDurationTicks; i += 1) {
    result = objective.advance({ serverTick: 3 + i, planterCount: 0, defuserCount: 1 });
  }
  assert.equal(result.phase, CHARGE_PHASE.defused);
  assert.equal(result.justDefused, true);
  assert.equal(objective.isResolved(), true);
});

test("interrupting a defuse resets its progress", () => {
  const objective = createObjectiveState(CONFIG);
  advancePlant(objective, 3, 0);
  objective.advance({ serverTick: 3, planterCount: 0, defuserCount: 1 });
  const interrupted = objective.advance({ serverTick: 4, planterCount: 0, defuserCount: 0 });
  assert.equal(interrupted.defuseProgress, 0);
  assert.equal(interrupted.phase, CHARGE_PHASE.planted);
});

test("an undefused charge detonates when its timer expires", () => {
  const objective = createObjectiveState(CONFIG);
  advancePlant(objective, 3, 0); // armed at tick 2, detonationTick = 12

  let result;
  for (let tick = 3; tick <= 12; tick += 1) {
    result = objective.advance({ serverTick: tick, planterCount: 0, defuserCount: 0 });
  }
  assert.equal(result.phase, CHARGE_PHASE.detonated);
  assert.equal(result.justDetonated, true);
});

test("a defuse that finishes on the detonation tick still wins", () => {
  // detonationDelay 4 so the charge would blow on the same tick the defuse completes.
  const objective = createObjectiveState({ plantDurationTicks: 1, defuseDurationTicks: 3, detonationDelayTicks: 3 });
  objective.advance({ serverTick: 0, planterCount: 1, defuserCount: 0 }); // armed, detonationTick = 3
  objective.advance({ serverTick: 1, planterCount: 0, defuserCount: 1 });
  objective.advance({ serverTick: 2, planterCount: 0, defuserCount: 1 });
  const result = objective.advance({ serverTick: 3, planterCount: 0, defuserCount: 1 });
  assert.equal(result.phase, CHARGE_PHASE.defused);
});

test("reset returns the charge to idle and createStateMessage mirrors it", () => {
  const objective = createObjectiveState(CONFIG);
  advancePlant(objective, 3, 0);
  let message = objective.createStateMessage(50);
  assert.equal(message.kind, "server.objective.state");
  assert.equal(message.chargePhase, CHARGE_PHASE.planted);

  objective.reset();
  message = objective.createStateMessage(51);
  assert.equal(message.chargePhase, CHARGE_PHASE.idle);
  assert.equal(message.plantProgress, 0);
  assert.equal(message.detonationTick, 0);
  assert.equal(objective.isArmed(), false);
});
