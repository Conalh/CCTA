import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WEAPON_PROFILE_ID,
  LOADOUT_PROFILE_ID
} from "../packages/shared/dist/index.js";
import { createPlayerRegistry } from "../apps/server/dist/player-registry.js";

test("assignSession gives the lowest free handle and the default weapon", () => {
  const registry = createPlayerRegistry();

  const first = registry.assignSession(10, 0);
  assert.equal(first.sessionId, 10);
  assert.equal(first.handleId, 1);
  assert.equal(first.callsign, "Vesper");
  assert.equal(first.weaponProfileId, DEFAULT_WEAPON_PROFILE_ID);
  assert.equal(first.slotIndex, 0);

  const second = registry.assignSession(20, 1);
  assert.equal(second.handleId, 2);
  assert.equal(second.callsign, "Quill");
});

test("assignSession is idempotent for an already-registered session", () => {
  const registry = createPlayerRegistry();
  const first = registry.assignSession(10, 0);
  const again = registry.assignSession(10, 3);
  assert.deepEqual(again, first);
  assert.equal(registry.roster().length, 1);
});

test("removeSession frees the handle for reuse by the lowest free slot", () => {
  const registry = createPlayerRegistry();
  registry.assignSession(10, 0);
  registry.assignSession(20, 1);

  const removed = registry.removeSession(10);
  assert.equal(removed?.handleId, 1);
  assert.equal(registry.removeSession(999), undefined);

  const rejoined = registry.assignSession(30, 0);
  assert.equal(rejoined.handleId, 1);
  assert.equal(rejoined.callsign, "Vesper");
});

test("setWeapon updates a known profile, rejects unknown profiles, and ignores unknown sessions", () => {
  const registry = createPlayerRegistry();
  registry.assignSession(10, 0);

  const updated = registry.setWeapon(10, LOADOUT_PROFILE_ID.ridgeline);
  assert.equal(updated?.weaponProfileId, LOADOUT_PROFILE_ID.ridgeline);
  assert.equal(registry.getEntry(10)?.weaponProfileId, LOADOUT_PROFILE_ID.ridgeline);

  assert.throws(() => registry.setWeapon(10, 99), /known weapon/i);
  assert.equal(registry.setWeapon(999, LOADOUT_PROFILE_ID.cinder), undefined);
});

test("resetWeapons returns every session to the default profile", () => {
  const registry = createPlayerRegistry();
  registry.assignSession(10, 0);
  registry.assignSession(20, 1);
  registry.setWeapon(10, LOADOUT_PROFILE_ID.cinder);
  registry.setWeapon(20, LOADOUT_PROFILE_ID.ridgeline);

  const reset = registry.resetWeapons();
  assert.equal(reset.length, 2);
  for (const entry of reset) {
    assert.equal(entry.weaponProfileId, DEFAULT_WEAPON_PROFILE_ID);
  }
  assert.equal(registry.getEntry(10)?.weaponProfileId, DEFAULT_WEAPON_PROFILE_ID);
  assert.equal(registry.getEntry(20)?.weaponProfileId, DEFAULT_WEAPON_PROFILE_ID);
});

test("roster is sorted by slot index regardless of assignment order", () => {
  const registry = createPlayerRegistry();
  registry.assignSession(30, 2);
  registry.assignSession(10, 0);
  registry.assignSession(20, 1);

  assert.deepEqual(
    registry.roster().map((entry) => entry.slotIndex),
    [0, 1, 2]
  );
  assert.deepEqual(
    registry.roster().map((entry) => entry.sessionId),
    [10, 20, 30]
  );
});

test("createRosterMessage projects the numeric protocol shape", () => {
  const registry = createPlayerRegistry();
  registry.assignSession(10, 0);
  registry.setWeapon(10, LOADOUT_PROFILE_ID.cinder);

  const message = registry.createRosterMessage(120);
  assert.equal(message.kind, "server.match.roster");
  assert.equal(message.serverTick, 120);
  assert.equal(message.entryCount, 1);
  assert.deepEqual(message.entries, [
    {
      sessionId: 10,
      handleId: 1,
      weaponProfileId: LOADOUT_PROFILE_ID.cinder,
      slotIndex: 0
    }
  ]);
});

test("assignSession throws once the handle pool is exhausted", () => {
  const registry = createPlayerRegistry({
    handlePool: [
      { handleId: 1, callsign: "Solo" }
    ]
  });
  registry.assignSession(10, 0);
  assert.throws(() => registry.assignSession(20, 1), /no free handle/i);
});

test("config injection honours a custom handle pool and default weapon", () => {
  const registry = createPlayerRegistry({
    handlePool: [
      { handleId: 5, callsign: "Echo" },
      { handleId: 6, callsign: "Fox" }
    ],
    defaultWeaponProfileId: LOADOUT_PROFILE_ID.ridgeline
  });

  const entry = registry.assignSession(10, 0);
  assert.equal(entry.handleId, 5);
  assert.equal(entry.callsign, "Echo");
  assert.equal(entry.weaponProfileId, LOADOUT_PROFILE_ID.ridgeline);
});

test("createPlayerRegistry rejects an empty handle pool and an unknown default weapon", () => {
  assert.throws(() => createPlayerRegistry({ handlePool: [] }), /non-empty handle pool/i);
  assert.throws(
    () => createPlayerRegistry({ defaultWeaponProfileId: 99 }),
    /known weapon/i
  );
});
