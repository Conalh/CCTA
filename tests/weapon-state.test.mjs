import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRE_REJECT_REASON,
  LOADOUT_PROFILE_ID,
  WEAPON_EVENT_KIND
} from "../packages/shared/dist/index.js";
import { createWeaponState } from "../apps/server/dist/index.js";

const TEST_DEFINITIONS = [
  {
    profileId: LOADOUT_PROFILE_ID.ridgeline,
    name: "Alpha",
    role: "test",
    damagePerHit: 70,
    fireIntervalTicks: 4,
    magazineSize: 3,
    reloadTicks: 8
  },
  {
    profileId: LOADOUT_PROFILE_ID.halcyon,
    name: "Bravo",
    role: "test",
    damagePerHit: 25,
    fireIntervalTicks: 1,
    magazineSize: 2,
    reloadTicks: 3
  },
  {
    profileId: LOADOUT_PROFILE_ID.cinder,
    name: "Charlie",
    role: "test",
    damagePerHit: 15,
    fireIntervalTicks: 2,
    magazineSize: 8,
    reloadTicks: 3
  }
];

const TEST_CONFIG = {
  definitions: TEST_DEFINITIONS,
  defaultProfileId: LOADOUT_PROFILE_ID.halcyon
};

test("assigns sessions with the default weapon at a full magazine", () => {
  const weapons = createWeaponState(TEST_CONFIG);

  assert.deepEqual(weapons.assignSession(1), {
    kind: "server.weapon.state",
    serverTick: 0,
    sessionId: 1,
    weaponProfileId: LOADOUT_PROFILE_ID.halcyon,
    ammoInMagazine: 2,
    magazineSize: 2,
    reloading: false,
    reloadCompleteTick: 0,
    lastEventKind: WEAPON_EVENT_KIND.assigned,
    lastEventSequence: 0
  });
  assert.equal(weapons.getCurrentDamage(1), 25);
});

test("fires within ammo and rejects on cooldown then on empty magazine", () => {
  const weapons = createWeaponState(TEST_CONFIG);
  weapons.assignSession(1);

  const first = weapons.tryFire({ sessionId: 1, serverTick: 5, sequence: 1 });
  assert.equal(first.ok, true);
  assert.equal(first.state.ammoInMagazine, 1);
  assert.equal(first.state.lastEventKind, WEAPON_EVENT_KIND.fired);
  assert.equal(first.state.lastEventSequence, 1);

  const cooldown = weapons.tryFire({ sessionId: 1, serverTick: 5, sequence: 2 });
  assert.deepEqual(cooldown, { ok: false, rejectReason: FIRE_REJECT_REASON.weaponCooldown });

  const second = weapons.tryFire({ sessionId: 1, serverTick: 6, sequence: 3 });
  assert.equal(second.ok, true);
  assert.equal(second.state.ammoInMagazine, 0);

  const empty = weapons.tryFire({ sessionId: 1, serverTick: 7, sequence: 4 });
  assert.deepEqual(empty, { ok: false, rejectReason: FIRE_REJECT_REASON.outOfAmmo });
});

test("rejects fire for unknown sessions", () => {
  const weapons = createWeaponState(TEST_CONFIG);
  assert.deepEqual(weapons.tryFire({ sessionId: 9, serverTick: 5, sequence: 1 }), {
    ok: false,
    rejectReason: FIRE_REJECT_REASON.noMatchAssignment
  });
});

test("reloads only after the configured tick delay and blocks fire while reloading", () => {
  const weapons = createWeaponState(TEST_CONFIG);
  weapons.assignSession(1);
  weapons.tryFire({ sessionId: 1, serverTick: 5, sequence: 1 });

  const reloadStart = weapons.requestReload({ sessionId: 1, serverTick: 6, sequence: 2 });
  assert.equal(reloadStart.reloading, true);
  assert.equal(reloadStart.reloadCompleteTick, 9);
  assert.equal(reloadStart.lastEventKind, WEAPON_EVENT_KIND.reloadStart);
  assert.equal(reloadStart.lastEventSequence, 2);
  assert.equal(reloadStart.serverTick, 6);

  const blocked = weapons.tryFire({ sessionId: 1, serverTick: 7, sequence: 3 });
  assert.deepEqual(blocked, { ok: false, rejectReason: FIRE_REJECT_REASON.reloading });

  assert.deepEqual(weapons.advanceReloads(8), []);

  const completed = weapons.advanceReloads(9);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].ammoInMagazine, 2);
  assert.equal(completed[0].reloading, false);
  assert.equal(completed[0].reloadCompleteTick, 0);
  assert.equal(completed[0].lastEventKind, WEAPON_EVENT_KIND.reloadComplete);
  assert.equal(completed[0].serverTick, 9);
});

test("rejects reload when the magazine is full or a reload is already in flight", () => {
  const weapons = createWeaponState(TEST_CONFIG);
  weapons.assignSession(1);

  assert.equal(weapons.requestReload({ sessionId: 1, serverTick: 5, sequence: 1 }), undefined);

  weapons.tryFire({ sessionId: 1, serverTick: 5, sequence: 2 });
  assert.notEqual(weapons.requestReload({ sessionId: 1, serverTick: 6, sequence: 3 }), undefined);
  assert.equal(weapons.requestReload({ sessionId: 1, serverTick: 7, sequence: 4 }), undefined);
});

test("switches weapon, refills the magazine, and reports current damage", () => {
  const weapons = createWeaponState(TEST_CONFIG);
  weapons.assignSession(1);
  weapons.tryFire({ sessionId: 1, serverTick: 5, sequence: 1 });

  const switched = weapons.setWeapon(1, LOADOUT_PROFILE_ID.ridgeline);
  assert.equal(switched.weaponProfileId, LOADOUT_PROFILE_ID.ridgeline);
  assert.equal(switched.ammoInMagazine, 3);
  assert.equal(switched.magazineSize, 3);
  assert.equal(switched.reloading, false);
  assert.equal(switched.lastEventKind, WEAPON_EVENT_KIND.switched);
  assert.equal(weapons.getCurrentDamage(1), 70);
});

test("resets every session back to the default weapon", () => {
  const weapons = createWeaponState(TEST_CONFIG);
  weapons.assignSession(1);
  weapons.assignSession(2);
  weapons.setWeapon(1, LOADOUT_PROFILE_ID.cinder);
  weapons.tryFire({ sessionId: 2, serverTick: 5, sequence: 1 });

  const reset = weapons.resetAll(20);
  assert.equal(reset.length, 2);
  for (const message of reset) {
    assert.equal(message.weaponProfileId, LOADOUT_PROFILE_ID.halcyon);
    assert.equal(message.ammoInMagazine, 2);
    assert.equal(message.reloading, false);
    assert.equal(message.reloadCompleteTick, 0);
    assert.equal(message.lastEventKind, WEAPON_EVENT_KIND.reset);
    assert.equal(message.serverTick, 20);
  }
});

test("removes sessions and ignores unknown sessions", () => {
  const weapons = createWeaponState(TEST_CONFIG);
  weapons.assignSession(1);

  assert.notEqual(weapons.removeSession(1), undefined);
  assert.equal(weapons.removeSession(1), undefined);
  assert.equal(weapons.getSessionState(1), undefined);
  assert.equal(weapons.setWeapon(1, LOADOUT_PROFILE_ID.cinder), undefined);
  assert.equal(weapons.requestReload({ sessionId: 1, serverTick: 5, sequence: 1 }), undefined);
  assert.equal(weapons.getCurrentDamage(1), undefined);
  assert.equal(weapons.createStateMessage(1, 5), undefined);
});

test("rejects an unknown weapon profile on switch", () => {
  const weapons = createWeaponState(TEST_CONFIG);
  weapons.assignSession(1);
  assert.throws(() => weapons.setWeapon(1, 99), /known weapon/i);
});
