// Breach-charge objective geometry and timing, shared by server and client so both
// agree on where the charge is planted and how long each step takes. The server is
// still the sole authority over the charge's state; these are only the fixed rules.

// A single circular plant site sitting in the Cops' (defenders') half of Drydock Span,
// clear of cover. Robbers (attackers) push north from their spawn to arm the charge here.
export const PLANT_SITE = {
  x: 0,
  z: -11,
  radius: 3
} as const;

// All durations are in server ticks (60 Hz). Plant is a held action; defuse is longer;
// once armed, the charge detonates after the delay unless defused first.
export const PLANT_DURATION_TICKS = 180; // 3.0 s
export const DEFUSE_DURATION_TICKS = 300; // 5.0 s
export const DETONATION_DELAY_TICKS = 2100; // 35.0 s

export type PlantSite = typeof PLANT_SITE;

// Whether a ground position lies inside the plant site footprint (XZ plane only).
export function isWithinPlantSite(x: number, z: number, site: PlantSite = PLANT_SITE): boolean {
  const dx = x - site.x;
  const dz = z - site.z;
  return dx * dx + dz * dz <= site.radius * site.radius;
}
