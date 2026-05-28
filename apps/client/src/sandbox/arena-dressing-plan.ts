import type { ArenaMapMetadata, ArenaVector3 } from "@breachline/shared";

import { EBB_TERMINAL_ARENA } from "../maps/ebb-terminal.js";
import {
  PRIVATE_PROTOTYPE_ASSETS,
  type SandboxPrototypeAsset
} from "./prototype-assets.js";

export const SANDBOX_ARENA_DRESSING_PURPOSES = [
  "scale-reference",
  "cover-readability",
  "industrial-dressing",
  "equipment-readability"
] as const;

export type SandboxArenaDressingPurpose = (typeof SANDBOX_ARENA_DRESSING_PURPOSES)[number];

export type SandboxArenaDressingPlacement = Readonly<{
  assetId: string;
  fitMaxDimensionMeters: number;
  id: string;
  position: ArenaVector3;
  purpose: SandboxArenaDressingPurpose;
  yawRadians: number;
}>;

export type SandboxArenaDressingPlan = Readonly<{
  id: string;
  label: string;
  mapId: string;
  mapRevision: number;
  placements: readonly SandboxArenaDressingPlacement[];
}>;

export type SandboxArenaDressingPreviewPlacement = SandboxArenaDressingPlacement &
  Readonly<{
    asset: SandboxPrototypeAsset;
  }>;

export type SandboxArenaDressingPlanValidation = Readonly<{
  errors: readonly string[];
  ok: boolean;
}>;

export type SandboxArenaDressingPlanValidationOptions = Readonly<{
  assets?: readonly SandboxPrototypeAsset[];
  map?: ArenaMapMetadata;
  plan?: SandboxArenaDressingPlan;
}>;

export type SandboxArenaDressingPreviewOptions = Readonly<{
  assets?: readonly SandboxPrototypeAsset[];
  plan?: SandboxArenaDressingPlan;
}>;

const MAX_DRESSING_PLACEMENTS = 16;
const PRIVATE_PROTOTYPE_ASSET_ROOT = "/assets/private-prototype/";
const DRESSING_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORBIDDEN_SHOOTER_NAME_PATTERN =
  /\b(counter|strike|valve|dust|dust2|mirage|inferno|nuke|terrorist|counter-terrorist|ct-spawn|t-spawn)\b/i;

export const EBB_TERMINAL_SANDBOX_DRESSING_PLAN: SandboxArenaDressingPlan = {
  id: "arena-ebb-terminal-dressing",
  label: "Ebb Terminal Dressing",
  mapId: "arena-ebb-terminal",
  mapRevision: 1,
  placements: [
    {
      assetId: "prototype-fps-hands",
      fitMaxDimensionMeters: 0.85,
      id: "hands-scale-reference",
      position: [0.9, 1.05, -5.2],
      purpose: "scale-reference",
      yawRadians: 0
    },
    {
      assetId: "prototype-training-crate",
      fitMaxDimensionMeters: 1.05,
      id: "central-crate-readability",
      position: [-1.45, 0, -0.85],
      purpose: "cover-readability",
      yawRadians: 0.25
    },
    {
      assetId: "prototype-industrial-cover-a",
      fitMaxDimensionMeters: 1.55,
      id: "west-cover-readability",
      position: [-5.35, 0, 1.15],
      purpose: "cover-readability",
      yawRadians: Math.PI / 2
    },
    {
      assetId: "prototype-industrial-power-box",
      fitMaxDimensionMeters: 1.1,
      id: "east-power-box-dressing",
      position: [5.7, 0, 2.8],
      purpose: "industrial-dressing",
      yawRadians: -1.2
    },
    {
      assetId: "prototype-industrial-pallet",
      fitMaxDimensionMeters: 1.1,
      id: "south-pallet-dressing",
      position: [-3.6, 0, 5.45],
      purpose: "industrial-dressing",
      yawRadians: 0.5
    },
    {
      assetId: "prototype-arena-rail",
      fitMaxDimensionMeters: 1.9,
      id: "east-rail-dressing",
      position: [6.75, 0, -3.15],
      purpose: "industrial-dressing",
      yawRadians: Math.PI / 2
    },
    {
      assetId: "prototype-equipment-scale-placeholder",
      fitMaxDimensionMeters: 0.65,
      id: "equipment-scale-placeholder",
      position: [2.85, 0, 5.15],
      purpose: "equipment-readability",
      yawRadians: Math.PI
    }
  ]
};

export function createSandboxArenaDressingPreviewPlan(
  options: SandboxArenaDressingPreviewOptions = {}
): readonly SandboxArenaDressingPreviewPlacement[] {
  const assets = options.assets ?? PRIVATE_PROTOTYPE_ASSETS;
  const plan = options.plan ?? EBB_TERMINAL_SANDBOX_DRESSING_PLAN;
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return plan.placements.flatMap((placement) => {
    const asset = assetsById.get(placement.assetId);
    return asset === undefined ? [] : [{ ...placement, asset }];
  });
}

export function validateSandboxArenaDressingPlan(
  options: SandboxArenaDressingPlanValidationOptions = {}
): SandboxArenaDressingPlanValidation {
  const assets = options.assets ?? PRIVATE_PROTOTYPE_ASSETS;
  const map = options.map ?? EBB_TERMINAL_ARENA;
  const plan = options.plan ?? EBB_TERMINAL_SANDBOX_DRESSING_PLAN;
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const placementIds = new Set<string>();
  const errors: string[] = [];

  if (!DRESSING_ID_PATTERN.test(plan.id)) {
    errors.push(`Dressing plan id must use kebab-case: ${plan.id}`);
  }

  if (FORBIDDEN_SHOOTER_NAME_PATTERN.test(`${plan.id} ${plan.label} ${plan.mapId}`)) {
    errors.push(`Dressing plan ${plan.id} uses copied shooter naming`);
  }

  if (plan.mapId !== map.id) {
    errors.push(`Dressing plan ${plan.id} targets ${plan.mapId}, expected ${map.id}`);
  }

  if (!Number.isInteger(plan.mapRevision) || plan.mapRevision < 1) {
    errors.push(`Dressing plan ${plan.id} must use a positive map revision`);
  } else if (plan.mapRevision !== map.revision) {
    errors.push(`Dressing plan ${plan.id} targets map revision ${plan.mapRevision}, expected ${map.revision}`);
  }

  if (plan.placements.length === 0) {
    errors.push(`Dressing plan ${plan.id} must include at least one placement`);
  }

  if (plan.placements.length > MAX_DRESSING_PLACEMENTS) {
    errors.push(`Dressing plan ${plan.id} must use ${MAX_DRESSING_PLACEMENTS} placements or fewer`);
  }

  for (const placement of plan.placements) {
    if (!DRESSING_ID_PATTERN.test(placement.id)) {
      errors.push(`Dressing placement id must use kebab-case: ${placement.id}`);
    }

    if (placementIds.has(placement.id)) {
      errors.push(`Duplicate dressing placement id: ${placement.id}`);
    }
    placementIds.add(placement.id);

    if (FORBIDDEN_SHOOTER_NAME_PATTERN.test(`${placement.id} ${placement.assetId} ${placement.purpose}`)) {
      errors.push(`Dressing placement ${placement.id} uses copied shooter naming`);
    }

    if (!SANDBOX_ARENA_DRESSING_PURPOSES.includes(placement.purpose)) {
      errors.push(`Dressing placement ${placement.id} has an unknown purpose tag`);
    }

    validatePlacementTransform(placement, map, errors);

    const asset = assetsById.get(placement.assetId);
    if (asset === undefined) {
      errors.push(`Unknown dressing asset id: ${placement.assetId}`);
      continue;
    }

    if (!asset.url.startsWith(PRIVATE_PROTOTYPE_ASSET_ROOT)) {
      errors.push(`Dressing asset ${placement.assetId} must use a private prototype path`);
    }

    if (isNetworkUrl(asset.url)) {
      errors.push(`Dressing asset ${placement.assetId} must not use a network URL`);
    }

    if (containsServerPath(asset.url)) {
      errors.push(`Dressing asset ${placement.assetId} must not reference a server path`);
    }
  }

  return {
    errors,
    ok: errors.length === 0
  };
}

function validatePlacementTransform(
  placement: SandboxArenaDressingPlacement,
  map: ArenaMapMetadata,
  errors: string[]
): void {
  if (!isFiniteVector3(placement.position)) {
    errors.push(`Dressing placement ${placement.id} must use a finite 3D position`);
  } else if (!pointInsideBounds(placement.position, map.worldBounds)) {
    errors.push(`Dressing placement ${placement.id} must stay inside map bounds`);
  }

  if (typeof placement.yawRadians !== "number" || !Number.isFinite(placement.yawRadians)) {
    errors.push(`Dressing placement ${placement.id} must use a finite yaw`);
  }

  if (
    typeof placement.fitMaxDimensionMeters !== "number" ||
    !Number.isFinite(placement.fitMaxDimensionMeters) ||
    placement.fitMaxDimensionMeters <= 0
  ) {
    errors.push(`Dressing placement ${placement.id} must use a positive fitMaxDimensionMeters`);
  }
}

function pointInsideBounds(position: ArenaVector3, bounds: ArenaMapMetadata["worldBounds"]): boolean {
  return position.every((value, index) => value >= bounds.min[index] && value <= bounds.max[index]);
}

function isFiniteVector3(value: readonly number[]): value is ArenaVector3 {
  return value.length === 3 && value.every((entry) => Number.isFinite(entry));
}

function isNetworkUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) || url.startsWith("//");
}

function containsServerPath(url: string): boolean {
  return /(^|[\\/])(apps[\\/]server|server)([\\/]|$)/i.test(url);
}
