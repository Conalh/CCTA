import { type MatchStatsEntry, type ServerMatchResultMessage } from "@breachline/shared";

export const DEFAULT_MATCH_KILL_TARGET = 10 as const;

export type MatchProgressConfig = Readonly<{
  killTarget?: number;
}>;

export type MatchProgress = Readonly<{
  readonly killTarget: number;
  isMatchOver(): boolean;
  winnerSessionId(): number;
  // Returns true only on the transition into match-over so the runtime broadcasts once.
  evaluate(entries: readonly MatchStatsEntry[]): boolean;
  reset(): void;
  createResultMessage(serverTick: number): ServerMatchResultMessage;
}>;

export function createMatchProgress(config: MatchProgressConfig = {}): MatchProgress {
  const killTarget = readPositiveUint16(config.killTarget ?? DEFAULT_MATCH_KILL_TARGET, "killTarget");
  let matchOver = false;
  let winnerSessionId = 0;

  function evaluate(entries: readonly MatchStatsEntry[]): boolean {
    if (matchOver) {
      return false;
    }

    // First session to reach the server-owned kill target wins the match. Kills are
    // applied one at a time, so at most one session crosses the threshold per evaluation;
    // the lowest session id is a deterministic tiebreak guard, not a gameplay rule.
    let winner: MatchStatsEntry | undefined;
    for (const entry of entries) {
      if (typeof entry?.sessionId !== "number" || typeof entry?.kills !== "number") {
        continue;
      }
      if (entry.kills >= killTarget) {
        if (winner === undefined || entry.sessionId < winner.sessionId) {
          winner = entry;
        }
      }
    }

    if (winner === undefined) {
      return false;
    }

    matchOver = true;
    winnerSessionId = winner.sessionId;
    return true;
  }

  function reset(): void {
    matchOver = false;
    winnerSessionId = 0;
  }

  function createResultMessage(serverTick: number): ServerMatchResultMessage {
    return {
      kind: "server.match.result",
      serverTick: readUint32(serverTick, "serverTick"),
      matchOver,
      winnerSessionId,
      killTarget
    };
  }

  return {
    killTarget,
    isMatchOver: () => matchOver,
    winnerSessionId: () => winnerSessionId,
    evaluate,
    reset,
    createResultMessage
  };
}

function readUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${field} must be an unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}

function readPositiveUint16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 0xffff) {
    throw new Error(`${field} must be a positive unsigned 16-bit integer, got ${value}.`);
  }
  return value;
}
