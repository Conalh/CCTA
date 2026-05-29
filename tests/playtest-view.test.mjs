import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_INPUT_BUTTONS,
  ROUND_PHASE
} from "../packages/shared/dist/index.js";
import {
  createInitialConnectionViewState,
  reduceConnectionViewState
} from "../apps/client/dist/browser/connection-state.js";
import {
  createInitialNetworkedPlaytestReviewStats,
  deriveNetworkedPlaytestAimAtRemote,
  createNetworkedPlaytestInputMessage,
  createNetworkedPlaytestPresentation,
  formatPlaytestRoundPhase,
  formatPlaytestMatchOccupancy,
  formatPlaytestWeaponName,
  formatPlaytestWeaponAmmo,
  formatPlaytestMatchResult,
  NETWORKED_PLAYTEST_INPUT_INTERVAL_MS,
  NETWORKED_PLAYTEST_INPUT_RATE_HZ,
  classifyNetworkedPlaytestMotionContact,
  holdPlaytestMotionContact,
  NETWORKED_PLAYTEST_MOTION_BLOCKED_HOLD_MS,
  smoothNetworkedPlaytestCameraPosition,
  updateNetworkedPlaytestReviewStats
} from "../apps/client/dist/playtest/playtest-state.js";

test("networked playtest input maps inspection keys to the validated placeholder input packet", () => {
  const message = createNetworkedPlaytestInputMessage({
    clientTimeMs: 1234,
    keys: new Set(["KeyW", "KeyD", "Space"]),
    pitchRadians: 0.12,
    sequence: 9,
    yawRadians: 0.5
  });

  assert.equal(message.kind, "client.input");
  assert.equal(message.sequence, 9);
  assert.equal(message.clientTimeMs, 1234);
  assert.equal(
    message.buttons,
    CLIENT_INPUT_BUTTONS.forward | CLIENT_INPUT_BUTTONS.right | CLIENT_INPUT_BUTTONS.jump
  );
  assert.equal(message.yaw, 0.5);
  assert.equal(message.pitch, 0.12);
});

test("networked playtest hit proof aim derives a server-valid yaw toward a remote placeholder", () => {
  const aim = deriveNetworkedPlaytestAimAtRemote({
    localCameraPosition: [0, 1.62, 0],
    remotePlaceholders: [
      {
        entityId: 101,
        id: "remote-101",
        position: [1.5, 0, 0],
        sessionId: 11,
        shape: "remote-placeholder",
        slotIndex: 1,
        sourceTick: 22,
        yawRadians: 0
      }
    ]
  });

  assert.notEqual(aim, undefined);
  assert.equal(aim.targetEntityId, 101);
  assert.equal(aim.targetSessionId, 11);
  assert.equal(Math.abs(aim.yawRadians - -Math.PI / 2) < 0.000001, true);
  assert.equal(Math.abs(aim.pitchRadians) < 0.000001, true);
  assert.equal(aim.distanceMeters, 1.5);
});

test("networked playtest hit proof aim ignores unusable remote target data", () => {
  assert.equal(
    deriveNetworkedPlaytestAimAtRemote({
      localCameraPosition: [0, 1.62, 0],
      remotePlaceholders: []
    }),
    undefined
  );

  assert.equal(
    deriveNetworkedPlaytestAimAtRemote({
      localCameraPosition: [0, 1.62, 0],
      remotePlaceholders: [
        {
          entityId: 0,
          id: "remote-0",
          position: [Number.NaN, 0, 0],
          sessionId: 11,
          shape: "remote-placeholder",
          slotIndex: 1,
          sourceTick: 22,
          yawRadians: 0
        }
      ]
    }),
    undefined
  );
});

test("networked playtest presentation drives the camera from predicted local pose while preserving server truth", () => {
  const state = {
    ...createInitialConnectionViewState(0),
    status: "accepted",
    localEntityId: 42,
    localEntityPosition: {
      x: 1,
      y: 0,
      z: -2
    },
    localEntityYaw: 0.25,
    predictedLocalEntityPosition: {
      x: 1.5,
      y: 0,
      z: -2.75
    },
    predictedLocalEntityYaw: 0.5,
    predictionCorrectionMagnitude: 0.35,
    roundPhase: ROUND_PHASE.active
  };

  const presentation = createNetworkedPlaytestPresentation({
    state
  });

  assert.equal(presentation.connectionStatus, "accepted");
  assert.equal(presentation.localEntityId, 42);
  assert.equal(presentation.localCameraSource, "predicted");
  assert.deepEqual(presentation.serverPosition, [1, 0, -2]);
  assert.deepEqual(presentation.predictedPosition, [1.5, 0, -2.75]);
  assert.equal(presentation.localCameraPose.position[0], 1.5);
  assert.equal(presentation.localCameraPose.position[2], -2.75);
  assert.equal(presentation.localCameraPose.yawRadians, 0.5);
  assert.equal(presentation.predictionCorrectionMagnitude, 0.35);
  assert.equal(presentation.roundPhaseLabel, "active");
});

test("networked playtest presentation keeps local mouse look independent from prediction correction", () => {
  const state = {
    ...createInitialConnectionViewState(0),
    status: "accepted",
    localEntityId: 42,
    localEntityPosition: {
      x: 1,
      y: 0,
      z: -2
    },
    localEntityYaw: 0.25,
    predictedLocalEntityPosition: {
      x: 1.5,
      y: 0,
      z: -2.75
    },
    predictedLocalEntityYaw: 0.5,
    predictionCorrectionMagnitude: 0.35
  };

  const presentation = createNetworkedPlaytestPresentation({
    lookPitchRadians: -0.2,
    lookYawRadians: 1.1,
    state
  });

  assert.equal(presentation.localCameraSource, "predicted");
  assert.deepEqual(presentation.predictedPosition, [1.5, 0, -2.75]);
  assert.equal(presentation.localCameraPose.position[0], 1.5);
  assert.equal(presentation.localCameraPose.position[2], -2.75);
  assert.equal(Math.abs(presentation.localCameraPose.yawRadians - 1.1) < 0.000001, true);
  assert.equal(Math.abs(presentation.localCameraPose.pitchRadians - -0.2) < 0.000001, true);
  assert.equal(presentation.predictionCorrectionMagnitude, 0.35);
});

test("networked playtest presentation follows server-owned movement beyond renderer bounds", () => {
  const state = {
    ...createInitialConnectionViewState(0),
    status: "accepted",
    localEntityId: 42,
    predictedLocalEntityPosition: {
      x: 12,
      y: 0,
      z: -12
    },
    predictedLocalEntityYaw: 0,
    predictionCorrectionMagnitude: 0
  };

  const presentation = createNetworkedPlaytestPresentation({
    state
  });

  assert.deepEqual(presentation.localCameraPose.position, [12, 1.62, -12]);
  assert.equal(presentation.localCameraPose.clampedToBounds, false);
});

test("networked playtest presentation lowers the camera eye and surfaces the server-owned crouch stance", () => {
  const baseState = {
    ...createInitialConnectionViewState(0),
    status: "accepted",
    localEntityId: 42,
    predictedLocalEntityPosition: {
      x: 12,
      y: 0,
      z: -12
    },
    predictedLocalEntityYaw: 0,
    predictionCorrectionMagnitude: 0
  };

  const standing = createNetworkedPlaytestPresentation({ state: baseState });
  const crouched = createNetworkedPlaytestPresentation({
    state: { ...baseState, localEntityCrouched: true }
  });

  assert.equal(standing.localCrouched, false);
  assert.equal(standing.localCameraPose.position[1], 1.62);
  assert.equal(crouched.localCrouched, true);
  assert.equal(crouched.localCameraPose.position[1] < standing.localCameraPose.position[1], true);
});

test("networked playtest input cadence matches the authoritative server tick target", () => {
  assert.equal(NETWORKED_PLAYTEST_INPUT_RATE_HZ, 60);
  assert.equal(NETWORKED_PLAYTEST_INPUT_INTERVAL_MS, 1000 / 60);
});

test("networked playtest camera smoothing fills render frames between prediction updates", () => {
  const first = smoothNetworkedPlaytestCameraPosition({
    deltaSeconds: 1 / 144,
    previousPosition: [0, 1.62, 0],
    targetPosition: [0, 1.62, -0.05]
  });
  const second = smoothNetworkedPlaytestCameraPosition({
    deltaSeconds: 1 / 144,
    previousPosition: first,
    targetPosition: [0, 1.62, -0.05]
  });
  const third = smoothNetworkedPlaytestCameraPosition({
    deltaSeconds: 1 / 144,
    previousPosition: second,
    targetPosition: [0, 1.62, -0.1]
  });

  assert.equal(first[2] < 0, true);
  assert.equal(first[2] > -0.05, true);
  assert.equal(second[2] < first[2], true);
  assert.equal(second[2] > -0.05, true);
  assert.equal(third[2] < second[2], true);
  assert.equal(third[2] > -0.1, true);
});

test("networked playtest camera smoothing snaps across large correction distances", () => {
  assert.deepEqual(
    smoothNetworkedPlaytestCameraPosition({
      deltaSeconds: 1 / 60,
      previousPosition: [0, 1.62, 0],
      targetPosition: [4, 1.62, -4]
    }),
    [4, 1.62, -4]
  );
});

test("networked playtest presentation exposes remote placeholders from interpolation only", () => {
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
    [2, 1100, 4]
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
            active: true,
            entityId: 100,
            sessionId: 10,
            slotIndex: 0,
            x: 0,
            y: 0,
            z: -1,
            yaw: 0
          },
          {
            active: true,
            entityId: 101,
            sessionId: 11,
            slotIndex: 1,
            x: remoteX,
            y: 0,
            z: -remoteX,
            yaw: Math.PI / 2
          }
        ]
      }
    });
  }

  const presentation = createNetworkedPlaytestPresentation({
    state
  });

  assert.equal(presentation.remoteEntityCount, 1);
  assert.equal(presentation.remotePlaceholders.length, 1);
  assert.equal(presentation.remotePlaceholders[0].id, "remote-101");
  assert.equal(presentation.remotePlaceholders[0].entityId, 101);
  assert.equal(presentation.remotePlaceholders[0].sessionId, 11);
  assert.equal(presentation.remotePlaceholders[0].shape, "remote-placeholder");
  assert.deepEqual(presentation.remotePlaceholders[0].position, [0, 0, 0]);
});

test("networked playtest round phase formatting stays compact and diagnostic-only", () => {
  assert.equal(formatPlaytestRoundPhase(undefined), "-");
  assert.equal(formatPlaytestRoundPhase(ROUND_PHASE.setup), "setup");
  assert.equal(formatPlaytestRoundPhase(ROUND_PHASE.active), "active");
  assert.equal(formatPlaytestRoundPhase(ROUND_PHASE.ended), "ended");
  assert.equal(formatPlaytestRoundPhase(ROUND_PHASE.reset), "reset");
  assert.equal(formatPlaytestRoundPhase(999), "unknown 999");
});

test("networked playtest motion hold suppresses per-frame blocked flicker between snapshots", () => {
  const hold = NETWORKED_PLAYTEST_MOTION_BLOCKED_HOLD_MS;

  // Moving/sliding pass through and stamp the last-moving time.
  const moving = holdPlaytestMotionContact({ raw: "moving", previous: "idle", lastMovingAtMs: undefined, nowMs: 1000 });
  assert.deepEqual(moving, { contact: "moving", lastMovingAtMs: 1000 });
  const sliding = holdPlaytestMotionContact({ raw: "sliding", previous: "moving", lastMovingAtMs: 1000, nowMs: 1010 });
  assert.deepEqual(sliding, { contact: "sliding", lastMovingAtMs: 1010 });

  // A blocked reading shortly after moving (a snapshot gap) holds the previous state.
  const gap = holdPlaytestMotionContact({
    raw: "blocked",
    previous: "moving",
    lastMovingAtMs: 1000,
    nowMs: 1000 + hold - 1
  });
  assert.equal(gap.contact, "moving");
  assert.equal(gap.lastMovingAtMs, 1000);

  // Sustained non-movement past the hold window commits to blocked.
  const sustained = holdPlaytestMotionContact({
    raw: "blocked",
    previous: "moving",
    lastMovingAtMs: 1000,
    nowMs: 1000 + hold + 1
  });
  assert.equal(sustained.contact, "blocked");

  // Blocked with no recent movement is reported immediately (e.g., spawned against a wall).
  const cold = holdPlaytestMotionContact({ raw: "blocked", previous: "idle", lastMovingAtMs: undefined, nowMs: 2000 });
  assert.equal(cold.contact, "blocked");

  // Releasing movement clears the hold immediately.
  const idle = holdPlaytestMotionContact({ raw: "idle", previous: "moving", lastMovingAtMs: 1000, nowMs: 1020 });
  assert.deepEqual(idle, { contact: "idle", lastMovingAtMs: undefined });
});

test("networked playtest match occupancy formats server-owned slots without client math", () => {
  assert.equal(formatPlaytestMatchOccupancy(2, 8), "2 / 8");
  assert.equal(formatPlaytestMatchOccupancy(0, 8), "0 / 8");
  // Pre-match and malformed values fall back cleanly rather than fabricating occupancy.
  assert.equal(formatPlaytestMatchOccupancy(undefined, undefined), "-");
  assert.equal(formatPlaytestMatchOccupancy(2, undefined), "-");
  assert.equal(formatPlaytestMatchOccupancy(undefined, 8), "-");
  assert.equal(formatPlaytestMatchOccupancy(1.5, 8), "-");
  assert.equal(formatPlaytestMatchOccupancy(-1, 8), "-");
  assert.equal(formatPlaytestMatchOccupancy(2, 0), "-");
});

test("networked playtest weapon readout resolves server-owned name and ammo without client truth", () => {
  // Name resolves from the server-broadcast profile id; unselected/unknown falls back.
  assert.equal(formatPlaytestWeaponName(2), "Halcyon");
  assert.equal(formatPlaytestWeaponName(0), "-");
  assert.equal(formatPlaytestWeaponName(undefined), "-");
  assert.equal(formatPlaytestWeaponName(99), "-");

  // Ammo formats the mirrored magazine; reloading takes precedence; malformed falls back.
  assert.equal(formatPlaytestWeaponAmmo(12, 30, false), "12 / 30");
  assert.equal(formatPlaytestWeaponAmmo(0, 30, false), "0 / 30");
  assert.equal(formatPlaytestWeaponAmmo(5, 30, true), "reloading");
  assert.equal(formatPlaytestWeaponAmmo(undefined, 30, false), "-");
  assert.equal(formatPlaytestWeaponAmmo(12, undefined, false), "-");
  assert.equal(formatPlaytestWeaponAmmo(-1, 30, false), "-");
});

test("networked playtest match result resolves the server-owned winner without client truth", () => {
  const rosterEntries = [
    { sessionId: 1, handleId: 1, weaponProfileId: 2, slotIndex: 0 },
    { sessionId: 2, handleId: 2, weaponProfileId: 2, slotIndex: 1 }
  ];

  // Not over: no banner.
  assert.equal(formatPlaytestMatchResult(false, undefined, rosterEntries), "-");
  assert.equal(formatPlaytestMatchResult(undefined, 1, rosterEntries), "-");

  // Over with a roster-resolved winner.
  assert.equal(formatPlaytestMatchResult(true, 1, rosterEntries), "Vesper wins the match");
  assert.equal(formatPlaytestMatchResult(true, 2, rosterEntries), "Quill wins the match");

  // Over with no winner or an unknown session: neutral fallback, never a fabricated callsign.
  assert.equal(formatPlaytestMatchResult(true, undefined, rosterEntries), "Match over");
  assert.equal(formatPlaytestMatchResult(true, 9, rosterEntries), "Match over");
});

test("networked playtest review stats track max correction, reconnect count, and last error", () => {
  let stats = createInitialNetworkedPlaytestReviewStats();

  stats = updateNetworkedPlaytestReviewStats(stats, {
    connectionStatus: "accepted",
    error: undefined,
    predictionCorrectionMagnitude: 0.24
  });
  assert.equal(stats.acceptedConnectionCount, 1);
  assert.equal(stats.reconnectCount, 0);
  assert.equal(stats.predictionCorrectionMaxMagnitude, 0.24);
  assert.equal(stats.lastError, undefined);

  stats = updateNetworkedPlaytestReviewStats(stats, {
    connectionStatus: "closed",
    error: undefined,
    predictionCorrectionMagnitude: 0.12
  });
  stats = updateNetworkedPlaytestReviewStats(stats, {
    connectionStatus: "accepted",
    error: undefined,
    predictionCorrectionMagnitude: 0.08
  });
  assert.equal(stats.acceptedConnectionCount, 2);
  assert.equal(stats.reconnectCount, 1);
  assert.equal(stats.predictionCorrectionMaxMagnitude, 0.24);

  stats = updateNetworkedPlaytestReviewStats(stats, {
    connectionStatus: "error",
    error: "socket closed before accept",
    predictionCorrectionMagnitude: Number.NaN
  });
  assert.equal(stats.lastError, "socket closed before accept");
  assert.equal(stats.predictionCorrectionMaxMagnitude, 0.24);
});

test("networked playtest review stats reset to local page defaults", () => {
  const stats = createInitialNetworkedPlaytestReviewStats();

  assert.equal(stats.acceptedConnectionCount, 0);
  assert.equal(stats.reconnectCount, 0);
  assert.equal(stats.predictionCorrectionMaxMagnitude, undefined);
  assert.equal(stats.lastError, undefined);
  assert.equal(stats.lastConnectionStatus, "disconnected");
});

test("networked playtest motion contact readout distinguishes moving, blocked, and sliding states", () => {
  assert.equal(
    classifyNetworkedPlaytestMotionContact({
      currentServerPosition: [0, 0, 0],
      hasMoveIntent: false,
      previousServerPosition: [0, 0, 0],
      rightIntent: 0,
      forwardIntent: 0,
      yawRadians: 0
    }),
    "idle"
  );
  assert.equal(
    classifyNetworkedPlaytestMotionContact({
      currentServerPosition: [0, 0, -0.2],
      hasMoveIntent: true,
      previousServerPosition: [0, 0, 0],
      rightIntent: 0,
      forwardIntent: 1,
      yawRadians: 0
    }),
    "moving"
  );
  assert.equal(
    classifyNetworkedPlaytestMotionContact({
      currentServerPosition: [0, 0, -0.25],
      hasMoveIntent: true,
      previousServerPosition: [0, 0, -0.25],
      rightIntent: 0,
      forwardIntent: 1,
      yawRadians: 0
    }),
    "blocked"
  );
  assert.equal(
    classifyNetworkedPlaytestMotionContact({
      currentServerPosition: [0.2, 0, -0.25],
      hasMoveIntent: true,
      previousServerPosition: [0, 0, -0.25],
      rightIntent: 1,
      forwardIntent: 1,
      yawRadians: 0
    }),
    "sliding"
  );
});
