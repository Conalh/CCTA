import type { ArenaMapMetadata, ArenaBlockoutPrimitiveKind } from "@breachline/shared";

import { EBB_TERMINAL_ARENA } from "../maps/ebb-terminal.js";

export type GreyboxPrimitiveKind = ArenaBlockoutPrimitiveKind | "scale-reference";

export type Vector3Tuple = readonly [number, number, number];

export type GreyboxPrimitive = Readonly<{
  color: string;
  id: string;
  kind: GreyboxPrimitiveKind;
  label: string;
  position: Vector3Tuple;
  size: Vector3Tuple;
}>;

export type GreyboxLayoutMetadata = Readonly<{
  displayName: string;
  mapId: string;
  primitiveCount: number;
  revision: number;
  spawnMarkerCount: number;
}>;

export function createGreyboxLayout(): readonly GreyboxPrimitive[] {
  return createGreyboxLayoutFromMap(EBB_TERMINAL_ARENA);
}

export function createGreyboxLayoutFromMap(map: ArenaMapMetadata): readonly GreyboxPrimitive[] {
  return [
    ...map.primitives.map((primitive) => ({
      id: `map-${primitive.id}`,
      kind: primitive.kind,
      label: primitive.label,
      position: primitive.position,
      size: primitive.size,
      color: readPrimitiveColor(primitive.kind)
    })),
    ...map.playerScaleReferences.map((reference) => ({
      id: `map-${reference.id}`,
      kind: "scale-reference" as const,
      label: reference.label,
      position: reference.position,
      size: [reference.radiusMeters * 2, reference.heightMeters, reference.radiusMeters * 2] as const,
      color: "#b9c6a5"
    }))
  ];
}

export function getGreyboxLayoutMetadata(map: ArenaMapMetadata = EBB_TERMINAL_ARENA): GreyboxLayoutMetadata {
  return {
    displayName: map.displayName,
    mapId: map.id,
    primitiveCount: createGreyboxLayoutFromMap(map).length,
    revision: map.revision,
    spawnMarkerCount: map.spawnMarkers.length
  };
}

function readPrimitiveColor(kind: ArenaBlockoutPrimitiveKind): string {
  switch (kind) {
    case "floor":
      return "#4a5350";
    case "wall":
      return "#68726f";
    case "cover":
      return "#8c9489";
  }

  return "#8c9489";
}
