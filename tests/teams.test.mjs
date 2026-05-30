import assert from "node:assert/strict";
import test from "node:test";

import { TEAM, isKnownTeam, listTeams, teamForSlot, teamName } from "../packages/shared/dist/index.js";

test("teams expose the two original factions", () => {
  assert.deepEqual(listTeams(), [TEAM.cops, TEAM.robbers]);
  assert.equal(teamName(TEAM.cops), "Cops");
  assert.equal(teamName(TEAM.robbers), "Robbers");
});

test("teamForSlot splits the slots into the two spawn-cluster sides", () => {
  // Default 8-slot match: lower half (north cluster) are Cops, upper half Robbers.
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 7].map((slot) => teamForSlot(slot)),
    [TEAM.cops, TEAM.cops, TEAM.cops, TEAM.cops, TEAM.robbers, TEAM.robbers, TEAM.robbers, TEAM.robbers]
  );
});

test("teamForSlot honors a custom capacity and tolerates bad input", () => {
  assert.equal(teamForSlot(1, 4), TEAM.cops);
  assert.equal(teamForSlot(2, 4), TEAM.robbers);
  // Invalid slot/capacity falls back to a safe default rather than throwing.
  assert.equal(teamForSlot(-5), TEAM.cops);
  assert.equal(teamForSlot(0, 0), TEAM.cops);
});

test("isKnownTeam accepts the two factions and rejects everything else", () => {
  assert.equal(isKnownTeam(TEAM.cops), true);
  assert.equal(isKnownTeam(TEAM.robbers), true);
  assert.equal(isKnownTeam(0), false);
  assert.equal(isKnownTeam(3), false);
});
