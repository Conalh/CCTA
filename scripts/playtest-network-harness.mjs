import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const profiles = [
  { id: "baseline", seed: 4101 },
  { id: "moderate-latency", seed: 4201 },
  { id: "jitter", seed: 4301 },
  { id: "small-drop", seed: 4401 }
];

console.log("# Phase 36 Local Network Simulation Harness");
console.log("");
console.log("Transport: WebSocket fallback (WebTransport remains pending/unproven)");
console.log("");

let failed = false;
for (const profile of profiles) {
  const result = await runProfile(profile);
  console.log(result.output.trimEnd());
  console.log("");
  if (result.exitCode !== 0) {
    failed = true;
    break;
  }
}

if (failed) {
  process.exitCode = 1;
}

function runProfile(profile) {
  return new Promise((resolveProfile) => {
    execFile(
      process.execPath,
      [
        "scripts/playtest-harness.mjs",
        `--network-profile=${profile.id}`,
        `--network-seed=${profile.seed}`
      ],
      {
        cwd: repoRoot,
        env: process.env,
        maxBuffer: 1024 * 1024 * 20,
        timeout: 180000,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        const output = `${stdout}${stderr}`;
        resolveProfile({
          exitCode: error === null ? 0 : error.code ?? 1,
          output
        });
      }
    );
  });
}
