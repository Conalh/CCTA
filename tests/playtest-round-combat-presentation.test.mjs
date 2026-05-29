import assert from "node:assert/strict";
import test from "node:test";

import {
  COMBAT_EVENT_KIND,
  ROUND_EVENT_KIND,
  ROUND_OUTCOME,
  ROUND_PHASE
} from "../packages/shared/dist/index.js";
import {
  ROUND_COMBAT_PRESENTATION_CUE_DURATION_MS,
  createInitialRoundCombatPresentationState,
  updateRoundCombatPresentationState
} from "../apps/client/dist/playtest/round-combat-presentation.js";

const forbiddenHudPattern = /score|team|economy|buy|cash|money|weapon|ammo|reload|objective/i;

test("round combat presentation formats existing active round and local health diagnostics", () => {
  const presentation = updateRoundCombatPresentationState(
    createInitialRoundCombatPresentationState(),
    {
      lastCombatEventKind: COMBAT_EVENT_KIND.none,
      lastRoundEventKind: ROUND_EVENT_KIND.active,
      lastRoundServerTick: 60,
      localAlive: true,
      localHealth: 75,
      localMaxHealth: 100,
      nowMs: 1000,
      roundId: 3,
      roundOutcome: ROUND_OUTCOME.none,
      roundPhase: ROUND_PHASE.active
    }
  );

  assert.equal(presentation.roundPhaseLabel, "active");
  assert.equal(presentation.roundOutcomeLabel, "none");
  assert.equal(presentation.roundTransitionLabel, "-");
  assert.equal(presentation.resetCueLabel, "-");
  assert.equal(presentation.localHealthLabel, "75/100");
  assert.equal(presentation.localLifeLabel, "alive");
  assert.equal(presentation.localCombatEventLabel, "none");
  assert.equal(presentation.presentationTone, "active");
  assert.equal(forbiddenHudPattern.test(Object.values(presentation).join(" ")), false);
});

test("round combat presentation keeps a short transition cue for phase changes", () => {
  assert.equal(ROUND_COMBAT_PRESENTATION_CUE_DURATION_MS >= 1800, true);

  let presentation = updateRoundCombatPresentationState(
    createInitialRoundCombatPresentationState(),
    {
      lastRoundEventKind: ROUND_EVENT_KIND.setup,
      lastRoundServerTick: 4,
      nowMs: 100,
      roundId: 1,
      roundOutcome: ROUND_OUTCOME.none,
      roundPhase: ROUND_PHASE.setup
    }
  );

  presentation = updateRoundCombatPresentationState(presentation, {
    lastRoundEventKind: ROUND_EVENT_KIND.active,
    lastRoundServerTick: 5,
    nowMs: 250,
    roundId: 1,
    roundOutcome: ROUND_OUTCOME.none,
    roundPhase: ROUND_PHASE.active
  });

  assert.equal(presentation.roundTransitionLabel, "setup -> active");
  assert.equal(presentation.roundTransitionActive, true);

  presentation = updateRoundCombatPresentationState(presentation, {
    lastRoundEventKind: ROUND_EVENT_KIND.active,
    lastRoundServerTick: 90,
    nowMs: 251 + ROUND_COMBAT_PRESENTATION_CUE_DURATION_MS,
    roundId: 1,
    roundOutcome: ROUND_OUTCOME.none,
    roundPhase: ROUND_PHASE.active
  });

  assert.equal(presentation.roundTransitionLabel, "-");
  assert.equal(presentation.roundTransitionActive, false);
});

test("round combat presentation surfaces local death and reset cues from server diagnostics", () => {
  let presentation = updateRoundCombatPresentationState(
    createInitialRoundCombatPresentationState(),
    {
      damage: 50,
      deathTick: 44,
      lastCombatEventKind: COMBAT_EVENT_KIND.death,
      lastCombatEventSequence: 7,
      lastCombatEventTick: 44,
      lastRoundEventKind: ROUND_EVENT_KIND.active,
      lastRoundServerTick: 44,
      localAlive: false,
      localHealth: 0,
      localMaxHealth: 100,
      nowMs: 1200,
      respawnEligibleTick: 48,
      roundId: 2,
      roundOutcome: ROUND_OUTCOME.none,
      roundPhase: ROUND_PHASE.active,
      sourceSessionId: 11,
      targetSessionId: 10
    }
  );

  assert.equal(presentation.localHealthLabel, "0/100");
  assert.equal(presentation.localLifeLabel, "dead");
  assert.equal(presentation.localCombatEventLabel, "death by session 11");
  assert.equal(presentation.localCombatCueLabel, "local down");
  assert.equal(presentation.localCombatCueActive, true);
  assert.equal(presentation.presentationTone, "dead");

  presentation = updateRoundCombatPresentationState(presentation, {
    lastRoundEventKind: ROUND_EVENT_KIND.reset,
    lastRoundServerTick: 46,
    nowMs: 1400,
    roundId: 2,
    roundOutcome: ROUND_OUTCOME.elimination,
    roundPhase: ROUND_PHASE.reset,
    roundResetReadyTick: 48
  });

  assert.equal(presentation.roundOutcomeLabel, "elimination");
  assert.equal(presentation.resetCueLabel, "reset in 2 ticks");
  assert.equal(presentation.presentationTone, "reset");
});

test("round combat presentation derives remote hit cue only from existing fire result diagnostics", () => {
  let presentation = updateRoundCombatPresentationState(
    createInitialRoundCombatPresentationState(),
    {
      lastFireAccepted: true,
      lastFireHit: true,
      lastFireResultSequence: 4,
      lastFireTargetEntityId: 202,
      lastFireTargetSessionId: 12,
      localSessionId: 10,
      nowMs: 2000,
      roundOutcome: ROUND_OUTCOME.none,
      roundPhase: ROUND_PHASE.active
    }
  );

  assert.equal(presentation.remoteCombatCueLabel, "remote hit entity 202");
  assert.equal(presentation.remoteCombatCueActive, true);
  assert.equal(presentation.remoteCombatTargetEntityId, 202);
  assert.equal(presentation.remoteCombatTargetSessionId, 12);

  presentation = updateRoundCombatPresentationState(presentation, {
    lastFireAccepted: true,
    lastFireHit: true,
    lastFireResultSequence: 4,
    lastFireTargetEntityId: 202,
    lastFireTargetSessionId: 12,
    localSessionId: 10,
    nowMs: 2001 + ROUND_COMBAT_PRESENTATION_CUE_DURATION_MS,
    roundOutcome: ROUND_OUTCOME.none,
    roundPhase: ROUND_PHASE.active
  });

  assert.equal(presentation.remoteCombatCueLabel, "-");
  assert.equal(presentation.remoteCombatCueActive, false);

  presentation = updateRoundCombatPresentationState(presentation, {
    lastFireAccepted: true,
    lastFireHit: false,
    lastFireResultSequence: 5,
    lastFireTargetEntityId: 0,
    lastFireTargetSessionId: 0,
    localSessionId: 10,
    nowMs: 3000,
    roundOutcome: ROUND_OUTCOME.none,
    roundPhase: ROUND_PHASE.active
  });

  assert.equal(presentation.remoteCombatCueLabel, "-");
  assert.equal(presentation.remoteCombatCueActive, false);
});

test("round combat presentation resolves the server-owned round winner to a roster callsign", () => {
  const rosterEntries = [
    { sessionId: 1, handleId: 1, weaponProfileId: 2, slotIndex: 0 },
    { sessionId: 2, handleId: 2, weaponProfileId: 2, slotIndex: 1 }
  ];

  const resolved = updateRoundCombatPresentationState(createInitialRoundCombatPresentationState(), {
    nowMs: 1000,
    roundId: 4,
    roundOutcome: ROUND_OUTCOME.elimination,
    roundPhase: ROUND_PHASE.ended,
    roundWinnerSessionId: 1,
    rosterEntries
  });
  assert.equal(resolved.roundOutcomeLabel, "elimination");
  assert.equal(resolved.roundWinnerLabel, "Vesper");

  // A winner with no roster entry falls back to a neutral session label.
  const neutral = updateRoundCombatPresentationState(createInitialRoundCombatPresentationState(), {
    nowMs: 1000,
    roundOutcome: ROUND_OUTCOME.elimination,
    roundPhase: ROUND_PHASE.ended,
    roundWinnerSessionId: 9,
    rosterEntries
  });
  assert.equal(neutral.roundWinnerLabel, "session 9");

  // No winner session reported (timeout/none) shows no winner callsign.
  const noWinner = updateRoundCombatPresentationState(createInitialRoundCombatPresentationState(), {
    nowMs: 1000,
    roundOutcome: ROUND_OUTCOME.timeout,
    roundPhase: ROUND_PHASE.ended,
    rosterEntries
  });
  assert.equal(noWinner.roundWinnerLabel, "-");
  assert.equal(forbiddenHudPattern.test(Object.values(resolved).join(" ")), false);
});

test("round combat presentation ignores malformed values without poisoning readouts", () => {
  const presentation = updateRoundCombatPresentationState(
    createInitialRoundCombatPresentationState(),
    {
      damage: Number.NaN,
      lastCombatEventKind: 999,
      lastCombatEventSequence: -1,
      localAlive: undefined,
      localHealth: Number.NaN,
      localMaxHealth: 0,
      nowMs: Number.NaN,
      roundOutcome: 999,
      roundPhase: 999,
      roundResetReadyTick: 2
    }
  );

  assert.equal(presentation.roundPhaseLabel, "unknown 999");
  assert.equal(presentation.roundOutcomeLabel, "unknown 999");
  assert.equal(presentation.localHealthLabel, "-");
  assert.equal(presentation.localLifeLabel, "-");
  assert.equal(presentation.localCombatEventLabel, "unknown 999");
  assert.equal(presentation.localCombatCueLabel, "-");
  assert.equal(presentation.remoteCombatCueLabel, "-");
});
