import { DRYDOCK_SPAN_ARENA } from "./arena-drydock-span.js";
import { FOUNDRY_ROW_ARENA } from "./arena-foundry-row.js";
import type { ArenaMapMetadata } from "./map-metadata.js";

// The arenas a match can run. The host picks one by id; the server tells the client which.
export const KNOWN_ARENAS: readonly ArenaMapMetadata[] = [DRYDOCK_SPAN_ARENA, FOUNDRY_ROW_ARENA];
export const DEFAULT_ARENA_ID = DRYDOCK_SPAN_ARENA.id;

// Look up an arena by id, accepting the short form ("foundry-row") or full ("arena-foundry-row").
export function getArenaMetadataById(id: string | undefined): ArenaMapMetadata | undefined {
  if (typeof id !== "string" || id.trim().length === 0) {
    return undefined;
  }
  const normalized = id.trim().toLowerCase();
  const fullId = normalized.startsWith("arena-") ? normalized : `arena-${normalized}`;
  return KNOWN_ARENAS.find((arena) => arena.id === fullId);
}

export function resolveArenaMetadata(id: string | undefined): ArenaMapMetadata {
  return getArenaMetadataById(id) ?? DRYDOCK_SPAN_ARENA;
}
