import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WEAPON_PROFILE_ID,
  LOADOUT_PROFILE_ID,
  WEAPON_CATALOG,
  getWeaponDefinition,
  isKnownWeaponProfileId,
  listWeaponProfileIds
} from "../packages/shared/dist/index.js";

test("weapon catalog exposes the original arsenal keyed by loadout profile id", () => {
  assert.equal(WEAPON_CATALOG.length, 5);
  assert.deepEqual(
    WEAPON_CATALOG.map((weapon) => weapon.profileId),
    [
      LOADOUT_PROFILE_ID.ridgeline,
      LOADOUT_PROFILE_ID.halcyon,
      LOADOUT_PROFILE_ID.cinder,
      LOADOUT_PROFILE_ID.maul,
      LOADOUT_PROFILE_ID.vantage
    ]
  );
  assert.deepEqual(
    WEAPON_CATALOG.map((weapon) => weapon.name),
    ["Ridgeline", "Halcyon", "Cinder", "Maul", "Vantage"]
  );
  // One of each class: sniper, revolver (pistol), smg, shotgun, rifle.
  assert.deepEqual(
    WEAPON_CATALOG.map((weapon) => weapon.role),
    ["sniper", "revolver", "smg", "shotgun", "rifle"]
  );
  // Buy-menu prices: the starter pistol is free, the rest cost money.
  assert.deepEqual(
    WEAPON_CATALOG.map((weapon) => weapon.price),
    [4750, 0, 1050, 1800, 2700]
  );
});

test("weapon catalog stats are bounded positive integers with non-empty identity", () => {
  for (const weapon of WEAPON_CATALOG) {
    assert.equal(typeof weapon.name, "string");
    assert.ok(weapon.name.trim().length > 0);
    assert.equal(typeof weapon.role, "string");
    assert.ok(weapon.role.trim().length > 0);
    for (const field of ["damagePerHit", "fireIntervalTicks", "magazineSize", "reloadTicks"]) {
      const value = weapon[field];
      assert.ok(Number.isInteger(value), `${field} must be an integer`);
      assert.ok(value >= 1 && value <= 0xffff, `${field} must be a positive uint16`);
    }
  }
});

test("default weapon profile id is a catalog member", () => {
  assert.equal(DEFAULT_WEAPON_PROFILE_ID, LOADOUT_PROFILE_ID.halcyon);
  assert.notEqual(getWeaponDefinition(DEFAULT_WEAPON_PROFILE_ID), undefined);
});

test("the starter weapon is a hard-hitting six-shot revolver", () => {
  const starter = getWeaponDefinition(DEFAULT_WEAPON_PROFILE_ID);
  assert.equal(starter.role, "revolver");
  assert.equal(starter.magazineSize, 6);
  // Revolver feel: high per-hit damage and a slow, deliberate cadence.
  assert.ok(starter.damagePerHit >= 40, "a revolver hits hard");
  assert.ok(starter.fireIntervalTicks >= 15, "a revolver fires deliberately");
});

test("weapon lookup resolves known profiles and rejects unknown ids", () => {
  assert.equal(getWeaponDefinition(LOADOUT_PROFILE_ID.ridgeline)?.name, "Ridgeline");
  assert.equal(getWeaponDefinition(0), undefined);
  assert.equal(getWeaponDefinition(99), undefined);

  assert.equal(isKnownWeaponProfileId(LOADOUT_PROFILE_ID.cinder), true);
  assert.equal(isKnownWeaponProfileId(0), false);
  assert.equal(isKnownWeaponProfileId(99), false);

  assert.deepEqual(listWeaponProfileIds(), [
    LOADOUT_PROFILE_ID.ridgeline,
    LOADOUT_PROFILE_ID.halcyon,
    LOADOUT_PROFILE_ID.cinder,
    LOADOUT_PROFILE_ID.maul,
    LOADOUT_PROFILE_ID.vantage
  ]);
});
