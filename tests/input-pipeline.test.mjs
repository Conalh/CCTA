import assert from "node:assert/strict";
import test from "node:test";

import * as server from "../apps/server/dist/index.js";

function input(sequence, overrides = {}) {
  return {
    kind: "client.input",
    sequence,
    clientTimeMs: 1000 + sequence,
    buttons: 0,
    yaw: 0,
    pitch: 0,
    ...overrides
  };
}

test("input pipeline accepts strictly increasing sequences and drops stale duplicates", () => {
  assert.equal(typeof server.createInputPipeline, "function");

  const pipeline = server.createInputPipeline({
    sessionId: 9
  });

  assert.deepEqual(pipeline.record(input(1)), {
    accepted: true,
    sessionId: 9,
    lastAcceptedInputSequence: 1,
    droppedInputCount: 0
  });
  assert.deepEqual(pipeline.record(input(1)), {
    accepted: false,
    reason: "stale-sequence",
    sessionId: 9,
    lastAcceptedInputSequence: 1,
    droppedInputCount: 1
  });
  assert.deepEqual(pipeline.record(input(0)), {
    accepted: false,
    reason: "stale-sequence",
    sessionId: 9,
    lastAcceptedInputSequence: 1,
    droppedInputCount: 2
  });
  assert.deepEqual(pipeline.record(input(3)), {
    accepted: true,
    sessionId: 9,
    lastAcceptedInputSequence: 3,
    droppedInputCount: 2
  });
  assert.deepEqual(pipeline.acceptedSequences(), [1, 3]);
});

test("input pipeline keeps only a recent window of accepted sequences", () => {
  const pipeline = server.createInputPipeline({
    sessionId: 11,
    maxTrackedSequences: 3
  });

  for (let sequence = 1; sequence <= 6; sequence += 1) {
    assert.equal(pipeline.record(input(sequence)).accepted, true);
  }

  // The diagnostic buffer is bounded; the accepted-sequence floor still advances fully.
  assert.deepEqual(pipeline.acceptedSequences(), [4, 5, 6]);
  assert.equal(pipeline.snapshot().lastAcceptedInputSequence, 6);
  assert.equal(pipeline.snapshot().droppedInputCount, 0);
});

test("input pipeline drops impossible numeric values without advancing sequence", () => {
  assert.equal(typeof server.createInputPipeline, "function");

  const pipeline = server.createInputPipeline({
    sessionId: 10
  });

  assert.deepEqual(pipeline.record(input(1, { yaw: Number.NaN })), {
    accepted: false,
    reason: "invalid-values",
    sessionId: 10,
    lastAcceptedInputSequence: 0,
    droppedInputCount: 1
  });
  assert.deepEqual(pipeline.record(input(2, { pitch: Number.POSITIVE_INFINITY })), {
    accepted: false,
    reason: "invalid-values",
    sessionId: 10,
    lastAcceptedInputSequence: 0,
    droppedInputCount: 2
  });
  assert.deepEqual(pipeline.record(input(2)), {
    accepted: true,
    sessionId: 10,
    lastAcceptedInputSequence: 2,
    droppedInputCount: 2
  });
});
