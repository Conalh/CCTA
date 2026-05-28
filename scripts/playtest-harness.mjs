import { execFile } from "node:child_process";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

import {
  createPlaytestHarnessSummary,
  extractPlaywrightJsonResult
} from "./playtest-harness-summary.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const defaultBaseUrl = "http://127.0.0.1:8787";

const options = readOptions(process.argv.slice(2));
let devServerProcess;
let startedServer = false;
let devServerOutput = "";

try {
  const reachableBeforeStart = await waitForServer(options.baseUrl, 1, 200);
  if (!reachableBeforeStart) {
    if (options.noStart) {
      throw new Error(`No server is reachable at ${options.baseUrl}; rerun without --no-start or start npm.cmd run dev first.`);
    }

    devServerProcess = startDevServer();
    startedServer = true;
    await waitForDevServerOrExit(devServerProcess, options.baseUrl);
  }

  const output = await runPlaywrightHarness(options);
  const evidence = parsePlaywrightEvidence(output);
  console.log(createPlaytestHarnessSummary(evidence).trimEnd());
} catch (error) {
  console.error("Phase 34 playtest harness failed.");
  console.error(error instanceof Error ? error.message : String(error));
  console.error("This command is local-only. It uses the WebSocket fallback path and does not prove WebTransport.");
  process.exitCode = 1;
} finally {
  if (startedServer && devServerProcess !== undefined) {
    await stopDevServer(devServerProcess);
  }
}

function readOptions(args) {
  let baseUrl = process.env.PLAYTEST_HARNESS_BASE_URL ?? defaultBaseUrl;
  let noStart = process.env.PLAYTEST_HARNESS_NO_START === "1";
  let networkProfileId = process.env.PLAYTEST_HARNESS_NETWORK_PROFILE;
  let networkSeed = process.env.PLAYTEST_HARNESS_NETWORK_SEED;

  for (const arg of args) {
    if (arg.startsWith("--url=")) {
      baseUrl = arg.slice("--url=".length);
    } else if (arg === "--no-start") {
      noStart = true;
    } else if (arg.startsWith("--network-profile=")) {
      networkProfileId = arg.slice("--network-profile=".length);
    } else if (arg.startsWith("--network-seed=")) {
      networkSeed = arg.slice("--network-seed=".length);
    }
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    includeNetworkEvidence: typeof networkProfileId === "string" && networkProfileId.length > 0,
    networkProfileId: networkProfileId ?? "",
    networkSeed: networkSeed ?? "",
    noStart
  };
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

async function waitForServer(baseUrl, attempts = 80, intervalMs = 500) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${baseUrl}/`, {
        signal: AbortSignal.timeout(1000)
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // Keep polling until the dev server has finished typechecking and started listening.
    }
    await delay(intervalMs);
  }

  return false;
}

function startDevServer() {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args = process.platform === "win32"
    ? ["/c", "npm.cmd", "run", "dev"]
    : ["run", "dev"];

  const child = spawn(command, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      NO_COLOR: "1"
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  child.stdout.on("data", (chunk) => {
    appendDevServerOutput(chunk);
  });
  child.stderr.on("data", (chunk) => {
    appendDevServerOutput(chunk);
  });

  return child;
}

async function waitForDevServerOrExit(child, baseUrl) {
  for (let i = 0; i < 80; i += 1) {
    if (child.exitCode !== null) {
      throw new Error(`npm.cmd run dev exited before the harness could connect (exit ${child.exitCode}).${formatDevServerOutput()}`);
    }

    if (await waitForServer(baseUrl, 1, 200)) {
      return;
    }
  }

  throw new Error(`Dev server did not become reachable at ${baseUrl}.${formatDevServerOutput()}`);
}

async function runPlaywrightHarness(options) {
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const browserScript = await createTemplatedBrowserScript(options);
  const npxArgs = [
    "--yes",
    "--package",
    "@playwright/cli",
    "playwright-cli",
    "run-code",
    "--filename",
    browserScript
  ];
  const args = process.platform === "win32" ? ["/c", "npx.cmd", ...npxArgs] : npxArgs;

  try {
    return await new Promise((resolveOutput, reject) => {
      execFile(command, args, {
        cwd: repoRoot,
        env: process.env,
        maxBuffer: 1024 * 1024 * 10,
        timeout: 120000,
        windowsHide: true
      }, (error, stdout, stderr) => {
        const output = `${stdout}${stderr}`;
        if (error !== null) {
          reject(new Error(`${output || error.message}\nBrowser automation depends on npx @playwright/cli being available locally or fetchable by npm.`));
          return;
        }

        resolveOutput(output);
      });
    });
  } finally {
    await unlink(browserScript).catch(() => undefined);
  }
}

async function createTemplatedBrowserScript(options) {
  const sourcePath = resolve(__dirname, "playtest-harness-browser.mjs");
  const localAssetsDirectory = resolve(repoRoot, "local-assets");
  const outputPath = resolve(localAssetsDirectory, "playtest-harness-runner.mjs");
  const source = await readFile(sourcePath, "utf8");

  await mkdir(localAssetsDirectory, { recursive: true });
  await writeFile(
    outputPath,
    source
      .replace("\"__PLAYTEST_HARNESS_BASE_URL__\"", JSON.stringify(options.baseUrl))
      .replace("\"__PLAYTEST_HARNESS_NETWORK_PROFILE__\"", JSON.stringify(options.networkProfileId))
      .replace("\"__PLAYTEST_HARNESS_NETWORK_SEED__\"", JSON.stringify(options.networkSeed))
      .replace("__PLAYTEST_HARNESS_INCLUDE_NETWORK_EVIDENCE__", JSON.stringify(options.includeNetworkEvidence)),
    "utf8"
  );
  return outputPath;
}

function parsePlaywrightEvidence(output) {
  try {
    return extractPlaywrightJsonResult(output);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nRaw Playwright output:\n${output.slice(0, 2000)}`);
  }
}

async function stopDevServer(child) {
  if (process.platform === "win32" && child.exitCode === null) {
    const closePromise = new Promise((resolveClose) => {
      child.once("close", resolveClose);
      child.once("error", resolveClose);
    });
    await new Promise((resolveStop) => {
      execFile("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true
      }, () => {
        resolveStop();
      });
    });
    await Promise.race([closePromise, delay(5000)]);
    child.stdout.destroy();
    child.stderr.destroy();
    child.unref();
    return;
  }

  if (process.platform !== "win32" && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolveClose) => {
        child.once("close", resolveClose);
        child.once("error", resolveClose);
      }),
      delay(3000)
    ]);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }

  child.stdout.destroy();
  child.stderr.destroy();
  child.unref();
}

function delay(ms) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

function appendDevServerOutput(chunk) {
  devServerOutput = `${devServerOutput}${chunk.toString()}`.slice(-4000);
}

function formatDevServerOutput() {
  return devServerOutput.trim().length === 0 ? "" : `\nDev server output:\n${devServerOutput.trim()}`;
}
