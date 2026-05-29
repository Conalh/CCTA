import type {
  MessageTransport,
  ProtocolMessage,
  TransportCloseHandler,
  TransportMessageHandler,
  TransportUnsubscribe
} from "@breachline/shared";

export type NetworkSimulationProfileId =
  | "baseline"
  | "moderate-latency"
  | "jitter"
  | "small-drop";

export type NetworkSimulationProfile = Readonly<{
  id: NetworkSimulationProfileId;
  label: string;
  baseLatencyMs: number;
  jitterMs: number;
  dropRate: number;
  seed: number;
  dropMessageKinds: readonly string[];
}>;

export type NetworkSimulationRandom = () => number;

const NETWORK_SIMULATION_PROFILES: readonly NetworkSimulationProfile[] = [
  {
    id: "baseline",
    label: "Baseline",
    baseLatencyMs: 0,
    jitterMs: 0,
    dropRate: 0,
    seed: 1,
    dropMessageKinds: []
  },
  {
    id: "moderate-latency",
    label: "Moderate latency",
    baseLatencyMs: 100,
    jitterMs: 0,
    dropRate: 0,
    seed: 101,
    dropMessageKinds: []
  },
  {
    id: "jitter",
    label: "Jitter",
    baseLatencyMs: 70,
    jitterMs: 45,
    dropRate: 0,
    seed: 202,
    dropMessageKinds: []
  },
  {
    id: "small-drop",
    label: "Small drop",
    baseLatencyMs: 70,
    jitterMs: 25,
    dropRate: 0.04,
    seed: 303,
    dropMessageKinds: ["client.input", "ping", "pong", "server.tick", "server.snapshot"]
  }
] as const;

export function readNetworkSimulationProfile(id: string | undefined): NetworkSimulationProfile {
  return cloneProfile(
    NETWORK_SIMULATION_PROFILES.find((profile) => profile.id === id) ?? NETWORK_SIMULATION_PROFILES[0]
  );
}

export function readNetworkSimulationProfileFromSearch(search: string): NetworkSimulationProfile {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const profile = readNetworkSimulationProfile(params.get("networkProfile") ?? undefined);
  const seed = readPositiveInteger(params.get("networkSeed"));
  return seed === undefined ? profile : { ...profile, seed };
}

export function createNetworkSimulationRandom(seed: number): NetworkSimulationRandom {
  let state = readSeed(seed);
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function computeNetworkSimulationDelayMs(
  profile: NetworkSimulationProfile,
  random: NetworkSimulationRandom
): number {
  const baseLatencyMs = readNonNegativeFinite(profile.baseLatencyMs);
  const jitterMs = readNonNegativeFinite(profile.jitterMs);
  if (baseLatencyMs === 0 && jitterMs === 0) {
    return 0;
  }

  const jitterOffset = jitterMs === 0 ? 0 : (random() * 2 - 1) * jitterMs;
  return Math.max(0, Math.round(baseLatencyMs + jitterOffset));
}

export function shouldSimulateMessageDrop(
  profile: NetworkSimulationProfile,
  message: Pick<ProtocolMessage, "kind">,
  random: NetworkSimulationRandom
): boolean {
  const dropRate = clamp(readNonNegativeFinite(profile.dropRate), 0, 1);
  if (dropRate <= 0 || !profile.dropMessageKinds.includes(message.kind)) {
    return false;
  }

  return random() < dropRate;
}

// The unreliable datagram kinds: the inverse of the protocol's ReliableControlMessage type.
// These ride lossy datagrams in the intended transport, so the simulation may freely reorder
// or drop them (the snapshot reducer and server-side fire/input sequencing absorb that).
const UNRELIABLE_MESSAGE_KINDS: ReadonlySet<ProtocolMessage["kind"]> = new Set([
  "client.input",
  "client.fire",
  "server.snapshot"
]);

export function isReliableMessageKind(kind: ProtocolMessage["kind"]): boolean {
  return !UNRELIABLE_MESSAGE_KINDS.has(kind);
}

export type OrderedDelivery = Readonly<{
  deliveryMs: number;
  nextLastReliableDeliveryMs: number;
}>;

// Reliable control messages travel an ordered stream in the intended transport, so a jittered
// delay must never let one overtake an earlier reliable message: clamp its delivery to at least
// the previous reliable delivery. Unreliable kinds keep their independent (reorderable) delay.
export function computeOrderedDeliveryMs(
  nowMs: number,
  delayMs: number,
  reliable: boolean,
  lastReliableDeliveryMs: number
): OrderedDelivery {
  const naturalDeliveryMs = nowMs + Math.max(0, delayMs);
  if (!reliable) {
    return { deliveryMs: naturalDeliveryMs, nextLastReliableDeliveryMs: lastReliableDeliveryMs };
  }

  const deliveryMs = Math.max(naturalDeliveryMs, lastReliableDeliveryMs);
  return { deliveryMs, nextLastReliableDeliveryMs: deliveryMs };
}

export function createNetworkSimulatedTransport(
  inner: MessageTransport,
  profile: NetworkSimulationProfile
): MessageTransport {
  const outboundRandom = createNetworkSimulationRandom(profile.seed);
  const inboundRandom = createNetworkSimulationRandom(profile.seed + 0x9e3779b9);
  const pendingTimers = new Set<ReturnType<typeof globalThis.setTimeout>>();
  let closed = false;
  // The client->server and server->client reliable streams are independent, so each direction
  // tracks its own delivery floor.
  let lastOutboundReliableDeliveryMs = 0;
  let lastInboundReliableDeliveryMs = 0;

  function schedule(callback: () => void, delayMs: number): void {
    if (closed) {
      return;
    }
    if (delayMs <= 0) {
      callback();
      return;
    }

    const timer = globalThis.setTimeout(() => {
      pendingTimers.delete(timer);
      if (!closed) {
        callback();
      }
    }, delayMs);
    pendingTimers.add(timer);
  }

  function clearPendingTimers(): void {
    for (const timer of pendingTimers) {
      globalThis.clearTimeout(timer);
    }
    pendingTimers.clear();
  }

  return {
    id: `${inner.id}:net-${profile.id}`,
    send(message: ProtocolMessage): void {
      if (shouldSimulateMessageDrop(profile, message, outboundRandom)) {
        return;
      }

      const nowMs = clockNowMs();
      const delayMs = computeNetworkSimulationDelayMs(profile, outboundRandom);
      const ordered = computeOrderedDeliveryMs(
        nowMs,
        delayMs,
        isReliableMessageKind(message.kind),
        lastOutboundReliableDeliveryMs
      );
      lastOutboundReliableDeliveryMs = ordered.nextLastReliableDeliveryMs;
      schedule(() => {
        void inner.send(message);
      }, ordered.deliveryMs - nowMs);
    },
    onMessage(handler: TransportMessageHandler): TransportUnsubscribe {
      return inner.onMessage((message) => {
        if (shouldSimulateMessageDrop(profile, message, inboundRandom)) {
          return;
        }

        const nowMs = clockNowMs();
        const delayMs = computeNetworkSimulationDelayMs(profile, inboundRandom);
        const ordered = computeOrderedDeliveryMs(
          nowMs,
          delayMs,
          isReliableMessageKind(message.kind),
          lastInboundReliableDeliveryMs
        );
        lastInboundReliableDeliveryMs = ordered.nextLastReliableDeliveryMs;
        schedule(() => {
          handler(message);
        }, ordered.deliveryMs - nowMs);
      });
    },
    onClose(handler: TransportCloseHandler): TransportUnsubscribe {
      return inner.onClose(handler);
    },
    close(): void {
      closed = true;
      clearPendingTimers();
      void inner.close();
    }
  };
}

function clockNowMs(): number {
  return typeof globalThis.performance?.now === "function" ? globalThis.performance.now() : Date.now();
}

function cloneProfile(profile: NetworkSimulationProfile): NetworkSimulationProfile {
  return {
    ...profile,
    dropMessageKinds: [...profile.dropMessageKinds]
  };
}

function readSeed(value: number): number {
  return Number.isInteger(value) && value > 0 ? value >>> 0 : 1;
}

function readPositiveInteger(value: string | null): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function readNonNegativeFinite(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
