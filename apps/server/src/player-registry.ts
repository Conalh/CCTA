import {
  DEFAULT_WEAPON_PROFILE_ID,
  PLAYER_HANDLE_POOL,
  isKnownWeaponProfileId,
  type LoadoutProfileId,
  type MatchRosterEntry,
  type PlayerHandle,
  type ServerMatchRosterMessage
} from "@breachline/shared";

export type PlayerRegistryConfig = Readonly<{
  handlePool?: readonly PlayerHandle[];
  defaultWeaponProfileId?: LoadoutProfileId;
}>;

export type PlayerRegistryEntry = Readonly<{
  sessionId: number;
  handleId: number;
  callsign: string;
  weaponProfileId: LoadoutProfileId;
  slotIndex: number;
}>;

export type PlayerRegistry = Readonly<{
  assignSession(sessionId: number, slotIndex: number): PlayerRegistryEntry;
  removeSession(sessionId: number): PlayerRegistryEntry | undefined;
  setWeapon(sessionId: number, profileId: number): PlayerRegistryEntry | undefined;
  resetWeapons(): readonly PlayerRegistryEntry[];
  getEntry(sessionId: number): PlayerRegistryEntry | undefined;
  roster(): readonly PlayerRegistryEntry[];
  createRosterMessage(serverTick: number): ServerMatchRosterMessage;
}>;

type MutablePlayerRegistryEntry = {
  sessionId: number;
  handleId: number;
  callsign: string;
  weaponProfileId: LoadoutProfileId;
  slotIndex: number;
};

export function createPlayerRegistry(config: PlayerRegistryConfig = {}): PlayerRegistry {
  const handlePool = config.handlePool ?? PLAYER_HANDLE_POOL;
  if (handlePool.length === 0) {
    throw new Error("player registry requires a non-empty handle pool.");
  }
  const defaultWeaponProfileId = config.defaultWeaponProfileId ?? DEFAULT_WEAPON_PROFILE_ID;
  if (!isKnownWeaponProfileId(defaultWeaponProfileId)) {
    throw new Error(`default weapon profile id ${defaultWeaponProfileId} is not a known weapon.`);
  }
  const sessions = new Map<number, MutablePlayerRegistryEntry>();

  function nextFreeHandle(): PlayerHandle {
    const assignedHandleIds = new Set<number>();
    for (const entry of sessions.values()) {
      assignedHandleIds.add(entry.handleId);
    }
    const handle = handlePool.find((candidate) => !assignedHandleIds.has(candidate.handleId));
    if (handle === undefined) {
      throw new Error("player registry has no free handle to assign.");
    }
    return handle;
  }

  function assignSession(sessionIdValue: number, slotIndexValue: number): PlayerRegistryEntry {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const slotIndex = readUint16(slotIndexValue, "slotIndex");
    const existing = sessions.get(sessionId);
    if (existing !== undefined) {
      return toReadonlyEntry(existing);
    }
    const handle = nextFreeHandle();
    const entry: MutablePlayerRegistryEntry = {
      sessionId,
      handleId: handle.handleId,
      callsign: handle.callsign,
      weaponProfileId: defaultWeaponProfileId,
      slotIndex
    };
    sessions.set(sessionId, entry);
    return toReadonlyEntry(entry);
  }

  function removeSession(sessionIdValue: number): PlayerRegistryEntry | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const entry = sessions.get(sessionId);
    if (entry === undefined) {
      return undefined;
    }
    sessions.delete(sessionId);
    return toReadonlyEntry(entry);
  }

  function setWeapon(sessionIdValue: number, profileIdValue: number): PlayerRegistryEntry | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const entry = sessions.get(sessionId);
    if (entry === undefined) {
      return undefined;
    }
    if (!isKnownWeaponProfileId(profileIdValue)) {
      throw new Error(`weapon profile id must be a known weapon, got ${profileIdValue}.`);
    }
    entry.weaponProfileId = profileIdValue;
    return toReadonlyEntry(entry);
  }

  function resetWeapons(): readonly PlayerRegistryEntry[] {
    const reset: PlayerRegistryEntry[] = [];
    for (const entry of sessions.values()) {
      entry.weaponProfileId = defaultWeaponProfileId;
      reset.push(toReadonlyEntry(entry));
    }
    return reset;
  }

  function getEntry(sessionIdValue: number): PlayerRegistryEntry | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const entry = sessions.get(sessionId);
    return entry === undefined ? undefined : toReadonlyEntry(entry);
  }

  function roster(): readonly PlayerRegistryEntry[] {
    return Array.from(sessions.values(), toReadonlyEntry).sort((left, right) => left.slotIndex - right.slotIndex);
  }

  function createRosterMessage(serverTick: number): ServerMatchRosterMessage {
    const entries: readonly MatchRosterEntry[] = roster().map((entry) => ({
      sessionId: entry.sessionId,
      handleId: entry.handleId,
      weaponProfileId: entry.weaponProfileId,
      slotIndex: entry.slotIndex
    }));
    return {
      kind: "server.match.roster",
      serverTick: readUint32(serverTick, "serverTick"),
      entryCount: entries.length,
      entries
    };
  }

  return {
    assignSession,
    removeSession,
    setWeapon,
    resetWeapons,
    getEntry,
    roster,
    createRosterMessage
  };
}

function toReadonlyEntry(entry: MutablePlayerRegistryEntry): PlayerRegistryEntry {
  return {
    sessionId: entry.sessionId,
    handleId: entry.handleId,
    callsign: entry.callsign,
    weaponProfileId: entry.weaponProfileId,
    slotIndex: entry.slotIndex
  };
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

function readPositiveUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 0xffffffff) {
    throw new Error(`${field} must be a positive unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}
