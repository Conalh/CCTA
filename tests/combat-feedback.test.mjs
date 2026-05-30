import assert from "node:assert/strict";
import test from "node:test";

import {
  damageIndicatorAngleRadians,
  diffMatchStatsKills,
  formatKillFeedLine
} from "../apps/client/dist/playtest/combat-feedback.js";

const stat = (sessionId, kills, deaths) => ({ sessionId, kills, deaths });

test("diffMatchStatsKills pairs the killer and victim from a tally delta", () => {
  const previous = [stat(1, 0, 0), stat(2, 0, 0)];
  const next = [stat(1, 1, 0), stat(2, 0, 1)];
  assert.deepEqual(diffMatchStatsKills(previous, next), [{ killerSessionId: 1, victimSessionId: 2 }]);
});

test("diffMatchStatsKills leaves an uncredited death without a killer", () => {
  const previous = [stat(1, 0, 0)];
  const next = [stat(1, 0, 1)];
  assert.deepEqual(diffMatchStatsKills(previous, next), [{ killerSessionId: undefined, victimSessionId: 1 }]);
});

test("diffMatchStatsKills reports nothing when the tallies are unchanged", () => {
  const stats = [stat(1, 2, 1), stat(2, 1, 2)];
  assert.deepEqual(diffMatchStatsKills(stats, stats), []);
});

test("formatKillFeedLine names the killer and victim, or just the victim", () => {
  const callsigns = { 1: "Vireo", 2: "Marlow" };
  const resolve = (sessionId) => callsigns[sessionId] ?? `Player ${sessionId}`;
  assert.equal(formatKillFeedLine({ killerSessionId: 1, victimSessionId: 2 }, resolve), "Vireo eliminated Marlow");
  assert.equal(formatKillFeedLine({ killerSessionId: undefined, victimSessionId: 2 }, resolve), "Marlow was eliminated");
});

test("damageIndicatorAngleRadians points at the source relative to facing", () => {
  const near = (actual, expected) => assert.equal(Math.abs(actual - expected) < 1e-6, true);
  const base = { localX: 0, localZ: 0, localYaw: 0 };
  // Facing -z (yaw 0): source ahead = 0, behind = pi, right (+x) = +pi/2, left = -pi/2.
  near(damageIndicatorAngleRadians({ ...base, sourceX: 0, sourceZ: -5 }), 0);
  near(Math.abs(damageIndicatorAngleRadians({ ...base, sourceX: 0, sourceZ: 5 })), Math.PI);
  near(damageIndicatorAngleRadians({ ...base, sourceX: 5, sourceZ: 0 }), Math.PI / 2);
  near(damageIndicatorAngleRadians({ ...base, sourceX: -5, sourceZ: 0 }), -Math.PI / 2);
  // Facing -x (yaw pi/2): a source toward -x now reads as straight ahead.
  near(damageIndicatorAngleRadians({ localX: 0, localZ: 0, localYaw: Math.PI / 2, sourceX: -5, sourceZ: 0 }), 0);
});
