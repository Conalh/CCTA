// Runnable entry for the match registry. Self-hostable and dependency-free:
// `npm run registry:serve`. Local by default (127.0.0.1); set
// BREACHLINE_REGISTRY_HOST=0.0.0.0 to accept hosts/clients across a network.
// Discovery only — no accounts, no analytics, no persistence.

import process from "node:process";

import { startMatchRegistryServer } from "./service.js";

const host = process.env.BREACHLINE_REGISTRY_HOST ?? "127.0.0.1";
const port = Number(process.env.BREACHLINE_REGISTRY_PORT ?? 8788);
const ttlMsEnv = process.env.BREACHLINE_REGISTRY_TTL_MS;
const ttlMs = ttlMsEnv === undefined ? undefined : Number(ttlMsEnv);

const server = await startMatchRegistryServer({ host, port, ttlMs });

console.log("# Breachline — Match Registry");
console.log("");
console.log("Discovery only: lists opt-in public matches. No accounts, no analytics, no persistence.");
console.log("");
console.log(`Listening on ${server.url}`);
console.log(`- Hosts announce:   POST ${server.url}/announce`);
console.log(`- Clients browse:   GET  ${server.url}/matches`);
console.log("");
console.log("Press Ctrl+C to stop.");

async function shutdown(): Promise<void> {
  await server.close();
  process.exit(0);
}

process.once("SIGINT", () => {
  void shutdown();
});
process.once("SIGTERM", () => {
  void shutdown();
});
