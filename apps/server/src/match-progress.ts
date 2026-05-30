import { TEAM, type ServerMatchResultMessage, type TeamId } from "@breachline/shared";

// `killTarget` is kept as the wire/config field name (the protocol message field is
// unchanged) but now counts ROUND WINS: the first side to win this many rounds wins
// the match.
export const DEFAULT_MATCH_KILL_TARGET = 4 as const;

export type MatchProgressConfig = Readonly<{
  killTarget?: number;
}>;

export type MatchRoundResult = Readonly<{
  winnerTeam: TeamId | undefined;
  // A representative session on the winning side, carried through the result message.
  winnerSessionId: number;
}>;

export type MatchProgress = Readonly<{
  readonly killTarget: number;
  isMatchOver(): boolean;
  winnerSessionId(): number;
  roundWins(team: TeamId): number;
  // Record a finished round's winning side. Returns true only on the transition into
  // match-over so the runtime broadcasts the result once.
  recordRoundResult(result: MatchRoundResult): boolean;
  reset(): void;
  createResultMessage(serverTick: number): ServerMatchResultMessage;
}>;

export function createMatchProgress(config: MatchProgressConfig = {}): MatchProgress {
  const killTarget = readPositiveUint16(config.killTarget ?? DEFAULT_MATCH_KILL_TARGET, "killTarget");
  let matchOver = false;
  let winnerSessionId = 0;
  const wins = new Map<TeamId, number>([
    [TEAM.cops, 0],
    [TEAM.robbers, 0]
  ]);

  function recordRoundResult(result: MatchRoundResult): boolean {
    if (matchOver || result.winnerTeam === undefined) {
      return false;
    }

    const nextWins = (wins.get(result.winnerTeam) ?? 0) + 1;
    wins.set(result.winnerTeam, nextWins);
    if (nextWins < killTarget) {
      return false;
    }

    matchOver = true;
    winnerSessionId = readUint32(result.winnerSessionId, "winnerSessionId");
    return true;
  }

  function reset(): void {
    matchOver = false;
    winnerSessionId = 0;
    wins.set(TEAM.cops, 0);
    wins.set(TEAM.robbers, 0);
  }

  function createResultMessage(serverTick: number): ServerMatchResultMessage {
    return {
      kind: "server.match.result",
      serverTick: readUint32(serverTick, "serverTick"),
      matchOver,
      winnerSessionId,
      killTarget,
      copsRoundWins: wins.get(TEAM.cops) ?? 0,
      robbersRoundWins: wins.get(TEAM.robbers) ?? 0
    };
  }

  return {
    killTarget,
    isMatchOver: () => matchOver,
    winnerSessionId: () => winnerSessionId,
    roundWins: (team) => wins.get(team) ?? 0,
    recordRoundResult,
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
