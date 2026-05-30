import {
  getPlayerCallsign,
  getWeaponDefinition,
  teamForSlot,
  teamName,
  type MatchRosterEntry,
  type TeamId
} from "@breachline/shared";

export type RosterPresentationRow = Readonly<{
  callsign: string;
  isLocalSession: boolean;
  label: string;
  sessionId: number;
  slotIndex: number;
  team: TeamId;
  teamLabel: string;
  weaponLabel: string;
}>;

export type RosterPresentation = Readonly<{
  entryCount: number;
  lastServerTick: number | undefined;
  localCallsign: string | undefined;
  localSessionId: number | undefined;
  rows: readonly RosterPresentationRow[];
  summaryLabel: string;
}>;

export type RosterPresentationInput = Readonly<{
  entries: readonly MatchRosterEntry[] | undefined;
  lastServerTick?: number;
  localSessionId?: number;
}>;

const EMPTY_SUMMARY = "no roster yet";
const UNSELECTED_WEAPON_LABEL = "pending";

export function createRosterPresentation(input: RosterPresentationInput): RosterPresentation {
  const localSessionId = readPositiveInteger(input.localSessionId);
  const usableEntries = readUsableEntries(input.entries);
  // Slot order is presentation-only readability; identity, weapon, and slot all come
  // straight from the server roster and the client never invents participants.
  const sortedEntries = [...usableEntries].sort(compareEntriesForReadability);

  let localCallsign: string | undefined;
  const rows = sortedEntries.map((entry): RosterPresentationRow => {
    const isLocalSession = localSessionId !== undefined && entry.sessionId === localSessionId;
    if (isLocalSession) {
      localCallsign = entry.callsign;
    }

    const team = teamForSlot(entry.slotIndex);
    return {
      callsign: entry.callsign,
      isLocalSession,
      label: isLocalSession ? `${entry.callsign} (you)` : entry.callsign,
      sessionId: entry.sessionId,
      slotIndex: entry.slotIndex,
      team,
      teamLabel: teamName(team),
      weaponLabel: entry.weaponLabel
    };
  });

  return {
    entryCount: rows.length,
    lastServerTick: readNonNegativeInteger(input.lastServerTick),
    localCallsign,
    localSessionId,
    rows,
    summaryLabel: formatSummary(rows, localCallsign)
  };
}

type UsableRosterEntry = Readonly<{
  callsign: string;
  sessionId: number;
  slotIndex: number;
  weaponLabel: string;
}>;

function readUsableEntries(
  entries: readonly MatchRosterEntry[] | undefined
): readonly UsableRosterEntry[] {
  if (entries === undefined) {
    return [];
  }

  const usable: UsableRosterEntry[] = [];
  for (const entry of entries) {
    const sessionId = readPositiveInteger(entry?.sessionId);
    const slotIndex = readNonNegativeInteger(entry?.slotIndex);
    const callsign = typeof entry?.handleId === "number" ? getPlayerCallsign(entry.handleId) : undefined;
    if (sessionId === undefined || slotIndex === undefined || callsign === undefined) {
      continue;
    }

    usable.push({
      callsign,
      sessionId,
      slotIndex,
      weaponLabel: getWeaponDefinition(entry.weaponProfileId)?.name ?? UNSELECTED_WEAPON_LABEL
    });
  }
  return usable;
}

function compareEntriesForReadability(left: UsableRosterEntry, right: UsableRosterEntry): number {
  if (left.slotIndex !== right.slotIndex) {
    return left.slotIndex - right.slotIndex;
  }
  return left.sessionId - right.sessionId;
}

function formatSummary(
  rows: readonly RosterPresentationRow[],
  localCallsign: string | undefined
): string {
  if (rows.length === 0) {
    return EMPTY_SUMMARY;
  }

  if (localCallsign !== undefined) {
    const localRow = rows.find((row) => row.callsign === localCallsign);
    if (localRow !== undefined) {
      return `${localRow.callsign}: ${localRow.weaponLabel}`;
    }
  }

  return rows.length === 1 ? "1 participant" : `${rows.length} participants`;
}

function readPositiveInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function readNonNegativeInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}
