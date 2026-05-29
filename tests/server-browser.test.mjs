import assert from "node:assert/strict";
import test from "node:test";

import {
  RECENT_SERVERS_LIMIT,
  SERVER_BROWSER_BUILD_ID,
  addRecentServer,
  createServerBrowserView,
  fetchRegistryMatches,
  parseManualJoinTarget,
  readRecentServers
} from "../apps/client/dist/playtest/server-browser.js";

test("parseManualJoinTarget accepts ws addresses and derives ws from a playtest link", () => {
  assert.deepEqual(parseManualJoinTarget("ws://192.168.1.69:8787"), {
    ok: true,
    joinUrl: "ws://192.168.1.69:8787"
  });
  assert.deepEqual(parseManualJoinTarget("wss://play.example.com:8787/"), {
    ok: true,
    joinUrl: "wss://play.example.com:8787"
  });
  // A pasted playtest page URL resolves to the matching ws join URL.
  assert.deepEqual(parseManualJoinTarget("http://192.168.1.69:8787/playtest.html"), {
    ok: true,
    joinUrl: "ws://192.168.1.69:8787"
  });
  assert.deepEqual(parseManualJoinTarget("https://play.example.com/playtest.html"), {
    ok: true,
    joinUrl: "wss://play.example.com"
  });
});

test("parseManualJoinTarget rejects empty and malformed input with a readable reason", () => {
  assert.equal(parseManualJoinTarget("").ok, false);
  assert.equal(parseManualJoinTarget("   ").ok, false);
  assert.equal(parseManualJoinTarget("not a url").ok, false);
  assert.equal(parseManualJoinTarget("ftp://example.com").ok, false);
  assert.equal(parseManualJoinTarget(42).ok, false);
});

test("addRecentServer keeps most-recent-first, de-dupes by join URL, and caps the list", () => {
  let recent = [];
  recent = addRecentServer(recent, { joinUrl: "ws://10.0.0.1:8787", name: "One", lastJoinedMs: 1 });
  recent = addRecentServer(recent, { joinUrl: "ws://10.0.0.2:8787", name: "Two", lastJoinedMs: 2 });
  assert.deepEqual(recent.map((entry) => entry.name), ["Two", "One"]);

  // Re-joining an existing server (even with a trailing slash) moves it to the front without duplicating.
  recent = addRecentServer(recent, { joinUrl: "ws://10.0.0.1:8787/", name: "One Again", lastJoinedMs: 3 });
  assert.equal(recent.length, 2);
  assert.deepEqual(recent.map((entry) => entry.name), ["One Again", "Two"]);

  // The list is bounded at the limit.
  let capped = [];
  for (let index = 0; index < RECENT_SERVERS_LIMIT + 4; index += 1) {
    capped = addRecentServer(capped, { joinUrl: `ws://10.0.0.${index}:8787`, name: `S${index}`, lastJoinedMs: index });
  }
  assert.equal(capped.length, RECENT_SERVERS_LIMIT);
});

test("readRecentServers ignores malformed persisted entries", () => {
  const parsed = readRecentServers([
    { joinUrl: "ws://10.0.0.1:8787", name: "Good", lastJoinedMs: 5 },
    { joinUrl: "", name: "No URL" },
    { name: "Missing URL" },
    "not an object",
    { joinUrl: "ws://10.0.0.2:8787" }
  ]);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, "Good");
  // A missing name falls back to the join URL.
  assert.equal(parsed[1].name, "ws://10.0.0.2:8787");
  assert.equal(readRecentServers("nope").length, 0);
});

test("createServerBrowserView lists registry matches first and appends only unseen recent servers", () => {
  const view = createServerBrowserView({
    registryMatches: [
      { name: "Busy", joinUrl: "ws://10.0.0.2:8787", mapId: "arena-drydock-span", playerCount: 8, capacity: 8 },
      { name: "Open", joinUrl: "ws://10.0.0.1:8787", mapId: "arena-drydock-span", playerCount: 2, capacity: 8 }
    ],
    recentServers: [
      { joinUrl: "ws://10.0.0.1:8787", name: "Open (recent dupe)", lastJoinedMs: 99 },
      { joinUrl: "ws://10.0.0.9:8787", name: "Private LAN", lastJoinedMs: 50 }
    ]
  });

  assert.equal(view.rows.length, 3);
  assert.equal(view.registryCount, 2);
  assert.equal(view.recentCount, 1);
  // Registry rows come first, in the order the registry returned them.
  assert.deepEqual(view.rows.slice(0, 2).map((row) => row.name), ["Busy", "Open"]);
  // The full match is flagged; its detail shows players and a friendly map name.
  assert.equal(view.rows[0].full, true);
  assert.equal(view.rows[0].detail, "8/8 · Drydock Span");
  // The recent server already in the registry is de-duped; only the private one remains.
  assert.equal(view.rows[2].name, "Private LAN");
  assert.equal(view.rows[2].source, "recent");
});

test("createServerBrowserView reports an empty browser when there is nothing to show", () => {
  const view = createServerBrowserView({});
  assert.equal(view.isEmpty, true);
  assert.equal(view.rows.length, 0);
});

function stubFetch(handler) {
  return async (url) => handler(url);
}

test("fetchRegistryMatches requests the build-filtered list and parses matches", async () => {
  let requestedUrl;
  const result = await fetchRegistryMatches({
    registryUrl: "http://127.0.0.1:8788/",
    fetchImpl: stubFetch((url) => {
      requestedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          matches: [
            { name: "Live", joinUrl: "ws://10.0.0.1:8787", mapId: "arena-drydock-span", playerCount: 1, capacity: 8 }
          ]
        })
      };
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].name, "Live");
  // The trailing slash is normalized and the client's build id gates compatibility.
  assert.equal(requestedUrl, `http://127.0.0.1:8788/matches?build=${encodeURIComponent(SERVER_BROWSER_BUILD_ID)}`);
});

test("fetchRegistryMatches reports honest errors for unset, unreachable, and failing registries", async () => {
  assert.deepEqual(await fetchRegistryMatches({ registryUrl: "  " }), {
    ok: false,
    error: "Set a registry address to browse public matches."
  });

  const unreachable = await fetchRegistryMatches({
    registryUrl: "http://127.0.0.1:8788",
    fetchImpl: stubFetch(() => {
      throw new Error("connection refused");
    })
  });
  assert.equal(unreachable.ok, false);
  assert.match(unreachable.error, /Could not reach/);

  const failing = await fetchRegistryMatches({
    registryUrl: "http://127.0.0.1:8788",
    fetchImpl: stubFetch(() => ({ ok: false, status: 503, json: async () => ({}) }))
  });
  assert.equal(failing.ok, false);
  assert.match(failing.error, /status 503/);
});
