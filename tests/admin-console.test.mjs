import assert from "node:assert/strict";
import test from "node:test";

import { parseAdminCommand } from "../apps/server/dist/index.js";

test("admin parser accepts the space, set, and underscore forms alike", () => {
  const expected = { kind: "buytime", seconds: 3 };
  assert.deepEqual(parseAdminCommand("buytime 3"), expected);
  assert.deepEqual(parseAdminCommand("set buytime 3"), expected);
  assert.deepEqual(parseAdminCommand("buytime_3"), expected);
  assert.deepEqual(parseAdminCommand("  BUYTIME   3 "), expected);
});

test("admin parser reads each setting command", () => {
  assert.deepEqual(parseAdminCommand("roundtime 90"), { kind: "roundtime", seconds: 90 });
  assert.deepEqual(parseAdminCommand("maxrounds 6"), { kind: "maxrounds", value: 6 });
  assert.deepEqual(parseAdminCommand("startmoney 800"), { kind: "startmoney", value: 800 });
  assert.deepEqual(parseAdminCommand("killreward 300"), { kind: "killreward", value: 300 });
  assert.deepEqual(parseAdminCommand("roundwin 3250"), { kind: "roundwin", value: 3250 });
  assert.deepEqual(parseAdminCommand("roundloss 1400"), { kind: "roundloss", value: 1400 });
  assert.deepEqual(parseAdminCommand("buytime 0"), { kind: "buytime", seconds: 0 }); // buy time may be zero
});

test("admin parser reads friendly fire and reset actions", () => {
  assert.deepEqual(parseAdminCommand("friendlyfire off"), { kind: "friendlyfire", enabled: false });
  assert.deepEqual(parseAdminCommand("friendlyfire on"), { kind: "friendlyfire", enabled: true });
  assert.deepEqual(parseAdminCommand("roundreset"), { kind: "roundreset" });
  assert.deepEqual(parseAdminCommand("matchreset"), { kind: "matchreset", delaySeconds: 0 });
  assert.deepEqual(parseAdminCommand("matchreset_3"), { kind: "matchreset", delaySeconds: 3 });
  assert.deepEqual(parseAdminCommand("help"), { kind: "help" });
  assert.deepEqual(parseAdminCommand("status"), { kind: "status" });
});

test("admin parser rejects malformed commands without throwing", () => {
  assert.equal(parseAdminCommand("bogus").kind, "unknown");
  assert.equal(parseAdminCommand("buytime").kind, "unknown"); // missing value
  assert.equal(parseAdminCommand("maxrounds 0").kind, "unknown"); // below minimum
  assert.equal(parseAdminCommand("roundtime 0").kind, "unknown"); // round must be positive
  assert.equal(parseAdminCommand("friendlyfire maybe").kind, "unknown");
  assert.equal(parseAdminCommand("").kind, "unknown");
});
