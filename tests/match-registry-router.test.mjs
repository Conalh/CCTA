import assert from "node:assert/strict";
import test from "node:test";

import { createMatchRegistryState } from "../packages/shared/dist/index.js";
import { handleMatchRegistryRequest } from "../apps/registry/dist/index.js";

function request(method, path, overrides = {}) {
  return {
    method,
    path,
    query: {},
    body: undefined,
    ...overrides
  };
}

function announcementBody(overrides = {}) {
  return {
    name: "Router Lobby",
    joinUrl: "ws://127.0.0.1:8787",
    mapId: "arena-drydock-span",
    buildId: "0.1.0",
    playerCount: 1,
    capacity: 8,
    ...overrides
  };
}

test("registry router reports health with the live match count", () => {
  const result = handleMatchRegistryRequest({
    state: createMatchRegistryState(),
    request: request("GET", "/health"),
    nowMs: 1000
  });

  assert.equal(result.response.status, 200);
  assert.equal(result.response.body.ok, true);
  assert.equal(result.response.body.liveMatches, 0);
});

test("registry router announces a valid match and lists it back", () => {
  const announced = handleMatchRegistryRequest({
    state: createMatchRegistryState(),
    request: request("POST", "/announce", { body: announcementBody() }),
    nowMs: 1000
  });
  assert.equal(announced.response.status, 200);
  assert.equal(announced.response.body.ok, true);
  assert.equal(typeof announced.response.body.id, "string");

  const listed = handleMatchRegistryRequest({
    state: announced.state,
    request: request("GET", "/matches"),
    nowMs: 1000
  });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.response.body.matches.length, 1);
  assert.equal(listed.response.body.matches[0].name, "Router Lobby");
});

test("registry router rejects a hostile announcement with a 400 and no state change", () => {
  const state = createMatchRegistryState();
  const result = handleMatchRegistryRequest({
    state,
    request: request("POST", "/announce", { body: announcementBody({ joinUrl: "http://127.0.0.1:8787" }) }),
    nowMs: 1000
  });

  assert.equal(result.response.status, 400);
  assert.equal(result.response.body.ok, false);
  assert.equal(result.state.entries.length, 0);
});

test("registry router heartbeats a known id and 404s an unknown one", () => {
  const announced = handleMatchRegistryRequest({
    state: createMatchRegistryState(),
    request: request("POST", "/announce", { body: announcementBody() }),
    nowMs: 1000
  });
  const id = announced.response.body.id;

  const beat = handleMatchRegistryRequest({
    state: announced.state,
    request: request("POST", "/heartbeat", { body: { id, playerCount: 5 } }),
    nowMs: 2000
  });
  assert.equal(beat.response.status, 200);

  const listed = handleMatchRegistryRequest({
    state: beat.state,
    request: request("GET", "/matches"),
    nowMs: 2000
  });
  assert.equal(listed.response.body.matches[0].playerCount, 5);

  const unknown = handleMatchRegistryRequest({
    state: beat.state,
    request: request("POST", "/heartbeat", { body: { id: "ws://nope" } }),
    nowMs: 2000
  });
  assert.equal(unknown.response.status, 404);
});

test("registry router sweeps stale matches before serving any route", () => {
  const announced = handleMatchRegistryRequest({
    state: createMatchRegistryState(),
    request: request("POST", "/announce", { body: announcementBody() }),
    nowMs: 0
  });

  // Far past the TTL, the listing is empty and the swept state drops the entry.
  const listed = handleMatchRegistryRequest({
    state: announced.state,
    request: request("GET", "/matches"),
    nowMs: 10_000,
    ttlMs: 5000
  });
  assert.equal(listed.response.body.matches.length, 0);
  assert.equal(listed.state.entries.length, 0);
});

test("registry router removes a match and answers unknown routes with 404", () => {
  const announced = handleMatchRegistryRequest({
    state: createMatchRegistryState(),
    request: request("POST", "/announce", { body: announcementBody() }),
    nowMs: 1000
  });
  const id = announced.response.body.id;

  const removed = handleMatchRegistryRequest({
    state: announced.state,
    request: request("POST", "/remove", { body: { id } }),
    nowMs: 1000
  });
  assert.equal(removed.response.status, 200);
  assert.equal(removed.state.entries.length, 0);

  const unknownRoute = handleMatchRegistryRequest({
    state: removed.state,
    request: request("GET", "/nope"),
    nowMs: 1000
  });
  assert.equal(unknownRoute.response.status, 404);
});
