// Node HTTP adapter for the match registry. It owns sockets, request parsing,
// CORS, and a periodic stale-entry sweep, delegating all routing decisions to the
// pure handleMatchRegistryRequest. The browser server browser fetches this cross
// origin, so every response carries permissive CORS headers and OPTIONS preflight
// is answered directly.

import http from "node:http";

import {
  MATCH_REGISTRY_DEFAULT_TTL_MS,
  createMatchRegistryState,
  expireStaleMatches,
  type MatchRegistryState
} from "@breachline/shared";

import { handleMatchRegistryRequest } from "./router.js";

export type MatchRegistryServerConfig = Readonly<{
  host?: string;
  port?: number;
  ttlMs?: number;
  maxEntries?: number;
  sweepIntervalMs?: number;
}>;

export type MatchRegistryServer = Readonly<{
  url: string;
  host: string;
  port: number;
  close(): Promise<void>;
}>;

const MAX_REQUEST_BODY_BYTES = 16 * 1024;

const CORS_HEADERS: Readonly<Record<string, string>> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "600"
};

export async function startMatchRegistryServer(
  config: MatchRegistryServerConfig = {}
): Promise<MatchRegistryServer> {
  const host = config.host ?? "127.0.0.1";
  const requestedPort = config.port ?? 8788;
  const ttlMs = config.ttlMs ?? MATCH_REGISTRY_DEFAULT_TTL_MS;
  const sweepIntervalMs = config.sweepIntervalMs ?? Math.max(1000, Math.floor(ttlMs / 2));

  let state: MatchRegistryState = createMatchRegistryState();

  const server = http.createServer((req, res) => {
    void handleHttpRequest(req, res);
  });

  async function handleHttpRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    if (req.method === "OPTIONS") {
      writeResponse(res, 204, undefined);
      return;
    }

    const requestUrl = new URL(req.url ?? "/", "http://registry.local");
    const query: Record<string, string> = {};
    for (const [key, value] of requestUrl.searchParams) {
      query[key] = value;
    }

    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      writeResponse(res, 400, { ok: false, reason: error instanceof Error ? error.message : "invalid body" });
      return;
    }

    const result = handleMatchRegistryRequest({
      state,
      request: {
        method: req.method ?? "GET",
        path: requestUrl.pathname,
        query,
        body
      },
      nowMs: Date.now(),
      ttlMs,
      maxEntries: config.maxEntries
    });
    state = result.state;
    writeResponse(res, result.response.status, result.response.body);
  }

  const sweep = setInterval(() => {
    state = expireStaleMatches(state, { nowMs: Date.now(), ttlMs });
  }, sweepIntervalMs);
  sweep.unref();

  const port = await listen(server, host, requestedPort);
  const url = `http://${host}:${port}`;

  return {
    url,
    host,
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        clearInterval(sweep);
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

function writeResponse(res: http.ServerResponse, status: number, body: unknown): void {
  const headers: Record<string, string> = { ...CORS_HEADERS };
  if (body === undefined) {
    res.writeHead(status, headers);
    res.end();
    return;
  }
  const payload = JSON.stringify(body);
  headers["content-type"] = "application/json; charset=utf-8";
  res.writeHead(status, headers);
  res.end(payload);
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  if (req.method !== "POST" && req.method !== "PUT") {
    return undefined;
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    total += buffer.length;
    if (total > MAX_REQUEST_BODY_BYTES) {
      throw new Error("request body too large");
    }
    chunks.push(buffer);
  }

  if (total === 0) {
    return undefined;
  }

  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("request body must be valid JSON");
  }
}

function listen(server: http.Server, host: string, port: number): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("registry server did not bind to a network port"));
        return;
      }
      server.removeListener("error", reject);
      resolve(address.port);
    });
  });
}
