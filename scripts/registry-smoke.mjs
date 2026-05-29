import assert from "node:assert/strict";

import { startMatchRegistryServer } from "../apps/registry/dist/index.js";

const server = await startMatchRegistryServer({ host: "127.0.0.1", port: 0, ttlMs: 5000 });

async function call(method, path, body) {
  const response = await fetch(`${server.url}${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await response.json();
  return { status: response.status, json };
}

try {
  const health = await call("GET", "/health");
  assert.equal(health.status, 200);
  assert.equal(health.json.ok, true);
  assert.equal(health.json.liveMatches, 0);

  const announce = await call("POST", "/announce", {
    name: "Smoke Lobby",
    joinUrl: "ws://127.0.0.1:8787",
    mapId: "arena-drydock-span",
    buildId: "smoke",
    playerCount: 1,
    capacity: 8
  });
  assert.equal(announce.status, 200);
  assert.equal(announce.json.ok, true);
  const id = announce.json.id;
  assert.equal(typeof id, "string");

  // A hostile announcement (non-WebSocket join URL) is rejected.
  const rejected = await call("POST", "/announce", {
    name: "Bad",
    joinUrl: "http://127.0.0.1:8787",
    mapId: "arena-drydock-span",
    buildId: "smoke",
    playerCount: 0,
    capacity: 8
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.json.ok, false);

  const listed = await call("GET", "/matches");
  assert.equal(listed.status, 200);
  assert.equal(listed.json.matches.length, 1);
  assert.equal(listed.json.matches[0].name, "Smoke Lobby");
  // The announce path validates and normalizes the join URL to one canonical form.
  assert.equal(listed.json.matches[0].joinUrl, "ws://127.0.0.1:8787/");

  // A build filter hides matches a client of that build could not join.
  const filtered = await call("GET", "/matches?build=other");
  assert.equal(filtered.json.matches.length, 0);

  const heartbeat = await call("POST", "/heartbeat", { id, playerCount: 4 });
  assert.equal(heartbeat.status, 200);
  assert.equal(heartbeat.json.ok, true);
  const afterBeat = await call("GET", "/matches");
  assert.equal(afterBeat.json.matches[0].playerCount, 4);

  const unknownBeat = await call("POST", "/heartbeat", { id: "ws://nope" });
  assert.equal(unknownBeat.status, 404);

  const removed = await call("POST", "/remove", { id });
  assert.equal(removed.status, 200);
  const afterRemove = await call("GET", "/matches");
  assert.equal(afterRemove.json.matches.length, 0);

  console.log(`registry smoke passed at ${server.url}`);
} finally {
  await server.close();
}
