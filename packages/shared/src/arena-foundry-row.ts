import type { ArenaMapMetadata } from "./map-metadata.js";

// Foundry Row is an original, asymmetric "defuse" arena in the close-quarters industrial
// archetype. Its centrepiece is a fully enclosed foundry building (the "inside"): a walled
// hall holding the charge site, surrounded on every side by exterior space (the "outside") —
// a south yard, two flank lanes, and a north strip. The Cops (defenders) hold the interior;
// the Robbers (attackers) push from the south yard and can breach the building four ways:
//   * the main door  (south wall, centre)  — the contested frontal push from the yard
//   * the west gate   (west wall)           — a flank reached up the west lane
//   * the east door   (east wall)           — the mirrored flank up the east lane
//   * two north doors (north wall)          — a long flank / the defenders' back access
// Walls are open-topped because arena collision is the box's 2-D footprint only (height is
// visual): an "enclosed" room is a ring of walls with door gaps, never a walk-under roof.
// All geometry, names, and labels are original. The charge site stays at the shared plant
// location (0, -11) so the objective works unchanged, and that point is collision-clear.
export const FOUNDRY_ROW_ARENA: ArenaMapMetadata = {
  id: "arena-foundry-row",
  displayName: "Foundry Row",
  revision: 2,
  worldBounds: {
    min: [-20, -0.25, -20],
    max: [20, 4, 20]
  },
  primitives: [
    {
      id: "floor-plate",
      kind: "floor",
      label: "Floor plate",
      position: [0, -0.1, 0],
      size: [39, 0.2, 39]
    },
    // Outer retaining walls (the world edge).
    { id: "north-wall", kind: "wall", label: "North wall", position: [0, 1.5, -19.65], size: [39, 3, 0.3] },
    { id: "south-wall", kind: "wall", label: "South wall", position: [0, 1.5, 19.65], size: [39, 3, 0.3] },
    { id: "west-wall", kind: "wall", label: "West wall", position: [-19.65, 1.5, 0], size: [0.3, 3, 39] },
    { id: "east-wall", kind: "wall", label: "East wall", position: [19.65, 1.5, 0], size: [0.3, 3, 39] },
    // The foundry building (defender interior), x in [-8.5, 8.5], z in [-16.5, -7].
    // North wall: two defender/flank doors (gaps at x in [-5,-2] and [2,5]).
    { id: "bldg-north-west", kind: "wall", label: "Foundry north wall (west)", position: [-6.75, 1.5, -16.5], size: [3.5, 3, 0.4] },
    { id: "bldg-north-mid", kind: "wall", label: "Foundry north wall (mid)", position: [0, 1.5, -16.5], size: [4, 3, 0.4] },
    { id: "bldg-north-east", kind: "wall", label: "Foundry north wall (east)", position: [6.75, 1.5, -16.5], size: [3.5, 3, 0.4] },
    // South/front wall: the main door (gap at x in [-2, 2]).
    { id: "bldg-front-west", kind: "wall", label: "Foundry front (west of door)", position: [-5.25, 1.5, -7], size: [6.5, 3, 0.4] },
    { id: "bldg-front-east", kind: "wall", label: "Foundry front (east of door)", position: [5.25, 1.5, -7], size: [6.5, 3, 0.4] },
    // West wall: the side gate (gap at z in [-12, -9]).
    { id: "bldg-west-back", kind: "wall", label: "Foundry west wall (back)", position: [-8.5, 1.5, -14.25], size: [0.4, 3, 4.5] },
    { id: "bldg-west-front", kind: "wall", label: "Foundry west wall (front)", position: [-8.5, 1.5, -8], size: [0.4, 3, 2] },
    // East wall: the mirrored side door (gap at z in [-12, -9]).
    { id: "bldg-east-back", kind: "wall", label: "Foundry east wall (back)", position: [8.5, 1.5, -14.25], size: [0.4, 3, 4.5] },
    { id: "bldg-east-front", kind: "wall", label: "Foundry east wall (front)", position: [8.5, 1.5, -8], size: [0.4, 3, 2] },
    // Interior cover, arranged around the charge site without touching its centre.
    { id: "site-crate-west", kind: "cover", label: "Site crate (port)", position: [-3.6, 0.6, -11], size: [1.4, 1.2, 1.4] },
    { id: "site-crate-east", kind: "cover", label: "Site crate (starboard)", position: [3.6, 0.6, -11], size: [1.4, 1.2, 1.4] },
    { id: "hall-pillar", kind: "cover", label: "Hall pillar", position: [-5, 0.85, -12.5], size: [1.4, 1.7, 1.4] },
    { id: "machine-bench", kind: "cover", label: "Machine bench", position: [3, 0.7, -8.5], size: [3, 1.4, 0.6] },
    { id: "tool-rack", kind: "cover", label: "Tool rack", position: [6, 0.8, -13], size: [1.6, 1.6, 1.6] },
    // The south yard (attacker approach): a long central skip splits the lane, with flank cover.
    { id: "yard-skip", kind: "cover", label: "Yard skip", position: [0, 1, 3], size: [3.5, 2, 6] },
    { id: "yard-crate-west", kind: "cover", label: "Yard crate (port)", position: [-9, 0.6, -3], size: [1.6, 1.2, 1.6] },
    { id: "yard-crate-east", kind: "cover", label: "Yard crate (starboard)", position: [9, 0.6, -3], size: [1.6, 1.2, 1.6] },
    { id: "yard-stack-west", kind: "cover", label: "Yard stack (port)", position: [-12, 1, 7], size: [2.4, 2, 2.4] },
    { id: "yard-stack-east", kind: "cover", label: "Yard stack (starboard)", position: [12, 1, 7], size: [2.4, 2, 2.4] },
    // Lane cover guarding the run-in to each flank door.
    { id: "west-gate-cover", kind: "cover", label: "West gate cover", position: [-13, 0.8, -2], size: [2, 1.6, 2] },
    { id: "east-gate-cover", kind: "cover", label: "East gate cover", position: [13, 0.8, -2], size: [2, 1.6, 2] }
  ],
  playerScaleReferences: [
    { id: "scale-post-west", label: "Scale post west", position: [-14, 1, -3], radiusMeters: 0.1, heightMeters: 2 },
    { id: "scale-post-east", label: "Scale post east", position: [14, 1, -3], radiusMeters: 0.1, heightMeters: 2 }
  ],
  spawnMarkers: [
    // Cops (defenders) start inside the foundry, behind the charge site.
    { id: "spawn-cops-1", label: "Cops spawn 1", role: "neutral", position: [-6, 0, -15], yaw: 0 },
    { id: "spawn-cops-2", label: "Cops spawn 2", role: "neutral", position: [-2, 0, -15], yaw: 0 },
    { id: "spawn-cops-3", label: "Cops spawn 3", role: "neutral", position: [2, 0, -15], yaw: 0 },
    { id: "spawn-cops-4", label: "Cops spawn 4", role: "neutral", position: [6, 0, -15], yaw: 0 },
    // Robbers (attackers) start in the open south yard.
    { id: "spawn-robbers-1", label: "Robbers spawn 1", role: "neutral", position: [-12, 0, 16.5], yaw: 3.141592653589793 },
    { id: "spawn-robbers-2", label: "Robbers spawn 2", role: "neutral", position: [-4, 0, 16.5], yaw: 3.141592653589793 },
    { id: "spawn-robbers-3", label: "Robbers spawn 3", role: "neutral", position: [4, 0, 16.5], yaw: 3.141592653589793 },
    { id: "spawn-robbers-4", label: "Robbers spawn 4", role: "neutral", position: [12, 0, 16.5], yaw: 3.141592653589793 }
  ],
  labels: [
    { id: "label-foundry", text: "Foundry", position: [0, 2, -11.5] },
    { id: "label-yard", text: "South yard", position: [0, 2, 9] },
    { id: "label-west-lane", text: "West lane", position: [-14, 2, -11] },
    { id: "label-east-lane", text: "East lane", position: [14, 2, -11] }
  ],
  // Slot starts mirror the spawn markers, ordered slot 0..7 (lower half Cops, upper Robbers).
  slotStarts: [
    { position: [-6, 0, -15], yaw: 0 },
    { position: [-2, 0, -15], yaw: 0 },
    { position: [2, 0, -15], yaw: 0 },
    { position: [6, 0, -15], yaw: 0 },
    { position: [-12, 0, 16.5], yaw: 3.141592653589793 },
    { position: [-4, 0, 16.5], yaw: 3.141592653589793 },
    { position: [4, 0, 16.5], yaw: 3.141592653589793 },
    { position: [12, 0, 16.5], yaw: 3.141592653589793 }
  ]
};
