// Pure request router for the match registry service. It maps a parsed request
// plus the current registry state and a clock reading to a JSON response and the
// next state. It performs no I/O and reads no ambient clock, so it can be tested
// deterministically; the HTTP adapter in service.ts handles sockets and CORS.

import {
  MATCH_REGISTRY_API_VERSION,
  MATCH_REGISTRY_DEFAULT_TTL_MS,
  expireStaleMatches,
  heartbeatMatch,
  listPublicMatches,
  registerMatch,
  removeMatch,
  validateMatchAnnouncement,
  type MatchRegistryState
} from "@breachline/shared";

export type RegistryRequest = Readonly<{
  method: string;
  path: string;
  query: Readonly<Record<string, string>>;
  body: unknown;
}>;

export type RegistryResponse = Readonly<{
  status: number;
  body: unknown;
}>;

export type HandleMatchRegistryRequestInput = Readonly<{
  state: MatchRegistryState;
  request: RegistryRequest;
  nowMs: number;
  ttlMs?: number;
  maxEntries?: number;
}>;

export type HandleMatchRegistryRequestResult = Readonly<{
  state: MatchRegistryState;
  response: RegistryResponse;
}>;

export function handleMatchRegistryRequest(
  input: HandleMatchRegistryRequestInput
): HandleMatchRegistryRequestResult {
  const ttlMs = readPositiveInteger(input.ttlMs, MATCH_REGISTRY_DEFAULT_TTL_MS);
  const nowMs = readFinite(input.nowMs, 0);
  const { request } = input;

  // Sweep stale entries first so every route sees a live view.
  const state = expireStaleMatches(input.state, { nowMs, ttlMs });
  const route = `${request.method.toUpperCase()} ${request.path}`;

  switch (route) {
    case "GET /health":
      return json(state, 200, {
        ok: true,
        apiVersion: MATCH_REGISTRY_API_VERSION,
        liveMatches: state.entries.length,
        ttlMs
      });

    case "GET /matches": {
      const buildId = readQueryString(request.query.build);
      const matches = listPublicMatches(state, { nowMs, ttlMs, buildId });
      return json(state, 200, { ok: true, apiVersion: MATCH_REGISTRY_API_VERSION, ttlMs, matches });
    }

    case "POST /announce": {
      const validation = validateMatchAnnouncement(request.body);
      if (!validation.ok) {
        return json(state, 400, { ok: false, reason: validation.reason });
      }
      const result = registerMatch(state, {
        announcement: validation.announcement,
        nowMs,
        maxEntries: input.maxEntries
      });
      if (!result.accepted || result.entry === undefined) {
        return json(result.state, 503, { ok: false, reason: result.reason ?? "registry unavailable" });
      }
      return json(result.state, 200, { ok: true, id: result.entry.id, ttlMs });
    }

    case "POST /heartbeat": {
      const id = readBodyId(request.body);
      if (id === undefined) {
        return json(state, 400, { ok: false, reason: "heartbeat requires a match id" });
      }
      const result = heartbeatMatch(state, { id, nowMs, playerCount: readBodyPlayerCount(request.body) });
      if (!result.ok) {
        return json(result.state, 404, { ok: false, reason: "unknown match id" });
      }
      return json(result.state, 200, { ok: true, ttlMs });
    }

    case "POST /remove": {
      const id = readBodyId(request.body);
      if (id === undefined) {
        return json(state, 400, { ok: false, reason: "remove requires a match id" });
      }
      return json(removeMatch(state, id), 200, { ok: true });
    }

    default:
      return json(state, 404, { ok: false, reason: "unknown route" });
  }
}

function json(
  state: MatchRegistryState,
  status: number,
  body: unknown
): HandleMatchRegistryRequestResult {
  return { state, response: { status, body } };
}

function readBodyId(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const id = (body as Record<string, unknown>).id;
  if (typeof id !== "string") {
    return undefined;
  }
  const trimmed = id.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function readBodyPlayerCount(body: unknown): number | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const value = (body as Record<string, unknown>).playerCount;
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function readQueryString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function readPositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function readFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
