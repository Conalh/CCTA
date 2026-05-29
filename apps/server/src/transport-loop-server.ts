import {
  DEFAULT_SERVER_CONFIG,
  createServerRuntime,
  type ServerRuntime
} from "./runtime.js";
import { createBrowserDevRequestHandler } from "./static-client.js";
import { createFixedTickLoop, type FixedTickLoop } from "./tick-loop.js";
import {
  createWebSocketFallbackServer,
  type WebSocketFallbackServer
} from "./transport/websocket.js";

export type TransportLoopServerConfig = Readonly<{
  host?: string;
  port?: number;
  serveClient?: boolean;
  tickRateHz?: number;
  matchCapacity?: number;
}>;

export type TransportLoopServer = Readonly<{
  clientUrl: string | undefined;
  url: string;
  runtime: ServerRuntime;
  tickLoop: FixedTickLoop;
  close(): Promise<void>;
}>;

export async function startTransportLoopServer(
  config: TransportLoopServerConfig = {}
): Promise<TransportLoopServer> {
  const tickRateHz = config.tickRateHz ?? DEFAULT_SERVER_CONFIG.tickRateHz;
  const runtime = createServerRuntime({ tickRateHz, matchCapacity: config.matchCapacity });
  const tickLoop = createFixedTickLoop({ tickRateHz });
  const webSocketServer = await createWebSocketFallbackServer(
    {
      host: config.host ?? "127.0.0.1",
      port: config.port ?? 8787,
      requestHandler: config.serveClient ? createBrowserDevRequestHandler() : undefined
    },
    (session) => {
      runtime.attachSession(session);
    }
  );

  tickLoop.start((message) => {
    runtime.step(message.tick, message.serverTimeMs);
  });

  return {
    clientUrl: config.serveClient ? webSocketServer.httpUrl : undefined,
    url: webSocketServer.url,
    runtime,
    tickLoop,
    close: () => closeTransportLoopServer(runtime, tickLoop, webSocketServer)
  };
}

async function closeTransportLoopServer(
  runtime: ServerRuntime,
  tickLoop: FixedTickLoop,
  webSocketServer: WebSocketFallbackServer
): Promise<void> {
  tickLoop.stop();
  runtime.close();
  await webSocketServer.close();
}
