import {
  CLIENT_INPUT_BUTTONS,
  COMBAT_EVENT_KIND,
  DEFAULT_WEAPON_PROFILE_ID,
  FIRE_REJECT_REASON,
  LOADOUT_REJECT_REASON,
  LOADOUT_STATUS,
  ROUND_EVENT_KIND,
  ROUND_OUTCOME,
  ROUND_PHASE,
  WEAPON_EVENT_KIND,
  createClientFireIntent,
  createClientInputPlaceholder,
  createClientLoadoutSelect,
  getWeaponDefinition,
  PROTOCOL_VERSION,
  type MessageTransport
} from "@breachline/shared";

import {
  createInitialConnectionViewState,
  reduceConnectionViewState,
  type ConnectionViewState
} from "./connection-state.js";
import { createDeveloperTelemetrySummary, type DeveloperTelemetryStatus } from "./developer-telemetry.js";
import { connectBrowserWebSocketFallback } from "./transport/websocket-browser.js";

const statusEl = requireElement("status");
const tickEl = requireElement("server-tick");
const snapshotEl = requireElement("snapshot-tick");
const rttEl = requireElement("rtt");
const lastMessageEl = requireElement("last-message");
const tickRateEl = requireElement("tick-rate");
const snapshotRateEl = requireElement("snapshot-rate");
const uptimeEl = requireElement("uptime");
const lastDisconnectEl = requireElement("last-disconnect");
const rttCurrentEl = requireElement("rtt-current");
const rttMinEl = requireElement("rtt-min");
const rttMaxEl = requireElement("rtt-max");
const rttAverageEl = requireElement("rtt-average");
const rttHistoryEl = requireElement("rtt-history");
const matchIdEl = requireElement("match-id");
const sessionIdEl = requireElement("session-id");
const slotIndexEl = requireElement("slot-index");
const matchCapacityEl = requireElement("match-capacity");
const connectedSlotsEl = requireElement("connected-slots");
const matchRejectionEl = requireElement("match-rejection");
const lastInputSentEl = requireElement("last-input-sent");
const lastInputAckEl = requireElement("last-input-ack");
const inputDropsEl = requireElement("input-drops");
const inputSendRateEl = requireElement("input-send-rate");
const lastFireSentEl = requireElement("last-fire-sent");
const lastFireResultEl = requireElement("last-fire-result");
const fireSendRateEl = requireElement("fire-send-rate");
const fireResultTickEl = requireElement("fire-result-tick");
const fireAcceptedEl = requireElement("fire-accepted");
const fireHitEl = requireElement("fire-hit");
const fireTargetEntityEl = requireElement("fire-target-entity");
const fireTargetSessionEl = requireElement("fire-target-session");
const fireDistanceEl = requireElement("fire-distance");
const fireRejectReasonEl = requireElement("fire-reject-reason");
const combatEntityEl = requireElement("combat-entity");
const combatHealthEl = requireElement("combat-health");
const combatAliveEl = requireElement("combat-alive");
const combatDeathTickEl = requireElement("combat-death-tick");
const combatRespawnTickEl = requireElement("combat-respawn-tick");
const combatEventEl = requireElement("combat-event");
const combatEventTickEl = requireElement("combat-event-tick");
const combatEventSequenceEl = requireElement("combat-event-sequence");
const combatSourceSessionEl = requireElement("combat-source-session");
const combatTargetSessionEl = requireElement("combat-target-session");
const combatDamageEl = requireElement("combat-damage");
const loadoutProfileEl = requireElement("loadout-profile");
const loadoutStatusEl = requireElement("loadout-status");
const loadoutRejectReasonEl = requireElement("loadout-reject-reason");
const loadoutSequenceEl = requireElement("loadout-sequence");
const weaponProfileEl = requireElement("weapon-profile");
const weaponAmmoEl = requireElement("weapon-ammo");
const weaponReloadingEl = requireElement("weapon-reloading");
const weaponReloadCompleteEl = requireElement("weapon-reload-complete");
const weaponEventEl = requireElement("weapon-event");
const weaponEventSequenceEl = requireElement("weapon-event-sequence");
const weaponServerTickEl = requireElement("weapon-server-tick");
const roundIdEl = requireElement("round-id");
const roundPhaseEl = requireElement("round-phase");
const roundOutcomeEl = requireElement("round-outcome");
const roundWinnerEl = requireElement("round-winner");
const roundPhaseStartedEl = requireElement("round-phase-started");
const roundPhaseEndsEl = requireElement("round-phase-ends");
const roundResetReadyEl = requireElement("round-reset-ready");
const roundEventEl = requireElement("round-event");
const roundEventTickEl = requireElement("round-event-tick");
const roundEventSequenceEl = requireElement("round-event-sequence");
const roundServerTickEl = requireElement("round-server-tick");
const worldIdEl = requireElement("world-id");
const worldEntityCountEl = requireElement("world-entity-count");
const worldSnapshotTickEl = requireElement("world-snapshot-tick");
const localEntityIdEl = requireElement("local-entity-id");
const localEntityPositionEl = requireElement("local-entity-position");
const localEntityYawEl = requireElement("local-entity-yaw");
const predictedPositionEl = requireElement("predicted-position");
const predictedYawEl = requireElement("predicted-yaw");
const predictionCorrectionEl = requireElement("prediction-correction");
const predictionPendingInputsEl = requireElement("prediction-pending-inputs");
const predictionReplayCountEl = requireElement("prediction-replay-count");
const predictionSnapshotTickEl = requireElement("prediction-snapshot-tick");
const remoteEntityCountEl = requireElement("remote-entity-count");
const remoteBufferedSnapshotsEl = requireElement("remote-buffered-snapshots");
const remoteInterpolationDelayEl = requireElement("remote-interpolation-delay");
const remoteInterpolationTickEl = requireElement("remote-interpolation-tick");
const remoteInterpolationTimeEl = requireElement("remote-interpolation-time");
const remoteEntityIdEl = requireElement("remote-entity-id");
const remoteEntityPositionEl = requireElement("remote-entity-position");
const remoteEntityYawEl = requireElement("remote-entity-yaw");
const countsEl = requireElement("message-counts");
const errorEl = requireElement("error");
const urlInput = requireInput("server-url");
const connectButton = requireButton("connect");
const disconnectButton = requireButton("disconnect");
const telemetryOverallEl = requireElement("telemetry-overall");
const telemetryReadinessEl = requireElement("telemetry-readiness");
const telemetrySummaryEl = requireElement("telemetry-summary");

let state = createInitialConnectionViewState(Date.now());
let transport: MessageTransport | undefined;
let sequence = 0;
let fireSequence = 0;
let loadoutSequence = 0;
let pingTimer: ReturnType<typeof setInterval> | undefined;
let inputTimer: ReturnType<typeof setInterval> | undefined;
let fireTimer: ReturnType<typeof setInterval> | undefined;
let renderTimer: ReturnType<typeof setInterval> | undefined;

urlInput.value = `ws://${globalThis.location.host}`;
render(state);

connectButton.addEventListener("click", () => {
  void connect();
});
disconnectButton.addEventListener("click", () => {
  disconnect();
});

async function connect(): Promise<void> {
  disconnectTimers();
  const previousTransport = transport;
  transport = undefined;
  previousTransport?.close();
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: Date.now()
  });
  render(state);

  try {
    const nextTransport = await connectBrowserWebSocketFallback(urlInput.value.trim());
    transport = nextTransport;
    nextTransport.onMessage((message) => {
      if (transport !== nextTransport) {
        return;
      }

      state = reduceConnectionViewState(state, {
        type: "message",
        nowMs: Date.now(),
        message
      });
      render(state);

      if (message.kind === "protocol.accept") {
        startHeartbeat();
      }
      if (message.kind === "match.assigned") {
        sendLoadoutSelection();
      }
    });
    nextTransport.onClose(() => {
      if (transport !== nextTransport) {
        return;
      }

      transport = undefined;
      disconnectTimers();
      state = reduceConnectionViewState(state, {
        type: "closed",
        nowMs: Date.now(),
        reason: "transport closed"
      });
      render(state);
    });
    nextTransport.send({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: "browser-dev-view"
    });
  } catch (error) {
    state = reduceConnectionViewState(state, {
      type: "error",
      nowMs: Date.now(),
      error: error instanceof Error ? error.message : String(error)
    });
    render(state);
  }
}

function disconnect(): void {
  disconnectTimers();
  const previousTransport = transport;
  transport = undefined;
  previousTransport?.close();
  state = reduceConnectionViewState(state, {
    type: "closed",
    nowMs: Date.now(),
    reason: "client disconnect"
  });
  render(state);
}

function startHeartbeat(): void {
  if (pingTimer !== undefined) {
    return;
  }

  sendPing();
  sendMovementProbeInput();
  sendFireProbe();
  pingTimer = setInterval(sendPing, 1000);
  inputTimer = setInterval(sendMovementProbeInput, 500);
  fireTimer = setInterval(sendFireProbe, 1500);
  renderTimer = setInterval(() => {
    render(state);
  }, 250);
}

function sendPing(): void {
  if (transport === undefined) {
    return;
  }

  sequence += 1;
  const clientTimeMs = Date.now();
  state = reduceConnectionViewState(state, {
    type: "ping-sent",
    sequence,
    clientTimeMs
  });
  transport.send({
    kind: "ping",
    sequence,
    clientTimeMs
  });
}

function sendMovementProbeInput(): void {
  if (transport === undefined) {
    return;
  }

  sequence += 1;
  const clientTimeMs = Date.now();
  const message = {
    ...createClientInputPlaceholder(sequence, clientTimeMs),
    buttons: CLIENT_INPUT_BUTTONS.forward,
    yaw: 0,
    pitch: 0
  };
  state = reduceConnectionViewState(state, {
    type: "input-sent",
    sequence,
    clientTimeMs,
    message
  });
  transport.send(message);
}

function sendFireProbe(): void {
  if (transport === undefined) {
    return;
  }

  fireSequence += 1;
  const clientTimeMs = Date.now();
  const message = createClientFireIntent({
    sequence: fireSequence,
    clientTimeMs,
    clientTick: state.serverTick ?? 0,
    yaw: state.predictedLocalEntityYaw ?? state.localEntityYaw ?? 0,
    pitch: 0
  });
  state = reduceConnectionViewState(state, {
    type: "fire-sent",
    sequence: fireSequence,
    clientTimeMs,
    message
  });
  transport.send(message);
}

function sendLoadoutSelection(): void {
  if (transport === undefined) {
    return;
  }

  loadoutSequence += 1;
  transport.send(
    createClientLoadoutSelect({
      sequence: loadoutSequence,
      profileId: DEFAULT_WEAPON_PROFILE_ID
    })
  );
}

function disconnectTimers(): void {
  if (pingTimer !== undefined) {
    clearInterval(pingTimer);
    pingTimer = undefined;
  }

  if (inputTimer !== undefined) {
    clearInterval(inputTimer);
    inputTimer = undefined;
  }

  if (fireTimer !== undefined) {
    clearInterval(fireTimer);
    fireTimer = undefined;
  }

  if (renderTimer !== undefined) {
    clearInterval(renderTimer);
    renderTimer = undefined;
  }
}

function render(nextState: ConnectionViewState): void {
  statusEl.textContent = nextState.status;
  statusEl.dataset.status = nextState.status;
  tickEl.textContent = formatNumber(nextState.serverTick);
  snapshotEl.textContent = formatNumber(nextState.lastSnapshotTick);
  rttEl.textContent = nextState.lastRttMs === undefined ? "-" : `${nextState.lastRttMs.toFixed(0)} ms`;
  tickRateEl.textContent = formatRate(nextState.observedTickRateHz);
  snapshotRateEl.textContent = formatRate(nextState.observedSnapshotRateHz);
  uptimeEl.textContent = formatDuration(nextState.connectedAtMs === undefined ? undefined : Date.now() - nextState.connectedAtMs);
  lastDisconnectEl.textContent = nextState.lastDisconnectReason ?? "-";
  rttCurrentEl.textContent = formatMilliseconds(nextState.rttStats.currentMs);
  rttMinEl.textContent = formatMilliseconds(nextState.rttStats.minMs);
  rttMaxEl.textContent = formatMilliseconds(nextState.rttStats.maxMs);
  rttAverageEl.textContent = formatMilliseconds(nextState.rttStats.averageMs);
  rttHistoryEl.textContent =
    nextState.rttHistoryMs.length === 0
      ? "No RTT samples yet"
      : nextState.rttHistoryMs.map((value) => `${value.toFixed(0)} ms`).join(" | ");
  matchIdEl.textContent = formatNumber(nextState.matchId);
  sessionIdEl.textContent = formatNumber(nextState.sessionId);
  slotIndexEl.textContent = formatNumber(nextState.slotIndex);
  matchCapacityEl.textContent = formatNumber(nextState.matchCapacity);
  connectedSlotsEl.textContent = formatNumber(nextState.connectedSlots);
  matchRejectionEl.textContent = nextState.matchRejectionReason ?? "-";
  lastInputSentEl.textContent = formatNumber(nextState.lastSentInputSequence);
  lastInputAckEl.textContent = formatNumber(nextState.lastAcknowledgedInputSequence);
  inputDropsEl.textContent = formatNumber(nextState.droppedInputCount);
  inputSendRateEl.textContent = formatRate(nextState.inputSendRateHz);
  lastFireSentEl.textContent = formatNumber(nextState.lastSentFireSequence);
  lastFireResultEl.textContent = formatNumber(nextState.lastFireResultSequence);
  fireSendRateEl.textContent = formatRate(nextState.fireSendRateHz);
  fireResultTickEl.textContent = formatNumber(nextState.lastFireResultServerTick);
  fireAcceptedEl.textContent = formatBoolean(nextState.lastFireAccepted);
  fireHitEl.textContent = formatBoolean(nextState.lastFireHit);
  fireTargetEntityEl.textContent = formatNumber(nextState.lastFireTargetEntityId);
  fireTargetSessionEl.textContent = formatNumber(nextState.lastFireTargetSessionId);
  fireDistanceEl.textContent =
    nextState.lastFireDistance === undefined ? "-" : `${formatFixed(nextState.lastFireDistance)} m`;
  fireRejectReasonEl.textContent = formatFireRejectReason(nextState.lastFireRejectReason);
  combatEntityEl.textContent = formatNumber(nextState.localCombatEntityId);
  combatHealthEl.textContent =
    nextState.localHealth === undefined || nextState.localMaxHealth === undefined
      ? "-"
      : `${nextState.localHealth}/${nextState.localMaxHealth}`;
  combatAliveEl.textContent = formatBoolean(nextState.localAlive);
  combatDeathTickEl.textContent = formatNumber(nextState.localDeathTick);
  combatRespawnTickEl.textContent = formatNumber(nextState.localRespawnEligibleTick);
  combatEventEl.textContent = formatCombatEvent(nextState.lastCombatEventKind);
  combatEventTickEl.textContent = formatNumber(nextState.lastCombatEventTick);
  combatEventSequenceEl.textContent = formatNumber(nextState.lastCombatEventSequence);
  combatSourceSessionEl.textContent = formatNumber(nextState.lastCombatSourceSessionId);
  combatTargetSessionEl.textContent = formatNumber(nextState.lastCombatTargetSessionId);
  combatDamageEl.textContent = formatNumber(nextState.lastCombatDamage);
  loadoutProfileEl.textContent = formatLoadoutProfile(nextState.loadoutProfileId);
  loadoutStatusEl.textContent = formatLoadoutStatus(nextState.loadoutStatus);
  loadoutRejectReasonEl.textContent = formatLoadoutRejectReason(nextState.loadoutRejectReason);
  loadoutSequenceEl.textContent = formatNumber(nextState.lastLoadoutSequence);
  weaponProfileEl.textContent = formatLoadoutProfile(nextState.weaponProfileId);
  weaponAmmoEl.textContent = formatWeaponAmmo(nextState.weaponAmmoInMagazine, nextState.weaponMagazineSize);
  weaponReloadingEl.textContent = formatBoolean(nextState.weaponReloading);
  weaponReloadCompleteEl.textContent = formatNumber(nextState.weaponReloadCompleteTick);
  weaponEventEl.textContent = formatWeaponEvent(nextState.lastWeaponEventKind);
  weaponEventSequenceEl.textContent = formatNumber(nextState.lastWeaponEventSequence);
  weaponServerTickEl.textContent = formatNumber(nextState.lastWeaponServerTick);
  roundIdEl.textContent = formatNumber(nextState.roundId);
  roundPhaseEl.textContent = formatRoundPhase(nextState.roundPhase);
  roundOutcomeEl.textContent = formatRoundOutcome(nextState.roundOutcome);
  roundWinnerEl.textContent = formatNumber(nextState.roundWinnerSessionId);
  roundPhaseStartedEl.textContent = formatNumber(nextState.roundPhaseStartedTick);
  roundPhaseEndsEl.textContent = formatNumber(nextState.roundPhaseEndsTick);
  roundResetReadyEl.textContent = formatNumber(nextState.roundResetReadyTick);
  roundEventEl.textContent = formatRoundEvent(nextState.lastRoundEventKind);
  roundEventTickEl.textContent = formatNumber(nextState.lastRoundEventTick);
  roundEventSequenceEl.textContent = formatNumber(nextState.lastRoundEventSequence);
  roundServerTickEl.textContent = formatNumber(nextState.lastRoundServerTick);
  worldIdEl.textContent = formatNumber(nextState.worldId);
  worldEntityCountEl.textContent = formatNumber(nextState.worldEntityCount);
  worldSnapshotTickEl.textContent = formatNumber(nextState.lastWorldSnapshotTick);
  localEntityIdEl.textContent = formatNumber(nextState.localEntityId);
  localEntityPositionEl.textContent =
    nextState.localEntityPosition === undefined
      ? "-"
      : `${formatFixed(nextState.localEntityPosition.x)}, ${formatFixed(nextState.localEntityPosition.y)}, ${formatFixed(nextState.localEntityPosition.z)}`;
  localEntityYawEl.textContent = nextState.localEntityYaw === undefined ? "-" : formatFixed(nextState.localEntityYaw);
  predictedPositionEl.textContent =
    nextState.predictedLocalEntityPosition === undefined
      ? "-"
      : `${formatFixed(nextState.predictedLocalEntityPosition.x)}, ${formatFixed(nextState.predictedLocalEntityPosition.y)}, ${formatFixed(nextState.predictedLocalEntityPosition.z)}`;
  predictedYawEl.textContent =
    nextState.predictedLocalEntityYaw === undefined ? "-" : formatFixed(nextState.predictedLocalEntityYaw);
  predictionCorrectionEl.textContent =
    nextState.predictionCorrectionMagnitude === undefined
      ? "-"
      : `${formatFixed(nextState.predictionCorrectionMagnitude)} m`;
  predictionPendingInputsEl.textContent = nextState.pendingPredictionInputCount.toString();
  predictionReplayCountEl.textContent = nextState.replayedPredictionInputCount.toString();
  predictionSnapshotTickEl.textContent = formatNumber(nextState.lastReconciledSnapshotTick);
  remoteEntityCountEl.textContent = nextState.remoteEntityCount.toString();
  remoteBufferedSnapshotsEl.textContent = nextState.remoteInterpolationBufferedSnapshotCount.toString();
  remoteInterpolationDelayEl.textContent = `${nextState.remoteInterpolationDelayMs.toFixed(0)} ms`;
  remoteInterpolationTickEl.textContent = formatNumber(nextState.lastRemoteInterpolationTick);
  remoteInterpolationTimeEl.textContent = formatMilliseconds(nextState.lastRemoteInterpolationTimeMs);
  remoteEntityIdEl.textContent = formatNumber(nextState.representativeRemoteEntityId);
  remoteEntityPositionEl.textContent =
    nextState.representativeRemoteEntityPosition === undefined
      ? "-"
      : `${formatFixed(nextState.representativeRemoteEntityPosition.x)}, ${formatFixed(nextState.representativeRemoteEntityPosition.y)}, ${formatFixed(nextState.representativeRemoteEntityPosition.z)}`;
  remoteEntityYawEl.textContent =
    nextState.representativeRemoteEntityYaw === undefined ? "-" : formatFixed(nextState.representativeRemoteEntityYaw);
  lastMessageEl.textContent =
    nextState.lastMessageTimeMs === undefined ? "-" : new Date(nextState.lastMessageTimeMs).toLocaleTimeString();
  errorEl.textContent = nextState.error ?? "";
  disconnectButton.disabled = transport === undefined;
  connectButton.disabled = nextState.status === "connecting";
  renderDeveloperTelemetry(nextState);
  renderMessageCounts(nextState);
}

function renderDeveloperTelemetry(nextState: ConnectionViewState): void {
  const summary = createDeveloperTelemetrySummary(nextState);
  telemetryOverallEl.textContent = formatTelemetryStatus(summary.overallStatus);
  telemetryOverallEl.dataset.status = summary.overallStatus;
  telemetryReadinessEl.textContent = summary.readyForPrivatePlaytest ? "ready" : "not ready";
  telemetryReadinessEl.dataset.status = summary.readyForPrivatePlaytest ? "ok" : summary.overallStatus;
  telemetrySummaryEl.innerHTML = "";

  for (const item of summary.items) {
    const element = document.createElement("li");
    element.dataset.status = item.status;
    element.textContent = `${item.label}: ${formatTelemetryStatus(item.status)} - ${item.summary}`;
    telemetrySummaryEl.append(element);
  }
}

function renderMessageCounts(nextState: ConnectionViewState): void {
  countsEl.innerHTML = "";

  const entries = Object.entries(nextState.messageCounts).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No messages yet";
    countsEl.append(item);
    return;
  }

  for (const [kind, count] of entries) {
    const item = document.createElement("li");
    const rate = nextState.messageRatesPerSecond[kind];
    item.textContent = `${kind}: ${count}${rate === undefined ? "" : ` (${rate.toFixed(1)}/s)`}`;
    countsEl.append(item);
  }
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? "-" : value.toString();
}

function formatFixed(value: number): string {
  return value.toFixed(2);
}

function formatMilliseconds(value: number | undefined): string {
  return value === undefined ? "-" : `${value.toFixed(0)} ms`;
}

function formatRate(value: number | undefined): string {
  return value === undefined ? "-" : `${value.toFixed(1)} Hz`;
}

function formatBoolean(value: boolean | undefined): string {
  return value === undefined ? "-" : value ? "yes" : "no";
}

function formatTelemetryStatus(value: DeveloperTelemetryStatus): string {
  switch (value) {
    case "ok":
      return "ok";
    case "warn":
      return "warn";
    case "error":
      return "error";
    case "waiting":
      return "waiting";
  }
}

function formatFireRejectReason(value: number | undefined): string {
  switch (value) {
    case undefined:
      return "-";
    case FIRE_REJECT_REASON.none:
      return "none";
    case FIRE_REJECT_REASON.notAccepted:
      return "not accepted";
    case FIRE_REJECT_REASON.noMatchAssignment:
      return "no match assignment";
    case FIRE_REJECT_REASON.noActiveEntity:
      return "no active entity";
    case FIRE_REJECT_REASON.staleSequence:
      return "stale sequence";
    case FIRE_REJECT_REASON.invalidAim:
      return "invalid aim";
    case FIRE_REJECT_REASON.sourceDead:
      return "source dead";
    case FIRE_REJECT_REASON.roundInactive:
      return "round inactive";
    default:
      return `unknown ${value}`;
  }
}

function formatCombatEvent(value: number | undefined): string {
  switch (value) {
    case undefined:
      return "-";
    case COMBAT_EVENT_KIND.none:
      return "none";
    case COMBAT_EVENT_KIND.damage:
      return "damage";
    case COMBAT_EVENT_KIND.death:
      return "death";
    case COMBAT_EVENT_KIND.respawn:
      return "respawn";
    case COMBAT_EVENT_KIND.reset:
      return "reset";
    default:
      return `unknown ${value}`;
  }
}

function formatLoadoutProfile(value: number | undefined): string {
  if (value === undefined || value === 0) {
    return "-";
  }
  return getWeaponDefinition(value)?.name ?? `unknown ${value}`;
}

function formatLoadoutStatus(value: number | undefined): string {
  switch (value) {
    case undefined:
      return "-";
    case LOADOUT_STATUS.unselected:
      return "unselected";
    case LOADOUT_STATUS.accepted:
      return "accepted";
    case LOADOUT_STATUS.rejected:
      return "rejected";
    default:
      return `unknown ${value}`;
  }
}

function formatLoadoutRejectReason(value: number | undefined): string {
  switch (value) {
    case undefined:
      return "-";
    case LOADOUT_REJECT_REASON.none:
      return "none";
    case LOADOUT_REJECT_REASON.notAccepted:
      return "not accepted";
    case LOADOUT_REJECT_REASON.noMatchAssignment:
      return "no match assignment";
    case LOADOUT_REJECT_REASON.invalidProfile:
      return "invalid profile";
    case LOADOUT_REJECT_REASON.staleSequence:
      return "stale sequence";
    case LOADOUT_REJECT_REASON.alreadySelected:
      return "already selected";
    case LOADOUT_REJECT_REASON.roundLocked:
      return "round locked";
    default:
      return `unknown ${value}`;
  }
}

function formatWeaponAmmo(ammo: number | undefined, magazineSize: number | undefined): string {
  if (ammo === undefined || magazineSize === undefined) {
    return "-";
  }
  return `${ammo}/${magazineSize}`;
}

function formatWeaponEvent(value: number | undefined): string {
  switch (value) {
    case undefined:
      return "-";
    case WEAPON_EVENT_KIND.none:
      return "none";
    case WEAPON_EVENT_KIND.assigned:
      return "assigned";
    case WEAPON_EVENT_KIND.fired:
      return "fired";
    case WEAPON_EVENT_KIND.reloadStart:
      return "reload start";
    case WEAPON_EVENT_KIND.reloadComplete:
      return "reload complete";
    case WEAPON_EVENT_KIND.switched:
      return "switched";
    case WEAPON_EVENT_KIND.reset:
      return "reset";
    default:
      return `unknown ${value}`;
  }
}

function formatRoundPhase(value: number | undefined): string {
  switch (value) {
    case undefined:
      return "-";
    case ROUND_PHASE.setup:
      return "setup";
    case ROUND_PHASE.active:
      return "active";
    case ROUND_PHASE.ended:
      return "ended";
    case ROUND_PHASE.reset:
      return "reset";
    default:
      return `unknown ${value}`;
  }
}

function formatRoundOutcome(value: number | undefined): string {
  switch (value) {
    case undefined:
      return "-";
    case ROUND_OUTCOME.none:
      return "none";
    case ROUND_OUTCOME.elimination:
      return "elimination";
    case ROUND_OUTCOME.timeout:
      return "timeout";
    default:
      return `unknown ${value}`;
  }
}

function formatRoundEvent(value: number | undefined): string {
  switch (value) {
    case undefined:
      return "-";
    case ROUND_EVENT_KIND.none:
      return "none";
    case ROUND_EVENT_KIND.setup:
      return "setup";
    case ROUND_EVENT_KIND.active:
      return "active";
    case ROUND_EVENT_KIND.ended:
      return "ended";
    case ROUND_EVENT_KIND.reset:
      return "reset";
    default:
      return `unknown ${value}`;
  }
}

function formatDuration(valueMs: number | undefined): string {
  if (valueMs === undefined) {
    return "-";
  }

  const totalSeconds = Math.max(0, Math.floor(valueMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

function requireInput(id: string): HTMLInputElement {
  const element = requireElement(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`#${id} must be an input element`);
  }
  return element;
}

function requireButton(id: string): HTMLButtonElement {
  const element = requireElement(id);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`#${id} must be a button element`);
  }
  return element;
}
