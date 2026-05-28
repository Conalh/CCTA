import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

function findTests(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTests(path));
    } else if (entry.isFile() && path.endsWith(".test.mjs")) {
      files.push(path);
    }
  }

  return files;
}

const testDirectory = "tests";
const files = statSync(testDirectory).isDirectory() ? findTests(testDirectory) : [];

if (files.length === 0) {
  console.error("No test files found.");
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, ["--test", ...files], {
    stdio: "inherit"
  });
  process.exitCode = result.status ?? 1;
}
