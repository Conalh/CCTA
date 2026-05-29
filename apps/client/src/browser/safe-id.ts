// Generates a transport id that works outside a secure context. `crypto.randomUUID`
// is only available on HTTPS or localhost, so a LAN peer on plain http (e.g.
// http://192.168.x.x:8787) would throw. `crypto.getRandomValues` IS available in
// non-secure contexts, so we build an RFC 4122 v4 UUID from it, with a final
// non-crypto fallback. This id is only a transport label; it is never security-sensitive.
type RandomSource = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

export function createRandomId(source: RandomSource | undefined = platformRandomSource()): string {
  if (source !== undefined && typeof source.randomUUID === "function") {
    return source.randomUUID();
  }

  if (source !== undefined && typeof source.getRandomValues === "function") {
    return uuidFromBytes(source.getRandomValues(new Uint8Array(16)));
  }

  // No Web Crypto at all: unique-enough for a transport label, not cryptographic.
  const time = Date.now().toString(16);
  const rand = Math.floor(Math.random() * 0xffffffff).toString(16);
  return `id-${time}-${rand}`;
}

function platformRandomSource(): RandomSource | undefined {
  const candidate = (globalThis as Record<string, unknown>).crypto;
  return candidate === undefined ? undefined : (candidate as RandomSource);
}

function uuidFromBytes(bytes: Uint8Array): string {
  // Set the RFC 4122 version (4) and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join("")
  ].join("-");
}
