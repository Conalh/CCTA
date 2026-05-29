import { type MatchStatsEntry, type ServerMatchStatsMessage } from "@breachline/shared";

export type RecordKillInput = Readonly<{
  killerSessionId: number;
  victimSessionId: number;
}>;

export type MatchStats = Readonly<{
  assignSession(sessionId: number): MatchStatsEntry;
  removeSession(sessionId: number): MatchStatsEntry | undefined;
  recordKill(input: RecordKillInput): void;
  getEntry(sessionId: number): MatchStatsEntry | undefined;
  entries(): readonly MatchStatsEntry[];
  createStateMessage(serverTick: number): ServerMatchStatsMessage;
}>;

type MutableMatchStatsEntry = {
  sessionId: number;
  kills: number;
  deaths: number;
};

export function createMatchStats(): MatchStats {
  const sessions = new Map<number, MutableMatchStatsEntry>();

  function assignSession(sessionIdValue: number): MatchStatsEntry {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const existing = sessions.get(sessionId);
    if (existing !== undefined) {
      return toReadonlyEntry(existing);
    }
    const entry: MutableMatchStatsEntry = { sessionId, kills: 0, deaths: 0 };
    sessions.set(sessionId, entry);
    return toReadonlyEntry(entry);
  }

  function removeSession(sessionIdValue: number): MatchStatsEntry | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const entry = sessions.get(sessionId);
    if (entry === undefined) {
      return undefined;
    }
    sessions.delete(sessionId);
    return toReadonlyEntry(entry);
  }

  function recordKill(input: RecordKillInput): void {
    const victimSessionId = readPositiveUint32(input.victimSessionId, "victimSessionId");
    const killerSessionId = readUint32(input.killerSessionId, "killerSessionId");
    const victim = sessions.get(victimSessionId);
    if (victim === undefined) {
      return;
    }
    victim.deaths += 1;
    if (killerSessionId !== victimSessionId) {
      const killer = sessions.get(killerSessionId);
      if (killer !== undefined) {
        killer.kills += 1;
      }
    }
  }

  function getEntry(sessionIdValue: number): MatchStatsEntry | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const entry = sessions.get(sessionId);
    return entry === undefined ? undefined : toReadonlyEntry(entry);
  }

  function entries(): readonly MatchStatsEntry[] {
    return Array.from(sessions.values(), toReadonlyEntry);
  }

  function createStateMessage(serverTick: number): ServerMatchStatsMessage {
    const entryList = entries();
    return {
      kind: "server.match.stats",
      serverTick: readUint32(serverTick, "serverTick"),
      entryCount: entryList.length,
      entries: entryList
    };
  }

  return {
    assignSession,
    removeSession,
    recordKill,
    getEntry,
    entries,
    createStateMessage
  };
}

function toReadonlyEntry(entry: MutableMatchStatsEntry): MatchStatsEntry {
  return {
    sessionId: entry.sessionId,
    kills: entry.kills,
    deaths: entry.deaths
  };
}

function readUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${field} must be an unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}

function readPositiveUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 0xffffffff) {
    throw new Error(`${field} must be a positive unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}
