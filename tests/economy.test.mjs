import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_KILL_REWARD,
  DEFAULT_ROUND_LOSS_BONUS,
  DEFAULT_ROUND_WIN_BONUS,
  DEFAULT_STARTING_MONEY,
  createEconomyState
} from "../apps/server/dist/index.js";

test("economy assigns starting money and is idempotent per session", () => {
  const economy = createEconomyState();
  economy.assignSession(1);
  assert.equal(economy.getMoney(1), DEFAULT_STARTING_MONEY);

  // A second assign does not reset existing money.
  economy.awardKill(1);
  economy.assignSession(1);
  assert.equal(economy.getMoney(1), DEFAULT_STARTING_MONEY + DEFAULT_KILL_REWARD);

  assert.equal(economy.getMoney(2), undefined);
});

test("economy credits kills only for known sessions and clamps to the cap", () => {
  const economy = createEconomyState({ startingMoney: 100, killReward: 50, maxMoney: 180 });
  economy.assignSession(1);

  assert.equal(economy.awardKill(1), true);
  assert.equal(economy.getMoney(1), 150);
  // Clamped at the cap, never above.
  assert.equal(economy.awardKill(1), true);
  assert.equal(economy.getMoney(1), 180);

  assert.equal(economy.awardKill(9), false);
});

test("economy awards round win and loss bonuses to the right sides", () => {
  const economy = createEconomyState();
  for (const id of [1, 2, 3]) {
    economy.assignSession(id);
  }

  const changed = economy.awardRoundResult({ winners: [1], losers: [2, 3] });
  assert.deepEqual([...changed].sort((a, b) => a - b), [1, 2, 3]);
  assert.equal(economy.getMoney(1), DEFAULT_STARTING_MONEY + DEFAULT_ROUND_WIN_BONUS);
  assert.equal(economy.getMoney(2), DEFAULT_STARTING_MONEY + DEFAULT_ROUND_LOSS_BONUS);
  assert.equal(economy.getMoney(3), DEFAULT_STARTING_MONEY + DEFAULT_ROUND_LOSS_BONUS);
});

test("economy spends only what a session can afford", () => {
  const economy = createEconomyState({ startingMoney: 800 });
  economy.assignSession(1);

  assert.equal(economy.spend(1, 1000), false);
  assert.equal(economy.getMoney(1), 800);
  assert.equal(economy.spend(1, 300), true);
  assert.equal(economy.getMoney(1), 500);
  assert.equal(economy.spend(1, -50), false);
  assert.equal(economy.spend(9, 10), false);
});

test("economy resets every session to starting money and removes sessions", () => {
  const economy = createEconomyState({ startingMoney: 800 });
  economy.assignSession(1);
  economy.assignSession(2);
  economy.awardKill(1);

  const reset = economy.resetAll();
  assert.deepEqual([...reset].sort((a, b) => a - b), [1, 2]);
  assert.equal(economy.getMoney(1), 800);

  economy.removeSession(1);
  assert.equal(economy.getMoney(1), undefined);
  assert.equal(economy.entries().length, 1);
});

test("economy builds a per-session state message only for known sessions", () => {
  const economy = createEconomyState({ startingMoney: 800 });
  economy.assignSession(5);

  assert.deepEqual(economy.createStateMessage(5, 42), {
    kind: "server.player.economy",
    serverTick: 42,
    sessionId: 5,
    money: 800
  });
  assert.equal(economy.createStateMessage(9, 42), undefined);
});
