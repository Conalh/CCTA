import { type ServerPlayerEconomyMessage } from "@breachline/shared";

// Round economy: every player has server-owned money that accrues from kills and
// round results and is spent in the buy menu (a later phase). Values are balance
// knobs, not copied content. Money is private — sent only to the owning session.
export const DEFAULT_STARTING_MONEY = 800 as const;
export const DEFAULT_KILL_REWARD = 300 as const;
export const DEFAULT_ROUND_WIN_BONUS = 3250 as const;
export const DEFAULT_ROUND_LOSS_BONUS = 1400 as const;
export const DEFAULT_MAX_MONEY = 16_000 as const;

export type EconomyConfig = Readonly<{
  startingMoney?: number;
  killReward?: number;
  roundWinBonus?: number;
  roundLossBonus?: number;
  maxMoney?: number;
}>;

export type EconomyEntry = Readonly<{
  sessionId: number;
  money: number;
}>;

export type EconomyRoundResult = Readonly<{
  winners: readonly number[];
  losers: readonly number[];
}>;

// Admin-tunable economy knobs. Starting money applies on the next round reset; rewards and
// bonuses apply to the next kill / round result.
export type EconomyReconfigureInput = Readonly<{
  startingMoney?: number;
  killReward?: number;
  roundWinBonus?: number;
  roundLossBonus?: number;
}>;

export type EconomyState = Readonly<{
  readonly startingMoney: number;
  reconfigure(input: EconomyReconfigureInput): void;
  getStartingMoney(): number;
  getKillReward(): number;
  getRoundWinBonus(): number;
  getRoundLossBonus(): number;
  assignSession(sessionId: number): void;
  removeSession(sessionId: number): void;
  awardKill(sessionId: number): boolean;
  awardRoundResult(result: EconomyRoundResult): readonly number[];
  spend(sessionId: number, amount: number): boolean;
  getMoney(sessionId: number): number | undefined;
  resetAll(): readonly number[];
  createStateMessage(sessionId: number, serverTick: number): ServerPlayerEconomyMessage | undefined;
  entries(): readonly EconomyEntry[];
}>;

export function createEconomyState(config: EconomyConfig = {}): EconomyState {
  let startingMoney = readNonNegativeInteger(config.startingMoney, DEFAULT_STARTING_MONEY);
  let killReward = readNonNegativeInteger(config.killReward, DEFAULT_KILL_REWARD);
  let roundWinBonus = readNonNegativeInteger(config.roundWinBonus, DEFAULT_ROUND_WIN_BONUS);
  let roundLossBonus = readNonNegativeInteger(config.roundLossBonus, DEFAULT_ROUND_LOSS_BONUS);
  const maxMoney = readPositiveInteger(config.maxMoney, DEFAULT_MAX_MONEY);

  function reconfigure(input: EconomyReconfigureInput): void {
    if (input.startingMoney !== undefined) {
      startingMoney = readNonNegativeInteger(input.startingMoney, startingMoney);
    }
    if (input.killReward !== undefined) {
      killReward = readNonNegativeInteger(input.killReward, killReward);
    }
    if (input.roundWinBonus !== undefined) {
      roundWinBonus = readNonNegativeInteger(input.roundWinBonus, roundWinBonus);
    }
    if (input.roundLossBonus !== undefined) {
      roundLossBonus = readNonNegativeInteger(input.roundLossBonus, roundLossBonus);
    }
  }

  const money = new Map<number, number>();

  function clampMoney(value: number): number {
    return Math.min(maxMoney, Math.max(0, Math.trunc(value)));
  }

  function assignSession(sessionId: number): void {
    const id = readPositiveSessionId(sessionId);
    if (id === undefined || money.has(id)) {
      return;
    }
    money.set(id, clampMoney(startingMoney));
  }

  function removeSession(sessionId: number): void {
    money.delete(readPositiveSessionId(sessionId) ?? 0);
  }

  function awardKill(sessionId: number): boolean {
    const id = readPositiveSessionId(sessionId);
    if (id === undefined || !money.has(id)) {
      return false;
    }
    money.set(id, clampMoney((money.get(id) ?? 0) + killReward));
    return true;
  }

  function award(sessionIds: readonly number[], amount: number, changed: Set<number>): void {
    for (const sessionId of sessionIds) {
      const id = readPositiveSessionId(sessionId);
      if (id === undefined || !money.has(id)) {
        continue;
      }
      money.set(id, clampMoney((money.get(id) ?? 0) + amount));
      changed.add(id);
    }
  }

  function awardRoundResult(result: EconomyRoundResult): readonly number[] {
    const changed = new Set<number>();
    award(result.winners, roundWinBonus, changed);
    award(result.losers, roundLossBonus, changed);
    return [...changed];
  }

  function spend(sessionId: number, amount: number): boolean {
    const id = readPositiveSessionId(sessionId);
    const cost = Math.trunc(amount);
    if (id === undefined || !money.has(id) || !Number.isFinite(cost) || cost < 0) {
      return false;
    }
    const balance = money.get(id) ?? 0;
    if (cost > balance) {
      return false;
    }
    money.set(id, balance - cost);
    return true;
  }

  function getMoney(sessionId: number): number | undefined {
    return money.get(readPositiveSessionId(sessionId) ?? 0);
  }

  function resetAll(): readonly number[] {
    const changed: number[] = [];
    for (const id of money.keys()) {
      money.set(id, clampMoney(startingMoney));
      changed.push(id);
    }
    return changed;
  }

  function createStateMessage(sessionId: number, serverTick: number): ServerPlayerEconomyMessage | undefined {
    const id = readPositiveSessionId(sessionId);
    if (id === undefined || !money.has(id)) {
      return undefined;
    }
    return {
      kind: "server.player.economy",
      serverTick: readUint32(serverTick, "serverTick"),
      sessionId: id,
      money: money.get(id) ?? 0
    };
  }

  function entries(): readonly EconomyEntry[] {
    return [...money.entries()].map(([sessionId, value]) => ({ sessionId, money: value }));
  }

  return {
    // Live value: reflects admin reconfigure, not just the construction-time setting.
    get startingMoney() {
      return startingMoney;
    },
    reconfigure,
    getStartingMoney: () => startingMoney,
    getKillReward: () => killReward,
    getRoundWinBonus: () => roundWinBonus,
    getRoundLossBonus: () => roundLossBonus,
    assignSession,
    removeSession,
    awardKill,
    awardRoundResult,
    spend,
    getMoney,
    resetAll,
    createStateMessage,
    entries
  };
}

function readPositiveSessionId(value: number): number | undefined {
  return Number.isInteger(value) && value > 0 && value <= 0xffffffff ? value : undefined;
}

function readNonNegativeInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
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
