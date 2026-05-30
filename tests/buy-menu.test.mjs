import assert from "node:assert/strict";
import test from "node:test";

import { LOADOUT_PROFILE_ID, WEAPON_CATALOG } from "../packages/shared/dist/index.js";
import { createBuyMenuView, formatBuyMenuPrice } from "../apps/client/dist/playtest/buy-menu.js";

test("buy menu view lists the catalog with prices for every weapon", () => {
  const view = createBuyMenuView({ money: 16000 });
  assert.equal(view.rows.length, WEAPON_CATALOG.length);
  assert.deepEqual(
    view.rows.map((row) => row.name),
    WEAPON_CATALOG.map((weapon) => weapon.name)
  );
});

test("buy menu flags affordability against the player's money", () => {
  // Pistol-round money: only the free pistol and nothing else is affordable.
  const broke = createBuyMenuView({ money: 800, currentWeaponProfileId: LOADOUT_PROFILE_ID.halcyon });
  const smg = broke.rows.find((row) => row.profileId === LOADOUT_PROFILE_ID.cinder);
  const pistol = broke.rows.find((row) => row.profileId === LOADOUT_PROFILE_ID.halcyon);
  assert.equal(smg.affordable, false); // 800 < 1050
  assert.equal(smg.owned, false);
  // The free starter you already hold is neither affordable (re-buyable) nor a purchase.
  assert.equal(pistol.owned, true);
  assert.equal(pistol.affordable, false);

  // With more money the rifle becomes buyable but the owned weapon stays non-buyable.
  const flush = createBuyMenuView({ money: 5000, currentWeaponProfileId: LOADOUT_PROFILE_ID.cinder });
  assert.equal(flush.rows.find((row) => row.profileId === LOADOUT_PROFILE_ID.vantage).affordable, true);
  assert.equal(flush.rows.find((row) => row.profileId === LOADOUT_PROFILE_ID.cinder).affordable, false);
  assert.equal(flush.rows.find((row) => row.profileId === LOADOUT_PROFILE_ID.cinder).owned, true);
});

test("buy menu treats unknown money as nothing affordable", () => {
  const view = createBuyMenuView({});
  assert.equal(view.money, undefined);
  assert.equal(view.rows.every((row) => row.affordable === false), true);
});

test("formatBuyMenuPrice labels free and priced weapons", () => {
  assert.equal(formatBuyMenuPrice(0), "Free");
  assert.equal(formatBuyMenuPrice(2700), "$2700");
});
