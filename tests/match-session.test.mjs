import assert from "node:assert/strict";
import test from "node:test";

import * as server from "../apps/server/dist/index.js";

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
