import assert from "node:assert/strict";
import test from "node:test";

import {
  REMOTE_PLAYER_PRESENTATION_HEIGHT_METERS,
  createRemotePlayerPresentationModels
} from "../apps/client/dist/playtest/remote-player-presentation.js";

const forbiddenIdentityPattern = /weapon|gun|rifle|pistol|knife|grenade|ammo|reload|uniform|faction|team|counter|terror/i;

function remotePlaceholder(overrides = {}) {
  return {
    entityId: 101,
    id: "remote-101",
    position: [1.5, 0, -2],
    sessionId: 11,
    shape: "remote-placeholder",
    slotIndex: 1,
    sourceTick: 42,
    yawRadians: Math.PI / 2,
    ...overrides
  };
}

test("remote player presentation builds a readable abstract stand-in from interpolation data", () => {
  const models = createRemotePlayerPresentationModels({
    highlightedRemoteEntityId: undefined,
    remotePlaceholders: [remotePlaceholder()]
  });

  assert.equal(models.length, 1);
  assert.equal(models[0].entityId, 101);
  assert.equal(models[0].sourceTick, 42);
  assert.deepEqual(models[0].position, [1.5, 0, -2]);
  assert.equal(Math.abs(models[0].yawRadians - Math.PI / 2) < 0.000001, true);
  assert.equal(models[0].heightMeters >= 1.7, true);
  assert.equal(models[0].heightMeters, REMOTE_PLAYER_PRESENTATION_HEIGHT_METERS);
  assert.equal(models[0].parts.some((part) => part.role === "body"), true);
  assert.equal(models[0].parts.some((part) => part.role === "facing-marker"), true);
  assert.equal(models[0].parts.some((part) => part.role === "target-center"), true);
  assert.equal(models[0].parts.some((part) => part.role === "hit-accent"), true);
  assert.doesNotMatch(JSON.stringify(models[0]), forbiddenIdentityPattern);
});

test("remote player presentation exposes hit accent state and compact diagnostics metadata", () => {
  const models = createRemotePlayerPresentationModels({
    highlightedRemoteEntityId: 102,
    remotePlaceholders: [
      remotePlaceholder({ entityId: 101, id: "remote-101", sourceTick: 40 }),
      remotePlaceholder({ entityId: 102, id: "remote-102", position: [3, 0, -2], sourceTick: 41 })
    ]
  });

  const normal = models.find((model) => model.entityId === 101);
  const highlighted = models.find((model) => model.entityId === 102);

  assert.equal(models.length, 2);
  assert.equal(normal?.highlighted, false);
  assert.equal(highlighted?.highlighted, true);
  assert.equal(highlighted?.sourceTick, 41);
  assert.equal(highlighted?.parts.find((part) => part.role === "hit-accent")?.visible, true);
  assert.equal(normal?.parts.find((part) => part.role === "hit-accent")?.visible, false);
});

test("remote player presentation ignores unusable placeholder data without poisoning models", () => {
  const models = createRemotePlayerPresentationModels({
    highlightedRemoteEntityId: 101,
    remotePlaceholders: [
      remotePlaceholder({ entityId: 0 }),
      remotePlaceholder({ entityId: 102, position: [Number.NaN, 0, 0] }),
      remotePlaceholder({ entityId: 103, sessionId: 0 }),
      remotePlaceholder({ entityId: 104, id: "remote-104", position: [4, 0, -1] })
    ]
  });

  assert.equal(models.length, 1);
  assert.equal(models[0].entityId, 104);
  assert.equal(models[0].highlighted, false);
});
