import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_INPUT_BUTTONS,
  COMBAT_EVENT_KIND,
  FIRE_REJECT_REASON,
  LOADOUT_PROFILE_ID,
  LOADOUT_REJECT_REASON,
  LOADOUT_STATUS,
  ROUND_EVENT_KIND,
  ROUND_OUTCOME,
  ROUND_PHASE,
  createClientFireIntent,
  createClientInputPlaceholder
} from "../packages/shared/dist/index.js";
import {
  createInitialConnectionViewState,
  reduceConnectionViewState
} from "../apps/client/dist/browser/connection-state.js";

test("connection state reducer tracks accept, ticks, snapshots, pong RTT, and message counts", () => {
  const initial = createInitialConnectionViewState(1000, {
    historyLimit: 3
  });
  const connecting = reduceConnectionViewState(initial, {
    type: "connecting",
    nowMs: 1005
  });
  const accepted = reduceConnectionViewState(initial, {
    type: "message",
    nowMs: 1010,
    message: {
      kind: "protocol.accept",
      protocolVersion: 1,
      serverTickRateHz: 60
    }
  });
  assert.equal(connecting.status, "connecting");
  const pingSent = reduceConnectionViewState(accepted, {
    type: "ping-sent",
    sequence: 7,
    clientTimeMs: 1020
  });
  const ticked = reduceConnectionViewState(pingSent, {
    type: "message",
    nowMs: 1030,
    message: {
      kind: "server.tick",
      tick: 12,
      serverTimeMs: 1030
    }
  });
  const snapshotted = reduceConnectionViewState(ticked, {
    type: "message",
    nowMs: 1040,
    message: {
      kind: "server.snapshot",
      tick: 12,
      serverTimeMs: 1040,
      sessionCount: 1
    }
  });
  const ponged = reduceConnectionViewState(snapshotted, {
    type: "message",
    nowMs: 1075,
    message: {
      kind: "pong",
      sequence: 7,
      clientTimeMs: 1020,
      serverTimeMs: 1050
    }
  });

  assert.equal(ponged.status, "accepted");
  assert.equal(ponged.serverTick, 12);
  assert.equal(ponged.lastSnapshotTick, 12);
  assert.equal(ponged.lastRttMs, 55);
  assert.equal(ponged.lastMessageTimeMs, 1075);
  assert.equal(ponged.connectedAtMs, 1010);
  assert.deepEqual(ponged.rttHistoryMs, [55]);
  assert.deepEqual(ponged.rttStats, {
    currentMs: 55,
    minMs: 55,
    maxMs: 55,
    averageMs: 55
  });
  assert.deepEqual(ponged.messageCounts, {
    "protocol.accept": 1,
    "server.tick": 1,
    "server.snapshot": 1,
    pong: 1
  });
});

test("connection state reducer tracks bounded RTT history, observed cadence, and message rates", () => {
  let state = createInitialConnectionViewState(0, {
    historyLimit: 3
  });
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 0,
    message: {
      kind: "protocol.accept",
      protocolVersion: 1,
      serverTickRateHz: 60
    }
  });

  for (const [sequence, sentAt, receivedAt] of [
    [1, 10, 20],
    [2, 100, 130],
    [3, 200, 240],
    [4, 300, 350]
  ]) {
    state = reduceConnectionViewState(state, {
      type: "ping-sent",
      sequence,
      clientTimeMs: sentAt
    });
    state = reduceConnectionViewState(state, {
      type: "message",
      nowMs: receivedAt,
      message: {
        kind: "pong",
        sequence,
        clientTimeMs: sentAt,
        serverTimeMs: receivedAt - 5
      }
    });
  }

  for (const [tick, nowMs] of [
    [1, 1000],
    [2, 1050],
    [3, 1100]
  ]) {
    state = reduceConnectionViewState(state, {
      type: "message",
      nowMs,
      message: {
        kind: "server.tick",
        tick,
        serverTimeMs: nowMs
      }
    });
  }

  for (const [tick, nowMs] of [
    [1, 1000],
    [2, 1100],
    [3, 1200]
  ]) {
    state = reduceConnectionViewState(state, {
      type: "message",
      nowMs,
      message: {
        kind: "server.snapshot",
        tick,
        serverTimeMs: nowMs,
        sessionCount: 1
      }
    });
  }

  assert.deepEqual(state.rttHistoryMs, [30, 40, 50]);
  assert.deepEqual(state.rttStats, {
    currentMs: 50,
    minMs: 30,
    maxMs: 50,
    averageMs: 40
  });
  assert.equal(state.observedTickRateHz, 20);
  assert.equal(state.observedSnapshotRateHz, 10);
  assert.equal(state.messageRatesPerSecond["server.tick"], 2.5);
  assert.equal(state.messageRatesPerSecond["server.snapshot"], 2.5);
});

test("connection state reducer exposes rejected and error states", () => {
  const initial = createInitialConnectionViewState(500);
  const rejected = reduceConnectionViewState(initial, {
    type: "message",
    nowMs: 510,
    message: {
      kind: "protocol.reject",
      protocolVersion: 1,
      reason: "Unsupported protocol version."
    }
  });
  const errored = reduceConnectionViewState(rejected, {
    type: "error",
    nowMs: 520,
    error: "socket closed"
  });

  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.error, "Unsupported protocol version.");
  assert.equal(errored.status, "error");
  assert.equal(errored.error, "socket closed");
  assert.equal(errored.lastDisconnectReason, "socket closed");
});

test("connection state reducer resets per-connection diagnostics on reconnect while keeping last disconnect reason", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 10,
    message: {
      kind: "protocol.accept",
      protocolVersion: 1,
      serverTickRateHz: 60
    }
  });
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.tick",
      tick: 1,
      serverTimeMs: 20
    }
  });
  state = reduceConnectionViewState(state, {
    type: "closed",
    nowMs: 30,
    reason: "client disconnect"
  });
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 40
  });

  assert.equal(state.status, "connecting");
  assert.equal(state.lastDisconnectReason, "client disconnect");
  assert.equal(state.serverTick, undefined);
  assert.equal(state.lastSnapshotTick, undefined);
  assert.equal(state.lastRttMs, undefined);
  assert.deepEqual(state.messageCounts, {});
  assert.deepEqual(state.rttHistoryMs, []);
  assert.deepEqual(state.pendingPings, {});
});

test("connection state reducer tracks match assignment, match updates, and match rejection reasons", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 10,
    message: {
      kind: "match.assigned",
      matchId: 1,
      sessionId: 7,
      slotIndex: 2,
      capacity: 4,
      connectedSlots: 3
    }
  });
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "match.update",
      matchId: 1,
      capacity: 4,
      connectedSlots: 2
    }
  });

  assert.equal(state.matchId, 1);
  assert.equal(state.sessionId, 7);
  assert.equal(state.slotIndex, 2);
  assert.equal(state.matchCapacity, 4);
  assert.equal(state.connectedSlots, 2);

  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 30
  });
  assert.equal(state.matchId, undefined);
  assert.equal(state.sessionId, undefined);
  assert.equal(state.slotIndex, undefined);

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 40,
    message: {
      kind: "protocol.reject",
      protocolVersion: 1,
      reason: "Match is full."
    }
  });
  assert.equal(state.status, "rejected");
  assert.equal(state.matchRejectionReason, "Match is full.");
});

test("connection state reducer tracks input sends, input acknowledgements, and input send rate", () => {
  let state = createInitialConnectionViewState(0, {
    historyLimit: 3
  });
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 0,
    message: {
      kind: "protocol.accept",
      protocolVersion: 1,
      serverTickRateHz: 60
    }
  });

  for (const [sequence, nowMs] of [
    [2, 100],
    [4, 600],
    [6, 1100]
  ]) {
    state = reduceConnectionViewState(state, {
      type: "input-sent",
      sequence,
      clientTimeMs: nowMs
    });
  }

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 1200,
    message: {
      kind: "input.ack",
      sessionId: 1,
      lastAcceptedInputSequence: 4,
      droppedInputCount: 1
    }
  });

  assert.equal(state.lastSentInputSequence, 6);
  assert.equal(state.lastAcknowledgedInputSequence, 4);
  assert.equal(state.droppedInputCount, 1);
  assert.equal(state.inputSendRateHz, 2);
});

test("connection state reducer tracks world snapshot diagnostics", () => {
  let state = createInitialConnectionViewState(0);

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 100,
    message: {
      kind: "server.snapshot",
      tick: 12,
      serverTimeMs: 100,
      sessionCount: 2,
      worldId: 4,
      entityCount: 2,
      entities: [
        {
          entityId: 200,
          sessionId: 10,
          slotIndex: 0,
          active: true,
          x: 2.5,
          y: 0,
          z: -1,
          yaw: 0.25
        },
        {
          entityId: 201,
          sessionId: 11,
          slotIndex: 1,
          active: true,
          x: -4,
          y: 0,
          z: 3,
          yaw: -0.5
        }
      ]
    }
  });

  assert.equal(state.lastSnapshotTick, 12);
  assert.equal(state.lastWorldSnapshotTick, 12);
  assert.equal(state.worldId, 4);
  assert.equal(state.worldEntityCount, 2);
});

test("connection state reducer tracks local assigned entity movement diagnostics", () => {
  let state = createInitialConnectionViewState(0);

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 10,
    message: {
      kind: "match.assigned",
      matchId: 1,
      sessionId: 10,
      slotIndex: 0,
      capacity: 4,
      connectedSlots: 1
    }
  });
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.snapshot",
      tick: 13,
      serverTimeMs: 20,
      sessionCount: 2,
      worldId: 4,
      entityCount: 2,
      entities: [
        {
          entityId: 200,
          sessionId: 10,
          slotIndex: 0,
          active: true,
          x: 2.5,
          y: 0,
          z: -1,
          yaw: 0.25
        },
        {
          entityId: 201,
          sessionId: 11,
          slotIndex: 1,
          active: true,
          x: -4,
          y: 0,
          z: 3,
          yaw: -0.5
        }
      ]
    }
  });

  assert.equal(state.localEntityId, 200);
  assert.deepEqual(state.localEntityPosition, {
    x: 2.5,
    y: 0,
    z: -1
  });
  assert.equal(state.localEntityYaw, 0.25);
});

test("connection state reducer predicts local presentation and reconciles to server snapshots", () => {
  let state = createInitialConnectionViewState(0);

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 10,
    message: {
      kind: "match.assigned",
      matchId: 1,
      sessionId: 10,
      slotIndex: 0,
      capacity: 4,
      connectedSlots: 1
    }
  });
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.snapshot",
      tick: 1,
      serverTimeMs: 20,
      sessionCount: 1,
      worldId: 1,
      entityCount: 1,
      entities: [
        {
          entityId: 100,
          sessionId: 10,
          slotIndex: 0,
          active: true,
          x: 0,
          y: 0,
          z: 0,
          yaw: 0
        }
      ]
    }
  });

  const input = {
    ...createClientInputPlaceholder(2, 30),
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  };
  state = reduceConnectionViewState(state, {
    type: "input-sent",
    sequence: input.sequence,
    clientTimeMs: input.clientTimeMs,
    message: input
  });

  assert.equal(state.pendingPredictionInputCount, 1);
  assert.equal(state.predictedLocalEntityPosition.z < 0, true);

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 40,
    message: {
      kind: "input.ack",
      sessionId: 10,
      lastAcceptedInputSequence: 2,
      droppedInputCount: 0
    }
  });
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 50,
    message: {
      kind: "server.snapshot",
      tick: 2,
      serverTimeMs: 50,
      sessionCount: 1,
      worldId: 1,
      entityCount: 1,
      entities: [
        {
          entityId: 100,
          sessionId: 10,
          slotIndex: 0,
          active: true,
          x: 0,
          y: 0,
          z: -1.2,
          yaw: 0
        }
      ]
    }
  });

  assert.equal(state.pendingPredictionInputCount, 0);
  assert.deepEqual(state.predictedLocalEntityPosition, {
    x: 0,
    y: 0,
    z: -1.2
  });
  assert.equal(state.predictedLocalEntityYaw, 0);
  assert.equal(state.lastReconciledSnapshotTick, 2);
  assert.equal(state.replayedPredictionInputCount, 0);
  assert.equal(state.predictionCorrectionMagnitude > 0, true);
});

test("connection state reducer ignores stale out-of-order snapshots for authoritative-derived state", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 10,
    message: {
      kind: "match.assigned",
      matchId: 1,
      sessionId: 10,
      slotIndex: 0,
      capacity: 4,
      connectedSlots: 1
    }
  });

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 100,
    message: {
      kind: "server.snapshot",
      tick: 5,
      serverTimeMs: 100,
      sessionCount: 1,
      worldId: 1,
      entityCount: 1,
      entities: [
        {
          entityId: 100,
          sessionId: 10,
          slotIndex: 0,
          active: true,
          x: 2,
          y: 0,
          z: -3,
          yaw: 0.5
        }
      ]
    }
  });

  assert.equal(state.lastSnapshotTick, 5);
  assert.deepEqual(state.localEntityPosition, { x: 2, y: 0, z: -3 });
  assert.equal(state.lastReconciledSnapshotTick, 5);

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 120,
    message: {
      kind: "server.snapshot",
      tick: 3,
      serverTimeMs: 80,
      sessionCount: 1,
      worldId: 1,
      entityCount: 1,
      entities: [
        {
          entityId: 100,
          sessionId: 10,
          slotIndex: 0,
          active: true,
          x: -9,
          y: 0,
          z: 9,
          yaw: -1
        }
      ]
    }
  });

  // The newer snapshot's authoritative-derived state survives the late arrival.
  assert.equal(state.lastSnapshotTick, 5);
  assert.equal(state.lastWorldSnapshotTick, 5);
  assert.deepEqual(state.localEntityPosition, { x: 2, y: 0, z: -3 });
  assert.equal(state.localEntityYaw, 0.5);
  assert.deepEqual(state.predictedLocalEntityPosition, { x: 2, y: 0, z: -3 });
  assert.equal(state.lastReconciledSnapshotTick, 5);

  // The stale snapshot is still recorded as an arrival for diagnostics.
  assert.equal(state.messageCounts["server.snapshot"], 2);
  assert.equal(state.lastMessageTimeMs, 120);
});

test("connection state reducer resets prediction diagnostics on reconnect", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "input-sent",
    sequence: 2,
    clientTimeMs: 10,
    message: {
      ...createClientInputPlaceholder(2, 10),
      buttons: CLIENT_INPUT_BUTTONS.forward
    }
  });
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 20
  });

  assert.equal(state.pendingPredictionInputCount, 0);
  assert.equal(state.predictedLocalEntityPosition, undefined);
  assert.equal(state.predictionCorrectionMagnitude, undefined);
});

test("connection state reducer tracks remote interpolation diagnostics without changing local prediction", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 10,
    message: {
      kind: "match.assigned",
      matchId: 1,
      sessionId: 10,
      slotIndex: 0,
      capacity: 4,
      connectedSlots: 2
    }
  });

  for (const [tick, serverTimeMs, remoteX] of [
    [1, 1000, 0],
    [2, 1100, 10]
  ]) {
    state = reduceConnectionViewState(state, {
      type: "message",
      nowMs: serverTimeMs,
      message: {
        kind: "server.snapshot",
        tick,
        serverTimeMs,
        sessionCount: 2,
        worldId: 1,
        entityCount: 2,
        entities: [
          {
            entityId: 100,
            sessionId: 10,
            slotIndex: 0,
            active: true,
            x: 0,
            y: 0,
            z: -1,
            yaw: 0
          },
          {
            entityId: 101,
            sessionId: 11,
            slotIndex: 1,
            active: true,
            x: remoteX,
            y: 0,
            z: -remoteX,
            yaw: 0
          }
        ]
      }
    });
  }

  assert.equal(state.remoteEntityCount, 1);
  assert.equal(state.remoteInterpolationBufferedSnapshotCount, 2);
  assert.equal(state.remoteInterpolationDelayMs, 100);
  assert.equal(state.lastRemoteInterpolationTick, 2);
  assert.equal(state.lastRemoteInterpolationTimeMs, 1000);
  assert.equal(state.representativeRemoteEntityId, 101);
  assert.deepEqual(state.representativeRemoteEntityPosition, {
    x: 0,
    y: 0,
    z: 0
  });
  assert.equal(state.predictedLocalEntityPosition?.z, -1);
});

test("connection state reducer resets remote interpolation diagnostics on reconnect", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 10,
    message: {
      kind: "match.assigned",
      matchId: 1,
      sessionId: 10,
      slotIndex: 0,
      capacity: 4,
      connectedSlots: 2
    }
  });
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 1000,
    message: {
      kind: "server.snapshot",
      tick: 1,
      serverTimeMs: 1000,
      sessionCount: 2,
      worldId: 1,
      entityCount: 1,
      entities: [
        {
          entityId: 101,
          sessionId: 11,
          slotIndex: 1,
          active: true,
          x: 3,
          y: 0,
          z: -3,
          yaw: 0
        }
      ]
    }
  });
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 1100
  });

  assert.equal(state.remoteEntityCount, 0);
  assert.equal(state.remoteInterpolationBufferedSnapshotCount, 0);
  assert.equal(state.lastRemoteInterpolationTick, undefined);
  assert.equal(state.representativeRemoteEntityPosition, undefined);
});

test("connection state reducer tracks server-owned fire validation diagnostics", () => {
  let state = createInitialConnectionViewState(0, {
    historyLimit: 3
  });

  for (const [sequence, nowMs] of [
    [1, 100],
    [2, 600],
    [3, 1100]
  ]) {
    state = reduceConnectionViewState(state, {
      type: "fire-sent",
      sequence,
      clientTimeMs: nowMs,
      message: createClientFireIntent({
        sequence,
        clientTimeMs: nowMs,
        clientTick: sequence,
        yaw: 0,
        pitch: 0
      })
    });
  }

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 1150,
    message: {
      kind: "server.fire.result",
      sequence: 3,
      sessionId: 10,
      serverTick: 44,
      accepted: true,
      hit: true,
      targetEntityId: 101,
      targetSessionId: 11,
      distance: 4.25,
      rejectReason: FIRE_REJECT_REASON.none
    }
  });

  assert.equal(state.lastSentFireSequence, 3);
  assert.equal(state.fireSendRateHz, 2);
  assert.equal(state.lastFireResultSequence, 3);
  assert.equal(state.lastFireResultServerTick, 44);
  assert.equal(state.lastFireAccepted, true);
  assert.equal(state.lastFireHit, true);
  assert.equal(state.lastFireTargetEntityId, 101);
  assert.equal(state.lastFireTargetSessionId, 11);
  assert.equal(state.lastFireDistance, 4.25);
  assert.equal(state.lastFireRejectReason, FIRE_REJECT_REASON.none);
});

test("connection state reducer resets fire diagnostics on reconnect", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 10,
    message: {
      kind: "server.fire.result",
      sequence: 3,
      sessionId: 10,
      serverTick: 44,
      accepted: false,
      hit: false,
      targetEntityId: 0,
      targetSessionId: 0,
      distance: 0,
      rejectReason: FIRE_REJECT_REASON.staleSequence
    }
  });
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 20
  });

  assert.equal(state.lastFireResultSequence, undefined);
  assert.equal(state.lastFireAccepted, undefined);
  assert.equal(state.lastFireRejectReason, undefined);
  assert.equal(state.lastSentFireSequence, undefined);
});

test("connection state reducer tracks diagnostics-only combat state", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.combat.state",
      serverTick: 20,
      sessionId: 10,
      entityId: 100,
      health: 50,
      maxHealth: 100,
      alive: true,
      deathTick: 0,
      respawnEligibleTick: 0,
      lastEventKind: COMBAT_EVENT_KIND.damage,
      lastEventTick: 20,
      lastEventSequence: 7,
      sourceSessionId: 11,
      targetSessionId: 10,
      damage: 50
    }
  });

  assert.equal(state.sessionId, 10);
  assert.equal(state.localCombatEntityId, 100);
  assert.equal(state.localHealth, 50);
  assert.equal(state.localMaxHealth, 100);
  assert.equal(state.localAlive, true);
  assert.equal(state.localDeathTick, undefined);
  assert.equal(state.localRespawnEligibleTick, undefined);
  assert.equal(state.lastCombatEventKind, COMBAT_EVENT_KIND.damage);
  assert.equal(state.lastCombatEventTick, 20);
  assert.equal(state.lastCombatEventSequence, 7);
  assert.equal(state.lastCombatSourceSessionId, 11);
  assert.equal(state.lastCombatTargetSessionId, 10);
  assert.equal(state.lastCombatDamage, 50);
});

test("connection state reducer resets combat diagnostics on reconnect", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.combat.state",
      serverTick: 20,
      sessionId: 10,
      entityId: 100,
      health: 0,
      maxHealth: 100,
      alive: false,
      deathTick: 20,
      respawnEligibleTick: 23,
      lastEventKind: COMBAT_EVENT_KIND.death,
      lastEventTick: 20,
      lastEventSequence: 7,
      sourceSessionId: 11,
      targetSessionId: 10,
      damage: 50
    }
  });
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 30
  });

  assert.equal(state.localHealth, undefined);
  assert.equal(state.localAlive, undefined);
  assert.equal(state.lastCombatEventKind, undefined);
});

test("connection state reducer tracks diagnostics-only loadout state", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.loadout.state",
      serverTick: 20,
      sequence: 3,
      sessionId: 10,
      profileId: LOADOUT_PROFILE_ID.halcyon,
      status: LOADOUT_STATUS.accepted,
      rejectReason: LOADOUT_REJECT_REASON.none
    }
  });

  assert.equal(state.sessionId, 10);
  assert.equal(state.loadoutProfileId, LOADOUT_PROFILE_ID.halcyon);
  assert.equal(state.loadoutStatus, LOADOUT_STATUS.accepted);
  assert.equal(state.loadoutRejectReason, LOADOUT_REJECT_REASON.none);
  assert.equal(state.lastLoadoutSequence, 3);
  assert.equal(state.lastLoadoutServerTick, 20);
});

test("connection state reducer resets loadout diagnostics on reconnect", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.loadout.state",
      serverTick: 20,
      sequence: 3,
      sessionId: 10,
      profileId: LOADOUT_PROFILE_ID.halcyon,
      status: LOADOUT_STATUS.accepted,
      rejectReason: LOADOUT_REJECT_REASON.none
    }
  });
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 30
  });

  assert.equal(state.loadoutProfileId, undefined);
  assert.equal(state.loadoutStatus, undefined);
  assert.equal(state.loadoutRejectReason, undefined);
  assert.equal(state.lastLoadoutSequence, undefined);
});

test("connection state reducer tracks diagnostics-only round state", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.round.state",
      serverTick: 20,
      roundId: 3,
      phase: ROUND_PHASE.ended,
      outcome: ROUND_OUTCOME.elimination,
      winnerSessionId: 10,
      phaseStartedTick: 18,
      phaseEndsTick: 18,
      resetReadyTick: 23,
      lastEventKind: ROUND_EVENT_KIND.ended,
      lastEventTick: 18,
      lastEventSequence: 6
    }
  });

  assert.equal(state.roundId, 3);
  assert.equal(state.roundPhase, ROUND_PHASE.ended);
  assert.equal(state.roundOutcome, ROUND_OUTCOME.elimination);
  assert.equal(state.roundWinnerSessionId, 10);
  assert.equal(state.roundPhaseStartedTick, 18);
  assert.equal(state.roundPhaseEndsTick, 18);
  assert.equal(state.roundResetReadyTick, 23);
  assert.equal(state.lastRoundEventKind, ROUND_EVENT_KIND.ended);
  assert.equal(state.lastRoundEventTick, 18);
  assert.equal(state.lastRoundEventSequence, 6);
  assert.equal(state.lastRoundServerTick, 20);
});

test("connection state reducer tracks diagnostics-only match stats", () => {
  let state = createInitialConnectionViewState(0);
  assert.deepEqual(state.matchStats, []);
  assert.equal(state.lastMatchStatsServerTick, undefined);

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.match.stats",
      serverTick: 42,
      entryCount: 2,
      entries: [
        { sessionId: 1, kills: 3, deaths: 1 },
        { sessionId: 2, kills: 1, deaths: 3 }
      ]
    }
  });

  assert.deepEqual(state.matchStats, [
    { sessionId: 1, kills: 3, deaths: 1 },
    { sessionId: 2, kills: 1, deaths: 3 }
  ]);
  assert.equal(state.lastMatchStatsServerTick, 42);
});

test("connection state reducer resets match stats on reconnect", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.match.stats",
      serverTick: 42,
      entryCount: 1,
      entries: [{ sessionId: 1, kills: 2, deaths: 0 }]
    }
  });
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 30
  });

  assert.deepEqual(state.matchStats, []);
  assert.equal(state.lastMatchStatsServerTick, undefined);
});

test("connection state reducer tracks diagnostics-only match roster", () => {
  let state = createInitialConnectionViewState(0);
  assert.deepEqual(state.matchRoster, []);
  assert.equal(state.lastMatchRosterServerTick, undefined);

  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.match.roster",
      serverTick: 42,
      entryCount: 2,
      entries: [
        { sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
        { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.cinder, slotIndex: 1 }
      ]
    }
  });

  assert.deepEqual(state.matchRoster, [
    { sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
    { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.cinder, slotIndex: 1 }
  ]);
  assert.equal(state.lastMatchRosterServerTick, 42);
});

test("connection state reducer resets match roster on reconnect", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.match.roster",
      serverTick: 42,
      entryCount: 1,
      entries: [{ sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 }]
    }
  });
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 30
  });

  assert.deepEqual(state.matchRoster, []);
  assert.equal(state.lastMatchRosterServerTick, undefined);
});

test("connection state reducer resets round diagnostics on reconnect", () => {
  let state = createInitialConnectionViewState(0);
  state = reduceConnectionViewState(state, {
    type: "message",
    nowMs: 20,
    message: {
      kind: "server.round.state",
      serverTick: 20,
      roundId: 3,
      phase: ROUND_PHASE.active,
      outcome: ROUND_OUTCOME.none,
      winnerSessionId: 0,
      phaseStartedTick: 18,
      phaseEndsTick: 80,
      resetReadyTick: 0,
      lastEventKind: ROUND_EVENT_KIND.active,
      lastEventTick: 18,
      lastEventSequence: 6
    }
  });
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: 30
  });

  assert.equal(state.roundId, undefined);
  assert.equal(state.roundPhase, undefined);
  assert.equal(state.roundOutcome, undefined);
  assert.equal(state.roundWinnerSessionId, undefined);
  assert.equal(state.lastRoundServerTick, undefined);
});
