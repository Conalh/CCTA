export const ARENA_MAP_METADATA_LIMITS = {
  maxLabels: 32,
  maxPlayerScaleReferences: 8,
  maxPrimitives: 64,
  maxSpawnMarkers: 16
} as const;

export type ArenaVector3 = readonly [number, number, number];

export type ArenaWorldBounds = Readonly<{
  min: ArenaVector3;
  max: ArenaVector3;
}>;

export type ArenaBlockoutPrimitiveKind = "floor" | "wall" | "cover";

export type ArenaBlockoutPrimitive = Readonly<{
  id: string;
  kind: ArenaBlockoutPrimitiveKind;
  label: string;
  position: ArenaVector3;
  size: ArenaVector3;
}>;

export type ArenaPlayerScaleReference = Readonly<{
  id: string;
  label: string;
  position: ArenaVector3;
  radiusMeters: number;
  heightMeters: number;
}>;

export type ArenaSpawnMarker = Readonly<{
  id: string;
  label: string;
  role: "neutral";
  position: ArenaVector3;
  yaw: number;
}>;

export type ArenaMapLabel = Readonly<{
  id: string;
  text: string;
  position: ArenaVector3;
}>;

export type ArenaMapMetadata = Readonly<{
  id: string;
  displayName: string;
  revision: number;
  worldBounds: ArenaWorldBounds;
  primitives: readonly ArenaBlockoutPrimitive[];
  playerScaleReferences: readonly ArenaPlayerScaleReference[];
  spawnMarkers: readonly ArenaSpawnMarker[];
  labels?: readonly ArenaMapLabel[];
}>;

export type ArenaMapValidationError = Readonly<{
  field: string;
  message: string;
}>;

export type ArenaMapValidationResult = Readonly<{
  ok: boolean;
  errors: readonly ArenaMapValidationError[];
}>;

const FORBIDDEN_ORIGINALITY_TERMS =
  /\b(counter|strike|valve|dust|dust2|mirage|inferno|nuke|terrorist|counter-terrorist)\b/i;
const MAP_ID_PATTERN = /^arena-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHILD_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRIMITIVE_KINDS = new Set<ArenaBlockoutPrimitiveKind>(["floor", "wall", "cover"]);

export function validateArenaMapMetadata(input: unknown): ArenaMapValidationResult {
  const errors: ArenaMapValidationError[] = [];
  const seenIds = new Set<string>();

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [
        {
          field: "map",
          message: "Map metadata must be an object."
        }
      ]
    };
  }

  validateMapIdentity(input, errors);
  const bounds = readWorldBounds(input.worldBounds, errors);
  validatePrimitives(input.primitives, bounds, seenIds, errors);
  validatePlayerScaleReferences(input.playerScaleReferences, bounds, seenIds, errors);
  validateSpawnMarkers(input.spawnMarkers, bounds, seenIds, errors);
  validateLabels(input.labels, bounds, seenIds, errors);

  return {
    ok: errors.length === 0,
    errors
  };
}

function validateMapIdentity(input: Record<string, unknown>, errors: ArenaMapValidationError[]): void {
  if (typeof input.id !== "string" || !MAP_ID_PATTERN.test(input.id)) {
    errors.push({
      field: "id",
      message: "Map id must use the arena-kebab-case convention."
    });
  }

  if (
    typeof input.id === "string" &&
    typeof input.displayName === "string" &&
    FORBIDDEN_ORIGINALITY_TERMS.test(`${input.id} ${input.displayName}`)
  ) {
    errors.push({
      field: "id",
      message: "Map id and display name must avoid copied shooter terms."
    });
  }

  if (typeof input.displayName !== "string" || input.displayName.trim().length === 0) {
    errors.push({
      field: "displayName",
      message: "Display name is required."
    });
  }

  if (typeof input.revision !== "number" || !Number.isInteger(input.revision) || input.revision < 1) {
    errors.push({
      field: "revision",
      message: "Revision must be a positive integer."
    });
  }
}

function readWorldBounds(input: unknown, errors: ArenaMapValidationError[]): ArenaWorldBounds | undefined {
  if (!isRecord(input)) {
    errors.push({
      field: "worldBounds",
      message: "World bounds are required."
    });
    return undefined;
  }

  const min = readVector3(input.min);
  const max = readVector3(input.max);
  if (min === undefined || max === undefined) {
    errors.push({
      field: "worldBounds",
      message: "World bounds min and max must be finite 3D vectors."
    });
    return undefined;
  }

  if (min.some((value, index) => value >= max[index])) {
    errors.push({
      field: "worldBounds",
      message: "World bounds max must be greater than min on every axis."
    });
    return undefined;
  }

  return { min, max };
}

function validatePrimitives(
  input: unknown,
  bounds: ArenaWorldBounds | undefined,
  seenIds: Set<string>,
  errors: ArenaMapValidationError[]
): void {
  if (!Array.isArray(input) || input.length === 0) {
    errors.push({
      field: "primitives",
      message: "At least one blockout primitive is required."
    });
    return;
  }

  if (input.length > ARENA_MAP_METADATA_LIMITS.maxPrimitives) {
    errors.push({
      field: "primitives",
      message: `Primitive count must be ${ARENA_MAP_METADATA_LIMITS.maxPrimitives} or fewer.`
    });
  }

  input.forEach((primitive, index) => {
    const field = `primitives[${index}]`;
    if (!isRecord(primitive)) {
      errors.push({
        field,
        message: "Primitive must be an object."
      });
      return;
    }

    validateUniqueChildId(primitive.id, `${field}.id`, seenIds, errors);
    if (typeof primitive.kind !== "string" || !PRIMITIVE_KINDS.has(primitive.kind as ArenaBlockoutPrimitiveKind)) {
      errors.push({
        field: `${field}.kind`,
        message: "Primitive kind must be floor, wall, or cover."
      });
    }
    validateNonEmptyString(primitive.label, `${field}.label`, "Primitive label is required.", errors);

    const position = readVector3(primitive.position);
    const size = readVector3(primitive.size);
    if (position === undefined) {
      errors.push({
        field: `${field}.position`,
        message: "Primitive position must be a finite 3D vector."
      });
    }
    if (size === undefined || size.some((value) => value <= 0)) {
      errors.push({
        field: `${field}.size`,
        message: "Primitive size must be a positive finite 3D vector."
      });
    }
    if (bounds !== undefined && position !== undefined && size !== undefined && !boxFitsInsideBounds(position, size, bounds)) {
      errors.push({
        field: `${field}.position`,
        message: "Primitive must fit inside world bounds."
      });
    }
  });
}

function validatePlayerScaleReferences(
  input: unknown,
  bounds: ArenaWorldBounds | undefined,
  seenIds: Set<string>,
  errors: ArenaMapValidationError[]
): void {
  if (!Array.isArray(input)) {
    errors.push({
      field: "playerScaleReferences",
      message: "Player scale references are required."
    });
    return;
  }

  if (input.length > ARENA_MAP_METADATA_LIMITS.maxPlayerScaleReferences) {
    errors.push({
      field: "playerScaleReferences",
      message: `Player scale reference count must be ${ARENA_MAP_METADATA_LIMITS.maxPlayerScaleReferences} or fewer.`
    });
  }

  input.forEach((reference, index) => {
    const field = `playerScaleReferences[${index}]`;
    if (!isRecord(reference)) {
      errors.push({
        field,
        message: "Player scale reference must be an object."
      });
      return;
    }

    validateUniqueChildId(reference.id, `${field}.id`, seenIds, errors);
    validateNonEmptyString(reference.label, `${field}.label`, "Player scale label is required.", errors);
    const position = readVector3(reference.position);
    if (position === undefined) {
      errors.push({
        field: `${field}.position`,
        message: "Player scale position must be a finite 3D vector."
      });
    } else if (bounds !== undefined && !pointInsideBounds(position, bounds)) {
      errors.push({
        field: `${field}.position`,
        message: "Player scale reference must be inside world bounds."
      });
    }

    if (!isPositiveFinite(reference.radiusMeters)) {
      errors.push({
        field: `${field}.radiusMeters`,
        message: "Player scale radius must be positive and finite."
      });
    }
    if (!isPositiveFinite(reference.heightMeters)) {
      errors.push({
        field: `${field}.heightMeters`,
        message: "Player scale height must be positive and finite."
      });
    }
  });
}

function validateSpawnMarkers(
  input: unknown,
  bounds: ArenaWorldBounds | undefined,
  seenIds: Set<string>,
  errors: ArenaMapValidationError[]
): void {
  if (!Array.isArray(input) || input.length === 0) {
    errors.push({
      field: "spawnMarkers",
      message: "At least one neutral spawn marker is required."
    });
    return;
  }

  if (input.length > ARENA_MAP_METADATA_LIMITS.maxSpawnMarkers) {
    errors.push({
      field: "spawnMarkers",
      message: `Spawn marker count must be ${ARENA_MAP_METADATA_LIMITS.maxSpawnMarkers} or fewer.`
    });
  }

  input.forEach((spawn, index) => {
    const field = `spawnMarkers[${index}]`;
    if (!isRecord(spawn)) {
      errors.push({
        field,
        message: "Spawn marker must be an object."
      });
      return;
    }

    validateUniqueChildId(spawn.id, `${field}.id`, seenIds, errors);
    validateNonEmptyString(spawn.label, `${field}.label`, "Spawn label is required.", errors);
    if (spawn.role !== "neutral") {
      errors.push({
        field: `${field}.role`,
        message: "Only neutral spawn markers are allowed in this contract."
      });
    }

    const position = readVector3(spawn.position);
    if (position === undefined) {
      errors.push({
        field: `${field}.position`,
        message: "Spawn position must be a finite 3D vector."
      });
    } else if (bounds !== undefined && !pointInsideBounds(position, bounds)) {
      errors.push({
        field: `${field}.position`,
        message: "Spawn marker must be inside world bounds."
      });
    }

    if (typeof spawn.yaw !== "number" || !Number.isFinite(spawn.yaw)) {
      errors.push({
        field: `${field}.yaw`,
        message: "Spawn yaw must be finite."
      });
    }
  });
}

function validateLabels(
  input: unknown,
  bounds: ArenaWorldBounds | undefined,
  seenIds: Set<string>,
  errors: ArenaMapValidationError[]
): void {
  if (input === undefined) {
    return;
  }

  if (!Array.isArray(input)) {
    errors.push({
      field: "labels",
      message: "Labels must be an array when provided."
    });
    return;
  }

  if (input.length > ARENA_MAP_METADATA_LIMITS.maxLabels) {
    errors.push({
      field: "labels",
      message: `Label count must be ${ARENA_MAP_METADATA_LIMITS.maxLabels} or fewer.`
    });
  }

  input.forEach((label, index) => {
    const field = `labels[${index}]`;
    if (!isRecord(label)) {
      errors.push({
        field,
        message: "Label must be an object."
      });
      return;
    }

    validateUniqueChildId(label.id, `${field}.id`, seenIds, errors);
    validateNonEmptyString(label.text, `${field}.text`, "Label text is required.", errors);
    const position = readVector3(label.position);
    if (position === undefined) {
      errors.push({
        field: `${field}.position`,
        message: "Label position must be a finite 3D vector."
      });
    } else if (bounds !== undefined && !pointInsideBounds(position, bounds)) {
      errors.push({
        field: `${field}.position`,
        message: "Label must be inside world bounds."
      });
    }
  });
}

function validateUniqueChildId(
  value: unknown,
  field: string,
  seenIds: Set<string>,
  errors: ArenaMapValidationError[]
): void {
  if (typeof value !== "string" || !CHILD_ID_PATTERN.test(value)) {
    errors.push({
      field,
      message: "Child id must use kebab-case."
    });
    return;
  }

  if (seenIds.has(value)) {
    errors.push({
      field,
      message: `Child id '${value}' is duplicate.`
    });
    return;
  }

  seenIds.add(value);
}

function validateNonEmptyString(
  value: unknown,
  field: string,
  message: string,
  errors: ArenaMapValidationError[]
): void {
  if (typeof value !== "string" || value.trim().length === 0 || FORBIDDEN_ORIGINALITY_TERMS.test(value)) {
    errors.push({
      field,
      message
    });
  }
}

function boxFitsInsideBounds(position: ArenaVector3, size: ArenaVector3, bounds: ArenaWorldBounds): boolean {
  return position.every((value, index) => {
    const halfSize = size[index] / 2;
    return value - halfSize >= bounds.min[index] && value + halfSize <= bounds.max[index];
  });
}

function pointInsideBounds(position: ArenaVector3, bounds: ArenaWorldBounds): boolean {
  return position.every((value, index) => value >= bounds.min[index] && value <= bounds.max[index]);
}

function readVector3(value: unknown): ArenaVector3 | undefined {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((entry) => typeof entry === "number" && Number.isFinite(entry))) {
    return undefined;
  }

  return [value[0], value[1], value[2]];
}

function isPositiveFinite(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
