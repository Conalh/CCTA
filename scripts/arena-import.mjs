// Dependency-free glTF/GLB -> arena converter logic. Pure and testable: it never touches the
// filesystem (the CLI wrapper in import-arena-glb.mjs does that). The idea is simple: a glTF
// POSITION accessor is required by spec to carry the mesh's local min/max, so for a box-modeled
// level every object's eight local-AABB corners ARE its actual vertices. Transform those corners
// by the node's world matrix and you get an exact axis-aligned box (center + size) — exactly the
// arena primitive shape — with no need to read the binary vertex buffer at all.

const GLB_MAGIC = 0x46546c67; // "glTF"
const GLB_CHUNK_JSON = 0x4e4f534a; // "JSON"
const GLB_CHUNK_BIN = 0x004e4942; // "BIN\0"
const MIN_PRIMITIVE_SIZE = 0.05;
const DEFAULT_BOUNDS_MARGIN = 1.5;
const MAX_PRIMITIVES = 64;
const MAX_SPAWN_MARKERS = 16;

// ---------------------------------------------------------------------------
// GLB container
// ---------------------------------------------------------------------------

// Parse a binary .glb into its embedded glTF JSON and (optional) BIN buffer. A .gltf text file
// does not need this — the CLI JSON.parses it directly.
export function parseGlbContainer(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 12 || view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error("Not a GLB file (missing glTF magic). Pass a .glb or .gltf file.");
  }
  const version = view.getUint32(4, true);
  if (version !== 2) {
    throw new Error(`Unsupported GLB version ${version}; expected 2.`);
  }
  const totalLength = view.getUint32(8, true);

  let offset = 12;
  let json;
  let bin;
  while (offset + 8 <= totalLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;
    if (dataEnd > bytes.byteLength) {
      throw new Error("GLB chunk overruns the file; the file is truncated or malformed.");
    }
    const chunk = bytes.subarray(dataStart, dataEnd);
    if (chunkType === GLB_CHUNK_JSON) {
      json = JSON.parse(new TextDecoder("utf-8").decode(chunk));
    } else if (chunkType === GLB_CHUNK_BIN) {
      bin = chunk;
    }
    offset = dataEnd;
  }

  if (json === undefined) {
    throw new Error("GLB has no JSON chunk.");
  }
  return { json, bin };
}

// ---------------------------------------------------------------------------
// Node bounds extraction (the "scan for measurements" step)
// ---------------------------------------------------------------------------

// Walk the glTF scene graph, compose each node's world matrix, and return a flat list of named
// nodes with their world-space axis-aligned box (or a point, for transform-only empties like
// spawns). Rotation/scale/parenting are all honoured.
export function extractNodeBounds(gltf) {
  const nodes = Array.isArray(gltf?.nodes) ? gltf.nodes : [];
  const scenes = Array.isArray(gltf?.scenes) ? gltf.scenes : [];
  const sceneIndex = Number.isInteger(gltf?.scene) ? gltf.scene : 0;
  const roots = scenes[sceneIndex]?.nodes ?? nodes.map((_node, index) => index);

  const results = [];
  const visit = (nodeIndex, parentMatrix) => {
    const node = nodes[nodeIndex];
    if (node === undefined) {
      return;
    }
    const worldMatrix = multiply(parentMatrix, localMatrix(node));
    const local = node.mesh !== undefined ? meshLocalBounds(gltf, node.mesh) : undefined;

    const translation = [worldMatrix[12], worldMatrix[13], worldMatrix[14]];
    if (local === undefined) {
      // A transform-only node (empty): record it as a point at its world translation.
      results.push({ name: node.name, hasMesh: false, min: translation, max: translation, translation });
    } else {
      const world = transformAabb(worldMatrix, local.min, local.max);
      results.push({ name: node.name, hasMesh: true, min: world.min, max: world.max, translation });
    }

    for (const child of node.children ?? []) {
      visit(child, worldMatrix);
    }
  };

  for (const root of roots) {
    visit(root, IDENTITY);
  }
  return results;
}

// Union of every primitive's POSITION accessor min/max for a mesh (its local-space AABB).
function meshLocalBounds(gltf, meshIndex) {
  const mesh = gltf?.meshes?.[meshIndex];
  if (mesh === undefined || !Array.isArray(mesh.primitives)) {
    return undefined;
  }
  let min;
  let max;
  for (const primitive of mesh.primitives) {
    const accessorIndex = primitive?.attributes?.POSITION;
    const accessor = gltf?.accessors?.[accessorIndex];
    if (!Array.isArray(accessor?.min) || !Array.isArray(accessor?.max)) {
      continue;
    }
    if (min === undefined) {
      min = [...accessor.min];
      max = [...accessor.max];
    } else {
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis], accessor.min[axis]);
        max[axis] = Math.max(max[axis], accessor.max[axis]);
      }
    }
  }
  return min === undefined ? undefined : { min, max };
}

// ---------------------------------------------------------------------------
// Node list -> arena metadata
// ---------------------------------------------------------------------------

export function buildArenaFromNodes(nodes, options = {}) {
  const warnings = [];
  const id = normalizeArenaId(options.id);
  if (id === undefined) {
    throw new Error("An arena id is required (e.g. --id arena-foundry-row).");
  }
  const displayName =
    typeof options.displayName === "string" && options.displayName.trim().length > 0
      ? options.displayName.trim()
      : titleCaseFromId(id);
  const revision = Number.isInteger(options.revision) && options.revision >= 1 ? options.revision : 1;
  const margin = typeof options.boundsMargin === "number" && options.boundsMargin >= 0 ? options.boundsMargin : DEFAULT_BOUNDS_MARGIN;

  const primitives = [];
  const labels = [];
  const cops = [];
  const robbers = [];
  const usedIds = new Set();

  for (const node of nodes) {
    const name = typeof node?.name === "string" ? node.name : "";
    const spawnSide = classifySpawn(name);
    if (spawnSide !== undefined) {
      const position = roundVec(node.hasMesh ? centerOf(node) : node.translation);
      (spawnSide === "cops" ? cops : robbers).push({ name, position });
      continue;
    }
    if (classifyLabel(name)) {
      labels.push({
        id: uniqueId(name, usedIds),
        text: humanize(name.replace(/^label[_\-.]?/i, "")) || "Label",
        position: roundVec(centerOf(node))
      });
      continue;
    }
    const kind = classifyKind(name);
    if (kind === undefined) {
      if (name.length > 0) {
        warnings.push(`Skipped "${name}": name does not start with wall/cover/floor/spawn/label.`);
      }
      continue;
    }
    if (!node.hasMesh) {
      warnings.push(`Skipped "${name}": ${kind} needs geometry but the node has no mesh.`);
      continue;
    }

    const size = roundVec(sizeOf(node).map((value) => clampSize(value, name, warnings)));
    primitives.push({
      id: uniqueId(name, usedIds),
      kind,
      label: humanize(name) || kind,
      position: roundVec(centerOf(node)),
      size
    });
  }

  if (primitives.length === 0) {
    throw new Error("No wall/cover/floor objects found. Name your geometry wall_*, cover_*, or floor_*.");
  }
  if (primitives.length > MAX_PRIMITIVES) {
    warnings.push(`${primitives.length} primitives exceeds the ${MAX_PRIMITIVES} cap; trim the level.`);
  }

  const spawnMarkers = [];
  const orderedCops = [...cops].sort(byNaturalName);
  const orderedRobbers = [...robbers].sort(byNaturalName);
  orderedCops.forEach((spawn, index) => spawnMarkers.push(makeSpawnMarker("cops", index, spawn, usedIds)));
  orderedRobbers.forEach((spawn, index) => spawnMarkers.push(makeSpawnMarker("robbers", index, spawn, usedIds)));
  if (spawnMarkers.length === 0) {
    throw new Error("No spawns found. Add empties named spawn_cops_1..4 and spawn_robbers_1..4.");
  }
  if (spawnMarkers.length > MAX_SPAWN_MARKERS) {
    warnings.push(`${spawnMarkers.length} spawns exceeds the ${MAX_SPAWN_MARKERS} cap.`);
  }

  // slotStarts (the actual spawn positions the server uses) need the full slate of 4 Cops + 4
  // Robbers in slot order. Emit them only when that holds; otherwise the engine falls back to its
  // default starts and we warn so it is not a silent surprise.
  let slotStarts;
  const copsYaw = typeof options.copsYaw === "number" ? options.copsYaw : 0;
  const robbersYaw = typeof options.robbersYaw === "number" ? options.robbersYaw : Math.PI;
  if (orderedCops.length === 4 && orderedRobbers.length === 4) {
    slotStarts = [
      ...orderedCops.map((spawn) => ({ position: spawn.position, yaw: copsYaw })),
      ...orderedRobbers.map((spawn) => ({ position: spawn.position, yaw: robbersYaw }))
    ];
  } else {
    warnings.push(
      `slotStarts omitted: found ${orderedCops.length} Cop and ${orderedRobbers.length} Robber spawns (need 4 + 4). ` +
        "Players will use the engine's default starts until you provide 8."
    );
  }

  const worldBounds = computeWorldBounds([...primitives], spawnMarkers, margin);

  const metadata = {
    id,
    displayName,
    revision,
    worldBounds,
    primitives,
    playerScaleReferences: [],
    spawnMarkers
  };
  if (labels.length > 0) {
    metadata.labels = labels;
  }
  if (slotStarts !== undefined) {
    metadata.slotStarts = slotStarts;
  }
  return { metadata, warnings };
}

function makeSpawnMarker(side, index, spawn, usedIds) {
  return {
    id: uniqueId(`spawn-${side}-${index + 1}`, usedIds),
    label: `${side === "cops" ? "Cops" : "Robbers"} spawn ${index + 1}`,
    role: "neutral",
    position: spawn.position,
    yaw: side === "cops" ? 0 : Math.PI
  };
}

function computeWorldBounds(primitives, spawnMarkers, margin) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const include = (center, halfSize) => {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], center[axis] - halfSize[axis]);
      max[axis] = Math.max(max[axis], center[axis] + halfSize[axis]);
    }
  };
  for (const primitive of primitives) {
    include(primitive.position, primitive.size.map((value) => value / 2));
  }
  for (const spawn of spawnMarkers) {
    include(spawn.position, [0, 0, 0]);
  }
  // Pad the horizontal plane so every box fits with room to spare; keep a small floor lip and
  // headroom above the tallest wall.
  return {
    min: roundVec([min[0] - margin, Math.min(min[1] - 0.25, -0.25), min[2] - margin]),
    max: roundVec([max[0] + margin, max[1] + 0.5, max[2] + margin])
  };
}

// ---------------------------------------------------------------------------
// TypeScript emission
// ---------------------------------------------------------------------------

export function formatArenaModule(metadata) {
  const constName = `${metadata.id.replace(/^arena-/, "").replace(/-/g, "_").toUpperCase()}_ARENA`;
  return `import type { ArenaMapMetadata } from "./map-metadata.js";

// Generated from a 3D block-out by scripts/import-arena-glb.mjs. Safe to edit by hand.
export const ${constName}: ArenaMapMetadata = ${JSON.stringify(metadata, null, 2)};
`;
}

// ---------------------------------------------------------------------------
// Classification + helpers
// ---------------------------------------------------------------------------

function normalizeName(raw) {
  return String(raw ?? "")
    .replace(/\.\d+$/, "")
    .trim()
    .toLowerCase();
}

function classifyKind(name) {
  const normalized = normalizeName(name);
  if (/^floor(?:[_\-.].*)?$/.test(normalized)) return "floor";
  if (/^wall(?:[_\-.].*)?$/.test(normalized)) return "wall";
  if (/^cover(?:[_\-.].*)?$/.test(normalized)) return "cover";
  return undefined;
}

function classifySpawn(name) {
  const normalized = normalizeName(name);
  if (/^(?:spawn[_\-.]?)?cops(?:[_\-.].*)?$/.test(normalized)) return "cops";
  if (/^(?:spawn[_\-.]?)?robbers(?:[_\-.].*)?$/.test(normalized)) return "robbers";
  return undefined;
}

function classifyLabel(name) {
  return /^label(?:[_\-.].*)?$/.test(normalizeName(name));
}

function centerOf(node) {
  return [(node.min[0] + node.max[0]) / 2, (node.min[1] + node.max[1]) / 2, (node.min[2] + node.max[2]) / 2];
}

function sizeOf(node) {
  return [node.max[0] - node.min[0], node.max[1] - node.min[1], node.max[2] - node.min[2]];
}

function clampSize(value, name, warnings) {
  const magnitude = Math.abs(value);
  if (magnitude < MIN_PRIMITIVE_SIZE) {
    warnings.push(`"${name}" is paper-thin on one axis; bumped to ${MIN_PRIMITIVE_SIZE}m. Give it real thickness.`);
    return MIN_PRIMITIVE_SIZE;
  }
  return magnitude;
}

function uniqueId(rawName, usedIds) {
  let base = normalizeName(rawName)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length === 0) {
    base = "node";
  }
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function humanize(rawName) {
  return normalizeName(rawName)
    .replace(/[_\-.]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeArenaId(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return undefined;
  }
  let slug = raw
    .trim()
    .toLowerCase()
    .replace(/^arena-/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length === 0) {
    return undefined;
  }
  return `arena-${slug}`;
}

function titleCaseFromId(id) {
  return humanize(id.replace(/^arena-/, "")) || "Untitled Arena";
}

function byNaturalName(left, right) {
  return String(left.name).localeCompare(String(right.name), undefined, { numeric: true, sensitivity: "base" });
}

function roundVec(vector) {
  return vector.map((value) => Math.round(value * 1e4) / 1e4);
}

// ---------------------------------------------------------------------------
// Minimal column-major 4x4 matrix math (glTF convention)
// ---------------------------------------------------------------------------

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function localMatrix(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) {
    return node.matrix.slice();
  }
  const t = Array.isArray(node.translation) ? node.translation : [0, 0, 0];
  const q = Array.isArray(node.rotation) ? node.rotation : [0, 0, 0, 1];
  const s = Array.isArray(node.scale) ? node.scale : [1, 1, 1];
  return composeTrs(t, q, s);
}

function composeTrs(t, q, s) {
  const [x, y, z, w] = q;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  const [sx, sy, sz] = s;
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    t[0],
    t[1],
    t[2],
    1
  ];
}

function multiply(a, b) {
  const out = new Array(16);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function transformPoint(matrix, point) {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
  ];
}

// Transform the 8 corners of a local AABB and take the min/max — exact for box meshes, a tight
// conservative bound for anything else.
function transformAabb(matrix, localMin, localMax) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let corner = 0; corner < 8; corner += 1) {
    const point = transformPoint(matrix, [
      corner & 1 ? localMax[0] : localMin[0],
      corner & 2 ? localMax[1] : localMin[1],
      corner & 4 ? localMax[2] : localMin[2]
    ]);
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], point[axis]);
      max[axis] = Math.max(max[axis], point[axis]);
    }
  }
  return { min, max };
}
