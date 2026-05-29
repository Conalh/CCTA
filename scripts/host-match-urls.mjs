// Pure helpers for the local "host a match" flow. They turn a Node
// os.networkInterfaces() map into the LAN-reachable join URLs a second human can
// open, and format a human-readable summary. Local-only: no accounts, no hosted
// services, no analytics — these are plain LAN addresses on the host machine.

export function createHostMatchUrls(input = {}) {
  const port = readPort(input.port);
  const interfaces = input.interfaces ?? {};
  const addresses = [];

  for (const list of Object.values(interfaces)) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (const entry of list) {
      if (!isLanIpv4(entry)) {
        continue;
      }
      addresses.push(entry.address);
    }
  }

  const unique = [...new Set(addresses)];
  return unique.map((address) => ({
    address,
    serverUrl: `ws://${address}:${port}`,
    playtestUrl: `http://${address}:${port}/playtest.html`
  }));
}

export function formatHostMatchSummary(urls, options = {}) {
  const port = readPort(options.port);
  const host = typeof options.host === "string" && options.host.length > 0 ? options.host : "0.0.0.0";
  const lines = [
    "# Breachline — Host a Match",
    "",
    "Local-only LAN match. No accounts, no hosted services, no analytics —",
    "only share these URLs with players on a network you trust.",
    "",
    `Server bound to ${host}:${port}`,
    `On this machine: http://127.0.0.1:${port}/playtest.html`
  ];

  const lanUrls = Array.isArray(urls) ? urls : [];
  if (lanUrls.length === 0) {
    lines.push("");
    lines.push("No LAN address detected — only this machine can connect (loopback).");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("Share with players on your LAN:");
  for (const url of lanUrls) {
    lines.push(`- ${url.playtestUrl}  (server ${url.serverUrl})`);
  }
  return lines.join("\n");
}

function isLanIpv4(entry) {
  // Node reports family as "IPv4" (current) or 4 (some versions). Skip loopback and
  // internal interfaces; those are not reachable by another machine.
  if (entry === null || typeof entry !== "object") {
    return false;
  }
  const isIpv4 = entry.family === "IPv4" || entry.family === 4;
  return isIpv4 && entry.internal === false && typeof entry.address === "string" && entry.address.length > 0;
}

function readPort(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : 8787;
}
