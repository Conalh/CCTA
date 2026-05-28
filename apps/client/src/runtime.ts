import {
  PROTOCOL_VERSION,
  createClientInputPlaceholder,
  type MessageTransport,
  type ProtocolHelloMessage,
  type ProtocolMessage
} from "@breachline/shared";

export type ClientRuntimeConfig = Readonly<{
  clientName: string;
  now?: () => number;
  log?: (message: string) => void;
}>;

export type ClientRuntime = Readonly<{
  start(): void;
  sendPing(): void;
  sendInputPlaceholder(): void;
  receivedMessages(): readonly ProtocolMessage[];
  close(): void;
}>;

export function createProtocolHello(clientName: string): ProtocolHelloMessage {
  return {
    kind: "protocol.hello",
    protocolVersion: PROTOCOL_VERSION,
    clientName
  };
}

export function createClientRuntime(
  transport: MessageTransport,
  config: ClientRuntimeConfig
): ClientRuntime {
  const now = config.now ?? Date.now;
  const log = config.log ?? (() => {});
  const received: ProtocolMessage[] = [];
  let sequence = 0;

  transport.onMessage((message) => {
    received.push(message);
    log(`received ${message.kind}`);
  });

  function start(): void {
    transport.send(createProtocolHello(config.clientName));
  }

  function sendPing(): void {
    sequence += 1;
    transport.send({
      kind: "ping",
      sequence,
      clientTimeMs: now()
    });
  }

  function sendInputPlaceholder(): void {
    sequence += 1;
    transport.send(createClientInputPlaceholder(sequence, now()));
  }

  return {
    start,
    sendPing,
    sendInputPlaceholder,
    receivedMessages: () => received,
    close: () => {
      transport.close();
    }
  };
}
