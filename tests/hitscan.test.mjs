import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRE_REJECT_REASON,
  createClientFireIntent
} from "../packages/shared/dist/index.js";
import {
  castHitscanRay,
  validateServerFireIntent
} from "../apps/server/dist/index.js";

const baseWorldSnapshot = {
  worldId: 1,
  tick: 12,
  entityCount: 3,
  entities: [
    {
      entityId: 1,
      sessionId: 1,
      slotIndex: 0,
      active: true,
      x: 0,
      y: 0,
      z: 0,
      yaw: 0
    },
    {
      entityId: 2,
      sessionId: 2,
      slotIndex: 1,
      active: true,
      x: 3,
      y: 0,
      z: 0,
      yaw: 0
    },
    {
      entityId: 3,
      sessionId: 3,
      slotIndex: 2,
      active: false,
      x: 1,
      y: 0,
      z: 0,
      yaw: 0
    }
  ]
};

test("hitscan ray uses server-owned source pose and hits the nearest non-local active entity", () => {
  const hit = castHitscanRay({
    sourceSessionId: 1,
    yaw: -Math.PI / 2,
    pitch: 0,
    worldSnapshot: baseWorldSnapshot
  });

  assert.deepEqual(hit, {
    hit: true,
    targetEntityId: 2,
    targetSessionId: 2,
    distance: 3
  });
});

test("hitscan ray ignores local, inactive, and behind-ray entity data", () => {
  const miss = castHitscanRay({
    sourceSessionId: 1,
    yaw: 0,
    pitch: 0,
    worldSnapshot: baseWorldSnapshot
  });

  assert.deepEqual(miss, {
    hit: false,
    targetEntityId: 0,
    targetSessionId: 0,
    distance: 0
  });
});

test("hitscan lets a crouched target duck a level shot the standing target would take", () => {
  function targetStance(crouched) {
    return {
      ...baseWorldSnapshot,
      entities: [
        baseWorldSnapshot.entities[0],
        { ...baseWorldSnapshot.entities[1], crouched },
        baseWorldSnapshot.entities[2]
      ]
    };
  }

  // A level shot from the standing shooter connects with the standing target.
  const standingHit = castHitscanRay({
    sourceSessionId: 1,
    yaw: -Math.PI / 2,
    pitch: 0,
    worldSnapshot: targetStance(false)
  });
  assert.equal(standingHit.hit, true);
  assert.equal(standingHit.targetEntityId, 2);

  // The same level shot sails over a crouched target whose eye point dropped below the ray.
  const crouchedMiss = castHitscanRay({
    sourceSessionId: 1,
    yaw: -Math.PI / 2,
    pitch: 0,
    worldSnapshot: targetStance(true)
  });
  assert.equal(crouchedMiss.hit, false);
  assert.equal(crouchedMiss.targetEntityId, 0);
});

test("server fire validation rejects stale or invalid fire intent without advancing authority state", () => {
  const stale = validateServerFireIntent({
    fireIntent: createClientFireIntent({
      sequence: 4,
      clientTimeMs: 100,
      clientTick: 9,
      yaw: 0,
      pitch: 0
    }),
    lastAcceptedFireSequence: 4,
    serverTick: 12,
    sessionId: 1,
    worldSnapshot: baseWorldSnapshot
  });
  assert.equal(stale.nextLastAcceptedFireSequence, 4);
  assert.deepEqual(stale.result, {
    kind: "server.fire.result",
    sequence: 4,
    sessionId: 1,
    serverTick: 12,
    accepted: false,
    hit: false,
    targetEntityId: 0,
    targetSessionId: 0,
    distance: 0,
    rejectReason: FIRE_REJECT_REASON.staleSequence
  });

  const invalidAim = validateServerFireIntent({
    fireIntent: createClientFireIntent({
      sequence: 5,
      clientTimeMs: 110,
      clientTick: 10,
      yaw: 0,
      pitch: Number.POSITIVE_INFINITY
    }),
    lastAcceptedFireSequence: 4,
    serverTick: 12,
    sessionId: 1,
    worldSnapshot: baseWorldSnapshot
  });
  assert.equal(invalidAim.nextLastAcceptedFireSequence, 4);
  assert.equal(invalidAim.result.rejectReason, FIRE_REJECT_REASON.invalidAim);
});

test("server fire validation accepts valid intent but owns hit result computation", () => {
  const validation = validateServerFireIntent({
    fireIntent: createClientFireIntent({
      sequence: 5,
      clientTimeMs: 110,
      clientTick: 10,
      yaw: -Math.PI / 2,
      pitch: 0
    }),
    lastAcceptedFireSequence: 4,
    serverTick: 12,
    sessionId: 1,
    worldSnapshot: baseWorldSnapshot
  });

  assert.equal(validation.nextLastAcceptedFireSequence, 5);
  assert.deepEqual(validation.result, {
    kind: "server.fire.result",
    sequence: 5,
    sessionId: 1,
    serverTick: 12,
    accepted: true,
    hit: true,
    targetEntityId: 2,
    targetSessionId: 2,
    distance: 3,
    rejectReason: FIRE_REJECT_REASON.none
  });
});
