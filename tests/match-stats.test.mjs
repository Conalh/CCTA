import assert from "node:assert/strict";
import test from "node:test";

import { createMatchStats } from "../apps/server/dist/index.js";

test("match stats assigns zeroed entries and preserves insertion order", () => {
  const stats = createMatchStats();

  assert.deepEqual(stats.assignSession(10), { sessionId: 10, kills: 0, deaths: 0 });
  assert.deepEqual(stats.assignSession(11), { sessionId: 11, kills: 0, deaths: 0 });
  assert.deepEqual(stats.entries(), [
    { sessionId: 10, kills: 0, deaths: 0 },
    { sessionId: 11, kills: 0, deaths: 0 }
  ]);

  // Re-assigning a known session is idempotent and does not reset tallies.
  stats.recordKill({ killerSessionId: 10, victimSessionId: 11 });
  assert.deepEqual(stats.assignSession(10), { sessionId: 10, kills: 1, deaths: 0 });
});

test("match stats credits the killer and charges the victim a death", () => {
  const stats = createMatchStats();
  stats.assignSession(1);
  stats.assignSession(2);

  stats.recordKill({ killerSessionId: 1, victimSessionId: 2 });

  assert.deepEqual(stats.getEntry(1), { sessionId: 1, kills: 1, deaths: 0 });
  assert.deepEqual(stats.getEntry(2), { sessionId: 2, kills: 0, deaths: 1 });
});

test("match stats charges a death without crediting a self or unknown killer", () => {
  const stats = createMatchStats();
  stats.assignSession(1);
  stats.assignSession(2);

  // Self-inflicted death: victim takes the death, no kill is credited.
  stats.recordKill({ killerSessionId: 2, victimSessionId: 2 });
  assert.deepEqual(stats.getEntry(2), { sessionId: 2, kills: 0, deaths: 1 });

  // Unknown / untracked killer (e.g. already disconnected): only the victim death lands.
  stats.recordKill({ killerSessionId: 999, victimSessionId: 1 });
  assert.deepEqual(stats.getEntry(1), { sessionId: 1, kills: 0, deaths: 1 });

  // A kill naming the unknown killer never resurrects a tally for it.
  assert.equal(stats.getEntry(999), undefined);
});

test("match stats ignores kills for untracked victims", () => {
  const stats = createMatchStats();
  stats.assignSession(1);

  stats.recordKill({ killerSessionId: 1, victimSessionId: 2 });

  assert.deepEqual(stats.getEntry(1), { sessionId: 1, kills: 0, deaths: 0 });
  assert.deepEqual(stats.entries(), [{ sessionId: 1, kills: 0, deaths: 0 }]);
});

test("match stats removes disconnected sessions", () => {
  const stats = createMatchStats();
  stats.assignSession(1);
  stats.assignSession(2);
  stats.recordKill({ killerSessionId: 1, victimSessionId: 2 });

  assert.deepEqual(stats.removeSession(2), { sessionId: 2, kills: 0, deaths: 1 });
  assert.equal(stats.getEntry(2), undefined);
  assert.equal(stats.removeSession(2), undefined);
  assert.deepEqual(stats.entries(), [{ sessionId: 1, kills: 1, deaths: 0 }]);
});

test("match stats state message reports a consistent entry count", () => {
  const stats = createMatchStats();
  stats.assignSession(1);
  stats.assignSession(2);
  stats.recordKill({ killerSessionId: 1, victimSessionId: 2 });

  const message = stats.createStateMessage(42);
  assert.equal(message.kind, "server.match.stats");
  assert.equal(message.serverTick, 42);
  assert.equal(message.entryCount, message.entries.length);
  assert.deepEqual(message.entries, [
    { sessionId: 1, kills: 1, deaths: 0 },
    { sessionId: 2, kills: 0, deaths: 1 }
  ]);
});
