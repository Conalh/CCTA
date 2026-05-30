import assert from "node:assert/strict";
import test from "node:test";

import {
  COMBAT_EVENT_KIND,
  FIRE_REJECT_REASON
} from "../packages/shared/dist/index.js";
import {
  COMBAT_APPLY_REJECT_REASON,
  createCombatState
} from "../apps/server/dist/index.js";

function fireResult(input = {}) {
  return {
    kind: "server.fire.result",
    sequence: input.sequence ?? 1,
    sessionId: input.sessionId ?? 1,
    serverTick: input.serverTick ?? 10,
    accepted: input.accepted ?? true,
    hit: input.hit ?? true,
    targetEntityId: input.targetEntityId ?? 2,
    targetSessionId: input.targetSessionId ?? 2,
    distance: input.distance ?? 1.5,
    rejectReason: input.rejectReason ?? FIRE_REJECT_REASON.none
  };
}

test("combat state assigns server-owned health and applies placeholder damage from accepted fire results", () => {
  const combat = createCombatState({
    damagePerHit: 50,
    respawnDelayTicks: 3
  });
  combat.assignEntity({ sessionId: 1, entityId: 1 });
  combat.assignEntity({ sessionId: 2, entityId: 2 });

  const firstHit = combat.applyFireResult(fireResult({ sequence: 7, serverTick: 20 }));
  assert.equal(firstHit.applied, true);
  assert.deepEqual(combat.getSessionState(2), {
    sessionId: 2,
    entityId: 2,
    health: 50,
    maxHealth: 100,
    alive: true,
    deathTick: 0,
    respawnEligibleTick: 0,
    lastEventKind: COMBAT_EVENT_KIND.damage,
    lastEventTick: 20,
    lastEventSequence: 7,
    sourceSessionId: 1,
    targetSessionId: 2,
    damage: 50
  });
});

test("combat state owns death and rejects dead targets until server reset eligibility", () => {
  const combat = createCombatState({
    damagePerHit: 50,
    respawnDelayTicks: 3
  });
  combat.assignEntity({ sessionId: 1, entityId: 1 });
  combat.assignEntity({ sessionId: 2, entityId: 2 });

  combat.applyFireResult(fireResult({ sequence: 1, serverTick: 10 }));
  const lethal = combat.applyFireResult(fireResult({ sequence: 2, serverTick: 11 }));
  assert.equal(lethal.applied, true);
  assert.equal(combat.isAlive(2), false);
  assert.deepEqual(combat.getSessionState(2), {
    sessionId: 2,
    entityId: 2,
    health: 0,
    maxHealth: 100,
    alive: false,
    deathTick: 11,
    respawnEligibleTick: 14,
    lastEventKind: COMBAT_EVENT_KIND.death,
    lastEventTick: 11,
    lastEventSequence: 2,
    sourceSessionId: 1,
    targetSessionId: 2,
    damage: 50
  });

  const deadTarget = combat.applyFireResult(fireResult({ sequence: 3, serverTick: 12 }));
  assert.deepEqual(deadTarget, {
    applied: false,
    rejectReason: COMBAT_APPLY_REJECT_REASON.targetDead,
    state: combat.getSessionState(2)
  });

  assert.deepEqual(combat.advanceRespawns(13), []);
  assert.equal(combat.isAlive(2), false);
  assert.deepEqual(combat.advanceRespawns(14), [combat.getSessionState(2)]);
  assert.equal(combat.isAlive(2), true);
  assert.equal(combat.getSessionState(2)?.health, 100);
  assert.equal(combat.getSessionState(2)?.lastEventKind, COMBAT_EVENT_KIND.respawn);
});

test("combat state ignores rejected, missed, unknown-target, and client-shaped fire results", () => {
  const combat = createCombatState({
    damagePerHit: 50,
    respawnDelayTicks: 3
  });
  combat.assignEntity({ sessionId: 1, entityId: 1 });
  combat.assignEntity({ sessionId: 2, entityId: 2 });

  for (const result of [
    fireResult({ accepted: false, hit: true }),
    fireResult({ accepted: true, hit: false }),
    fireResult({ accepted: true, hit: true, targetSessionId: 99 }),
    {
      ...fireResult(),
      damage: 999,
      health: 0,
      score: 100
    }
  ]) {
    combat.applyFireResult(result);
  }

  assert.equal(combat.getSessionState(2)?.health, 50);
  assert.equal(combat.getSessionState(2)?.lastEventKind, COMBAT_EVENT_KIND.damage);
});

test("armor absorbs part of each hit until the pool depletes", () => {
  const combat = createCombatState({ damagePerHit: 50, respawnDelayTicks: 3 });
  combat.assignEntity({ sessionId: 1, entityId: 1 });
  combat.assignEntity({ sessionId: 2, entityId: 2 });
  assert.equal(combat.setArmor(2, 100), true);
  assert.equal(combat.getArmor(2), 100);

  // 50 incoming: armor absorbs floor(50*0.5)=25, health takes 25.
  const first = combat.applyFireResult(fireResult({ sequence: 1, serverTick: 10 }));
  assert.equal(first.state.health, 75);
  assert.equal(first.state.damage, 25); // damage to health, not the raw weapon damage
  assert.equal(first.armor, 75);
  assert.equal(combat.getArmor(2), 75);

  // Three more hits drain the armor (25 each) and then full damage lands.
  combat.applyFireResult(fireResult({ sequence: 2, serverTick: 11 }));
  combat.applyFireResult(fireResult({ sequence: 3, serverTick: 12 }));
  assert.equal(combat.getArmor(2), 25);
  assert.equal(combat.getSessionState(2)?.health, 25);
  // 4th hit: armor only has 25, absorbs floor(min(25,25))=25, health takes 25 → 0 (death).
  const lethal = combat.applyFireResult(fireResult({ sequence: 4, serverTick: 13 }));
  assert.equal(combat.getArmor(2), 0);
  assert.equal(lethal.state.health, 0);

  // Armor clears on round reset.
  combat.resetAll(20);
  assert.equal(combat.getArmor(2), 0);
});
