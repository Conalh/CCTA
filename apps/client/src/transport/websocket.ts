import { randomUUID } from "node:crypto";
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
import { WebSocket, type RawData } from "ws";

export async function connectWebSocketFallback(url: string): Promise<MessageTransport> {
  const socket = new WebSocket(url);

  await new Promise<void>((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });

  return createWebSocketClientTransport(`client-${randomUUID()}`, socket);
}

export function createWebSocketClientTransport(id: string, socket: WebSocket): MessageTransport {
  const messageHandlers = new Set<TransportMessageHandler>();
  const closeHandlers = new Set<TransportCloseHandler>();

  socket.on("message", (data) => {
    const message = decodeProtocolMessage(readWebSocketPacket(data));
    for (const handler of messageHandlers) {
      handler(message);
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
