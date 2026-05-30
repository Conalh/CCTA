import assert from "node:assert/strict";
import test from "node:test";

import { formatPlaytestSide } from "../apps/client/dist/playtest/playtest-state.js";

test("formatPlaytestSide labels the local side from the server-owned slot", () => {
  assert.deepEqual(formatPlaytestSide(0, 8), { label: "Cops", tag: "cops" });
  assert.deepEqual(formatPlaytestSide(3, 8), { label: "Cops", tag: "cops" });
  assert.deepEqual(formatPlaytestSide(4, 8), { label: "Robbers", tag: "robbers" });
  assert.deepEqual(formatPlaytestSide(7, 8), { label: "Robbers", tag: "robbers" });
});

test("formatPlaytestSide reports no side until a slot is assigned", () => {
  assert.deepEqual(formatPlaytestSide(undefined, 8), { label: "-", tag: "none" });
  assert.deepEqual(formatPlaytestSide(-1, 8), { label: "-", tag: "none" });
});
