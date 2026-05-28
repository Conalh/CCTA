import assert from "node:assert/strict";
import test from "node:test";

import { createFixedTickLoop } from "../apps/server/dist/index.js";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

test("fixed tick loop emits sequential ticks at the configured rate until stopped", async () => {
  const ticks = [];
  const loop = createFixedTickLoop({
    tickRateHz: 100,
    now: () => Date.now()
  });

  loop.start((message) => {
    ticks.push(message.tick);
    if (ticks.length === 3) {
      loop.stop();
    }
  });

  await wait(80);

  assert.deepEqual(ticks, [1, 2, 3]);
  assert.equal(loop.isRunning(), false);
});
