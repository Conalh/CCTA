import {
  decodeProtocolMessage,
  encodeProtocolMessage,
  type MessageTransport,
  type ProtocolMessage,
  type TransportCloseHandler,
  type TransportMessageHandler,
  type TransportUnsubscribe
} from "@breachline/shared";

export async function connectBrowserWebSocketFallback(url: string): Promise<MessageTransport> {
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener(
      "open",
      () => {
        resolve();
      },
      { once: true }
    );
    socket.addEventListener(
      "error",
      () => {
        reject(new Error(`Unable to connect to ${url}`));
      },
      { once: true }
    );
  });

  return createBrowserWebSocketTransport(`browser-${crypto.randomUUID()}`, socket);
}

export function createBrowserWebSocketTransport(id: string, socket: WebSocket): MessageTransport {
  const messageHandlers = new Set<TransportMessageHandler>();
  const closeHandlers = new Set<TransportCloseHandler>();

  socket.addEventListener("message", (event) => {
    if (!(event.data instanceof ArrayBuffer)) {
      socket.close(1003, "Invalid protocol payload.");
      return;
    }

    const message = decodeProtocolMessage(event.data);
    for (const handler of messageHandlers) {
      handler(message);
    }
  });

  socket.addEventListener("close", () => {
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
