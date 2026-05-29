import assert from "node:assert/strict";
import test from "node:test";

import { createHostMatchUrls, formatHostMatchSummary } from "../scripts/host-match-urls.mjs";

test("host match urls expose only LAN-reachable IPv4 join addresses", () => {
  const urls = createHostMatchUrls({
    port: 8787,
    interfaces: {
      lo: [{ family: "IPv4", internal: true, address: "127.0.0.1" }],
      eth0: [
        { family: "IPv4", internal: false, address: "192.168.1.20" },
        { family: "IPv6", internal: false, address: "fe80::1" }
      ],
      // A numeric family (some Node versions) is still recognized as IPv4.
      wlan0: [{ family: 4, internal: false, address: "10.0.0.5" }]
    }
  });

  // Loopback and IPv6 are excluded; both LAN IPv4 addresses are surfaced.
  assert.deepEqual(
    urls.map((entry) => entry.address),
    ["192.168.1.20", "10.0.0.5"]
  );
  assert.equal(urls[0].playtestUrl, "http://192.168.1.20:8787/playtest.html");
  assert.equal(urls[0].serverUrl, "ws://192.168.1.20:8787");

  const summary = formatHostMatchSummary(urls, { host: "0.0.0.0", port: 8787 });
  assert.match(summary, /Local-only LAN match/);
  assert.match(summary, /no accounts, no hosted services, no analytics/i);
  assert.match(summary, /http:\/\/192\.168\.1\.20:8787\/playtest\.html/);
});

test("host match summary stays honest when no LAN address is available", () => {
  const urls = createHostMatchUrls({ port: 8787, interfaces: { lo: [{ family: "IPv4", internal: true, address: "127.0.0.1" }] } });
  assert.deepEqual(urls, []);

  const summary = formatHostMatchSummary(urls, { host: "0.0.0.0", port: 8787 });
  assert.match(summary, /No LAN address detected/);
  assert.doesNotMatch(summary, /Share with players/);
});
