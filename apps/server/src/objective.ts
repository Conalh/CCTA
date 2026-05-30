import {
  CHARGE_PHASE,
  DEFUSE_DURATION_TICKS,
  DETONATION_DELAY_TICKS,
  PLANT_DURATION_TICKS,
  type ChargePhase,
  type ServerObjectiveStateMessage
} from "@breachline/shared";

// Server-authoritative breach-charge state machine. The runtime feeds it a count of
// valid planters (alive Robbers standing in the site holding use) and defusers (alive
// Cops on the armed charge holding use) each tick; the charge itself decides when it
// arms, detonates, or is defused. Progress is time-based, so extra hands never rush it,
// and stepping away from the action resets the in-flight plant or defuse.
export type ObjectiveConfig = Readonly<{
  plantDurationTicks?: number;
  defuseDurationTicks?: number;
  detonationDelayTicks?: number;
}>;

export type ObjectiveAdvanceInput = Readonly<{
  serverTick: number;
  planterCount: number;
  defuserCount: number;
}>;

export type ObjectiveAdvanceResult = Readonly<{
  phase: ChargePhase;
  plantProgress: number;
  defuseProgress: number;
  detonationTick: number;
  justPlanted: boolean;
  justDefused: boolean;
  justDetonated: boolean;
}>;

export type ObjectiveState = Readonly<{
  advance(input: ObjectiveAdvanceInput): ObjectiveAdvanceResult;
  reset(): void;
  isArmed(): boolean;
  isResolved(): boolean;
  getPhase(): ChargePhase;
  getDetonationTick(): number;
  createStateMessage(serverTick: number): ServerObjectiveStateMessage;
}>;

export function createObjectiveState(config: ObjectiveConfig = {}): ObjectiveState {
  const plantDuration = readPositiveInteger(config.plantDurationTicks, PLANT_DURATION_TICKS);
  const defuseDuration = readPositiveInteger(config.defuseDurationTicks, DEFUSE_DURATION_TICKS);
  const detonationDelay = readPositiveInteger(config.detonationDelayTicks, DETONATION_DELAY_TICKS);

  let phase: ChargePhase = CHARGE_PHASE.idle;
  let plantProgress = 0;
  let defuseProgress = 0;
  let detonationTick = 0;

  function advance(input: ObjectiveAdvanceInput): ObjectiveAdvanceResult {
    const serverTick = readUint32(input.serverTick, "serverTick");
    const planterCount = readNonNegativeCount(input.planterCount);
    const defuserCount = readNonNegativeCount(input.defuserCount);

    let justPlanted = false;
    let justDefused = false;
    let justDetonated = false;

    if (phase === CHARGE_PHASE.idle) {
      // No charge to defuse yet; only a plant can progress here.
      defuseProgress = 0;
      if (planterCount > 0) {
        plantProgress = Math.min(plantDuration, plantProgress + 1);
        if (plantProgress >= plantDuration) {
          phase = CHARGE_PHASE.planted;
          detonationTick = serverTick + detonationDelay;
          justPlanted = true;
        }
      } else {
        plantProgress = 0;
      }
    } else if (phase === CHARGE_PHASE.planted) {
      plantProgress = plantDuration;
      if (defuserCount > 0) {
        defuseProgress = Math.min(defuseDuration, defuseProgress + 1);
      } else {
        defuseProgress = 0;
      }
      // A completed defuse beats the clock on a tie; otherwise the charge blows.
      if (defuseProgress >= defuseDuration) {
        phase = CHARGE_PHASE.defused;
        justDefused = true;
      } else if (serverTick >= detonationTick) {
        phase = CHARGE_PHASE.detonated;
        justDetonated = true;
      }
    }
    // CHARGE_PHASE.defused and CHARGE_PHASE.detonated are terminal until reset().

    return {
      phase,
      plantProgress,
      defuseProgress,
      detonationTick,
      justPlanted,
      justDefused,
      justDetonated
    };
  }

  function reset(): void {
    phase = CHARGE_PHASE.idle;
    plantProgress = 0;
    defuseProgress = 0;
    detonationTick = 0;
  }

  function isArmed(): boolean {
    return phase === CHARGE_PHASE.planted;
  }

  function isResolved(): boolean {
    return phase === CHARGE_PHASE.defused || phase === CHARGE_PHASE.detonated;
  }

  function getPhase(): ChargePhase {
    return phase;
  }

  function getDetonationTick(): number {
    return detonationTick;
  }

  function createStateMessage(serverTick: number): ServerObjectiveStateMessage {
    return {
      kind: "server.objective.state",
      serverTick: readUint32(serverTick, "serverTick"),
      chargePhase: phase,
      plantProgress,
      defuseProgress,
      detonationTick
    };
  }

  return {
    advance,
    reset,
    isArmed,
    isResolved,
    getPhase,
    getDetonationTick,
    createStateMessage
  };
}

function readNonNegativeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function readPositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function readUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${field} must be an unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}
