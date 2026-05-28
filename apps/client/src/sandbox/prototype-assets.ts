export const SANDBOX_PROTOTYPE_ASSET_CATEGORIES = [
  "arena-kit",
  "industrial-dressing",
  "cover-training-props",
  "characters-firstperson",
  "equipment-placeholder"
] as const;

export type SandboxPrototypeAssetCategory = (typeof SANDBOX_PROTOTYPE_ASSET_CATEGORIES)[number];

export type SandboxPrototypeAsset = Readonly<{
  category: SandboxPrototypeAssetCategory;
  fitMaxDimensionMeters: number;
  id: string;
  label: string;
  previewPosition: readonly [number, number, number];
  url: string;
}>;

export type SandboxPrototypeAssetManifestSummary = Readonly<{
  allPrivatePrototypePaths: boolean;
  categories: readonly SandboxPrototypeAssetCategory[];
  containsNetworkUrl: boolean;
  containsServerPath: boolean;
  totalCount: number;
}>;

export type SandboxPrototypeAssetManifestValidation = Readonly<{
  errors: readonly string[];
  ok: boolean;
  summary: SandboxPrototypeAssetManifestSummary;
}>;

export type SandboxPrototypeAssetPreviewPlanOptions = Readonly<{
  assets?: readonly SandboxPrototypeAsset[];
  category?: SandboxPrototypeAssetCategory;
}>;

const PRIVATE_PROTOTYPE_ASSET_ROOT = "/assets/private-prototype/";

export const PRIVATE_PROTOTYPE_ASSETS: readonly SandboxPrototypeAsset[] = [
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 1.4,
    id: "prototype-arena-block",
    label: "Prototype arena block",
    previewPosition: [-5.6, 0, -3.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_Block_1x1_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 2.2,
    id: "prototype-arena-column",
    label: "Prototype arena column",
    previewPosition: [-3.2, 0, -3.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_Column_2x3_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 2.6,
    id: "prototype-arena-floor-small",
    label: "Prototype small floor panel",
    previewPosition: [-0.8, 0, -3.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_Floor_2x2_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 3.2,
    id: "prototype-arena-floor-large",
    label: "Prototype large floor panel",
    previewPosition: [1.8, 0, -3.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_Floor_5x5_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 2.4,
    id: "prototype-arena-rail",
    label: "Prototype arena rail",
    previewPosition: [4.6, 0, -3.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_Rail_5x1_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 2.0,
    id: "prototype-arena-ramp",
    label: "Prototype arena ramp",
    previewPosition: [-5.6, 0, -0.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_Ramp_25_1x1_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 2.1,
    id: "prototype-arena-stairs",
    label: "Prototype arena stairs",
    previewPosition: [-3.2, 0, -0.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_Stairs_1x3_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 2.5,
    id: "prototype-arena-door-wall",
    label: "Prototype door wall",
    previewPosition: [-0.6, 0, -0.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_WallDoor_5x3_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 2.5,
    id: "prototype-arena-window-wall",
    label: "Prototype window wall",
    previewPosition: [2.2, 0, -0.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_WallWindow_5x3_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 2.2,
    id: "prototype-arena-short-wall",
    label: "Prototype short wall",
    previewPosition: [4.8, 0, -0.8],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_Wall_2x3_01P.glb"
  },
  {
    category: "arena-kit",
    fitMaxDimensionMeters: 2.5,
    id: "prototype-arena-wide-wall",
    label: "Prototype wide wall",
    previewPosition: [0, 0, 2.1],
    url: "/assets/private-prototype/arena-kit/SM_Buildings_Wall_5x3_01P.glb"
  },
  {
    category: "industrial-dressing",
    fitMaxDimensionMeters: 1.9,
    id: "prototype-industrial-cover-a",
    label: "Prototype industrial cover A",
    previewPosition: [-5.2, 0, -3.5],
    url: "/assets/private-prototype/industrial-dressing/SM_Bld_Cover_01.glb"
  },
  {
    category: "industrial-dressing",
    fitMaxDimensionMeters: 1.9,
    id: "prototype-industrial-cover-b",
    label: "Prototype industrial cover B",
    previewPosition: [-2.8, 0, -3.5],
    url: "/assets/private-prototype/industrial-dressing/SM_Bld_Cover_02.glb"
  },
  {
    category: "industrial-dressing",
    fitMaxDimensionMeters: 1.2,
    id: "prototype-industrial-pallet",
    label: "Prototype pallet",
    previewPosition: [-0.4, 0, -3.5],
    url: "/assets/private-prototype/industrial-dressing/SM_Prop_Pallet_01.glb"
  },
  {
    category: "industrial-dressing",
    fitMaxDimensionMeters: 1.4,
    id: "prototype-industrial-power-box",
    label: "Prototype power box",
    previewPosition: [2.0, 0, -3.5],
    url: "/assets/private-prototype/industrial-dressing/SM_Prop_PowerBox_01.glb"
  },
  {
    category: "industrial-dressing",
    fitMaxDimensionMeters: 1.5,
    id: "prototype-industrial-roof-unit",
    label: "Prototype roof unit",
    previewPosition: [4.4, 0, -3.5],
    url: "/assets/private-prototype/industrial-dressing/SM_Prop_Roof_Aircon_01.glb"
  },
  {
    category: "industrial-dressing",
    fitMaxDimensionMeters: 0.9,
    id: "prototype-industrial-camera",
    label: "Prototype inspection camera",
    previewPosition: [-4.4, 0, -0.7],
    url: "/assets/private-prototype/industrial-dressing/SM_Prop_SecurityCamera_01.glb"
  },
  {
    category: "industrial-dressing",
    fitMaxDimensionMeters: 1.4,
    id: "prototype-industrial-vent-corner",
    label: "Prototype vent corner",
    previewPosition: [-1.8, 0, -0.7],
    url: "/assets/private-prototype/industrial-dressing/SM_Prop_Vents_Corner_01.glb"
  },
  {
    category: "industrial-dressing",
    fitMaxDimensionMeters: 1.4,
    id: "prototype-industrial-vent-exhaust",
    label: "Prototype vent exhaust",
    previewPosition: [0.8, 0, -0.7],
    url: "/assets/private-prototype/industrial-dressing/SM_Prop_Vents_Exhaust_01.glb"
  },
  {
    category: "industrial-dressing",
    fitMaxDimensionMeters: 1.4,
    id: "prototype-industrial-vent-straight",
    label: "Prototype vent straight",
    previewPosition: [3.4, 0, -0.7],
    url: "/assets/private-prototype/industrial-dressing/SM_Prop_Vents_Straight_01.glb"
  },
  {
    category: "cover-training-props",
    fitMaxDimensionMeters: 1.4,
    id: "prototype-training-barrier",
    label: "Prototype training barrier",
    previewPosition: [-4.6, 0, -3.1],
    url: "/assets/private-prototype/cover-training-props/SM_Prop_Barrier_01.glb"
  },
  {
    category: "cover-training-props",
    fitMaxDimensionMeters: 1.1,
    id: "prototype-training-crate",
    label: "Prototype training crate",
    previewPosition: [-2.4, 0, -3.1],
    url: "/assets/private-prototype/cover-training-props/SM_Prop_Crate_01.glb"
  },
  {
    category: "cover-training-props",
    fitMaxDimensionMeters: 1.1,
    id: "prototype-training-crate-b",
    label: "Prototype training crate B",
    previewPosition: [-0.2, 0, -3.1],
    url: "/assets/private-prototype/cover-training-props/SM_Prop_Crate_02.glb"
  },
  {
    category: "cover-training-props",
    fitMaxDimensionMeters: 1.1,
    id: "prototype-training-crate-c",
    label: "Prototype training crate C",
    previewPosition: [2.0, 0, -3.1],
    url: "/assets/private-prototype/cover-training-props/SM_Prop_Crate_03.glb"
  },
  {
    category: "cover-training-props",
    fitMaxDimensionMeters: 1.2,
    id: "prototype-training-target",
    label: "Prototype training target",
    previewPosition: [4.2, 0, -3.1],
    url: "/assets/private-prototype/cover-training-props/SM_Prop_Target_01.glb"
  },
  {
    category: "cover-training-props",
    fitMaxDimensionMeters: 1.2,
    id: "prototype-training-target-stand",
    label: "Prototype training target stand",
    previewPosition: [0, 0, -0.5],
    url: "/assets/private-prototype/cover-training-props/SM_Prop_Target_Stand_01.glb"
  },
  {
    category: "characters-firstperson",
    fitMaxDimensionMeters: 1.3,
    id: "prototype-character-scale-reference",
    label: "Prototype character scale reference",
    previewPosition: [-1.4, 0, 1.6],
    url: "/assets/private-prototype/characters-firstperson/Characters.glb"
  },
  {
    category: "characters-firstperson",
    fitMaxDimensionMeters: 0.9,
    id: "prototype-fps-hands",
    label: "Prototype first-person hands",
    previewPosition: [1.4, 1.1, 1.6],
    url: "/assets/private-prototype/characters-firstperson/Character_FPSHands_01.glb"
  },
  {
    category: "equipment-placeholder",
    fitMaxDimensionMeters: 1.0,
    id: "prototype-equipment-scale-placeholder",
    label: "Prototype equipment scale placeholder",
    previewPosition: [0, 0, 1.8],
    url: "/assets/private-prototype/equipment-placeholder/SM_Wep_Watergun_01.fbx.glb"
  }
];

export function createSandboxPrototypeAssetPreviewPlan(
  options: SandboxPrototypeAssetPreviewPlanOptions = {}
): readonly SandboxPrototypeAsset[] {
  const assets = options.assets ?? PRIVATE_PROTOTYPE_ASSETS;
  if (options.category === undefined) {
    return assets;
  }

  return assets.filter((asset) => asset.category === options.category);
}

export function summarizeSandboxPrototypeAssetManifest(
  assets: readonly SandboxPrototypeAsset[] = PRIVATE_PROTOTYPE_ASSETS
): SandboxPrototypeAssetManifestSummary {
  const categories = Array.from(new Set(assets.map((asset) => asset.category))).sort();

  return {
    allPrivatePrototypePaths: assets.every((asset) => isPrivatePrototypeAssetUrl(asset.url)),
    categories,
    containsNetworkUrl: assets.some((asset) => isNetworkUrl(asset.url)),
    containsServerPath: assets.some((asset) => containsServerPath(asset.url)),
    totalCount: assets.length
  };
}

export function validateSandboxPrototypeAssetManifest(
  assets: readonly SandboxPrototypeAsset[] = PRIVATE_PROTOTYPE_ASSETS
): SandboxPrototypeAssetManifestValidation {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const asset of assets) {
    if (ids.has(asset.id)) {
      errors.push(`Duplicate asset id: ${asset.id}`);
    }
    ids.add(asset.id);

    if (!isPrivatePrototypeAssetUrl(asset.url)) {
      errors.push(`Asset ${asset.id} must use a private prototype path under ${PRIVATE_PROTOTYPE_ASSET_ROOT}`);
    }

    if (isNetworkUrl(asset.url)) {
      errors.push(`Asset ${asset.id} must not use a network URL`);
    }

    if (containsServerPath(asset.url)) {
      errors.push(`Asset ${asset.id} must not reference a server path`);
    }

    if (!Number.isFinite(asset.fitMaxDimensionMeters) || asset.fitMaxDimensionMeters <= 0) {
      errors.push(`Asset ${asset.id} has invalid fitMaxDimensionMeters`);
    }

    if (!isFiniteVector3(asset.previewPosition)) {
      errors.push(`Asset ${asset.id} has invalid previewPosition`);
    }
  }

  return {
    errors,
    ok: errors.length === 0,
    summary: summarizeSandboxPrototypeAssetManifest(assets)
  };
}

function isPrivatePrototypeAssetUrl(url: string): boolean {
  return url.startsWith(PRIVATE_PROTOTYPE_ASSET_ROOT);
}

function isNetworkUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) || url.startsWith("//");
}

function containsServerPath(url: string): boolean {
  return /(^|[\\/])(apps[\\/]server|server)([\\/]|$)/i.test(url);
}

function isFiniteVector3(value: readonly number[]): value is readonly [number, number, number] {
  return value.length === 3 && value.every((entry) => Number.isFinite(entry));
}
