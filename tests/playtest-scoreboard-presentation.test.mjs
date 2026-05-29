import assert from "node:assert/strict";
import test from "node:test";

import { createScoreboardPresentation } from "../apps/client/dist/playtest/scoreboard-presentation.js";

// No copied shooter framing and no client-computed score/standings numbers.
const forbiddenLabelPattern = /\bscore\b|team|economy|buy|cash|money|weapon|ammo|reload|objective|\brank\b|winner|mvp/i;

function labelText(presentation) {
  return [presentation.summaryLabel, ...presentation.rows.map((row) => row.label)].join(" ");
}

test("scoreboard presentation orders rows by kills then deaths then session", () => {
  const presentation = createScoreboardPresentation({
    entries: [
      { sessionId: 1, kills: 1, deaths: 2 },
      { sessionId: 2, kills: 3, deaths: 1 },
      { sessionId: 3, kills: 3, deaths: 0 }
    ],
    lastServerTick: 42,
    localSessionId: 1
  });

  assert.equal(presentation.entryCount, 3);
  assert.equal(presentation.lastServerTick, 42);
  assert.deepEqual(
    presentation.rows.map((row) => row.sessionId),
    [3, 2, 1]
  );
  assert.deepEqual(
    presentation.rows.map((row) => row.position),
    [1, 2, 3]
  );
  // Values mirror the broadcast untouched.
  assert.deepEqual(
    presentation.rows.map((row) => `${row.kills}/${row.deaths}`),
    ["3/0", "3/1", "1/2"]
  );
  assert.equal(forbiddenLabelPattern.test(labelText(presentation)), false);
});

test("scoreboard presentation highlights the local session", () => {
  const presentation = createScoreboardPresentation({
    entries: [
      { sessionId: 7, kills: 0, deaths: 0 },
      { sessionId: 9, kills: 2, deaths: 1 }
    ],
    lastServerTick: 10,
    localSessionId: 7
  });

  const localRow = presentation.rows.find((row) => row.sessionId === 7);
  assert.equal(localRow?.isLocalSession, true);
  assert.equal(localRow?.label, "session 7 (you)");
  assert.equal(presentation.localPosition, 2);
  assert.equal(presentation.summaryLabel, "session 7: 0 kills / 0 deaths");
  assert.equal(presentation.rows.find((row) => row.sessionId === 9)?.isLocalSession, false);
});

test("scoreboard presentation reports an empty board without a local session", () => {
  const presentation = createScoreboardPresentation({ entries: [], lastServerTick: undefined });

  assert.equal(presentation.entryCount, 0);
  assert.deepEqual(presentation.rows, []);
  assert.equal(presentation.localPosition, undefined);
  assert.equal(presentation.localSessionId, undefined);
  assert.equal(presentation.lastServerTick, undefined);
  assert.equal(presentation.summaryLabel, "no stats yet");
});

test("scoreboard presentation summarizes sessions when the local session is absent", () => {
  const presentation = createScoreboardPresentation({
    entries: [
      { sessionId: 4, kills: 1, deaths: 0 },
      { sessionId: 5, kills: 0, deaths: 1 }
    ],
    localSessionId: 99
  });

  assert.equal(presentation.localPosition, undefined);
  assert.equal(presentation.summaryLabel, "2 sessions");
});

test("scoreboard presentation drops malformed entries without poisoning the board", () => {
  const presentation = createScoreboardPresentation({
    entries: [
      { sessionId: 0, kills: 5, deaths: 5 },
      { sessionId: 2, kills: -1, deaths: 0 },
      { sessionId: 3, kills: 1, deaths: Number.NaN },
      { sessionId: 4.5, kills: 2, deaths: 2 },
      { sessionId: 6, kills: 4, deaths: 1 }
    ],
    lastServerTick: -3,
    localSessionId: Number.NaN
  });

  assert.deepEqual(
    presentation.rows.map((row) => row.sessionId),
    [6]
  );
  assert.equal(presentation.lastServerTick, undefined);
  assert.equal(presentation.localSessionId, undefined);
});

test("scoreboard presentation tolerates undefined entries", () => {
  const presentation = createScoreboardPresentation({ entries: undefined });

  assert.equal(presentation.entryCount, 0);
  assert.equal(presentation.summaryLabel, "no stats yet");
});

test("scoreboard presentation labels rows with roster-resolved callsigns", () => {
  const presentation = createScoreboardPresentation({
    entries: [
      { sessionId: 1, kills: 2, deaths: 1 },
      { sessionId: 2, kills: 1, deaths: 3 }
    ],
    lastServerTick: 50,
    localSessionId: 1,
    rosterEntries: [
      { sessionId: 1, handleId: 1, weaponProfileId: 2, slotIndex: 0 },
      { sessionId: 2, handleId: 2, weaponProfileId: 2, slotIndex: 1 }
    ]
  });

  const localRow = presentation.rows.find((row) => row.sessionId === 1);
  const peerRow = presentation.rows.find((row) => row.sessionId === 2);
  // Kills/deaths are untouched; only the label is joined from the server roster.
  assert.equal(localRow?.callsign, "Vesper");
  assert.equal(localRow?.label, "Vesper (you)");
  assert.equal(localRow?.kills, 2);
  assert.equal(peerRow?.callsign, "Quill");
  assert.equal(peerRow?.label, "Quill");
  assert.equal(presentation.summaryLabel, "Vesper: 2 kills / 1 deaths");
  assert.equal(forbiddenLabelPattern.test(labelText(presentation)), false);
});

test("scoreboard presentation falls back to a neutral label without a roster entry", () => {
  const presentation = createScoreboardPresentation({
    entries: [
      { sessionId: 1, kills: 1, deaths: 0 },
      { sessionId: 2, kills: 0, deaths: 1 }
    ],
    localSessionId: 1,
    rosterEntries: [{ sessionId: 1, handleId: 1, weaponProfileId: 2, slotIndex: 0 }]
  });

  assert.equal(presentation.rows.find((row) => row.sessionId === 1)?.label, "Vesper (you)");
  const peerRow = presentation.rows.find((row) => row.sessionId === 2);
  assert.equal(peerRow?.callsign, undefined);
  assert.equal(peerRow?.label, "session 2");
});

test("scoreboard presentation drops malformed roster entries when resolving callsigns", () => {
  const presentation = createScoreboardPresentation({
    entries: [
      { sessionId: 6, kills: 3, deaths: 2 },
      { sessionId: 7, kills: 1, deaths: 1 }
    ],
    localSessionId: 6,
    rosterEntries: [
      { sessionId: 0, handleId: 1, weaponProfileId: 2, slotIndex: 0 },
      { sessionId: 7, handleId: 99, weaponProfileId: 2, slotIndex: 1 },
      { sessionId: 6, handleId: 4, weaponProfileId: 2, slotIndex: 2 }
    ]
  });

  // sessionId 0 is non-positive and handle 99 is outside the pool, so neither
  // resolves; only session 6 -> handle 4 (Marlow) labels and session 7 stays neutral.
  assert.equal(presentation.rows.find((row) => row.sessionId === 6)?.label, "Marlow (you)");
  assert.equal(presentation.rows.find((row) => row.sessionId === 7)?.callsign, undefined);
  assert.equal(presentation.rows.find((row) => row.sessionId === 7)?.label, "session 7");
});
