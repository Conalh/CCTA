import assert from "node:assert/strict";
import test from "node:test";

import { LOADOUT_PROFILE_ID } from "../packages/shared/dist/index.js";
import { createRosterPresentation } from "../apps/client/dist/playtest/roster-presentation.js";

// The roster legitimately shows the equipped weapon name, so "weapon" is allowed here,
// but no copied shooter framing or client-invented standings may leak in.
const forbiddenLabelPattern = /\bscore\b|team|economy|buy|cash|money|ammo|reload|objective|\brank\b|winner|mvp/i;

function labelText(presentation) {
  return [
    presentation.summaryLabel,
    ...presentation.rows.map((row) => `${row.label} ${row.weaponLabel}`)
  ].join(" ");
}

test("roster presentation orders rows by slot index then session", () => {
  const presentation = createRosterPresentation({
    entries: [
      { sessionId: 30, handleId: 3, weaponProfileId: LOADOUT_PROFILE_ID.cinder, slotIndex: 2 },
      { sessionId: 10, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
      { sessionId: 20, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.ridgeline, slotIndex: 1 }
    ],
    lastServerTick: 42,
    localSessionId: 10
  });

  assert.equal(presentation.entryCount, 3);
  assert.equal(presentation.lastServerTick, 42);
  assert.deepEqual(
    presentation.rows.map((row) => row.sessionId),
    [10, 20, 30]
  );
  assert.deepEqual(
    presentation.rows.map((row) => row.slotIndex),
    [0, 1, 2]
  );
  // Identity and weapon mirror the broadcast untouched.
  assert.deepEqual(
    presentation.rows.map((row) => row.callsign),
    ["Vesper", "Quill", "Tundra"]
  );
  assert.deepEqual(
    presentation.rows.map((row) => row.weaponLabel),
    ["Halcyon", "Ridgeline", "Cinder"]
  );
  assert.equal(forbiddenLabelPattern.test(labelText(presentation)), false);
});

test("roster presentation prefers the server-authoritative name over the pool callsign", () => {
  const presentation = createRosterPresentation({
    entries: [
      { sessionId: 10, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0, name: "Night Owl" },
      // A blank name falls back to the assigned pool callsign (handle 2 -> Quill).
      { sessionId: 20, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.ridgeline, slotIndex: 1, name: "" }
    ],
    localSessionId: 10
  });

  assert.deepEqual(
    presentation.rows.map((row) => row.callsign),
    ["Night Owl", "Quill"]
  );
  assert.equal(presentation.rows[0]?.label, "Night Owl (you)");
});

test("roster presentation derives each player's side from the spawn slot", () => {
  const presentation = createRosterPresentation({
    entries: [
      { sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
      { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 5 }
    ],
    localSessionId: 1
  });

  const cop = presentation.rows.find((row) => row.slotIndex === 0);
  const robber = presentation.rows.find((row) => row.slotIndex === 5);
  assert.equal(cop?.teamLabel, "Cops");
  assert.equal(robber?.teamLabel, "Robbers");
});

test("roster presentation highlights the local session and labels an unselected weapon", () => {
  const presentation = createRosterPresentation({
    entries: [
      { sessionId: 7, handleId: 4, weaponProfileId: 0, slotIndex: 0 },
      { sessionId: 9, handleId: 5, weaponProfileId: LOADOUT_PROFILE_ID.cinder, slotIndex: 1 }
    ],
    lastServerTick: 10,
    localSessionId: 7
  });

  const localRow = presentation.rows.find((row) => row.sessionId === 7);
  assert.equal(localRow?.isLocalSession, true);
  assert.equal(localRow?.label, "Marlow (you)");
  assert.equal(localRow?.weaponLabel, "pending");
  assert.equal(presentation.localCallsign, "Marlow");
  assert.equal(presentation.summaryLabel, "Marlow: pending");
  assert.equal(presentation.rows.find((row) => row.sessionId === 9)?.isLocalSession, false);
});

test("roster presentation reports an empty panel without a local session", () => {
  const presentation = createRosterPresentation({ entries: [], lastServerTick: undefined });

  assert.equal(presentation.entryCount, 0);
  assert.deepEqual(presentation.rows, []);
  assert.equal(presentation.localCallsign, undefined);
  assert.equal(presentation.localSessionId, undefined);
  assert.equal(presentation.lastServerTick, undefined);
  assert.equal(presentation.summaryLabel, "no roster yet");
});

test("roster presentation summarizes participants when the local session is absent", () => {
  const presentation = createRosterPresentation({
    entries: [
      { sessionId: 4, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
      { sessionId: 5, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.ridgeline, slotIndex: 1 }
    ],
    localSessionId: 99
  });

  assert.equal(presentation.localCallsign, undefined);
  assert.equal(presentation.summaryLabel, "2 participants");
});

test("roster presentation drops malformed entries without poisoning the panel", () => {
  const presentation = createRosterPresentation({
    entries: [
      { sessionId: 0, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
      { sessionId: 2, handleId: 99, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
      { sessionId: 3, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: Number.NaN },
      { sessionId: 4.5, handleId: 3, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 1 },
      { sessionId: 6, handleId: 4, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 2 }
    ],
    lastServerTick: -3,
    localSessionId: Number.NaN
  });

  assert.deepEqual(
    presentation.rows.map((row) => row.sessionId),
    [6]
  );
  assert.equal(presentation.rows[0]?.callsign, "Marlow");
  assert.equal(presentation.lastServerTick, undefined);
  assert.equal(presentation.localSessionId, undefined);
});

test("roster presentation tolerates undefined entries", () => {
  const presentation = createRosterPresentation({ entries: undefined });

  assert.equal(presentation.entryCount, 0);
  assert.equal(presentation.summaryLabel, "no roster yet");
});
