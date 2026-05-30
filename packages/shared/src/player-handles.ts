export type PlayerHandle = Readonly<{
  handleId: number;
  callsign: string;
}>;

// A player's chosen name is server-authoritative: the client requests one, the server
// sanitizes it, and only the sanitized form is ever shown or transmitted. Names ride in a
// fixed 16-byte UTF-8 roster field, so the effective cap is measured in bytes, not chars.
export const MAX_PLAYER_NAME_BYTES = 16 as const;

// Reduce an untrusted requested name to a safe display string: replace control characters
// with spaces, collapse runs of whitespace, trim, and cap to the wire budget on a UTF-8
// boundary. Returns "" when nothing usable remains, so callers fall back to the pool callsign.
export function sanitizePlayerName(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }
  let stripped = "";
  for (const character of raw) {
    const code = character.codePointAt(0) ?? 0;
    // Drop C0 control characters (below space) and DEL; keep printable code points as-is.
    stripped += code < 0x20 || code === 0x7f ? " " : character;
  }
  const cleaned = stripped.replace(/\s+/g, " ").trim();
  if (cleaned.length === 0) {
    return "";
  }
  return capToUtf8Bytes(cleaned, MAX_PLAYER_NAME_BYTES);
}

// Truncate a string so its UTF-8 encoding fits within byteBudget without splitting a
// multi-byte code point at the boundary.
export function capToUtf8Bytes(value: string, byteBudget: number): string {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(value);
  if (encoded.length <= byteBudget) {
    return value;
  }
  let end = byteBudget;
  // Back off while the first dropped byte is a UTF-8 continuation byte (0b10xxxxxx).
  while (end > 0 && (encoded[end] & 0b1100_0000) === 0b1000_0000) {
    end -= 1;
  }
  return new TextDecoder("utf-8").decode(encoded.subarray(0, end));
}

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
