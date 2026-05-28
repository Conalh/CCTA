import { randomUUID } from "node:crypto";
import { createServer, type RequestListener } from "node:http";
import { type AddressInfo } from "node:net";
import { Buffer } from "node:buffer";

import {
  decodeProtocolMessage,
  encodeProtocolMessage,
  type MessageTransport,
  type ProtocolMessage,
  type TransportCloseHandler,
  type TransportMessageHandler,
  type TransportUnsubscribe
} from "@breachline/shared";
import { WebSocket, WebSocketServer, type RawData } from "ws";

export type WebSocketFallbackServerConfig = Readonly<{
  host: string;
  port: number;
  requestHandler?: RequestListener;
}>;

export type WebSocketFallbackServer = Readonly<{
  httpUrl: string;
  url: string;
  close(): Promise<void>;
}>;

export async function createWebSocketFallbackServer(
  config: WebSocketFallbackServerConfig,
  onSession: (session: MessageTransport) => void
): Promise<WebSocketFallbackServer> {
  const httpServer = createServer(config.requestHandler ?? defaultRequestHandler);
  const webSocketServer = new WebSocketServer({
    server: httpServer
  });

  webSocketServer.on("connection", (socket) => {
    onSession(createWebSocketMessageTransport(`ws-${randomUUID()}`, socket));
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("listening", resolve);
    httpServer.once("error", reject);
    httpServer.listen(config.port, config.host);
  });

  const address = httpServer.address() as AddressInfo;
  const host = address.address === "::" ? "127.0.0.1" : address.address;
  const httpUrl = `http://${host}:${address.port}`;
  const url = `ws://${host}:${address.port}`;

  return {
    httpUrl,
    url,
    close: async () => {
      await new Promise<void>((resolve) => {
        webSocketServer.close(() => {
          resolve();
        });
      });
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  };
}

function defaultRequestHandler(_request: Parameters<RequestListener>[0], response: Parameters<RequestListener>[1]): void {
  response.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end("Not found");
}

export function createWebSocketMessageTransport(id: string, socket: WebSocket): MessageTransport {
  const messageHandlers = new Set<TransportMessageHandler>();
  const closeHandlers = new Set<TransportCloseHandler>();

  socket.on("message", (data) => {
    try {
      const message = decodeProtocolMessage(readWebSocketPacket(data));
      for (const handler of messageHandlers) {
        handler(message);
      }
    } catch {
      socket.close(1003, "Invalid protocol message.");
    }
  });

  socket.on("close", () => {
    for (const handler of closeHandlers) {
      handler();
    }
  });

  return {
    id,
    send(message: ProtocolMessage): void {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(encodeProtocolMessage(message));
      }
    },
    onMessage(handler: TransportMessageHandler): TransportUnsubscribe {
      messageHandlers.add(handler);
      return () => {
        messageHandlers.delete(handler);
      };
    },
    onClose(handler: TransportCloseHandler): TransportUnsubscribe {
      closeHandlers.add(handler);
      return () => {
        closeHandlers.delete(handler);
      };
    },
    close(): void {
      socket.close();
    }
  };
}

function readWebSocketPacket(data: RawData): ArrayBufferView {
  if (Array.isArray(data)) {
    return Buffer.concat(data);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  return data;
}
