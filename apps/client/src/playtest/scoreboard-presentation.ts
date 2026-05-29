import { type MatchStatsEntry } from "@breachline/shared";

export type ScoreboardPresentationRow = Readonly<{
  deaths: number;
  isLocalSession: boolean;
  kills: number;
  label: string;
  position: number;
  sessionId: number;
}>;

export type ScoreboardPresentation = Readonly<{
  entryCount: number;
  lastServerTick: number | undefined;
  localPosition: number | undefined;
  localSessionId: number | undefined;
  rows: readonly ScoreboardPresentationRow[];
  summaryLabel: string;
}>;

export type ScoreboardPresentationInput = Readonly<{
  entries: readonly MatchStatsEntry[] | undefined;
  lastServerTick?: number;
  localSessionId?: number;
}>;

const EMPTY_SUMMARY = "no stats yet";

export function createScoreboardPresentation(
  input: ScoreboardPresentationInput
): ScoreboardPresentation {
  const localSessionId = readPositiveInteger(input.localSessionId);
  const usableEntries = readUsableEntries(input.entries);
  // Row order is presentation-only readability; kills/deaths come straight from the
  // server broadcast and the client never derives standings, scores, or a winner.
  const sortedEntries = [...usableEntries].sort(compareEntriesForReadability);

  let localPosition: number | undefined;
  const rows = sortedEntries.map((entry, index): ScoreboardPresentationRow => {
    const position = index + 1;
    const isLocalSession = localSessionId !== undefined && entry.sessionId === localSessionId;
    if (isLocalSession) {
      localPosition = position;
    }

    return {
      deaths: entry.deaths,
      isLocalSession,
      kills: entry.kills,
      label: isLocalSession ? `session ${entry.sessionId} (you)` : `session ${entry.sessionId}`,
      position,
      sessionId: entry.sessionId
    };
  });

  return {
    entryCount: rows.length,
    lastServerTick: readNonNegativeInteger(input.lastServerTick),
    localPosition,
    localSessionId,
    rows,
    summaryLabel: formatSummary(rows, localSessionId)
  };
}

function readUsableEntries(
  entries: readonly MatchStatsEntry[] | undefined
): readonly Readonly<{ deaths: number; kills: number; sessionId: number }>[] {
  if (entries === undefined) {
    return [];
  }

  const usable: Array<Readonly<{ deaths: number; kills: number; sessionId: number }>> = [];
  for (const entry of entries) {
    const sessionId = readPositiveInteger(entry?.sessionId);
    const kills = readNonNegativeInteger(entry?.kills);
    const deaths = readNonNegativeInteger(entry?.deaths);
    if (sessionId === undefined || kills === undefined || deaths === undefined) {
      continue;
    }

    usable.push({ deaths, kills, sessionId });
  }
  return usable;
}

function compareEntriesForReadability(
  left: Readonly<{ deaths: number; kills: number; sessionId: number }>,
  right: Readonly<{ deaths: number; kills: number; sessionId: number }>
): number {
  if (left.kills !== right.kills) {
    return right.kills - left.kills;
  }
  if (left.deaths !== right.deaths) {
    return left.deaths - right.deaths;
  }
  return left.sessionId - right.sessionId;
}

function formatSummary(
  rows: readonly ScoreboardPresentationRow[],
  localSessionId: number | undefined
): string {
  if (rows.length === 0) {
    return EMPTY_SUMMARY;
  }

  const localRow = localSessionId === undefined
    ? undefined
    : rows.find((row) => row.sessionId === localSessionId);
  if (localRow !== undefined) {
    return `session ${localRow.sessionId}: ${localRow.kills} kills / ${localRow.deaths} deaths`;
  }

  return rows.length === 1 ? "1 session" : `${rows.length} sessions`;
}

function readPositiveInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function readNonNegativeInteger(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}
