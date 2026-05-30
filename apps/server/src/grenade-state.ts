import {
  GRENADE_FUSE_TICKS,
  GRENADE_GRAVITY,
  GRENADE_THROW_SPEED,
  advanceGrenadeMotion,
  grenadeThrowDirection,
  type GrenadeBounds,
  type GrenadeMotion,
  type GrenadeStateEntry
} from "@breachline/shared";

// Server-authoritative live grenades: each ticks down a fuse while arcing under gravity,
// then detonates wherever it ends up. The runtime applies the blast and broadcasts state.
export type GrenadeThrowInput = Readonly<{
  ownerSessionId: number;
  origin: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
}>;

export type GrenadeDetonation = Readonly<{
  id: number;
  ownerSessionId: number;
  x: number;
  y: number;
  z: number;
}>;

export type GrenadeAdvanceResult = Readonly<{
  // Every live grenade this tick, including the ones detonating now (detonated: true).
  entries: readonly GrenadeStateEntry[];
  detonations: readonly GrenadeDetonation[];
}>;

export type GrenadeStateConfig = Readonly<{
  bounds: GrenadeBounds;
  tickRateHz: number;
  fuseTicks?: number;
  throwSpeed?: number;
  gravity?: number;
}>;

export type GrenadeState = Readonly<{
  throwGrenade(input: GrenadeThrowInput): number;
  advance(): GrenadeAdvanceResult;
  reset(): void;
  activeCount(): number;
}>;

type LiveGrenade = {
  id: number;
  ownerSessionId: number;
  motion: GrenadeMotion;
  fuseTicks: number;
};

export function createGrenadeState(config: GrenadeStateConfig): GrenadeState {
  const bounds = config.bounds;
  const deltaSeconds = 1 / config.tickRateHz;
  const fuseTicks = config.fuseTicks ?? GRENADE_FUSE_TICKS;
  const throwSpeed = config.throwSpeed ?? GRENADE_THROW_SPEED;
  const gravity = config.gravity ?? GRENADE_GRAVITY;
  const grenades: LiveGrenade[] = [];
  let nextId = 1;

  function throwGrenade(input: GrenadeThrowInput): number {
    const direction = grenadeThrowDirection(input.yaw, input.pitch);
    const id = nextId;
    nextId = nextId >= 0xffff ? 1 : nextId + 1;
    grenades.push({
      id,
      ownerSessionId: input.ownerSessionId,
      motion: {
        position: { x: input.origin.x, y: input.origin.y, z: input.origin.z },
        velocity: {
          x: direction.x * throwSpeed,
          y: direction.y * throwSpeed,
          z: direction.z * throwSpeed
        }
      },
      fuseTicks
    });
    return id;
  }

  function advance(): GrenadeAdvanceResult {
    const entries: GrenadeStateEntry[] = [];
    const detonations: GrenadeDetonation[] = [];
    const survivors: LiveGrenade[] = [];
    for (const grenade of grenades) {
      grenade.motion = advanceGrenadeMotion(grenade.motion, deltaSeconds, bounds, gravity);
      grenade.fuseTicks -= 1;
      const { x, y, z } = grenade.motion.position;
      if (grenade.fuseTicks <= 0) {
        detonations.push({ id: grenade.id, ownerSessionId: grenade.ownerSessionId, x, y, z });
        entries.push({ id: grenade.id, x, y, z, fuseTicks: 0, detonated: true });
      } else {
        survivors.push(grenade);
        entries.push({ id: grenade.id, x, y, z, fuseTicks: grenade.fuseTicks, detonated: false });
      }
    }
    grenades.length = 0;
    grenades.push(...survivors);
    return { entries, detonations };
  }

  function reset(): void {
    grenades.length = 0;
  }

  function activeCount(): number {
    return grenades.length;
  }

  return { throwGrenade, advance, reset, activeCount };
}
