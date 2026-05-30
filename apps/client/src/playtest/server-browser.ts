// Pure logic for the main-menu server browser. All DOM-free and testable: menu
// panel navigation, parsing a manual join target, bounded recent-servers and
// favorites stores (localStorage glue lives in main.ts), fetching the registry's
// public match list, and merging registry + recent + favorites into one sortable,
// tabbed table model. The client owns none of the truth here; it only presents
// what the registry reports and what the player has joined or starred.

import { PROTOCOL_VERSION, EBB_TERMINAL_ARENA, getArenaMetadataById } from "@breachline/shared";

export const SERVER_BROWSER_BUILD_ID = `proto-${PROTOCOL_VERSION}` as const;
export const RECENT_SERVERS_LIMIT = 12 as const;

export const MENU_PANELS = ["servers", "settings", "controls"] as const;
export type MenuPanel = (typeof MENU_PANELS)[number];

export const SERVER_BROWSER_TABS = ["internet", "recent", "favorites"] as const;
export type ServerBrowserTab = (typeof SERVER_BROWSER_TABS)[number];

export const SERVER_SORT_KEYS = ["name", "players", "map", "ping"] as const;
export type ServerSortKey = (typeof SERVER_SORT_KEYS)[number];
export type ServerSortDirection = "asc" | "desc";

export type RecentServerEntry = Readonly<{
  joinUrl: string;
  name: string;
  lastJoinedMs: number;
}>;

export type FavoriteServerEntry = Readonly<{
  joinUrl: string;
  name: string;
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

export type ServerBrowserEntry = Readonly<{
  joinUrl: string;
  name: string;
  mapId: string;
  mapLabel: string;
  playerCount: number | undefined;
  capacity: number | undefined;
  ping: number | undefined;
  locked: boolean;
  full: boolean;
  onInternet: boolean;
  isRecent: boolean;
  isFavorite: boolean;
  lastJoinedMs: number;
}>;

export type ManualJoinTarget =
  | Readonly<{ ok: true; joinUrl: string }>
  | Readonly<{ ok: false; reason: string }>;

export function resolveMenuPanel(requested: unknown): MenuPanel {
  return typeof requested === "string" && (MENU_PANELS as readonly string[]).includes(requested)
    ? (requested as MenuPanel)
    : "servers";
}

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

export function readFavoriteServers(value: unknown): readonly FavoriteServerEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: FavoriteServerEntry[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) {
      continue;
    }
    const record = raw as Record<string, unknown>;
    const joinUrl = typeof record.joinUrl === "string" ? record.joinUrl.trim() : "";
    if (joinUrl.length === 0) {
      continue;
    }
    const key = normalizeJoinUrl(joinUrl);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const name = typeof record.name === "string" && record.name.trim().length > 0 ? record.name.trim() : joinUrl;
    entries.push({ joinUrl, name });
  }
  return entries;
}

export function isFavoriteServer(favorites: readonly FavoriteServerEntry[], joinUrl: string): boolean {
  const key = normalizeJoinUrl(joinUrl);
  return favorites.some((entry) => normalizeJoinUrl(entry.joinUrl) === key);
}

export function toggleFavoriteServer(
  favorites: readonly FavoriteServerEntry[],
  entry: FavoriteServerEntry
): readonly FavoriteServerEntry[] {
  const key = normalizeJoinUrl(entry.joinUrl);
  if (favorites.some((existing) => normalizeJoinUrl(existing.joinUrl) === key)) {
    return favorites.filter((existing) => normalizeJoinUrl(existing.joinUrl) !== key);
  }
  return [...favorites, { joinUrl: entry.joinUrl, name: entry.name }];
}

export function buildServerBrowserEntries(
  input: Readonly<{
    registryMatches?: readonly RegistryMatchListing[];
    recentServers?: readonly RecentServerEntry[];
    favorites?: readonly FavoriteServerEntry[];
    pings?: Readonly<Record<string, number>>;
  }>
): readonly ServerBrowserEntry[] {
  const registryMatches = Array.isArray(input.registryMatches) ? input.registryMatches : [];
  const recentServers = Array.isArray(input.recentServers) ? input.recentServers : [];
  const favorites = Array.isArray(input.favorites) ? input.favorites : [];
  const pings = input.pings ?? {};

  const byKey = new Map<string, MutableEntry>();

  const ensure = (joinUrl: string, name: string): MutableEntry => {
    const key = normalizeJoinUrl(joinUrl);
    const existing = byKey.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const created: MutableEntry = {
      joinUrl,
      name,
      mapId: "",
      mapLabel: "",
      playerCount: undefined,
      capacity: undefined,
      ping: typeof pings[key] === "number" ? pings[key] : undefined,
      locked: false,
      full: false,
      onInternet: false,
      isRecent: false,
      isFavorite: false,
      lastJoinedMs: 0
    };
    byKey.set(key, created);
    return created;
  };

  for (const match of registryMatches) {
    if (typeof match?.joinUrl !== "string" || match.joinUrl.trim().length === 0) {
      continue;
    }
    const entry = ensure(match.joinUrl, typeof match.name === "string" && match.name.length > 0 ? match.name : match.joinUrl);
    entry.onInternet = true;
    entry.name = typeof match.name === "string" && match.name.length > 0 ? match.name : entry.name;
    entry.mapId = typeof match.mapId === "string" ? match.mapId : entry.mapId;
    entry.mapLabel = entry.mapId.length > 0 ? formatMapLabel(entry.mapId) : entry.mapLabel;
    entry.playerCount = typeof match.playerCount === "number" ? match.playerCount : entry.playerCount;
    entry.capacity = typeof match.capacity === "number" ? match.capacity : entry.capacity;
    entry.full =
      typeof entry.playerCount === "number" && typeof entry.capacity === "number" && entry.playerCount >= entry.capacity;
  }

  for (const recent of recentServers) {
    const entry = ensure(recent.joinUrl, recent.name);
    entry.isRecent = true;
    entry.lastJoinedMs = Math.max(entry.lastJoinedMs, recent.lastJoinedMs);
    if (!entry.onInternet) {
      entry.name = recent.name;
    }
  }

  for (const favorite of favorites) {
    const entry = ensure(favorite.joinUrl, favorite.name);
    entry.isFavorite = true;
    if (!entry.onInternet && !entry.isRecent) {
      entry.name = favorite.name;
    }
  }

  return [...byKey.values()].map((entry) => ({ ...entry }));
}

export function filterServerBrowserEntriesByTab(
  entries: readonly ServerBrowserEntry[],
  tab: ServerBrowserTab
): readonly ServerBrowserEntry[] {
  switch (tab) {
    case "internet":
      return entries.filter((entry) => entry.onInternet);
    case "recent":
      return entries.filter((entry) => entry.isRecent);
    case "favorites":
      return entries.filter((entry) => entry.isFavorite);
    default:
      return entries;
  }
}

export function countServerBrowserTabs(
  entries: readonly ServerBrowserEntry[]
): Readonly<Record<ServerBrowserTab, number>> {
  return {
    internet: entries.filter((entry) => entry.onInternet).length,
    recent: entries.filter((entry) => entry.isRecent).length,
    favorites: entries.filter((entry) => entry.isFavorite).length
  };
}

export function sortServerBrowserEntries(
  entries: readonly ServerBrowserEntry[],
  key: ServerSortKey,
  direction: ServerSortDirection
): readonly ServerBrowserEntry[] {
  const factor = direction === "desc" ? -1 : 1;
  return [...entries]
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const primary = compareByKey(a.entry, b.entry, key, factor);
      // Stable: fall back to original order so equal rows do not jitter on re-sort.
      return primary !== 0 ? primary : a.index - b.index;
    })
    .map((wrapped) => wrapped.entry);
}

function compareByKey(a: ServerBrowserEntry, b: ServerBrowserEntry, key: ServerSortKey, factor: number): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name) * factor;
    case "map":
      return a.mapLabel.localeCompare(b.mapLabel) * factor;
    case "players":
      return compareOptionalNumber(a.playerCount, b.playerCount, factor);
    case "ping":
      return compareOptionalNumber(a.ping, b.ping, factor);
    default:
      return 0;
  }
}

// Unknown numeric values always sort after known ones, regardless of direction, so
// servers with no data sink to the bottom of the table rather than floating to the top.
// Only the known-vs-known comparison follows the sort direction.
function compareOptionalNumber(a: number | undefined, b: number | undefined, factor: number): number {
  const aKnown = typeof a === "number";
  const bKnown = typeof b === "number";
  if (!aKnown && !bKnown) {
    return 0;
  }
  if (!aKnown) {
    return 1;
  }
  if (!bKnown) {
    return -1;
  }
  return (a - b) * factor;
}

export function formatPlayersCell(entry: ServerBrowserEntry): string {
  return typeof entry.playerCount === "number" && typeof entry.capacity === "number"
    ? `${entry.playerCount}/${entry.capacity}`
    : "—";
}

export function formatMapCell(entry: ServerBrowserEntry): string {
  return entry.mapLabel.length > 0 ? entry.mapLabel : "—";
}

export function formatPingCell(ping: number | undefined): string {
  return typeof ping === "number" && Number.isFinite(ping) ? `${Math.round(ping)}` : "—";
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

  return { ok: true, matches: readRegistryMatches(body) };
}

export type PingQuality = "good" | "fair" | "poor" | "unknown";

export function pingQuality(ping: number | undefined): PingQuality {
  if (typeof ping !== "number" || !Number.isFinite(ping)) {
    return "unknown";
  }
  if (ping < 120) {
    return "good";
  }
  if (ping < 220) {
    return "fair";
  }
  return "poor";
}

// Classic four-bar latency meter: more bars = lower ping. Unknown reads as zero bars.
export function pingBarCount(ping: number | undefined): number {
  if (typeof ping !== "number" || !Number.isFinite(ping)) {
    return 0;
  }
  if (ping < 60) {
    return 4;
  }
  if (ping < 120) {
    return 3;
  }
  if (ping < 220) {
    return 2;
  }
  return 1;
}

// Minimal structural WebSocket so the probe can be unit-tested with a fake socket.
export type PingWebSocketLike = {
  close(): void;
  onopen: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
};
export type PingWebSocketCtor = new (url: string) => PingWebSocketLike;

export type MeasureWebSocketPingOptions = Readonly<{
  WebSocketImpl?: PingWebSocketCtor;
  now?: () => number;
  timeoutMs?: number;
}>;

// Measure a server's reachability latency as the time to open a WebSocket to it.
// The socket is closed immediately; never sending a hello means the probe takes no
// match slot. Resolves undefined on error or timeout rather than rejecting.
export function measureWebSocketOpenPing(url: string, options: MeasureWebSocketPingOptions = {}): Promise<number | undefined> {
  const WebSocketImpl = options.WebSocketImpl ?? (globalThis.WebSocket as unknown as PingWebSocketCtor | undefined);
  const now = options.now ?? (() => Date.now());
  const timeoutMs = options.timeoutMs ?? 5000;

  return new Promise<number | undefined>((resolve) => {
    if (typeof WebSocketImpl !== "function") {
      resolve(undefined);
      return;
    }

    let settled = false;
    let socket: PingWebSocketLike | undefined;
    const start = now();
    const finish = (value: number | undefined): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      try {
        socket?.close();
      } catch {
        // The socket may already be closing; ignore.
      }
      resolve(value);
    };

    const timer = setTimeout(() => finish(undefined), timeoutMs);
    try {
      socket = new WebSocketImpl(url);
    } catch {
      finish(undefined);
      return;
    }
    socket.onopen = () => finish(Math.max(0, Math.round(now() - start)));
    socket.onerror = () => finish(undefined);
  });
}

export type ProbeServerPingsInput = Readonly<{
  urls: readonly string[];
  probe: (url: string) => Promise<number | undefined>;
  concurrency?: number;
  onResult?: (url: string, ping: number | undefined) => void;
}>;

// Run ping probes with bounded concurrency so the browser never opens dozens of
// sockets at once. Results stream through onResult; the returned map keys successful
// pings by normalized join URL for merging back into the table.
export async function probeServerPings(input: ProbeServerPingsInput): Promise<Record<string, number>> {
  const urls = Array.isArray(input.urls) ? input.urls : [];
  const concurrency = readPositiveInteger(input.concurrency, 4);
  const results: Record<string, number> = {};
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;
      if (url === undefined) {
        continue;
      }
      const ping = await input.probe(url);
      if (typeof ping === "number" && Number.isFinite(ping)) {
        results[normalizeJoinUrl(url)] = ping;
      }
      input.onResult?.(url, ping);
    }
  };

  const workerCount = Math.min(concurrency, urls.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function formatMapLabel(mapId: string): string {
  // Resolve any selectable arena (Drydock, Foundry Row, …) to its display name so the
  // browser never shows a raw "arena-foundry-row" id. The Ebb Terminal test arena is not
  // in the selectable registry, so it keeps an explicit fallback; unknown ids show as-is.
  const known = getArenaMetadataById(mapId);
  if (known !== undefined) {
    return known.displayName;
  }
  if (mapId === EBB_TERMINAL_ARENA.id) {
    return EBB_TERMINAL_ARENA.displayName;
  }
  return mapId;
}

type MutableEntry = {
  joinUrl: string;
  name: string;
  mapId: string;
  mapLabel: string;
  playerCount: number | undefined;
  capacity: number | undefined;
  ping: number | undefined;
  locked: boolean;
  full: boolean;
  onInternet: boolean;
  isRecent: boolean;
  isFavorite: boolean;
  lastJoinedMs: number;
};

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
