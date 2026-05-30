import assert from "node:assert/strict";
import test from "node:test";

import { TEAM, teamForSlot } from "../packages/shared/dist/index.js";
import * as server from "../apps/server/dist/index.js";

test("fixed match session balances players across the two sides as they join", () => {
  const match = server.createFixedMatchSession({ matchId: 1, capacity: 4, firstSessionId: 1 });

  const slots = ["a", "b", "c", "d"].map((id) => match.assign(`transport-${id}`).slotIndex);
  // Sides alternate so a 1v1 (a vs b) lands on opposite teams.
  assert.deepEqual(slots, [0, 2, 1, 3]);
  assert.deepEqual(
    slots.map((slot) => teamForSlot(slot, 4)),
    [TEAM.cops, TEAM.robbers, TEAM.cops, TEAM.robbers]
  );
});

test("fixed match session assigns stable server session ids into bounded slots", () => {
  assert.equal(typeof server.createFixedMatchSession, "function");

  const match = server.createFixedMatchSession({
    matchId: 7,
    capacity: 2,
    firstSessionId: 40
  });

  const first = match.assign("transport-a");
  const second = match.assign("transport-b");
  const full = match.assign("transport-c");

  assert.deepEqual(first, {
    ok: true,
    matchId: 7,
    sessionId: 40,
    slotIndex: 0,
    capacity: 2,
    connectedSlots: 1
  });
  assert.deepEqual(second, {
    ok: true,
    matchId: 7,
    sessionId: 41,
    slotIndex: 1,
    capacity: 2,
    connectedSlots: 2
  });
  assert.deepEqual(full, {
    ok: false,
    reason: "Match is full.",
    matchId: 7,
    capacity: 2,
    connectedSlots: 2
  });
});

test("fixed match session marks disconnected slots and reuses capacity with a new session id", () => {
  assert.equal(typeof server.createFixedMatchSession, "function");

  const match = server.createFixedMatchSession({
    matchId: 3,
    capacity: 2,
    firstSessionId: 10
  });

  match.assign("transport-a");
  match.assign("transport-b");
  const disconnected = match.disconnect("transport-a");
  const replacement = match.assign("transport-c");

  assert.deepEqual(disconnected, {
    matchId: 3,
    sessionId: 10,
    slotIndex: 0,
    capacity: 2,
    connectedSlots: 1
  });
  assert.deepEqual(replacement, {
    ok: true,
    matchId: 3,
    sessionId: 12,
    slotIndex: 0,
    capacity: 2,
    connectedSlots: 2
  });
});
