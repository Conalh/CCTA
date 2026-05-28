import { createServerTick, type ServerClock } from "./runtime.js";
import type { ServerTickMessage } from "@breachline/shared";

export type FixedTickLoopConfig = Readonly<{
  tickRateHz: number;
  now?: ServerClock;
}>;

export type FixedTickLoop = Readonly<{
  start(onTick: (message: ServerTickMessage) => void): void;
  stop(): void;
  isRunning(): boolean;
}>;

type TickInterval = ReturnType<typeof setInterval>;

export function createFixedTickLoop(config: FixedTickLoopConfig): FixedTickLoop {
  const now = config.now ?? Date.now;
  const intervalMs = 1000 / config.tickRateHz;
  let currentTick = 0;
  let interval: TickInterval | undefined;

  function start(onTick: (message: ReturnType<typeof createServerTick>) => void): void {
    if (interval !== undefined) {
      return;
    }

    interval = setInterval(() => {
      currentTick += 1;
      onTick(createServerTick(currentTick, now()));
    }, intervalMs);
  }

  function stop(): void {
    if (interval !== undefined) {
      clearInterval(interval);
      interval = undefined;
    }
  }

  function isRunning(): boolean {
    return interval !== undefined;
  }

  return {
    start,
    stop,
    isRunning
  };
}
