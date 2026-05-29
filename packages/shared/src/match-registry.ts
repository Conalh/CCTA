// Match registry contract + pure store for the opt-in public match browser.
//
// DISCOVERY ONLY. The registry helps a client find a game server's address; it
// never owns gameplay truth. Once a client connects to a listed match, the game
// server stays fully authoritative (movement, hits, health, score, round
// state). Reported player counts are presentation hints, not authority, so the
// registry validates and bounds every announcement as hostile input. A host
// appears here only when it opts in to publishing.

export const MATCH_REGISTRY_API_VERSION = 1 as const;
export const MATCH_REGISTRY_DEFAULT_TTL_MS = 30_000 as const;
export const MATCH_REGISTRY_MAX_ENTRIES = 200 as const;
export const MATCH_REGISTRY_NAME_MAX_LENGTH = 40 as const;
export const MATCH_REGISTRY_MAP_ID_MAX_LENGTH = 64 as const;
export const MATCH_REGISTRY_BUILD_ID_MAX_LENGTH = 40 as const;
export const MATCH_REGISTRY_JOIN_URL_MAX_LENGTH = 200 as const;
export const MATCH_REGISTRY_MAX_CAPACITY = 64 as const;

export type MatchAnnouncement = Readonly<{
  name: string;
  joinUrl: string;
  mapId: string;
  buildId: string;
  playerCount: number;
  capacity: number;
}>;

export type RegisteredMatch = MatchAnnouncement &
  Readonly<{
    id: string;
    registeredAtMs: number;
    lastHeartbeatMs: number;
  }>;

export type MatchRegistryState = Readonly<{
  entries: readonly RegisteredMatch[];
}>;

export type PublicMatchListing = Readonly<{
  id: string;
  name: string;
  joinUrl: string;
  mapId: string;
  buildId: string;
  playerCount: number;
  capacity: number;
  ageMs: number;
}>;

export type MatchAnnouncementValidation =
  | Readonly<{ ok: true; announcement: MatchAnnouncement }>
  | Readonly<{ ok: false; reason: string }>;

// Validate a host-supplied announcement as untrusted input before it can enter
// the registry. Every field is bounded; the join URL must be a WebSocket URL so
// a listing can never smuggle an http/javascript/file address to a client.
export function validateMatchAnnouncement(input: unknown): MatchAnnouncementValidation {
  if (typeof input !== "object" || input === null) {
    return { ok: false, reason: "announcement must be an object" };
  }
  const record = input as Record<string, unknown>;

  const name = sanitizeText(record.name);
  if (name === undefined || name.length === 0 || name.length > MATCH_REGISTRY_NAME_MAX_LENGTH) {
    return { ok: false, reason: `name must be 1..${MATCH_REGISTRY_NAME_MAX_LENGTH} printable characters` };
  }

  const joinUrl = readJoinUrl(record.joinUrl);
  if (joinUrl === undefined) {
    return { ok: false, reason: "joinUrl must be a ws:// or wss:// address within length bounds" };
  }

  const mapId = readId(record.mapId, MATCH_REGISTRY_MAP_ID_MAX_LENGTH);
  if (mapId === undefined) {
    return { ok: false, reason: `mapId must be a short lowercase id (<=${MATCH_REGISTRY_MAP_ID_MAX_LENGTH} chars)` };
  }

  const buildId = sanitizeText(record.buildId);
  if (buildId === undefined || buildId.length === 0 || buildId.length > MATCH_REGISTRY_BUILD_ID_MAX_LENGTH) {
    return { ok: false, reason: `buildId must be 1..${MATCH_REGISTRY_BUILD_ID_MAX_LENGTH} printable characters` };
  }

  const capacity = readIntegerInRange(record.capacity, 1, MATCH_REGISTRY_MAX_CAPACITY);
  if (capacity === undefined) {
    return { ok: false, reason: `capacity must be an integer 1..${MATCH_REGISTRY_MAX_CAPACITY}` };
  }

  const playerCount = readIntegerInRange(record.playerCount, 0, capacity);
  if (playerCount === undefined) {
    return { ok: false, reason: "playerCount must be an integer 0..capacity" };
  }

  return { ok: true, announcement: { name, joinUrl, mapId, buildId, playerCount, capacity } };
}

export function createMatchRegistryState(): MatchRegistryState {
  return { entries: [] };
}

// A match is keyed by its normalized join URL so a host re-announcing or
// heartbeating updates its single entry instead of creating duplicates.
export function deriveMatchId(joinUrl: string): string {
  return joinUrl.trim().toLowerCase();
}

export type RegisterMatchInput = Readonly<{
  announcement: MatchAnnouncement;
  nowMs: number;
  maxEntries?: number;
}>;

export type RegisterMatchResult = Readonly<{
  state: MatchRegistryState;
  entry: RegisteredMatch | undefined;
  accepted: boolean;
  reason?: string;
}>;

export function registerMatch(state: MatchRegistryState, input: RegisterMatchInput): RegisterMatchResult {
  const nowMs = readFinite(input.nowMs, 0);
  const id = deriveMatchId(input.announcement.joinUrl);
  const existing = state.entries.find((entry) => entry.id === id);
  const entry: RegisteredMatch = {
    ...input.announcement,
    id,
    registeredAtMs: existing?.registeredAtMs ?? nowMs,
    lastHeartbeatMs: nowMs
  };

  if (existing === undefined) {
    const maxEntries = readPositiveInteger(input.maxEntries, MATCH_REGISTRY_MAX_ENTRIES);
    if (state.entries.length >= maxEntries) {
      return { state, entry: undefined, accepted: false, reason: "registry is full" };
    }
    return { state: { entries: [...state.entries, entry] }, entry, accepted: true };
  }

  return {
    state: { entries: state.entries.map((current) => (current.id === id ? entry : current)) },
    entry,
    accepted: true
  };
}

export type HeartbeatMatchInput = Readonly<{
  id: string;
  nowMs: number;
  playerCount?: number;
}>;

export type HeartbeatMatchResult = Readonly<{
  state: MatchRegistryState;
  ok: boolean;
}>;

export function heartbeatMatch(state: MatchRegistryState, input: HeartbeatMatchInput): HeartbeatMatchResult {
  const nowMs = readFinite(input.nowMs, 0);
  let ok = false;
  const entries = state.entries.map((entry) => {
    if (entry.id !== input.id) {
      return entry;
    }
    ok = true;
    const playerCount =
      input.playerCount === undefined
        ? entry.playerCount
        : readIntegerInRange(input.playerCount, 0, entry.capacity) ?? entry.playerCount;
    return { ...entry, lastHeartbeatMs: nowMs, playerCount };
  });
  return { state: { entries }, ok };
}

export function removeMatch(state: MatchRegistryState, id: string): MatchRegistryState {
  return { entries: state.entries.filter((entry) => entry.id !== id) };
}

export type ExpireStaleMatchesInput = Readonly<{
  nowMs: number;
  ttlMs?: number;
}>;

export function expireStaleMatches(state: MatchRegistryState, input: ExpireStaleMatchesInput): MatchRegistryState {
  const ttlMs = readPositiveInteger(input.ttlMs, MATCH_REGISTRY_DEFAULT_TTL_MS);
  const nowMs = readFinite(input.nowMs, 0);
  return { entries: state.entries.filter((entry) => nowMs - entry.lastHeartbeatMs <= ttlMs) };
}

export type ListPublicMatchesInput = Readonly<{
  nowMs: number;
  ttlMs?: number;
  buildId?: string;
}>;

// Project the live, non-expired entries into the client-facing listing, newest
// activity and fullest matches first. An optional buildId filter hides matches a
// client could not actually join because the protocol/build differs.
export function listPublicMatches(
  state: MatchRegistryState,
  input: ListPublicMatchesInput
): readonly PublicMatchListing[] {
  const ttlMs = readPositiveInteger(input.ttlMs, MATCH_REGISTRY_DEFAULT_TTL_MS);
  const nowMs = readFinite(input.nowMs, 0);
  const wantBuild = sanitizeText(input.buildId);

  return state.entries
    .filter((entry) => nowMs - entry.lastHeartbeatMs <= ttlMs)
    .filter((entry) => wantBuild === undefined || entry.buildId === wantBuild)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      joinUrl: entry.joinUrl,
      mapId: entry.mapId,
      buildId: entry.buildId,
      playerCount: entry.playerCount,
      capacity: entry.capacity,
      ageMs: Math.max(0, nowMs - entry.lastHeartbeatMs)
    }))
    .sort(comparePublicMatchListings);
}

function comparePublicMatchListings(a: PublicMatchListing, b: PublicMatchListing): number {
  if (a.playerCount !== b.playerCount) {
    return b.playerCount - a.playerCount;
  }
  const byName = a.name.localeCompare(b.name);
  if (byName !== 0) {
    return byName;
  }
  return a.joinUrl.localeCompare(b.joinUrl);
}

function sanitizeText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  // Drop control characters, then collapse runs of whitespace and trim.
  const cleaned = Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

function readJoinUrl(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MATCH_REGISTRY_JOIN_URL_MAX_LENGTH) {
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    return undefined;
  }
  if (parsed.hostname.length === 0) {
    return undefined;
  }
  return parsed.toString();
}

function readId(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return undefined;
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function readIntegerInRange(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    return undefined;
  }
  return value;
}

function readPositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function readFinite(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
