import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_INPUT_BUTTONS,
  COMBAT_EVENT_KIND,
  FIRE_REJECT_REASON,
  LOADOUT_PROFILE_ID,
  LOADOUT_REJECT_REASON,
  LOADOUT_STATUS,
  PROTOCOL_VERSION,
  ROUND_OUTCOME,
  ROUND_PHASE,
  WEAPON_EVENT_KIND,
  createClientFireIntent
} from "../packages/shared/dist/index.js";
import {
  DEFAULT_KILL_REWARD,
  DEFAULT_ROUND_LOSS_BONUS,
  DEFAULT_ROUND_WIN_BONUS,
  DEFAULT_STARTING_MONEY,
  createServerRuntime
} from "../apps/server/dist/index.js";

// A deterministic weapon set for combat tests: a flat 50 damage so two hits drop a
// full-health target, a one-tick fire interval so consecutive ticks can re-fire, and a
// roomy magazine so ammo never runs dry mid-test. Same-tick double-fire stays impossible.
const TEST_WEAPON_DAMAGE = 50;
const TEST_WEAPON_MAGAZINE = 12;
const TEST_WEAPON_RELOAD_TICKS = 2;
const TEST_WEAPONS = [
  LOADOUT_PROFILE_ID.ridgeline,
  LOADOUT_PROFILE_ID.halcyon,
  LOADOUT_PROFILE_ID.cinder
].map((profileId) => ({
  profileId,
  name: `Testbed ${profileId}`,
  role: "test",
  damagePerHit: TEST_WEAPON_DAMAGE,
  fireIntervalTicks: 1,
  magazineSize: TEST_WEAPON_MAGAZINE,
  reloadTicks: TEST_WEAPON_RELOAD_TICKS
}));
const TEST_WEAPON_CONFIG = {
  definitions: TEST_WEAPONS,
  defaultProfileId: LOADOUT_PROFILE_ID.halcyon
};

function createFakeTransportSession(id = "session-1") {
  const sent = [];
  const messageHandlers = [];
  const closeHandlers = [];

  return {
    session: {
      id,
      send(message) {
        sent.push(message);
      },
      onMessage(handler) {
        messageHandlers.push(handler);
        return () => {};
      },
      onClose(handler) {
        closeHandlers.push(handler);
        return () => {};
      },
      close() {
        for (const handler of closeHandlers) {
          handler();
        }
      }
    },
    receive(message) {
      for (const handler of messageHandlers) {
        handler(message);
      }
    },
    sent
  };
}

test("server runtime accepts hello, pongs, tracks input, and broadcasts tick snapshots", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    now: () => 1000
  });
  const transport = createFakeTransportSession();

  runtime.attachSession(transport.session);
  transport.receive({
    kind: "protocol.hello",
    protocolVersion: PROTOCOL_VERSION,
    clientName: "dev-client"
  });
  transport.receive({
    kind: "ping",
    sequence: 1,
    clientTimeMs: 900
  });
  transport.receive({
    kind: "client.input",
    sequence: 2,
    clientTimeMs: 920,
    buttons: 0,
    yaw: 0,
    pitch: 0
  });
  runtime.step(7, 1016);

  assert.equal(runtime.connectedSessionCount(), 1);
  assert.deepEqual(
    transport.sent.map((message) => message.kind),
    [
      "protocol.accept",
      "match.assigned",
      "server.combat.state",
      "server.weapon.state",
      "server.player.economy",
      "match.update",
      "server.match.roster",
      "pong",
      "input.ack",
      "server.tick",
      "server.round.state",
      "server.snapshot"
    ]
  );
  assert.deepEqual(transport.sent[1], {
    kind: "match.assigned",
    matchId: 1,
    sessionId: 1,
    slotIndex: 0,
    capacity: 8,
    connectedSlots: 1
  });
  assert.deepEqual(runtime.getSessionInputSequences("session-1"), [2]);
  assert.deepEqual(runtime.getSessionInputState("session-1"), {
    sessionId: 1,
    lastAcceptedInputSequence: 2,
    droppedInputCount: 0
  });
  assert.deepEqual(transport.sent.at(-1), {
    kind: "server.snapshot",
    tick: 7,
    serverTimeMs: 1016,
    sessionCount: 1,
    worldId: 1,
    entityCount: 1,
    entities: [
      {
        entityId: 1,
        sessionId: 1,
        slotIndex: 0,
        active: true,
        crouched: false,
        x: -4.5,
        y: 0,
        z: -16.5,
        yaw: 0
      }
    ]
  });
});

test("server runtime sends protocol.reject for unsupported hello versions", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    now: () => 1000
  });
  const transport = createFakeTransportSession();

  runtime.attachSession(transport.session);
  transport.receive({
    kind: "protocol.hello",
    protocolVersion: 999,
    clientName: "old-client"
  });
  transport.receive({
    kind: "ping",
    sequence: 1,
    clientTimeMs: 900
  });

  assert.deepEqual(
    transport.sent.map((message) => message.kind),
    ["protocol.reject"]
  );
  assert.deepEqual(runtime.getSessionInputSequences("session-1"), []);
  assert.equal(runtime.getSessionInputState("session-1"), undefined);
});

test("server runtime drops stale and invalid input while acknowledging the last accepted sequence", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    now: () => 1000
  });
  const transport = createFakeTransportSession();

  runtime.attachSession(transport.session);
  transport.receive({
    kind: "protocol.hello",
    protocolVersion: PROTOCOL_VERSION,
    clientName: "dev-client"
  });

  for (const message of [
    {
      kind: "client.input",
      sequence: 2,
      clientTimeMs: 920,
      buttons: 0,
      yaw: 0,
      pitch: 0
    },
    {
      kind: "client.input",
      sequence: 2,
      clientTimeMs: 930,
      buttons: 0,
      yaw: 0,
      pitch: 0
    },
    {
      kind: "client.input",
      sequence: 3,
      clientTimeMs: 940,
      buttons: 0,
      yaw: Number.NaN,
      pitch: 0
    },
    {
      kind: "client.input",
      sequence: 4,
      clientTimeMs: 950,
      buttons: 0,
      yaw: 0,
      pitch: 0
    }
  ]) {
    transport.receive(message);
  }

  assert.deepEqual(runtime.getSessionInputSequences("session-1"), [2, 4]);
  assert.deepEqual(runtime.getSessionInputState("session-1"), {
    sessionId: 1,
    lastAcceptedInputSequence: 4,
    droppedInputCount: 2
  });
  assert.deepEqual(
    transport.sent.filter((message) => message.kind === "input.ack"),
    [
      {
        kind: "input.ack",
        sessionId: 1,
        lastAcceptedInputSequence: 2,
        droppedInputCount: 0
      },
      {
        kind: "input.ack",
        sessionId: 1,
        lastAcceptedInputSequence: 2,
        droppedInputCount: 1
      },
      {
        kind: "input.ack",
        sessionId: 1,
        lastAcceptedInputSequence: 2,
        droppedInputCount: 2
      },
      {
        kind: "input.ack",
        sessionId: 1,
        lastAcceptedInputSequence: 4,
        droppedInputCount: 2
      }
    ]
  );
});

test("server runtime assigns fixed slots, reports match updates, and frees disconnected slots", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    now: () => 1000
  });
  const first = createFakeTransportSession("session-a");
  const second = createFakeTransportSession("session-b");
  const third = createFakeTransportSession("session-c");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  runtime.attachSession(third.session);

  for (const transport of [first, second, third]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }

  assert.deepEqual(first.sent.map((message) => message.kind), [
    "protocol.accept",
    "match.assigned",
    "server.combat.state",
    "server.weapon.state",
    "server.player.economy",
    "match.update",
    "server.match.roster",
    "match.update",
    "server.match.roster"
  ]);
  assert.deepEqual(second.sent.map((message) => message.kind), [
    "protocol.accept",
    "match.assigned",
    "server.combat.state",
    "server.weapon.state",
    "server.player.economy",
    "match.update",
    "server.match.roster"
  ]);
  assert.deepEqual(third.sent, [
    {
      kind: "protocol.reject",
      protocolVersion: PROTOCOL_VERSION,
      reason: "Match is full."
    }
  ]);
  assert.equal(runtime.connectedMatchSlotCount(), 2);

  runtime.step(5, 1016);
  assert.deepEqual(
    third.sent.map((message) => message.kind),
    ["protocol.reject"]
  );
  assert.deepEqual(
    first.sent.filter((message) => message.kind === "server.snapshot").at(-1),
    {
      kind: "server.snapshot",
      tick: 5,
      serverTimeMs: 1016,
      sessionCount: 2,
      worldId: 1,
      entityCount: 2,
      entities: [
        {
          entityId: 1,
          sessionId: 1,
          slotIndex: 0,
          active: true,
          crouched: false,
          x: -4.5,
          y: 0,
          z: -16.5,
          yaw: 0
        },
        {
          entityId: 2,
          sessionId: 2,
          slotIndex: 1,
          active: true,
          crouched: false,
          x: 4.5,
          y: 0,
          z: -16.5,
          yaw: 0
        }
      ]
    }
  );

  first.session.close();
  runtime.step(6, 1032);

  assert.equal(runtime.connectedMatchSlotCount(), 1);
  assert.deepEqual(second.sent.at(-1), {
    kind: "server.snapshot",
    tick: 6,
    serverTimeMs: 1032,
    sessionCount: 1,
    worldId: 1,
    entityCount: 1,
    entities: [
      {
        entityId: 2,
        sessionId: 2,
        slotIndex: 1,
        active: true,
        crouched: false,
        x: 4.5,
        y: 0,
        z: -16.5,
        yaw: 0
      }
    ]
  });

  const replacement = createFakeTransportSession("session-d");
  runtime.attachSession(replacement.session);
  replacement.receive({
    kind: "protocol.hello",
    protocolVersion: PROTOCOL_VERSION,
    clientName: "replacement"
  });

  assert.deepEqual(replacement.sent[1], {
    kind: "match.assigned",
    matchId: 1,
    sessionId: 3,
    slotIndex: 0,
    capacity: 2,
    connectedSlots: 2
  });
});

test("server runtime moves only from accepted input on authoritative ticks", () => {
  const runtime = createServerRuntime({
    tickRateHz: 2,
    now: () => 1000
  });
  const transport = createFakeTransportSession();

  runtime.attachSession(transport.session);
  transport.receive({
    kind: "protocol.hello",
    protocolVersion: PROTOCOL_VERSION,
    clientName: "dev-client"
  });

  transport.receive({
    kind: "client.input",
    sequence: 1,
    clientTimeMs: 1000,
    buttons: 0,
    yaw: 0,
    pitch: 0
  });
  runtime.step(1, 1000);
  const stationary = transport.sent.filter((message) => message.kind === "server.snapshot").at(-1).entities[0];

  transport.receive({
    kind: "client.input",
    sequence: 1,
    clientTimeMs: 1010,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  });
  runtime.step(2, 1500);
  const afterStale = transport.sent.filter((message) => message.kind === "server.snapshot").at(-1).entities[0];

  transport.receive({
    kind: "client.input",
    sequence: 2,
    clientTimeMs: 1020,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: Number.NaN,
    pitch: 0
  });
  runtime.step(3, 2000);
  const afterInvalid = transport.sent.filter((message) => message.kind === "server.snapshot").at(-1).entities[0];

  transport.receive({
    kind: "client.input",
    sequence: 3,
    clientTimeMs: 1030,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  });
  runtime.step(4, 2500);
  const afterValid = transport.sent.filter((message) => message.kind === "server.snapshot").at(-1).entities[0];

  assert.deepEqual(stationary, {
    entityId: 1,
    sessionId: 1,
    slotIndex: 0,
    active: true,
    crouched: false,
    x: -4.5,
    y: 0,
    z: -16.5,
    yaw: 0
  });
  assert.deepEqual(afterStale, stationary);
  assert.deepEqual(afterInvalid, stationary);
  assert.equal(afterValid.z < stationary.z, true);
  assert.equal(afterValid.x, -4.5);
  assert.equal(afterValid.y, 0);
  assert.equal(afterValid.yaw, 0);
});

test("server runtime publishes authoritative movement stopped by arena blockers", () => {
  const runtime = createServerRuntime({
    tickRateHz: 10,
    round: {
      setupDurationTicks: 1,
      activeDurationTicks: 120,
      resetDurationTicks: 2
    },
    now: () => 1000
  });
  const transport = createFakeTransportSession("collision-runtime");

  runtime.attachSession(transport.session);
  transport.receive({
    kind: "protocol.hello",
    protocolVersion: PROTOCOL_VERSION,
    clientName: "collision-client"
  });
  runtime.step(1, 1000);
  transport.receive({
    kind: "client.input",
    sequence: 1,
    clientTimeMs: 1010,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  });

  for (let tick = 2; tick <= 14; tick += 1) {
    runtime.step(tick, 1000 + tick * 100);
  }

  const entity = transport.sent.filter((message) => message.kind === "server.snapshot").at(-1).entities[0];
  // Slot 0 spawns at (-4.5, -16.5) facing -z; forward movement is stopped by the
  // north retaining wall at the player radius.
  assert.equal(entity.x, -4.5);
  assert.equal(Math.abs(entity.z + 19.15) < 0.000001, true);
  assert.equal(entity.yaw, 0);
});

test("server runtime rejects unaccepted, stale, and invalid fire intents", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    now: () => 1000
  });
  const transport = createFakeTransportSession();

  runtime.attachSession(transport.session);
  transport.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1000,
      clientTick: 1,
      yaw: 0,
      pitch: 0
    })
  );
  assert.deepEqual(transport.sent.at(-1), {
    kind: "server.fire.result",
    sequence: 1,
    sessionId: 0,
    serverTick: 0,
    accepted: false,
    hit: false,
    targetEntityId: 0,
    targetSessionId: 0,
    distance: 0,
    rejectReason: FIRE_REJECT_REASON.notAccepted
  });

  transport.receive({
    kind: "protocol.hello",
    protocolVersion: PROTOCOL_VERSION,
    clientName: "dev-client"
  });
  runtime.step(3, 1016);
  transport.receive(
    createClientFireIntent({
      sequence: 2,
      clientTimeMs: 1020,
      clientTick: 3,
      yaw: 0,
      pitch: 0
    })
  );
  transport.receive(
    createClientFireIntent({
      sequence: 2,
      clientTimeMs: 1030,
      clientTick: 4,
      yaw: 0,
      pitch: 0
    })
  );
  transport.receive(
    createClientFireIntent({
      sequence: 3,
      clientTimeMs: 1040,
      clientTick: 4,
      yaw: Number.NaN,
      pitch: 0
    })
  );

  assert.deepEqual(
    transport.sent.filter((message) => message.kind === "server.fire.result").slice(-3),
    [
      {
        kind: "server.fire.result",
        sequence: 2,
        sessionId: 1,
        serverTick: 3,
        accepted: true,
        hit: false,
        targetEntityId: 0,
        targetSessionId: 0,
        distance: 0,
        rejectReason: FIRE_REJECT_REASON.none
      },
      {
        kind: "server.fire.result",
        sequence: 2,
        sessionId: 1,
        serverTick: 3,
        accepted: false,
        hit: false,
        targetEntityId: 0,
        targetSessionId: 0,
        distance: 0,
        rejectReason: FIRE_REJECT_REASON.staleSequence
      },
      {
        kind: "server.fire.result",
        sequence: 3,
        sessionId: 1,
        serverTick: 3,
        accepted: false,
        hit: false,
        targetEntityId: 0,
        targetSessionId: 0,
        distance: 0,
        rejectReason: FIRE_REJECT_REASON.invalidAim
      }
    ]
  );
});

test("server runtime produces server-owned hitscan results from authoritative world state", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    now: () => 1000
  });
  const first = createFakeTransportSession("session-a");
  const second = createFakeTransportSession("session-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }
  runtime.step(5, 1016);

  first.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1030,
      clientTick: 5,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );

  assert.deepEqual(first.sent.filter((message) => message.kind === "server.fire.result").at(-1), {
    kind: "server.fire.result",
    sequence: 1,
    sessionId: 1,
    serverTick: 5,
    accepted: true,
    hit: true,
    targetEntityId: 2,
    targetSessionId: 2,
    distance: 9,
    rejectReason: FIRE_REJECT_REASON.none
  });
  assert.equal(second.sent.some((message) => message.kind === "server.fire.result"), false);
});

test("server runtime applies combat damage only from accepted server-owned fire results", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    weapon: TEST_WEAPON_CONFIG,
    now: () => 1000
  });
  const first = createFakeTransportSession("combat-a");
  const second = createFakeTransportSession("combat-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }
  runtime.step(5, 1016);

  // An invalid-aim intent is rejected before the weapon fires, so it deals no damage.
  first.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1030,
      clientTick: 5,
      yaw: Number.NaN,
      pitch: 0
    })
  );
  assert.equal(second.sent.filter((message) => message.kind === "server.combat.state").at(-1).health, 100);

  // First accepted hit wounds the target; the lethal hit lands on the next tick because the
  // weapon's fire cadence forbids a second shot on the same tick.
  first.receive(
    createClientFireIntent({
      sequence: 2,
      clientTimeMs: 1040,
      clientTick: 5,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  assert.equal(second.sent.filter((message) => message.kind === "server.combat.state").at(-1).health, 50);

  runtime.step(6, 1020);
  first.receive(
    createClientFireIntent({
      sequence: 3,
      clientTimeMs: 1050,
      clientTick: 6,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );

  const targetStates = second.sent.filter((message) => message.kind === "server.combat.state");
  assert.deepEqual(targetStates.at(-1), {
    kind: "server.combat.state",
    serverTick: 6,
    sessionId: 2,
    entityId: 2,
    health: 0,
    maxHealth: 100,
    alive: false,
    deathTick: 6,
    respawnEligibleTick: 9,
    lastEventKind: COMBAT_EVENT_KIND.death,
    lastEventTick: 6,
    lastEventSequence: 3,
    sourceSessionId: 1,
    targetSessionId: 2,
    damage: 50
  });
});

test("server runtime broadcasts authoritative match stats when a kill is confirmed", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    weapon: TEST_WEAPON_CONFIG,
    now: () => 1000
  });
  const first = createFakeTransportSession("stats-a");
  const second = createFakeTransportSession("stats-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }
  runtime.step(5, 1016);

  // No kill has happened yet, so no stat line has been broadcast.
  assert.equal(first.sent.some((message) => message.kind === "server.match.stats"), false);
  assert.equal(second.sent.some((message) => message.kind === "server.match.stats"), false);

  // First hit only wounds; the lethal hit lands the next tick (fire cadence blocks same-tick
  // re-fire). Only the lethal shot publishes stats.
  first.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1041,
      clientTick: 5,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  assert.equal(first.sent.some((message) => message.kind === "server.match.stats"), false);

  runtime.step(6, 1020);
  first.receive(
    createClientFireIntent({
      sequence: 2,
      clientTimeMs: 1042,
      clientTick: 6,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );

  assert.equal(second.sent.filter((message) => message.kind === "server.combat.state").at(-1).alive, false);

  const expectedStats = {
    kind: "server.match.stats",
    serverTick: 6,
    entryCount: 2,
    entries: [
      { sessionId: 1, kills: 1, deaths: 0 },
      { sessionId: 2, kills: 0, deaths: 1 }
    ]
  };

  // Exactly one broadcast (on the lethal shot, not the first wounding hit) reaches every session.
  const firstStats = first.sent.filter((message) => message.kind === "server.match.stats");
  const secondStats = second.sent.filter((message) => message.kind === "server.match.stats");
  assert.equal(firstStats.length, 1);
  assert.equal(secondStats.length, 1);
  assert.deepEqual(firstStats[0], expectedStats);
  assert.deepEqual(secondStats[0], expectedStats);
  assert.deepEqual(runtime.getMatchStats(6), expectedStats);
});

test("server runtime declares the match when a side wins the round target", () => {
  // killTarget here is the round-win target: first side to win one round wins the match.
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    weapon: TEST_WEAPON_CONFIG,
    matchKillTarget: 1,
    now: () => 1000
  });
  const first = createFakeTransportSession("matchend-a");
  const second = createFakeTransportSession("matchend-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }
  // Session 1 lands on Cops (slot 0), session 2 on Robbers (slot 1).
  runtime.step(5, 1016);

  // No round resolved yet: the match is not over.
  assert.equal(first.sent.some((message) => message.kind === "server.match.result"), false);
  assert.equal(runtime.getMatchResult(5).matchOver, false);

  // First hit wounds; lethal hit lands next tick (fire cadence blocks same-tick re-fire).
  first.receive(
    createClientFireIntent({ sequence: 1, clientTimeMs: 1041, clientTick: 5, yaw: -Math.PI / 2, pitch: 0 })
  );
  runtime.step(6, 1020);
  first.receive(
    createClientFireIntent({ sequence: 2, clientTimeMs: 1042, clientTick: 6, yaw: -Math.PI / 2, pitch: 0 })
  );
  // The Robber is now dead; the next tick resolves the round (Cops win) and the match.
  runtime.step(7, 1024);

  const expectedResult = {
    kind: "server.match.result",
    serverTick: 7,
    matchOver: true,
    winnerSessionId: 1,
    killTarget: 1
  };
  const firstResults = first.sent.filter((message) => message.kind === "server.match.result");
  const secondResults = second.sent.filter((message) => message.kind === "server.match.result");
  assert.equal(firstResults.length, 1);
  assert.equal(secondResults.length, 1);
  assert.deepEqual(firstResults[0], expectedResult);
  assert.deepEqual(secondResults[0], expectedResult);
  assert.deepEqual(runtime.getMatchResult(7), expectedResult);
});

test("server runtime pays the server-owned economy from kills and round results", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    weapon: TEST_WEAPON_CONFIG,
    now: () => 1000
  });
  const first = createFakeTransportSession("econ-a");
  const second = createFakeTransportSession("econ-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({ kind: "protocol.hello", protocolVersion: PROTOCOL_VERSION, clientName: transport.session.id });
  }

  // Each player is seeded with starting money, sent privately to the owner.
  assert.equal(runtime.getEconomy(1)?.money, DEFAULT_STARTING_MONEY);
  assert.equal(runtime.getEconomy(2)?.money, DEFAULT_STARTING_MONEY);
  const firstEconomy = first.sent.filter((message) => message.kind === "server.player.economy");
  assert.equal(firstEconomy.at(-1)?.sessionId, 1);

  runtime.step(5, 1016);
  // Session 1 (Cops) eliminates session 2 (Robbers) over two ticks.
  first.receive(createClientFireIntent({ sequence: 1, clientTimeMs: 1041, clientTick: 5, yaw: -Math.PI / 2, pitch: 0 }));
  runtime.step(6, 1020);
  first.receive(createClientFireIntent({ sequence: 2, clientTimeMs: 1042, clientTick: 6, yaw: -Math.PI / 2, pitch: 0 }));

  // The kill credits the killer immediately.
  assert.equal(runtime.getEconomy(1)?.money, DEFAULT_STARTING_MONEY + DEFAULT_KILL_REWARD);

  // The next tick resolves the round: Cops win the round bonus, Robbers the loss bonus.
  runtime.step(7, 1024);
  assert.equal(runtime.getEconomy(1)?.money, DEFAULT_STARTING_MONEY + DEFAULT_KILL_REWARD + DEFAULT_ROUND_WIN_BONUS);
  assert.equal(runtime.getEconomy(2)?.money, DEFAULT_STARTING_MONEY + DEFAULT_ROUND_LOSS_BONUS);
});

test("server runtime broadcasts an authoritative roster on join, loadout, leave, and round reset", () => {
  const runtime = createServerRuntime({
    tickRateHz: 2,
    matchCapacity: 2,
    round: {
      setupDurationTicks: 1,
      activeDurationTicks: 2,
      resetDurationTicks: 1
    },
    weapon: TEST_WEAPON_CONFIG,
    now: () => 1000
  });
  const first = createFakeTransportSession("roster-a");
  const second = createFakeTransportSession("roster-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }

  // Both assigned sessions appear, sorted by slot index, each with a distinct handle and the
  // default weapon. Callsigns never cross the wire — only numeric handle ids do.
  assert.deepEqual(runtime.getMatchRoster(0), {
    kind: "server.match.roster",
    serverTick: 0,
    entryCount: 2,
    entries: [
      { sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
      { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 1 }
    ]
  });

  // An accepted loadout selection rebroadcasts the roster with the new server-owned weapon.
  first.receive({
    kind: "client.loadout.select",
    sequence: 1,
    profileId: LOADOUT_PROFILE_ID.cinder
  });
  assert.deepEqual(first.sent.filter((message) => message.kind === "server.match.roster").at(-1).entries, [
    { sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.cinder, slotIndex: 0 },
    { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 1 }
  ]);

  // A round reset returns every player to the default weapon and rebroadcasts to all sessions.
  const rosterCountBeforeReset = first.sent.filter((message) => message.kind === "server.match.roster").length;
  runtime.step(1, 1000); // setup -> active
  runtime.step(3, 1100); // active -> ended (timeout)
  runtime.step(4, 1200); // ended -> reset
  assert.equal(runtime.getRoundState(4).phase, ROUND_PHASE.reset);
  const afterReset = first.sent.filter((message) => message.kind === "server.match.roster");
  assert.ok(afterReset.length > rosterCountBeforeReset);
  assert.deepEqual(afterReset.at(-1).entries, [
    { sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
    { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 1 }
  ]);

  // Disconnecting frees the slot and rebroadcasts the shrunken roster to the survivor.
  first.session.close();
  assert.deepEqual(second.sent.filter((message) => message.kind === "server.match.roster").at(-1).entries, [
    { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 1 }
  ]);
  assert.deepEqual(runtime.getMatchRoster(4).entries, [
    { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 1 }
  ]);
});

test("server runtime ignores a duplicate hello and keeps authoritative combat and input state", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    weapon: TEST_WEAPON_CONFIG,
    now: () => 1000
  });
  const first = createFakeTransportSession("rehello-a");
  const second = createFakeTransportSession("rehello-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }
  runtime.step(5, 1016);

  first.receive({
    kind: "client.input",
    sequence: 7,
    clientTimeMs: 1020,
    buttons: 0,
    yaw: 0,
    pitch: 0
  });
  // Two hits across consecutive ticks drop the target; same-tick re-fire is impossible.
  first.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1041,
      clientTick: 5,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  runtime.step(6, 1024);
  first.receive(
    createClientFireIntent({
      sequence: 2,
      clientTimeMs: 1042,
      clientTick: 6,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );

  assert.equal(runtime.getCombatState(2, 6).alive, false);
  assert.equal(runtime.getCombatState(2, 6).health, 0);
  assert.equal(runtime.getCombatState(2, 6).respawnEligibleTick, 9);
  const inputStateBefore = runtime.getSessionInputState("rehello-a");
  assert.equal(inputStateBefore.lastAcceptedInputSequence, 7);

  // A hostile or buggy duplicate hello over the already-accepted transports must be a no-op.
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }

  // The dead player stays dead with its respawn timer intact (no free revive/heal).
  assert.equal(runtime.getCombatState(2, 6).alive, false);
  assert.equal(runtime.getCombatState(2, 6).health, 0);
  assert.equal(runtime.getCombatState(2, 6).respawnEligibleTick, 9);
  // Input sequencing is not reset, so old input sequences cannot be replayed.
  assert.deepEqual(runtime.getSessionInputState("rehello-a"), inputStateBefore);
  // The duplicate hello emits no second accept / match assignment.
  assert.equal(first.sent.filter((message) => message.kind === "protocol.accept").length, 1);
  assert.equal(first.sent.filter((message) => message.kind === "match.assigned").length, 1);
});

test("server runtime gates dead movement, fire, and targeting until server respawn reset", () => {
  const runtime = createServerRuntime({
    tickRateHz: 2,
    matchCapacity: 2,
    round: {
      setupDurationTicks: 1,
      activeDurationTicks: 20,
      resetDurationTicks: 2
    },
    weapon: TEST_WEAPON_CONFIG,
    now: () => 1000
  });
  const first = createFakeTransportSession("gate-a");
  const second = createFakeTransportSession("gate-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }
  runtime.step(1, 1000);
  runtime.step(5, 1016);

  // Two hits across consecutive active ticks drop the target; the round is still active when
  // the lethal shot lands, so elimination is only detected by the next server tick.
  first.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1031,
      clientTick: 5,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  runtime.step(6, 1020);
  first.receive(
    createClientFireIntent({
      sequence: 2,
      clientTimeMs: 1032,
      clientTick: 6,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  assert.equal(second.sent.filter((message) => message.kind === "server.combat.state").at(-1).alive, false);

  const deadSnapshot = runtime.getWorldSnapshot(7).entities.find((entity) => entity.sessionId === 2);
  second.receive({
    kind: "client.input",
    sequence: 9,
    clientTimeMs: 1100,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  });
  runtime.step(7, 1100);
  const afterDeadMove = runtime.getWorldSnapshot(7).entities.find((entity) => entity.sessionId === 2);
  assert.deepEqual(afterDeadMove, deadSnapshot);

  second.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1110,
      clientTick: 7,
      yaw: Math.PI / 2,
      pitch: 0
    })
  );
  assert.equal(second.sent.filter((message) => message.kind === "server.fire.result").at(-1).rejectReason, FIRE_REJECT_REASON.roundInactive);

  first.receive(
    createClientFireIntent({
      sequence: 3,
      clientTimeMs: 1120,
      clientTick: 7,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  assert.deepEqual(first.sent.filter((message) => message.kind === "server.fire.result").at(-1), {
    kind: "server.fire.result",
    sequence: 3,
    sessionId: 1,
    serverTick: 7,
    accepted: false,
    hit: false,
    targetEntityId: 0,
    targetSessionId: 0,
    distance: 0,
    rejectReason: FIRE_REJECT_REASON.roundInactive
  });

  runtime.step(9, 1200);
  assert.equal(second.sent.filter((message) => message.kind === "server.combat.state").at(-1).alive, true);
  assert.equal(runtime.getRoundState(9).phase, ROUND_PHASE.reset);
  runtime.step(10, 1210);
  runtime.step(11, 1220);
  first.receive(
    createClientFireIntent({
      sequence: 4,
      clientTimeMs: 1230,
      clientTick: 11,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  assert.equal(first.sent.filter((message) => message.kind === "server.fire.result").at(-1).hit, true);
  assert.equal(second.sent.filter((message) => message.kind === "server.combat.state").at(-1).health, 50);
});

test("server runtime validates loadout selection only for accepted assigned sessions", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    now: () => 1000
  });
  const transport = createFakeTransportSession("loadout-a");

  runtime.attachSession(transport.session);
  transport.receive({
    kind: "client.loadout.select",
    sequence: 1,
    profileId: LOADOUT_PROFILE_ID.halcyon
  });
  assert.deepEqual(transport.sent.at(-1), {
    kind: "server.loadout.state",
    serverTick: 0,
    sequence: 1,
    sessionId: 0,
    profileId: 0,
    status: LOADOUT_STATUS.rejected,
    rejectReason: LOADOUT_REJECT_REASON.notAccepted
  });

  transport.receive({
    kind: "protocol.hello",
    protocolVersion: PROTOCOL_VERSION,
    clientName: "loadout-client"
  });
  transport.receive({
    kind: "client.loadout.select",
    sequence: 2,
    profileId: 999
  });
  transport.receive({
    kind: "client.loadout.select",
    sequence: 2,
    profileId: LOADOUT_PROFILE_ID.halcyon
  });
  transport.receive({
    kind: "client.loadout.select",
    sequence: 3,
    profileId: LOADOUT_PROFILE_ID.halcyon
  });

  assert.deepEqual(
    transport.sent.filter((message) => message.kind === "server.loadout.state"),
    [
      {
        kind: "server.loadout.state",
        serverTick: 0,
        sequence: 1,
        sessionId: 0,
        profileId: 0,
        status: LOADOUT_STATUS.rejected,
        rejectReason: LOADOUT_REJECT_REASON.notAccepted
      },
      {
        kind: "server.loadout.state",
        serverTick: 0,
        sequence: 2,
        sessionId: 1,
        profileId: 0,
        status: LOADOUT_STATUS.rejected,
        rejectReason: LOADOUT_REJECT_REASON.invalidProfile
      },
      {
        kind: "server.loadout.state",
        serverTick: 0,
        sequence: 2,
        sessionId: 1,
        profileId: 0,
        status: LOADOUT_STATUS.rejected,
        rejectReason: LOADOUT_REJECT_REASON.staleSequence
      },
      {
        kind: "server.loadout.state",
        serverTick: 0,
        sequence: 3,
        sessionId: 1,
        profileId: LOADOUT_PROFILE_ID.halcyon,
        status: LOADOUT_STATUS.accepted,
        rejectReason: LOADOUT_REJECT_REASON.none
      }
    ]
  );
});

test("server runtime keeps empty rounds in setup so the first accepted session can select loadout", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    now: () => 1000
  });

  runtime.step(120, 1000);
  assert.equal(runtime.getRoundState(120).phase, ROUND_PHASE.setup);

  const transport = createFakeTransportSession("late-first-loadout");
  runtime.attachSession(transport.session);
  transport.receive({
    kind: "protocol.hello",
    protocolVersion: PROTOCOL_VERSION,
    clientName: "late-first-client"
  });
  transport.receive({
    kind: "client.loadout.select",
    sequence: 1,
    profileId: LOADOUT_PROFILE_ID.halcyon
  });

  assert.equal(
    transport.sent.filter((message) => message.kind === "server.loadout.state").at(-1).status,
    LOADOUT_STATUS.accepted
  );
});

test("server runtime serves authoritative weapon state across switch, fire, and reload", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    weapon: TEST_WEAPON_CONFIG,
    now: () => 1000
  });
  const first = createFakeTransportSession("weapon-a");
  const second = createFakeTransportSession("weapon-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }

  // Every assigned session starts with the default weapon at a full magazine.
  assert.deepEqual(first.sent.filter((message) => message.kind === "server.weapon.state").at(-1), {
    kind: "server.weapon.state",
    serverTick: 0,
    sessionId: 1,
    weaponProfileId: LOADOUT_PROFILE_ID.halcyon,
    ammoInMagazine: TEST_WEAPON_MAGAZINE,
    magazineSize: TEST_WEAPON_MAGAZINE,
    reloading: false,
    reloadCompleteTick: 0,
    lastEventKind: WEAPON_EVENT_KIND.assigned,
    lastEventSequence: 0
  });

  // Selecting a loadout during the setup phase swaps the server-owned weapon and refills it.
  first.receive({
    kind: "client.loadout.select",
    sequence: 1,
    profileId: LOADOUT_PROFILE_ID.cinder
  });
  const switched = first.sent.filter((message) => message.kind === "server.weapon.state").at(-1);
  assert.equal(switched.weaponProfileId, LOADOUT_PROFILE_ID.cinder);
  assert.equal(switched.ammoInMagazine, TEST_WEAPON_MAGAZINE);
  assert.equal(switched.lastEventKind, WEAPON_EVENT_KIND.switched);

  runtime.step(5, 1016);

  // An accepted fire consumes one round and reports the new authoritative magazine count.
  first.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1030,
      clientTick: 5,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  const fired = first.sent.filter((message) => message.kind === "server.weapon.state").at(-1);
  assert.equal(fired.ammoInMagazine, TEST_WEAPON_MAGAZINE - 1);
  assert.equal(fired.lastEventKind, WEAPON_EVENT_KIND.fired);
  assert.equal(fired.lastEventSequence, 1);

  // Loadout selection is locked once the round is active.
  first.receive({
    kind: "client.loadout.select",
    sequence: 2,
    profileId: LOADOUT_PROFILE_ID.halcyon
  });
  assert.equal(
    first.sent.filter((message) => message.kind === "server.loadout.state").at(-1).rejectReason,
    LOADOUT_REJECT_REASON.roundLocked
  );

  // A reload request flips the weapon into the reloading state with a server-owned completion tick.
  first.receive({ kind: "client.weapon.reload", sequence: 3 });
  const reloading = first.sent.filter((message) => message.kind === "server.weapon.state").at(-1);
  assert.equal(reloading.reloading, true);
  assert.equal(reloading.lastEventKind, WEAPON_EVENT_KIND.reloadStart);
  assert.equal(reloading.reloadCompleteTick, 5 + TEST_WEAPON_RELOAD_TICKS);

  // Advancing past the completion tick refills the magazine on the authoritative tick.
  runtime.step(5 + TEST_WEAPON_RELOAD_TICKS, 1020);
  const reloaded = first.sent.filter((message) => message.kind === "server.weapon.state").at(-1);
  assert.equal(reloaded.ammoInMagazine, TEST_WEAPON_MAGAZINE);
  assert.equal(reloaded.reloading, false);
  assert.equal(reloaded.lastEventKind, WEAPON_EVENT_KIND.reloadComplete);
});

test("server runtime owns round outcomes and rejects client activity outside active phase", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    round: {
      setupDurationTicks: 3,
      activeDurationTicks: 20,
      resetDurationTicks: 2
    },
    weapon: TEST_WEAPON_CONFIG,
    now: () => 1000
  });
  const first = createFakeTransportSession("round-a");
  const second = createFakeTransportSession("round-b");

  runtime.attachSession(first.session);
  runtime.attachSession(second.session);
  for (const transport of [first, second]) {
    transport.receive({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: transport.session.id
    });
  }

  first.receive({
    kind: "client.input",
    sequence: 1,
    clientTimeMs: 1000,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  });
  runtime.step(1, 1000);
  assert.equal(runtime.getWorldSnapshot(1).entities.find((entity) => entity.sessionId === 1).z, -16.5);

  first.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1010,
      clientTick: 1,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  assert.equal(first.sent.filter((message) => message.kind === "server.fire.result").at(-1).rejectReason, FIRE_REJECT_REASON.roundInactive);

  first.receive({
    kind: "server.round.state",
    serverTick: 1,
    roundId: 99,
    phase: ROUND_PHASE.ended,
    outcome: ROUND_OUTCOME.elimination,
    winnerSessionId: 2,
    phaseStartedTick: 1,
    phaseEndsTick: 1,
    resetReadyTick: 1,
    lastEventKind: 3,
    lastEventTick: 1,
    lastEventSequence: 99
  });
  assert.equal(runtime.getRoundState(1).phase, ROUND_PHASE.setup);
  assert.equal(runtime.getRoundState(1).winnerSessionId, 0);

  runtime.step(3, 1030);
  assert.equal(runtime.getRoundState(3).phase, ROUND_PHASE.active);
  first.receive({
    kind: "client.input",
    sequence: 2,
    clientTimeMs: 1040,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  });
  runtime.step(4, 1040);
  assert.equal(runtime.getWorldSnapshot(4).entities.find((entity) => entity.sessionId === 1).z < 0, true);

  // Drop session 2 with two hits across consecutive active ticks (same-tick re-fire is
  // impossible); the elimination is detected on the following server tick.
  first.receive(
    createClientFireIntent({
      sequence: 2,
      clientTimeMs: 1052,
      clientTick: 4,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  runtime.step(5, 1050);
  first.receive(
    createClientFireIntent({
      sequence: 3,
      clientTimeMs: 1053,
      clientTick: 5,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  runtime.step(6, 1060);
  assert.equal(runtime.getRoundState(6).phase, ROUND_PHASE.ended);
  assert.equal(runtime.getRoundState(6).outcome, ROUND_OUTCOME.elimination);
  assert.equal(runtime.getRoundState(6).winnerSessionId, 1);

  runtime.step(8, 1080);
  assert.equal(runtime.getRoundState(8).phase, ROUND_PHASE.reset);
  assert.equal(runtime.getCombatState(2, 8).alive, true);
  assert.deepEqual(runtime.getWorldSnapshot(8).entities.find((entity) => entity.sessionId === 1), {
    entityId: 1,
    sessionId: 1,
    slotIndex: 0,
    active: true,
    crouched: false,
    x: -4.5,
    y: 0,
    z: -16.5,
    yaw: 0
  });
});
