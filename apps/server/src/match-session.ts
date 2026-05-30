import { TEAM, teamForSlot, type TeamId } from "@breachline/shared";

export const DEFAULT_MATCH_ID = 1 as const;
export const DEFAULT_MATCH_CAPACITY = 8 as const;
export const DEFAULT_FIRST_SESSION_ID = 1 as const;

export type FixedMatchSessionConfig = Readonly<{
  matchId?: number;
  capacity?: number;
  firstSessionId?: number;
}>;

export type MatchAssignment = Readonly<{
  ok: true;
  matchId: number;
  sessionId: number;
  slotIndex: number;
  capacity: number;
  connectedSlots: number;
}>;

export type MatchRejection = Readonly<{
  ok: false;
  reason: string;
  matchId: number;
  capacity: number;
  connectedSlots: number;
}>;

export type MatchDisconnect = Readonly<{
  matchId: number;
  sessionId: number;
  slotIndex: number;
  capacity: number;
  connectedSlots: number;
}>;

export type FixedMatchSession = Readonly<{
  readonly matchId: number;
  readonly capacity: number;
  assign(transportId: string): MatchAssignment | MatchRejection;
  disconnect(transportId: string): MatchDisconnect | undefined;
  connectedSlotCount(): number;
}>;

type MatchSlot = {
  slotIndex: number;
  connected: boolean;
  sessionId: number | undefined;
  transportId: string | undefined;
};

export function createFixedMatchSession(config: FixedMatchSessionConfig = {}): FixedMatchSession {
  const matchId = readPositiveUint32(config.matchId ?? DEFAULT_MATCH_ID, "matchId");
  const capacity = readPositiveUint16(config.capacity ?? DEFAULT_MATCH_CAPACITY, "capacity");
  let nextSessionId = readPositiveUint32(config.firstSessionId ?? DEFAULT_FIRST_SESSION_ID, "firstSessionId");
  const slots = Array.from({ length: capacity }, (_value, slotIndex): MatchSlot => {
    return {
      slotIndex,
      connected: false,
      sessionId: undefined,
      transportId: undefined
    };
  });

  function assign(transportId: string): MatchAssignment | MatchRejection {
    const existingSlot = slots.find((slot) => slot.connected && slot.transportId === transportId);
    if (existingSlot !== undefined && existingSlot.sessionId !== undefined) {
      return createAssignment(existingSlot);
    }

    const availableSlot = pickBalancedSlot();
    if (availableSlot === undefined) {
      return {
        ok: false,
        reason: "Match is full.",
        matchId,
        capacity,
        connectedSlots: connectedSlotCount()
      };
    }

    availableSlot.connected = true;
    availableSlot.transportId = transportId;
    availableSlot.sessionId = nextSessionId;
    nextSessionId += 1;

    return createAssignment(availableSlot);
  }

  function disconnect(transportId: string): MatchDisconnect | undefined {
    const slot = slots.find((candidate) => candidate.connected && candidate.transportId === transportId);
    if (slot === undefined || slot.sessionId === undefined) {
      return undefined;
    }

    const sessionId = slot.sessionId;
    slot.connected = false;
    slot.transportId = undefined;

    return {
      matchId,
      sessionId,
      slotIndex: slot.slotIndex,
      capacity,
      connectedSlots: connectedSlotCount()
    };
  }

  function connectedSlotCount(): number {
    return slots.reduce((count, slot) => count + (slot.connected ? 1 : 0), 0);
  }

  function connectedTeamCount(team: TeamId): number {
    return slots.reduce(
      (count, slot) => count + (slot.connected && teamForSlot(slot.slotIndex, capacity) === team ? 1 : 0),
      0
    );
  }

  // Balance the two sides as players join: fill the smaller side's lowest free slot
  // (ties go to Cops), falling back to whichever side still has room. This keeps a
  // 1v1 on opposite sides instead of stacking both on the lower slots.
  function pickBalancedSlot(): MatchSlot | undefined {
    const freeCops = slots.filter((slot) => !slot.connected && teamForSlot(slot.slotIndex, capacity) === TEAM.cops);
    const freeRobbers = slots.filter((slot) => !slot.connected && teamForSlot(slot.slotIndex, capacity) === TEAM.robbers);
    const preferCops = connectedTeamCount(TEAM.cops) <= connectedTeamCount(TEAM.robbers);

    if (preferCops && freeCops.length > 0) {
      return freeCops[0];
    }
    if (!preferCops && freeRobbers.length > 0) {
      return freeRobbers[0];
    }
    return freeCops[0] ?? freeRobbers[0];
  }

  function createAssignment(slot: MatchSlot): MatchAssignment {
    if (slot.sessionId === undefined) {
      throw new Error("Cannot create a match assignment without a session id.");
    }

    return {
      ok: true,
      matchId,
      sessionId: slot.sessionId,
      slotIndex: slot.slotIndex,
      capacity,
      connectedSlots: connectedSlotCount()
    };
  }

  return {
    matchId,
    capacity,
    assign,
    disconnect,
    connectedSlotCount
  };
}

function readPositiveUint16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 0xffff) {
    throw new Error(`${field} must be a positive unsigned 16-bit integer, got ${value}.`);
  }
  return value;
}

function readPositiveUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 0xffffffff) {
    throw new Error(`${field} must be a positive unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}
