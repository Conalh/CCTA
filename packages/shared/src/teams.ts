// Two-faction model for the competitive loop. Teams are DERIVED from the spawn
// slot, not stored or sent separately: the fixed slot starts already split the
// arena into a north cluster and a south cluster, so the lower half of the slots
// is one side and the upper half the other. Both client and server derive the
// same side from the slot index the server already owns, so there is no extra
// protocol field and no new authority surface. Original names — not CT/T.

export const TEAM = {
  cops: 1,
  robbers: 2
} as const;

export type TeamId = (typeof TEAM)[keyof typeof TEAM];

export const DEFAULT_TEAM_MATCH_CAPACITY = 8 as const;

// Robbers attack (plant the charge); Cops defend (stop it).
export function teamName(team: TeamId): string {
  return team === TEAM.cops ? "Cops" : "Robbers";
}

export function listTeams(): readonly TeamId[] {
  return [TEAM.cops, TEAM.robbers];
}

// Lower slot half -> Cops (north cluster), upper half -> Robbers (south cluster).
export function teamForSlot(slotIndex: number, capacity: number = DEFAULT_TEAM_MATCH_CAPACITY): TeamId {
  const safeCapacity = Number.isInteger(capacity) && capacity >= 2 ? capacity : DEFAULT_TEAM_MATCH_CAPACITY;
  const safeSlot = Number.isInteger(slotIndex) && slotIndex >= 0 ? slotIndex : 0;
  return safeSlot < Math.floor(safeCapacity / 2) ? TEAM.cops : TEAM.robbers;
}

export function isKnownTeam(value: number): value is TeamId {
  return value === TEAM.cops || value === TEAM.robbers;
}
