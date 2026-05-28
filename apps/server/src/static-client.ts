import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { type RequestListener } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

export function createBrowserDevRequestHandler(rootDirectory = process.cwd()): RequestListener {
  const root = resolve(rootDirectory);
  const staticRoutes = new Map<string, string>([
    ["/", join(root, "apps/client/public/index.html")],
    ["/index.html", join(root, "apps/client/public/index.html")],
    ["/playtest.html", join(root, "apps/client/public/playtest.html")],
    ["/sandbox.html", join(root, "apps/client/public/sandbox.html")],
    ["/styles.css", join(root, "apps/client/public/styles.css")]
  ]);

  return (request, response) => {
    void serveRequest(root, staticRoutes, request.url ?? "/", response);
  };
}

async function serveRequest(
  root: string,
  staticRoutes: ReadonlyMap<string, string>,
  url: string,
  response: Parameters<RequestListener>[1]
): Promise<void> {
  const pathname = new URL(url, "http://localhost").pathname;
  const routedPath = staticRoutes.get(pathname);
  const filePath = routedPath ?? resolveFilePath(root, pathname);

  if (filePath === undefined) {
    writeNotFound(response);
    return;
  }

  try {
    await access(filePath);
  } catch {
    writeNotFound(response);
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypeFor(filePath)
  });
  createReadStream(filePath).pipe(response);
}

function resolveFilePath(root: string, pathname: string): string | undefined {
  if (pathname.startsWith("/node_modules/three/")) {
    return resolveThreeFilePath(root, pathname);
  }

  if (pathname.startsWith("/assets/private-prototype/")) {
    return resolvePrivatePrototypeAssetPath(root, pathname);
  }

  if (!pathname.startsWith("/apps/client/dist/") && !pathname.startsWith("/packages/shared/dist/")) {
    return undefined;
  }

  const filePath = normalize(join(root, pathname));
  if (!filePath.startsWith(root)) {
    return undefined;
  }

  return filePath;
}

function resolveThreeFilePath(root: string, pathname: string): string | undefined {
  const threeRoot = normalize(join(root, "node_modules/three"));
  const filePath = normalize(join(root, pathname));
  if (filePath !== threeRoot && !filePath.startsWith(`${threeRoot}${sep}`)) {
    return undefined;
  }

  return filePath;
}

function resolvePrivatePrototypeAssetPath(root: string, pathname: string): string | undefined {
  const assetsRoot = normalize(join(root, "apps/client/public/assets/private-prototype"));
  const relativePath = pathname.slice("/assets/private-prototype/".length);
  const filePath = normalize(join(assetsRoot, relativePath));
  if (filePath !== assetsRoot && !filePath.startsWith(`${assetsRoot}${sep}`)) {
    return undefined;
  }

  return filePath;
}

function writeNotFound(response: Parameters<RequestListener>[1]): void {
  response.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end("Not found");
}

function contentTypeFor(filePath: string): string {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".map":
      return "application/json; charset=utf-8";
    case ".glb":
      return "model/gltf-binary";
    default:
      return "application/octet-stream";
  }
}
