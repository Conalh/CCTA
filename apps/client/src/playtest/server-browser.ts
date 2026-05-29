// Pure logic for the main-menu server browser. All DOM-free and testable: parsing
// a manual join target, a bounded recent-servers store (localStorage glue lives in
// main.ts), fetching the registry's public match list, and merging the registry
// list with recent servers into one ordered view model. The client owns none of
// the truth here; it only presents what the registry reports and what the player
// has joined before.

import { PROTOCOL_VERSION, DRYDOCK_SPAN_ARENA, EBB_TERMINAL_ARENA } from "@breachline/shared";

export const SERVER_BROWSER_BUILD_ID = `proto-${PROTOCOL_VERSION}` as const;
export const RECENT_SERVERS_LIMIT = 8 as const;

export type ServerBrowserSource = "registry" | "recent";

export type RecentServerEntry = Readonly<{
  joinUrl: string;
  name: string;
  lastJoinedMs: number;
}>;

export type RegistryMatchListing = Readonly<{
  id?: string;
  name: string;
  joinUrl: string;
  mapId: string;
  buildId: string;
  playerCount: number;
  capacity: number;
  ageMs?: number;
}>;

export type ServerBrowserRow = Readonly<{
  joinUrl: string;
  name: string;
  detail: string;
  source: ServerBrowserSource;
  playerCount: number | undefined;
  capacity: number | undefined;
  full: boolean;
}>;

export type ServerBrowserView = Readonly<{
  rows: readonly ServerBrowserRow[];
  registryCount: number;
  recentCount: number;
  isEmpty: boolean;
}>;

export type ManualJoinTarget =
  | Readonly<{ ok: true; joinUrl: string }>
  | Readonly<{ ok: false; reason: string }>;

// Accept either a ws/wss address or an http(s) playtest page URL (which carries the
// same host/port) and resolve both to the canonical ws join URL a client connects
// to. Anything else is rejected with a readable reason.
export function parseManualJoinTarget(input: unknown): ManualJoinTarget {
  if (typeof input !== "string") {
    return { ok: false, reason: "Enter a ws:// address or a join link." };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "Enter a ws:// address or a join link." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "That does not look like a valid address." };
  }

  if (parsed.protocol === "ws:" || parsed.protocol === "wss:") {
    return { ok: true, joinUrl: stripTrailingSlash(parsed.toString()) };
  }
  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    const scheme = parsed.protocol === "https:" ? "wss:" : "ws:";
    const host = parsed.host;
    if (host.length === 0) {
      return { ok: false, reason: "That link is missing a host." };
    }
    return { ok: true, joinUrl: `${scheme}//${host}` };
  }
  return { ok: false, reason: "Use a ws://, wss://, http://, or https:// address." };
}

export function normalizeJoinUrl(joinUrl: string): string {
  return stripTrailingSlash(joinUrl.trim().toLowerCase());
}

export function addRecentServer(
  recent: readonly RecentServerEntry[],
  entry: RecentServerEntry,
  options: Readonly<{ limit?: number }> = {}
): readonly RecentServerEntry[] {
  const limit = readPositiveInteger(options.limit, RECENT_SERVERS_LIMIT);
  const key = normalizeJoinUrl(entry.joinUrl);
  const filtered = recent.filter((existing) => normalizeJoinUrl(existing.joinUrl) !== key);
  return [entry, ...filtered].slice(0, limit);
}

export function readRecentServers(value: unknown): readonly RecentServerEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: RecentServerEntry[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const joinUrl = typeof record.joinUrl === "string" ? record.joinUrl.trim() : "";
    if (joinUrl.length === 0) {
      continue;
    }
    const name = typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : joinUrl;
    const lastJoinedMs =
      typeof record.lastJoinedMs === "number" && Number.isFinite(record.lastJoinedMs) ? record.lastJoinedMs : 0;
    entries.push({ joinUrl, name, lastJoinedMs });
  }
  return entries;
}

export function createServerBrowserView(
  input: Readonly<{
    registryMatches?: readonly RegistryMatchListing[];
    recentServers?: readonly RecentServerEntry[];
  }>
): ServerBrowserView {
  const registryMatches = Array.isArray(input.registryMatches) ? input.registryMatches : [];
  const recentServers = Array.isArray(input.recentServers) ? input.recentServers : [];

  const rows: ServerBrowserRow[] = [];
  const seen = new Set<string>();

  for (const match of registryMatches) {
    if (typeof match?.joinUrl !== "string" || match.joinUrl.trim().length === 0) {
      continue;
    }
    const key = normalizeJoinUrl(match.joinUrl);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      joinUrl: match.joinUrl,
      name: typeof match.name === "string" && match.name.length > 0 ? match.name : match.joinUrl,
      detail: formatRegistryDetail(match),
      source: "registry",
      playerCount: match.playerCount,
      capacity: match.capacity,
      full: typeof match.playerCount === "number" && typeof match.capacity === "number" && match.playerCount >= match.capacity
    });
  }

  // Recent servers not currently advertised in the registry fill in below, so a
  // player can rejoin a private LAN match that never published.
  const sortedRecent = [...recentServers].sort((a, b) => b.lastJoinedMs - a.lastJoinedMs);
  for (const entry of sortedRecent) {
    const key = normalizeJoinUrl(entry.joinUrl);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      joinUrl: entry.joinUrl,
      name: entry.name,
      detail: "Recent",
      source: "recent",
      playerCount: undefined,
      capacity: undefined,
      full: false
    });
  }

  return {
    rows,
    registryCount: rows.filter((row) => row.source === "registry").length,
    recentCount: rows.filter((row) => row.source === "recent").length,
    isEmpty: rows.length === 0
  };
}

export type FetchRegistryMatchesResult =
  | Readonly<{ ok: true; matches: readonly RegistryMatchListing[] }>
  | Readonly<{ ok: false; error: string }>;

export async function fetchRegistryMatches(
  input: Readonly<{
    registryUrl: string;
    buildId?: string;
    fetchImpl?: typeof fetch;
  }>
): Promise<FetchRegistryMatchesResult> {
  const fetchImpl = input.fetchImpl ?? (globalThis.fetch as typeof fetch | undefined);
  if (typeof fetchImpl !== "function") {
    return { ok: false, error: "No fetch implementation is available." };
  }
  const base = stripTrailingSlash(typeof input.registryUrl === "string" ? input.registryUrl.trim() : "");
  if (base.length === 0) {
    return { ok: false, error: "Set a registry address to browse public matches." };
  }

  const buildId = input.buildId === undefined ? SERVER_BROWSER_BUILD_ID : input.buildId;
  const url = `${base}/matches?build=${encodeURIComponent(buildId)}`;

  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    return { ok: false, error: "Could not reach the registry." };
  }
  if (!response.ok) {
    return { ok: false, error: `Registry responded with status ${response.status}.` };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: "Registry returned an unreadable response." };
  }

  const matches = readRegistryMatches(body);
  return { ok: true, matches };
}

export function formatMapLabel(mapId: string): string {
  switch (mapId) {
    case DRYDOCK_SPAN_ARENA.id:
      return DRYDOCK_SPAN_ARENA.displayName;
    case EBB_TERMINAL_ARENA.id:
      return EBB_TERMINAL_ARENA.displayName;
    default:
      return mapId;
  }
}

function formatRegistryDetail(match: RegistryMatchListing): string {
  const players =
    typeof match.playerCount === "number" && typeof match.capacity === "number"
      ? `${match.playerCount}/${match.capacity}`
      : "?";
  const map = typeof match.mapId === "string" && match.mapId.length > 0 ? formatMapLabel(match.mapId) : "unknown map";
  return `${players} · ${map}`;
}

function readRegistryMatches(body: unknown): readonly RegistryMatchListing[] {
  if (typeof body !== "object" || body === null) {
    return [];
  }
  const rawMatches = (body as Record<string, unknown>).matches;
  if (!Array.isArray(rawMatches)) {
    return [];
  }
  const matches: RegistryMatchListing[] = [];
  for (const raw of rawMatches) {
    if (typeof raw !== "object" || raw === null) {
      continue;
    }
    const record = raw as Record<string, unknown>;
    if (typeof record.joinUrl !== "string" || record.joinUrl.length === 0) {
      continue;
    }
    matches.push({
      id: typeof record.id === "string" ? record.id : undefined,
      name: typeof record.name === "string" ? record.name : record.joinUrl,
      joinUrl: record.joinUrl,
      mapId: typeof record.mapId === "string" ? record.mapId : "",
      buildId: typeof record.buildId === "string" ? record.buildId : "",
      playerCount: typeof record.playerCount === "number" ? record.playerCount : 0,
      capacity: typeof record.capacity === "number" ? record.capacity : 0,
      ageMs: typeof record.ageMs === "number" ? record.ageMs : undefined
    });
  }
  return matches;
}

function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function readPositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}
