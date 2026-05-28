import assert from "node:assert/strict";
import test from "node:test";

import {
  createPrivateAssetAudit,
  parseGlbAssetMetadata,
  summarizePrivateAssetAudit
} from "../scripts/private-asset-audit.mjs";

function createGlbFixture(json) {
  const jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const paddedJsonLength = Math.ceil(jsonBytes.length / 4) * 4;
  const paddedJson = Buffer.alloc(paddedJsonLength, 0x20);
  jsonBytes.copy(paddedJson);

  const totalLength = 12 + 8 + paddedJson.length;
  const buffer = Buffer.alloc(totalLength);
  buffer.writeUInt32LE(0x46546c67, 0);
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(totalLength, 8);
  buffer.writeUInt32LE(paddedJson.length, 12);
  buffer.writeUInt32LE(0x4e4f534a, 16);
  paddedJson.copy(buffer, 20);
  return buffer;
}

test("private asset audit parses GLB metadata without loading binary art data", () => {
  const glb = createGlbFixture({
    asset: {
      version: "2.0"
    },
    scene: 0,
    scenes: [
      {
        nodes: [0]
      }
    ],
    nodes: [
      {
        mesh: 0,
        scale: [100, 1, 1]
      }
    ],
    meshes: [
      {
        primitives: [{ attributes: { POSITION: 0 } }, { attributes: { POSITION: 1 } }]
      },
      {
        primitives: [{ attributes: { POSITION: 2 } }]
      }
    ],
    accessors: [{}, {}, {}],
    materials: [{}, {}],
    textures: [{}],
    images: [{ uri: "placeholder.png" }],
    animations: [{}]
  });

  const entry = parseGlbAssetMetadata({
    buffer: glb,
    fileSizeBytes: glb.byteLength,
    relativePath: "industrial-dressing/example.glb"
  });

  assert.equal(entry.relativePath, "industrial-dressing/example.glb");
  assert.equal(entry.category, "industrial-dressing");
  assert.equal(entry.fileSizeBytes, glb.byteLength);
  assert.equal(entry.meshCount, 2);
  assert.equal(entry.materialCount, 2);
  assert.equal(entry.textureCount, 1);
  assert.equal(entry.imageCount, 1);
  assert.equal(entry.animationCount, 1);
  assert.equal(entry.accessorCount, 3);
  assert.equal(entry.primitiveCount, 3);
  assert.deepEqual(entry.warnings, ["unusual-scale-metadata"]);
});

test("private asset audit reports missing scene data and category summaries", () => {
  const smallAsset = parseGlbAssetMetadata({
    buffer: createGlbFixture({
      asset: {
        version: "2.0"
      },
      meshes: [],
      materials: []
    }),
    fileSizeBytes: 1000,
    relativePath: "arena-kit/empty.glb"
  });
  const largeAsset = parseGlbAssetMetadata({
    buffer: createGlbFixture({
      asset: {
        version: "2.0"
      },
      scene: 0,
      scenes: [{ nodes: [] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{}] }]
    }),
    fileSizeBytes: 16 * 1024 * 1024,
    relativePath: "characters-firstperson/large.glb"
  });

  const audit = createPrivateAssetAudit({
    entries: [smallAsset, largeAsset],
    generatedAt: "2026-05-27T00:00:00.000Z",
    rootRelativePath: "apps/client/public/assets/private-prototype"
  });
  const summary = summarizePrivateAssetAudit(audit.entries);

  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.assetRoot, "apps/client/public/assets/private-prototype");
  assert.equal(audit.entries.length, 2);
  assert.equal(audit.summary.totalGlbCount, 2);
  assert.deepEqual(audit.summary.categories, {
    "arena-kit": 1,
    "characters-firstperson": 1
  });
  assert.equal(summary.warningCounts["missing-scene-data"], 1);
  assert.equal(summary.warningCounts["very-large-file"], 1);
  assert.equal(smallAsset.warnings.includes("missing-scene-data"), true);
  assert.equal(largeAsset.warnings.includes("very-large-file"), true);
});
