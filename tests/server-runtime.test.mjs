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
  createClientFireIntent
} from "../packages/shared/dist/index.js";
import { createServerRuntime } from "../apps/server/dist/index.js";

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
      "match.update",
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
    capacity: 4,
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
        x: 0,
        y: 0,
        z: 0,
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
    "match.update",
    "match.update"
  ]);
  assert.deepEqual(second.sent.map((message) => message.kind), [
    "protocol.accept",
    "match.assigned",
    "server.combat.state",
    "match.update"
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
          x: 0,
          y: 0,
          z: 0,
          yaw: 0
        },
        {
          entityId: 2,
          sessionId: 2,
          slotIndex: 1,
          active: true,
          x: 2.75,
          y: 0,
          z: 0,
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
        x: 2.75,
        y: 0,
        z: 0,
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
    x: 0,
    y: 0,
    z: 0,
    yaw: 0
  });
  assert.deepEqual(afterStale, stationary);
  assert.deepEqual(afterInvalid, stationary);
  assert.equal(afterValid.z < stationary.z, true);
  assert.equal(afterValid.x, 0);
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
  assert.equal(entity.x, 0);
  assert.equal(Math.abs(entity.z + 0.25) < 0.000001, true);
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

  assert.deepEqual(first.sent.at(-1), {
    kind: "server.fire.result",
    sequence: 1,
    sessionId: 1,
    serverTick: 5,
    accepted: true,
    hit: true,
    targetEntityId: 2,
    targetSessionId: 2,
    distance: 2.75,
    rejectReason: FIRE_REJECT_REASON.none
  });
  assert.equal(second.sent.some((message) => message.kind === "server.fire.result"), false);
});

test("server runtime applies combat damage only from accepted server-owned fire results", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
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

  first.receive(
    createClientFireIntent({
      sequence: 2,
      clientTimeMs: 1040,
      clientTick: 5,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  first.receive(
    createClientFireIntent({
      sequence: 3,
      clientTimeMs: 1050,
      clientTick: 5,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );

  const targetStates = second.sent.filter((message) => message.kind === "server.combat.state");
  assert.deepEqual(targetStates.at(-1), {
    kind: "server.combat.state",
    serverTick: 5,
    sessionId: 2,
    entityId: 2,
    health: 0,
    maxHealth: 100,
    alive: false,
    deathTick: 5,
    respawnEligibleTick: 8,
    lastEventKind: COMBAT_EVENT_KIND.death,
    lastEventTick: 5,
    lastEventSequence: 3,
    sourceSessionId: 1,
    targetSessionId: 2,
    damage: 50
  });
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

  for (const sequence of [1, 2]) {
    first.receive(
      createClientFireIntent({
        sequence,
        clientTimeMs: 1030 + sequence,
        clientTick: 5,
        yaw: -Math.PI / 2,
        pitch: 0
      })
    );
  }
  assert.equal(second.sent.filter((message) => message.kind === "server.combat.state").at(-1).alive, false);

  const deadSnapshot = runtime.getWorldSnapshot(6).entities.find((entity) => entity.sessionId === 2);
  second.receive({
    kind: "client.input",
    sequence: 9,
    clientTimeMs: 1100,
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  });
  runtime.step(6, 1100);
  const afterDeadMove = runtime.getWorldSnapshot(6).entities.find((entity) => entity.sessionId === 2);
  assert.deepEqual(afterDeadMove, deadSnapshot);

  second.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1110,
      clientTick: 6,
      yaw: Math.PI / 2,
      pitch: 0
    })
  );
  assert.equal(second.sent.filter((message) => message.kind === "server.fire.result").at(-1).rejectReason, FIRE_REJECT_REASON.roundInactive);

  first.receive(
    createClientFireIntent({
      sequence: 3,
      clientTimeMs: 1120,
      clientTick: 6,
      yaw: -Math.PI / 2,
      pitch: 0
    })
  );
  assert.deepEqual(first.sent.filter((message) => message.kind === "server.fire.result").at(-1), {
    kind: "server.fire.result",
    sequence: 3,
    sessionId: 1,
    serverTick: 6,
    accepted: false,
    hit: false,
    targetEntityId: 0,
    targetSessionId: 0,
    distance: 0,
    rejectReason: FIRE_REJECT_REASON.roundInactive
  });

  runtime.step(8, 1200);
  assert.equal(second.sent.filter((message) => message.kind === "server.combat.state").at(-1).alive, true);
  assert.equal(runtime.getRoundState(8).phase, ROUND_PHASE.reset);
  runtime.step(9, 1210);
  runtime.step(10, 1220);
  first.receive(
    createClientFireIntent({
      sequence: 4,
      clientTimeMs: 1230,
      clientTick: 10,
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
    profileId: LOADOUT_PROFILE_ID.baseline
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
    profileId: LOADOUT_PROFILE_ID.baseline
  });
  transport.receive({
    kind: "client.loadout.select",
    sequence: 3,
    profileId: LOADOUT_PROFILE_ID.baseline
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
        profileId: LOADOUT_PROFILE_ID.baseline,
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
    profileId: LOADOUT_PROFILE_ID.baseline
  });

  assert.equal(
    transport.sent.filter((message) => message.kind === "server.loadout.state").at(-1).status,
    LOADOUT_STATUS.accepted
  );
});

test("server runtime applies loadout-owned combat defaults only after accepted selection", () => {
  const runtime = createServerRuntime({
    tickRateHz: 20,
    matchCapacity: 2,
    now: () => 1000
  });
  const first = createFakeTransportSession("loadout-combat-a");
  const second = createFakeTransportSession("loadout-combat-b");

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
    kind: "client.loadout.select",
    sequence: 1,
    profileId: LOADOUT_PROFILE_ID.baseline
  });
  assert.equal(first.sent.filter((message) => message.kind === "server.loadout.state").at(-1).status, LOADOUT_STATUS.accepted);
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
  assert.equal(second.sent.filter((message) => message.kind === "server.combat.state").at(-1).health, 75);

  second.receive({
    kind: "client.loadout.select",
    sequence: 1,
    profileId: 999
  });
  assert.equal(second.sent.filter((message) => message.kind === "server.loadout.state").at(-1).rejectReason, LOADOUT_REJECT_REASON.roundLocked);
  second.receive(
    createClientFireIntent({
      sequence: 1,
      clientTimeMs: 1040,
      clientTick: 5,
      yaw: Math.PI / 2,
      pitch: 0
    })
  );
  assert.equal(first.sent.filter((message) => message.kind === "server.combat.state").at(-1).health, 50);
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
  assert.equal(runtime.getWorldSnapshot(1).entities.find((entity) => entity.sessionId === 1).z, 0);

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

  for (const sequence of [2, 3]) {
    first.receive(
      createClientFireIntent({
        sequence,
        clientTimeMs: 1050 + sequence,
        clientTick: 4,
        yaw: -Math.PI / 2,
        pitch: 0
      })
    );
  }
  runtime.step(5, 1050);
  assert.equal(runtime.getRoundState(5).phase, ROUND_PHASE.ended);
  assert.equal(runtime.getRoundState(5).outcome, ROUND_OUTCOME.elimination);
  assert.equal(runtime.getRoundState(5).winnerSessionId, 1);

  runtime.step(7, 1070);
  assert.equal(runtime.getRoundState(7).phase, ROUND_PHASE.reset);
  assert.equal(runtime.getCombatState(2, 7).alive, true);
  assert.deepEqual(runtime.getWorldSnapshot(7).entities.find((entity) => entity.sessionId === 1), {
    entityId: 1,
    sessionId: 1,
    slotIndex: 0,
    active: true,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0
  });
});
