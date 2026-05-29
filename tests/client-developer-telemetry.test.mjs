import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRE_REJECT_REASON,
  LOADOUT_PROFILE_ID,
  LOADOUT_REJECT_REASON,
  LOADOUT_STATUS,
  ROUND_OUTCOME,
  ROUND_PHASE
} from "../packages/shared/dist/index.js";
import { createInitialConnectionViewState } from "../apps/client/dist/browser/connection-state.js";
import { createDeveloperTelemetrySummary } from "../apps/client/dist/browser/developer-telemetry.js";

function itemById(summary, id) {
  const item = summary.items.find((candidate) => candidate.id === id);
  assert.notEqual(item, undefined, `expected telemetry item ${id}`);
  return item;
}

test("developer telemetry summarizes a private playtest-ready diagnostics connection", () => {
  const state = {
    ...createInitialConnectionViewState(0),
    status: "accepted",
    serverTick: 120,
    lastSnapshotTick: 120,
    lastRttMs: 24,
    observedTickRateHz: 60,
    observedSnapshotRateHz: 60,
    sessionId: 1,
    connectedSlots: 1,
    lastAcknowledgedInputSequence: 8,
    predictedLocalEntityPosition: {
      x: 0,
      y: 0,
      z: -4
    },
    predictionCorrectionMagnitude: 0.05,
    lastReconciledSnapshotTick: 120,
    remoteEntityCount: 1,
    remoteInterpolationBufferedSnapshotCount: 3,
    representativeRemoteEntityId: 2,
    representativeRemoteEntityPosition: {
      x: 1.5,
      y: 0,
      z: -3
    },
    loadoutProfileId: LOADOUT_PROFILE_ID.halcyon,
    loadoutStatus: LOADOUT_STATUS.accepted,
    loadoutRejectReason: LOADOUT_REJECT_REASON.none,
    weaponProfileId: LOADOUT_PROFILE_ID.halcyon,
    weaponAmmoInMagazine: 24,
    weaponMagazineSize: 24,
    weaponReloading: false,
    matchRoster: [{ sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 }],
    lastFireResultSequence: 3,
    lastFireAccepted: true,
    lastFireHit: false,
    lastFireRejectReason: FIRE_REJECT_REASON.none,
    localHealth: 100,
    localMaxHealth: 100,
    localAlive: true,
    roundId: 1,
    roundPhase: ROUND_PHASE.active,
    roundOutcome: ROUND_OUTCOME.none,
    lastRoundServerTick: 120,
    error: undefined
  };

  const summary = createDeveloperTelemetrySummary(state);

  assert.equal(summary.overallStatus, "ok");
  assert.equal(summary.readyForPrivatePlaytest, true);
  assert.equal(itemById(summary, "connection").status, "ok");
  assert.equal(itemById(summary, "cadence").status, "ok");
  assert.equal(itemById(summary, "prediction").status, "ok");
  assert.equal(itemById(summary, "remote-interpolation").status, "ok");
  assert.equal(itemById(summary, "loadout").status, "ok");
  assert.equal(itemById(summary, "weapon").status, "ok");
  assert.equal(itemById(summary, "fire").status, "ok");
  assert.equal(itemById(summary, "combat").status, "ok");
  assert.equal(itemById(summary, "round").status, "ok");
  assert.equal(itemById(summary, "roster").status, "ok");
  assert.equal(itemById(summary, "errors").status, "ok");
});

test("developer telemetry flags missing live systems as waiting without inventing failures", () => {
  const summary = createDeveloperTelemetrySummary(createInitialConnectionViewState(0));

  assert.equal(summary.overallStatus, "waiting");
  assert.equal(summary.readyForPrivatePlaytest, false);
  assert.equal(itemById(summary, "connection").status, "waiting");
  assert.equal(itemById(summary, "cadence").status, "waiting");
  assert.equal(itemById(summary, "remote-interpolation").status, "waiting");
  assert.match(itemById(summary, "remote-interpolation").summary, /second diagnostics client/i);
});

test("developer telemetry surfaces rejects and errors as local diagnostics only", () => {
  const state = {
    ...createInitialConnectionViewState(0),
    status: "accepted",
    serverTick: 40,
    lastSnapshotTick: 40,
    observedTickRateHz: 60,
    observedSnapshotRateHz: 60,
    loadoutStatus: LOADOUT_STATUS.rejected,
    loadoutRejectReason: LOADOUT_REJECT_REASON.roundLocked,
    lastFireResultSequence: 4,
    lastFireAccepted: false,
    lastFireRejectReason: FIRE_REJECT_REASON.roundInactive,
    localHealth: 0,
    localMaxHealth: 100,
    localAlive: false,
    roundId: 2,
    roundPhase: ROUND_PHASE.ended,
    roundOutcome: ROUND_OUTCOME.elimination,
    error: "socket closed"
  };

  const summary = createDeveloperTelemetrySummary(state);

  assert.equal(summary.overallStatus, "error");
  assert.equal(summary.readyForPrivatePlaytest, false);
  assert.equal(itemById(summary, "loadout").status, "warn");
  assert.match(itemById(summary, "loadout").summary, /rejected/i);
  assert.equal(itemById(summary, "fire").status, "warn");
  assert.match(itemById(summary, "fire").summary, /rejected/i);
  assert.equal(itemById(summary, "combat").status, "warn");
  assert.match(itemById(summary, "combat").summary, /dead/i);
  assert.equal(itemById(summary, "round").status, "ok");
  assert.equal(itemById(summary, "errors").status, "error");
});
