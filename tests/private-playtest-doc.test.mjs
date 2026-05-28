import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("private playtest notes describe only local-dev safe packaging", async () => {
  const text = await readFile("docs/PRIVATE_PLAYTEST.md", "utf8");

  assert.match(text, /npm\.cmd run dev/);
  assert.match(text, /http:\/\/127\.0\.0\.1:8787/);
  assert.match(text, /WebSocket fallback/i);
  assert.match(text, /WebTransport remains pending/i);
  assert.match(text, /Do not collect accounts/i);
  assert.match(text, /No analytics/i);
  assert.match(text, /What testers should record/i);
  assert.match(text, /Connection/i);
  assert.match(text, /Round/i);
  assert.match(text, /Combat/i);
  assert.match(text, /Sandbox/i);
});
