import type { ArenaMapMetadata } from "./map-metadata.js";

// Drydock Span is an original mirrored two-end arena sized for eight players.
// North and south spawn clusters face a contested midline; cover is symmetric
// about z=0 so neither end holds a layout advantage. All geometry is original
// industrial-yard greybox and fits inside the declared world bounds.
export const DRYDOCK_SPAN_ARENA: ArenaMapMetadata = {
  id: "arena-drydock-span",
  displayName: "Drydock Span",
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
    {
      id: "north-wall",
      kind: "wall",
      label: "North retaining wall",
      position: [0, 1.5, -19.65],
      size: [39, 3, 0.3]
    },
    {
      id: "south-wall",
      kind: "wall",
      label: "South retaining wall",
      position: [0, 1.5, 19.65],
      size: [39, 3, 0.3]
    },
    {
      id: "west-wall",
      kind: "wall",
      label: "West service wall",
      position: [-19.65, 1.5, 0],
      size: [0.3, 3, 39]
    },
    {
      id: "east-wall",
      kind: "wall",
      label: "East service wall",
      position: [19.65, 1.5, 0],
      size: [0.3, 3, 39]
    },
    {
      id: "north-berth-west",
      kind: "cover",
      label: "North berth (port)",
      position: [-8, 0.6, -13],
      size: [3, 1.2, 1.2]
    },
    {
      id: "north-berth-east",
      kind: "cover",
      label: "North berth (starboard)",
      position: [8, 0.6, -13],
      size: [3, 1.2, 1.2]
    },
    {
      id: "south-berth-west",
      kind: "cover",
      label: "South berth (port)",
      position: [-8, 0.6, 13],
      size: [3, 1.2, 1.2]
    },
    {
      id: "south-berth-east",
      kind: "cover",
      label: "South berth (starboard)",
      position: [8, 0.6, 13],
      size: [3, 1.2, 1.2]
    },
    {
      id: "north-gantry-leg-west",
      kind: "cover",
      label: "North gantry leg (port)",
      position: [-11, 0.9, -7],
      size: [1.4, 1.8, 3]
    },
    {
      id: "north-gantry-leg-east",
      kind: "cover",
      label: "North gantry leg (starboard)",
      position: [11, 0.9, -7],
      size: [1.4, 1.8, 3]
    },
    {
      id: "south-gantry-leg-west",
      kind: "cover",
      label: "South gantry leg (port)",
      position: [-11, 0.9, 7],
      size: [1.4, 1.8, 3]
    },
    {
      id: "south-gantry-leg-east",
      kind: "cover",
      label: "South gantry leg (starboard)",
      position: [11, 0.9, 7],
      size: [1.4, 1.8, 3]
    },
    {
      id: "north-sill",
      kind: "cover",
      label: "North sill",
      position: [0, 0.55, -7],
      size: [5, 1.1, 1.2]
    },
    {
      id: "south-sill",
      kind: "cover",
      label: "South sill",
      position: [0, 0.55, 7],
      size: [5, 1.1, 1.2]
    },
    {
      id: "central-caisson-west",
      kind: "cover",
      label: "Central caisson (port)",
      position: [-4.5, 0.8, 0],
      size: [2.4, 1.6, 5]
    },
    {
      id: "central-caisson-east",
      kind: "cover",
      label: "Central caisson (starboard)",
      position: [4.5, 0.8, 0],
      size: [2.4, 1.6, 5]
    },
    {
      id: "central-stanchion",
      kind: "cover",
      label: "Central stanchion",
      position: [0, 0.45, 0],
      size: [2.2, 0.9, 2.2]
    },
    {
      id: "west-pumphouse",
      kind: "cover",
      label: "West pumphouse",
      position: [-15.5, 1, 0],
      size: [2.5, 2, 4]
    },
    {
      id: "east-pumphouse",
      kind: "cover",
      label: "East pumphouse",
      position: [15.5, 1, 0],
      size: [2.5, 2, 4]
    }
  ],
  playerScaleReferences: [
    {
      id: "scale-post-north",
      label: "Scale post north",
      position: [-14, 1, -9],
      radiusMeters: 0.1,
      heightMeters: 2
    },
    {
      id: "scale-post-south",
      label: "Scale post south",
      position: [14, 1, 9],
      radiusMeters: 0.1,
      heightMeters: 2
    }
  ],
  spawnMarkers: [
    {
      id: "spawn-north-1",
      label: "North spawn 1",
      role: "neutral",
      position: [-12, 0, -16.5],
      yaw: 0
    },
    {
      id: "spawn-north-2",
      label: "North spawn 2",
      role: "neutral",
      position: [-4.5, 0, -16.5],
      yaw: 0
    },
    {
      id: "spawn-north-3",
      label: "North spawn 3",
      role: "neutral",
      position: [4.5, 0, -16.5],
      yaw: 0
    },
    {
      id: "spawn-north-4",
      label: "North spawn 4",
      role: "neutral",
      position: [12, 0, -16.5],
      yaw: 0
    },
    {
      id: "spawn-south-1",
      label: "South spawn 1",
      role: "neutral",
      position: [-12, 0, 16.5],
      yaw: 3.141592653589793
    },
    {
      id: "spawn-south-2",
      label: "South spawn 2",
      role: "neutral",
      position: [-4.5, 0, 16.5],
      yaw: 3.141592653589793
    },
    {
      id: "spawn-south-3",
      label: "South spawn 3",
      role: "neutral",
      position: [4.5, 0, 16.5],
      yaw: 3.141592653589793
    },
    {
      id: "spawn-south-4",
      label: "South spawn 4",
      role: "neutral",
      position: [12, 0, 16.5],
      yaw: 3.141592653589793
    }
  ],
  labels: [
    {
      id: "label-midline",
      text: "Midline",
      position: [0, 1, 0]
    },
    {
      id: "label-north-berths",
      text: "North berths",
      position: [0, 1, -13]
    },
    {
      id: "label-south-berths",
      text: "South berths",
      position: [0, 1, 13]
    }
  ]
};
