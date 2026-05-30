import type { ArenaMapMetadata } from "./map-metadata.js";

// Foundry Row is an original, asymmetric "defuse" arena in the close-quarters industrial
// archetype: the Cops (defenders, north) hold a roofless foundry hall with the charge site
// in its centre, and the Robbers (attackers, south) push up an open yard and breach through
// a main front door or a west side gate. All geometry, names, and labels are original — no
// copied shooter map name or layout. The charge site sits at the shared plant location
// (0, -11) so the existing objective works unchanged; it is collision-clear by construction.
export const FOUNDRY_ROW_ARENA: ArenaMapMetadata = {
  id: "arena-foundry-row",
  displayName: "Foundry Row",
  revision: 1,
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
    // Outer retaining walls.
    { id: "north-wall", kind: "wall", label: "North wall", position: [0, 1.5, -19.65], size: [39, 3, 0.3] },
    { id: "south-wall", kind: "wall", label: "South wall", position: [0, 1.5, 19.65], size: [39, 3, 0.3] },
    { id: "west-wall", kind: "wall", label: "West wall", position: [-19.65, 1.5, 0], size: [0.3, 3, 39] },
    { id: "east-wall", kind: "wall", label: "East wall", position: [19.65, 1.5, 0], size: [0.3, 3, 39] },
    // The foundry hall (defender interior): east wall solid, west wall split for a side gate,
    // and a front wall split for the main door. Open at the north toward the Cop spawn.
    { id: "hall-east-wall", kind: "wall", label: "Hall east wall", position: [8, 1.5, -11.5], size: [0.4, 3, 9] },
    { id: "hall-west-wall-back", kind: "wall", label: "Hall west wall (back)", position: [-8, 1.5, -13.25], size: [0.4, 3, 5.5] },
    { id: "hall-west-wall-front", kind: "wall", label: "Hall west wall (front)", position: [-8, 1.5, -8], size: [0.4, 3, 2] },
    { id: "hall-front-west", kind: "wall", label: "Hall front (west of door)", position: [-5.25, 1.5, -7], size: [5.5, 3, 0.4] },
    { id: "hall-front-east", kind: "wall", label: "Hall front (east of door)", position: [5.25, 1.5, -7], size: [5.5, 3, 0.4] },
    // Cover inside the hall, around the charge site.
    { id: "site-crate-west", kind: "cover", label: "Site crate (port)", position: [-3.6, 0.6, -11], size: [1.4, 1.2, 1.4] },
    { id: "site-crate-east", kind: "cover", label: "Site crate (starboard)", position: [3.6, 0.6, -11], size: [1.4, 1.2, 1.4] },
    { id: "hall-pillar", kind: "cover", label: "Hall pillar", position: [-4, 0.85, -8.6], size: [1.6, 1.7, 1.6] },
    // The south yard (attacker approach): a long central skip splits the lane, with flank cover.
    { id: "yard-skip", kind: "cover", label: "Yard skip", position: [0, 1, 3], size: [3.5, 2, 6] },
    { id: "yard-crate-west", kind: "cover", label: "Yard crate (port)", position: [-9, 0.6, -3], size: [1.6, 1.2, 1.6] },
    { id: "yard-crate-east", kind: "cover", label: "Yard crate (starboard)", position: [9, 0.6, -3], size: [1.6, 1.2, 1.6] },
    { id: "yard-stack-west", kind: "cover", label: "Yard stack (port)", position: [-12, 1, 7], size: [2.4, 2, 2.4] },
    { id: "yard-stack-east", kind: "cover", label: "Yard stack (starboard)", position: [12, 1, 7], size: [2.4, 2, 2.4] },
    { id: "west-gate-cover", kind: "cover", label: "West gate cover", position: [-13, 0.8, -2], size: [2, 1.6, 2] }
  ],
  playerScaleReferences: [
    { id: "scale-post-west", label: "Scale post west", position: [-14, 1, -3], radiusMeters: 0.1, heightMeters: 2 },
    { id: "scale-post-east", label: "Scale post east", position: [14, 1, -3], radiusMeters: 0.1, heightMeters: 2 }
  ],
  spawnMarkers: [
    { id: "spawn-cops-1", label: "Cops spawn 1", role: "neutral", position: [-6, 0, -17], yaw: 0 },
    { id: "spawn-cops-2", label: "Cops spawn 2", role: "neutral", position: [-2, 0, -17], yaw: 0 },
    { id: "spawn-cops-3", label: "Cops spawn 3", role: "neutral", position: [2, 0, -17], yaw: 0 },
    { id: "spawn-cops-4", label: "Cops spawn 4", role: "neutral", position: [6, 0, -17], yaw: 0 },
    { id: "spawn-robbers-1", label: "Robbers spawn 1", role: "neutral", position: [-12, 0, 16.5], yaw: 3.141592653589793 },
    { id: "spawn-robbers-2", label: "Robbers spawn 2", role: "neutral", position: [-4, 0, 16.5], yaw: 3.141592653589793 },
    { id: "spawn-robbers-3", label: "Robbers spawn 3", role: "neutral", position: [4, 0, 16.5], yaw: 3.141592653589793 },
    { id: "spawn-robbers-4", label: "Robbers spawn 4", role: "neutral", position: [12, 0, 16.5], yaw: 3.141592653589793 }
  ],
  labels: [
    { id: "label-hall", text: "Foundry hall", position: [0, 2, -11] },
    { id: "label-yard", text: "South yard", position: [0, 2, 9] }
  ],
  // Slot starts mirror the spawn markers, ordered slot 0..7 (lower half Cops, upper Robbers).
  slotStarts: [
    { position: [-6, 0, -17], yaw: 0 },
    { position: [-2, 0, -17], yaw: 0 },
    { position: [2, 0, -17], yaw: 0 },
    { position: [6, 0, -17], yaw: 0 },
    { position: [-12, 0, 16.5], yaw: 3.141592653589793 },
    { position: [-4, 0, 16.5], yaw: 3.141592653589793 },
    { position: [4, 0, 16.5], yaw: 3.141592653589793 },
    { position: [12, 0, 16.5], yaw: 3.141592653589793 }
  ]
};
