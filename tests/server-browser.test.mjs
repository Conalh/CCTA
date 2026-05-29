import assert from "node:assert/strict";
import test from "node:test";

import {
  RECENT_SERVERS_LIMIT,
  SERVER_BROWSER_BUILD_ID,
  addRecentServer,
  buildServerBrowserEntries,
  countServerBrowserTabs,
  fetchRegistryMatches,
  filterServerBrowserEntriesByTab,
  formatPingCell,
  formatPlayersCell,
  isFavoriteServer,
  parseManualJoinTarget,
  readFavoriteServers,
  readRecentServers,
  resolveMenuPanel,
  sortServerBrowserEntries,
  toggleFavoriteServer
} from "../apps/client/dist/playtest/server-browser.js";

test("resolveMenuPanel validates the requested panel and defaults to servers", () => {
  assert.equal(resolveMenuPanel("settings"), "settings");
  assert.equal(resolveMenuPanel("controls"), "controls");
  assert.equal(resolveMenuPanel("servers"), "servers");
  assert.equal(resolveMenuPanel("nonsense"), "servers");
  assert.equal(resolveMenuPanel(undefined), "servers");
});

test("parseManualJoinTarget accepts ws addresses and derives ws from a playtest link", () => {
  assert.deepEqual(parseManualJoinTarget("ws://192.168.1.69:8787"), {
    ok: true,
    joinUrl: "ws://192.168.1.69:8787"
  });
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
  assert.equal(parseManualJoinTarget("not a url").ok, false);
  assert.equal(parseManualJoinTarget("ftp://example.com").ok, false);
  assert.equal(parseManualJoinTarget(42).ok, false);
});

test("addRecentServer keeps most-recent-first, de-dupes by join URL, and caps the list", () => {
  let recent = [];
  recent = addRecentServer(recent, { joinUrl: "ws://10.0.0.1:8787", name: "One", lastJoinedMs: 1 });
  recent = addRecentServer(recent, { joinUrl: "ws://10.0.0.2:8787", name: "Two", lastJoinedMs: 2 });
  recent = addRecentServer(recent, { joinUrl: "ws://10.0.0.1:8787/", name: "One Again", lastJoinedMs: 3 });
  assert.equal(recent.length, 2);
  assert.deepEqual(recent.map((entry) => entry.name), ["One Again", "Two"]);

  let capped = [];
  for (let index = 0; index < RECENT_SERVERS_LIMIT + 4; index += 1) {
    capped = addRecentServer(capped, { joinUrl: `ws://10.0.0.${index}:8787`, name: `S${index}`, lastJoinedMs: index });
  }
  assert.equal(capped.length, RECENT_SERVERS_LIMIT);
});

test("readRecentServers and readFavoriteServers ignore malformed persisted entries", () => {
  const recent = readRecentServers([
    { joinUrl: "ws://10.0.0.1:8787", name: "Good", lastJoinedMs: 5 },
    { joinUrl: "", name: "No URL" },
    "not an object",
    { joinUrl: "ws://10.0.0.2:8787" }
  ]);
  assert.equal(recent.length, 2);
  assert.equal(recent[1].name, "ws://10.0.0.2:8787");

  const favorites = readFavoriteServers([
    { joinUrl: "ws://10.0.0.1:8787", name: "Fav" },
    { joinUrl: "ws://10.0.0.1:8787/", name: "Dupe" },
    { name: "No URL" }
  ]);
  // The second entry is a normalized duplicate of the first and is dropped.
  assert.equal(favorites.length, 1);
  assert.equal(favorites[0].name, "Fav");
});

test("toggleFavoriteServer adds then removes by normalized join URL", () => {
  let favorites = [];
  favorites = toggleFavoriteServer(favorites, { joinUrl: "ws://10.0.0.1:8787", name: "Fav" });
  assert.equal(favorites.length, 1);
  assert.equal(isFavoriteServer(favorites, "ws://10.0.0.1:8787/"), true);
  favorites = toggleFavoriteServer(favorites, { joinUrl: "ws://10.0.0.1:8787/", name: "Fav" });
  assert.equal(favorites.length, 0);
});

test("buildServerBrowserEntries merges registry, recent, and favorites by normalized join URL", () => {
  const entries = buildServerBrowserEntries({
    registryMatches: [
      { name: "Busy", joinUrl: "ws://10.0.0.2:8787", mapId: "arena-drydock-span", playerCount: 8, capacity: 8 },
      { name: "Open", joinUrl: "ws://10.0.0.1:8787", mapId: "arena-drydock-span", playerCount: 2, capacity: 8 }
    ],
    recentServers: [
      { joinUrl: "ws://10.0.0.1:8787", name: "Open (recent)", lastJoinedMs: 99 },
      { joinUrl: "ws://10.0.0.9:8787", name: "Private LAN", lastJoinedMs: 50 }
    ],
    favorites: [{ joinUrl: "ws://10.0.0.2:8787", name: "Busy" }]
  });

  // Three unique servers: the recent entry for 10.0.0.1 merged with its registry row.
  assert.equal(entries.length, 3);
  const open = entries.find((entry) => entry.joinUrl === "ws://10.0.0.1:8787");
  assert.equal(open.onInternet, true);
  assert.equal(open.isRecent, true);
  assert.equal(open.name, "Open");
  assert.equal(open.mapLabel, "Drydock Span");

  const busy = entries.find((entry) => entry.joinUrl === "ws://10.0.0.2:8787");
  assert.equal(busy.full, true);
  assert.equal(busy.isFavorite, true);

  const lan = entries.find((entry) => entry.joinUrl === "ws://10.0.0.9:8787");
  assert.equal(lan.onInternet, false);
  assert.equal(lan.isRecent, true);
  assert.equal(lan.name, "Private LAN");
});

test("filterServerBrowserEntriesByTab and countServerBrowserTabs partition the entries", () => {
  const entries = buildServerBrowserEntries({
    registryMatches: [{ name: "Pub", joinUrl: "ws://10.0.0.1:8787", mapId: "arena-drydock-span", playerCount: 1, capacity: 8 }],
    recentServers: [{ joinUrl: "ws://10.0.0.9:8787", name: "Recent", lastJoinedMs: 1 }],
    favorites: [{ joinUrl: "ws://10.0.0.5:8787", name: "Fav" }]
  });

  assert.deepEqual(countServerBrowserTabs(entries), { internet: 1, recent: 1, favorites: 1 });
  assert.equal(filterServerBrowserEntriesByTab(entries, "internet")[0].name, "Pub");
  assert.equal(filterServerBrowserEntriesByTab(entries, "recent")[0].name, "Recent");
  assert.equal(filterServerBrowserEntriesByTab(entries, "favorites")[0].name, "Fav");
});

test("sortServerBrowserEntries orders by a column and sinks unknown values to the bottom", () => {
  const entries = buildServerBrowserEntries({
    registryMatches: [
      { name: "Charlie", joinUrl: "ws://10.0.0.1:8787", mapId: "arena-drydock-span", playerCount: 2, capacity: 8 },
      { name: "Alpha", joinUrl: "ws://10.0.0.2:8787", mapId: "arena-drydock-span", playerCount: 7, capacity: 8 }
    ],
    recentServers: [{ joinUrl: "ws://10.0.0.9:8787", name: "Bravo", lastJoinedMs: 1 }]
  });

  const byName = sortServerBrowserEntries(entries, "name", "asc");
  assert.deepEqual(byName.map((entry) => entry.name), ["Alpha", "Bravo", "Charlie"]);

  // Players descending: the recent-only "Bravo" has no player count and sinks last.
  const byPlayers = sortServerBrowserEntries(entries, "players", "desc");
  assert.deepEqual(byPlayers.map((entry) => entry.name), ["Alpha", "Charlie", "Bravo"]);
});

test("cell formatters render players, ping, and unknown values", () => {
  const [withData] = buildServerBrowserEntries({
    registryMatches: [{ name: "S", joinUrl: "ws://10.0.0.1:8787", mapId: "arena-drydock-span", playerCount: 3, capacity: 8 }]
  });
  assert.equal(formatPlayersCell(withData), "3/8");
  assert.equal(formatPingCell(42.6), "43");
  assert.equal(formatPingCell(undefined), "—");

  const [recentOnly] = buildServerBrowserEntries({
    recentServers: [{ joinUrl: "ws://10.0.0.9:8787", name: "R", lastJoinedMs: 1 }]
  });
  assert.equal(formatPlayersCell(recentOnly), "—");
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
