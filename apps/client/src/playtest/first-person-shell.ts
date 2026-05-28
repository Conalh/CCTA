import type { NetworkedPlaytestMotionContact, Vector3Tuple } from "./playtest-state.js";

export const FIRST_PERSON_SHELL_MAX_PARTS = 4 as const;

export type FirstPersonShellStatus = "hidden" | "visible";

export type FirstPersonShellActivity = "idle" | "moving" | "blocked" | "sliding" | "fire-intent";

export type FirstPersonShellPartKind = "left-hand" | "right-hand" | "equipment-core" | "aim-index";

export type FirstPersonShellPartShape = "box" | "ellipsoid";

export type FirstPersonShellPart = Readonly<{
  color: string;
  id: string;
  kind: FirstPersonShellPartKind;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
  shape: FirstPersonShellPartShape;
}>;

export type FirstPersonShellPresentation = Readonly<{
  activity: FirstPersonShellActivity;
  attachedTo: "camera";
  cameraSpace: true;
  parts: readonly FirstPersonShellPart[];
  status: FirstPersonShellStatus;
}>;

export type FirstPersonShellPresentationInput = Readonly<{
  enabled: boolean;
  fireIntentActive: boolean;
  lookPitchRadians: number;
  motionContact: NetworkedPlaytestMotionContact;
  nowMs: number;
}>;

const BASE_PARTS: readonly FirstPersonShellPart[] = [
  {
    color: "#6aa99a",
    id: "local-left-hand-pod",
    kind: "left-hand",
    position: [-0.34, -0.31, -0.62],
    rotation: [-0.14, -0.2, 0.13],
    scale: [0.18, 0.11, 0.24],
    shape: "ellipsoid"
  },
  {
    color: "#74b4a4",
    id: "local-right-hand-pod",
    kind: "right-hand",
    position: [0.35, -0.31, -0.59],
    rotation: [-0.15, 0.18, -0.11],
    scale: [0.18, 0.11, 0.24],
    shape: "ellipsoid"
  },
  {
    color: "#2d3c42",
    id: "local-equipment-core",
    kind: "equipment-core",
    position: [0.02, -0.36, -0.76],
    rotation: [-0.1, 0, 0],
    scale: [0.3, 0.12, 0.42],
    shape: "box"
  },
  {
    color: "#c7d3c7",
    id: "local-aim-index",
    kind: "aim-index",
    position: [0, -0.23, -0.52],
    rotation: [0, 0, 0],
    scale: [0.035, 0.035, 0.035],
    shape: "ellipsoid"
  }
];

export function createFirstPersonShellPresentation(
  input: FirstPersonShellPresentationInput
): FirstPersonShellPresentation {
  if (!input.enabled) {
    return createHiddenFirstPersonShellPresentation();
  }

  const nowMs = readFinite(input.nowMs, 0);
  const pitch = clamp(readFinite(input.lookPitchRadians, 0), -0.9, 0.9);
  const activity = readShellActivity(input.motionContact, input.fireIntentActive);
  const swayPhase = nowMs / 135;
  const swayMagnitude = activity === "moving" || activity === "sliding" ? 0.018 : 0.006;
  const blockedCompression = activity === "blocked" ? 0.028 : 0;
  const fireImpulse = activity === "fire-intent" ? 0.045 : 0;
  const pitchLift = clamp(-pitch * 0.045, -0.045, 0.045);

  return {
    activity,
    attachedTo: "camera",
    cameraSpace: true,
    parts: BASE_PARTS.map((part, index) => {
      const lateralSway = Math.sin(swayPhase + index * 0.72) * swayMagnitude;
      const verticalSway = Math.cos(swayPhase + index * 0.5) * swayMagnitude * 0.55;
      const impulseScale = part.kind === "equipment-core" ? 0.45 : 1;
      return {
        ...part,
        position: [
          normalizeNumber(part.position[0] + lateralSway * readHandedness(part.kind)),
          normalizeNumber(part.position[1] + verticalSway + pitchLift),
          normalizeNumber(part.position[2] + blockedCompression + fireImpulse * impulseScale)
        ],
        rotation: [
          normalizeNumber(part.rotation[0] + pitch * 0.08 - fireImpulse * 0.35),
          part.rotation[1],
          normalizeNumber(part.rotation[2] + lateralSway * 0.7)
        ]
      };
    }),
    status: "visible"
  };
}

export function createHiddenFirstPersonShellPresentation(): FirstPersonShellPresentation {
  return {
    activity: "idle",
    attachedTo: "camera",
    cameraSpace: true,
    parts: [],
    status: "hidden"
  };
}

export function formatFirstPersonShellStatus(shell: FirstPersonShellPresentation): string {
  return shell.status === "hidden" ? "hidden" : `${shell.status} ${shell.activity}`;
}

function readShellActivity(
  motionContact: NetworkedPlaytestMotionContact,
  fireIntentActive: boolean
): FirstPersonShellActivity {
  if (fireIntentActive) {
    return "fire-intent";
  }

  switch (motionContact) {
    case "blocked":
      return "blocked";
    case "sliding":
      return "sliding";
    case "moving":
      return "moving";
    case "idle":
    case "unknown":
      return "idle";
  }
}

function readHandedness(kind: FirstPersonShellPartKind): number {
  switch (kind) {
    case "left-hand":
      return -1;
    case "right-hand":
      return 1;
    case "equipment-core":
    case "aim-index":
      return 0.2;
  }
}

function readFinite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeNumber(value: number): number {
  const normalized = Number(value.toFixed(6));
  return Object.is(normalized, -0) ? 0 : normalized;
}
