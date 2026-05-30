import assert from "node:assert/strict";
import test from "node:test";

import {
  CHARGE_PHASE,
  CLIENT_INPUT_BUTTONS,
  COMBAT_EVENT_KIND,
  FIRE_REJECT_REASON,
  LOADOUT_PROFILE_ID,
  LOADOUT_REJECT_REASON,
  LOADOUT_STATUS,
  PACKET_HEADER_LENGTH,
  PACKET_KIND,
  PACKET_MAGIC_BYTES,
  PROTOCOL_VERSION,
  ROUND_EVENT_KIND,
  ROUND_OUTCOME,
  ROUND_PHASE,
  SERVER_TICK_RATE_HZ,
  createClientFireIntent,
  createClientInputPlaceholder,
  createClientLoadoutSelect,
  createClientWeaponBuy,
  createServerSnapshotPlaceholder,
  decodeProtocolMessage,
  encodeProtocolMessage
} from "../packages/shared/dist/index.js";

function patchPacket(packet, mutate) {
  const copy = new Uint8Array(packet);
  mutate(copy);
  return copy;
}

test("binary protocol header uses magic bytes, version, kind, sequence/tick, payload length, and little-endian numbers", () => {
  const packet = encodeProtocolMessage({
    kind: "ping",
    sequence: 0x01020304,
    clientTimeMs: 100
  });
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);

  assert.equal(packet[0], PACKET_MAGIC_BYTES[0]);
  assert.equal(packet[1], PACKET_MAGIC_BYTES[1]);
  assert.equal(packet[2], PROTOCOL_VERSION);
  assert.equal(packet[3], PACKET_KIND.ping);
  assert.equal(view.getUint32(4, true), 0x01020304);
  assert.equal(view.getUint32(8, true), 8);
  assert.equal(packet.byteLength, PACKET_HEADER_LENGTH + 8);
});

test("protocol helpers round-trip every Phase 4 binary message", () => {
  const messages = [
    {
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: "phase-four-smoke"
    },
    {
      kind: "protocol.accept",
      protocolVersion: PROTOCOL_VERSION,
      serverTickRateHz: SERVER_TICK_RATE_HZ
    },
    {
      kind: "protocol.reject",
      protocolVersion: PROTOCOL_VERSION,
      reason: "Unsupported protocol version."
    },
    {
      kind: "ping",
      sequence: 1,
      clientTimeMs: 100
    },
    {
      kind: "pong",
      sequence: 1,
      clientTimeMs: 100,
      serverTimeMs: 110
    },
    createClientInputPlaceholder(2, 120),
    {
      kind: "server.tick",
      tick: 3,
      serverTimeMs: 130
    },
    createServerSnapshotPlaceholder(3, 130, 1)
  ];

  for (const message of messages) {
    assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(message)), message);
  }
});

test("protocol helpers round-trip Phase 6 match/session metadata messages", () => {
  assert.equal(PACKET_KIND.matchAssigned, 9);
  assert.equal(PACKET_KIND.matchUpdate, 10);

  const messages = [
    {
      kind: "match.assigned",
      matchId: 1,
      sessionId: 100,
      slotIndex: 2,
      capacity: 4,
      connectedSlots: 3
    },
    {
      kind: "match.update",
      matchId: 1,
      capacity: 4,
      connectedSlots: 2
    }
  ];

  for (const message of messages) {
    assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(message)), message);
  }
});

test("protocol helpers round-trip Phase 7 input acknowledgement messages", () => {
  assert.equal(PACKET_KIND.inputAck, 11);

  const message = {
    kind: "input.ack",
    sessionId: 12,
    lastAcceptedInputSequence: 44,
    droppedInputCount: 3
  };

  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(message)), message);
});

test("protocol helpers round-trip Phase 8 world snapshot metadata and entity references", () => {
  const message = {
    kind: "server.snapshot",
    tick: 8,
    serverTimeMs: 160,
    sessionCount: 2,
    worldId: 3,
    entityCount: 2,
    entities: [
      {
        entityId: 100,
        sessionId: 10,
        slotIndex: 0,
        active: true,
        crouched: false,
        x: 1.5,
        y: 0,
        z: -2.25,
        yaw: 0.75
      },
      {
        entityId: 101,
        sessionId: 11,
        slotIndex: 1,
        active: true,
        crouched: false,
        x: -1,
        y: 0,
        z: 3,
        yaw: -0.25
      }
    ]
  };

  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(message)), message);
});

test("protocol helpers round-trip a crouched snapshot entity stance flag", () => {
  const message = {
    kind: "server.snapshot",
    tick: 9,
    serverTimeMs: 200,
    sessionCount: 1,
    worldId: 1,
    entityCount: 1,
    entities: [
      {
        entityId: 100,
        sessionId: 10,
        slotIndex: 0,
        active: true,
        crouched: true,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0
      }
    ]
  };

  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(message)), message);
});

test("decodeProtocolMessage rejects malformed Phase 8 world snapshot entity counts", () => {
  const snapshot = encodeProtocolMessage({
    kind: "server.snapshot",
    tick: 8,
    serverTimeMs: 160,
    sessionCount: 1,
    worldId: 3,
    entityCount: 1,
    entities: [
      {
        entityId: 100,
        sessionId: 10,
        slotIndex: 0,
        active: true,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0
      }
    ]
  });
  const badEntityCount = patchPacket(snapshot, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH + 16, 2, true);
  });

  assert.throws(() => decodeProtocolMessage(badEntityCount), /entity count/i);
});

test("decodeProtocolMessage rejects malformed Phase 10 movement snapshot values", () => {
  assert.equal(CLIENT_INPUT_BUTTONS.forward, 1);

  const snapshot = encodeProtocolMessage({
    kind: "server.snapshot",
    tick: 10,
    serverTimeMs: 180,
    sessionCount: 1,
    worldId: 3,
    entityCount: 1,
    entities: [
      {
        entityId: 100,
        sessionId: 10,
        slotIndex: 0,
        active: true,
        x: 0,
        y: 0,
        z: 0,
        yaw: 0
      }
    ]
  });
  const badX = patchPacket(snapshot, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setFloat32(PACKET_HEADER_LENGTH + 18 + 12, Number.NaN, true);
  });

  assert.throws(() => decodeProtocolMessage(badX), /x must be finite/i);
});

test("protocol helpers round-trip Phase 15 fire intent and server fire result messages", () => {
  assert.equal(PACKET_KIND.clientFire, 12);
  assert.equal(PACKET_KIND.serverFireResult, 13);

  const messages = [
    createClientFireIntent({
      sequence: 9,
      clientTimeMs: 1234,
      clientTick: 42,
      yaw: -1.5,
      pitch: 0.125
    }),
    {
      kind: "server.fire.result",
      sequence: 9,
      sessionId: 1,
      serverTick: 44,
      accepted: true,
      hit: true,
      targetEntityId: 2,
      targetSessionId: 2,
      distance: 1.5,
      rejectReason: FIRE_REJECT_REASON.none
    },
    {
      kind: "server.fire.result",
      sequence: 10,
      sessionId: 1,
      serverTick: 45,
      accepted: false,
      hit: false,
      targetEntityId: 0,
      targetSessionId: 0,
      distance: 0,
      rejectReason: FIRE_REJECT_REASON.staleSequence
    }
  ];

  for (const message of messages) {
    assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(message)), message);
  }
});

test("decodeProtocolMessage rejects malformed Phase 15 fire packets", () => {
  const fire = encodeProtocolMessage(
    createClientFireIntent({
      sequence: 9,
      clientTimeMs: 1234,
      clientTick: 42,
      yaw: 0,
      pitch: 0
    })
  );
  const badPitch = patchPacket(fire, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setFloat32(PACKET_HEADER_LENGTH + 16, Number.NaN, true);
  });
  assert.throws(() => decodeProtocolMessage(badPitch), /pitch must be finite/i);

  const result = encodeProtocolMessage({
    kind: "server.fire.result",
    sequence: 9,
    sessionId: 1,
    serverTick: 44,
    accepted: true,
    hit: false,
    targetEntityId: 0,
    targetSessionId: 0,
    distance: 0,
    rejectReason: FIRE_REJECT_REASON.none
  });
  const badDistance = patchPacket(result, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setFloat32(PACKET_HEADER_LENGTH + 20, Number.NaN, true);
  });
  assert.throws(() => decodeProtocolMessage(badDistance), /distance must be finite/i);
});

test("protocol helpers round-trip Phase 16 combat state diagnostic messages", () => {
  assert.equal(PACKET_KIND.serverCombatState, 14);

  const message = {
    kind: "server.combat.state",
    serverTick: 20,
    sessionId: 2,
    entityId: 12,
    health: 75,
    maxHealth: 100,
    alive: true,
    deathTick: 0,
    respawnEligibleTick: 0,
    lastEventKind: COMBAT_EVENT_KIND.damage,
    lastEventTick: 20,
    lastEventSequence: 7,
    sourceSessionId: 1,
    targetSessionId: 2,
    damage: 25
  };

  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(message)), message);
});

test("decodeProtocolMessage rejects malformed Phase 16 combat state packets", () => {
  const state = encodeProtocolMessage({
    kind: "server.combat.state",
    serverTick: 20,
    sessionId: 2,
    entityId: 12,
    health: 75,
    maxHealth: 100,
    alive: true,
    deathTick: 0,
    respawnEligibleTick: 0,
    lastEventKind: COMBAT_EVENT_KIND.damage,
    lastEventTick: 20,
    lastEventSequence: 7,
    sourceSessionId: 1,
    targetSessionId: 2,
    damage: 25
  });
  const badEventKind = patchPacket(state, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH + 14, 99, true);
  });
  assert.throws(() => decodeProtocolMessage(badEventKind), /combat event kind/i);

  const badLength = patchPacket(state, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint32(8, 8, true);
  });
  assert.throws(() => decodeProtocolMessage(badLength), /Packet length mismatch/);
});

test("protocol helpers round-trip Phase 17 loadout selection and server state messages", () => {
  assert.equal(PACKET_KIND.clientLoadoutSelect, 15);
  assert.equal(PACKET_KIND.serverLoadoutState, 16);

  const messages = [
    createClientLoadoutSelect({
      sequence: 4,
      profileId: LOADOUT_PROFILE_ID.halcyon
    }),
    {
      kind: "server.loadout.state",
      serverTick: 10,
      sequence: 4,
      sessionId: 7,
      profileId: LOADOUT_PROFILE_ID.halcyon,
      status: LOADOUT_STATUS.accepted,
      rejectReason: LOADOUT_REJECT_REASON.none
    },
    {
      kind: "server.loadout.state",
      serverTick: 11,
      sequence: 5,
      sessionId: 7,
      profileId: 0,
      status: LOADOUT_STATUS.rejected,
      rejectReason: LOADOUT_REJECT_REASON.invalidProfile
    }
  ];

  for (const message of messages) {
    assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(message)), message);
  }
});

test("decodeProtocolMessage rejects malformed Phase 17 loadout packets", () => {
  const select = encodeProtocolMessage(
    createClientLoadoutSelect({
      sequence: 4,
      profileId: LOADOUT_PROFILE_ID.halcyon
    })
  );
  const badClientProfile = patchPacket(select, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH, 99, true);
  });
  assert.throws(() => decodeProtocolMessage(badClientProfile), /loadout profile/i);

  const state = encodeProtocolMessage({
    kind: "server.loadout.state",
    serverTick: 10,
    sequence: 4,
    sessionId: 7,
    profileId: LOADOUT_PROFILE_ID.halcyon,
    status: LOADOUT_STATUS.accepted,
    rejectReason: LOADOUT_REJECT_REASON.none
  });
  const badStatus = patchPacket(state, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH + 10, 99, true);
  });
  assert.throws(() => decodeProtocolMessage(badStatus), /loadout status/i);

  const badRejectReason = patchPacket(state, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH + 12, 99, true);
  });
  assert.throws(() => decodeProtocolMessage(badRejectReason), /loadout reject reason/i);
});

test("protocol helpers round-trip Phase 18 round state diagnostics", () => {
  assert.equal(PACKET_KIND.serverRoundState, 17);

  const message = {
    kind: "server.round.state",
    serverTick: 30,
    roundId: 2,
    phase: ROUND_PHASE.ended,
    outcome: ROUND_OUTCOME.elimination,
    winnerSessionId: 7,
    phaseStartedTick: 25,
    phaseEndsTick: 25,
    resetReadyTick: 28,
    lastEventKind: ROUND_EVENT_KIND.ended,
    lastEventTick: 25,
    lastEventSequence: 9
  };

  const encoded = encodeProtocolMessage(message);
  const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
  assert.equal(view.getUint32(8, true), 36);
  assert.deepEqual(decodeProtocolMessage(encoded), message);
});

test("decodeProtocolMessage rejects malformed Phase 18 round state packets", () => {
  const state = encodeProtocolMessage({
    kind: "server.round.state",
    serverTick: 30,
    roundId: 2,
    phase: ROUND_PHASE.active,
    outcome: ROUND_OUTCOME.none,
    winnerSessionId: 0,
    phaseStartedTick: 20,
    phaseEndsTick: 80,
    resetReadyTick: 0,
    lastEventKind: ROUND_EVENT_KIND.active,
    lastEventTick: 20,
    lastEventSequence: 5
  });

  const badPhase = patchPacket(state, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH + 4, 99, true);
  });
  assert.throws(() => decodeProtocolMessage(badPhase), /round phase/i);

  const badOutcome = patchPacket(state, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH + 6, 99, true);
  });
  assert.throws(() => decodeProtocolMessage(badOutcome), /round outcome/i);

  const badEvent = patchPacket(state, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH + 24, 99, true);
  });
  assert.throws(() => decodeProtocolMessage(badEvent), /round event kind/i);

  const badLength = patchPacket(state, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint32(8, 8, true);
  });
  assert.throws(() => decodeProtocolMessage(badLength), /Packet length mismatch/);
});

test("protocol helpers round-trip match stats messages", () => {
  assert.equal(PACKET_KIND.serverMatchStats, 18);

  const message = {
    kind: "server.match.stats",
    serverTick: 50,
    entryCount: 2,
    entries: [
      { sessionId: 1, kills: 3, deaths: 1 },
      { sessionId: 2, kills: 1, deaths: 3 }
    ]
  };

  const encoded = encodeProtocolMessage(message);
  const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
  assert.equal(encoded[3], PACKET_KIND.serverMatchStats);
  assert.equal(view.getUint32(8, true), 4 + 2 * 12);
  assert.deepEqual(decodeProtocolMessage(encoded), message);

  const empty = {
    kind: "server.match.stats",
    serverTick: 0,
    entryCount: 0,
    entries: []
  };
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(empty)), empty);
});

test("decodeProtocolMessage rejects malformed match stats packets", () => {
  const stats = encodeProtocolMessage({
    kind: "server.match.stats",
    serverTick: 50,
    entryCount: 2,
    entries: [
      { sessionId: 1, kills: 3, deaths: 1 },
      { sessionId: 2, kills: 1, deaths: 3 }
    ]
  });

  const badEntryCount = patchPacket(stats, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH, 3, true);
  });
  assert.throws(() => decodeProtocolMessage(badEntryCount), /entry count/i);

  const badLength = patchPacket(stats, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint32(8, 8, true);
  });
  assert.throws(() => decodeProtocolMessage(badLength), /Packet length mismatch/);
});

test("protocol helpers round-trip match roster messages", () => {
  assert.equal(PACKET_KIND.serverMatchRoster, 21);

  const message = {
    kind: "server.match.roster",
    serverTick: 90,
    entryCount: 2,
    entries: [
      { sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
      { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.ridgeline, slotIndex: 1 }
    ]
  };

  const encoded = encodeProtocolMessage(message);
  const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
  assert.equal(encoded[3], PACKET_KIND.serverMatchRoster);
  assert.equal(view.getUint32(8, true), 4 + 2 * 12);
  assert.deepEqual(decodeProtocolMessage(encoded), message);

  const empty = {
    kind: "server.match.roster",
    serverTick: 0,
    entryCount: 0,
    entries: []
  };
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(empty)), empty);

  const unequipped = {
    kind: "server.match.roster",
    serverTick: 12,
    entryCount: 1,
    entries: [{ sessionId: 7, handleId: 3, weaponProfileId: 0, slotIndex: 4 }]
  };
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(unequipped)), unequipped);
});

test("decodeProtocolMessage rejects malformed match roster packets", () => {
  const roster = encodeProtocolMessage({
    kind: "server.match.roster",
    serverTick: 90,
    entryCount: 2,
    entries: [
      { sessionId: 1, handleId: 1, weaponProfileId: LOADOUT_PROFILE_ID.halcyon, slotIndex: 0 },
      { sessionId: 2, handleId: 2, weaponProfileId: LOADOUT_PROFILE_ID.ridgeline, slotIndex: 1 }
    ]
  });

  const badEntryCount = patchPacket(roster, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH, 3, true);
  });
  assert.throws(() => decodeProtocolMessage(badEntryCount), /entry count/i);

  const badProfile = patchPacket(roster, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint16(PACKET_HEADER_LENGTH + 4 + 6, 99, true);
  });
  assert.throws(() => decodeProtocolMessage(badProfile), /loadout profile id/i);

  const badLength = patchPacket(roster, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint32(8, 8, true);
  });
  assert.throws(() => decodeProtocolMessage(badLength), /Packet length mismatch/);
});

test("protocol helpers round-trip the Phase 57 server match result message", () => {
  assert.equal(PACKET_KIND.serverMatchResult, 22);

  const decided = {
    kind: "server.match.result",
    serverTick: 240,
    matchOver: true,
    winnerSessionId: 3,
    killTarget: 4,
    copsRoundWins: 4,
    robbersRoundWins: 2
  };
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(decided)), decided);

  const pending = {
    kind: "server.match.result",
    serverTick: 12,
    matchOver: false,
    winnerSessionId: 0,
    killTarget: 4,
    copsRoundWins: 1,
    robbersRoundWins: 0
  };
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(pending)), pending);
});

test("protocol helpers round-trip a server player economy message", () => {
  assert.equal(PACKET_KIND.serverPlayerEconomy, 23);

  const economy = {
    kind: "server.player.economy",
    serverTick: 240,
    sessionId: 4,
    money: 3650
  };
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(economy)), economy);

  const empty = { kind: "server.player.economy", serverTick: 1, sessionId: 1, money: 0 };
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(empty)), empty);
});

test("protocol helpers round-trip a client weapon buy request", () => {
  assert.equal(PACKET_KIND.clientWeaponBuy, 24);

  const buy = createClientWeaponBuy({ sequence: 9, profileId: LOADOUT_PROFILE_ID.vantage });
  assert.deepEqual(buy, { kind: "client.weapon.buy", sequence: 9, profileId: LOADOUT_PROFILE_ID.vantage });
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(buy)), buy);
});

test("protocol helpers round-trip a server objective state message", () => {
  assert.equal(PACKET_KIND.serverObjectiveState, 25);

  const armed = {
    kind: "server.objective.state",
    serverTick: 900,
    chargePhase: CHARGE_PHASE.planted,
    plantProgress: 180,
    defuseProgress: 75,
    detonationTick: 3000
  };
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(armed)), armed);

  const idle = {
    kind: "server.objective.state",
    serverTick: 1,
    chargePhase: CHARGE_PHASE.idle,
    plantProgress: 0,
    defuseProgress: 0,
    detonationTick: 0
  };
  assert.deepEqual(decodeProtocolMessage(encodeProtocolMessage(idle)), idle);
});

test("decodeProtocolMessage rejects an unknown charge phase", () => {
  const packet = encodeProtocolMessage({
    kind: "server.objective.state",
    serverTick: 5,
    chargePhase: CHARGE_PHASE.idle,
    plantProgress: 0,
    defuseProgress: 0,
    detonationTick: 0
  });
  const corrupted = patchPacket(packet, (bytes) => {
    bytes[PACKET_HEADER_LENGTH] = 9; // first payload byte = charge phase
  });
  assert.throws(() => decodeProtocolMessage(corrupted), /charge phase/i);
});

test("decodeProtocolMessage rejects malformed Phase 7 input acknowledgement packets", () => {
  assert.equal(PACKET_KIND.inputAck, 11);

  const ack = encodeProtocolMessage({
    kind: "input.ack",
    sessionId: 12,
    lastAcceptedInputSequence: 44,
    droppedInputCount: 3
  });
  const badLength = patchPacket(ack, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint32(8, 4, true);
  });

  assert.throws(() => decodeProtocolMessage(badLength), /Packet length mismatch/);
});

test("decodeProtocolMessage rejects malformed Phase 6 match packets", () => {
  assert.equal(PACKET_KIND.matchAssigned, 9);

  const assigned = encodeProtocolMessage({
    kind: "match.assigned",
    matchId: 1,
    sessionId: 100,
    slotIndex: 0,
    capacity: 4,
    connectedSlots: 1
  });
  const badLength = patchPacket(assigned, (packet) => {
    const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    view.setUint32(8, 2, true);
  });

  assert.throws(() => decodeProtocolMessage(badLength), /Packet length mismatch/);
});

test("decodeProtocolMessage rejects malformed packets", () => {
  assert.throws(() => decodeProtocolMessage(new Uint8Array([1, 2, 3])), /Packet too short/);

  const badMagic = patchPacket(
    encodeProtocolMessage({
      kind: "ping",
      sequence: 1,
      clientTimeMs: 100
    }),
    (packet) => {
      packet[0] = 0;
    }
  );
  assert.throws(() => decodeProtocolMessage(badMagic), /Invalid packet magic/);

  const badLength = patchPacket(
    encodeProtocolMessage({
      kind: "server.tick",
      tick: 3,
      serverTimeMs: 130
    }),
    (packet) => {
      const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
      view.setUint32(8, 99, true);
    }
  );
  assert.throws(() => decodeProtocolMessage(badLength), /Packet length mismatch/);
});

test("decodeProtocolMessage rejects unsupported protocol versions except hello for server rejection", () => {
  const unsupportedHello = patchPacket(
    encodeProtocolMessage({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: "old-client"
    }),
    (packet) => {
      packet[2] = 255;
    }
  );

  assert.deepEqual(decodeProtocolMessage(unsupportedHello), {
    kind: "protocol.hello",
    protocolVersion: 255,
    clientName: "old-client"
  });

  const unsupportedPing = patchPacket(
    encodeProtocolMessage({
      kind: "ping",
      sequence: 1,
      clientTimeMs: 100
    }),
    (packet) => {
      packet[2] = 255;
    }
  );
  assert.throws(() => decodeProtocolMessage(unsupportedPing), /Unsupported protocol version/);
});

test("decodeProtocolMessage rejects unknown packet kinds", () => {
  const packet = patchPacket(
    encodeProtocolMessage({
      kind: "ping",
      sequence: 1,
      clientTimeMs: 100
    }),
    (bytes) => {
      bytes[3] = 250;
    }
  );

  assert.throws(() => decodeProtocolMessage(packet), /Unknown packet kind/);
});
