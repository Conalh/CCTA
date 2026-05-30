import {
  CHARGE_PHASE,
  DEFUSE_DURATION_TICKS,
  PLANT_DURATION_TICKS,
  SERVER_TICK_RATE_HZ,
  TEAM,
  isWithinPlantSite,
  type ChargePhase,
  type TeamId
} from "@breachline/shared";

// Pure view model for the breach-charge HUD readout. Turns the mirrored charge state into
// a status line, a detonation countdown or progress percent, and a tone the DOM colours by.
export type ObjectiveHudTone = "idle" | "arming" | "armed" | "defusing" | "defused" | "detonated";

export type ObjectiveHudView = Readonly<{
  visible: boolean;
  status: string;
  detail: string;
  tone: ObjectiveHudTone;
  progress: number | undefined;
}>;

export type ObjectiveHudInput = Readonly<{
  chargePhase: ChargePhase | undefined;
  plantProgress?: number;
  defuseProgress?: number;
  detonationTick?: number;
  serverTick?: number;
  tickRateHz?: number;
}>;

const HIDDEN: ObjectiveHudView = { visible: false, status: "", detail: "", tone: "idle", progress: undefined };

export function createObjectiveHudView(input: ObjectiveHudInput): ObjectiveHudView {
  const phase = input.chargePhase;
  const tickRate = input.tickRateHz ?? SERVER_TICK_RATE_HZ;

  if (phase === CHARGE_PHASE.detonated) {
    return { visible: true, status: "Charge detonated", detail: "", tone: "detonated", progress: undefined };
  }
  if (phase === CHARGE_PHASE.defused) {
    return { visible: true, status: "Charge defused", detail: "", tone: "defused", progress: undefined };
  }
  if (phase === CHARGE_PHASE.planted) {
    const countdown = formatCountdown(input.detonationTick, input.serverTick, tickRate);
    const defuse = clampProgress(input.defuseProgress, DEFUSE_DURATION_TICKS);
    if (defuse > 0) {
      return { visible: true, status: "Defusing", detail: countdown, tone: "defusing", progress: defuse };
    }
    return { visible: true, status: "Charge armed", detail: countdown, tone: "armed", progress: undefined };
  }

  // Idle (or not yet known): only surface an in-flight plant.
  const plant = clampProgress(input.plantProgress, PLANT_DURATION_TICKS);
  if (plant > 0) {
    return { visible: true, status: "Planting", detail: `${Math.round(plant * 100)}%`, tone: "arming", progress: plant };
  }
  return HIDDEN;
}

// Contextual action prompt: shown only when the local player can actually act on the
// charge — a live Robber standing on the idle site (plant) or a live Cop on the armed
// charge (defuse). Side comes from the server-owned slot; position from server truth.
export type ObjectivePromptView = Readonly<{ visible: boolean; text: string }>;

export type ObjectivePromptInput = Readonly<{
  localTeam: TeamId | undefined;
  localAlive: boolean | undefined;
  localX: number | undefined;
  localZ: number | undefined;
  chargePhase: ChargePhase | undefined;
}>;

const NO_PROMPT: ObjectivePromptView = { visible: false, text: "" };

export function createObjectivePromptView(input: ObjectivePromptInput): ObjectivePromptView {
  if (input.localAlive !== true || input.localX === undefined || input.localZ === undefined) {
    return NO_PROMPT;
  }
  if (!isWithinPlantSite(input.localX, input.localZ)) {
    return NO_PROMPT;
  }
  const phase = input.chargePhase;
  if (input.localTeam === TEAM.robbers && (phase === undefined || phase === CHARGE_PHASE.idle)) {
    return { visible: true, text: "Hold E to plant the charge" };
  }
  if (input.localTeam === TEAM.cops && phase === CHARGE_PHASE.planted) {
    return { visible: true, text: "Hold E to defuse the charge" };
  }
  return NO_PROMPT;
}

function clampProgress(value: number | undefined, duration: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0 || duration <= 0) {
    return 0;
  }
  return Math.min(1, value / duration);
}

function formatCountdown(
  detonationTick: number | undefined,
  serverTick: number | undefined,
  tickRate: number
): string {
  if (detonationTick === undefined || serverTick === undefined || tickRate <= 0) {
    return "";
  }
  const ticksRemaining = Math.max(0, detonationTick - serverTick);
  const seconds = Math.ceil(ticksRemaining / tickRate);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
