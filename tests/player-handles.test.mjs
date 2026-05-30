import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_PLAYER_NAME_BYTES,
  PLAYER_HANDLE_CAPACITY,
  PLAYER_HANDLE_POOL,
  getPlayerCallsign,
  getPlayerHandle,
  isKnownPlayerHandleId,
  listPlayerHandleIds,
  sanitizePlayerName
} from "../packages/shared/dist/index.js";

test("player handle pool exposes eight original callsigns keyed by sequential id", () => {
  assert.equal(PLAYER_HANDLE_CAPACITY, 8);
  assert.equal(PLAYER_HANDLE_POOL.length, 8);
  assert.deepEqual(
    PLAYER_HANDLE_POOL.map((handle) => handle.handleId),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
  assert.deepEqual(
    PLAYER_HANDLE_POOL.map((handle) => handle.callsign),
    ["Vesper", "Quill", "Tundra", "Marlow", "Ember", "Cairn", "Drift", "Sable"]
  );
});

test("player handle callsigns are non-empty strings", () => {
  for (const handle of PLAYER_HANDLE_POOL) {
    assert.equal(typeof handle.callsign, "string");
    assert.ok(handle.callsign.trim().length > 0);
  }
});

test("handle lookup resolves known ids and rejects unknown ids", () => {
  assert.equal(getPlayerHandle(1)?.callsign, "Vesper");
  assert.equal(getPlayerHandle(8)?.callsign, "Sable");
  assert.equal(getPlayerHandle(0), undefined);
  assert.equal(getPlayerHandle(99), undefined);

  assert.equal(getPlayerCallsign(1), "Vesper");
  assert.equal(getPlayerCallsign(0), undefined);
  assert.equal(getPlayerCallsign(99), undefined);
});

test("isKnownPlayerHandleId accepts the pool and rejects out-of-range ids", () => {
  assert.equal(isKnownPlayerHandleId(1), true);
  assert.equal(isKnownPlayerHandleId(8), true);
  assert.equal(isKnownPlayerHandleId(0), false);
  assert.equal(isKnownPlayerHandleId(9), false);
  assert.equal(isKnownPlayerHandleId(99), false);
});

test("listPlayerHandleIds enumerates the full pool in order", () => {
  assert.deepEqual(listPlayerHandleIds(), [1, 2, 3, 4, 5, 6, 7, 8]);
});

const TAB = String.fromCharCode(9);
const NEWLINE = String.fromCharCode(10);
const DEL = String.fromCharCode(127);

test("sanitizePlayerName trims, collapses whitespace, and drops control characters", () => {
  assert.equal(sanitizePlayerName("  Night  Owl  "), "Night Owl");
  assert.equal(sanitizePlayerName("Tab" + TAB + "Here"), "Tab Here");
  assert.equal(sanitizePlayerName("line" + NEWLINE + "break"), "line break");
  assert.equal(sanitizePlayerName("a" + DEL + "b"), "a b");
});

test("sanitizePlayerName returns empty for non-strings and blank input", () => {
  assert.equal(sanitizePlayerName(undefined), "");
  assert.equal(sanitizePlayerName(42), "");
  assert.equal(sanitizePlayerName("   "), "");
  assert.equal(sanitizePlayerName(""), "");
});

test("sanitizePlayerName caps to the wire budget on a UTF-8 boundary", () => {
  const long = sanitizePlayerName("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  assert.equal(long, "ABCDEFGHIJKLMNOP");
  assert.equal(long.length, MAX_PLAYER_NAME_BYTES);

  // A multi-byte name is never split mid-code-point: every kept character survives intact.
  const emoji = sanitizePlayerName("🎯🎯🎯🎯🎯");
  assert.ok(new TextEncoder().encode(emoji).length <= MAX_PLAYER_NAME_BYTES);
  assert.equal([...emoji].length, 4);
});
