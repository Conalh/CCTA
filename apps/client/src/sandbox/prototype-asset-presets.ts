import {
  PRIVATE_PROTOTYPE_ASSETS,
  type SandboxPrototypeAsset
} from "./prototype-assets.js";

export const SANDBOX_PROTOTYPE_ASSET_PRESET_IDS = [
  "scale-check",
  "arena-dressing",
  "equipment-check"
] as const;

export type SandboxPrototypeAssetPresetId = (typeof SANDBOX_PROTOTYPE_ASSET_PRESET_IDS)[number];

export type SandboxPrototypeAssetPreset = Readonly<{
  assetIds: readonly string[];
  id: SandboxPrototypeAssetPresetId;
  label: string;
}>;

export type SandboxPrototypeAssetPresetValidation = Readonly<{
  errors: readonly string[];
  ok: boolean;
}>;

export type SandboxPrototypeAssetPresetValidationOptions = Readonly<{
  assets?: readonly SandboxPrototypeAsset[];
  presets?: readonly SandboxPrototypeAssetPreset[];
}>;

export type SandboxPrototypeAssetPresetPreviewOptions = Readonly<{
  assets?: readonly SandboxPrototypeAsset[];
  presets?: readonly SandboxPrototypeAssetPreset[];
}>;

const FORBIDDEN_SHOOTER_NAME_PATTERN =
  /\b(counter|strike|valve|dust|dust2|mirage|inferno|nuke|terrorist|counter-terrorist)\b/i;

export const SANDBOX_PROTOTYPE_ASSET_PRESETS: readonly SandboxPrototypeAssetPreset[] = [
  {
    assetIds: ["prototype-fps-hands", "prototype-training-crate", "prototype-arena-block"],
    id: "scale-check",
    label: "Scale Check"
  },
  {
    assetIds: [
      "prototype-industrial-cover-a",
      "prototype-industrial-pallet",
      "prototype-industrial-power-box",
      "prototype-arena-rail"
    ],
    id: "arena-dressing",
    label: "Arena Dressing"
  },
  {
    assetIds: ["prototype-equipment-scale-placeholder"],
    id: "equipment-check",
    label: "Equipment Check"
  }
];

export function createSandboxPrototypeAssetPresetPreviewPlan(
  presetId: SandboxPrototypeAssetPresetId,
  options: SandboxPrototypeAssetPresetPreviewOptions = {}
): readonly SandboxPrototypeAsset[] {
  const assets = options.assets ?? PRIVATE_PROTOTYPE_ASSETS;
  const presets = options.presets ?? SANDBOX_PROTOTYPE_ASSET_PRESETS;
  const preset = presets.find((entry) => entry.id === presetId);
  if (preset === undefined) {
    return [];
  }

  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  return preset.assetIds.flatMap((assetId) => {
    const asset = assetsById.get(assetId);
    return asset === undefined ? [] : [asset];
  });
}

export function validateSandboxPrototypeAssetPresets(
  options: SandboxPrototypeAssetPresetValidationOptions = {}
): SandboxPrototypeAssetPresetValidation {
  const assets = options.assets ?? PRIVATE_PROTOTYPE_ASSETS;
  const presets = options.presets ?? SANDBOX_PROTOTYPE_ASSET_PRESETS;
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const presetIds = new Set<string>();
  const errors: string[] = [];

  for (const preset of presets) {
    if (presetIds.has(preset.id)) {
      errors.push(`Duplicate preset id: ${preset.id}`);
    }
    presetIds.add(preset.id);

    if (FORBIDDEN_SHOOTER_NAME_PATTERN.test(`${preset.id} ${preset.label}`)) {
      errors.push(`Preset ${preset.id} uses copied shooter naming`);
    }

    if (preset.assetIds.length === 0) {
      errors.push(`Preset ${preset.id} must include at least one asset`);
    }

    const presetAssetIds = new Set<string>();
    for (const assetId of preset.assetIds) {
      if (presetAssetIds.has(assetId)) {
        errors.push(`Preset ${preset.id} has duplicate asset id: ${assetId}`);
      }
      presetAssetIds.add(assetId);

      const asset = assetsById.get(assetId);
      if (asset === undefined) {
        errors.push(`Unknown preset asset id: ${assetId}`);
        continue;
      }

      if (!asset.url.startsWith("/assets/private-prototype/")) {
        errors.push(`Preset ${preset.id} asset ${assetId} must use a private prototype path`);
      }

      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(asset.url) || asset.url.startsWith("//")) {
        errors.push(`Preset ${preset.id} asset ${assetId} must not use a network URL`);
      }

      if (/(^|[\\/])(apps[\\/]server|server)([\\/]|$)/i.test(asset.url)) {
        errors.push(`Preset ${preset.id} asset ${assetId} must not reference a server path`);
      }
    }
  }

  return {
    errors,
    ok: errors.length === 0
  };
}
