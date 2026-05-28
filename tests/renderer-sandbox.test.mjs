import assert from "node:assert/strict";
import test from "node:test";

import {
  applySandboxLook,
  applySandboxMovement,
  createSandboxMoveIntentFromKeys,
  createInitialSandboxCameraState
} from "../apps/client/dist/sandbox/camera-sandbox.js";
import { EBB_TERMINAL_ARENA } from "../apps/client/dist/maps/ebb-terminal.js";
import { createGreyboxLayout, getGreyboxLayoutMetadata } from "../apps/client/dist/sandbox/greybox-layout.js";
import { derivePlayerCameraPose } from "../apps/client/dist/sandbox/player-camera.js";
import {
  PRIVATE_PROTOTYPE_ASSETS,
  createSandboxPrototypeAssetPreviewPlan,
  summarizeSandboxPrototypeAssetManifest,
  validateSandboxPrototypeAssetManifest
} from "../apps/client/dist/sandbox/prototype-assets.js";
import {
  PRIVATE_ASSET_CANDIDATE_TAGS,
  describePrivateAssetCandidateTag,
  validatePrivateAssetCandidateTags
} from "../apps/client/dist/sandbox/private-asset-tags.js";
import {
  SANDBOX_PROTOTYPE_ASSET_PRESET_IDS,
  SANDBOX_PROTOTYPE_ASSET_PRESETS,
  createSandboxPrototypeAssetPresetPreviewPlan,
  validateSandboxPrototypeAssetPresets
} from "../apps/client/dist/sandbox/prototype-asset-presets.js";
import {
  EBB_TERMINAL_SANDBOX_DRESSING_PLAN,
  SANDBOX_ARENA_DRESSING_PURPOSES,
  createSandboxArenaDressingPreviewPlan,
  validateSandboxArenaDressingPlan
} from "../apps/client/dist/sandbox/arena-dressing-plan.js";
import {
  isRenderablePixelSampleHealthy,
  summarizeScenePixelSamples
} from "../apps/client/dist/sandbox/render-telemetry.js";

test("greybox layout contains an original readable test space", () => {
  const layout = createGreyboxLayout();
  const metadata = getGreyboxLayoutMetadata();
  const forbiddenNames = /\b(counter|strike|valve|dust|dust2|mirage|inferno|nuke|terrorist|counter-terrorist)\b/i;

  assert.equal(layout.some((primitive) => primitive.kind === "floor"), true);
  assert.equal(layout.filter((primitive) => primitive.kind === "wall").length, 4);
  assert.equal(layout.filter((primitive) => primitive.kind === "cover").length >= 3, true);
  assert.equal(layout.filter((primitive) => primitive.kind === "scale-reference").length >= 2, true);

  for (const primitive of layout) {
    assert.match(primitive.id, /^[a-z0-9-]+$/);
    assert.equal(forbiddenNames.test(`${primitive.id} ${primitive.label}`), false);
    assert.equal(primitive.size.length, 3);
    assert.equal(primitive.position.length, 3);
    assert.equal(primitive.size.every((value) => Number.isFinite(value) && value > 0), true);
    assert.equal(primitive.position.every((value) => Number.isFinite(value)), true);
  }

  assert.equal(metadata.mapId, EBB_TERMINAL_ARENA.id);
  assert.equal(metadata.revision, EBB_TERMINAL_ARENA.revision);
  assert.equal(metadata.primitiveCount, layout.length);
  assert.equal(metadata.spawnMarkerCount, EBB_TERMINAL_ARENA.spawnMarkers.length);
});

test("camera sandbox helpers move local camera state without player authority fields", () => {
  const initial = createInitialSandboxCameraState();
  const playerCamera = derivePlayerCameraPose({
    map: EBB_TERMINAL_ARENA,
    sourcePose: {
      x: initial.position[0],
      y: initial.position[1],
      z: initial.position[2],
      yawRadians: initial.yawRadians,
      pitchRadians: initial.pitchRadians
    }
  });
  const looked = applySandboxLook(initial, {
    movementX: 120,
    movementY: 200
  });
  const moved = applySandboxMovement(looked, {
    deltaSeconds: 0.5,
    forward: 1,
    right: 0,
    up: 0
  });

  assert.notEqual(looked.yawRadians, initial.yawRadians);
  assert.equal(looked.pitchRadians <= Math.PI / 2, true);
  assert.equal(looked.pitchRadians >= -Math.PI / 2, true);
  assert.notDeepEqual(moved.position, initial.position);
  assert.equal("sessionId" in moved, false);
  assert.equal("entityId" in moved, false);
  assert.equal("worldId" in moved, false);
  assert.equal(playerCamera.mode, "player-camera");
  assert.equal(playerCamera.metadataValid, true);
  assert.equal(playerCamera.mapId, EBB_TERMINAL_ARENA.id);
});

test("camera sandbox key helper maps inspection keys to local move intent", () => {
  assert.deepEqual(createSandboxMoveIntentFromKeys(new Set(["KeyW", "KeyD", "Space"]), 0.25), {
    deltaSeconds: 0.25,
    forward: 1,
    right: 1,
    up: 1
  });

  assert.deepEqual(createSandboxMoveIntentFromKeys(new Set(["KeyS", "KeyA", "ShiftLeft"]), 0.1), {
    deltaSeconds: 0.1,
    forward: -1,
    right: -1,
    up: -1
  });
});

test("render telemetry identifies nonblank scene pixel samples", () => {
  const pixels = new Uint8Array([
    17, 23, 25, 255,
    17, 23, 25, 255,
    110, 120, 116, 255,
    142, 151, 133, 255
  ]);

  const sample = summarizeScenePixelSamples({
    backgroundColor: [17, 23, 25],
    height: 2,
    pixels,
    width: 2
  });

  assert.equal(sample.samples, 4);
  assert.equal(sample.nonBackgroundSamples, 2);
  assert.equal(sample.distinctColorSamples, 2);
  assert.equal(isRenderablePixelSampleHealthy(sample), true);
});

test("private prototype asset manifest stays renderer-only and points at ignored browser assets", () => {
  const summary = summarizeSandboxPrototypeAssetManifest(PRIVATE_PROTOTYPE_ASSETS);
  const previewPlan = createSandboxPrototypeAssetPreviewPlan();
  const validation = validateSandboxPrototypeAssetManifest(PRIVATE_PROTOTYPE_ASSETS);

  assert.equal(summary.totalCount > 3, true);
  assert.deepEqual(summary.categories, [
    "arena-kit",
    "characters-firstperson",
    "cover-training-props",
    "equipment-placeholder",
    "industrial-dressing"
  ]);
  assert.equal(summary.allPrivatePrototypePaths, true);
  assert.equal(summary.containsServerPath, false);
  assert.equal(summary.containsNetworkUrl, false);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.errors, []);
  assert.equal(previewPlan.length, PRIVATE_PROTOTYPE_ASSETS.length);
  assert.equal(previewPlan.every((asset) => asset.url.startsWith("/assets/private-prototype/")), true);
  assert.equal(previewPlan.some((asset) => asset.id === "prototype-arena-block"), true);
  assert.equal(previewPlan.some((asset) => asset.id === "prototype-training-crate"), true);
  assert.equal(previewPlan.some((asset) => asset.id === "prototype-fps-hands"), true);
});

test("private prototype asset manifest validation rejects unsafe or unusable entries", () => {
  const baseAsset = PRIVATE_PROTOTYPE_ASSETS[0];
  const validation = validateSandboxPrototypeAssetManifest([
    baseAsset,
    {
      ...baseAsset,
      id: baseAsset.id,
      url: "https://example.test/remote.glb"
    },
    {
      ...baseAsset,
      id: "server-path",
      url: "/apps/server/private-prototype/server.glb"
    },
    {
      ...baseAsset,
      id: "bad-placement",
      fitMaxDimensionMeters: Number.POSITIVE_INFINITY,
      previewPosition: [0, Number.NaN, 0]
    }
  ]);

  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => error.includes("Duplicate asset id")), true);
  assert.equal(validation.errors.some((error) => error.includes("network URL")), true);
  assert.equal(validation.errors.some((error) => error.includes("private prototype path")), true);
  assert.equal(validation.errors.some((error) => error.includes("server path")), true);
  assert.equal(validation.errors.some((error) => error.includes("fitMaxDimensionMeters")), true);
  assert.equal(validation.errors.some((error) => error.includes("previewPosition")), true);
});

test("private prototype preview plan can filter renderer-only categories", () => {
  const industrialPlan = createSandboxPrototypeAssetPreviewPlan({
    category: "industrial-dressing"
  });
  const equipmentPlan = createSandboxPrototypeAssetPreviewPlan({
    category: "equipment-placeholder"
  });

  assert.equal(industrialPlan.length > 0, true);
  assert.equal(industrialPlan.every((asset) => asset.category === "industrial-dressing"), true);
  assert.equal(equipmentPlan.length > 0, true);
  assert.equal(equipmentPlan.every((asset) => asset.category === "equipment-placeholder"), true);
});

test("private asset candidate tags describe local audit decisions without generated data", () => {
  assert.deepEqual(PRIVATE_ASSET_CANDIDATE_TAGS, [
    "preview-ok",
    "needs-scale-check",
    "too-heavy-for-browser",
    "character-reference-only",
    "prop-reference-only",
    "replace-before-public"
  ]);

  assert.equal(describePrivateAssetCandidateTag("preview-ok").publicRedistributionAllowed, false);
  assert.equal(describePrivateAssetCandidateTag("replace-before-public").requiresReplacement, true);

  assert.deepEqual(validatePrivateAssetCandidateTags(["preview-ok", "replace-before-public"]), {
    ok: true,
    errors: []
  });
  assert.deepEqual(validatePrivateAssetCandidateTags(["preview-ok", "preview-ok", "unknown-tag"]), {
    ok: false,
    errors: ["Duplicate candidate tag: preview-ok", "Unknown candidate tag: unknown-tag"]
  });
});

test("private prototype asset presets are curated renderer-only preview sets", () => {
  const forbiddenNames = /\b(counter|strike|valve|dust|dust2|mirage|inferno|nuke|terrorist|counter-terrorist)\b/i;
  const validation = validateSandboxPrototypeAssetPresets({
    assets: PRIVATE_PROTOTYPE_ASSETS,
    presets: SANDBOX_PROTOTYPE_ASSET_PRESETS
  });

  assert.deepEqual(SANDBOX_PROTOTYPE_ASSET_PRESET_IDS, ["scale-check", "arena-dressing", "equipment-check"]);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.errors, []);

  const scaleCheck = createSandboxPrototypeAssetPresetPreviewPlan("scale-check");
  assert.equal(scaleCheck.some((asset) => asset.id === "prototype-fps-hands"), true);
  assert.equal(scaleCheck.some((asset) => asset.id === "prototype-training-crate"), true);
  assert.equal(scaleCheck.some((asset) => asset.id === "prototype-arena-block"), true);

  const arenaDressing = createSandboxPrototypeAssetPresetPreviewPlan("arena-dressing");
  assert.equal(arenaDressing.length >= 3, true);
  assert.equal(arenaDressing.some((asset) => asset.category === "industrial-dressing"), true);
  assert.equal(arenaDressing.some((asset) => asset.category === "arena-kit"), true);

  const equipmentCheck = createSandboxPrototypeAssetPresetPreviewPlan("equipment-check");
  assert.deepEqual(
    equipmentCheck.map((asset) => asset.category),
    ["equipment-placeholder"]
  );

  for (const preset of SANDBOX_PROTOTYPE_ASSET_PRESETS) {
    assert.match(preset.id, /^[a-z0-9-]+$/);
    assert.equal(forbiddenNames.test(`${preset.id} ${preset.label}`), false);
  }
});

test("private prototype preset validation rejects invalid ids, missing assets, and unsafe paths", () => {
  const basePreset = SANDBOX_PROTOTYPE_ASSET_PRESETS[0];
  const baseAsset = PRIVATE_PROTOTYPE_ASSETS[0];
  const validation = validateSandboxPrototypeAssetPresets({
    assets: [
      baseAsset,
      {
        ...baseAsset,
        id: "network-asset",
        url: "https://example.test/private.glb"
      },
      {
        ...baseAsset,
        id: "server-asset",
        url: "/apps/server/private.glb"
      }
    ],
    presets: [
      basePreset,
      {
        ...basePreset,
        id: basePreset.id
      },
      {
        assetIds: ["missing-asset"],
        id: "missing-reference",
        label: "Missing Reference"
      },
      {
        assetIds: ["network-asset", "server-asset"],
        id: "unsafe-reference",
        label: "Unsafe Reference"
      },
      {
        assetIds: [baseAsset.id],
        id: "dust2",
        label: "Copied Name"
      }
    ]
  });

  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => error.includes("Duplicate preset id")), true);
  assert.equal(validation.errors.some((error) => error.includes("Unknown preset asset id")), true);
  assert.equal(validation.errors.some((error) => error.includes("network URL")), true);
  assert.equal(validation.errors.some((error) => error.includes("server path")), true);
  assert.equal(validation.errors.some((error) => error.includes("copied shooter naming")), true);
});

test("arena dressing plan is renderer-only and resolves manifest assets inside the map bounds", () => {
  const forbiddenNames = /\b(counter|strike|valve|dust|dust2|mirage|inferno|nuke|terrorist|counter-terrorist)\b/i;
  const validation = validateSandboxArenaDressingPlan({
    assets: PRIVATE_PROTOTYPE_ASSETS,
    map: EBB_TERMINAL_ARENA,
    plan: EBB_TERMINAL_SANDBOX_DRESSING_PLAN
  });
  const previewPlan = createSandboxArenaDressingPreviewPlan({
    assets: PRIVATE_PROTOTYPE_ASSETS,
    plan: EBB_TERMINAL_SANDBOX_DRESSING_PLAN
  });

  assert.deepEqual(SANDBOX_ARENA_DRESSING_PURPOSES, [
    "scale-reference",
    "cover-readability",
    "industrial-dressing",
    "equipment-readability"
  ]);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.errors, []);
  assert.equal(EBB_TERMINAL_SANDBOX_DRESSING_PLAN.mapId, EBB_TERMINAL_ARENA.id);
  assert.equal(EBB_TERMINAL_SANDBOX_DRESSING_PLAN.mapRevision, EBB_TERMINAL_ARENA.revision);
  assert.equal(EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements.length >= 5, true);
  assert.equal(previewPlan.length, EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements.length);
  assert.equal(previewPlan.every((entry) => entry.asset.url.startsWith("/assets/private-prototype/")), true);
  assert.equal(previewPlan.some((entry) => entry.purpose === "scale-reference"), true);
  assert.equal(previewPlan.some((entry) => entry.purpose === "cover-readability"), true);
  assert.equal(previewPlan.some((entry) => entry.purpose === "industrial-dressing"), true);
  assert.equal(previewPlan.some((entry) => entry.purpose === "equipment-readability"), true);

  for (const placement of EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements) {
    assert.match(placement.id, /^[a-z0-9-]+$/);
    assert.equal(forbiddenNames.test(`${placement.id} ${placement.assetId} ${placement.purpose}`), false);
    assert.equal(placement.position.every((value) => Number.isFinite(value)), true);
    assert.equal(Number.isFinite(placement.yawRadians), true);
    assert.equal(Number.isFinite(placement.fitMaxDimensionMeters), true);
    assert.equal(placement.fitMaxDimensionMeters > 0, true);
    assert.equal("collision" in placement, false);
    assert.equal("serverAuthority" in placement, false);
  }
});

test("arena dressing validation rejects duplicates, unsafe assets, bad transforms, and copied names", () => {
  const basePlacement = EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements[0];
  const baseAsset = PRIVATE_PROTOTYPE_ASSETS[0];
  const validation = validateSandboxArenaDressingPlan({
    assets: [
      baseAsset,
      {
        ...baseAsset,
        id: "network-asset",
        url: "https://example.test/private.glb"
      },
      {
        ...baseAsset,
        id: "server-asset",
        url: "/apps/server/private.glb"
      }
    ],
    map: EBB_TERMINAL_ARENA,
    plan: {
      ...EBB_TERMINAL_SANDBOX_DRESSING_PLAN,
      id: "dust2",
      label: "Copied Name",
      placements: [
        basePlacement,
        {
          ...basePlacement,
          assetId: baseAsset.id
        },
        {
          ...basePlacement,
          id: "missing-reference",
          assetId: "missing-asset"
        },
        {
          ...basePlacement,
          id: "network-reference",
          assetId: "network-asset"
        },
        {
          ...basePlacement,
          id: "server-reference",
          assetId: "server-asset"
        },
        {
          ...basePlacement,
          id: "bad-position",
          assetId: baseAsset.id,
          position: [Number.POSITIVE_INFINITY, 0, 0]
        },
        {
          ...basePlacement,
          id: "bad-yaw",
          assetId: baseAsset.id,
          yawRadians: Number.NaN
        },
        {
          ...basePlacement,
          id: "bad-fit",
          assetId: baseAsset.id,
          fitMaxDimensionMeters: 0
        },
        {
          ...basePlacement,
          id: "outside-bounds",
          assetId: baseAsset.id,
          position: [99, 0, 0]
        }
      ]
    }
  });

  assert.equal(validation.ok, false);
  assert.equal(validation.errors.some((error) => error.includes("Duplicate dressing placement id")), true);
  assert.equal(validation.errors.some((error) => error.includes("Unknown dressing asset id")), true);
  assert.equal(validation.errors.some((error) => error.includes("network URL")), true);
  assert.equal(validation.errors.some((error) => error.includes("server path")), true);
  assert.equal(validation.errors.some((error) => error.includes("finite 3D position")), true);
  assert.equal(validation.errors.some((error) => error.includes("finite yaw")), true);
  assert.equal(validation.errors.some((error) => error.includes("positive fitMaxDimensionMeters")), true);
  assert.equal(validation.errors.some((error) => error.includes("inside map bounds")), true);
  assert.equal(validation.errors.some((error) => error.includes("copied shooter naming")), true);
});

test("arena dressing preview plan skips unresolved assets without throwing", () => {
  const firstPlacement = EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements[0];
  const assetsWithoutFirstPlacement = PRIVATE_PROTOTYPE_ASSETS.filter((asset) => asset.id !== firstPlacement.assetId);
  const previewPlan = createSandboxArenaDressingPreviewPlan({
    assets: assetsWithoutFirstPlacement,
    plan: EBB_TERMINAL_SANDBOX_DRESSING_PLAN
  });

  assert.equal(previewPlan.length, EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements.length - 1);
  assert.equal(previewPlan.some((entry) => entry.id === firstPlacement.id), false);
});
