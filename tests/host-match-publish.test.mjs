import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHostAnnouncement,
  createRegistryPublisher,
  resolvePublishJoinUrl
} from "../scripts/host-match-publish.mjs";

test("resolvePublishJoinUrl prefers an explicit public URL over LAN addresses", () => {
  const resolved = resolvePublishJoinUrl({
    explicitUrl: "wss://play.example.com:8787",
    lanServerUrls: ["ws://192.168.1.69:8787", "ws://172.22.192.1:8787"]
  });
  assert.equal(resolved, "wss://play.example.com:8787");
});

test("resolvePublishJoinUrl falls back to the first LAN server URL", () => {
  const resolved = resolvePublishJoinUrl({
    lanServerUrls: ["ws://192.168.1.69:8787", "ws://172.22.192.1:8787"]
  });
  assert.equal(resolved, "ws://192.168.1.69:8787");
});

test("resolvePublishJoinUrl ignores a non-WebSocket explicit URL and returns undefined when nothing is valid", () => {
  const fellBack = resolvePublishJoinUrl({
    explicitUrl: "http://play.example.com",
    lanServerUrls: ["ws://192.168.1.69:8787"]
  });
  assert.equal(fellBack, "ws://192.168.1.69:8787");

  assert.equal(resolvePublishJoinUrl({ explicitUrl: "not a url", lanServerUrls: [] }), undefined);
  assert.equal(resolvePublishJoinUrl({}), undefined);
});

test("buildHostAnnouncement shapes the registry announcement from host config", () => {
  const announcement = buildHostAnnouncement({
    name: "Conal's Drydock",
    joinUrl: "ws://192.168.1.69:8787",
    mapId: "arena-drydock-span",
    buildId: "proto-1",
    playerCount: 2,
    capacity: 8
  });
  assert.deepEqual(announcement, {
    name: "Conal's Drydock",
    joinUrl: "ws://192.168.1.69:8787",
    mapId: "arena-drydock-span",
    buildId: "proto-1",
    playerCount: 2,
    capacity: 8
  });
});

function fakeFetch(responses) {
  const calls = [];
  async function fetchImpl(url, options) {
    calls.push({ url, options });
    const next = responses.shift() ?? { ok: true, body: { ok: true } };
    return {
      ok: next.ok,
      status: next.status ?? (next.ok ? 200 : 400),
      json: async () => next.body
    };
  }
  return { fetchImpl, calls };
}

test("registry publisher announces and parses the assigned match id", async () => {
  const { fetchImpl, calls } = fakeFetch([{ ok: true, body: { ok: true, id: "ws://192.168.1.69:8787/" } }]);
  const publisher = createRegistryPublisher({ registryUrl: "http://registry.local/", fetchImpl });

  const result = await publisher.announce({ name: "Lobby", joinUrl: "ws://192.168.1.69:8787" });
  assert.equal(result.ok, true);
  assert.equal(result.id, "ws://192.168.1.69:8787/");

  assert.equal(calls.length, 1);
  // Trailing slash on the configured registry URL is normalized away.
  assert.equal(calls[0].url, "http://registry.local/announce");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), { name: "Lobby", joinUrl: "ws://192.168.1.69:8787" });
});

test("registry publisher reports a rejected announcement without throwing", async () => {
  const { fetchImpl } = fakeFetch([{ ok: false, status: 400, body: { ok: false, reason: "bad join url" } }]);
  const publisher = createRegistryPublisher({ registryUrl: "http://registry.local", fetchImpl });

  const result = await publisher.announce({ name: "Lobby" });
  assert.equal(result.ok, false);
  assert.equal(result.id, undefined);
  assert.equal(result.reason, "bad join url");
});

test("registry publisher posts heartbeat and remove with the match id", async () => {
  const { fetchImpl, calls } = fakeFetch([
    { ok: true, body: { ok: true } },
    { ok: true, body: { ok: true } }
  ]);
  const publisher = createRegistryPublisher({ registryUrl: "http://registry.local", fetchImpl });

  await publisher.heartbeat("match-1", 5);
  await publisher.remove("match-1");

  assert.equal(calls[0].url, "http://registry.local/heartbeat");
  assert.deepEqual(JSON.parse(calls[0].options.body), { id: "match-1", playerCount: 5 });
  assert.equal(calls[1].url, "http://registry.local/remove");
  assert.deepEqual(JSON.parse(calls[1].options.body), { id: "match-1" });
});

test("createRegistryPublisher requires a registry URL and a fetch implementation", () => {
  assert.throws(() => createRegistryPublisher({ registryUrl: "", fetchImpl: () => {} }), /registry URL/);
  // A non-function fetch (that is not null/undefined, which would fall back to the
  // platform fetch) is rejected by the type guard.
  assert.throws(() => createRegistryPublisher({ registryUrl: "http://x", fetchImpl: 123 }), /fetch/);
});
