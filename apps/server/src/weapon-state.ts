import {
  DEFAULT_WEAPON_PROFILE_ID,
  FIRE_REJECT_REASON,
  WEAPON_CATALOG,
  WEAPON_EVENT_KIND,
  type FireRejectReason,
  type LoadoutProfileId,
  type ServerWeaponStateMessage,
  type WeaponDefinition,
  type WeaponEventKind
} from "@breachline/shared";

export type WeaponStateConfig = Readonly<{
  definitions?: readonly WeaponDefinition[];
  defaultProfileId?: LoadoutProfileId;
}>;

export type WeaponFireInput = Readonly<{
  sessionId: number;
  serverTick: number;
  sequence: number;
}>;

export type WeaponReloadInput = Readonly<{
  sessionId: number;
  serverTick: number;
  sequence: number;
}>;

export type WeaponSessionState = Readonly<{
  sessionId: number;
  weaponProfileId: LoadoutProfileId;
  ammoInMagazine: number;
  magazineSize: number;
  reloading: boolean;
  reloadCompleteTick: number;
  lastFireTick: number;
  lastEventKind: WeaponEventKind;
  lastEventSequence: number;
}>;

export type WeaponFireResult = Readonly<{
  ok: boolean;
  rejectReason?: FireRejectReason;
  state?: WeaponSessionState;
}>;

export type WeaponState = Readonly<{
  assignSession(sessionId: number): ServerWeaponStateMessage;
  removeSession(sessionId: number): ServerWeaponStateMessage | undefined;
  setWeapon(sessionId: number, profileId: number): ServerWeaponStateMessage | undefined;
  tryFire(input: WeaponFireInput): WeaponFireResult;
  requestReload(input: WeaponReloadInput): ServerWeaponStateMessage | undefined;
  advanceReloads(serverTick: number): readonly ServerWeaponStateMessage[];
  resetAll(serverTick: number): readonly ServerWeaponStateMessage[];
  getCurrentDamage(sessionId: number): number | undefined;
  getSessionState(sessionId: number): WeaponSessionState | undefined;
  createStateMessage(sessionId: number, serverTick: number): ServerWeaponStateMessage | undefined;
}>;

type MutableWeaponSessionState = {
  sessionId: number;
  weaponProfileId: LoadoutProfileId;
  ammoInMagazine: number;
  reloading: boolean;
  reloadCompleteTick: number;
  lastFireTick: number;
  lastEventKind: WeaponEventKind;
  lastEventSequence: number;
};

export function createWeaponState(config: WeaponStateConfig = {}): WeaponState {
  const definitions = new Map<LoadoutProfileId, WeaponDefinition>(
    (config.definitions ?? WEAPON_CATALOG).map((definition) => [definition.profileId, definition])
  );
  const startingProfileId = config.defaultProfileId ?? DEFAULT_WEAPON_PROFILE_ID;
  if (!definitions.has(startingProfileId)) {
    throw new Error(`default weapon profile id ${startingProfileId} has no definition.`);
  }
  const sessions = new Map<number, MutableWeaponSessionState>();

  function requireDefinition(profileId: LoadoutProfileId): WeaponDefinition {
    const definition = definitions.get(profileId);
    if (definition === undefined) {
      throw new Error(`weapon definition missing for profile id ${profileId}.`);
    }
    return definition;
  }

  function assignSession(sessionIdValue: number): ServerWeaponStateMessage {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const definition = requireDefinition(startingProfileId);
    const state: MutableWeaponSessionState = {
      sessionId,
      weaponProfileId: startingProfileId,
      ammoInMagazine: definition.magazineSize,
      reloading: false,
      reloadCompleteTick: 0,
      lastFireTick: 0,
      lastEventKind: WEAPON_EVENT_KIND.assigned,
      lastEventSequence: 0
    };
    sessions.set(sessionId, state);
    return toStateMessage(state, 0);
  }

  function removeSession(sessionIdValue: number): ServerWeaponStateMessage | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    if (state === undefined) {
      return undefined;
    }
    sessions.delete(sessionId);
    return toStateMessage(state, 0);
  }

  function setWeapon(sessionIdValue: number, profileIdValue: number): ServerWeaponStateMessage | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    if (state === undefined) {
      return undefined;
    }
    const profileId = readKnownProfileId(profileIdValue);
    const definition = requireDefinition(profileId);
    state.weaponProfileId = profileId;
    state.ammoInMagazine = definition.magazineSize;
    state.reloading = false;
    state.reloadCompleteTick = 0;
    state.lastFireTick = 0;
    state.lastEventKind = WEAPON_EVENT_KIND.switched;
    state.lastEventSequence = 0;
    return toStateMessage(state, 0);
  }

  function tryFire(input: WeaponFireInput): WeaponFireResult {
    const sessionId = readPositiveUint32(input.sessionId, "sessionId");
    const serverTick = readUint32(input.serverTick, "serverTick");
    const sequence = readUint32(input.sequence, "sequence");
    const state = sessions.get(sessionId);
    if (state === undefined) {
      return { ok: false, rejectReason: FIRE_REJECT_REASON.noMatchAssignment };
    }

    if (state.reloading) {
      return { ok: false, rejectReason: FIRE_REJECT_REASON.reloading };
    }

    if (state.ammoInMagazine === 0) {
      return { ok: false, rejectReason: FIRE_REJECT_REASON.outOfAmmo };
    }

    const definition = requireDefinition(state.weaponProfileId);
    if (state.lastFireTick !== 0 && serverTick - state.lastFireTick < definition.fireIntervalTicks) {
      return { ok: false, rejectReason: FIRE_REJECT_REASON.weaponCooldown };
    }

    state.ammoInMagazine -= 1;
    state.lastFireTick = serverTick;
    state.lastEventKind = WEAPON_EVENT_KIND.fired;
    state.lastEventSequence = sequence;
    return { ok: true, state: toReadonlyState(state) };
  }

  function requestReload(input: WeaponReloadInput): ServerWeaponStateMessage | undefined {
    const sessionId = readPositiveUint32(input.sessionId, "sessionId");
    const serverTick = readUint32(input.serverTick, "serverTick");
    const sequence = readUint32(input.sequence, "sequence");
    const state = sessions.get(sessionId);
    if (state === undefined) {
      return undefined;
    }

    const definition = requireDefinition(state.weaponProfileId);
    if (state.reloading || state.ammoInMagazine >= definition.magazineSize) {
      return undefined;
    }

    state.reloading = true;
    state.reloadCompleteTick = serverTick + definition.reloadTicks;
    state.lastEventKind = WEAPON_EVENT_KIND.reloadStart;
    state.lastEventSequence = sequence;
    return toStateMessage(state, serverTick);
  }

  function advanceReloads(serverTickValue: number): readonly ServerWeaponStateMessage[] {
    const serverTick = readUint32(serverTickValue, "serverTick");
    const completed: ServerWeaponStateMessage[] = [];
    for (const state of sessions.values()) {
      if (state.reloading && state.reloadCompleteTick !== 0 && serverTick >= state.reloadCompleteTick) {
        const definition = requireDefinition(state.weaponProfileId);
        state.ammoInMagazine = definition.magazineSize;
        state.reloading = false;
        state.reloadCompleteTick = 0;
        state.lastEventKind = WEAPON_EVENT_KIND.reloadComplete;
        state.lastEventSequence = 0;
        completed.push(toStateMessage(state, serverTick));
      }
    }
    return completed;
  }

  function resetAll(serverTickValue: number): readonly ServerWeaponStateMessage[] {
    const serverTick = readUint32(serverTickValue, "serverTick");
    const resetStates: ServerWeaponStateMessage[] = [];
    for (const state of sessions.values()) {
      const definition = requireDefinition(startingProfileId);
      state.weaponProfileId = startingProfileId;
      state.ammoInMagazine = definition.magazineSize;
      state.reloading = false;
      state.reloadCompleteTick = 0;
      state.lastFireTick = 0;
      state.lastEventKind = WEAPON_EVENT_KIND.reset;
      state.lastEventSequence = 0;
      resetStates.push(toStateMessage(state, serverTick));
    }
    return resetStates;
  }

  function getCurrentDamage(sessionIdValue: number): number | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    if (state === undefined) {
      return undefined;
    }
    return definitions.get(state.weaponProfileId)?.damagePerHit;
  }

  function getSessionState(sessionIdValue: number): WeaponSessionState | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    return state === undefined ? undefined : toReadonlyState(state);
  }

  function createStateMessage(
    sessionIdValue: number,
    serverTick: number
  ): ServerWeaponStateMessage | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    return state === undefined ? undefined : toStateMessage(state, readUint32(serverTick, "serverTick"));
  }

  function toReadonlyState(state: MutableWeaponSessionState): WeaponSessionState {
    return {
      sessionId: state.sessionId,
      weaponProfileId: state.weaponProfileId,
      ammoInMagazine: state.ammoInMagazine,
      magazineSize: requireDefinition(state.weaponProfileId).magazineSize,
      reloading: state.reloading,
      reloadCompleteTick: state.reloadCompleteTick,
      lastFireTick: state.lastFireTick,
      lastEventKind: state.lastEventKind,
      lastEventSequence: state.lastEventSequence
    };
  }

  function toStateMessage(
    state: MutableWeaponSessionState,
    serverTick: number
  ): ServerWeaponStateMessage {
    const definition = requireDefinition(state.weaponProfileId);
    return {
      kind: "server.weapon.state",
      serverTick,
      sessionId: state.sessionId,
      weaponProfileId: state.weaponProfileId,
      ammoInMagazine: state.ammoInMagazine,
      magazineSize: definition.magazineSize,
      reloading: state.reloading,
      reloadCompleteTick: state.reloadCompleteTick,
      lastEventKind: state.lastEventKind,
      lastEventSequence: state.lastEventSequence
    };
  }

  function readKnownProfileId(value: number): LoadoutProfileId {
    if (!definitions.has(value as LoadoutProfileId)) {
      throw new Error(`weapon profile id must be a known weapon, got ${value}.`);
    }
    return value as LoadoutProfileId;
  }

  return {
    assignSession,
    removeSession,
    setWeapon,
    tryFire,
    requestReload,
    advanceReloads,
    resetAll,
    getCurrentDamage,
    getSessionState,
    createStateMessage
  };
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
