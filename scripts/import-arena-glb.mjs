import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

import { validateArenaMapMetadata } from "../packages/shared/dist/index.js";
import { buildArenaFromNodes, extractNodeBounds, formatArenaModule, parseGlbContainer } from "./arena-import.mjs";

// Turn a 3D block-out (.glb / .gltf) into a validated arena-*.ts module. Block out a level with
// boxes in Blockbench/Blender, name objects by convention, export, and run:
//
//   npm run import:arena -- path/to/level.glb --id arena-foundry-row --name "Foundry Row" \
//     --out packages/shared/src/arena-foundry-row.ts
//
// Naming convention (case-insensitive, exporter ".001" suffixes ignored):
//   wall_*            -> a tall solid blocker        (e.g. wall_north, wall.hall.east)
//   cover_*           -> a crate / pillar blocker    (e.g. cover_crate)
//   floor_*           -> the ground (non-colliding)  (give it real thickness, not a flat plane)
//   spawn_cops_1..4   -> Cop (defender) starts        (empties; their position is used)
//   spawn_robbers_1..4-> Robber (attacker) starts
//   label_*           -> an optional in-world text label
// Anything else is skipped with a warning. Collision is the box footprint only, so block out the
// PLAYABLE shape with boxes — curved/detailed meshes collapse to their bounding box.

function parseArgs(argv) {
  const options = { input: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => argv[(index += 1)];
    switch (token) {
      case "--id":
        options.id = next();
        break;
      case "--name":
        options.displayName = next();
        break;
      case "--out":
        options.out = next();
        break;
      case "--revision":
        options.revision = Number(next());
        break;
      case "--margin":
        options.boundsMargin = Number(next());
        break;
      case "--cops-yaw":
        options.copsYaw = Number(next());
        break;
      case "--robbers-yaw":
        options.robbersYaw = Number(next());
        break;
      default:
        if (token.startsWith("--")) {
          throw new Error(`Unknown flag ${token}.`);
        }
        options.input = token;
        break;
    }
  }
  return options;
}

function loadGltf(path) {
  const bytes = readFileSync(path);
  const isGlb = bytes.length >= 4 && bytes.readUInt32LE(0) === 0x46546c67;
  if (isGlb) {
    return parseGlbContainer(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)).json;
  }
  try {
    return JSON.parse(bytes.toString("utf-8"));
  } catch (error) {
    throw new Error(`${path} is neither a GLB nor valid glTF JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }

  if (options.input === undefined) {
    console.error("Usage: npm run import:arena -- <level.glb> --id arena-<slug> [--name \"Name\"] [--out path.ts]");
    process.exit(2);
  }

  let gltf;
  try {
    gltf = loadGltf(options.input);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  let result;
  try {
    const nodes = extractNodeBounds(gltf);
    result = buildArenaFromNodes(nodes, options);
  } catch (error) {
    console.error(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  for (const warning of result.warnings) {
    console.warn(`! ${warning}`);
  }

  const validation = validateArenaMapMetadata(result.metadata);
  if (!validation.ok) {
    console.error("\nThe generated arena does not satisfy the map contract:");
    for (const issue of validation.errors) {
      console.error(`  - ${issue.field}: ${issue.message}`);
    }
    console.error("\nFix the block-out (often: thin floors, copied shooter terms in a name, or geometry outside the level) and re-export.");
    process.exit(1);
  }

  const moduleText = formatArenaModule(result.metadata);
  if (options.out) {
    writeFileSync(options.out, moduleText, "utf-8");
    console.log(
      `\nWrote ${options.out} — ${result.metadata.primitives.length} primitives, ${result.metadata.spawnMarkers.length} spawns. Passes the map contract.`
    );
  } else {
    console.log(`\n${moduleText}`);
  }

  console.log("\nNext: add it to KNOWN_ARENAS in packages/shared/src/arena-registry.ts, add a test, then `npm run validate`.");
}

main();
