import assert from "node:assert/strict";
import test from "node:test";

import {
  computeNetworkSimulationDelayMs,
  computeOrderedDeliveryMs,
  createNetworkSimulationRandom,
  isReliableMessageKind,
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

test("only the unreliable datagram kinds reorder; control messages stay ordered", () => {
  assert.equal(isReliableMessageKind("client.input"), false);
  assert.equal(isReliableMessageKind("client.fire"), false);
  assert.equal(isReliableMessageKind("server.snapshot"), false);

  assert.equal(isReliableMessageKind("server.combat.state"), true);
  assert.equal(isReliableMessageKind("server.round.state"), true);
  assert.equal(isReliableMessageKind("server.loadout.state"), true);
  assert.equal(isReliableMessageKind("server.fire.result"), true);
  assert.equal(isReliableMessageKind("input.ack"), true);
});

test("reliable delivery is clamped so a jittered message never overtakes an earlier one", () => {
  // An earlier reliable message lands at t=200; a later one with a smaller jittered delay would
  // naturally arrive at t=130, so it is held back to the prior delivery floor.
  const earlier = computeOrderedDeliveryMs(100, 100, true, 0);
  assert.deepEqual(earlier, { deliveryMs: 200, nextLastReliableDeliveryMs: 200 });

  const reordered = computeOrderedDeliveryMs(110, 20, true, earlier.nextLastReliableDeliveryMs);
  assert.deepEqual(reordered, { deliveryMs: 200, nextLastReliableDeliveryMs: 200 });

  // A later reliable message whose natural delivery is already past the floor keeps its own time.
  const later = computeOrderedDeliveryMs(160, 90, true, reordered.nextLastReliableDeliveryMs);
  assert.deepEqual(later, { deliveryMs: 250, nextLastReliableDeliveryMs: 250 });
});

test("unreliable messages keep an independent delay and do not move the reliable floor", () => {
  const unreliable = computeOrderedDeliveryMs(160, 5, false, 200);
  assert.deepEqual(unreliable, { deliveryMs: 165, nextLastReliableDeliveryMs: 200 });
});
