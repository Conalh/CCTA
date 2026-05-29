import {
  LOADOUT_REJECT_REASON,
  LOADOUT_STATUS,
  isKnownWeaponProfileId,
  type ClientLoadoutSelectMessage,
  type LoadoutProfileId,
  type LoadoutRejectReason,
  type LoadoutStatus,
  type ServerLoadoutStateMessage
} from "@breachline/shared";

export type LoadoutSelectionInput = Readonly<{
  sessionId: number;
  sequence: number;
  profileId: number;
  serverTick: number;
}>;

export type LoadoutState = Readonly<{
  assignSession(sessionId: number): ServerLoadoutStateMessage;
  removeSession(sessionId: number): ServerLoadoutStateMessage | undefined;
  selectLoadout(input: LoadoutSelectionInput): ServerLoadoutStateMessage;
  resetAll(serverTick: number): readonly ServerLoadoutStateMessage[];
  getStateMessage(sessionId: number, serverTick: number): ServerLoadoutStateMessage | undefined;
  getSelectedProfileId(sessionId: number): LoadoutProfileId | undefined;
}>;

type MutableLoadoutSessionState = {
  sessionId: number;
  selectedProfileId: LoadoutProfileId | 0;
  lastSelectionSequence: number;
  status: LoadoutStatus;
  rejectReason: LoadoutRejectReason;
};

export function createLoadoutState(): LoadoutState {
  const sessions = new Map<number, MutableLoadoutSessionState>();

  function assignSession(sessionIdValue: number): ServerLoadoutStateMessage {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state: MutableLoadoutSessionState = {
      sessionId,
      selectedProfileId: 0,
      lastSelectionSequence: 0,
      status: LOADOUT_STATUS.unselected,
      rejectReason: LOADOUT_REJECT_REASON.none
    };
    sessions.set(sessionId, state);
    return toStateMessage(state, 0);
  }

  function removeSession(sessionIdValue: number): ServerLoadoutStateMessage | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    if (state === undefined) {
      return undefined;
    }
    sessions.delete(sessionId);
    return toStateMessage(state, 0);
  }

  function selectLoadout(input: LoadoutSelectionInput): ServerLoadoutStateMessage {
    const sequence = readUint32(input.sequence, "sequence");
    const serverTick = readUint32(input.serverTick, "serverTick");
    const sessionId = readPositiveUint32(input.sessionId, "sessionId");
    const state = sessions.get(sessionId);
    if (state === undefined) {
      return createRejectedLoadoutState({
        sequence,
        serverTick,
        rejectReason: LOADOUT_REJECT_REASON.noMatchAssignment
      });
    }

    if (sequence <= state.lastSelectionSequence) {
      return rejectForSession(state, sequence, serverTick, LOADOUT_REJECT_REASON.staleSequence);
    }

    if (state.selectedProfileId !== 0) {
      state.lastSelectionSequence = sequence;
      return rejectForSession(state, sequence, serverTick, LOADOUT_REJECT_REASON.alreadySelected);
    }

    if (!isKnownWeaponProfileId(input.profileId)) {
      state.lastSelectionSequence = sequence;
      return rejectForSession(state, sequence, serverTick, LOADOUT_REJECT_REASON.invalidProfile);
    }

    state.selectedProfileId = input.profileId;
    state.lastSelectionSequence = sequence;
    state.status = LOADOUT_STATUS.accepted;
    state.rejectReason = LOADOUT_REJECT_REASON.none;
    return toStateMessage(state, serverTick);
  }

  function resetAll(serverTickValue: number): readonly ServerLoadoutStateMessage[] {
    const serverTick = readUint32(serverTickValue, "serverTick");
    const resetStates: ServerLoadoutStateMessage[] = [];
    for (const state of sessions.values()) {
      state.selectedProfileId = 0;
      state.lastSelectionSequence = 0;
      state.status = LOADOUT_STATUS.unselected;
      state.rejectReason = LOADOUT_REJECT_REASON.none;
      resetStates.push(toStateMessage(state, serverTick));
    }
    return resetStates;
  }

  function getStateMessage(sessionIdValue: number, serverTick: number): ServerLoadoutStateMessage | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const state = sessions.get(sessionId);
    return state === undefined ? undefined : toStateMessage(state, readUint32(serverTick, "serverTick"));
  }

  function getSelectedProfileId(sessionIdValue: number): LoadoutProfileId | undefined {
    const sessionId = readPositiveUint32(sessionIdValue, "sessionId");
    const selectedProfileId = sessions.get(sessionId)?.selectedProfileId;
    if (selectedProfileId === undefined || selectedProfileId === 0) {
      return undefined;
    }
    return selectedProfileId;
  }

  return {
    assignSession,
    removeSession,
    selectLoadout,
    resetAll,
    getStateMessage,
    getSelectedProfileId
  };
}

export function createRejectedLoadoutState(input: Readonly<{
  sequence: number;
  serverTick: number;
  rejectReason: LoadoutRejectReason;
}>): ServerLoadoutStateMessage {
  return {
    kind: "server.loadout.state",
    serverTick: readUint32(input.serverTick, "serverTick"),
    sequence: readUint32(input.sequence, "sequence"),
    sessionId: 0,
    profileId: 0,
    status: LOADOUT_STATUS.rejected,
    rejectReason: input.rejectReason
  };
}

export function createLoadoutSelectionFromMessage(
  message: ClientLoadoutSelectMessage,
  input: Readonly<{
    sessionId: number;
    serverTick: number;
  }>
): LoadoutSelectionInput {
  return {
    sessionId: input.sessionId,
    sequence: message.sequence,
    profileId: message.profileId,
    serverTick: input.serverTick
  };
}

function rejectForSession(
  state: MutableLoadoutSessionState,
  sequence: number,
  serverTick: number,
  rejectReason: LoadoutRejectReason
): ServerLoadoutStateMessage {
  state.status = LOADOUT_STATUS.rejected;
  state.rejectReason = rejectReason;
  return toStateMessage(state, serverTick, sequence);
}

function toStateMessage(
  state: MutableLoadoutSessionState,
  serverTick: number,
  sequence = state.lastSelectionSequence
): ServerLoadoutStateMessage {
  return {
    kind: "server.loadout.state",
    serverTick,
    sequence,
    sessionId: state.sessionId,
    profileId: state.selectedProfileId,
    status: state.status,
    rejectReason: state.rejectReason
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
