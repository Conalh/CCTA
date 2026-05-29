import assert from "node:assert/strict";
import test from "node:test";

import { createRandomId } from "../apps/client/dist/browser/safe-id.js";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("createRandomId uses crypto.randomUUID when available (secure context)", () => {
  const id = createRandomId({ randomUUID: () => "11111111-1111-4111-8111-111111111111" });
  assert.equal(id, "11111111-1111-4111-8111-111111111111");
});

test("createRandomId builds a v4 UUID from getRandomValues in a non-secure context", () => {
  // Mirrors a LAN peer on plain http: no randomUUID, but getRandomValues is present.
  let requestedLength = 0;
  const source = {
    getRandomValues: (array) => {
      requestedLength = array.length;
      for (let i = 0; i < array.length; i += 1) {
        array[i] = (i * 37 + 11) & 0xff;
      }
      return array;
    }
  };

  const id = createRandomId(source);
  assert.match(id, UUID_V4);
  assert.equal(requestedLength, 16);
});

test("createRandomId still returns a unique-enough id with no Web Crypto methods", () => {
  const a = createRandomId({});
  const b = createRandomId({});
  assert.equal(typeof a, "string");
  assert.equal(a.length > 0, true);
  assert.notEqual(a, b);
});

test("createRandomId defaults to the platform crypto and yields a UUID", () => {
  assert.match(createRandomId(), UUID_V4);
});
