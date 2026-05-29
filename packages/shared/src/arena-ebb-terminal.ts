import type { ArenaMapMetadata } from "./map-metadata.js";

export const EBB_TERMINAL_ARENA: ArenaMapMetadata = {
  id: "arena-ebb-terminal",
  displayName: "Ebb Terminal",
  revision: 2,
  worldBounds: {
    min: [-14, -0.25, -11],
    max: [14, 4, 11]
  },
  primitives: [
    {
      id: "floor-plate",
      kind: "floor",
      label: "Floor plate",
      position: [0, -0.1, 0],
      size: [27, 0.2, 21]
    },
    {
      id: "north-retaining-wall",
      kind: "wall",
      label: "North retaining wall",
      position: [0, 1.5, -10.65],
      size: [27, 3, 0.3]
    },
    {
      id: "south-retaining-wall",
      kind: "wall",
      label: "South retaining wall",
      position: [0, 1.5, 10.65],
      size: [27, 3, 0.3]
    },
    {
      id: "west-service-wall",
      kind: "wall",
      label: "West service wall",
      position: [-13.65, 1.5, 0],
      size: [0.3, 3, 21]
    },
    {
      id: "east-service-wall",
      kind: "wall",
      label: "East service wall",
      position: [13.65, 1.5, 0],
      size: [0.3, 3, 21]
    },
    {
      id: "central-sill",
      kind: "cover",
      label: "Central sill",
      position: [0, 0.55, -1.2],
      size: [2.6, 1.1, 1.2]
    },
    {
      id: "west-runner",
      kind: "cover",
      label: "West runner",
      position: [-4.4, 0.8, 1.7],
      size: [1.2, 1.6, 4.2]
    },
    {
      id: "east-baffle",
      kind: "cover",
      label: "East baffle",
      position: [4.2, 0.7, 2.5],
      size: [2.2, 1.4, 1.5]
    },
    {
      id: "rear-step",
      kind: "cover",
      label: "Rear step",
      position: [2.8, 0.35, -4.6],
      size: [3.2, 0.7, 1]
    }
  ],
  playerScaleReferences: [
    {
      id: "scale-post-west",
      label: "Scale post west",
      position: [-7.4, 1, -5.5],
      radiusMeters: 0.1,
      heightMeters: 2
    },
    {
      id: "scale-post-east",
      label: "Scale post east",
      position: [7.4, 1, 5.5],
      radiusMeters: 0.1,
      heightMeters: 2
    }
  ],
  spawnMarkers: [
    {
      id: "neutral-spawn-north",
      label: "Neutral spawn north",
      role: "neutral",
      position: [0, 0, -5.8],
      yaw: 0
    },
    {
      id: "neutral-spawn-south",
      label: "Neutral spawn south",
      role: "neutral",
      position: [0, 0, 5.8],
      yaw: Math.PI
    }
  ],
  labels: [
    {
      id: "label-midline",
      text: "Midline",
      position: [0, 1, 0]
    },
    {
      id: "label-service-bay",
      text: "Service bay",
      position: [-4.4, 1.8, 1.7]
    }
  ]
};
