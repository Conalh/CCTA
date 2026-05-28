import type { ProtocolMessage } from "./protocol.js";

export type TransportUnsubscribe = () => void;

export type TransportMessageHandler = (message: ProtocolMessage) => void;
export type TransportCloseHandler = () => void;

export interface MessageTransport {
  readonly id: string;
  send(message: ProtocolMessage): void | Promise<void>;
  onMessage(handler: TransportMessageHandler): TransportUnsubscribe;
  onClose(handler: TransportCloseHandler): TransportUnsubscribe;
  close(): void | Promise<void>;
}
