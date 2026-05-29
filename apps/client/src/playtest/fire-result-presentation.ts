import type { FireRejectReason } from "@breachline/shared";

import type { NetworkedPlaytestRemotePlaceholder, Vector3Tuple } from "./playtest-state.js";

export const FIRE_RESULT_PRESENTATION_MAX_EFFECTS = 6 as const;
export const FIRE_RESULT_TRACER_DURATION_MS = 760 as const;
export const FIRE_RESULT_INTENT_DURATION_MS = 420 as const;
export const FIRE_RESULT_MISS_DISTANCE_METERS = 8 as const;
export const FIRE_RESULT_REJECT_DURATION_MS = 640 as const;
export const FIRE_RESULT_TARGET_EYE_HEIGHT_METERS = 1.62 as const;
export const FIRE_RESULT_HITMARKER_DURATION_MS = 220 as const;

export type FireResultPresentationResultState =
  | "none"
  | "accepted-hit"
  | "accepted-miss"
  | "rejected";

export type FireResultPresentationHitState = "none" | "hit" | "miss" | "rejected";

export type FireResultPresentationEffectKind =
  | "local-intent-pulse"
  | "authority-tracer"
  | "impact-marker"
  | "reject-marker";

export type FireResultPresentationEffect = Readonly<{
  color: string;
  createdAtMs: number;
  expiresAtMs: number;
  id: string;
  kind: FireResultPresentationEffectKind;
  opacity: number;
  position?: Vector3Tuple;
  radiusMeters: number;
  sequence: number;
  start?: Vector3Tuple;
  end?: Vector3Tuple;
  space: "camera" | "world";
}>;

export type FireResultPresentationState = Readonly<{
  activeEffects: readonly FireResultPresentationEffect[];
  activeTracerCount: number;
  expiredEffectCount: number;
  highlightedRemoteEntityId: number | undefined;
  hitmarkerActive: boolean;
  hitState: FireResultPresentationHitState;
  lastHitAtMs: number | undefined;
  lastRejectReason: FireRejectReason | undefined;
  lastVisualizedFireSequence: number | undefined;
  lastVisualizedIntentSequence: number | undefined;
  resultState: FireResultPresentationResultState;
}>;

export type FireResultPresentationInput = Readonly<{
  lastFireAccepted?: boolean;
  lastFireDistance?: number;
  lastFireHit?: boolean;
  lastFireIntentSequence?: number;
  lastFireIntentTimeMs?: number;
  lastFireRejectReason?: FireRejectReason;
  lastFireResultSequence?: number;
  lastFireTargetEntityId?: number;
  lastFireTargetSessionId?: number;
  localCameraPosition: Vector3Tuple;
  localPitchRadians: number;
  localYawRadians: number;
  nowMs: number;
  remotePlaceholders?: readonly NetworkedPlaytestRemotePlaceholder[];
}>;

export function createInitialFireResultPresentationState(): FireResultPresentationState {
  return {
    activeEffects: [],
    activeTracerCount: 0,
    expiredEffectCount: 0,
    highlightedRemoteEntityId: undefined,
    hitmarkerActive: false,
    hitState: "none",
    lastHitAtMs: undefined,
    lastRejectReason: undefined,
    lastVisualizedFireSequence: undefined,
    lastVisualizedIntentSequence: undefined,
    resultState: "none"
  };
}

export function updateFireResultPresentationState(
  state: FireResultPresentationState,
  input: FireResultPresentationInput
): FireResultPresentationState {
  const nowMs = readFinite(input.nowMs);
  if (nowMs === undefined) {
    return state;
  }

  const expiredEffectCount = state.expiredEffectCount + countExpiredEffects(state.activeEffects, nowMs);
  let nextState = {
    ...state,
    expiredEffectCount,
    activeEffects: expireEffects(state.activeEffects, nowMs)
  };

  nextState = maybeAddIntentPulse(nextState, input, nowMs);
  nextState = maybeAddServerResultEffects(nextState, input, nowMs);

  const activeEffects = boundEffects(nextState.activeEffects);
  return {
    ...nextState,
    activeEffects,
    activeTracerCount: activeEffects.filter((effect) => effect.kind === "authority-tracer").length,
    highlightedRemoteEntityId: hasActiveTargetAccent(activeEffects, nextState.lastVisualizedFireSequence)
      ? nextState.highlightedRemoteEntityId
      : undefined,
    // Hitmarker is a short, read-only flash gated only by a server-confirmed hit.
    hitmarkerActive:
      nextState.lastHitAtMs !== undefined &&
      nowMs - nextState.lastHitAtMs <= FIRE_RESULT_HITMARKER_DURATION_MS
  };
}

export function formatFireResultPresentationStatus(state: FireResultPresentationState): string {
  switch (state.resultState) {
    case "none":
      return "-";
    case "accepted-hit":
      return "accepted hit";
    case "accepted-miss":
      return "accepted miss";
    case "rejected":
      return "rejected";
  }
}

function maybeAddIntentPulse(
  state: FireResultPresentationState,
  input: FireResultPresentationInput,
  nowMs: number
): FireResultPresentationState {
  const sequence = readPositiveInteger(input.lastFireIntentSequence);
  if (
    sequence === undefined ||
    sequence === state.lastVisualizedIntentSequence ||
    input.lastFireIntentTimeMs === undefined ||
    nowMs - input.lastFireIntentTimeMs > FIRE_RESULT_INTENT_DURATION_MS
  ) {
    return state;
  }

  return {
    ...state,
    activeEffects: [
      ...state.activeEffects,
      {
        color: "#d6f0ce",
        createdAtMs: nowMs,
        expiresAtMs: nowMs + FIRE_RESULT_INTENT_DURATION_MS,
        id: `local-intent-pulse-${sequence}`,
        kind: "local-intent-pulse",
        opacity: 0.92,
        position: [0, -0.2, -0.48],
        radiusMeters: 0.08,
        sequence,
        space: "camera"
      }
    ],
    lastVisualizedIntentSequence: sequence
  };
}

function maybeAddServerResultEffects(
  state: FireResultPresentationState,
  input: FireResultPresentationInput,
  nowMs: number
): FireResultPresentationState {
  const sequence = readPositiveInteger(input.lastFireResultSequence);
  if (sequence === undefined || sequence <= (state.lastVisualizedFireSequence ?? 0)) {
    return state;
  }

  const cameraPosition = readVector(input.localCameraPosition);
  const yaw = readFinite(input.localYawRadians);
  const pitch = readFinite(input.localPitchRadians);
  if (cameraPosition === undefined || yaw === undefined || pitch === undefined) {
    return state;
  }

  if (input.lastFireAccepted === false) {
    return {
      ...state,
      activeEffects: [
        ...state.activeEffects,
        createRejectMarker(sequence, nowMs)
      ],
      highlightedRemoteEntityId: undefined,
      hitState: "rejected",
      lastRejectReason: input.lastFireRejectReason,
      lastVisualizedFireSequence: sequence,
      resultState: "rejected"
    };
  }

  if (input.lastFireAccepted !== true || typeof input.lastFireHit !== "boolean") {
    return state;
  }

  const targetPosition = readServerResultEndpoint({
    cameraPosition,
    distance: input.lastFireDistance,
    hit: input.lastFireHit,
    pitch,
    remotePlaceholders: input.remotePlaceholders ?? [],
    targetEntityId: input.lastFireTargetEntityId,
    yaw
  });
  if (targetPosition === undefined) {
    return state;
  }

  const resultState = input.lastFireHit ? "accepted-hit" : "accepted-miss";
  const hitState = input.lastFireHit ? "hit" : "miss";
  const color = input.lastFireHit ? "#d6f0ce" : "#e8c970";
  const highlightedRemoteEntityId =
    input.lastFireHit && readPositiveInteger(input.lastFireTargetEntityId) !== undefined
      ? input.lastFireTargetEntityId
      : undefined;

  return {
    ...state,
    activeEffects: [
      ...state.activeEffects,
      {
        color,
        createdAtMs: nowMs,
        end: targetPosition,
        expiresAtMs: nowMs + FIRE_RESULT_TRACER_DURATION_MS,
        id: `authority-tracer-${sequence}`,
        kind: "authority-tracer",
        opacity: input.lastFireHit ? 0.95 : 0.78,
        radiusMeters: input.lastFireHit ? 0.038 : 0.032,
        sequence,
        space: "world",
        start: cameraPosition
      },
      {
        color,
        createdAtMs: nowMs,
        expiresAtMs: nowMs + FIRE_RESULT_TRACER_DURATION_MS,
        id: `impact-marker-${sequence}`,
        kind: "impact-marker",
        opacity: input.lastFireHit ? 0.95 : 0.72,
        position: targetPosition,
        radiusMeters: input.lastFireHit ? 0.24 : 0.14,
        sequence,
        space: "world"
      }
    ],
    highlightedRemoteEntityId,
    hitState,
    lastHitAtMs: input.lastFireHit ? nowMs : state.lastHitAtMs,
    lastRejectReason: undefined,
    lastVisualizedFireSequence: sequence,
    resultState
  };
}

function createRejectMarker(sequence: number, nowMs: number): FireResultPresentationEffect {
  return {
    color: "#d98272",
    createdAtMs: nowMs,
    expiresAtMs: nowMs + FIRE_RESULT_REJECT_DURATION_MS,
    id: `reject-marker-${sequence}`,
    kind: "reject-marker",
    opacity: 0.9,
    position: [0, -0.18, -0.48],
    radiusMeters: 0.11,
    sequence,
    space: "camera"
  };
}

function readServerResultEndpoint(
  input: Readonly<{
    cameraPosition: Vector3Tuple;
    distance?: number;
    hit: boolean;
    pitch: number;
    remotePlaceholders: readonly NetworkedPlaytestRemotePlaceholder[];
    targetEntityId?: number;
    yaw: number;
  }>
): Vector3Tuple | undefined {
  if (input.hit) {
    const targetEntityId = readPositiveInteger(input.targetEntityId);
    const target = input.remotePlaceholders.find((placeholder) => placeholder.entityId === targetEntityId);
    const targetPosition = readVector(target?.position);
    if (targetPosition !== undefined) {
      return [
        targetPosition[0],
        normalizeNumber(targetPosition[1] + FIRE_RESULT_TARGET_EYE_HEIGHT_METERS),
        targetPosition[2]
      ];
    }

    const hitDistance = readPositiveFinite(input.distance);
    if (hitDistance === undefined) {
      return undefined;
    }
    return projectEndpoint(input.cameraPosition, input.yaw, input.pitch, hitDistance);
  }

  return projectEndpoint(input.cameraPosition, input.yaw, input.pitch, FIRE_RESULT_MISS_DISTANCE_METERS);
}

function projectEndpoint(
  origin: Vector3Tuple,
  yaw: number,
  pitch: number,
  distance: number
): Vector3Tuple {
  const horizontalScale = Math.cos(pitch);
  return [
    normalizeNumber(origin[0] + -Math.sin(yaw) * horizontalScale * distance),
    normalizeNumber(origin[1] + Math.sin(pitch) * distance),
    normalizeNumber(origin[2] + -Math.cos(yaw) * horizontalScale * distance)
  ];
}

function expireEffects(
  effects: readonly FireResultPresentationEffect[],
  nowMs: number
): readonly FireResultPresentationEffect[] {
  return effects
    .filter((effect) => effect.expiresAtMs > nowMs)
    .map((effect) => {
      const durationMs = Math.max(1, effect.expiresAtMs - effect.createdAtMs);
      const ageMs = Math.max(0, nowMs - effect.createdAtMs);
      const remaining = clamp(1 - ageMs / durationMs, 0, 1);
      const easedRemaining = Math.sqrt(remaining);
      return {
        ...effect,
        opacity: normalizeNumber(effect.opacity * easedRemaining),
        radiusMeters: normalizeNumber(effect.radiusMeters * (1 + (1 - remaining) * 0.45))
      };
    });
}

function countExpiredEffects(
  effects: readonly FireResultPresentationEffect[],
  nowMs: number
): number {
  return effects.filter((effect) => effect.expiresAtMs <= nowMs).length;
}

function hasActiveTargetAccent(
  effects: readonly FireResultPresentationEffect[],
  sequence: number | undefined
): boolean {
  return (
    sequence !== undefined &&
    effects.some(
      (effect) =>
        effect.sequence === sequence &&
        (effect.kind === "authority-tracer" || effect.kind === "impact-marker")
    )
  );
}

function boundEffects(
  effects: readonly FireResultPresentationEffect[]
): readonly FireResultPresentationEffect[] {
  return effects.slice(Math.max(0, effects.length - FIRE_RESULT_PRESENTATION_MAX_EFFECTS));
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

function readFinite(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readPositiveFinite(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeNumber(value: number): number {
  const normalized = Number(value.toFixed(6));
  return Object.is(normalized, -0) ? 0 : normalized;
}
