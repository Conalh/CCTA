import assert from "node:assert/strict";
import test from "node:test";

import {
  LOADOUT_PROFILE_ID,
  LOADOUT_REJECT_REASON,
  LOADOUT_STATUS
} from "../packages/shared/dist/index.js";
import {
  DEFAULT_LOADOUT_COMBAT_DAMAGE_PER_HIT,
  createLoadoutState
} from "../apps/server/dist/index.js";

test("loadout state accepts one server-known placeholder profile for an assigned session", () => {
  const loadouts = createLoadoutState();
  loadouts.assignSession(3);

  const result = loadouts.selectLoadout({
    sessionId: 3,
    sequence: 1,
    profileId: LOADOUT_PROFILE_ID.baseline,
    serverTick: 12
  });

  assert.deepEqual(result, {
    kind: "server.loadout.state",
    serverTick: 12,
    sequence: 1,
    sessionId: 3,
    profileId: LOADOUT_PROFILE_ID.baseline,
    status: LOADOUT_STATUS.accepted,
    rejectReason: LOADOUT_REJECT_REASON.none
  });
  assert.equal(loadouts.getCombatDamagePerHit(3), DEFAULT_LOADOUT_COMBAT_DAMAGE_PER_HIT);
});

test("loadout state rejects unknown sessions, invalid profiles, stale duplicates, and reselection", () => {
  const loadouts = createLoadoutState();

  assert.deepEqual(
    loadouts.selectLoadout({
      sessionId: 99,
      sequence: 1,
      profileId: LOADOUT_PROFILE_ID.baseline,
      serverTick: 20
    }),
    {
      kind: "server.loadout.state",
      serverTick: 20,
      sequence: 1,
      sessionId: 0,
      profileId: 0,
      status: LOADOUT_STATUS.rejected,
      rejectReason: LOADOUT_REJECT_REASON.noMatchAssignment
    }
  );

  loadouts.assignSession(4);
  assert.deepEqual(
    loadouts.selectLoadout({
      sessionId: 4,
      sequence: 1,
      profileId: 999,
      serverTick: 21
    }),
    {
      kind: "server.loadout.state",
      serverTick: 21,
      sequence: 1,
      sessionId: 4,
      profileId: 0,
      status: LOADOUT_STATUS.rejected,
      rejectReason: LOADOUT_REJECT_REASON.invalidProfile
    }
  );

  assert.deepEqual(
    loadouts.selectLoadout({
      sessionId: 4,
      sequence: 1,
      profileId: LOADOUT_PROFILE_ID.baseline,
      serverTick: 22
    }),
    {
      kind: "server.loadout.state",
      serverTick: 22,
      sequence: 1,
      sessionId: 4,
      profileId: 0,
      status: LOADOUT_STATUS.rejected,
      rejectReason: LOADOUT_REJECT_REASON.staleSequence
    }
  );

  assert.equal(
    loadouts.selectLoadout({
      sessionId: 4,
      sequence: 2,
      profileId: LOADOUT_PROFILE_ID.baseline,
      serverTick: 23
    }).status,
    LOADOUT_STATUS.accepted
  );
  assert.deepEqual(
    loadouts.selectLoadout({
      sessionId: 4,
      sequence: 3,
      profileId: LOADOUT_PROFILE_ID.baseline,
      serverTick: 24
    }),
    {
      kind: "server.loadout.state",
      serverTick: 24,
      sequence: 3,
      sessionId: 4,
      profileId: LOADOUT_PROFILE_ID.baseline,
      status: LOADOUT_STATUS.rejected,
      rejectReason: LOADOUT_REJECT_REASON.alreadySelected
    }
  );
});

test("loadout state removes disconnected sessions and clears server-owned defaults", () => {
  const loadouts = createLoadoutState();
  loadouts.assignSession(5);
  loadouts.selectLoadout({
    sessionId: 5,
    sequence: 1,
    profileId: LOADOUT_PROFILE_ID.baseline,
    serverTick: 30
  });

  assert.equal(loadouts.getCombatDamagePerHit(5), DEFAULT_LOADOUT_COMBAT_DAMAGE_PER_HIT);
  assert.notEqual(loadouts.removeSession(5), undefined);
  assert.equal(loadouts.getStateMessage(5, 31), undefined);
  assert.equal(loadouts.getCombatDamagePerHit(5), undefined);
});
