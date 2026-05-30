export const PROTOCOL_VERSION = 2 as const;
export const SERVER_TICK_RATE_HZ = 60 as const;

export const PACKET_MAGIC_BYTES = [0x42, 0x4c] as const;
export const PACKET_HEADER_LENGTH = 12 as const;
export const PACKET_BYTE_ORDER = "little-endian" as const;

export const CLIENT_INPUT_BUTTONS = {
  forward: 1 << 0,
  backward: 1 << 1,
  left: 1 << 2,
  right: 1 << 3,
  jump: 1 << 4,
  crouch: 1 << 5,
  use: 1 << 6
} as const;

export const PACKET_KIND = {
  protocolHello: 1,
  protocolAccept: 2,
  protocolReject: 3,
  ping: 4,
  pong: 5,
  clientInput: 6,
  serverTick: 7,
  serverSnapshot: 8,
  matchAssigned: 9,
  matchUpdate: 10,
  inputAck: 11,
  clientFire: 12,
  serverFireResult: 13,
  serverCombatState: 14,
  clientLoadoutSelect: 15,
  serverLoadoutState: 16,
  serverRoundState: 17,
  serverMatchStats: 18,
  clientWeaponReload: 19,
  serverWeaponState: 20,
  serverMatchRoster: 21,
  serverMatchResult: 22,
  serverPlayerEconomy: 23,
  clientWeaponBuy: 24,
  serverObjectiveState: 25,
  clientAdminCommand: 26,
  serverAdminResult: 27,
  clientArmorBuy: 28,
  serverPlayerArmor: 29,
  clientGrenadeThrow: 30,
  clientGrenadeBuy: 31,
  serverPlayerGrenade: 32,
  serverGrenadeState: 33,
  serverMatchMap: 34
} as const;

export const FIRE_REJECT_REASON = {
  none: 0,
  notAccepted: 1,
  noMatchAssignment: 2,
  noActiveEntity: 3,
  staleSequence: 4,
  invalidAim: 5,
  sourceDead: 6,
  roundInactive: 7,
  outOfAmmo: 8,
  reloading: 9,
  weaponCooldown: 10
} as const;

export const WEAPON_EVENT_KIND = {
  none: 0,
  assigned: 1,
  fired: 2,
  reloadStart: 3,
  reloadComplete: 4,
  switched: 5,
  reset: 6
} as const;

export const COMBAT_EVENT_KIND = {
  none: 0,
  damage: 1,
  death: 2,
  respawn: 3,
  reset: 4
} as const;

export const LOADOUT_PROFILE_ID = {
  ridgeline: 1,
  halcyon: 2,
  cinder: 3,
  maul: 4,
  vantage: 5
} as const;

export const LOADOUT_STATUS = {
  unselected: 0,
  accepted: 1,
  rejected: 2
} as const;

export const LOADOUT_REJECT_REASON = {
  none: 0,
  notAccepted: 1,
  noMatchAssignment: 2,
  invalidProfile: 3,
  staleSequence: 4,
  alreadySelected: 5,
  roundLocked: 6
} as const;

export const ROUND_PHASE = {
  setup: 1,
  active: 2,
  ended: 3,
  reset: 4
} as const;

export const ROUND_OUTCOME = {
  none: 0,
  elimination: 1,
  timeout: 2,
  detonation: 3,
  defuse: 4
} as const;

// The breach charge's lifecycle within a round. Idle until a Robber arms it;
// once planted it counts down to detonation unless a Cop completes a defuse.
export const CHARGE_PHASE = {
  idle: 0,
  planted: 1,
  defused: 2,
  detonated: 3
} as const;

export const ROUND_EVENT_KIND = {
  none: 0,
  setup: 1,
  active: 2,
  ended: 3,
  reset: 4
} as const;

const FIRE_RESULT_FLAGS = {
  accepted: 1 << 0,
  hit: 1 << 1
} as const;

const COMBAT_STATE_FLAGS = {
  alive: 1 << 0
} as const;

const WEAPON_STATE_FLAGS = {
  reloading: 1 << 0
} as const;

export type ProtocolVersion = typeof PROTOCOL_VERSION;
export type ServerTickRateHz = number;
export type FireRejectReason = (typeof FIRE_REJECT_REASON)[keyof typeof FIRE_REJECT_REASON];
export type WeaponEventKind = (typeof WEAPON_EVENT_KIND)[keyof typeof WEAPON_EVENT_KIND];
export type CombatEventKind = (typeof COMBAT_EVENT_KIND)[keyof typeof COMBAT_EVENT_KIND];
export type LoadoutProfileId = (typeof LOADOUT_PROFILE_ID)[keyof typeof LOADOUT_PROFILE_ID];
export type LoadoutStatus = (typeof LOADOUT_STATUS)[keyof typeof LOADOUT_STATUS];
export type LoadoutRejectReason = (typeof LOADOUT_REJECT_REASON)[keyof typeof LOADOUT_REJECT_REASON];
export type RoundPhase = (typeof ROUND_PHASE)[keyof typeof ROUND_PHASE];
export type RoundOutcome = (typeof ROUND_OUTCOME)[keyof typeof ROUND_OUTCOME];
export type ChargePhase = (typeof CHARGE_PHASE)[keyof typeof CHARGE_PHASE];
export type RoundEventKind = (typeof ROUND_EVENT_KIND)[keyof typeof ROUND_EVENT_KIND];

export type ClientProtocolMessage =
  | ProtocolHelloMessage
  | PingMessage
  | ClientInputMessage
  | ClientFireIntentMessage
  | ClientLoadoutSelectMessage
  | ClientWeaponReloadMessage
  | ClientWeaponBuyMessage
  | ClientArmorBuyMessage
  | ClientGrenadeThrowMessage
  | ClientGrenadeBuyMessage
  | ClientAdminCommandMessage;

export type ServerProtocolMessage =
  | ProtocolAcceptMessage
  | ProtocolRejectMessage
  | PongMessage
  | ServerTickMessage
  | ServerSnapshotMessage
  | MatchAssignedMessage
  | MatchUpdateMessage
  | InputAckMessage
  | ServerFireResultMessage
  | ServerCombatStateMessage
  | ServerLoadoutStateMessage
  | ServerWeaponStateMessage
  | ServerRoundStateMessage
  | ServerMatchStatsMessage
  | ServerMatchRosterMessage
  | ServerMatchResultMessage
  | ServerPlayerEconomyMessage
  | ServerObjectiveStateMessage
  | ServerAdminResultMessage
  | ServerPlayerArmorMessage
  | ServerPlayerGrenadeMessage
  | ServerGrenadeStateMessage
  | ServerMatchMapMessage;

export type ProtocolMessage = ClientProtocolMessage | ServerProtocolMessage;

export type ReliableControlMessage = Exclude<
  ProtocolMessage,
  ClientInputMessage | ClientFireIntentMessage | ServerSnapshotMessage
>;

export type ProtocolHelloMessage = Readonly<{
  kind: "protocol.hello";
  protocolVersion: number;
  clientName: string;
}>;

export type ProtocolAcceptMessage = Readonly<{
  kind: "protocol.accept";
  protocolVersion: ProtocolVersion;
  serverTickRateHz: ServerTickRateHz;
}>;

export type ProtocolRejectMessage = Readonly<{
  kind: "protocol.reject";
  protocolVersion: ProtocolVersion;
  reason: string;
}>;

export type PingMessage = Readonly<{
  kind: "ping";
  sequence: number;
  clientTimeMs: number;
}>;

export type PongMessage = Readonly<{
  kind: "pong";
  sequence: number;
  clientTimeMs: number;
  serverTimeMs: number;
}>;

export type ServerTickMessage = Readonly<{
  kind: "server.tick";
  tick: number;
  serverTimeMs: number;
}>;

export type ClientInputMessage = Readonly<{
  kind: "client.input";
  sequence: number;
  clientTimeMs: number;
  buttons: number;
  yaw: number;
  pitch: number;
}>;

export type ClientFireIntentMessage = Readonly<{
  kind: "client.fire";
  sequence: number;
  clientTimeMs: number;
  clientTick: number;
  yaw: number;
  pitch: number;
}>;

export type ClientLoadoutSelectMessage = Readonly<{
  kind: "client.loadout.select";
  sequence: number;
  profileId: LoadoutProfileId;
}>;

export type ClientWeaponReloadMessage = Readonly<{
  kind: "client.weapon.reload";
  sequence: number;
}>;

// A buy-menu purchase request. The server validates the buy window, the weapon, and
// affordability against the server-owned economy before granting it.
export type ClientWeaponBuyMessage = Readonly<{
  kind: "client.weapon.buy";
  sequence: number;
  profileId: LoadoutProfileId;
}>;

export type ServerFireResultMessage = Readonly<{
  kind: "server.fire.result";
  sequence: number;
  sessionId: number;
  serverTick: number;
  accepted: boolean;
  hit: boolean;
  targetEntityId: number;
  targetSessionId: number;
  distance: number;
  rejectReason: FireRejectReason;
}>;

export type ServerCombatStateMessage = Readonly<{
  kind: "server.combat.state";
  serverTick: number;
  sessionId: number;
  entityId: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  deathTick: number;
  respawnEligibleTick: number;
  lastEventKind: CombatEventKind;
  lastEventTick: number;
  lastEventSequence: number;
  sourceSessionId: number;
  targetSessionId: number;
  damage: number;
}>;

export type ServerLoadoutStateMessage = Readonly<{
  kind: "server.loadout.state";
  serverTick: number;
  sequence: number;
  sessionId: number;
  profileId: LoadoutProfileId | 0;
  status: LoadoutStatus;
  rejectReason: LoadoutRejectReason;
}>;

export type ServerWeaponStateMessage = Readonly<{
  kind: "server.weapon.state";
  serverTick: number;
  sessionId: number;
  weaponProfileId: LoadoutProfileId | 0;
  ammoInMagazine: number;
  magazineSize: number;
  reloading: boolean;
  reloadCompleteTick: number;
  lastEventKind: WeaponEventKind;
  lastEventSequence: number;
}>;

export type ServerRoundStateMessage = Readonly<{
  kind: "server.round.state";
  serverTick: number;
  roundId: number;
  phase: RoundPhase;
  outcome: RoundOutcome;
  winnerSessionId: number;
  phaseStartedTick: number;
  phaseEndsTick: number;
  resetReadyTick: number;
  lastEventKind: RoundEventKind;
  lastEventTick: number;
  lastEventSequence: number;
}>;

export type MatchStatsEntry = Readonly<{
  sessionId: number;
  kills: number;
  deaths: number;
}>;

export type ServerMatchStatsMessage = Readonly<{
  kind: "server.match.stats";
  serverTick: number;
  entryCount: number;
  entries: readonly MatchStatsEntry[];
}>;

export type MatchRosterEntry = Readonly<{
  sessionId: number;
  handleId: number;
  weaponProfileId: LoadoutProfileId | 0;
  slotIndex: number;
  // Server-authoritative display name (sanitized). Empty means "fall back to pool callsign".
  name: string;
}>;

// Roster wire layout: 12 fixed bytes + a fixed 16-byte UTF-8 name field per entry.
export const ROSTER_NAME_FIELD_BYTES = 16 as const;
export const ROSTER_ENTRY_BYTES = 28 as const;

export type ServerMatchRosterMessage = Readonly<{
  kind: "server.match.roster";
  serverTick: number;
  entryCount: number;
  entries: readonly MatchRosterEntry[];
}>;

export type ServerMatchResultMessage = Readonly<{
  kind: "server.match.result";
  serverTick: number;
  matchOver: boolean;
  winnerSessionId: number;
  killTarget: number;
  copsRoundWins: number;
  robbersRoundWins: number;
}>;

// A player's own money. Sent only to the owning session (you never see enemy cash).
export type ServerPlayerEconomyMessage = Readonly<{
  kind: "server.player.economy";
  serverTick: number;
  sessionId: number;
  money: number;
}>;

// The breach charge's authoritative state, broadcast to everyone. Progress fields
// are raw accrued ticks (compare against PLANT_DURATION_TICKS / DEFUSE_DURATION_TICKS);
// detonationTick is the server tick at which an armed charge blows (0 when idle).
export type ServerObjectiveStateMessage = Readonly<{
  kind: "server.objective.state";
  serverTick: number;
  chargePhase: ChargePhase;
  plantProgress: number;
  defuseProgress: number;
  detonationTick: number;
}>;

// A raw admin console command line, sent by a client. The server parses, authorizes (only
// host-granted sessions), validates, and applies it — the client is a dumb terminal.
export type ClientAdminCommandMessage = Readonly<{
  kind: "client.admin.command";
  sequence: number;
  text: string;
}>;

// The server's reply to an admin command, sent only to the requesting session.
export type ServerAdminResultMessage = Readonly<{
  kind: "server.admin.result";
  serverTick: number;
  ok: boolean;
  text: string;
}>;

// A player's request to buy armor. Server-validated like a weapon buy (buy window, alive,
// affordable, not already full).
export type ClientArmorBuyMessage = Readonly<{
  kind: "client.armor.buy";
  sequence: number;
}>;

// A player's own armor, sent only to the owning session (private, like money).
export type ServerPlayerArmorMessage = Readonly<{
  kind: "server.player.armor";
  serverTick: number;
  sessionId: number;
  armor: number;
  maxArmor: number;
}>;

// Throw a held grenade along the aim direction.
export type ClientGrenadeThrowMessage = Readonly<{
  kind: "client.grenade.throw";
  sequence: number;
  yaw: number;
  pitch: number;
}>;

// Buy a grenade. Server-validated like the other buys.
export type ClientGrenadeBuyMessage = Readonly<{
  kind: "client.grenade.buy";
  sequence: number;
}>;

// How many grenades a player holds, sent only to the owner (private).
export type ServerPlayerGrenadeMessage = Readonly<{
  kind: "server.player.grenade";
  serverTick: number;
  sessionId: number;
  count: number;
  maxCount: number;
}>;

export type GrenadeStateEntry = Readonly<{
  id: number;
  x: number;
  y: number;
  z: number;
  fuseTicks: number;
  detonated: boolean;
}>;

// The live grenades in the world, broadcast to everyone so clients render the projectile
// and its detonation. A detonated entry appears for the single tick it blows.
export type ServerGrenadeStateMessage = Readonly<{
  kind: "server.grenade.state";
  serverTick: number;
  entryCount: number;
  entries: readonly GrenadeStateEntry[];
}>;

// Which arena this match runs, sent to each session on accept so the client renders the
// matching map (and uses its collision geometry for prediction).
export type ServerMatchMapMessage = Readonly<{
  kind: "server.match.map";
  serverTick: number;
  mapId: string;
}>;

export type ServerSnapshotMessage = Readonly<{
  kind: "server.snapshot";
  tick: number;
  serverTimeMs: number;
  sessionCount: number;
  worldId: number;
  entityCount: number;
  entities: readonly SnapshotEntityReference[];
}>;

export const SNAPSHOT_ENTITY_FLAGS = {
  active: 1 << 0,
  crouched: 1 << 1
} as const;

export type SnapshotEntityReference = Readonly<{
  entityId: number;
  sessionId: number;
  slotIndex: number;
  active: boolean;
  crouched: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
}>;

export type WorldSnapshotMetadata = Readonly<{
  worldId: number;
  tick: number;
  entityCount: number;
  entities: readonly SnapshotEntityReference[];
}>;

export type MatchAssignedMessage = Readonly<{
  kind: "match.assigned";
  matchId: number;
  sessionId: number;
  slotIndex: number;
  capacity: number;
  connectedSlots: number;
}>;

export type MatchUpdateMessage = Readonly<{
  kind: "match.update";
  matchId: number;
  capacity: number;
  connectedSlots: number;
}>;

export type InputAckMessage = Readonly<{
  kind: "input.ack";
  sessionId: number;
  lastAcceptedInputSequence: number;
  droppedInputCount: number;
}>;

export type ProtocolPacket = Uint8Array;
export type ProtocolPacketInput = ArrayBuffer | ArrayBufferView;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", {
  fatal: true
});

export function createClientInputPlaceholder(sequence: number, clientTimeMs: number): ClientInputMessage {
  return {
    kind: "client.input",
    sequence,
    clientTimeMs,
    buttons: 0,
    yaw: 0,
    pitch: 0
  };
}

export function createClientFireIntent(input: Omit<ClientFireIntentMessage, "kind">): ClientFireIntentMessage {
  return {
    kind: "client.fire",
    sequence: input.sequence,
    clientTimeMs: input.clientTimeMs,
    clientTick: input.clientTick,
    yaw: input.yaw,
    pitch: input.pitch
  };
}

export function createClientLoadoutSelect(input: Omit<ClientLoadoutSelectMessage, "kind">): ClientLoadoutSelectMessage {
  return {
    kind: "client.loadout.select",
    sequence: input.sequence,
    profileId: readRequiredLoadoutProfileId(input.profileId)
  };
}

export function createClientWeaponReload(input: Omit<ClientWeaponReloadMessage, "kind">): ClientWeaponReloadMessage {
  return {
    kind: "client.weapon.reload",
    sequence: readUint32(input.sequence, "sequence")
  };
}

export function createClientWeaponBuy(input: Omit<ClientWeaponBuyMessage, "kind">): ClientWeaponBuyMessage {
  return {
    kind: "client.weapon.buy",
    sequence: readUint32(input.sequence, "sequence"),
    profileId: readRequiredLoadoutProfileId(input.profileId)
  };
}

export const MAX_ADMIN_COMMAND_LENGTH = 200 as const;

export function createClientAdminCommand(input: Omit<ClientAdminCommandMessage, "kind">): ClientAdminCommandMessage {
  return {
    kind: "client.admin.command",
    sequence: readUint32(input.sequence, "sequence"),
    text: String(input.text ?? "").slice(0, MAX_ADMIN_COMMAND_LENGTH)
  };
}

export function createClientArmorBuy(input: Omit<ClientArmorBuyMessage, "kind">): ClientArmorBuyMessage {
  return {
    kind: "client.armor.buy",
    sequence: readUint32(input.sequence, "sequence")
  };
}

export function createClientGrenadeThrow(input: Omit<ClientGrenadeThrowMessage, "kind">): ClientGrenadeThrowMessage {
  return {
    kind: "client.grenade.throw",
    sequence: readUint32(input.sequence, "sequence"),
    yaw: readFiniteNumber(input.yaw, "yaw"),
    pitch: readFiniteNumber(input.pitch, "pitch")
  };
}

export function createClientGrenadeBuy(input: Omit<ClientGrenadeBuyMessage, "kind">): ClientGrenadeBuyMessage {
  return {
    kind: "client.grenade.buy",
    sequence: readUint32(input.sequence, "sequence")
  };
}

export function createServerSnapshotPlaceholder(
  tick: number,
  serverTimeMs: number,
  sessionCount: number,
  worldSnapshot?: WorldSnapshotMetadata
): ServerSnapshotMessage {
  const entities = worldSnapshot?.entities ?? [];
  return {
    kind: "server.snapshot",
    tick,
    serverTimeMs,
    sessionCount,
    worldId: worldSnapshot?.worldId ?? 0,
    entityCount: worldSnapshot?.entityCount ?? entities.length,
    entities
  };
}

export function encodeProtocolMessage(message: ProtocolMessage): ProtocolPacket {
  switch (message.kind) {
    case "protocol.hello":
      return writePacket(
        PACKET_KIND.protocolHello,
        readPacketVersion(message.protocolVersion),
        0,
        encodeStringPayload(message.clientName)
      );
    case "protocol.accept":
      return writePacket(PACKET_KIND.protocolAccept, PROTOCOL_VERSION, 0, encodeAcceptPayload(message));
    case "protocol.reject":
      return writePacket(PACKET_KIND.protocolReject, PROTOCOL_VERSION, 0, encodeStringPayload(message.reason));
    case "ping":
      return writePacket(PACKET_KIND.ping, PROTOCOL_VERSION, readUint32(message.sequence, "sequence"), encodePingPayload(message));
    case "pong":
      return writePacket(PACKET_KIND.pong, PROTOCOL_VERSION, readUint32(message.sequence, "sequence"), encodePongPayload(message));
    case "client.input":
      return writePacket(
        PACKET_KIND.clientInput,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        encodeClientInputPayload(message)
      );
    case "client.fire":
      return writePacket(
        PACKET_KIND.clientFire,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        encodeClientFirePayload(message)
      );
    case "client.loadout.select":
      return writePacket(
        PACKET_KIND.clientLoadoutSelect,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        encodeClientLoadoutSelectPayload(message)
      );
    case "client.weapon.reload":
      return writePacket(
        PACKET_KIND.clientWeaponReload,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        new Uint8Array(0)
      );
    case "client.weapon.buy":
      return writePacket(
        PACKET_KIND.clientWeaponBuy,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        encodeClientWeaponBuyPayload(message)
      );
    case "server.tick":
      return writePacket(
        PACKET_KIND.serverTick,
        PROTOCOL_VERSION,
        readUint32(message.tick, "tick"),
        encodeServerTimePayload(message.serverTimeMs)
      );
    case "server.snapshot":
      return writePacket(
        PACKET_KIND.serverSnapshot,
        PROTOCOL_VERSION,
        readUint32(message.tick, "tick"),
        encodeServerSnapshotPayload(message)
      );
    case "match.assigned":
      return writePacket(PACKET_KIND.matchAssigned, PROTOCOL_VERSION, 0, encodeMatchAssignedPayload(message));
    case "match.update":
      return writePacket(PACKET_KIND.matchUpdate, PROTOCOL_VERSION, 0, encodeMatchUpdatePayload(message));
    case "input.ack":
      return writePacket(PACKET_KIND.inputAck, PROTOCOL_VERSION, 0, encodeInputAckPayload(message));
    case "server.fire.result":
      return writePacket(
        PACKET_KIND.serverFireResult,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        encodeServerFireResultPayload(message)
      );
    case "server.combat.state":
      return writePacket(
        PACKET_KIND.serverCombatState,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerCombatStatePayload(message)
      );
    case "server.loadout.state":
      return writePacket(
        PACKET_KIND.serverLoadoutState,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerLoadoutStatePayload(message)
      );
    case "server.weapon.state":
      return writePacket(
        PACKET_KIND.serverWeaponState,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerWeaponStatePayload(message)
      );
    case "server.round.state":
      return writePacket(
        PACKET_KIND.serverRoundState,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerRoundStatePayload(message)
      );
    case "server.match.stats":
      return writePacket(
        PACKET_KIND.serverMatchStats,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerMatchStatsPayload(message)
      );
    case "server.match.roster":
      return writePacket(
        PACKET_KIND.serverMatchRoster,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerMatchRosterPayload(message)
      );
    case "server.match.result":
      return writePacket(
        PACKET_KIND.serverMatchResult,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerMatchResultPayload(message)
      );
    case "server.player.economy":
      return writePacket(
        PACKET_KIND.serverPlayerEconomy,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerPlayerEconomyPayload(message)
      );
    case "server.objective.state":
      return writePacket(
        PACKET_KIND.serverObjectiveState,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerObjectiveStatePayload(message)
      );
    case "client.admin.command":
      return writePacket(
        PACKET_KIND.clientAdminCommand,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        encodeStringPayload(message.text)
      );
    case "server.admin.result":
      return writePacket(
        PACKET_KIND.serverAdminResult,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerAdminResultPayload(message)
      );
    case "client.armor.buy":
      return writePacket(
        PACKET_KIND.clientArmorBuy,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        new Uint8Array(0)
      );
    case "server.player.armor":
      return writePacket(
        PACKET_KIND.serverPlayerArmor,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerPlayerArmorPayload(message)
      );
    case "client.grenade.throw":
      return writePacket(
        PACKET_KIND.clientGrenadeThrow,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        encodeClientGrenadeThrowPayload(message)
      );
    case "client.grenade.buy":
      return writePacket(
        PACKET_KIND.clientGrenadeBuy,
        PROTOCOL_VERSION,
        readUint32(message.sequence, "sequence"),
        new Uint8Array(0)
      );
    case "server.player.grenade":
      return writePacket(
        PACKET_KIND.serverPlayerGrenade,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerPlayerGrenadePayload(message)
      );
    case "server.grenade.state":
      return writePacket(
        PACKET_KIND.serverGrenadeState,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeServerGrenadeStatePayload(message)
      );
    case "server.match.map":
      return writePacket(
        PACKET_KIND.serverMatchMap,
        PROTOCOL_VERSION,
        readUint32(message.serverTick, "serverTick"),
        encodeStringPayload(message.mapId)
      );
  }
}

export function decodeProtocolMessage(input: ProtocolPacketInput): ProtocolMessage {
  const bytes = readPacketInput(input);
  if (bytes.byteLength < PACKET_HEADER_LENGTH) {
    throw new Error(`Packet too short: ${bytes.byteLength} bytes.`);
  }

  if (bytes[0] !== PACKET_MAGIC_BYTES[0] || bytes[1] !== PACKET_MAGIC_BYTES[1]) {
    throw new Error("Invalid packet magic.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = bytes[2];
  const packetKind = bytes[3];
  const sequenceOrTick = view.getUint32(4, true);
  const payloadLength = view.getUint32(8, true);

  if (bytes.byteLength !== PACKET_HEADER_LENGTH + payloadLength) {
    throw new Error(
      `Packet length mismatch: header declares ${payloadLength} payload bytes, packet has ${
        bytes.byteLength - PACKET_HEADER_LENGTH
      }.`
    );
  }

  if (version !== PROTOCOL_VERSION && packetKind !== PACKET_KIND.protocolHello) {
    throw new Error(`Unsupported protocol version: ${version}.`);
  }

  const payload = new DataView(bytes.buffer, bytes.byteOffset + PACKET_HEADER_LENGTH, payloadLength);
  const payloadBytes = new Uint8Array(bytes.buffer, bytes.byteOffset + PACKET_HEADER_LENGTH, payloadLength);

  switch (packetKind) {
    case PACKET_KIND.protocolHello:
      return {
        kind: "protocol.hello",
        protocolVersion: version,
        clientName: decodeStringPayload(payloadBytes)
      };
    case PACKET_KIND.protocolAccept:
      requirePayloadLength(payloadLength, 2, "protocol.accept");
      return {
        kind: "protocol.accept",
        protocolVersion: PROTOCOL_VERSION,
        serverTickRateHz: payload.getUint16(0, true)
      };
    case PACKET_KIND.protocolReject:
      return {
        kind: "protocol.reject",
        protocolVersion: PROTOCOL_VERSION,
        reason: decodeStringPayload(payloadBytes)
      };
    case PACKET_KIND.ping:
      requirePayloadLength(payloadLength, 8, "ping");
      return {
        kind: "ping",
        sequence: sequenceOrTick,
        clientTimeMs: payload.getFloat64(0, true)
      };
    case PACKET_KIND.pong:
      requirePayloadLength(payloadLength, 16, "pong");
      return {
        kind: "pong",
        sequence: sequenceOrTick,
        clientTimeMs: payload.getFloat64(0, true),
        serverTimeMs: payload.getFloat64(8, true)
      };
    case PACKET_KIND.clientInput:
      requirePayloadLength(payloadLength, 20, "client.input");
      return {
        kind: "client.input",
        sequence: sequenceOrTick,
        clientTimeMs: readFiniteNumber(payload.getFloat64(0, true), "clientTimeMs"),
        buttons: payload.getUint32(8, true),
        yaw: readFiniteNumber(payload.getFloat32(12, true), "yaw"),
        pitch: readFiniteNumber(payload.getFloat32(16, true), "pitch")
      };
    case PACKET_KIND.clientFire:
      requirePayloadLength(payloadLength, 20, "client.fire");
      return {
        kind: "client.fire",
        sequence: sequenceOrTick,
        clientTimeMs: readFiniteNumber(payload.getFloat64(0, true), "clientTimeMs"),
        clientTick: payload.getUint32(8, true),
        yaw: readFiniteNumber(payload.getFloat32(12, true), "yaw"),
        pitch: readFiniteNumber(payload.getFloat32(16, true), "pitch")
      };
    case PACKET_KIND.clientLoadoutSelect:
      requirePayloadLength(payloadLength, 4, "client.loadout.select");
      return {
        kind: "client.loadout.select",
        sequence: sequenceOrTick,
        profileId: readRequiredLoadoutProfileId(payload.getUint16(0, true))
      };
    case PACKET_KIND.clientWeaponReload:
      requirePayloadLength(payloadLength, 0, "client.weapon.reload");
      return {
        kind: "client.weapon.reload",
        sequence: sequenceOrTick
      };
    case PACKET_KIND.clientWeaponBuy:
      requirePayloadLength(payloadLength, 4, "client.weapon.buy");
      return {
        kind: "client.weapon.buy",
        sequence: sequenceOrTick,
        profileId: readRequiredLoadoutProfileId(payload.getUint16(0, true))
      };
    case PACKET_KIND.serverTick:
      requirePayloadLength(payloadLength, 8, "server.tick");
      return {
        kind: "server.tick",
        tick: sequenceOrTick,
        serverTimeMs: payload.getFloat64(0, true)
      };
    case PACKET_KIND.serverSnapshot:
      requireServerSnapshotPayloadLength(payloadLength);
      return {
        kind: "server.snapshot",
        tick: sequenceOrTick,
        serverTimeMs: readFiniteNumber(payload.getFloat64(0, true), "serverTimeMs"),
        sessionCount: payload.getUint32(8, true),
        worldId: payload.getUint32(12, true),
        entityCount: payload.getUint16(16, true),
        entities: decodeSnapshotEntities(payload, payloadLength)
      };
    case PACKET_KIND.matchAssigned:
      requirePayloadLength(payloadLength, 14, "match.assigned");
      return {
        kind: "match.assigned",
        matchId: payload.getUint32(0, true),
        sessionId: payload.getUint32(4, true),
        slotIndex: payload.getUint16(8, true),
        capacity: payload.getUint16(10, true),
        connectedSlots: payload.getUint16(12, true)
      };
    case PACKET_KIND.matchUpdate:
      requirePayloadLength(payloadLength, 8, "match.update");
      return {
        kind: "match.update",
        matchId: payload.getUint32(0, true),
        capacity: payload.getUint16(4, true),
        connectedSlots: payload.getUint16(6, true)
      };
    case PACKET_KIND.inputAck:
      requirePayloadLength(payloadLength, 12, "input.ack");
      return {
        kind: "input.ack",
        sessionId: payload.getUint32(0, true),
        lastAcceptedInputSequence: payload.getUint32(4, true),
        droppedInputCount: payload.getUint32(8, true)
      };
    case PACKET_KIND.serverFireResult:
      requirePayloadLength(payloadLength, 24, "server.fire.result");
      return {
        kind: "server.fire.result",
        sequence: sequenceOrTick,
        sessionId: payload.getUint32(0, true),
        serverTick: payload.getUint32(4, true),
        accepted: (payload.getUint16(8, true) & FIRE_RESULT_FLAGS.accepted) !== 0,
        hit: (payload.getUint16(8, true) & FIRE_RESULT_FLAGS.hit) !== 0,
        rejectReason: readFireRejectReason(payload.getUint16(10, true)),
        targetEntityId: payload.getUint32(12, true),
        targetSessionId: payload.getUint32(16, true),
        distance: readFiniteNumber(payload.getFloat32(20, true), "distance")
      };
    case PACKET_KIND.serverCombatState:
      requirePayloadLength(payloadLength, 44, "server.combat.state");
      return {
        kind: "server.combat.state",
        serverTick: sequenceOrTick,
        sessionId: payload.getUint32(0, true),
        entityId: payload.getUint32(4, true),
        health: payload.getUint16(8, true),
        maxHealth: payload.getUint16(10, true),
        alive: (payload.getUint16(12, true) & COMBAT_STATE_FLAGS.alive) !== 0,
        lastEventKind: readCombatEventKind(payload.getUint16(14, true)),
        deathTick: payload.getUint32(16, true),
        respawnEligibleTick: payload.getUint32(20, true),
        lastEventTick: payload.getUint32(24, true),
        lastEventSequence: payload.getUint32(28, true),
        sourceSessionId: payload.getUint32(32, true),
        targetSessionId: payload.getUint32(36, true),
        damage: payload.getUint32(40, true)
      };
    case PACKET_KIND.serverLoadoutState:
      requirePayloadLength(payloadLength, 16, "server.loadout.state");
      return {
        kind: "server.loadout.state",
        serverTick: sequenceOrTick,
        sessionId: payload.getUint32(0, true),
        sequence: payload.getUint32(4, true),
        profileId: readLoadoutProfileId(payload.getUint16(8, true), true),
        status: readLoadoutStatus(payload.getUint16(10, true)),
        rejectReason: readLoadoutRejectReason(payload.getUint16(12, true))
      };
    case PACKET_KIND.serverWeaponState:
      requirePayloadLength(payloadLength, 24, "server.weapon.state");
      return {
        kind: "server.weapon.state",
        serverTick: sequenceOrTick,
        sessionId: payload.getUint32(0, true),
        weaponProfileId: readLoadoutProfileId(payload.getUint16(4, true), true),
        ammoInMagazine: payload.getUint16(6, true),
        magazineSize: payload.getUint16(8, true),
        reloading: (payload.getUint16(10, true) & WEAPON_STATE_FLAGS.reloading) !== 0,
        lastEventKind: readWeaponEventKind(payload.getUint16(12, true)),
        reloadCompleteTick: payload.getUint32(16, true),
        lastEventSequence: payload.getUint32(20, true)
      };
    case PACKET_KIND.serverRoundState:
      requirePayloadLength(payloadLength, 36, "server.round.state");
      return {
        kind: "server.round.state",
        serverTick: sequenceOrTick,
        roundId: payload.getUint32(0, true),
        phase: readRoundPhase(payload.getUint16(4, true)),
        outcome: readRoundOutcome(payload.getUint16(6, true)),
        winnerSessionId: payload.getUint32(8, true),
        phaseStartedTick: payload.getUint32(12, true),
        phaseEndsTick: payload.getUint32(16, true),
        resetReadyTick: payload.getUint32(20, true),
        lastEventKind: readRoundEventKind(payload.getUint16(24, true)),
        lastEventTick: payload.getUint32(28, true),
        lastEventSequence: payload.getUint32(32, true)
      };
    case PACKET_KIND.serverMatchStats:
      requireServerMatchStatsPayloadLength(payloadLength);
      return {
        kind: "server.match.stats",
        serverTick: sequenceOrTick,
        entryCount: payload.getUint16(0, true),
        entries: decodeMatchStatsEntries(payload, payloadLength)
      };
    case PACKET_KIND.serverMatchRoster:
      requireServerMatchRosterPayloadLength(payloadLength);
      return {
        kind: "server.match.roster",
        serverTick: sequenceOrTick,
        entryCount: payload.getUint16(0, true),
        entries: decodeMatchRosterEntries(payload, payloadLength)
      };
    case PACKET_KIND.serverMatchResult:
      requirePayloadLength(payloadLength, 12, "server.match.result");
      return {
        kind: "server.match.result",
        serverTick: sequenceOrTick,
        winnerSessionId: payload.getUint32(0, true),
        killTarget: payload.getUint16(4, true),
        matchOver: payload.getUint16(6, true) !== 0,
        copsRoundWins: payload.getUint16(8, true),
        robbersRoundWins: payload.getUint16(10, true)
      };
    case PACKET_KIND.serverPlayerEconomy:
      requirePayloadLength(payloadLength, 8, "server.player.economy");
      return {
        kind: "server.player.economy",
        serverTick: sequenceOrTick,
        sessionId: payload.getUint32(0, true),
        money: payload.getUint32(4, true)
      };
    case PACKET_KIND.serverObjectiveState:
      requirePayloadLength(payloadLength, 9, "server.objective.state");
      return {
        kind: "server.objective.state",
        serverTick: sequenceOrTick,
        chargePhase: readChargePhase(payload.getUint8(0)),
        plantProgress: payload.getUint16(1, true),
        defuseProgress: payload.getUint16(3, true),
        detonationTick: payload.getUint32(5, true)
      };
    case PACKET_KIND.clientAdminCommand:
      return {
        kind: "client.admin.command",
        sequence: sequenceOrTick,
        text: decodeStringPayload(payloadBytes)
      };
    case PACKET_KIND.serverAdminResult:
      if (payloadLength < 1) {
        throw new Error("server.admin.result payload too short.");
      }
      return {
        kind: "server.admin.result",
        serverTick: sequenceOrTick,
        ok: payload.getUint8(0) !== 0,
        text: decodeStringPayload(payloadBytes.subarray(1))
      };
    case PACKET_KIND.clientArmorBuy:
      requirePayloadLength(payloadLength, 0, "client.armor.buy");
      return {
        kind: "client.armor.buy",
        sequence: sequenceOrTick
      };
    case PACKET_KIND.serverPlayerArmor:
      requirePayloadLength(payloadLength, 8, "server.player.armor");
      return {
        kind: "server.player.armor",
        serverTick: sequenceOrTick,
        sessionId: payload.getUint32(0, true),
        armor: payload.getUint16(4, true),
        maxArmor: payload.getUint16(6, true)
      };
    case PACKET_KIND.clientGrenadeThrow:
      requirePayloadLength(payloadLength, 8, "client.grenade.throw");
      return {
        kind: "client.grenade.throw",
        sequence: sequenceOrTick,
        yaw: readFiniteNumber(payload.getFloat32(0, true), "yaw"),
        pitch: readFiniteNumber(payload.getFloat32(4, true), "pitch")
      };
    case PACKET_KIND.clientGrenadeBuy:
      requirePayloadLength(payloadLength, 0, "client.grenade.buy");
      return {
        kind: "client.grenade.buy",
        sequence: sequenceOrTick
      };
    case PACKET_KIND.serverPlayerGrenade:
      requirePayloadLength(payloadLength, 8, "server.player.grenade");
      return {
        kind: "server.player.grenade",
        serverTick: sequenceOrTick,
        sessionId: payload.getUint32(0, true),
        count: payload.getUint16(4, true),
        maxCount: payload.getUint16(6, true)
      };
    case PACKET_KIND.serverMatchMap:
      return {
        kind: "server.match.map",
        serverTick: sequenceOrTick,
        mapId: decodeStringPayload(payloadBytes)
      };
    case PACKET_KIND.serverGrenadeState:
      return {
        kind: "server.grenade.state",
        serverTick: sequenceOrTick,
        entryCount: payload.getUint16(0, true),
        entries: decodeGrenadeStateEntries(payload, payloadLength)
      };
    default:
      throw new Error(`Unknown packet kind: ${packetKind}.`);
  }
}

function writePacket(packetKind: number, version: number, sequenceOrTick: number, payload: Uint8Array): ProtocolPacket {
  const packet = new Uint8Array(PACKET_HEADER_LENGTH + payload.byteLength);
  const view = new DataView(packet.buffer);
  packet[0] = PACKET_MAGIC_BYTES[0];
  packet[1] = PACKET_MAGIC_BYTES[1];
  packet[2] = readPacketVersion(version);
  packet[3] = packetKind;
  view.setUint32(4, sequenceOrTick, true);
  view.setUint32(8, payload.byteLength, true);
  packet.set(payload, PACKET_HEADER_LENGTH);
  return packet;
}

function encodeAcceptPayload(message: ProtocolAcceptMessage): Uint8Array {
  const payload = new Uint8Array(2);
  const view = new DataView(payload.buffer);
  view.setUint16(0, readUint16(message.serverTickRateHz, "serverTickRateHz"), true);
  return payload;
}

function encodePingPayload(message: PingMessage): Uint8Array {
  const payload = new Uint8Array(8);
  const view = new DataView(payload.buffer);
  view.setFloat64(0, readFiniteNumber(message.clientTimeMs, "clientTimeMs"), true);
  return payload;
}

function encodePongPayload(message: PongMessage): Uint8Array {
  const payload = new Uint8Array(16);
  const view = new DataView(payload.buffer);
  view.setFloat64(0, readFiniteNumber(message.clientTimeMs, "clientTimeMs"), true);
  view.setFloat64(8, readFiniteNumber(message.serverTimeMs, "serverTimeMs"), true);
  return payload;
}

function encodeClientInputPayload(message: ClientInputMessage): Uint8Array {
  const payload = new Uint8Array(20);
  const view = new DataView(payload.buffer);
  view.setFloat64(0, readFiniteNumber(message.clientTimeMs, "clientTimeMs"), true);
  view.setUint32(8, readUint32(message.buttons, "buttons"), true);
  view.setFloat32(12, readFiniteNumber(message.yaw, "yaw"), true);
  view.setFloat32(16, readFiniteNumber(message.pitch, "pitch"), true);
  return payload;
}

function encodeClientFirePayload(message: ClientFireIntentMessage): Uint8Array {
  const payload = new Uint8Array(20);
  const view = new DataView(payload.buffer);
  view.setFloat64(0, readFiniteNumber(message.clientTimeMs, "clientTimeMs"), true);
  view.setUint32(8, readUint32(message.clientTick, "clientTick"), true);
  view.setFloat32(12, readFiniteNumber(message.yaw, "yaw"), true);
  view.setFloat32(16, readFiniteNumber(message.pitch, "pitch"), true);
  return payload;
}

function encodeClientLoadoutSelectPayload(message: ClientLoadoutSelectMessage): Uint8Array {
  const payload = new Uint8Array(4);
  const view = new DataView(payload.buffer);
  view.setUint16(0, readRequiredLoadoutProfileId(message.profileId), true);
  view.setUint16(2, 0, true);
  return payload;
}

function encodeServerTimePayload(serverTimeMs: number): Uint8Array {
  const payload = new Uint8Array(8);
  const view = new DataView(payload.buffer);
  view.setFloat64(0, readFiniteNumber(serverTimeMs, "serverTimeMs"), true);
  return payload;
}

function encodeServerSnapshotPayload(message: ServerSnapshotMessage): Uint8Array {
  const entityCount = readUint16(message.entityCount, "entityCount");
  if (entityCount !== message.entities.length) {
    throw new Error(`server.snapshot entity count ${entityCount} does not match ${message.entities.length} entities.`);
  }

  const payload = new Uint8Array(18 + message.entities.length * 28);
  const view = new DataView(payload.buffer);
  view.setFloat64(0, readFiniteNumber(message.serverTimeMs, "serverTimeMs"), true);
  view.setUint32(8, readUint32(message.sessionCount, "sessionCount"), true);
  view.setUint32(12, readUint32(message.worldId, "worldId"), true);
  view.setUint16(16, entityCount, true);

  let offset = 18;
  for (const entity of message.entities) {
    view.setUint32(offset, readUint32(entity.entityId, "entityId"), true);
    view.setUint32(offset + 4, readUint32(entity.sessionId, "sessionId"), true);
    view.setUint16(offset + 8, readUint16(entity.slotIndex, "slotIndex"), true);
    view.setUint16(
      offset + 10,
      (entity.active ? SNAPSHOT_ENTITY_FLAGS.active : 0) | (entity.crouched ? SNAPSHOT_ENTITY_FLAGS.crouched : 0),
      true
    );
    view.setFloat32(offset + 12, readFiniteNumber(entity.x, "x"), true);
    view.setFloat32(offset + 16, readFiniteNumber(entity.y, "y"), true);
    view.setFloat32(offset + 20, readFiniteNumber(entity.z, "z"), true);
    view.setFloat32(offset + 24, readFiniteNumber(entity.yaw, "yaw"), true);
    offset += 28;
  }

  return payload;
}

function encodeMatchAssignedPayload(message: MatchAssignedMessage): Uint8Array {
  const payload = new Uint8Array(14);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.matchId, "matchId"), true);
  view.setUint32(4, readUint32(message.sessionId, "sessionId"), true);
  view.setUint16(8, readUint16(message.slotIndex, "slotIndex"), true);
  view.setUint16(10, readUint16(message.capacity, "capacity"), true);
  view.setUint16(12, readUint16(message.connectedSlots, "connectedSlots"), true);
  return payload;
}

function encodeMatchUpdatePayload(message: MatchUpdateMessage): Uint8Array {
  const payload = new Uint8Array(8);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.matchId, "matchId"), true);
  view.setUint16(4, readUint16(message.capacity, "capacity"), true);
  view.setUint16(6, readUint16(message.connectedSlots, "connectedSlots"), true);
  return payload;
}

function encodeInputAckPayload(message: InputAckMessage): Uint8Array {
  const payload = new Uint8Array(12);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.sessionId, "sessionId"), true);
  view.setUint32(4, readUint32(message.lastAcceptedInputSequence, "lastAcceptedInputSequence"), true);
  view.setUint32(8, readUint32(message.droppedInputCount, "droppedInputCount"), true);
  return payload;
}

function encodeServerFireResultPayload(message: ServerFireResultMessage): Uint8Array {
  const payload = new Uint8Array(24);
  const view = new DataView(payload.buffer);
  const flags = (message.accepted ? FIRE_RESULT_FLAGS.accepted : 0) | (message.hit ? FIRE_RESULT_FLAGS.hit : 0);
  view.setUint32(0, readUint32(message.sessionId, "sessionId"), true);
  view.setUint32(4, readUint32(message.serverTick, "serverTick"), true);
  view.setUint16(8, flags, true);
  view.setUint16(10, readFireRejectReason(message.rejectReason), true);
  view.setUint32(12, readUint32(message.targetEntityId, "targetEntityId"), true);
  view.setUint32(16, readUint32(message.targetSessionId, "targetSessionId"), true);
  view.setFloat32(20, readFiniteNumber(message.distance, "distance"), true);
  return payload;
}

function encodeServerCombatStatePayload(message: ServerCombatStateMessage): Uint8Array {
  const payload = new Uint8Array(44);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.sessionId, "sessionId"), true);
  view.setUint32(4, readUint32(message.entityId, "entityId"), true);
  view.setUint16(8, readUint16(message.health, "health"), true);
  view.setUint16(10, readUint16(message.maxHealth, "maxHealth"), true);
  view.setUint16(12, message.alive ? COMBAT_STATE_FLAGS.alive : 0, true);
  view.setUint16(14, readCombatEventKind(message.lastEventKind), true);
  view.setUint32(16, readUint32(message.deathTick, "deathTick"), true);
  view.setUint32(20, readUint32(message.respawnEligibleTick, "respawnEligibleTick"), true);
  view.setUint32(24, readUint32(message.lastEventTick, "lastEventTick"), true);
  view.setUint32(28, readUint32(message.lastEventSequence, "lastEventSequence"), true);
  view.setUint32(32, readUint32(message.sourceSessionId, "sourceSessionId"), true);
  view.setUint32(36, readUint32(message.targetSessionId, "targetSessionId"), true);
  view.setUint32(40, readUint32(message.damage, "damage"), true);
  return payload;
}

function encodeServerLoadoutStatePayload(message: ServerLoadoutStateMessage): Uint8Array {
  const payload = new Uint8Array(16);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.sessionId, "sessionId"), true);
  view.setUint32(4, readUint32(message.sequence, "sequence"), true);
  view.setUint16(8, readLoadoutProfileId(message.profileId, true), true);
  view.setUint16(10, readLoadoutStatus(message.status), true);
  view.setUint16(12, readLoadoutRejectReason(message.rejectReason), true);
  view.setUint16(14, 0, true);
  return payload;
}

function encodeServerWeaponStatePayload(message: ServerWeaponStateMessage): Uint8Array {
  const payload = new Uint8Array(24);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.sessionId, "sessionId"), true);
  view.setUint16(4, readLoadoutProfileId(message.weaponProfileId, true), true);
  view.setUint16(6, readUint16(message.ammoInMagazine, "ammoInMagazine"), true);
  view.setUint16(8, readUint16(message.magazineSize, "magazineSize"), true);
  view.setUint16(10, message.reloading ? WEAPON_STATE_FLAGS.reloading : 0, true);
  view.setUint16(12, readWeaponEventKind(message.lastEventKind), true);
  view.setUint16(14, 0, true);
  view.setUint32(16, readUint32(message.reloadCompleteTick, "reloadCompleteTick"), true);
  view.setUint32(20, readUint32(message.lastEventSequence, "lastEventSequence"), true);
  return payload;
}

function encodeServerRoundStatePayload(message: ServerRoundStateMessage): Uint8Array {
  const payload = new Uint8Array(36);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.roundId, "roundId"), true);
  view.setUint16(4, readRoundPhase(message.phase), true);
  view.setUint16(6, readRoundOutcome(message.outcome), true);
  view.setUint32(8, readUint32(message.winnerSessionId, "winnerSessionId"), true);
  view.setUint32(12, readUint32(message.phaseStartedTick, "phaseStartedTick"), true);
  view.setUint32(16, readUint32(message.phaseEndsTick, "phaseEndsTick"), true);
  view.setUint32(20, readUint32(message.resetReadyTick, "resetReadyTick"), true);
  view.setUint16(24, readRoundEventKind(message.lastEventKind), true);
  view.setUint16(26, 0, true);
  view.setUint32(28, readUint32(message.lastEventTick, "lastEventTick"), true);
  view.setUint32(32, readUint32(message.lastEventSequence, "lastEventSequence"), true);
  return payload;
}

function encodeServerMatchStatsPayload(message: ServerMatchStatsMessage): Uint8Array {
  const entryCount = readUint16(message.entryCount, "entryCount");
  if (entryCount !== message.entries.length) {
    throw new Error(`server.match.stats entry count ${entryCount} does not match ${message.entries.length} entries.`);
  }

  const payload = new Uint8Array(4 + message.entries.length * 12);
  const view = new DataView(payload.buffer);
  view.setUint16(0, entryCount, true);
  view.setUint16(2, 0, true);

  let offset = 4;
  for (const entry of message.entries) {
    view.setUint32(offset, readUint32(entry.sessionId, "sessionId"), true);
    view.setUint32(offset + 4, readUint32(entry.kills, "kills"), true);
    view.setUint32(offset + 8, readUint32(entry.deaths, "deaths"), true);
    offset += 12;
  }

  return payload;
}

function encodeServerMatchRosterPayload(message: ServerMatchRosterMessage): Uint8Array {
  const entryCount = readUint16(message.entryCount, "entryCount");
  if (entryCount !== message.entries.length) {
    throw new Error(`server.match.roster entry count ${entryCount} does not match ${message.entries.length} entries.`);
  }

  const payload = new Uint8Array(4 + message.entries.length * ROSTER_ENTRY_BYTES);
  const view = new DataView(payload.buffer);
  view.setUint16(0, entryCount, true);
  view.setUint16(2, 0, true);

  let offset = 4;
  for (const entry of message.entries) {
    view.setUint32(offset, readUint32(entry.sessionId, "sessionId"), true);
    view.setUint16(offset + 4, readUint16(entry.handleId, "handleId"), true);
    view.setUint16(offset + 6, readLoadoutProfileId(entry.weaponProfileId, true), true);
    view.setUint16(offset + 8, readUint16(entry.slotIndex, "slotIndex"), true);
    view.setUint16(offset + 10, 0, true);
    writeFixedUtf8Field(payload, offset + 12, ROSTER_NAME_FIELD_BYTES, entry.name);
    offset += ROSTER_ENTRY_BYTES;
  }

  return payload;
}

function encodeServerMatchResultPayload(message: ServerMatchResultMessage): Uint8Array {
  const payload = new Uint8Array(12);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.winnerSessionId, "winnerSessionId"), true);
  view.setUint16(4, readUint16(message.killTarget, "killTarget"), true);
  view.setUint16(6, message.matchOver ? 1 : 0, true);
  view.setUint16(8, readUint16(message.copsRoundWins, "copsRoundWins"), true);
  view.setUint16(10, readUint16(message.robbersRoundWins, "robbersRoundWins"), true);
  return payload;
}

function encodeServerPlayerEconomyPayload(message: ServerPlayerEconomyMessage): Uint8Array {
  const payload = new Uint8Array(8);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.sessionId, "sessionId"), true);
  view.setUint32(4, readUint32(message.money, "money"), true);
  return payload;
}

function encodeClientWeaponBuyPayload(message: ClientWeaponBuyMessage): Uint8Array {
  const payload = new Uint8Array(4);
  const view = new DataView(payload.buffer);
  view.setUint16(0, readRequiredLoadoutProfileId(message.profileId), true);
  return payload;
}

function encodeServerObjectiveStatePayload(message: ServerObjectiveStateMessage): Uint8Array {
  const payload = new Uint8Array(9);
  const view = new DataView(payload.buffer);
  view.setUint8(0, readChargePhase(message.chargePhase));
  view.setUint16(1, readUint16(message.plantProgress, "plantProgress"), true);
  view.setUint16(3, readUint16(message.defuseProgress, "defuseProgress"), true);
  view.setUint32(5, readUint32(message.detonationTick, "detonationTick"), true);
  return payload;
}

function encodeStringPayload(value: string): Uint8Array {
  return textEncoder.encode(value);
}

// Write a UTF-8 string into a fixed-width, null-padded field. The value is truncated on a
// UTF-8 boundary if it would exceed fieldBytes, so the field always decodes cleanly.
function writeFixedUtf8Field(target: Uint8Array, offset: number, fieldBytes: number, value: string): void {
  target.fill(0, offset, offset + fieldBytes);
  const encoded = textEncoder.encode(value);
  let count = Math.min(encoded.length, fieldBytes);
  // Never split a multi-byte sequence at the boundary: drop back while the next byte is a
  // UTF-8 continuation byte (0b10xxxxxx).
  while (count > 0 && count < encoded.length && (encoded[count] & 0b1100_0000) === 0b1000_0000) {
    count -= 1;
  }
  target.set(encoded.subarray(0, count), offset);
}

// Read a null-padded fixed-width UTF-8 field back into a string.
function readFixedUtf8Field(view: DataView, offset: number, fieldBytes: number): string {
  let end = offset;
  const limit = offset + fieldBytes;
  while (end < limit && view.getUint8(end) !== 0) {
    end += 1;
  }
  if (end === offset) {
    return "";
  }
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, end - offset);
  return decodeStringPayload(bytes);
}

function encodeServerPlayerArmorPayload(message: ServerPlayerArmorMessage): Uint8Array {
  const payload = new Uint8Array(8);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.sessionId, "sessionId"), true);
  view.setUint16(4, readUint16(message.armor, "armor"), true);
  view.setUint16(6, readUint16(message.maxArmor, "maxArmor"), true);
  return payload;
}

function encodeClientGrenadeThrowPayload(message: ClientGrenadeThrowMessage): Uint8Array {
  const payload = new Uint8Array(8);
  const view = new DataView(payload.buffer);
  view.setFloat32(0, readFiniteNumber(message.yaw, "yaw"), true);
  view.setFloat32(4, readFiniteNumber(message.pitch, "pitch"), true);
  return payload;
}

function encodeServerPlayerGrenadePayload(message: ServerPlayerGrenadeMessage): Uint8Array {
  const payload = new Uint8Array(8);
  const view = new DataView(payload.buffer);
  view.setUint32(0, readUint32(message.sessionId, "sessionId"), true);
  view.setUint16(4, readUint16(message.count, "count"), true);
  view.setUint16(6, readUint16(message.maxCount, "maxCount"), true);
  return payload;
}

const GRENADE_STATE_ENTRY_STRIDE = 18 as const;

function encodeServerGrenadeStatePayload(message: ServerGrenadeStateMessage): Uint8Array {
  const entryCount = readUint16(message.entryCount, "entryCount");
  if (entryCount !== message.entries.length) {
    throw new Error(`server.grenade.state entry count ${entryCount} does not match ${message.entries.length} entries.`);
  }
  const payload = new Uint8Array(4 + message.entries.length * GRENADE_STATE_ENTRY_STRIDE);
  const view = new DataView(payload.buffer);
  view.setUint16(0, entryCount, true);
  view.setUint16(2, 0, true);

  let offset = 4;
  for (const entry of message.entries) {
    view.setUint16(offset, readUint16(entry.id, "id"), true);
    view.setUint8(offset + 2, entry.detonated ? 1 : 0);
    view.setUint8(offset + 3, 0);
    view.setFloat32(offset + 4, readFiniteNumber(entry.x, "x"), true);
    view.setFloat32(offset + 8, readFiniteNumber(entry.y, "y"), true);
    view.setFloat32(offset + 12, readFiniteNumber(entry.z, "z"), true);
    view.setUint16(offset + 16, readUint16(entry.fuseTicks, "fuseTicks"), true);
    offset += GRENADE_STATE_ENTRY_STRIDE;
  }
  return payload;
}

function decodeGrenadeStateEntries(payload: DataView, payloadLength: number): readonly GrenadeStateEntry[] {
  const entryCount = payload.getUint16(0, true);
  const expected = 4 + entryCount * GRENADE_STATE_ENTRY_STRIDE;
  if (payloadLength !== expected) {
    throw new Error(`server.grenade.state length ${payloadLength} does not match ${entryCount} entries.`);
  }
  const entries: GrenadeStateEntry[] = [];
  let offset = 4;
  for (let index = 0; index < entryCount; index += 1) {
    entries.push({
      id: payload.getUint16(offset, true),
      x: payload.getFloat32(offset + 4, true),
      y: payload.getFloat32(offset + 8, true),
      z: payload.getFloat32(offset + 12, true),
      fuseTicks: payload.getUint16(offset + 16, true),
      detonated: payload.getUint8(offset + 2) !== 0
    });
    offset += GRENADE_STATE_ENTRY_STRIDE;
  }
  return entries;
}

function encodeServerAdminResultPayload(message: ServerAdminResultMessage): Uint8Array {
  const textBytes = textEncoder.encode(message.text);
  const payload = new Uint8Array(1 + textBytes.byteLength);
  payload[0] = message.ok ? 1 : 0;
  payload.set(textBytes, 1);
  return payload;
}

function decodeStringPayload(payload: Uint8Array): string {
  try {
    return textDecoder.decode(payload);
  } catch (error) {
    throw new Error(`Invalid UTF-8 protocol payload: ${String(error)}`);
  }
}

function readPacketInput(input: ProtocolPacketInput): Uint8Array {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

function requirePayloadLength(actual: number, expected: number, packetKind: string): void {
  if (actual !== expected) {
    throw new Error(`${packetKind} payload length must be ${expected} bytes, got ${actual}.`);
  }
}

function requireServerSnapshotPayloadLength(payloadLength: number): void {
  if (payloadLength < 18) {
    throw new Error(`server.snapshot payload length must be at least 18 bytes, got ${payloadLength}.`);
  }

  const entityPayloadLength = payloadLength - 18;
  if (entityPayloadLength % 28 !== 0) {
    throw new Error("server.snapshot entity payload length must be a multiple of 28 bytes.");
  }
}

function decodeSnapshotEntities(payload: DataView, payloadLength: number): readonly SnapshotEntityReference[] {
  const entityCount = payload.getUint16(16, true);
  const recordCount = (payloadLength - 18) / 28;
  if (entityCount !== recordCount) {
    throw new Error(`server.snapshot entity count ${entityCount} does not match ${recordCount} entity records.`);
  }

  const entities: SnapshotEntityReference[] = [];
  let offset = 18;
  for (let index = 0; index < entityCount; index += 1) {
    const entityFlags = payload.getUint16(offset + 10, true);
    entities.push({
      entityId: payload.getUint32(offset, true),
      sessionId: payload.getUint32(offset + 4, true),
      slotIndex: payload.getUint16(offset + 8, true),
      active: (entityFlags & SNAPSHOT_ENTITY_FLAGS.active) !== 0,
      crouched: (entityFlags & SNAPSHOT_ENTITY_FLAGS.crouched) !== 0,
      x: readFiniteNumber(payload.getFloat32(offset + 12, true), "x"),
      y: readFiniteNumber(payload.getFloat32(offset + 16, true), "y"),
      z: readFiniteNumber(payload.getFloat32(offset + 20, true), "z"),
      yaw: readFiniteNumber(payload.getFloat32(offset + 24, true), "yaw")
    });
    offset += 28;
  }
  return entities;
}

function requireServerMatchStatsPayloadLength(payloadLength: number): void {
  if (payloadLength < 4) {
    throw new Error(`server.match.stats payload length must be at least 4 bytes, got ${payloadLength}.`);
  }

  const entryPayloadLength = payloadLength - 4;
  if (entryPayloadLength % 12 !== 0) {
    throw new Error("server.match.stats entry payload length must be a multiple of 12 bytes.");
  }
}

function decodeMatchStatsEntries(payload: DataView, payloadLength: number): readonly MatchStatsEntry[] {
  const entryCount = payload.getUint16(0, true);
  const recordCount = (payloadLength - 4) / 12;
  if (entryCount !== recordCount) {
    throw new Error(`server.match.stats entry count ${entryCount} does not match ${recordCount} entry records.`);
  }

  const entries: MatchStatsEntry[] = [];
  let offset = 4;
  for (let index = 0; index < entryCount; index += 1) {
    entries.push({
      sessionId: payload.getUint32(offset, true),
      kills: payload.getUint32(offset + 4, true),
      deaths: payload.getUint32(offset + 8, true)
    });
    offset += 12;
  }
  return entries;
}

function requireServerMatchRosterPayloadLength(payloadLength: number): void {
  if (payloadLength < 4) {
    throw new Error(`server.match.roster payload length must be at least 4 bytes, got ${payloadLength}.`);
  }

  const entryPayloadLength = payloadLength - 4;
  if (entryPayloadLength % ROSTER_ENTRY_BYTES !== 0) {
    throw new Error(`server.match.roster entry payload length must be a multiple of ${ROSTER_ENTRY_BYTES} bytes.`);
  }
}

function decodeMatchRosterEntries(payload: DataView, payloadLength: number): readonly MatchRosterEntry[] {
  const entryCount = payload.getUint16(0, true);
  const recordCount = (payloadLength - 4) / ROSTER_ENTRY_BYTES;
  if (entryCount !== recordCount) {
    throw new Error(`server.match.roster entry count ${entryCount} does not match ${recordCount} entry records.`);
  }

  const entries: MatchRosterEntry[] = [];
  let offset = 4;
  for (let index = 0; index < entryCount; index += 1) {
    entries.push({
      sessionId: payload.getUint32(offset, true),
      handleId: payload.getUint16(offset + 4, true),
      weaponProfileId: readLoadoutProfileId(payload.getUint16(offset + 6, true), true),
      slotIndex: payload.getUint16(offset + 8, true),
      name: readFixedUtf8Field(payload, offset + 12, ROSTER_NAME_FIELD_BYTES)
    });
    offset += ROSTER_ENTRY_BYTES;
  }
  return entries;
}

function readPacketVersion(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new Error(`protocolVersion must be an unsigned 8-bit integer, got ${value}.`);
  }
  return value;
}

function readUint16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new Error(`${field} must be an unsigned 16-bit integer, got ${value}.`);
  }
  return value;
}

function readUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${field} must be an unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}

function readFiniteNumber(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be finite, got ${value}.`);
  }
  return value;
}

function readFireRejectReason(value: number): FireRejectReason {
  const values = Object.values(FIRE_REJECT_REASON) as number[];
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`fire reject reason must be known, got ${value}.`);
  }
  return value as FireRejectReason;
}

function readCombatEventKind(value: number): CombatEventKind {
  const values = Object.values(COMBAT_EVENT_KIND) as number[];
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`combat event kind must be known, got ${value}.`);
  }
  return value as CombatEventKind;
}

function readWeaponEventKind(value: number): WeaponEventKind {
  const values = Object.values(WEAPON_EVENT_KIND) as number[];
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`weapon event kind must be known, got ${value}.`);
  }
  return value as WeaponEventKind;
}

function readLoadoutProfileId(value: number, allowUnselected = false): LoadoutProfileId | 0 {
  const values = Object.values(LOADOUT_PROFILE_ID) as number[];
  if (allowUnselected && value === 0) {
    return 0;
  }
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`loadout profile id must be known, got ${value}.`);
  }
  return value as LoadoutProfileId;
}

function readRequiredLoadoutProfileId(value: number): LoadoutProfileId {
  return readLoadoutProfileId(value) as LoadoutProfileId;
}

function readLoadoutStatus(value: number): LoadoutStatus {
  const values = Object.values(LOADOUT_STATUS) as number[];
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`loadout status must be known, got ${value}.`);
  }
  return value as LoadoutStatus;
}

function readLoadoutRejectReason(value: number): LoadoutRejectReason {
  const values = Object.values(LOADOUT_REJECT_REASON) as number[];
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`loadout reject reason must be known, got ${value}.`);
  }
  return value as LoadoutRejectReason;
}

function readRoundPhase(value: number): RoundPhase {
  const values = Object.values(ROUND_PHASE) as number[];
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`round phase must be known, got ${value}.`);
  }
  return value as RoundPhase;
}

function readRoundOutcome(value: number): RoundOutcome {
  const values = Object.values(ROUND_OUTCOME) as number[];
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`round outcome must be known, got ${value}.`);
  }
  return value as RoundOutcome;
}

function readRoundEventKind(value: number): RoundEventKind {
  const values = Object.values(ROUND_EVENT_KIND) as number[];
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`round event kind must be known, got ${value}.`);
  }
  return value as RoundEventKind;
}

function readChargePhase(value: number): ChargePhase {
  const values = Object.values(CHARGE_PHASE) as number[];
  if (!Number.isInteger(value) || !values.includes(value)) {
    throw new Error(`charge phase must be known, got ${value}.`);
  }
  return value as ChargePhase;
}
