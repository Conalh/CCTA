// Server-side admin console: the host operator types commands into the terminal running
// the match. There is no networked rcon and no password — the person at the server is the
// admin. This module is the pure parser; applying a parsed command is the runtime's job.
//
// Accepted forms are lenient: "buytime 15", "set buytime 15", and "buytime_15" all parse to
// the same command (the underscore form mirrors the compact "matchreset_3" style). Command
// names are original, not copied cvars.
export type AdminCommand =
  | { kind: "help" }
  | { kind: "status" }
  | { kind: "buytime"; seconds: number }
  | { kind: "roundtime"; seconds: number }
  | { kind: "maxrounds"; value: number }
  | { kind: "startmoney"; value: number }
  | { kind: "killreward"; value: number }
  | { kind: "roundwin"; value: number }
  | { kind: "roundloss"; value: number }
  | { kind: "friendlyfire"; enabled: boolean }
  | { kind: "roundreset" }
  | { kind: "matchreset"; delaySeconds: number }
  | { kind: "grant"; slot: number }
  | { kind: "revoke"; slot: number }
  | { kind: "who" }
  | { kind: "unknown"; message: string };

// Commands only the host operator (server terminal) may run, never an in-game admin.
export const TERMINAL_ONLY_ADMIN_COMMANDS = new Set(["grant", "revoke", "who"]);

export const ADMIN_HELP_TEXT = [
  "Admin console commands (apply on the next round unless noted):",
  "  buytime <sec>        buy/freeze time at round start",
  "  roundtime <sec>      length of the active round",
  "  maxrounds <n>        round wins needed to take the match",
  "  startmoney <n>       cash each player starts a round with",
  "  killreward <n>       cash for a kill",
  "  roundwin <n>         round-win bonus",
  "  roundloss <n>        round-loss bonus",
  "  friendlyfire on|off  whether teammates can damage each other",
  "  roundreset           restart the current round now (no score)",
  "  matchreset [sec]     reset scores/economy and restart (optionally after sec)",
  "  status               print the current settings",
  "  help                 show this list",
  "Host terminal only:",
  "  who                  list connected players and their slots",
  "  grant <slot>         let the player in that slot use the in-game console",
  "  revoke <slot>        remove that player's admin access",
  "Forms 'buytime 15', 'set buytime 15', and 'buytime_15' are all accepted."
].join("\n");

export function parseAdminCommand(line: string): AdminCommand {
  const tokens = line.trim().toLowerCase().split(/[\s_]+/).filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return { kind: "unknown", message: "Empty command. Type 'help' for the list." };
  }

  let name = tokens[0];
  let args = tokens.slice(1);
  if (name === "set" && args.length > 0) {
    name = args[0];
    args = args.slice(1);
  }

  switch (name) {
    case "help":
    case "?":
      return { kind: "help" };
    case "status":
      return { kind: "status" };
    case "buytime":
      return secondsCommand(name, args, (seconds) => ({ kind: "buytime", seconds }), { allowZero: true });
    case "roundtime":
      return secondsCommand(name, args, (seconds) => ({ kind: "roundtime", seconds }), { allowZero: false });
    case "maxrounds":
      return countCommand(name, args, (value) => ({ kind: "maxrounds", value }), { min: 1 });
    case "startmoney":
      return countCommand(name, args, (value) => ({ kind: "startmoney", value }), { min: 0 });
    case "killreward":
      return countCommand(name, args, (value) => ({ kind: "killreward", value }), { min: 0 });
    case "roundwin":
      return countCommand(name, args, (value) => ({ kind: "roundwin", value }), { min: 0 });
    case "roundloss":
      return countCommand(name, args, (value) => ({ kind: "roundloss", value }), { min: 0 });
    case "friendlyfire":
      return friendlyFireCommand(args);
    case "roundreset":
      return { kind: "roundreset" };
    case "matchreset":
      return matchResetCommand(args);
    case "who":
    case "players":
      return { kind: "who" };
    case "grant":
      return countCommand(name, args, (slot) => ({ kind: "grant", slot }), { min: 0 });
    case "revoke":
      return countCommand(name, args, (slot) => ({ kind: "revoke", slot }), { min: 0 });
    default:
      return { kind: "unknown", message: `Unknown command '${name}'. Type 'help' for the list.` };
  }
}

function secondsCommand(
  name: string,
  args: readonly string[],
  build: (seconds: number) => AdminCommand,
  options: { allowZero: boolean }
): AdminCommand {
  const value = readNumber(args[0]);
  if (value === undefined || value < 0 || (!options.allowZero && value <= 0)) {
    return { kind: "unknown", message: `${name} needs a${options.allowZero ? " non-negative" : " positive"} number of seconds.` };
  }
  return build(value);
}

function countCommand(
  name: string,
  args: readonly string[],
  build: (value: number) => AdminCommand,
  options: { min: number }
): AdminCommand {
  const value = readNumber(args[0]);
  if (value === undefined || !Number.isInteger(value) || value < options.min) {
    return { kind: "unknown", message: `${name} needs a whole number >= ${options.min}.` };
  }
  return build(value);
}

function friendlyFireCommand(args: readonly string[]): AdminCommand {
  const token = args[0];
  if (token === "on" || token === "1" || token === "true") {
    return { kind: "friendlyfire", enabled: true };
  }
  if (token === "off" || token === "0" || token === "false") {
    return { kind: "friendlyfire", enabled: false };
  }
  return { kind: "unknown", message: "friendlyfire needs 'on' or 'off'." };
}

function matchResetCommand(args: readonly string[]): AdminCommand {
  if (args.length === 0) {
    return { kind: "matchreset", delaySeconds: 0 };
  }
  const value = readNumber(args[0]);
  if (value === undefined || value < 0) {
    return { kind: "unknown", message: "matchreset takes an optional non-negative delay in seconds." };
  }
  return { kind: "matchreset", delaySeconds: value };
}

function readNumber(token: string | undefined): number | undefined {
  if (token === undefined) {
    return undefined;
  }
  const value = Number(token);
  return Number.isFinite(value) ? value : undefined;
}
