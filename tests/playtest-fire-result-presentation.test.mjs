import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRE_RESULT_INTENT_DURATION_MS,
  FIRE_RESULT_PRESENTATION_MAX_EFFECTS,
  FIRE_RESULT_REJECT_DURATION_MS,
  FIRE_RESULT_TRACER_DURATION_MS,
  createInitialFireResultPresentationState,
  formatFireResultPresentationStatus,
  updateFireResultPresentationState
} from "../apps/client/dist/playtest/fire-result-presentation.js";

const forbiddenPresentationIdentityPattern = /weapon|gun|rifle|pistol|knife|grenade|ammo|reload|damage|score/i;

function remotePlaceholder(entityId = 101) {
  return {
    entityId,
    id: `remote-${entityId}`,
    position: [1.5, 0, 0],
    sessionId: 11,
    shape: "remote-placeholder",
    slotIndex: 1,
    sourceTick: 22,
    yawRadians: 0
  };
}

test("fire result presentation creates local intent feedback without server authority fields", () => {
  const state = updateFireResultPresentationState(
    createInitialFireResultPresentationState(),
    {
      nowMs: 1000,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: 0,
      lastFireIntentSequence: 7,
      lastFireIntentTimeMs: 980
    }
  );

  assert.equal(state.lastVisualizedFireSequence, undefined);
  assert.equal(state.lastVisualizedIntentSequence, 7);
  assert.equal(state.resultState, "none");
  assert.equal(state.activeTracerCount, 0);
  assert.equal(state.activeEffects.some((effect) => effect.kind === "local-intent-pulse"), true);
  assert.doesNotMatch(JSON.stringify(state), forbiddenPresentationIdentityPattern);
});

test("fire result presentation visualizes authoritative accepted hit results against remote placeholders", () => {
  const state = updateFireResultPresentationState(
    createInitialFireResultPresentationState(),
    {
      nowMs: 1200,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: -Math.PI / 2,
      lastFireIntentSequence: 4,
      lastFireIntentTimeMs: 1180,
      lastFireResultSequence: 4,
      lastFireAccepted: true,
      lastFireDistance: 1.5,
      lastFireHit: true,
      lastFireTargetEntityId: 101,
      lastFireTargetSessionId: 11,
      remotePlaceholders: [remotePlaceholder(101)]
    }
  );

  const tracer = state.activeEffects.find((effect) => effect.kind === "authority-tracer");
  const impact = state.activeEffects.find((effect) => effect.kind === "impact-marker");

  assert.equal(state.lastVisualizedFireSequence, 4);
  assert.equal(state.resultState, "accepted-hit");
  assert.equal(state.hitState, "hit");
  assert.equal(state.highlightedRemoteEntityId, 101);
  assert.equal(state.activeTracerCount, 1);
  assert.equal(formatFireResultPresentationStatus(state), "accepted hit");
  assert.notEqual(tracer, undefined);
  assert.notEqual(impact, undefined);
  assert.deepEqual(tracer.start, [0, 1.62, 0]);
  assert.deepEqual(tracer.end, [1.5, 1.62, 0]);
  assert.deepEqual(impact.position, [1.5, 1.62, 0]);
});

test("fire result presentation visualizes miss and rejected results distinctly", () => {
  let state = updateFireResultPresentationState(
    createInitialFireResultPresentationState(),
    {
      nowMs: 1500,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: 0,
      lastFireResultSequence: 5,
      lastFireAccepted: true,
      lastFireDistance: 0,
      lastFireHit: false
    }
  );

  assert.equal(state.resultState, "accepted-miss");
  assert.equal(state.hitState, "miss");
  assert.equal(state.activeEffects.some((effect) => effect.kind === "authority-tracer"), true);
  assert.equal(state.activeEffects.some((effect) => effect.kind === "impact-marker"), true);

  state = updateFireResultPresentationState(state, {
    nowMs: 1600,
    localCameraPosition: [0, 1.62, 0],
    localPitchRadians: 0,
    localYawRadians: 0,
    lastFireResultSequence: 6,
    lastFireAccepted: false,
    lastFireDistance: 0,
    lastFireHit: false
  });

  assert.equal(state.resultState, "rejected");
  assert.equal(state.hitState, "rejected");
  assert.equal(state.activeEffects.some((effect) => effect.kind === "reject-marker"), true);
});

test("fire result presentation bounds active effects and expires old visuals", () => {
  let state = createInitialFireResultPresentationState();

  for (let sequence = 1; sequence <= 12; sequence += 1) {
    state = updateFireResultPresentationState(state, {
      nowMs: 2000 + sequence,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: 0,
      lastFireResultSequence: sequence,
      lastFireAccepted: true,
      lastFireDistance: 2,
      lastFireHit: false
    });
    assert.equal(state.activeEffects.length <= FIRE_RESULT_PRESENTATION_MAX_EFFECTS, true);
  }

  state = updateFireResultPresentationState(state, {
    nowMs: 2000 + 12 + FIRE_RESULT_TRACER_DURATION_MS + 1,
    localCameraPosition: [0, 1.62, 0],
    localPitchRadians: 0,
    localYawRadians: 0,
    lastFireResultSequence: 12,
    lastFireAccepted: true,
    lastFireDistance: 2,
    lastFireHit: false
  });

  assert.equal(state.activeEffects.length, 0);
  assert.equal(state.activeTracerCount, 0);
});

test("fire result presentation ignores stale or malformed result data without poisoning state", () => {
  const initial = updateFireResultPresentationState(
    createInitialFireResultPresentationState(),
    {
      nowMs: 3000,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: 0,
      lastFireResultSequence: 8,
      lastFireAccepted: true,
      lastFireDistance: 3,
      lastFireHit: false
    }
  );
  const stale = updateFireResultPresentationState(initial, {
    nowMs: 3010,
    localCameraPosition: [0, 1.62, 0],
    localPitchRadians: 0,
    localYawRadians: 0,
    lastFireResultSequence: 7,
    lastFireAccepted: true,
    lastFireDistance: 3,
    lastFireHit: true,
    lastFireTargetEntityId: 101,
    remotePlaceholders: [remotePlaceholder(101)]
  });
  const malformed = updateFireResultPresentationState(initial, {
    nowMs: 3020,
    localCameraPosition: [Number.NaN, 1.62, 0],
    localPitchRadians: 0,
    localYawRadians: 0,
    lastFireResultSequence: 9,
    lastFireAccepted: true,
    lastFireDistance: Number.NaN,
    lastFireHit: true
  });

  assert.equal(stale.lastVisualizedFireSequence, 8);
  assert.equal(stale.resultState, "accepted-miss");
  assert.equal(malformed.lastVisualizedFireSequence, 8);
  assert.equal(malformed.resultState, "accepted-miss");
});

test("fire result presentation keeps intent, tracer, and reject visuals readable through short live frames", () => {
  let intentState = updateFireResultPresentationState(
    createInitialFireResultPresentationState(),
    {
      nowMs: 4000,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: 0,
      lastFireIntentSequence: 12,
      lastFireIntentTimeMs: 4000
    }
  );
  intentState = updateFireResultPresentationState(intentState, {
    nowMs: 4310,
    localCameraPosition: [0, 1.62, 0],
    localPitchRadians: 0,
    localYawRadians: 0,
    lastFireIntentSequence: 12,
    lastFireIntentTimeMs: 4000
  });
  const intentPulse = intentState.activeEffects.find((effect) => effect.kind === "local-intent-pulse");
  assert.equal(FIRE_RESULT_INTENT_DURATION_MS >= 420, true);
  assert.notEqual(intentPulse, undefined);
  assert.equal(intentPulse.opacity >= 0.24, true);
  assert.equal(intentPulse.radiusMeters >= 0.08, true);

  let missState = updateFireResultPresentationState(
    createInitialFireResultPresentationState(),
    {
      nowMs: 5000,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: 0,
      lastFireResultSequence: 13,
      lastFireAccepted: true,
      lastFireDistance: 0,
      lastFireHit: false
    }
  );
  missState = updateFireResultPresentationState(missState, {
    nowMs: 5450,
    localCameraPosition: [0, 1.62, 0],
    localPitchRadians: 0,
    localYawRadians: 0,
    lastFireResultSequence: 13,
    lastFireAccepted: true,
    lastFireDistance: 0,
    lastFireHit: false
  });
  const missTracer = missState.activeEffects.find((effect) => effect.kind === "authority-tracer");
  assert.equal(FIRE_RESULT_TRACER_DURATION_MS >= 760, true);
  assert.notEqual(missTracer, undefined);
  assert.equal(missTracer.opacity >= 0.18, true);
  assert.equal(missTracer.radiusMeters >= 0.03, true);

  const rejected = updateFireResultPresentationState(
    createInitialFireResultPresentationState(),
    {
      nowMs: 6000,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: 0,
      lastFireResultSequence: 14,
      lastFireAccepted: false,
      lastFireDistance: 0,
      lastFireHit: false
    }
  );
  const rejectMarker = rejected.activeEffects.find((effect) => effect.kind === "reject-marker");
  assert.equal(FIRE_RESULT_REJECT_DURATION_MS >= 640, true);
  assert.notEqual(rejectMarker, undefined);
  assert.equal(rejectMarker.opacity >= 0.82, true);
  assert.equal(rejectMarker.radiusMeters >= 0.1, true);
});

test("fire result presentation clears expired effects and remote target accents", () => {
  let state = updateFireResultPresentationState(
    createInitialFireResultPresentationState(),
    {
      nowMs: 7000,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: -Math.PI / 2,
      lastFireResultSequence: 15,
      lastFireAccepted: true,
      lastFireDistance: 1.5,
      lastFireHit: true,
      lastFireTargetEntityId: 101,
      lastFireTargetSessionId: 11,
      remotePlaceholders: [remotePlaceholder(101)]
    }
  );
  assert.equal(state.highlightedRemoteEntityId, 101);
  assert.equal(state.expiredEffectCount, 0);

  state = updateFireResultPresentationState(state, {
    nowMs: 7900,
    localCameraPosition: [0, 1.62, 0],
    localPitchRadians: 0,
    localYawRadians: -Math.PI / 2,
    lastFireResultSequence: 15,
    lastFireAccepted: true,
    lastFireDistance: 1.5,
    lastFireHit: true,
    lastFireTargetEntityId: 101,
    lastFireTargetSessionId: 11,
    remotePlaceholders: [remotePlaceholder(101)]
  });

  assert.equal(state.activeEffects.length, 0);
  assert.equal(state.activeTracerCount, 0);
  assert.equal(state.highlightedRemoteEntityId, undefined);
  assert.equal(state.expiredEffectCount >= 2, true);
});

test("fire result presentation expires accepted hit and miss paths cleanly", () => {
  for (const scenario of [
    {
      accepted: true,
      hit: false,
      expectedResultState: "accepted-miss",
      expectedHitState: "miss",
      sequence: 21
    },
    {
      accepted: true,
      hit: true,
      expectedResultState: "accepted-hit",
      expectedHitState: "hit",
      sequence: 22,
      targetEntityId: 101,
      targetSessionId: 11
    }
  ]) {
    let state = updateFireResultPresentationState(
      createInitialFireResultPresentationState(),
      {
        nowMs: 9000,
        localCameraPosition: [0, 1.62, 0],
        localPitchRadians: 0,
        localYawRadians: scenario.hit ? -Math.PI / 2 : 0,
        lastFireResultSequence: scenario.sequence,
        lastFireAccepted: scenario.accepted,
        lastFireDistance: 1.5,
        lastFireHit: scenario.hit,
        lastFireTargetEntityId: scenario.targetEntityId,
        lastFireTargetSessionId: scenario.targetSessionId,
        remotePlaceholders: scenario.hit ? [remotePlaceholder(101)] : []
      }
    );

    assert.equal(state.resultState, scenario.expectedResultState);
    assert.equal(state.hitState, scenario.expectedHitState);
    assert.equal(state.activeTracerCount, 1);

    state = updateFireResultPresentationState(state, {
      nowMs: 9000 + FIRE_RESULT_TRACER_DURATION_MS + 1,
      localCameraPosition: [0, 1.62, 0],
      localPitchRadians: 0,
      localYawRadians: scenario.hit ? -Math.PI / 2 : 0,
      lastFireResultSequence: scenario.sequence,
      lastFireAccepted: scenario.accepted,
      lastFireDistance: 1.5,
      lastFireHit: scenario.hit,
      lastFireTargetEntityId: scenario.targetEntityId,
      lastFireTargetSessionId: scenario.targetSessionId,
      remotePlaceholders: scenario.hit ? [remotePlaceholder(101)] : []
    });

    assert.equal(state.activeEffects.length, 0);
    assert.equal(state.activeTracerCount, 0);
    assert.equal(state.highlightedRemoteEntityId, undefined);
    assert.equal(state.expiredEffectCount, 2);
  }
});
