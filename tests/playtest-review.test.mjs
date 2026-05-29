import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createPlaytestReviewInstructions } from "../scripts/playtest-review-instructions.mjs";

test("playtest review instructions print local-only evidence collection steps", () => {
  const text = createPlaytestReviewInstructions();

  assert.match(text, /Phase 25 Networked Playtest Feel Review/);
  assert.match(text, /npm\.cmd run dev/);
  assert.match(text, /npm\.cmd run playtest:harness/);
  assert.match(text, /http:\/\/127\.0\.0\.1:8787\/playtest\.html/);
  assert.match(text, /WebSocket fallback/);
  assert.match(text, /WebTransport remains pending/i);
  assert.match(text, /does not upload telemetry/i);
  assert.match(text, /local-assets\/playtest-review/i);
  assert.match(text, /connection reaches accepted/i);
  assert.match(text, /server-owned position changes/i);
  assert.match(text, /prediction correction current\/max/i);
  assert.match(text, /remote placeholder/i);
  assert.match(text, /accepted hit proof/i);
  assert.match(text, /automated harness/i);
  assert.match(text, /__BREACHLINE_PLAYTEST_DIAGNOSTICS__/);
  assert.match(text, /reconnect count/i);
  assert.match(text, /last error/i);
  assert.match(text, /desktop and mobile/i);
  assert.match(text, /npm\.cmd run host:match/);
  assert.match(text, /first playable-match proof/i);
  assert.match(text, /match-over banner/i);
});

test("playtest review command is exposed as an npm script", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(packageJson.scripts["playtest:review"], "node scripts/playtest-review.mjs");
});

test("playtest review checklist documents the required feel-review categories", async () => {
  const text = await readFile("docs/NETWORKED_PLAYTEST_REVIEW.md", "utf8");

  assert.match(text, /Connection/i);
  assert.match(text, /Local Movement Feel/i);
  assert.match(text, /Prediction Correction Behavior/i);
  assert.match(text, /Remote Placeholder Visibility/i);
  assert.match(text, /Accepted Hit Proof/i);
  assert.match(text, /__BREACHLINE_PLAYTEST_DIAGNOSTICS__/);
  assert.match(text, /Reconnect Behavior/i);
  assert.match(text, /Desktop And Mobile Usability/i);
  assert.match(text, /Known Limitations/i);
  assert.match(text, /local-assets\/playtest-review/i);
  assert.match(text, /No analytics/i);
  assert.match(text, /WebTransport remains pending/i);
});
