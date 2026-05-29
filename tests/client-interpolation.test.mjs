import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialRemoteInterpolationState,
  recordRemoteInterpolationSnapshot,
  sampleRemoteInterpolation
} from "../apps/client/dist/index.js";

function snapshot(overrides = {}) {
  return {
    kind: "server.snapshot",
    tick: 1,
    serverTimeMs: 1000,
    sessionCount: 2,
    worldId: 1,
    entityCount: 2,
    entities: [
      entity({
        entityId: 10,
        sessionId: 100,
        slotIndex: 0,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0
      }),
      entity({
        entityId: 11,
        sessionId: 101,
        slotIndex: 1,
        x: 10,
        y: 0,
        z: -10,
        yaw: 0.5
      })
    ],
    ...overrides
  };
}

function entity(overrides = {}) {
  return {
    entityId: 1,
    sessionId: 1,
    slotIndex: 0,
    active: true,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    ...overrides
  };
}

test("remote interpolation buffers bounded authoritative snapshots and excludes the local session", () => {
  let state = createInitialRemoteInterpolationState({
    bufferLimit: 2,
    interpolationDelayMs: 50
  });

  for (const [tick, serverTimeMs] of [
    [1, 1000],
    [2, 1100],
    [3, 1200]
  ]) {
    state = recordRemoteInterpolationSnapshot(
      state,
      snapshot({
        tick,
        serverTimeMs,
        entities: [
          entity({
            entityId: 20,
            sessionId: 200,
            slotIndex: 0
          }),
          entity({
            entityId: 21,
            sessionId: 201,
            slotIndex: 1,
            x: tick,
            z: -tick
          })
        ]
      }),
      {
        localSessionId: 200,
        bufferLimit: 2
      }
    );
  }

  assert.deepEqual(
    state.snapshots.map((entry) => entry.tick),
    [2, 3]
  );
  assert.equal(state.snapshots.length, 2);
  assert.equal(state.remoteEntityCount, 1);
  assert.equal(state.snapshots.at(-1).remoteEntities[0].sessionId, 201);
});

test("remote interpolation samples a presentation pose between two authoritative snapshots", () => {
  let state = createInitialRemoteInterpolationState({
    interpolationDelayMs: 50
  });
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 10,
      serverTimeMs: 1000,
      entityCount: 1,
      entities: [
        entity({
          entityId: 30,
          sessionId: 300,
          x: 0,
          y: 2,
          z: 0,
          yaw: 0
        })
      ]
    }),
    {
      localSessionId: 999
    }
  );
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 11,
      serverTimeMs: 1100,
      entityCount: 1,
      entities: [
        entity({
          entityId: 30,
          sessionId: 300,
          x: 10,
          y: 4,
          z: -10,
          yaw: Math.PI / 2
        })
      ]
    }),
    {
      localSessionId: 999
    }
  );

  const sampled = sampleRemoteInterpolation(state, 1100);
  const pose = sampled.representativeRemotePose;

  assert.equal(sampled.interpolatedRemotePoses.length, 1);
  assert.equal(sampled.lastInterpolatedTick, 11);
  assert.equal(sampled.lastInterpolatedTimeMs, 1050);
  assert.equal(pose.entityId, 30);
  assert.equal(pose.x, 5);
  assert.equal(pose.y, 3);
  assert.equal(pose.z, -5);
  assert.equal(pose.yaw, Math.PI / 4);
});

test("remote interpolation follows the shortest yaw path across wrap boundaries", () => {
  let state = createInitialRemoteInterpolationState({
    interpolationDelayMs: 50
  });
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 20,
      serverTimeMs: 1000,
      entityCount: 1,
      entities: [
        entity({
          entityId: 40,
          sessionId: 400,
          yaw: (170 * Math.PI) / 180
        })
      ]
    }),
    {
      localSessionId: 999
    }
  );
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 21,
      serverTimeMs: 1100,
      entityCount: 1,
      entities: [
        entity({
          entityId: 40,
          sessionId: 400,
          yaw: (-170 * Math.PI) / 180
        })
      ]
    }),
    {
      localSessionId: 999
    }
  );

  const sampled = sampleRemoteInterpolation(state, 1100);

  assert.equal(Math.abs(Math.abs(sampled.representativeRemotePose.yaw) - Math.PI) < 0.000001, true);
});

test("remote interpolation carries the authoritative crouch stance onto the presentation pose", () => {
  let state = createInitialRemoteInterpolationState({
    interpolationDelayMs: 50
  });
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 30,
      serverTimeMs: 1000,
      entityCount: 1,
      entities: [
        entity({
          entityId: 60,
          sessionId: 600,
          crouched: false
        })
      ]
    }),
    {
      localSessionId: 999
    }
  );
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 31,
      serverTimeMs: 1100,
      entityCount: 1,
      entities: [
        entity({
          entityId: 60,
          sessionId: 600,
          crouched: true
        })
      ]
    }),
    {
      localSessionId: 999
    }
  );

  const sampled = sampleRemoteInterpolation(state, 1100);

  assert.equal(sampled.representativeRemotePose.crouched, true);
});

test("remote interpolation ignores stale, inactive, and malformed snapshot data without poisoning state", () => {
  let state = createInitialRemoteInterpolationState();
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 5,
      serverTimeMs: 5000,
      entityCount: 1,
      entities: [
        entity({
          entityId: 50,
          sessionId: 500,
          x: 1
        })
      ]
    }),
    {
      localSessionId: 999
    }
  );

  const validState = state;
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 4,
      serverTimeMs: 4900
    }),
    {
      localSessionId: 999
    }
  );
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 6,
      serverTimeMs: Number.NaN
    }),
    {
      localSessionId: 999
    }
  );
  state = recordRemoteInterpolationSnapshot(
    state,
    snapshot({
      tick: 6,
      serverTimeMs: 5100,
      entityCount: 2,
      entities: [
        entity({
          entityId: 51,
          sessionId: 501,
          active: false,
          x: 2
        }),
        entity({
          entityId: 52,
          sessionId: 502,
          x: Number.NaN
        })
      ]
    }),
    {
      localSessionId: 999
    }
  );

  assert.deepEqual(state.snapshots, validState.snapshots);
  assert.equal(state.remoteEntityCount, 1);
});
