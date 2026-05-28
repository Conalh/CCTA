import type { NetworkedPlaytestRemotePlaceholder, Vector3Tuple } from "./playtest-state.js";

export const REMOTE_PLAYER_PRESENTATION_HEIGHT_METERS = 1.86 as const;
export const REMOTE_PLAYER_PRESENTATION_TARGET_CENTER_HEIGHT_METERS = 1.08 as const;

export type RemotePlayerPresentationPartRole =
  | "body"
  | "head"
  | "facing-marker"
  | "target-center"
  | "hit-accent";

export type RemotePlayerPresentationPartShape =
  | "cylinder"
  | "sphere"
  | "cone"
  | "torus";

export type RemotePlayerPresentationPart = Readonly<{
  color: string;
  id: string;
  opacity: number;
  position: Vector3Tuple;
  radiusMeters: number;
  renderOrder: number;
  role: RemotePlayerPresentationPartRole;
  rotation: Vector3Tuple;
  shape: RemotePlayerPresentationPartShape;
  tubeRadiusMeters?: number;
  visible: boolean;
  heightMeters?: number;
}>;

export type RemotePlayerPresentationModel = Readonly<{
  entityId: number;
  heightMeters: number;
  highlighted: boolean;
  id: string;
  parts: readonly RemotePlayerPresentationPart[];
  position: Vector3Tuple;
  sessionId: number;
  slotIndex: number;
  sourceTick: number;
  yawRadians: number;
}>;

export type RemotePlayerPresentationInput = Readonly<{
  highlightedRemoteEntityId: number | undefined;
  remotePlaceholders: readonly NetworkedPlaytestRemotePlaceholder[];
}>;

export function createRemotePlayerPresentationModels(
  input: RemotePlayerPresentationInput
): readonly RemotePlayerPresentationModel[] {
  const highlightedRemoteEntityId = readPositiveInteger(input.highlightedRemoteEntityId);
  const models: RemotePlayerPresentationModel[] = [];

  for (const placeholder of input.remotePlaceholders) {
    const entityId = readPositiveInteger(placeholder.entityId);
    const sessionId = readPositiveInteger(placeholder.sessionId);
    const slotIndex = readNonNegativeInteger(placeholder.slotIndex);
    const sourceTick = readNonNegativeInteger(placeholder.sourceTick);
    const position = readVector(placeholder.position);
    const yawRadians = readFinite(placeholder.yawRadians);
    if (
      entityId === undefined ||
      sessionId === undefined ||
      slotIndex === undefined ||
      sourceTick === undefined ||
      position === undefined ||
      yawRadians === undefined
    ) {
      continue;
    }

    const highlighted = entityId === highlightedRemoteEntityId;
    models.push({
      entityId,
      heightMeters: REMOTE_PLAYER_PRESENTATION_HEIGHT_METERS,
      highlighted,
      id: `remote-model-${entityId}`,
      parts: createRemotePlayerParts(entityId, highlighted),
      position,
      sessionId,
      slotIndex,
      sourceTick,
      yawRadians
    });
  }

  return models;
}

function createRemotePlayerParts(
  entityId: number,
  highlighted: boolean
): readonly RemotePlayerPresentationPart[] {
  const baseColor = "#d4c182";
  const accentColor = "#8ed0bd";
  const centerColor = "#eef2f1";
  const hitColor = "#ecffd6";

  return [
    {
      color: baseColor,
      heightMeters: 1.46,
      id: `remote-${entityId}-body`,
      opacity: 0.94,
      position: [0, 0.78, 0],
      radiusMeters: 0.3,
      renderOrder: 18,
      role: "body",
      rotation: [0, 0, 0],
      shape: "cylinder",
      visible: true
    },
    {
      color: accentColor,
      id: `remote-${entityId}-head`,
      opacity: 0.92,
      position: [0, 1.68, 0],
      radiusMeters: 0.25,
      renderOrder: 19,
      role: "head",
      rotation: [0, 0, 0],
      shape: "sphere",
      visible: true
    },
    {
      color: accentColor,
      heightMeters: 0.58,
      id: `remote-${entityId}-facing-marker`,
      opacity: 0.96,
      position: [0, 1.18, -0.58],
      radiusMeters: 0.16,
      renderOrder: 21,
      role: "facing-marker",
      rotation: [Math.PI / 2, 0, 0],
      shape: "cone",
      visible: true
    },
    {
      color: centerColor,
      id: `remote-${entityId}-target-center`,
      opacity: 0.5,
      position: [0, REMOTE_PLAYER_PRESENTATION_TARGET_CENTER_HEIGHT_METERS, 0],
      radiusMeters: 0.37,
      renderOrder: 20,
      role: "target-center",
      rotation: [Math.PI / 2, 0, 0],
      shape: "torus",
      tubeRadiusMeters: 0.012,
      visible: true
    },
    {
      color: hitColor,
      id: `remote-${entityId}-hit-accent`,
      opacity: highlighted ? 0.92 : 0,
      position: [0, REMOTE_PLAYER_PRESENTATION_TARGET_CENTER_HEIGHT_METERS, 0],
      radiusMeters: 0.5,
      renderOrder: 24,
      role: "hit-accent",
      rotation: [Math.PI / 2, 0, 0],
      shape: "torus",
      tubeRadiusMeters: 0.03,
      visible: highlighted
    }
  ];
}

function readVector(value: Vector3Tuple | undefined): Vector3Tuple | undefined {
  if (
    value === undefined ||
    value.length !== 3 ||
    !value.every((entry) => Number.isFinite(entry))
  ) {
    return undefined;
  }

  return [normalizeNumber(value[0]), normalizeNumber(value[1]), normalizeNumber(value[2])];
}

function readPositiveInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function readNonNegativeInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function readFinite(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? normalizeNumber(value) : undefined;
}

function normalizeNumber(value: number): number {
  const normalized = Number(value.toFixed(6));
  return Object.is(normalized, -0) ? 0 : normalized;
}
