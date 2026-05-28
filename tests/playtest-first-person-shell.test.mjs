import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_PERSON_SHELL_MAX_PARTS,
  createFirstPersonShellPresentation,
  formatFirstPersonShellStatus
} from "../apps/client/dist/playtest/first-person-shell.js";

const forbiddenIdentityPattern = /weapon|gun|rifle|pistol|knife|grenade|terror|counter|police|ak|m4/i;

test("first-person shell creates original camera-attached placeholder parts", () => {
  const shell = createFirstPersonShellPresentation({
    enabled: true,
    fireIntentActive: false,
    lookPitchRadians: 0,
    motionContact: "idle",
    nowMs: 1000
  });

  assert.equal(shell.status, "visible");
  assert.equal(shell.activity, "idle");
  assert.equal(shell.attachedTo, "camera");
  assert.equal(shell.cameraSpace, true);
  assert.equal(shell.parts.length > 0, true);
  assert.equal(shell.parts.length <= FIRST_PERSON_SHELL_MAX_PARTS, true);
  assert.equal(shell.parts.some((part) => part.kind === "left-hand"), true);
  assert.equal(shell.parts.some((part) => part.kind === "right-hand"), true);
  assert.equal(shell.parts.some((part) => part.kind === "equipment-core"), true);

  for (const part of shell.parts) {
    assert.doesNotMatch(part.id, forbiddenIdentityPattern);
    assert.equal(part.position.every(Number.isFinite), true);
    assert.equal(part.rotation.every(Number.isFinite), true);
    assert.equal(part.scale.every((value) => Number.isFinite(value) && value > 0), true);
    assert.equal(part.position[2] < -0.1, true);
  }
});

test("first-person shell remains camera-local while motion and look vary", () => {
  const idle = createFirstPersonShellPresentation({
    enabled: true,
    fireIntentActive: false,
    lookPitchRadians: 0,
    motionContact: "idle",
    nowMs: 1000
  });
  const moving = createFirstPersonShellPresentation({
    enabled: true,
    fireIntentActive: false,
    lookPitchRadians: 0.4,
    motionContact: "moving",
    nowMs: 1100
  });
  const blocked = createFirstPersonShellPresentation({
    enabled: true,
    fireIntentActive: false,
    lookPitchRadians: -0.4,
    motionContact: "blocked",
    nowMs: 1200
  });

  assert.equal(moving.cameraSpace, true);
  assert.equal(blocked.cameraSpace, true);
  assert.notDeepEqual(moving.parts.map((part) => part.position), idle.parts.map((part) => part.position));
  assert.equal(Math.max(...moving.parts.flatMap((part) => part.position.map(Math.abs))) < 1.25, true);
  assert.equal(Math.max(...blocked.parts.flatMap((part) => part.position.map(Math.abs))) < 1.25, true);
});

test("first-person shell fire intent is presentation-only and does not expose authority fields", () => {
  const shell = createFirstPersonShellPresentation({
    enabled: true,
    fireIntentActive: true,
    lookPitchRadians: 0.1,
    motionContact: "moving",
    nowMs: 1400
  });
  const serialized = JSON.stringify(shell);

  assert.equal(shell.status, "visible");
  assert.equal(shell.activity, "fire-intent");
  assert.equal(formatFirstPersonShellStatus(shell), "visible fire-intent");
  assert.doesNotMatch(serialized, /damage|health|ammo|reload|target|hit|score/i);
});

test("first-person shell hides cleanly when disabled or given unusable values", () => {
  const hidden = createFirstPersonShellPresentation({
    enabled: false,
    fireIntentActive: true,
    lookPitchRadians: Number.NaN,
    motionContact: "sliding",
    nowMs: Number.POSITIVE_INFINITY
  });

  assert.equal(hidden.status, "hidden");
  assert.equal(hidden.activity, "idle");
  assert.equal(hidden.parts.length, 0);
  assert.equal(formatFirstPersonShellStatus(hidden), "hidden");
});
