export type PlayerHandle = Readonly<{
  handleId: number;
  callsign: string;
}>;

const CALLSIGNS = [
  "Vesper",
  "Quill",
  "Tundra",
  "Marlow",
  "Ember",
  "Cairn",
  "Drift",
  "Sable"
] as const;

const PLAYER_HANDLES: readonly PlayerHandle[] = CALLSIGNS.map((callsign, index) =>
  validatePlayerHandle({ handleId: index + 1, callsign })
);

const HANDLE_BY_ID = new Map<number, PlayerHandle>(PLAYER_HANDLES.map((handle) => [handle.handleId, handle]));

export const PLAYER_HANDLE_POOL: readonly PlayerHandle[] = PLAYER_HANDLES;

export const PLAYER_HANDLE_CAPACITY = PLAYER_HANDLES.length;

export function getPlayerHandle(handleId: number): PlayerHandle | undefined {
  return HANDLE_BY_ID.get(handleId);
}

export function getPlayerCallsign(handleId: number): string | undefined {
  return HANDLE_BY_ID.get(handleId)?.callsign;
}

export function isKnownPlayerHandleId(value: number): boolean {
  return HANDLE_BY_ID.has(value);
}

export function listPlayerHandleIds(): readonly number[] {
  return PLAYER_HANDLES.map((handle) => handle.handleId);
}

function validatePlayerHandle(handle: PlayerHandle): PlayerHandle {
  if (!Number.isInteger(handle.handleId) || handle.handleId < 1 || handle.handleId > 0xffff) {
    throw new Error(`player handle id must be a positive unsigned 16-bit integer, got ${handle.handleId}.`);
  }
  if (typeof handle.callsign !== "string" || handle.callsign.trim().length === 0) {
    throw new Error("player handle callsign must be a non-empty string.");
  }
  return { handleId: handle.handleId, callsign: handle.callsign };
}
