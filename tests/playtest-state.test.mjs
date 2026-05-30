import assert from "node:assert/strict";
import test from "node:test";

import { ROUND_PHASE, SERVER_TICK_RATE_HZ } from "../packages/shared/dist/index.js";
import {
  createPlaytestRoundTimerView,
  formatPlaytestRoundScore,
  formatPlaytestSide,
  parsePlaytestConsoleCommand
} from "../apps/client/dist/playtest/playtest-state.js";

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

test("formatPlaytestRoundScore renders the per-side round-win score", () => {
  assert.equal(formatPlaytestRoundScore(2, 1), "Cops 2 — Robbers 1");
  // Before the first round resolves, both sides read as zero.
  assert.equal(formatPlaytestRoundScore(undefined, undefined), "Cops 0 — Robbers 0");
});

test("round timer counts down the buy phase, then the round clock", () => {
  const buy = createPlaytestRoundTimerView({
    phase: ROUND_PHASE.setup,
    phaseEndsTick: SERVER_TICK_RATE_HZ * 15,
    serverTick: 0,
    tickRateHz: SERVER_TICK_RATE_HZ
  });
  assert.deepEqual(buy, { visible: true, label: "Buy", time: "0:15", tone: "buy" });

  const live = createPlaytestRoundTimerView({
    phase: ROUND_PHASE.active,
    phaseEndsTick: 1000 + SERVER_TICK_RATE_HZ * 90,
    serverTick: 1000,
    tickRateHz: SERVER_TICK_RATE_HZ
  });
  assert.equal(live.tone, "live");
  assert.equal(live.label, "");
  assert.equal(live.time, "1:30");
});

test("round timer hides once the round has ended", () => {
  assert.equal(createPlaytestRoundTimerView({ phase: ROUND_PHASE.ended, phaseEndsTick: 10, serverTick: 5 }).visible, false);
  assert.equal(createPlaytestRoundTimerView({ phase: undefined, phaseEndsTick: undefined, serverTick: undefined }).visible, false);
});

test("client console parser splits local commands from server commands", () => {
  assert.deepEqual(parsePlaytestConsoleCommand("sensitivity 1.5"), { kind: "sensitivity", value: 1.5 });
  assert.deepEqual(parsePlaytestConsoleCommand("sens 2"), { kind: "sensitivity", value: 2 });
  assert.deepEqual(parsePlaytestConsoleCommand("fov 100"), { kind: "fov", value: 100 });
  assert.deepEqual(parsePlaytestConsoleCommand("debug"), { kind: "debug", desired: undefined });
  assert.deepEqual(parsePlaytestConsoleCommand("debug on"), { kind: "debug", desired: true });
  assert.deepEqual(parsePlaytestConsoleCommand("debug off"), { kind: "debug", desired: false });
  assert.deepEqual(parsePlaytestConsoleCommand("clear"), { kind: "clear" });
  assert.equal(parsePlaytestConsoleCommand("sensitivity nope").kind, "error");
  // Server-side commands are not client-handled, so they forward.
  assert.deepEqual(parsePlaytestConsoleCommand("buytime 3"), { kind: "none" });
  assert.deepEqual(parsePlaytestConsoleCommand("help"), { kind: "none" });
});
