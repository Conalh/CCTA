import { startTransportLoopServer } from "./transport-loop-server.js";

const host = process.env.BREACHLINE_SERVER_HOST ?? "127.0.0.1";
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

console.log(`transport loop server listening on ${server.url} at ${tickRateHz}Hz`);
if (server.clientUrl !== undefined) {
  console.log(`browser dev view available at ${server.clientUrl}`);
}

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
