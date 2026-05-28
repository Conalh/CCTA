import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { suggestPrivateAssetCandidateTags } from "../apps/client/dist/sandbox/private-asset-tags.js";

export const PRIVATE_ASSET_AUDIT_SCHEMA_VERSION = 1;
export const PRIVATE_ASSET_ROOT_RELATIVE_PATH = "apps/client/public/assets/private-prototype";
export const PRIVATE_ASSET_AUDIT_OUTPUT_RELATIVE_PATH = "local-assets/private-asset-audit.json";
export const VERY_LARGE_GLB_BYTES = 12 * 1024 * 1024;

const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a;

export async function auditPrivatePrototypeAssets(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const rootRelativePath = options.rootRelativePath ?? PRIVATE_ASSET_ROOT_RELATIVE_PATH;
  const outputRelativePath = options.outputRelativePath ?? PRIVATE_ASSET_AUDIT_OUTPUT_RELATIVE_PATH;
  const rootDirectory = join(cwd, rootRelativePath);
  const outputPath = join(cwd, outputRelativePath);
  const files = await findGlbFiles(rootDirectory);
  const entries = [];

  for (const file of files) {
    const buffer = await readFile(file);
    entries.push(
      parseGlbAssetMetadata({
        buffer,
        fileSizeBytes: buffer.byteLength,
        relativePath: toPosixPath(relative(rootDirectory, file))
      })
    );
  }

  const audit = createPrivateAssetAudit({
    entries: entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    rootRelativePath
  });

  await writeFileEnsuringDirectory(outputPath, `${JSON.stringify(audit, null, 2)}\n`);

  return {
    audit,
    outputPath,
    outputRelativePath
  };
}

export function parseGlbAssetMetadata({ buffer, fileSizeBytes, relativePath }) {
  const warnings = [];
  let gltf = {};

  try {
    gltf = readGlbJson(buffer);
  } catch (error) {
    warnings.push("invalid-glb");
    void error;
  }

  const meshCount = countArray(gltf.meshes);
  const primitiveCount = countMeshPrimitives(gltf.meshes);
  const materialCount = countArray(gltf.materials);
  const textureCount = countArray(gltf.textures);
  const imageCount = countArray(gltf.images);
  const animationCount = countArray(gltf.animations);
  const accessorCount = countArray(gltf.accessors);
  const nodeCount = countArray(gltf.nodes);
  const sceneCount = countArray(gltf.scenes);

  if (fileSizeBytes >= VERY_LARGE_GLB_BYTES) {
    warnings.push("very-large-file");
  }

  if (!hasUsableSceneData(gltf, meshCount, nodeCount, sceneCount)) {
    warnings.push("missing-scene-data");
  }

  if (hasUnusualScaleMetadata(gltf.nodes)) {
    warnings.push("unusual-scale-metadata");
  }

  const entry = {
    accessorCount,
    animationCount,
    candidateTags: [],
    category: readCategory(relativePath),
    fileSizeBytes,
    imageCount,
    materialCount,
    meshCount,
    nodeCount,
    primitiveCount,
    relativePath,
    sceneCount,
    textureCount,
    warnings
  };

  return {
    ...entry,
    candidateTags: suggestPrivateAssetCandidateTags(entry)
  };
}

export function createPrivateAssetAudit({ entries, generatedAt, rootRelativePath }) {
  return {
    assetRoot: rootRelativePath,
    entries,
    generatedAt,
    schemaVersion: PRIVATE_ASSET_AUDIT_SCHEMA_VERSION,
    summary: summarizePrivateAssetAudit(entries)
  };
}

export function summarizePrivateAssetAudit(entries) {
  const categories = {};
  const warningCounts = {};
  let totalSizeBytes = 0;

  for (const entry of entries) {
    categories[entry.category] = (categories[entry.category] ?? 0) + 1;
    totalSizeBytes += entry.fileSizeBytes;

    for (const warning of entry.warnings) {
      warningCounts[warning] = (warningCounts[warning] ?? 0) + 1;
    }
  }

  return {
    categories: sortRecord(categories),
    totalGlbCount: entries.length,
    totalSizeBytes,
    warningCounts: sortRecord(warningCounts)
  };
}

function readGlbJson(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.byteLength < 20) {
    throw new Error("GLB is too small");
  }

  if (buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error("GLB magic mismatch");
  }

  const version = buffer.readUInt32LE(4);
  if (version !== 2) {
    throw new Error(`Unsupported GLB version: ${version}`);
  }

  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength > buffer.byteLength) {
    throw new Error("GLB declared length exceeds file size");
  }

  let offset = 12;
  while (offset + 8 <= declaredLength) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > declaredLength) {
      throw new Error("GLB chunk exceeds declared length");
    }

    if (chunkType === GLB_JSON_CHUNK_TYPE) {
      return JSON.parse(buffer.subarray(chunkStart, chunkEnd).toString("utf8").trim());
    }

    offset = chunkEnd;
  }

  throw new Error("GLB JSON chunk missing");
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function countMeshPrimitives(meshes) {
  if (!Array.isArray(meshes)) {
    return 0;
  }

  return meshes.reduce((count, mesh) => count + countArray(mesh.primitives), 0);
}

function hasUsableSceneData(gltf, meshCount, nodeCount, sceneCount) {
  return (
    meshCount > 0 &&
    nodeCount > 0 &&
    sceneCount > 0 &&
    Number.isInteger(gltf.scene) &&
    gltf.scene >= 0 &&
    gltf.scene < sceneCount
  );
}

function hasUnusualScaleMetadata(nodes) {
  if (!Array.isArray(nodes)) {
    return false;
  }

  return nodes.some((node) => {
    if (!Array.isArray(node.scale)) {
      return false;
    }

    return (
      node.scale.length !== 3 ||
      node.scale.some((value) => !Number.isFinite(value) || value <= 0 || value < 0.01 || value > 20)
    );
  });
}

function readCategory(relativePath) {
  const [category] = toPosixPath(relativePath).split("/");
  return category || "uncategorized";
}

async function findGlbFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findGlbFiles(path)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".glb")) {
      files.push(path);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function writeFileEnsuringDirectory(path, contents) {
  await stat(dirname(path)).catch(async () => {
    await import("node:fs/promises").then(({ mkdir }) => mkdir(dirname(path), { recursive: true }));
  });
  await writeFile(path, contents);
}

function sortRecord(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

function toPosixPath(path) {
  return path.split(sep).join("/");
}

async function runCli() {
  const result = await auditPrivatePrototypeAssets();
  const { audit, outputRelativePath } = result;
  const warningText = Object.entries(audit.summary.warningCounts)
    .map(([warning, count]) => `${warning}:${count}`)
    .join(", ");

  console.log(`private asset audit wrote ${outputRelativePath}`);
  console.log(`audited ${audit.summary.totalGlbCount} GLB files`);
  console.log(`categories ${JSON.stringify(audit.summary.categories)}`);
  console.log(`warnings ${warningText || "none"}`);
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === pathToFileURL(currentFilePath).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
