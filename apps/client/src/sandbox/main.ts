import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  applySandboxLook,
  applySandboxMovement,
  createSandboxMoveIntentFromKeys,
  createInitialSandboxCameraState,
  type SandboxCameraState
} from "./camera-sandbox.js";
import { EBB_TERMINAL_ARENA } from "../maps/ebb-terminal.js";
import { createGreyboxLayout, getGreyboxLayoutMetadata, type GreyboxPrimitive } from "./greybox-layout.js";
import {
  createFallbackPlayerCameraSourcePose,
  derivePlayerCameraPose,
  type PlayerCameraPose
} from "./player-camera.js";
import {
  isRenderablePixelSampleHealthy,
  summarizeScenePixelSamples,
  type ScenePixelSampleSummary
} from "./render-telemetry.js";
import {
  SANDBOX_PROTOTYPE_ASSET_CATEGORIES,
  createSandboxPrototypeAssetPreviewPlan,
  validateSandboxPrototypeAssetManifest,
  type SandboxPrototypeAsset,
  type SandboxPrototypeAssetCategory
} from "./prototype-assets.js";
import {
  SANDBOX_PROTOTYPE_ASSET_PRESET_IDS,
  createSandboxPrototypeAssetPresetPreviewPlan,
  validateSandboxPrototypeAssetPresets,
  type SandboxPrototypeAssetPresetId
} from "./prototype-asset-presets.js";
import {
  EBB_TERMINAL_SANDBOX_DRESSING_PLAN,
  createSandboxArenaDressingPreviewPlan,
  validateSandboxArenaDressingPlan,
  type SandboxArenaDressingPreviewPlacement
} from "./arena-dressing-plan.js";

declare global {
  interface Window {
    __BREACHLINE_SANDBOX_STATE__?: Readonly<{
      cameraPosition: readonly [number, number, number];
      frameCount: number;
      arenaDressingEnabled: boolean;
      arenaDressingFailedCount: number;
      arenaDressingLoadedCount: number;
      arenaDressingPlacementCount: number;
      arenaDressingPlanId: string;
      arenaDressingStatus: string;
      arenaDressingTotalCount: number;
      arenaDressingValid: boolean;
      cameraMode: string;
      clampedToBounds: boolean;
      eyeHeightMeters: number;
      mapDisplayName: string;
      mapId: string;
      mapRevision: number;
      metadataValid: boolean;
      playerCameraPose: readonly [number, number, number];
      privateAssetCategory: SandboxPrototypeAssetCategory;
      privateAssetFailedCount: number;
      privateAssetLoadedCount: number;
      privateAssetManifestValid: boolean;
      privateAssetMode: SandboxPrototypeAssetPreviewMode;
      privateAssetPreset: SandboxPrototypeAssetPresetId;
      privateAssetPresetValid: boolean;
      privateAssetStatus: string;
      privateAssetTotalCount: number;
      primitiveCount: number;
      renderSample: ScenePixelSampleSummary;
      renderSampleHealthy: boolean;
      spawnMarkerCount: number;
    }>;
  }
}

const canvas = requireCanvas("sandbox-canvas");
const errorEl = document.getElementById("sandbox-error");
const frameCountEl = document.getElementById("sandbox-frame-count");
const cameraPositionEl = document.getElementById("sandbox-camera-position");
const pointerStateEl = document.getElementById("sandbox-pointer-state");
const renderHealthEl = document.getElementById("sandbox-render-health");
const mapIdEl = document.getElementById("sandbox-map-id");
const mapRevisionEl = document.getElementById("sandbox-map-revision");
const primitiveCountEl = document.getElementById("sandbox-primitive-count");
const spawnCountEl = document.getElementById("sandbox-spawn-count");
const cameraModeEl = document.getElementById("sandbox-camera-mode");
const eyeHeightEl = document.getElementById("sandbox-eye-height");
const playerCameraPoseEl = document.getElementById("sandbox-player-camera-pose");
const metadataValidEl = document.getElementById("sandbox-metadata-valid");
const privateAssetCategoryEl = document.getElementById("sandbox-private-asset-category");
const privateAssetModeEl = document.getElementById("sandbox-private-asset-mode");
const privateAssetPresetEl = document.getElementById("sandbox-private-asset-preset");
const privateAssetsEl = document.getElementById("sandbox-private-assets");
const privateAssetsFailedEl = document.getElementById("sandbox-private-assets-failed");
const arenaDressingToggleEl = document.getElementById("sandbox-arena-dressing-toggle");
const arenaDressingPlanEl = document.getElementById("sandbox-arena-dressing-plan");
const arenaDressingCountEl = document.getElementById("sandbox-arena-dressing-count");
const arenaDressingAssetsEl = document.getElementById("sandbox-arena-dressing-assets");
const arenaDressingFailedEl = document.getElementById("sandbox-arena-dressing-failed");
const privateAssetButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-asset-category]"));
const privateAssetPresetButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-asset-preset]"));
const greyboxLayout = createGreyboxLayout();
const greyboxLayoutMetadata = getGreyboxLayoutMetadata();
const primitiveCount = greyboxLayout.length;
const prototypeAssetManifestValidation = validateSandboxPrototypeAssetManifest();
const prototypeAssetPresetValidation = validateSandboxPrototypeAssetPresets();
const arenaDressingPlanValidation = validateSandboxArenaDressingPlan();
const PRIVATE_PROTOTYPE_ASSET_LOAD_TIMEOUT_MS = 8000;
type SandboxPrototypeAssetPreviewMode = "category" | "preset";
type PrototypeAssetLoadStatus = "none" | "pending" | "loading" | "loaded" | "partial" | "missing";
type ArenaDressingLoadStatus = PrototypeAssetLoadStatus | "hidden" | "invalid";
let selectedPrototypeAssetCategory: SandboxPrototypeAssetCategory = "equipment-placeholder";
let selectedPrototypeAssetMode: SandboxPrototypeAssetPreviewMode = "category";
let selectedPrototypeAssetPreset: SandboxPrototypeAssetPresetId = "equipment-check";
let prototypeAssetLoadGeneration = 0;
let arenaDressingEnabled = false;
let arenaDressingLoadGeneration = 0;
const prototypeAssetLoadState: {
  failed: number;
  loaded: number;
  status: PrototypeAssetLoadStatus;
  total: number;
} = {
  failed: 0,
  loaded: 0,
  status: "pending",
  total: readSelectedPrototypeAssetPlan().length
};
const arenaDressingLoadState: {
  failed: number;
  loaded: number;
  status: ArenaDressingLoadStatus;
  total: number;
} = {
  failed: 0,
  loaded: 0,
  status: "hidden",
  total: EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements.length
};
const keys = new Set<string>();
const fallbackCameraSourcePose = createFallbackPlayerCameraSourcePose(EBB_TERMINAL_ARENA);

let cameraState = createInitialSandboxCameraState({
  pitchRadians: fallbackCameraSourcePose.pitchRadians,
  position: [fallbackCameraSourcePose.x, fallbackCameraSourcePose.y, fallbackCameraSourcePose.z],
  yawRadians: fallbackCameraSourcePose.yawRadians
});
let lastFrameTimeMs = performance.now();
let frameCount = 0;
let latestRenderSample: ScenePixelSampleSummary = {
  distinctColorSamples: 0,
  nonBackgroundSamples: 0,
  samples: 0
};

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#111719");

  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 200);
  camera.rotation.order = "YXZ";

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  addLighting(scene);
  addGreyboxPrimitives(scene, greyboxLayout);
  const prototypeAssetGroup = new THREE.Group();
  prototypeAssetGroup.name = "private-prototype-assets";
  scene.add(prototypeAssetGroup);
  wirePrivateAssetControls(prototypeAssetGroup);
  void loadPrivatePrototypeAssets(prototypeAssetGroup);
  const arenaDressingGroup = new THREE.Group();
  arenaDressingGroup.name = "arena-dressing-assets";
  scene.add(arenaDressingGroup);
  wireArenaDressingControls(arenaDressingGroup);

  const grid = new THREE.GridHelper(18, 18, "#87928c", "#2d3633");
  grid.position.y = 0.01;
  scene.add(grid);

  canvas.addEventListener("click", () => {
    requestPointerLockForCanvas();
  });
  document.addEventListener("pointerlockchange", updatePointerState);
  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== canvas) {
      return;
    }

    cameraState = applySandboxLook(cameraState, {
      movementX: event.movementX,
      movementY: event.movementY
    });
  });
  document.addEventListener("keydown", (event) => {
    if (isSandboxMovementKey(event.code)) {
      event.preventDefault();
      keys.add(event.code);
      cameraState = applySandboxMovement(cameraState, createSandboxMoveIntentFromKeys(new Set([event.code]), 1 / 30));
      updateReadout();
    }
  });
  document.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });
  window.addEventListener("resize", () => {
    resizeRenderer(renderer, camera);
  });

  updatePointerState();
  resizeRenderer(renderer, camera);
  requestAnimationFrame((timeMs) => {
    animate(timeMs, renderer, scene, camera);
  });
} catch (error) {
  reportError(error);
}

function animate(
  timeMs: number,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): void {
  const deltaSeconds = (timeMs - lastFrameTimeMs) / 1000;
  lastFrameTimeMs = timeMs;
  cameraState = applySandboxMovement(cameraState, readMoveIntent(deltaSeconds));
  const playerCameraPose = readPlayerCameraPose();
  applyPlayerCameraPose(camera, playerCameraPose);
  resizeRenderer(renderer, camera);
  renderer.render(scene, camera);
  if (frameCount < 3 || frameCount % 60 === 0) {
    latestRenderSample = readRenderSample(renderer);
  }
  frameCount += 1;
  updateReadout(playerCameraPose);
  requestAnimationFrame((nextTimeMs) => {
    animate(nextTimeMs, renderer, scene, camera);
  });
}

function addLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight("#dbe7df", "#25302d", 1.4));

  const keyLight = new THREE.DirectionalLight("#ffffff", 1.8);
  keyLight.position.set(-3, 7, 5);
  scene.add(keyLight);
}

function addGreyboxPrimitives(scene: THREE.Scene, primitives: readonly GreyboxPrimitive[]): void {
  for (const primitive of primitives) {
    const geometry = new THREE.BoxGeometry(...primitive.size);
    const material = new THREE.MeshStandardMaterial({
      color: primitive.color,
      roughness: 0.82,
      metalness: 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = primitive.id;
    mesh.position.set(...primitive.position);
    scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: "#151b1a" })
    );
    edges.position.copy(mesh.position);
    scene.add(edges);
  }
}

function wirePrivateAssetControls(assetGroup: THREE.Group): void {
  updatePrivateAssetButtonState();

  for (const button of privateAssetButtons) {
    button.addEventListener("click", () => {
      const category = readPrivateAssetCategory(button.dataset.assetCategory);
      if (
        category === undefined ||
        (selectedPrototypeAssetMode === "category" && category === selectedPrototypeAssetCategory)
      ) {
        return;
      }

      selectedPrototypeAssetMode = "category";
      selectedPrototypeAssetCategory = category;
      updatePrivateAssetButtonState();
      void loadPrivatePrototypeAssets(assetGroup);
    });
  }

  for (const button of privateAssetPresetButtons) {
    button.addEventListener("click", () => {
      const preset = readPrivateAssetPreset(button.dataset.assetPreset);
      if (preset === undefined || (selectedPrototypeAssetMode === "preset" && preset === selectedPrototypeAssetPreset)) {
        return;
      }

      selectedPrototypeAssetMode = "preset";
      selectedPrototypeAssetPreset = preset;
      updatePrivateAssetButtonState();
      void loadPrivatePrototypeAssets(assetGroup);
    });
  }
}

function wireArenaDressingControls(assetGroup: THREE.Group): void {
  if (!(arenaDressingToggleEl instanceof HTMLInputElement)) {
    updateReadout();
    return;
  }

  arenaDressingToggleEl.checked = arenaDressingEnabled;
  arenaDressingToggleEl.addEventListener("change", () => {
    arenaDressingEnabled = arenaDressingToggleEl.checked;
    if (!arenaDressingEnabled) {
      arenaDressingLoadGeneration += 1;
      clearPrototypeAssetGroup(assetGroup);
      resetArenaDressingLoadState(EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements.length, "hidden");
      return;
    }

    void loadArenaDressingAssets(assetGroup);
  });

  updateReadout();
}

async function loadPrivatePrototypeAssets(assetGroup: THREE.Group): Promise<void> {
  const loadGeneration = prototypeAssetLoadGeneration + 1;
  prototypeAssetLoadGeneration = loadGeneration;
  clearPrototypeAssetGroup(assetGroup);

  if (!prototypeAssetManifestValidation.ok || !prototypeAssetPresetValidation.ok) {
    resetPrototypeAssetLoadState(0);
    prototypeAssetLoadState.status = "missing";
    updateReadout();
    return;
  }

  const prototypeAssetPreviewPlan = readSelectedPrototypeAssetPlan();
  resetPrototypeAssetLoadState(prototypeAssetPreviewPlan.length);

  if (prototypeAssetPreviewPlan.length === 0) {
    updateReadout();
    return;
  }

  prototypeAssetLoadState.status = "loading";
  updateReadout();

  const loader = new GLTFLoader();
  await Promise.all(
    prototypeAssetPreviewPlan.map(async (asset) => {
      try {
        const reachable = await isPrototypeAssetReachable(asset.url);
        if (!reachable) {
          prototypeAssetLoadState.failed += 1;
          return;
        }

        const gltf = await loadPrototypeAssetWithTimeout(loader, asset);
        if (prototypeAssetLoadGeneration !== loadGeneration) {
          return;
        }

        const root = gltf.scene;
        root.name = asset.id;
        placePrototypeAsset(root, asset);
        assetGroup.add(root);
        prototypeAssetLoadState.loaded += 1;
      } catch (error) {
        if (prototypeAssetLoadGeneration !== loadGeneration) {
          return;
        }

        void error;
        prototypeAssetLoadState.failed += 1;
      } finally {
        if (prototypeAssetLoadGeneration !== loadGeneration) {
          return;
        }

        prototypeAssetLoadState.status = readPrototypeAssetStatus();
        updateReadout();
      }
    })
  );

  prototypeAssetLoadState.status = readPrototypeAssetStatus();
  updateReadout();
}

async function loadArenaDressingAssets(assetGroup: THREE.Group): Promise<void> {
  const loadGeneration = arenaDressingLoadGeneration + 1;
  arenaDressingLoadGeneration = loadGeneration;
  clearPrototypeAssetGroup(assetGroup);

  if (!arenaDressingEnabled) {
    resetArenaDressingLoadState(EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements.length, "hidden");
    return;
  }

  if (!prototypeAssetManifestValidation.ok || !arenaDressingPlanValidation.ok) {
    resetArenaDressingLoadState(EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements.length, "invalid");
    return;
  }

  const dressingPreviewPlan = createSandboxArenaDressingPreviewPlan();
  resetArenaDressingLoadState(dressingPreviewPlan.length, dressingPreviewPlan.length === 0 ? "missing" : "loading");

  if (dressingPreviewPlan.length === 0) {
    updateReadout();
    return;
  }

  const loader = new GLTFLoader();
  await Promise.all(
    dressingPreviewPlan.map(async (placement) => {
      try {
        const reachable = await isPrototypeAssetReachable(placement.asset.url);
        if (!reachable) {
          arenaDressingLoadState.failed += 1;
          return;
        }

        const gltf = await loadDressingAssetWithTimeout(loader, placement);
        if (arenaDressingLoadGeneration !== loadGeneration) {
          return;
        }

        const root = gltf.scene;
        root.name = `dressing-${placement.id}`;
        placePrototypeAssetAt(root, {
          fitMaxDimensionMeters: placement.fitMaxDimensionMeters,
          position: placement.position,
          yawRadians: placement.yawRadians
        });
        assetGroup.add(root);
        arenaDressingLoadState.loaded += 1;
      } catch (error) {
        if (arenaDressingLoadGeneration !== loadGeneration) {
          return;
        }

        void error;
        arenaDressingLoadState.failed += 1;
      } finally {
        if (arenaDressingLoadGeneration !== loadGeneration) {
          return;
        }

        arenaDressingLoadState.status = readPrototypeAssetStatusFor(arenaDressingLoadState);
        updateReadout();
      }
    })
  );

  arenaDressingLoadState.status = readPrototypeAssetStatusFor(arenaDressingLoadState);
  updateReadout();
}

function placePrototypeAsset(root: THREE.Object3D, asset: SandboxPrototypeAsset): void {
  placePrototypeAssetAt(root, {
    fitMaxDimensionMeters: asset.fitMaxDimensionMeters,
    position: asset.previewPosition,
    yawRadians: 0
  });
}

function placePrototypeAssetAt(
  root: THREE.Object3D,
  placement: Readonly<{
    fitMaxDimensionMeters: number;
    position: readonly [number, number, number];
    yawRadians: number;
  }>
): void {
  root.rotation.y = placement.yawRadians;
  root.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(root);
  const initialSize = new THREE.Vector3();
  initialBox.getSize(initialSize);
  const largestDimension = Math.max(initialSize.x, initialSize.y, initialSize.z);
  if (Number.isFinite(largestDimension) && largestDimension > 0) {
    const scale = placement.fitMaxDimensionMeters / largestDimension;
    root.scale.multiplyScalar(scale);
  }

  root.updateMatrixWorld(true);
  const fittedBox = new THREE.Box3().setFromObject(root);
  const fittedCenter = new THREE.Vector3();
  fittedBox.getCenter(fittedCenter);
  root.position.x += placement.position[0] - fittedCenter.x;
  root.position.y += placement.position[1] - fittedBox.min.y;
  root.position.z += placement.position[2] - fittedCenter.z;
}

function resetPrototypeAssetLoadState(total: number): void {
  prototypeAssetLoadState.failed = 0;
  prototypeAssetLoadState.loaded = 0;
  prototypeAssetLoadState.status = total === 0 ? "none" : "loading";
  prototypeAssetLoadState.total = total;
  updateReadout();
}

function resetArenaDressingLoadState(total: number, status: ArenaDressingLoadStatus): void {
  arenaDressingLoadState.failed = 0;
  arenaDressingLoadState.loaded = 0;
  arenaDressingLoadState.status = status;
  arenaDressingLoadState.total = total;
  updateReadout();
}

async function isPrototypeAssetReachable(url: string): Promise<boolean> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, PRIVATE_PROTOTYPE_ASSET_LOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      method: "HEAD",
      signal: abortController.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadPrototypeAssetWithTimeout(
  loader: GLTFLoader,
  asset: SandboxPrototypeAsset
): ReturnType<GLTFLoader["loadAsync"]> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      loader.loadAsync(asset.url),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Prototype asset timed out: ${asset.id}`));
        }, PRIVATE_PROTOTYPE_ASSET_LOAD_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

async function loadDressingAssetWithTimeout(
  loader: GLTFLoader,
  placement: SandboxArenaDressingPreviewPlacement
): ReturnType<GLTFLoader["loadAsync"]> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      loader.loadAsync(placement.asset.url),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Arena dressing asset timed out: ${placement.id}`));
        }, PRIVATE_PROTOTYPE_ASSET_LOAD_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

function clearPrototypeAssetGroup(assetGroup: THREE.Group): void {
  assetGroup.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) {
        for (const entry of material) {
          entry.dispose();
        }
      } else {
        material.dispose();
      }
    }
  });

  assetGroup.clear();
}

function updatePrivateAssetButtonState(): void {
  for (const button of privateAssetButtons) {
    const category = readPrivateAssetCategory(button.dataset.assetCategory);
    const selected = selectedPrototypeAssetMode === "category" && category === selectedPrototypeAssetCategory;
    button.dataset.selected = selected ? "true" : "false";
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }

  for (const button of privateAssetPresetButtons) {
    const preset = readPrivateAssetPreset(button.dataset.assetPreset);
    const selected = selectedPrototypeAssetMode === "preset" && preset === selectedPrototypeAssetPreset;
    button.dataset.selected = selected ? "true" : "false";
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }
}

function readPrivateAssetCategory(value: string | undefined): SandboxPrototypeAssetCategory | undefined {
  if (SANDBOX_PROTOTYPE_ASSET_CATEGORIES.includes(value as SandboxPrototypeAssetCategory)) {
    return value as SandboxPrototypeAssetCategory;
  }

  return undefined;
}

function readPrivateAssetPreset(value: string | undefined): SandboxPrototypeAssetPresetId | undefined {
  if (SANDBOX_PROTOTYPE_ASSET_PRESET_IDS.includes(value as SandboxPrototypeAssetPresetId)) {
    return value as SandboxPrototypeAssetPresetId;
  }

  return undefined;
}

function readSelectedPrototypeAssetPlan(): readonly SandboxPrototypeAsset[] {
  if (selectedPrototypeAssetMode === "preset") {
    return createSandboxPrototypeAssetPresetPreviewPlan(selectedPrototypeAssetPreset);
  }

  return createSandboxPrototypeAssetPreviewPlan({
    category: selectedPrototypeAssetCategory
  });
}

function readPrototypeAssetStatus(): PrototypeAssetLoadStatus {
  return readPrototypeAssetStatusFor(prototypeAssetLoadState);
}

function readPrototypeAssetStatusFor(loadState: Readonly<{ failed: number; loaded: number; total: number }>): PrototypeAssetLoadStatus {
  const finishedCount = loadState.loaded + loadState.failed;
  if (loadState.total === 0) {
    return "none";
  }
  if (finishedCount < loadState.total) {
    return "loading";
  }
  if (loadState.loaded === loadState.total) {
    return "loaded";
  }
  if (loadState.loaded > 0) {
    return "partial";
  }
  return "missing";
}

function applyPlayerCameraPose(camera: THREE.PerspectiveCamera, pose: PlayerCameraPose): void {
  camera.position.set(...pose.position);
  camera.rotation.x = pose.pitchRadians;
  camera.rotation.y = pose.yawRadians;
  camera.rotation.z = 0;
}

function readPlayerCameraPose(): PlayerCameraPose {
  return derivePlayerCameraPose({
    map: EBB_TERMINAL_ARENA,
    sourcePose: {
      x: cameraState.position[0],
      y: cameraState.position[1],
      z: cameraState.position[2],
      yawRadians: cameraState.yawRadians,
      pitchRadians: cameraState.pitchRadians
    }
  });
}

function readMoveIntent(deltaSeconds: number): Parameters<typeof applySandboxMovement>[1] {
  return createSandboxMoveIntentFromKeys(keys, deltaSeconds);
}

function resizeRenderer(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
  const { clientWidth, clientHeight } = canvas;
  const width = Math.max(1, clientWidth);
  const height = Math.max(1, clientHeight);

  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function updateReadout(playerCameraPose: PlayerCameraPose = readPlayerCameraPose()): void {
  const position = playerCameraPose.position.map((value) => Number(value.toFixed(2))) as [number, number, number];
  window.__BREACHLINE_SANDBOX_STATE__ = {
    cameraPosition: position,
    frameCount,
    arenaDressingEnabled,
    arenaDressingFailedCount: arenaDressingLoadState.failed,
    arenaDressingLoadedCount: arenaDressingLoadState.loaded,
    arenaDressingPlacementCount: EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements.length,
    arenaDressingPlanId: EBB_TERMINAL_SANDBOX_DRESSING_PLAN.id,
    arenaDressingStatus: arenaDressingLoadState.status,
    arenaDressingTotalCount: arenaDressingLoadState.total,
    arenaDressingValid: arenaDressingPlanValidation.ok,
    cameraMode: playerCameraPose.mode,
    clampedToBounds: playerCameraPose.clampedToBounds,
    eyeHeightMeters: playerCameraPose.eyeHeightMeters,
    mapDisplayName: greyboxLayoutMetadata.displayName,
    mapId: greyboxLayoutMetadata.mapId,
    mapRevision: greyboxLayoutMetadata.revision,
    metadataValid: playerCameraPose.metadataValid,
    playerCameraPose: position,
    privateAssetCategory: selectedPrototypeAssetCategory,
    privateAssetFailedCount: prototypeAssetLoadState.failed,
    privateAssetLoadedCount: prototypeAssetLoadState.loaded,
    privateAssetManifestValid: prototypeAssetManifestValidation.ok,
    privateAssetMode: selectedPrototypeAssetMode,
    privateAssetPreset: selectedPrototypeAssetPreset,
    privateAssetPresetValid: prototypeAssetPresetValidation.ok,
    privateAssetStatus: prototypeAssetLoadState.status,
    privateAssetTotalCount: prototypeAssetLoadState.total,
    primitiveCount,
    renderSample: latestRenderSample,
    renderSampleHealthy: isRenderablePixelSampleHealthy(latestRenderSample),
    spawnMarkerCount: greyboxLayoutMetadata.spawnMarkerCount
  };

  if (frameCountEl !== null) {
    frameCountEl.textContent = frameCount.toString();
  }

  if (cameraPositionEl !== null) {
    cameraPositionEl.textContent = position.join(", ");
  }

  if (cameraModeEl !== null) {
    cameraModeEl.textContent = playerCameraPose.mode;
  }

  if (eyeHeightEl !== null) {
    eyeHeightEl.textContent = `${playerCameraPose.eyeHeightMeters.toFixed(2)} m`;
  }

  if (playerCameraPoseEl !== null) {
    playerCameraPoseEl.textContent = `${position.join(", ")} / yaw ${playerCameraPose.yawRadians.toFixed(2)}`;
  }

  if (metadataValidEl !== null) {
    metadataValidEl.textContent = playerCameraPose.metadataValid ? "valid" : "invalid";
  }

  if (privateAssetCategoryEl !== null) {
    privateAssetCategoryEl.textContent = selectedPrototypeAssetCategory;
  }

  if (privateAssetModeEl !== null) {
    privateAssetModeEl.textContent = selectedPrototypeAssetMode;
  }

  if (privateAssetPresetEl !== null) {
    privateAssetPresetEl.textContent = selectedPrototypeAssetPreset;
  }

  if (privateAssetsEl !== null) {
    privateAssetsEl.textContent = `${prototypeAssetLoadState.status} ${prototypeAssetLoadState.loaded}/${prototypeAssetLoadState.total}`;
  }

  if (privateAssetsFailedEl !== null) {
    privateAssetsFailedEl.textContent = prototypeAssetLoadState.failed.toString();
  }

  if (arenaDressingPlanEl !== null) {
    arenaDressingPlanEl.textContent = `${EBB_TERMINAL_SANDBOX_DRESSING_PLAN.mapId} r${EBB_TERMINAL_SANDBOX_DRESSING_PLAN.mapRevision}`;
  }

  if (arenaDressingCountEl !== null) {
    arenaDressingCountEl.textContent = EBB_TERMINAL_SANDBOX_DRESSING_PLAN.placements.length.toString();
  }

  if (arenaDressingAssetsEl !== null) {
    arenaDressingAssetsEl.textContent = `${arenaDressingLoadState.status} ${arenaDressingLoadState.loaded}/${arenaDressingLoadState.total}`;
  }

  if (arenaDressingFailedEl !== null) {
    arenaDressingFailedEl.textContent = arenaDressingLoadState.failed.toString();
  }

  if (renderHealthEl !== null) {
    renderHealthEl.textContent = isRenderablePixelSampleHealthy(latestRenderSample) ? "nonblank" : "pending";
  }

  if (mapIdEl !== null) {
    mapIdEl.textContent = greyboxLayoutMetadata.mapId;
  }

  if (mapRevisionEl !== null) {
    mapRevisionEl.textContent = greyboxLayoutMetadata.revision.toString();
  }

  if (primitiveCountEl !== null) {
    primitiveCountEl.textContent = primitiveCount.toString();
  }

  if (spawnCountEl !== null) {
    spawnCountEl.textContent = greyboxLayoutMetadata.spawnMarkerCount.toString();
  }
}

function updatePointerState(): void {
  if (pointerStateEl !== null) {
    pointerStateEl.textContent = document.pointerLockElement === canvas ? "captured" : "free";
  }
}

function requestPointerLockForCanvas(): void {
  try {
    const pointerLockRequest = canvas.requestPointerLock();
    if (pointerLockRequest instanceof Promise) {
      void pointerLockRequest.catch(() => {
        updatePointerState();
      });
    }
  } catch {
    updatePointerState();
  }
}

function reportError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (errorEl !== null) {
    errorEl.textContent = message;
  }
  console.error(message);
}

function readRenderSample(renderer: THREE.WebGLRenderer): ScenePixelSampleSummary {
  const gl = renderer.getContext();
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  return summarizeScenePixelSamples({
    backgroundColor: [17, 23, 25],
    height,
    maxSamples: 5000,
    pixels,
    width
  });
}

function requireCanvas(id: string): HTMLCanvasElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error(`Missing canvas #${id}`);
  }
  return element;
}

function isSandboxMovementKey(code: string): boolean {
  return (
    code === "KeyW" ||
    code === "KeyA" ||
    code === "KeyS" ||
    code === "KeyD" ||
    code === "Space" ||
    code === "ShiftLeft" ||
    code === "ShiftRight"
  );
}
