import { getPlayerCallsign } from "@breachline/shared";

import type { ConnectionStatus, ConnectionViewState } from "./connection-state.js";

export type DeveloperTelemetryStatus = "ok" | "warn" | "error" | "waiting";

export type DeveloperTelemetryItem = Readonly<{
  id: string;
  label: string;
  status: DeveloperTelemetryStatus;
  summary: string;
}>;

export type DeveloperTelemetrySummary = Readonly<{
  overallStatus: DeveloperTelemetryStatus;
  readyForPrivatePlaytest: boolean;
  items: readonly DeveloperTelemetryItem[];
}>;

const STATUS_PRIORITY: Readonly<Record<DeveloperTelemetryStatus, number>> = {
  ok: 0,
  waiting: 1,
  warn: 2,
  error: 3
};

export function createDeveloperTelemetrySummary(state: ConnectionViewState): DeveloperTelemetrySummary {
  const items: readonly DeveloperTelemetryItem[] = [
    summarizeConnection(state),
    summarizeCadence(state),
    summarizePrediction(state),
    summarizeRemoteInterpolation(state),
    summarizeLoadout(state),
    summarizeWeapon(state),
    summarizeFire(state),
    summarizeCombat(state),
    summarizeRound(state),
    summarizeRoster(state),
    summarizeErrors(state)
  ];
  const overallStatus = items.reduce<DeveloperTelemetryStatus>(
    (current, item) => (STATUS_PRIORITY[item.status] > STATUS_PRIORITY[current] ? item.status : current),
    "ok"
  );
  const requiredIds = new Set(["connection", "cadence", "prediction", "loadout", "combat", "round", "errors"]);
  const readyForPrivatePlaytest = items.every((item) => {
    if (!requiredIds.has(item.id)) {
      return item.status !== "error";
    }
    return item.status === "ok";
  });

  return {
    overallStatus,
    readyForPrivatePlaytest,
    items
  };
}

function summarizeConnection(state: ConnectionViewState): DeveloperTelemetryItem {
  return createItem(
    "connection",
    "Connection",
    statusFromConnection(state.status),
    state.status === "accepted"
      ? `Accepted session ${formatNumber(state.sessionId)} over local transport.`
      : `Connection state is ${state.status}.`
  );
}

function summarizeCadence(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.serverTick === undefined || state.lastSnapshotTick === undefined) {
    return createItem("cadence", "Cadence", "waiting", "Waiting for tick and snapshot messages.");
  }

  if (state.observedTickRateHz === undefined || state.observedSnapshotRateHz === undefined) {
    return createItem("cadence", "Cadence", "waiting", "Tick and snapshot messages are present; cadence is still sampling.");
  }

  return createItem(
    "cadence",
    "Cadence",
    "ok",
    `Tick ${formatRate(state.observedTickRateHz)}, snapshot ${formatRate(state.observedSnapshotRateHz)}, RTT ${formatMilliseconds(state.lastRttMs)}.`
  );
}

function summarizePrediction(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.predictedLocalEntityPosition === undefined || state.lastReconciledSnapshotTick === undefined) {
    return createItem("prediction", "Prediction", "waiting", "Waiting for local prediction and reconciliation samples.");
  }

  return createItem(
    "prediction",
    "Prediction",
    "ok",
    `Reconciled at snapshot ${state.lastReconciledSnapshotTick}; correction ${formatMeters(state.predictionCorrectionMagnitude)}.`
  );
}

function summarizeRemoteInterpolation(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.remoteEntityCount === 0) {
    return createItem(
      "remote-interpolation",
      "Remote Interpolation",
      "waiting",
      "Open a second diagnostics client to observe remote interpolation."
    );
  }

  if (state.representativeRemoteEntityPosition === undefined) {
    return createItem(
      "remote-interpolation",
      "Remote Interpolation",
      "waiting",
      `Tracking ${state.remoteEntityCount} remote entity references; waiting for a sampled pose.`
    );
  }

  return createItem(
    "remote-interpolation",
    "Remote Interpolation",
    "ok",
    `${state.remoteEntityCount} remote entity, ${state.remoteInterpolationBufferedSnapshotCount} buffered snapshots.`
  );
}

function summarizeLoadout(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.loadoutStatus === undefined) {
    return createItem("loadout", "Loadout", "waiting", "Waiting for server loadout validation.");
  }

  if (state.loadoutRejectReason !== undefined && state.loadoutRejectReason !== 0) {
    return createItem("loadout", "Loadout", "warn", `Loadout rejected with reason ${state.loadoutRejectReason}.`);
  }

  return createItem("loadout", "Loadout", "ok", `Profile ${formatNumber(state.loadoutProfileId)} accepted.`);
}

function summarizeWeapon(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.weaponProfileId === undefined || state.weaponMagazineSize === undefined) {
    return createItem("weapon", "Weapon", "waiting", "Waiting for server weapon state.");
  }

  const ammo = `ammo ${formatNumber(state.weaponAmmoInMagazine)}/${formatNumber(state.weaponMagazineSize)}`;
  if (state.weaponReloading === true) {
    return createItem("weapon", "Weapon", "ok", `Profile ${formatNumber(state.weaponProfileId)} reloading; ${ammo}.`);
  }

  return createItem("weapon", "Weapon", "ok", `Profile ${formatNumber(state.weaponProfileId)} ready; ${ammo}.`);
}

function summarizeFire(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.lastFireResultSequence === undefined) {
    return createItem("fire", "Fire", "waiting", "Waiting for server fire validation.");
  }

  if (state.lastFireAccepted === false) {
    return createItem("fire", "Fire", "warn", `Fire sequence ${state.lastFireResultSequence} rejected.`);
  }

  return createItem(
    "fire",
    "Fire",
    "ok",
    `Fire sequence ${state.lastFireResultSequence} accepted; hit ${formatBoolean(state.lastFireHit)}.`
  );
}

function summarizeCombat(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.localHealth === undefined || state.localMaxHealth === undefined || state.localAlive === undefined) {
    return createItem("combat", "Combat", "waiting", "Waiting for server combat state.");
  }

  if (!state.localAlive) {
    return createItem("combat", "Combat", "warn", `Local entity is dead at ${state.localHealth}/${state.localMaxHealth}.`);
  }

  return createItem("combat", "Combat", "ok", `Local entity alive at ${state.localHealth}/${state.localMaxHealth}.`);
}

function summarizeRound(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.roundId === undefined || state.roundPhase === undefined) {
    return createItem("round", "Round", "waiting", "Waiting for server round state.");
  }

  return createItem(
    "round",
    "Round",
    "ok",
    `Round ${state.roundId}, phase ${state.roundPhase}, outcome ${formatNumber(state.roundOutcome)}.`
  );
}

function summarizeRoster(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.matchRoster.length === 0) {
    return createItem("roster", "Roster", "waiting", "Waiting for server match roster.");
  }

  const localEntry = state.matchRoster.find((entry) => entry.sessionId === state.sessionId);
  const callsign = localEntry === undefined ? undefined : getPlayerCallsign(localEntry.handleId);
  const localLabel = callsign === undefined ? "" : ` Local callsign ${callsign}.`;
  return createItem(
    "roster",
    "Roster",
    "ok",
    `${state.matchRoster.length} player${state.matchRoster.length === 1 ? "" : "s"} in match.${localLabel}`
  );
}

function summarizeErrors(state: ConnectionViewState): DeveloperTelemetryItem {
  if (state.error !== undefined) {
    return createItem("errors", "Errors", "error", state.error);
  }

  return createItem("errors", "Errors", "ok", state.lastDisconnectReason === undefined ? "No current error." : `Last disconnect: ${state.lastDisconnectReason}.`);
}

function createItem(
  id: string,
  label: string,
  status: DeveloperTelemetryStatus,
  summary: string
): DeveloperTelemetryItem {
  return {
    id,
    label,
    status,
    summary
  };
}

function statusFromConnection(status: ConnectionStatus): DeveloperTelemetryStatus {
  switch (status) {
    case "accepted":
      return "ok";
    case "rejected":
    case "error":
      return "error";
    case "closed":
    case "connecting":
    case "disconnected":
      return "waiting";
  }
}

function formatRate(value: number): string {
  return `${value.toFixed(1)} Hz`;
}

function formatMilliseconds(value: number | undefined): string {
  return value === undefined ? "no RTT sample" : `${value.toFixed(0)} ms RTT`;
}

function formatMeters(value: number | undefined): string {
  return value === undefined ? "pending" : `${value.toFixed(3)} m`;
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? "-" : value.toString();
}

function formatBoolean(value: boolean | undefined): string {
  return value === undefined ? "unknown" : value ? "yes" : "no";
}
