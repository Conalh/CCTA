import assert from "node:assert/strict";

import { createClientRuntime, connectWebSocketFallback } from "../apps/client/dist/index.js";
import { startTransportLoopServer } from "../apps/server/dist/index.js";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const server = await startTransportLoopServer({
  host: "127.0.0.1",
  port: 0,
  tickRateHz: 30
});

try {
  const transport = await connectWebSocketFallback(server.url);
  const client = createClientRuntime(transport, {
    clientName: "transport-loop-smoke",
    now: () => Date.now()
  });

  client.start();
  await wait(20);
  client.sendPing();
  client.sendInputPlaceholder();
  await wait(140);

  const kinds = new Set(client.receivedMessages().map((message) => message.kind));
  assert.equal(kinds.has("protocol.accept"), true);
  assert.equal(kinds.has("match.assigned"), true);
  assert.equal(kinds.has("match.update"), true);
  assert.equal(kinds.has("input.ack"), true);
  assert.equal(kinds.has("pong"), true);
  assert.equal(kinds.has("server.tick"), true);
  assert.equal(kinds.has("server.snapshot"), true);

  const snapshot = client.receivedMessages().find((message) => message.kind === "server.snapshot");
  assert.equal(snapshot.worldId, 1);
  assert.equal(snapshot.entityCount, 1);
  assert.deepEqual(snapshot.entities.map((entity) => entity.sessionId), [1]);
  assert.equal(Number.isFinite(snapshot.entities[0].x), true);
  assert.equal(Number.isFinite(snapshot.entities[0].y), true);
  assert.equal(Number.isFinite(snapshot.entities[0].z), true);
  assert.equal(Number.isFinite(snapshot.entities[0].yaw), true);

  client.close();
  console.log(`transport loop smoke passed via WebSocket fallback at ${server.url}`);
} finally {
  await server.close();
}
