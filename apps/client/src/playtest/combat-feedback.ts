import type { MatchStatsEntry } from "@breachline/shared";

// Combat feedback derived purely from server-owned signals: the broadcast match-stats
// tallies (for a global kill feed) and the local player's own damage events (for a
// directional hit indicator). The client never invents kills or damage — it only reads
// and presents what the server already published.

export type KillFeedEvent = Readonly<{
  killerSessionId: number | undefined;
  victimSessionId: number;
}>;

// Each match-stats broadcast carries exactly one confirmed kill, so the delta between two
// consecutive tallies names that kill: the session whose kills rose is the killer, the
// session whose deaths rose is the victim. An uncredited death (no killer delta) is left
// without a killer (self-inflicted / untracked).
export function diffMatchStatsKills(
  previous: readonly MatchStatsEntry[],
  next: readonly MatchStatsEntry[]
): readonly KillFeedEvent[] {
  const before = new Map(previous.map((entry) => [entry.sessionId, entry]));
  const killers: number[] = [];
  const victims: number[] = [];
  for (const entry of next) {
    const prior = before.get(entry.sessionId);
    if (entry.kills - (prior?.kills ?? 0) > 0) {
      killers.push(entry.sessionId);
    }
    if (entry.deaths - (prior?.deaths ?? 0) > 0) {
      victims.push(entry.sessionId);
    }
  }
  return victims.map((victimSessionId, index) => ({
    killerSessionId: killers[index],
    victimSessionId
  }));
}

export function formatKillFeedLine(
  event: KillFeedEvent,
  resolveCallsign: (sessionId: number) => string
): string {
  const victim = resolveCallsign(event.victimSessionId);
  if (event.killerSessionId === undefined) {
    return `${victim} was eliminated`;
  }
  return `${resolveCallsign(event.killerSessionId)} eliminated ${victim}`;
}

export type DamageIndicatorInput = Readonly<{
  localX: number;
  localZ: number;
  localYaw: number;
  sourceX: number;
  sourceZ: number;
}>;

// Screen bearing from the local player's facing to the damage source, in radians: 0 means
// the source is straight ahead, +clockwise toward screen-right, ±pi behind. Matches the
// playtest camera convention (camera.rotation.y = yaw, forward = -z), so a wedge rotated by
// this angle points at where the shot came from.
export function damageIndicatorAngleRadians(input: DamageIndicatorInput): number {
  const dx = input.sourceX - input.localX;
  const dz = input.sourceZ - input.localZ;
  const sinY = Math.sin(input.localYaw);
  const cosY = Math.cos(input.localYaw);
  const forwardComponent = dx * -sinY + dz * -cosY;
  const rightComponent = dx * cosY + dz * -sinY;
  return Math.atan2(rightComponent, forwardComponent);
}
