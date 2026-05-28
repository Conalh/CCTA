import assert from "node:assert/strict";
import test from "node:test";

import {
  computeNetworkSimulationDelayMs,
  createNetworkSimulationRandom,
  readNetworkSimulationProfile,
  readNetworkSimulationProfileFromSearch,
  shouldSimulateMessageDrop
} from "../apps/client/dist/browser/transport/network-simulation.js";

test("network simulation profiles expose baseline, latency, jitter, and drop cases", () => {
  assert.deepEqual(readNetworkSimulationProfile("baseline"), {
    id: "baseline",
    label: "Baseline",
    baseLatencyMs: 0,
    jitterMs: 0,
    dropRate: 0,
    seed: 1,
    dropMessageKinds: []
  });

  assert.equal(readNetworkSimulationProfile("moderate-latency").baseLatencyMs >= 90, true);
  assert.equal(readNetworkSimulationProfile("moderate-latency").dropRate, 0);
  assert.equal(readNetworkSimulationProfile("jitter").jitterMs >= 35, true);
  assert.equal(readNetworkSimulationProfile("small-drop").dropRate > 0, true);
  assert.equal(readNetworkSimulationProfile("unknown").id, "baseline");
});

test("network simulation drop stays scoped to high-rate messages", () => {
  const profile = {
    ...readNetworkSimulationProfile("small-drop"),
    dropRate: 1
  };

  assert.equal(
    shouldSimulateMessageDrop(profile, { kind: "client.input" }, () => 0),
    true
  );
  assert.equal(
    shouldSimulateMessageDrop(profile, { kind: "server.snapshot" }, () => 0),
    true
  );
  assert.equal(
    shouldSimulateMessageDrop(profile, { kind: "protocol.accept" }, () => 0),
    false
  );
  assert.equal(
    shouldSimulateMessageDrop(profile, { kind: "client.fire" }, () => 0),
    false
  );
});

test("network simulation delay is deterministic and bounded by jitter", () => {
  const randomA = createNetworkSimulationRandom(42);
  const randomB = createNetworkSimulationRandom(42);
  const profile = readNetworkSimulationProfile("jitter");

  const first = computeNetworkSimulationDelayMs(profile, randomA);
  const second = computeNetworkSimulationDelayMs(profile, randomA);
  const repeatedFirst = computeNetworkSimulationDelayMs(profile, randomB);
  const repeatedSecond = computeNetworkSimulationDelayMs(profile, randomB);

  assert.equal(first, repeatedFirst);
  assert.equal(second, repeatedSecond);
  assert.equal(first >= profile.baseLatencyMs - profile.jitterMs, true);
  assert.equal(first <= profile.baseLatencyMs + profile.jitterMs, true);
  assert.equal(second >= profile.baseLatencyMs - profile.jitterMs, true);
  assert.equal(second <= profile.baseLatencyMs + profile.jitterMs, true);
});

test("network simulation profile can be read from playtest query parameters", () => {
  const profile = readNetworkSimulationProfileFromSearch("?networkProfile=small-drop&networkSeed=99");

  assert.equal(profile.id, "small-drop");
  assert.equal(profile.seed, 99);
});
