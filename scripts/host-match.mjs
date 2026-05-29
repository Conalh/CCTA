import os from "node:os";
import process from "node:process";

import { startTransportLoopServer } from "../apps/server/dist/index.js";
import { DRYDOCK_SPAN_ARENA, PROTOCOL_VERSION } from "../packages/shared/dist/index.js";
import { createHostMatchUrls, formatHostMatchSummary } from "./host-match-urls.mjs";
import { buildHostAnnouncement, createRegistryPublisher, resolvePublishJoinUrl } from "./host-match-publish.mjs";

// Host a local LAN match. Binds to a LAN-reachable address by default so a second
// human on the same network can open the printed join URL. Publishing to a match
// registry is OPT-IN: set BREACHLINE_REGISTRY_URL to advertise this match in the
// server browser, otherwise the match stays local and unlisted.
const host = process.env.BREACHLINE_SERVER_HOST ?? "0.0.0.0";
const port = Number(process.env.BREACHLINE_SERVER_PORT ?? 8787);
const tickRateHz = Number(process.env.BREACHLINE_SERVER_TICK_RATE_HZ ?? 60);
const matchCapacityEnv = process.env.BREACHLINE_SERVER_MATCH_CAPACITY;
const matchCapacity = matchCapacityEnv === undefined ? undefined : Number(matchCapacityEnv);
const matchKillTargetEnv = process.env.BREACHLINE_SERVER_MATCH_KILL_TARGET;
const matchKillTarget = matchKillTargetEnv === undefined ? undefined : Number(matchKillTargetEnv);

const HEARTBEAT_INTERVAL_MS = 10_000;

const server = await startTransportLoopServer({
  host,
  port,
  serveClient: true,
  tickRateHz,
  matchCapacity,
  matchKillTarget
});

const urls = createHostMatchUrls({ interfaces: os.networkInterfaces(), port });
console.log(formatHostMatchSummary(urls, { host, port }));
console.log("");
console.log(`Listening on ${server.url} at ${tickRateHz}Hz. Press Ctrl+C to stop.`);

let registryPublisher;
let publishedMatchId;
let heartbeatTimer;

await publishToRegistryIfRequested();

async function publishToRegistryIfRequested() {
  const registryUrl = process.env.BREACHLINE_REGISTRY_URL;
  if (typeof registryUrl !== "string" || registryUrl.trim().length === 0) {
    return;
  }

  const joinUrl = resolvePublishJoinUrl({
    explicitUrl: process.env.BREACHLINE_PUBLIC_JOIN_URL,
    lanServerUrls: urls.map((entry) => entry.serverUrl)
  });
  if (joinUrl === undefined) {
    console.log("");
    console.log("Registry publish skipped: no public or LAN WebSocket address to advertise.");
    console.log("Set BREACHLINE_PUBLIC_JOIN_URL to your reachable ws(s):// address.");
    return;
  }

  const matchName = process.env.BREACHLINE_MATCH_NAME ?? "Breachline Match";
  const capacity = Number.isInteger(matchCapacity) ? matchCapacity : 8;
  registryPublisher = createRegistryPublisher({ registryUrl });

  try {
    const result = await registryPublisher.announce(
      buildHostAnnouncement({
        name: matchName,
        joinUrl,
        mapId: DRYDOCK_SPAN_ARENA.id,
        buildId: `proto-${PROTOCOL_VERSION}`,
        playerCount: server.runtime.connectedMatchSlotCount(),
        capacity
      })
    );

    if (!result.ok || result.id === undefined) {
      console.log("");
      console.log(`Registry publish rejected: ${result.reason ?? `status ${result.status}`}. Hosting locally anyway.`);
      registryPublisher = undefined;
      return;
    }

    publishedMatchId = result.id;
    console.log("");
    console.log(`Published to registry ${registryUrl} as "${matchName}" (${joinUrl}).`);
    console.log("Other players can find this match in the server browser. Ctrl+C unlists it.");

    heartbeatTimer = setInterval(() => {
      registryPublisher.heartbeat(publishedMatchId, server.runtime.connectedMatchSlotCount()).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
  } catch (error) {
    console.log("");
    console.log(`Registry publish failed (${error instanceof Error ? error.message : String(error)}). Hosting locally anyway.`);
    registryPublisher = undefined;
  }
}

async function shutdown() {
  if (heartbeatTimer !== undefined) {
    clearInterval(heartbeatTimer);
  }
  if (registryPublisher !== undefined && publishedMatchId !== undefined) {
    await registryPublisher.remove(publishedMatchId).catch(() => {});
  }
  await server.close();
  process.exit(0);
}

process.once("SIGINT", () => {
  void shutdown();
});
process.once("SIGTERM", () => {
  void shutdown();
});
