import os from "node:os";
import process from "node:process";

import { startTransportLoopServer } from "../apps/server/dist/index.js";
import { createHostMatchUrls, formatHostMatchSummary } from "./host-match-urls.mjs";

// Host a local LAN match. Binds to a LAN-reachable address by default so a second
// human on the same network can open the printed join URL. Local-only: no accounts,
// no hosted services, no analytics, no persistence.
const host = process.env.BREACHLINE_SERVER_HOST ?? "0.0.0.0";
const port = Number(process.env.BREACHLINE_SERVER_PORT ?? 8787);
const tickRateHz = Number(process.env.BREACHLINE_SERVER_TICK_RATE_HZ ?? 60);
const matchCapacityEnv = process.env.BREACHLINE_SERVER_MATCH_CAPACITY;
const matchCapacity = matchCapacityEnv === undefined ? undefined : Number(matchCapacityEnv);
const matchKillTargetEnv = process.env.BREACHLINE_SERVER_MATCH_KILL_TARGET;
const matchKillTarget = matchKillTargetEnv === undefined ? undefined : Number(matchKillTargetEnv);

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

async function shutdown() {
  await server.close();
  process.exit(0);
}

process.once("SIGINT", () => {
  void shutdown();
});
process.once("SIGTERM", () => {
  void shutdown();
});
