export const WEBTRANSPORT_PHASE_2_BLOCKER =
  "Phase 2 uses the WebSocket fallback because this stack does not yet provide a local HTTP/3 plus TLS WebTransport server.";

export async function connectWebTransportClient(): Promise<never> {
  throw new Error(WEBTRANSPORT_PHASE_2_BLOCKER);
}
