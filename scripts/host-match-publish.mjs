// Opt-in publishing for the host-a-match flow. Pure helpers (join-URL resolution
// and announcement shaping) plus a tiny publisher that talks to a match registry
// over fetch. Publishing is OPT-IN: host:match only uses these when a registry
// URL is configured, so a plain LAN match never broadcasts itself. Discovery
// only — the registry learns an address, never gameplay truth.

export function resolvePublishJoinUrl(input = {}) {
  // An explicit public URL wins (real internet play sets its reachable address);
  // otherwise fall back to the first LAN server URL the host detected.
  const explicit = readWebSocketUrl(input.explicitUrl);
  if (explicit !== undefined) {
    return explicit;
  }
  const lan = Array.isArray(input.lanServerUrls) ? input.lanServerUrls : [];
  for (const candidate of lan) {
    const url = readWebSocketUrl(candidate);
    if (url !== undefined) {
      return url;
    }
  }
  return undefined;
}

export function buildHostAnnouncement(input = {}) {
  return {
    name: input.name,
    joinUrl: input.joinUrl,
    mapId: input.mapId,
    buildId: input.buildId,
    playerCount: input.playerCount,
    capacity: input.capacity
  };
}

export function createRegistryPublisher(input = {}) {
  const registryBase = stripTrailingSlash(input.registryUrl);
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("createRegistryPublisher requires a fetch implementation");
  }
  if (registryBase.length === 0) {
    throw new Error("createRegistryPublisher requires a registry URL");
  }

  async function post(path, body) {
    const response = await fetchImpl(`${registryBase}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    let json = {};
    try {
      json = await response.json();
    } catch {
      json = {};
    }
    return { ok: response.ok && json.ok === true, status: response.status, json };
  }

  return {
    async announce(announcement) {
      const result = await post("/announce", announcement);
      return {
        ok: result.ok,
        id: typeof result.json.id === "string" ? result.json.id : undefined,
        status: result.status,
        reason: result.json.reason
      };
    },
    async heartbeat(id, playerCount) {
      return post("/heartbeat", { id, playerCount });
    },
    async remove(id) {
      return post("/remove", { id });
    }
  };
}

function readWebSocketUrl(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  let parsed;
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
  return trimmed;
}

function stripTrailingSlash(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.endsWith("/") ? text.slice(0, -1) : text;
}
