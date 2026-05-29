import assert from "node:assert/strict";
import test from "node:test";

import {
  MATCH_REGISTRY_DEFAULT_TTL_MS,
  createMatchRegistryState,
  deriveMatchId,
  expireStaleMatches,
  heartbeatMatch,
  listPublicMatches,
  registerMatch,
  removeMatch,
  validateMatchAnnouncement
} from "../packages/shared/dist/index.js";

function announcement(overrides = {}) {
  return {
    name: "Conal's Drydock",
    joinUrl: "ws://192.168.1.69:8787",
    mapId: "arena-drydock-span",
    buildId: "0.1.0",
    playerCount: 2,
    capacity: 8,
    ...overrides
  };
}

test("validateMatchAnnouncement accepts a well-formed announcement and normalizes text", () => {
  const result = validateMatchAnnouncement(announcement({ name: "  Conal's   Drydock  " }));
  assert.equal(result.ok, true);
  assert.equal(result.announcement.name, "Conal's Drydock");
  assert.equal(result.announcement.mapId, "arena-drydock-span");
  assert.equal(result.announcement.capacity, 8);
  assert.equal(result.announcement.playerCount, 2);
  // The join URL is parsed and normalized so every consumer sees one canonical form.
  assert.equal(result.announcement.joinUrl, "ws://192.168.1.69:8787/");
});

test("validateMatchAnnouncement rejects hostile or malformed fields", () => {
  assert.equal(validateMatchAnnouncement(null).ok, false);
  assert.equal(validateMatchAnnouncement(announcement({ name: "" })).ok, false);
  assert.equal(validateMatchAnnouncement(announcement({ name: "x".repeat(41) })).ok, false);
  // A non-WebSocket join URL can never reach the client as a listing.
  assert.equal(validateMatchAnnouncement(announcement({ joinUrl: "http://192.168.1.69:8787" })).ok, false);
  assert.equal(validateMatchAnnouncement(announcement({ joinUrl: "javascript:alert(1)" })).ok, false);
  assert.equal(validateMatchAnnouncement(announcement({ joinUrl: "not a url" })).ok, false);
  assert.equal(validateMatchAnnouncement(announcement({ mapId: "Has Spaces" })).ok, false);
  assert.equal(validateMatchAnnouncement(announcement({ capacity: 0 })).ok, false);
  assert.equal(validateMatchAnnouncement(announcement({ capacity: 999 })).ok, false);
  // playerCount may not exceed the declared capacity.
  assert.equal(validateMatchAnnouncement(announcement({ playerCount: 9, capacity: 8 })).ok, false);
  assert.equal(validateMatchAnnouncement(announcement({ playerCount: -1 })).ok, false);
  assert.equal(validateMatchAnnouncement(announcement({ buildId: "" })).ok, false);
});

test("registerMatch adds a new entry and re-registering the same join URL upserts in place", () => {
  let state = createMatchRegistryState();

  const first = registerMatch(state, { announcement: announcement(), nowMs: 1000 });
  assert.equal(first.accepted, true);
  assert.equal(first.entry.id, deriveMatchId("ws://192.168.1.69:8787"));
  assert.equal(first.entry.registeredAtMs, 1000);
  assert.equal(first.entry.lastHeartbeatMs, 1000);
  state = first.state;
  assert.equal(state.entries.length, 1);

  // Same join URL with an updated player count upserts; the original registration
  // time is preserved while the heartbeat advances.
  const second = registerMatch(state, {
    announcement: announcement({ playerCount: 5 }),
    nowMs: 4000
  });
  assert.equal(second.accepted, true);
  assert.equal(second.state.entries.length, 1);
  assert.equal(second.entry.playerCount, 5);
  assert.equal(second.entry.registeredAtMs, 1000);
  assert.equal(second.entry.lastHeartbeatMs, 4000);
});

test("registerMatch rejects new entries once the registry is full but still upserts known ones", () => {
  let state = createMatchRegistryState();
  state = registerMatch(state, {
    announcement: announcement({ joinUrl: "ws://10.0.0.1:8787" }),
    nowMs: 0,
    maxEntries: 1
  }).state;

  const overflow = registerMatch(state, {
    announcement: announcement({ joinUrl: "ws://10.0.0.2:8787" }),
    nowMs: 0,
    maxEntries: 1
  });
  assert.equal(overflow.accepted, false);
  assert.equal(overflow.entry, undefined);
  assert.equal(overflow.state.entries.length, 1);

  // A known entry still updates even when the registry is at capacity.
  const upsert = registerMatch(state, {
    announcement: announcement({ joinUrl: "ws://10.0.0.1:8787", playerCount: 4 }),
    nowMs: 10,
    maxEntries: 1
  });
  assert.equal(upsert.accepted, true);
  assert.equal(upsert.state.entries.length, 1);
  assert.equal(upsert.state.entries[0].playerCount, 4);
});

test("heartbeatMatch refreshes liveness and player count for a known id only", () => {
  const registered = registerMatch(createMatchRegistryState(), {
    announcement: announcement(),
    nowMs: 1000
  });
  const id = registered.entry.id;

  const beat = heartbeatMatch(registered.state, { id, nowMs: 9000, playerCount: 6 });
  assert.equal(beat.ok, true);
  assert.equal(beat.state.entries[0].lastHeartbeatMs, 9000);
  assert.equal(beat.state.entries[0].playerCount, 6);

  // An out-of-range player count is ignored without poisoning the entry.
  const clamped = heartbeatMatch(beat.state, { id, nowMs: 9500, playerCount: 999 });
  assert.equal(clamped.ok, true);
  assert.equal(clamped.state.entries[0].playerCount, 6);

  const unknown = heartbeatMatch(beat.state, { id: "ws://nope", nowMs: 9999 });
  assert.equal(unknown.ok, false);
});

test("expireStaleMatches and listPublicMatches drop entries past the heartbeat TTL", () => {
  let state = createMatchRegistryState();
  state = registerMatch(state, { announcement: announcement({ joinUrl: "ws://10.0.0.1:8787" }), nowMs: 0 }).state;
  state = registerMatch(state, { announcement: announcement({ joinUrl: "ws://10.0.0.2:8787" }), nowMs: 0 }).state;

  // Keep only the second alive past the default TTL.
  state = heartbeatMatch(state, { id: deriveMatchId("ws://10.0.0.2:8787"), nowMs: MATCH_REGISTRY_DEFAULT_TTL_MS }).state;

  const listed = listPublicMatches(state, { nowMs: MATCH_REGISTRY_DEFAULT_TTL_MS + 1 });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].joinUrl, "ws://10.0.0.2:8787");

  const expired = expireStaleMatches(state, { nowMs: MATCH_REGISTRY_DEFAULT_TTL_MS + 1 });
  assert.equal(expired.entries.length, 1);
  assert.equal(expired.entries[0].joinUrl, "ws://10.0.0.2:8787");
});

test("listPublicMatches orders fuller matches first and can filter by build id", () => {
  let state = createMatchRegistryState();
  state = registerMatch(state, {
    announcement: announcement({ name: "Quiet Lobby", joinUrl: "ws://10.0.0.1:8787", playerCount: 1, buildId: "0.1.0" }),
    nowMs: 1000
  }).state;
  state = registerMatch(state, {
    announcement: announcement({ name: "Busy Match", joinUrl: "ws://10.0.0.2:8787", playerCount: 6, buildId: "0.1.0" }),
    nowMs: 1000
  }).state;
  state = registerMatch(state, {
    announcement: announcement({ name: "Other Build", joinUrl: "ws://10.0.0.3:8787", playerCount: 8, buildId: "9.9.9" }),
    nowMs: 1000
  }).state;

  const all = listPublicMatches(state, { nowMs: 1000 });
  assert.deepEqual(
    all.map((entry) => entry.name),
    ["Other Build", "Busy Match", "Quiet Lobby"]
  );
  all.forEach((entry) => assert.equal(entry.ageMs, 0));

  // A build filter hides matches a client of that build could not join.
  const mine = listPublicMatches(state, { nowMs: 1000, buildId: "0.1.0" });
  assert.deepEqual(
    mine.map((entry) => entry.name),
    ["Busy Match", "Quiet Lobby"]
  );
});

test("removeMatch drops an entry on graceful unregister without touching others", () => {
  let state = createMatchRegistryState();
  state = registerMatch(state, { announcement: announcement({ joinUrl: "ws://10.0.0.1:8787" }), nowMs: 0 }).state;
  state = registerMatch(state, { announcement: announcement({ joinUrl: "ws://10.0.0.2:8787" }), nowMs: 0 }).state;

  const removed = removeMatch(state, deriveMatchId("ws://10.0.0.1:8787"));
  assert.equal(removed.entries.length, 1);
  assert.equal(removed.entries[0].joinUrl, "ws://10.0.0.2:8787");
});
