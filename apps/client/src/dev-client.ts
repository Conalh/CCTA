import { createClientRuntime } from "./runtime.js";
import { connectWebSocketFallback } from "./transport/websocket.js";

const serverUrl = process.env.BREACHLINE_SERVER_URL ?? process.argv[2] ?? "ws://127.0.0.1:8787";
const lifetimeMs = Number(process.env.BREACHLINE_CLIENT_LIFETIME_MS ?? 1500);

const transport = await connectWebSocketFallback(serverUrl);
const client = createClientRuntime(transport, {
  clientName: "dev-client",
  log: (message) => {
    console.log(`[client] ${message}`);
  }
});

client.start();

setTimeout(() => {
  client.sendPing();
  client.sendInputPlaceholder();
}, 25);

setTimeout(() => {
  client.close();
}, lifetimeMs);

transport.onClose(() => {
  process.exit(0);
});
