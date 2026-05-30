// Thrown grenade tuning + a pure physics step, shared so the server simulates it and tests
// reason about it identically. The server is the sole authority over live grenades; these
// are the fixed rules. Balance knobs, not copied content.
export const GRENADE_PRICE = 300 as const;
export const GRENADE_MAX_COUNT = 1 as const;
export const GRENADE_FUSE_TICKS = 120 as const; // 2.0 s at 60 Hz
export const GRENADE_THROW_SPEED = 15 as const; // m/s along the aim direction
export const GRENADE_GRAVITY = 20 as const; // m/s^2 downward
export const GRENADE_RADIUS_METERS = 0.12 as const; // visual size
export const GRENADE_BLAST_RADIUS_METERS = 5 as const;
export const GRENADE_MAX_DAMAGE = 90 as const; // at the centre, falling off to 0 at the edge
export const GRENADE_FLOOR_Y = 0 as const;

export type GrenadeVector = Readonly<{ x: number; y: number; z: number }>;

export type GrenadeMotion = Readonly<{
  position: GrenadeVector;
  velocity: GrenadeVector;
}>;

export type GrenadeBounds = Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>;

// Aim direction (unit-ish) from yaw/pitch in the playtest camera convention (yaw 0, pitch 0
// faces -z; +pitch looks up). Used to launch the throw.
export function grenadeThrowDirection(yaw: number, pitch: number): GrenadeVector {
  const cosPitch = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cosPitch,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cosPitch
  };
}

// One fixed-step integration of a grenade: gravity, then position, clamped to the floor (it
// comes to rest on the ground) and the arena bounds (it does not leave the map).
export function advanceGrenadeMotion(
  motion: GrenadeMotion,
  deltaSeconds: number,
  bounds: GrenadeBounds,
  gravity: number = GRENADE_GRAVITY
): GrenadeMotion {
  let vx = motion.velocity.x;
  let vy = motion.velocity.y - gravity * deltaSeconds;
  let vz = motion.velocity.z;

  let x = motion.position.x + vx * deltaSeconds;
  let y = motion.position.y + vy * deltaSeconds;
  let z = motion.position.z + vz * deltaSeconds;

  if (y <= GRENADE_FLOOR_Y) {
    // Land and rest on the floor (no bounce in this first cut).
    y = GRENADE_FLOOR_Y;
    vx = 0;
    vy = 0;
    vz = 0;
  }
  if (x < bounds.minX) {
    x = bounds.minX;
    vx = 0;
  } else if (x > bounds.maxX) {
    x = bounds.maxX;
    vx = 0;
  }
  if (z < bounds.minZ) {
    z = bounds.minZ;
    vz = 0;
  } else if (z > bounds.maxZ) {
    z = bounds.maxZ;
    vz = 0;
  }

  return { position: { x, y, z }, velocity: { x: vx, y: vy, z: vz } };
}

// Blast damage to a target at a given distance from the detonation: full at the centre,
// linearly down to zero at the blast radius, never negative.
export function grenadeBlastDamage(
  distanceMeters: number,
  blastRadius: number = GRENADE_BLAST_RADIUS_METERS,
  maxDamage: number = GRENADE_MAX_DAMAGE
): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters >= blastRadius || blastRadius <= 0) {
    return 0;
  }
  const falloff = 1 - distanceMeters / blastRadius;
  return Math.max(0, Math.round(maxDamage * falloff));
}
