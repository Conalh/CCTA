# Map authoring

Maps are **data**, not scenes: each arena is an `ArenaMapMetadata` (an array of axis-aligned
boxes plus spawns) in `packages/shared/src/arena-*.ts`. You can hand-write that file, or block a
level out in a 3D tool and convert it. Either way the engine renders the greybox and derives
collision from the same data automatically.

## The one rule that shapes everything

**Collision is the 2-D footprint of each `wall`/`cover` box — height (`y`) is visual only.** So:

- An "enclosed building" is a ring of walls with **gaps** left for doors; there is no walk-under
  roof (a solid box's footprint would block the floor beneath it).
- Block out the **playable** shape with boxes/cuboids. Curved or detailed meshes collapse to their
  bounding box on import — fine as decoration, wrong for collision.
- `floor` boxes do not collide (they are the visual ground); give them real thickness, not a plane.

## Authoring in 3D, then importing

Model with boxes in **Blockbench** (free, box-only, near 1:1 with our model) or **Blender** (model
cubes, name them, export glTF). Name objects by convention, export a `.glb`/`.gltf`, then:

```
npm run import:arena -- path/to/level.glb --id arena-foundry-row --name "Foundry Row" \
  --out packages/shared/src/arena-foundry-row.ts
```

Naming convention (case-insensitive; exporter `.001` suffixes are ignored):

| Object name            | Becomes                                   |
| ---------------------- | ----------------------------------------- |
| `wall_*`               | a tall solid blocker                      |
| `cover_*`              | a crate / pillar blocker                  |
| `floor_*`              | the visual ground (non-colliding)         |
| `spawn_cops_1..4`      | Cop (defender) starts — use empties       |
| `spawn_robbers_1..4`   | Robber (attacker) starts — use empties    |
| `label_*`              | an optional in-world text label           |

Anything else is skipped with a warning. The importer reads each object's world-space bounding box
(glTF stores per-mesh min/max, so no vertex crunching), maps names to `kind`/spawns, computes world
bounds, and **runs the same map contract** the hand-written maps pass — so a bad block-out fails
loudly instead of shipping. Coordinates match the engine directly (Y up; Cops north at −Z, Robbers
south at +Z). Without a `--out`, the module prints to stdout.

`slotStarts` (the actual server spawn positions) are emitted only when you provide a full 4 Cops + 4
Robbers; otherwise the engine falls back to its default starts and the importer warns.

## After import (whether hand-written or generated)

1. Add the arena to `KNOWN_ARENAS` in `packages/shared/src/arena-registry.ts`.
2. Add a test like `tests/arena-foundry-row.test.mjs` (validates the contract + spawn/site clearance).
3. `npm run validate`, then host it with `BREACHLINE_SERVER_MAP=<slug>`.

## Hand-editing reference

A primitive is `{ id, kind, label, position: [x,y,z] (center), size: [w,h,d] }`. Coordinates: `x`
east/west, `z` north/south, `y` up. A door is a *missing* wall segment — split one wall into two
boxes with a gap between them. Limits: 64 primitives, 16 spawn markers. Bump the arena `revision`
when you change geometry.
