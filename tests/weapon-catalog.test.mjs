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

test("weapon catalog exposes the three original weapons keyed by loadout profile id", () => {
  assert.equal(WEAPON_CATALOG.length, 3);
  assert.deepEqual(
    WEAPON_CATALOG.map((weapon) => weapon.profileId),
    [LOADOUT_PROFILE_ID.ridgeline, LOADOUT_PROFILE_ID.halcyon, LOADOUT_PROFILE_ID.cinder]
  );
  assert.deepEqual(
    WEAPON_CATALOG.map((weapon) => weapon.name),
    ["Ridgeline", "Halcyon", "Cinder"]
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
    LOADOUT_PROFILE_ID.cinder
  ]);
});
