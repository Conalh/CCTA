import * as THREE from "three";

import {
  DEFAULT_WEAPON_PROFILE_ID,
  PROTOCOL_VERSION,
  createClientFireIntent,
  createClientLoadoutSelect,
  createClientWeaponReload,
  type MessageTransport
} from "@breachline/shared";

import {
  createInitialConnectionViewState,
  reduceConnectionViewState,
  type ConnectionViewState
} from "../browser/connection-state.js";
import { connectBrowserWebSocketFallback } from "../browser/transport/websocket-browser.js";
import {
  createNetworkSimulatedTransport,
  readNetworkSimulationProfileFromSearch
} from "../browser/transport/network-simulation.js";
import { DRYDOCK_SPAN_ARENA } from "../maps/drydock-span.js";
import { createGreyboxLayoutFromMap, type GreyboxPrimitive } from "../sandbox/greybox-layout.js";
import {
  isRenderablePixelSampleHealthy,
  summarizeScenePixelSamples,
  type ScenePixelSampleSummary
} from "../sandbox/render-telemetry.js";
import {
  createInitialFireResultPresentationState,
  formatFireResultPresentationStatus,
  updateFireResultPresentationState,
  type FireResultPresentationEffect,
  type FireResultPresentationState
} from "./fire-result-presentation.js";
import {
  createFirstPersonShellPresentation,
  formatFirstPersonShellStatus,
  type FirstPersonShellPart,
  type FirstPersonShellPresentation
} from "./first-person-shell.js";
import {
  createInitialNetworkedPlaytestReviewStats,
  createNetworkedPlaytestInputMessage,
  createNetworkedPlaytestPresentation,
  classifyNetworkedPlaytestMotionContact,
  holdPlaytestMotionContact,
  formatPlaytestMatchOccupancy,
  formatPlaytestStance,
  formatPlaytestWeaponName,
  formatPlaytestWeaponAmmo,
  formatPlaytestMatchResult,
  NETWORKED_PLAYTEST_INPUT_INTERVAL_MS,
  smoothNetworkedPlaytestCameraPosition,
  updateNetworkedPlaytestReviewStats,
  type NetworkedPlaytestMotionContact,
  type NetworkedPlaytestPresentation,
  type NetworkedPlaytestReviewStats,
  type NetworkedPlaytestRemoteAim,
  deriveNetworkedPlaytestAimAtRemote
} from "./playtest-state.js";
import {
  createRemotePlayerPresentationModels,
  REMOTE_PLAYER_PRESENTATION_CROUCH_SCALE,
  type RemotePlayerPresentationModel,
  type RemotePlayerPresentationPart
} from "./remote-player-presentation.js";
import {
  createInitialRoundCombatPresentationState,
  updateRoundCombatPresentationState,
  type RoundCombatPresentationState
} from "./round-combat-presentation.js";
import {
  createRosterPresentation,
  type RosterPresentation
} from "./roster-presentation.js";
import {
  createScoreboardPresentation,
  type ScoreboardPresentation
} from "./scoreboard-presentation.js";
import {
  SERVER_BROWSER_BUILD_ID,
  SERVER_BROWSER_TABS,
  addRecentServer,
  buildServerBrowserEntries,
  countServerBrowserTabs,
  fetchRegistryMatches,
  filterServerBrowserEntriesByTab,
  formatMapCell,
  formatPingCell,
  formatPlayersCell,
  parseManualJoinTarget,
  readFavoriteServers,
  readRecentServers,
  resolveMenuPanel,
  sortServerBrowserEntries,
  toggleFavoriteServer,
  type FavoriteServerEntry,
  type MenuPanel,
  type RecentServerEntry,
  type RegistryMatchListing,
  type ServerBrowserEntry,
  type ServerBrowserTab,
  type ServerSortDirection,
  type ServerSortKey
} from "./server-browser.js";

declare global {
  interface Window {
    __BREACHLINE_PLAYTEST_STATE__?: Readonly<{
      cameraPosition: readonly [number, number, number];
      connectionStatus: string;
      error: string | undefined;
      activeFireTracerCount: number;
      fireResultExpiredEffectCount: number;
      fireResultHighlightedRemoteEntityId: number | undefined;
      fireResultHitState: string;
      fireResultHitmarkerActive: boolean;
      fireResultPresentationStatus: string;
      fireResultVisualizedSequence: number | undefined;
      frameCount: number;
      firstPersonShellActivity: string;
      firstPersonShellAttachedToCamera: boolean;
      firstPersonShellPartCount: number;
      firstPersonShellStatus: string;
      lastFireIntentSequence: number | undefined;
      localCameraSource: string;
      localCombatCue: string;
      localCombatEvent: string;
      localCrouched: boolean;
      localHealth: string;
      localLife: string;
      localStance: string;
      localRespawnCue: string;
      localLookPitchRadians: number;
      localLookYawRadians: number;
      localEntityId: number | undefined;
      mapId: string;
      mapRevision: number;
      matchOccupancy: string;
      motionContact: NetworkedPlaytestMotionContact;
      networkSimulationBaseLatencyMs: number;
      networkSimulationDropRate: number;
      networkSimulationJitterMs: number;
      networkSimulationProfileId: string;
      networkSimulationProfileLabel: string;
      predictedPosition: readonly [number, number, number] | undefined;
      predictionCorrectionMaxMagnitude: number | undefined;
      predictionCorrectionMagnitude: number | undefined;
      reconnectCount: number;
      remoteEntityCount: number;
      remoteFacingMarkerCount: number;
      remoteHighlightedTargetId: number | undefined;
      remoteInterpolationSourceTick: number | undefined;
      remoteModelCount: number;
      remotePlaceholderCount: number;
      remoteTargetCenterCount: number;
      renderSample: ScenePixelSampleSummary;
      renderSampleHealthy: boolean;
      rosterEntryCount: number;
      rosterLastServerTick: number | undefined;
      rosterLocalCallsign: string | undefined;
      rosterRows: readonly Readonly<{
        callsign: string;
        isLocalSession: boolean;
        sessionId: number;
        slotIndex: number;
        weaponLabel: string;
      }>[];
      remoteCombatCue: string;
      remoteCombatCueActive: boolean;
      remoteCombatTargetEntityId: number | undefined;
      resetCue: string;
      roundOutcome: string;
      roundPhase: string;
      roundPresentationTone: string;
      roundTransition: string;
      roundTransitionActive: boolean;
      roundWinner: string;
      roundBanner: string;
      matchOver: boolean;
      matchBanner: string;
      scoreboardEntryCount: number;
      scoreboardLastServerTick: number | undefined;
      scoreboardLocalPosition: number | undefined;
      scoreboardRows: readonly Readonly<{
        callsign: string | undefined;
        deaths: number;
        isLocalSession: boolean;
        kills: number;
        position: number;
        sessionId: number;
      }>[];
      scoreboardSummary: string;
      serverPosition: readonly [number, number, number] | undefined;
      sessionId: number | undefined;
      weaponAmmoInMagazine: number | undefined;
      weaponMagazineSize: number | undefined;
      weaponProfileId: number | undefined;
      weaponReloading: boolean | undefined;
      weaponNameLabel: string;
      weaponAmmoLabel: string;
    }>;
    __BREACHLINE_PLAYTEST_DIAGNOSTICS__?: Readonly<{
      aimAtRemote(targetEntityId?: number): NetworkedPlaytestRemoteAim | undefined;
      aimAtRemoteAndFire(targetEntityId?: number): NetworkedPlaytestRemoteAim | undefined;
      connect(): Promise<void>;
      disconnect(): void;
      fire(): void;
      reload(): void;
    }>;
  }
}

const canvas = requireCanvas("playtest-canvas");
const statusEl = requireElement("playtest-status");
const urlInput = requireInput("playtest-server-url");
const connectButton = requireButton("playtest-connect");
const disconnectButton = requireButton("playtest-disconnect");
const menuEl = requireElement("playtest-menu");
const menuBuildEl = requireElement("playtest-menu-build");
const registryUrlInput = requireInput("playtest-registry-url");
const registryRefreshButton = requireButton("playtest-registry-refresh");
const serverListEl = requireElement("playtest-server-list");
const menuStatusEl = requireElement("playtest-menu-status");
const manualJoinInput = requireInput("playtest-manual-join");
const menuConnectButton = requireButton("playtest-menu-connect");
const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".playtest-nav-button"));
const menuSections = Array.from(document.querySelectorAll<HTMLElement>(".playtest-menu-section"));
const browserTabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".playtest-browser-tab"));
const sortButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".playtest-sort"));
const settingsSensitivityInput = requireInput("playtest-setting-sensitivity");
const settingsSensitivityValueEl = requireElement("playtest-setting-sensitivity-value");
const settingsFovInput = requireInput("playtest-setting-fov");
const settingsFovValueEl = requireElement("playtest-setting-fov-value");
const localEntityEl = requireElement("playtest-local-entity");
const serverPositionEl = requireElement("playtest-server-position");
const predictedPositionEl = requireElement("playtest-predicted-position");
const predictionCorrectionEl = requireElement("playtest-prediction-correction");
const predictionCorrectionMaxEl = requireElement("playtest-prediction-correction-max");
const motionContactEl = requireElement("playtest-motion-contact");
const firstPersonShellEl = requireElement("playtest-first-person-shell");
const fireIntentEl = requireElement("playtest-fire-intent");
const fireResultEl = requireElement("playtest-fire-result");
const fireHitEl = requireElement("playtest-fire-hit");
const hitmarkerEl = requireElement("playtest-hitmarker");
const fireVisualSequenceEl = requireElement("playtest-fire-visual-sequence");
const fireTracerCountEl = requireElement("playtest-fire-tracers");
const fireExpiredCountEl = requireElement("playtest-fire-expired");
const remoteCountEl = requireElement("playtest-remote-count");
const remoteModelCountEl = requireElement("playtest-remote-models");
const remoteHighlightEl = requireElement("playtest-remote-highlight");
const remoteSourceTickEl = requireElement("playtest-remote-source-tick");
const remoteFacingMarkerCountEl = requireElement("playtest-remote-facing-markers");
const remoteTargetCenterCountEl = requireElement("playtest-remote-target-centers");
const reconnectCountEl = requireElement("playtest-reconnect-count");
const lastErrorEl = requireElement("playtest-last-error");
const roundPhaseEl = requireElement("playtest-round-phase");
const roundOutcomeEl = requireElement("playtest-round-outcome");
const roundWinnerEl = requireElement("playtest-round-winner");
const roundBannerEl = requireElement("playtest-round-banner");
const matchBannerEl = requireElement("playtest-match-banner");
const roundTransitionEl = requireElement("playtest-round-transition");
const roundResetCueEl = requireElement("playtest-round-reset-cue");
const localHealthEl = requireElement("playtest-local-health");
const localLifeEl = requireElement("playtest-local-life");
const hudHealthEl = requireElement("playtest-hud-health");
const hudLifeEl = requireElement("playtest-hud-life");
const hudStanceEl = requireElement("playtest-hud-stance");
const hudWeaponEl = requireElement("playtest-hud-weapon");
const hudAmmoEl = requireElement("playtest-hud-ammo");
const hudRespawnEl = requireElement("playtest-hud-respawn");
const readoutEl = requireElement("playtest-readout");
const diagnosticsToggleEl = requireElement("playtest-diagnostics-toggle");
const localCombatEventEl = requireElement("playtest-combat-event");
const localCombatCueEl = requireElement("playtest-combat-cue");
const remoteCombatCueEl = requireElement("playtest-remote-combat");
const scoreboardSummaryEl = requireElement("playtest-scoreboard-summary");
const scoreboardRowsEl = requireElement("playtest-scoreboard-rows");
const rosterSummaryEl = requireElement("playtest-roster-summary");
const rosterRowsEl = requireElement("playtest-roster-rows");
const renderHealthEl = requireElement("playtest-render-health");
const frameCountEl = requireElement("playtest-frame-count");
const matchOccupancyEl = requireElement("playtest-match-occupancy");
const cameraSourceEl = requireElement("playtest-camera-source");
const lookEl = requireElement("playtest-look");
const errorEl = requireElement("playtest-error");
const pointerStateEl = requireElement("playtest-pointer-state");

const keys = new Set<string>();
const remoteMeshes = new Map<number, THREE.Group>();
const greyboxLayout = createGreyboxLayoutFromMap(DRYDOCK_SPAN_ARENA);
const networkSimulationProfile = readNetworkSimulationProfileFromSearch(globalThis.location.search);

let state = createInitialConnectionViewState(Date.now());
let transport: MessageTransport | undefined;
let reviewStats: NetworkedPlaytestReviewStats = createInitialNetworkedPlaytestReviewStats();
let fireResultPresentationState: FireResultPresentationState = createInitialFireResultPresentationState();
let roundCombatPresentationState: RoundCombatPresentationState = createInitialRoundCombatPresentationState();
let sequence = 0;
let fireSequence = 0;
let loadoutSequence = 0;
let reloadSequence = 0;
// Developer diagnostics readout is hidden by default so the playtest reads as a clean
// game; toggled with the controls button or the Backquote key.
let diagnosticsVisible = false;
let yawRadians = 0;
let pitchRadians = 0;
let smoothedCameraPosition: readonly [number, number, number] | undefined;
let previousServerPositionForMotion: readonly [number, number, number] | undefined;
let lastFireIntentSequence: number | undefined;
let lastFireIntentTimeMs: number | undefined;
let lastMotionContact: NetworkedPlaytestMotionContact = "idle";
// Tracks when motion was last classified as moving/sliding, so a blocked reading between
// server snapshots can be held briefly instead of flickering the camera-attached shell.
let lastMotionMovingAtMs: number | undefined;
let firstPersonShellAttachedToCamera = false;
let pingTimer: ReturnType<typeof setInterval> | undefined;
let inputTimer: ReturnType<typeof setInterval> | undefined;
let animationFrame: number | undefined;
let frameCount = 0;
let lastRenderTimeMs = performance.now();
let latestRenderSample: ScenePixelSampleSummary = {
  distinctColorSamples: 0,
  nonBackgroundSamples: 0,
  samples: 0
};
let remotePresentationModelCount = 0;
let remotePresentationSourceTick: number | undefined;
let remotePresentationFacingMarkerCount = 0;
let remotePresentationTargetCenterCount = 0;

const RECENT_SERVERS_STORAGE_KEY = "breachline.recentServers";
const REGISTRY_URL_STORAGE_KEY = "breachline.registryUrl";
const FAVORITE_SERVERS_STORAGE_KEY = "breachline.favoriteServers";
const SENSITIVITY_STORAGE_KEY = "breachline.sensitivity";
const FOV_STORAGE_KEY = "breachline.fov";
const BASE_LOOK_RADIANS_PER_PIXEL = 0.0025;
const DEFAULT_FIELD_OF_VIEW = 74;
let recentServers: readonly RecentServerEntry[] = loadRecentServers();
let favoriteServers: readonly FavoriteServerEntry[] = loadFavoriteServers();
let registryMatches: readonly RegistryMatchListing[] = [];
let pendingConnect: { joinUrl: string; name: string } | undefined;
let activeMenuPanel: MenuPanel = "servers";
let activeServerTab: ServerBrowserTab = "internet";
let serverSortKey: ServerSortKey = "players";
let serverSortDirection: ServerSortDirection = "desc";
let selectedJoinUrl: string | undefined;
let lookSensitivity = loadSensitivity();
let fieldOfView = loadFieldOfView();
let activeCamera: THREE.PerspectiveCamera | undefined;

urlInput.value = `ws://${globalThis.location.host}`;
manualJoinInput.value = `ws://${globalThis.location.host}`;
registryUrlInput.value = loadRegistryUrl();

connectButton.addEventListener("click", () => {
  void connect();
});
disconnectButton.addEventListener("click", () => {
  disconnect("client disconnect");
});
registryRefreshButton.addEventListener("click", () => {
  void refreshServerBrowser();
});
menuConnectButton.addEventListener("click", () => {
  connectToSelectedServer();
});
manualJoinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    connectFromManualEntry();
  }
});
registryUrlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    void refreshServerBrowser();
  }
});
menuBuildEl.textContent = SERVER_BROWSER_BUILD_ID;
for (const button of navButtons) {
  button.addEventListener("click", () => {
    setActiveMenuPanel(resolveMenuPanel(button.dataset.panel));
  });
}
for (const button of browserTabButtons) {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;
    if (tab !== undefined && (SERVER_BROWSER_TABS as readonly string[]).includes(tab)) {
      setActiveServerTab(tab as ServerBrowserTab);
    }
  });
}
for (const button of sortButtons) {
  button.addEventListener("click", () => {
    const key = button.dataset.sort;
    if (key === "name" || key === "players" || key === "map" || key === "ping") {
      toggleServerSort(key);
    }
  });
}
settingsSensitivityInput.value = lookSensitivity.toFixed(2);
settingsFovInput.value = String(fieldOfView);
applySettingsReadouts();
settingsSensitivityInput.addEventListener("input", () => {
  lookSensitivity = clampSensitivity(Number(settingsSensitivityInput.value));
  persistSetting(SENSITIVITY_STORAGE_KEY, lookSensitivity);
  applySettingsReadouts();
});
settingsFovInput.addEventListener("input", () => {
  fieldOfView = clampFieldOfView(Number(settingsFovInput.value));
  persistSetting(FOV_STORAGE_KEY, fieldOfView);
  applyFieldOfView();
  applySettingsReadouts();
});
setActiveMenuPanel("servers");
applyServerSortIndicators();
renderServerBrowser();
void refreshServerBrowser();
diagnosticsToggleEl.addEventListener("click", () => {
  toggleDiagnostics();
});
applyDiagnosticsVisibility();
window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__ = {
  aimAtRemote: aimAtRemoteForLocalDiagnostics,
  aimAtRemoteAndFire: (targetEntityId?: number) => {
    const aim = aimAtRemoteForLocalDiagnostics(targetEntityId);
    if (aim !== undefined) {
      sendFireIntent();
    }
    return aim;
  },
  connect,
  disconnect: () => {
    disconnect("local diagnostics disconnect");
  },
  fire: sendFireIntent,
  reload: sendReloadIntent
};

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#111719");

  const camera = new THREE.PerspectiveCamera(fieldOfView, 1, 0.05, 220);
  camera.rotation.order = "YXZ";
  activeCamera = camera;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const remoteGroup = new THREE.Group();
  remoteGroup.name = "networked-remote-placeholders";
  const firstPersonShellGroup = createFirstPersonShellGroup();
  const fireResultWorldGroup = new THREE.Group();
  fireResultWorldGroup.name = "fire-result-world-presentation";
  const fireResultCameraGroup = new THREE.Group();
  fireResultCameraGroup.name = "fire-result-camera-presentation";

  addLighting(scene);
  addGreyboxPrimitives(scene, greyboxLayout);
  camera.add(firstPersonShellGroup);
  camera.add(fireResultCameraGroup);
  firstPersonShellAttachedToCamera = firstPersonShellGroup.parent === camera;
  scene.add(camera);
  scene.add(remoteGroup);
  scene.add(fireResultWorldGroup);

  const grid = new THREE.GridHelper(18, 18, "#87928c", "#2d3633");
  grid.position.y = 0.01;
  scene.add(grid);

  canvas.addEventListener("click", () => {
    requestPointerLockForCanvas();
  });
  document.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || (document.pointerLockElement !== canvas && event.target !== canvas)) {
      return;
    }

    event.preventDefault();
    sendFireIntent();
  });
  document.addEventListener("pointerlockchange", updatePointerState);
  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement !== canvas) {
      return;
    }

    const step = BASE_LOOK_RADIANS_PER_PIXEL * lookSensitivity;
    yawRadians = normalizeYaw(yawRadians - event.movementX * step);
    pitchRadians = clamp(pitchRadians - event.movementY * step, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
  });
  document.addEventListener("keydown", (event) => {
    if (event.code === "Backquote") {
      event.preventDefault();
      toggleDiagnostics();
      return;
    }

    if (event.code === "KeyR") {
      event.preventDefault();
      sendReloadIntent();
      return;
    }

    if (!isPlaytestInputKey(event.code)) {
      return;
    }

    event.preventDefault();
    keys.add(event.code);
    sendInput();
  });
  document.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });
  window.addEventListener("resize", () => {
    resizeRenderer(renderer, camera);
  });

  updatePointerState();
  resizeRenderer(renderer, camera);
  animationFrame = requestAnimationFrame((timeMs) => {
    animate(timeMs, renderer, scene, camera, remoteGroup, firstPersonShellGroup, fireResultWorldGroup, fireResultCameraGroup);
  });
} catch (error) {
  reportError(error);
}

async function connect(): Promise<void> {
  disconnectTimers();
  const previousTransport = transport;
  transport = undefined;
  previousTransport?.close();
  resetFireResultPresentation();
  resetRoundCombatPresentation();
  state = reduceConnectionViewState(state, {
    type: "connecting",
    nowMs: Date.now()
  });
  updateReadout(readNetworkedPlaytestPresentation());

  try {
    const rawTransport = await connectBrowserWebSocketFallback(urlInput.value.trim());
    const nextTransport = createNetworkSimulatedTransport(rawTransport, networkSimulationProfile);
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

      if (message.kind === "protocol.accept") {
        startNetworkTimers();
        recordConnectedServer();
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
      setMenuStatus("Connection closed.");
      updateReadout(readNetworkedPlaytestPresentation());
    });
    nextTransport.send({
      kind: "protocol.hello",
      protocolVersion: PROTOCOL_VERSION,
      clientName: "browser-networked-playtest"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state = reduceConnectionViewState(state, {
      type: "error",
      nowMs: Date.now(),
      error: message
    });
    setMenuStatus(`Connection failed: ${message}`);
    updateReadout(readNetworkedPlaytestPresentation());
  }
}

function disconnect(reason: string): void {
  disconnectTimers();
  const previousTransport = transport;
  transport = undefined;
  previousTransport?.close();
  resetFireResultPresentation();
  resetRoundCombatPresentation();
  state = reduceConnectionViewState(state, {
    type: "closed",
    nowMs: Date.now(),
    reason
  });
  updateReadout(readNetworkedPlaytestPresentation());
}

function connectToServer(joinUrl: string, name: string): Promise<void> {
  pendingConnect = { joinUrl, name };
  urlInput.value = joinUrl;
  setMenuStatus(`Connecting to ${name}…`);
  return connect();
}

function connectFromManualEntry(): void {
  const parsed = parseManualJoinTarget(manualJoinInput.value);
  if (!parsed.ok) {
    setMenuStatus(parsed.reason);
    return;
  }
  void connectToServer(parsed.joinUrl, parsed.joinUrl);
}

function connectToSelectedServer(): void {
  if (selectedJoinUrl === undefined) {
    connectFromManualEntry();
    return;
  }
  const entry = currentServerEntries().find((candidate) => candidate.joinUrl === selectedJoinUrl);
  if (entry === undefined) {
    connectFromManualEntry();
    return;
  }
  if (entry.full) {
    setMenuStatus(`${entry.name} is full.`);
    return;
  }
  void connectToServer(entry.joinUrl, entry.name);
}

async function refreshServerBrowser(): Promise<void> {
  const registryUrl = registryUrlInput.value.trim();
  persistRegistryUrl(registryUrl);
  if (registryUrl.length === 0) {
    registryMatches = [];
    setMenuStatus("Set a registry address to browse public matches, or use Recent / Favorites.");
    renderServerBrowser();
    return;
  }

  setMenuStatus("Refreshing matches…");
  const result = await fetchRegistryMatches({ registryUrl, buildId: SERVER_BROWSER_BUILD_ID });
  if (!result.ok) {
    registryMatches = [];
    setMenuStatus(result.error);
    renderServerBrowser();
    return;
  }

  registryMatches = result.matches;
  setMenuStatus(
    result.matches.length === 0 ? "No public matches right now." : `${result.matches.length} match(es) on the registry.`
  );
  renderServerBrowser();
}

function currentServerEntries(): readonly ServerBrowserEntry[] {
  return buildServerBrowserEntries({ registryMatches, recentServers, favorites: favoriteServers });
}

function renderServerBrowser(): void {
  const allEntries = currentServerEntries();
  updateServerTabCounts(allEntries);

  const tabEntries = filterServerBrowserEntriesByTab(allEntries, activeServerTab);
  const sorted = sortServerBrowserEntries(tabEntries, serverSortKey, serverSortDirection);

  if (sorted.length === 0) {
    const empty = document.createElement("li");
    empty.className = "playtest-server-empty";
    empty.textContent = emptyTabMessage();
    serverListEl.replaceChildren(empty);
    return;
  }

  serverListEl.replaceChildren(...sorted.map((entry) => createServerRow(entry)));
}

function emptyTabMessage(): string {
  if (activeServerTab === "favorites") {
    return "No favorites yet. Star a server with ☆ to keep it here.";
  }
  if (activeServerTab === "recent") {
    return "No recent servers yet. Join one and it shows up here.";
  }
  return registryUrlInput.value.trim().length === 0
    ? "Set a registry address and Refresh, or paste a join link below."
    : "No matches found. Refresh, or paste a join link below.";
}

function createServerRow(entry: ServerBrowserEntry): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "playtest-server-row";
  row.tabIndex = 0;
  row.dataset.selected = entry.joinUrl === selectedJoinUrl ? "true" : "false";
  row.dataset.full = entry.full ? "true" : "false";

  const lock = cell("bcol bcol-lock", entry.locked ? "🔒" : "");
  const name = cell("bcol bcol-name", entry.name);
  name.title = entry.joinUrl;
  const players = cell("bcol bcol-players", formatPlayersCell(entry));
  const map = cell("bcol bcol-map", formatMapCell(entry));
  const ping = cell("bcol bcol-ping", formatPingCell(entry.ping));

  const favWrap = document.createElement("span");
  favWrap.className = "bcol bcol-fav";
  const fav = document.createElement("button");
  fav.type = "button";
  fav.className = "playtest-fav-toggle";
  fav.dataset.favorite = entry.isFavorite ? "true" : "false";
  fav.textContent = entry.isFavorite ? "★" : "☆";
  fav.title = entry.isFavorite ? "Remove from favorites" : "Add to favorites";
  fav.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavoriteFor(entry);
  });
  favWrap.append(fav);

  row.append(lock, name, players, map, ping, favWrap);
  row.addEventListener("click", () => {
    selectedJoinUrl = entry.joinUrl;
    renderServerBrowser();
  });
  row.addEventListener("dblclick", () => {
    if (entry.full) {
      setMenuStatus(`${entry.name} is full.`);
      return;
    }
    void connectToServer(entry.joinUrl, entry.name);
  });
  return row;
}

function cell(className: string, text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function toggleFavoriteFor(entry: ServerBrowserEntry): void {
  favoriteServers = toggleFavoriteServer(favoriteServers, { joinUrl: entry.joinUrl, name: entry.name });
  persistFavoriteServers();
  renderServerBrowser();
}

function updateServerTabCounts(entries: readonly ServerBrowserEntry[]): void {
  const counts = countServerBrowserTabs(entries);
  for (const tab of SERVER_BROWSER_TABS) {
    const countEl = document.querySelector<HTMLElement>(`[data-count="${tab}"]`);
    if (countEl !== null) {
      countEl.textContent = String(counts[tab]);
    }
  }
}

function setActiveMenuPanel(panel: MenuPanel): void {
  activeMenuPanel = panel;
  for (const button of navButtons) {
    button.dataset.active = button.dataset.panel === panel ? "true" : "false";
  }
  for (const section of menuSections) {
    section.dataset.active = section.dataset.panel === panel ? "true" : "false";
  }
}

function setActiveServerTab(tab: ServerBrowserTab): void {
  activeServerTab = tab;
  selectedJoinUrl = undefined;
  for (const button of browserTabButtons) {
    button.dataset.active = button.dataset.tab === tab ? "true" : "false";
  }
  renderServerBrowser();
}

function toggleServerSort(key: ServerSortKey): void {
  if (serverSortKey === key) {
    serverSortDirection = serverSortDirection === "asc" ? "desc" : "asc";
  } else {
    serverSortKey = key;
    // Text columns read best ascending; numeric columns most-first.
    serverSortDirection = key === "name" || key === "map" ? "asc" : "desc";
  }
  applyServerSortIndicators();
  renderServerBrowser();
}

function applyServerSortIndicators(): void {
  for (const button of sortButtons) {
    if (button.dataset.sort === serverSortKey) {
      button.dataset.direction = serverSortDirection;
    } else {
      delete button.dataset.direction;
    }
  }
}

function recordConnectedServer(): void {
  const target = pendingConnect ?? { joinUrl: urlInput.value.trim(), name: urlInput.value.trim() };
  pendingConnect = undefined;
  if (target.joinUrl.length === 0) {
    return;
  }
  recentServers = addRecentServer(recentServers, {
    joinUrl: target.joinUrl,
    name: target.name,
    lastJoinedMs: Date.now()
  });
  persistRecentServers();
  renderServerBrowser();
}

function updateMenuVisibility(connectionStatus: string): void {
  const inGame = connectionStatus === "accepted" || connectionStatus === "connecting";
  menuEl.dataset.visible = inGame ? "false" : "true";
}

function setMenuStatus(text: string): void {
  menuStatusEl.textContent = text;
}

function applySettingsReadouts(): void {
  settingsSensitivityValueEl.textContent = lookSensitivity.toFixed(2);
  settingsFovValueEl.textContent = String(fieldOfView);
}

function applyFieldOfView(): void {
  if (activeCamera === undefined) {
    return;
  }
  activeCamera.fov = fieldOfView;
  activeCamera.updateProjectionMatrix();
}

function clampSensitivity(value: number): number {
  return Number.isFinite(value) ? Math.min(3, Math.max(0.25, value)) : 1;
}

function clampFieldOfView(value: number): number {
  return Number.isFinite(value) ? Math.min(110, Math.max(70, Math.round(value))) : DEFAULT_FIELD_OF_VIEW;
}

function loadRecentServers(): readonly RecentServerEntry[] {
  return readRecentServers(readStoredJson(RECENT_SERVERS_STORAGE_KEY));
}

function persistRecentServers(): void {
  writeStored(RECENT_SERVERS_STORAGE_KEY, JSON.stringify(recentServers));
}

function loadFavoriteServers(): readonly FavoriteServerEntry[] {
  return readFavoriteServers(readStoredJson(FAVORITE_SERVERS_STORAGE_KEY));
}

function persistFavoriteServers(): void {
  writeStored(FAVORITE_SERVERS_STORAGE_KEY, JSON.stringify(favoriteServers));
}

function loadSensitivity(): number {
  const raw = readStored(SENSITIVITY_STORAGE_KEY);
  return raw === undefined ? 1 : clampSensitivity(Number(raw));
}

function loadFieldOfView(): number {
  const raw = readStored(FOV_STORAGE_KEY);
  return raw === undefined ? DEFAULT_FIELD_OF_VIEW : clampFieldOfView(Number(raw));
}

function persistSetting(key: string, value: number): void {
  writeStored(key, String(value));
}

function loadRegistryUrl(): string {
  try {
    const fromQuery = new URLSearchParams(globalThis.location.search).get("registry");
    if (fromQuery !== null && fromQuery.trim().length > 0) {
      return fromQuery.trim();
    }
  } catch {
    // Ignore malformed query strings.
  }
  return readStored(REGISTRY_URL_STORAGE_KEY) ?? "";
}

function persistRegistryUrl(value: string): void {
  writeStored(REGISTRY_URL_STORAGE_KEY, value);
}

function readStoredJson(key: string): unknown {
  const raw = readStored(key);
  if (raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function readStored(key: string): string | undefined {
  try {
    return globalThis.localStorage?.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStored(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode); persistence is best-effort.
  }
}

function startNetworkTimers(): void {
  if (pingTimer !== undefined || inputTimer !== undefined) {
    return;
  }

  sendPing();
  sendInput();
  pingTimer = setInterval(sendPing, 1000);
  inputTimer = setInterval(sendInput, NETWORKED_PLAYTEST_INPUT_INTERVAL_MS);
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

function sendInput(): void {
  if (transport === undefined) {
    return;
  }

  sequence += 1;
  const message = createNetworkedPlaytestInputMessage({
    clientTimeMs: Date.now(),
    keys,
    pitchRadians,
    sequence,
    yawRadians
  });
  state = reduceConnectionViewState(state, {
    type: "input-sent",
    sequence: message.sequence,
    clientTimeMs: message.clientTimeMs,
    message
  });
  transport.send(message);
}

function sendFireIntent(): void {
  if (transport === undefined) {
    return;
  }

  fireSequence += 1;
  const clientTimeMs = Date.now();
  const message = createClientFireIntent({
    sequence: fireSequence,
    clientTimeMs,
    clientTick: state.serverTick ?? 0,
    yaw: yawRadians,
    pitch: pitchRadians
  });
  state = reduceConnectionViewState(state, {
    type: "fire-sent",
    sequence: fireSequence,
    clientTimeMs,
    message
  });
  lastFireIntentSequence = fireSequence;
  lastFireIntentTimeMs = performance.now();
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

function sendReloadIntent(): void {
  if (transport === undefined) {
    return;
  }

  // Reload is intent-only: the server decides whether a reload starts and owns
  // ammo/reload state. The client never sets ammo or reload truth.
  reloadSequence += 1;
  transport.send(
    createClientWeaponReload({
      sequence: reloadSequence
    })
  );
}

function aimAtRemoteForLocalDiagnostics(targetEntityId?: number): NetworkedPlaytestRemoteAim | undefined {
  const presentation = readNetworkedPlaytestPresentation();
  const aim = deriveNetworkedPlaytestAimAtRemote({
    localCameraPosition: smoothedCameraPosition ?? presentation.localCameraPose.position,
    remotePlaceholders: presentation.remotePlaceholders,
    targetEntityId
  });
  if (aim === undefined) {
    return undefined;
  }

  yawRadians = aim.yawRadians;
  pitchRadians = aim.pitchRadians;
  updateReadout(readNetworkedPlaytestPresentation(), smoothedCameraPosition);
  return aim;
}

function animate(
  timeMs: number,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  remoteGroup: THREE.Group,
  firstPersonShellGroup: THREE.Group,
  fireResultWorldGroup: THREE.Group,
  fireResultCameraGroup: THREE.Group
): void {
  const deltaSeconds = Math.max(0, (timeMs - lastRenderTimeMs) / 1000);
  lastRenderTimeMs = timeMs;
  const presentation = readNetworkedPlaytestPresentation();
  smoothedCameraPosition = smoothNetworkedPlaytestCameraPosition({
    deltaSeconds,
    previousPosition: smoothedCameraPosition,
    targetPosition: presentation.localCameraPose.position
  });
  applyCameraPose(camera, presentation, smoothedCameraPosition);
  const firstPersonShell = createFirstPersonShellPresentation({
    enabled: true,
    fireIntentActive: readFireIntentActive(timeMs),
    lookPitchRadians: presentation.localCameraPose.pitchRadians,
    motionContact: lastMotionContact,
    nowMs: timeMs
  });
  updateFirstPersonShellGroup(firstPersonShellGroup, firstPersonShell);
  fireResultPresentationState = updateFireResultPresentationState(fireResultPresentationState, {
    lastFireAccepted: state.lastFireAccepted,
    lastFireDistance: state.lastFireDistance,
    lastFireHit: state.lastFireHit,
    lastFireIntentSequence,
    lastFireIntentTimeMs,
    lastFireRejectReason: state.lastFireRejectReason,
    lastFireResultSequence: state.lastFireResultSequence,
    lastFireTargetEntityId: state.lastFireTargetEntityId,
    lastFireTargetSessionId: state.lastFireTargetSessionId,
    localCameraPosition: smoothedCameraPosition,
    localPitchRadians: presentation.localCameraPose.pitchRadians,
    localYawRadians: presentation.localCameraPose.yawRadians,
    nowMs: timeMs,
    remotePlaceholders: presentation.remotePlaceholders
  });
  updateFireResultVisualGroups(
    fireResultWorldGroup,
    fireResultCameraGroup,
    fireResultPresentationState.activeEffects
  );
  updateRemotePlayerPresentation(
    remoteGroup,
    presentation.remotePlaceholders,
    fireResultPresentationState.highlightedRemoteEntityId
  );
  resizeRenderer(renderer, camera);
  renderer.render(scene, camera);

  if (frameCount < 3 || frameCount % 60 === 0) {
    latestRenderSample = readRenderSample(renderer);
  }

  frameCount += 1;
  updateReadout(presentation, smoothedCameraPosition);
  animationFrame = requestAnimationFrame((nextTimeMs) => {
    animate(nextTimeMs, renderer, scene, camera, remoteGroup, firstPersonShellGroup, fireResultWorldGroup, fireResultCameraGroup);
  });
}

function readNetworkedPlaytestPresentation(): NetworkedPlaytestPresentation {
  return createNetworkedPlaytestPresentation({
    lookPitchRadians: pitchRadians,
    lookYawRadians: yawRadians,
    map: DRYDOCK_SPAN_ARENA,
    state
  });
}

function addLighting(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight("#dbe7df", "#25302d", 1.35));

  const keyLight = new THREE.DirectionalLight("#ffffff", 1.7);
  keyLight.position.set(-3, 7, 5);
  scene.add(keyLight);
}

function addGreyboxPrimitives(scene: THREE.Scene, primitives: readonly GreyboxPrimitive[]): void {
  for (const primitive of primitives) {
    const geometry = new THREE.BoxGeometry(...primitive.size);
    const material = new THREE.MeshStandardMaterial({
      color: primitive.color,
      metalness: 0,
      roughness: 0.82
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = primitive.id;
    mesh.position.set(...primitive.position);
    scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: "#151b1a" })
    );
    edges.position.copy(mesh.position);
    scene.add(edges);
  }
}

function createFirstPersonShellGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = "first-person-presentation-shell";

  const initialShell = createFirstPersonShellPresentation({
    enabled: true,
    fireIntentActive: false,
    lookPitchRadians: 0,
    motionContact: "idle",
    nowMs: 0
  });

  for (const part of initialShell.parts) {
    group.add(createFirstPersonShellMesh(part));
  }

  updateFirstPersonShellGroup(group, initialShell);
  return group;
}

function createFirstPersonShellMesh(part: FirstPersonShellPart): THREE.Mesh {
  const geometry =
    part.shape === "box"
      ? new THREE.BoxGeometry(1, 1, 1)
      : new THREE.SphereGeometry(0.5, 16, 10);
  const material = new THREE.MeshStandardMaterial({
    color: part.color,
    depthTest: false,
    depthWrite: false,
    metalness: 0.05,
    roughness: 0.72
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = part.id;
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  return mesh;
}

function updateFirstPersonShellGroup(
  group: THREE.Group,
  shell: FirstPersonShellPresentation
): void {
  group.visible = shell.status === "visible";

  for (const part of shell.parts) {
    const mesh = group.getObjectByName(part.id);
    if (!(mesh instanceof THREE.Mesh)) {
      continue;
    }

    mesh.position.set(...part.position);
    mesh.rotation.set(...part.rotation);
    mesh.scale.set(...part.scale);
    mesh.visible = true;
  }
}

function updateRemotePlayerPresentation(
  remoteGroup: THREE.Group,
  placeholders: NetworkedPlaytestPresentation["remotePlaceholders"],
  highlightedRemoteEntityId: number | undefined
): void {
  const models = createRemotePlayerPresentationModels({
    highlightedRemoteEntityId,
    remotePlaceholders: placeholders
  });
  const liveEntityIds = new Set<number>();
  remotePresentationModelCount = models.length;
  remotePresentationSourceTick = readLatestRemoteSourceTick(models);
  remotePresentationFacingMarkerCount = countVisibleRemoteParts(models, "facing-marker");
  remotePresentationTargetCenterCount = countVisibleRemoteParts(models, "target-center");

  for (const model of models) {
    liveEntityIds.add(model.entityId);
    const mesh = readRemotePlayerMesh(model);
    mesh.position.set(...model.position);
    mesh.rotation.y = model.yawRadians;
    const planarScale = model.highlighted ? 1.08 : 1;
    // Squash a crouched remote model vertically (feet stay on the ground) so other players
    // can read the stance.
    mesh.scale.set(
      planarScale,
      planarScale * (model.crouched ? REMOTE_PLAYER_PRESENTATION_CROUCH_SCALE : 1),
      planarScale
    );
    updateRemotePlayerMeshParts(mesh, model.parts);
    if (mesh.parent !== remoteGroup) {
      remoteGroup.add(mesh);
    }
  }

  for (const [entityId, mesh] of remoteMeshes.entries()) {
    if (liveEntityIds.has(entityId)) {
      continue;
    }

    remoteGroup.remove(mesh);
    remoteMeshes.delete(entityId);
  }
}

function readRemotePlayerMesh(model: RemotePlayerPresentationModel): THREE.Group {
  const existing = remoteMeshes.get(model.entityId);
  if (existing !== undefined) {
    return existing;
  }

  const group = new THREE.Group();
  group.name = model.id;
  for (const part of model.parts) {
    group.add(createRemotePlayerPartMesh(part));
  }
  updateRemotePlayerMeshParts(group, model.parts);

  remoteMeshes.set(model.entityId, group);
  return group;
}

function createRemotePlayerPartMesh(part: RemotePlayerPresentationPart): THREE.Mesh {
  const geometry = createRemotePlayerPartGeometry(part);
  const material = new THREE.MeshStandardMaterial({
    color: part.color,
    emissive: part.role === "hit-accent" ? part.color : "#000000",
    emissiveIntensity: part.role === "hit-accent" ? 0.55 : 0,
    metalness: 0.02,
    opacity: part.opacity,
    roughness: 0.68,
    transparent: part.opacity < 1 || part.role === "hit-accent" || part.role === "target-center"
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = part.id;
  mesh.frustumCulled = false;
  return mesh;
}

function createRemotePlayerPartGeometry(part: RemotePlayerPresentationPart): THREE.BufferGeometry {
  switch (part.shape) {
    case "cylinder":
      return new THREE.CylinderGeometry(part.radiusMeters, part.radiusMeters, part.heightMeters ?? 1, 14);
    case "sphere":
      return new THREE.SphereGeometry(part.radiusMeters, 14, 9);
    case "cone":
      return new THREE.ConeGeometry(part.radiusMeters, part.heightMeters ?? 0.5, 12);
    case "torus":
      return new THREE.TorusGeometry(part.radiusMeters, part.tubeRadiusMeters ?? 0.012, 10, 28);
  }
}

function updateRemotePlayerMeshParts(
  group: THREE.Group,
  parts: readonly RemotePlayerPresentationPart[]
): void {
  for (const part of parts) {
    const mesh = group.getObjectByName(part.id);
    if (!(mesh instanceof THREE.Mesh)) {
      continue;
    }

    mesh.position.set(...part.position);
    mesh.rotation.set(...part.rotation);
    mesh.renderOrder = part.renderOrder;
    mesh.visible = part.visible;
    const material = mesh.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.color.set(part.color);
      material.opacity = part.opacity;
      material.transparent = part.opacity < 1 || part.role === "hit-accent" || part.role === "target-center";
      material.emissive.set(part.role === "hit-accent" ? part.color : "#000000");
      material.emissiveIntensity = part.role === "hit-accent" ? 0.55 : 0;
    }
  }
}

function readLatestRemoteSourceTick(models: readonly RemotePlayerPresentationModel[]): number | undefined {
  let latest: number | undefined;
  for (const model of models) {
    latest = latest === undefined ? model.sourceTick : Math.max(latest, model.sourceTick);
  }
  return latest;
}

function countVisibleRemoteParts(
  models: readonly RemotePlayerPresentationModel[],
  role: RemotePlayerPresentationPart["role"]
): number {
  let count = 0;
  for (const model of models) {
    for (const part of model.parts) {
      if (part.role === role && part.visible) {
        count += 1;
      }
    }
  }
  return count;
}

function updateFireResultVisualGroups(
  worldGroup: THREE.Group,
  cameraGroup: THREE.Group,
  effects: readonly FireResultPresentationEffect[]
): void {
  worldGroup.clear();
  cameraGroup.clear();

  for (const effect of effects) {
    const object = createFireResultEffectObject(effect);
    if (object === undefined) {
      continue;
    }

    if (effect.space === "camera") {
      cameraGroup.add(object);
    } else {
      worldGroup.add(object);
    }
  }
}

function createFireResultEffectObject(effect: FireResultPresentationEffect): THREE.Object3D | undefined {
  if (effect.kind === "authority-tracer") {
    if (effect.start === undefined || effect.end === undefined) {
      return undefined;
    }

    const start = new THREE.Vector3(...effect.start);
    const end = new THREE.Vector3(...effect.end);
    const delta = new THREE.Vector3().subVectors(end, start);
    const length = delta.length();
    if (!Number.isFinite(length) || length <= 0) {
      return undefined;
    }

    const geometry = new THREE.CylinderGeometry(effect.radiusMeters, effect.radiusMeters, length, 8);
    const material = new THREE.MeshBasicMaterial({
      color: effect.color,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: effect.opacity
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = effect.id;
    mesh.position.copy(start).addScaledVector(delta, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    mesh.frustumCulled = false;
    mesh.renderOrder = 24;
    return mesh;
  }

  if (effect.position === undefined) {
    return undefined;
  }

  const geometry =
    effect.kind === "impact-marker"
      ? new THREE.SphereGeometry(effect.radiusMeters, 14, 8)
      : new THREE.TorusGeometry(effect.radiusMeters, Math.max(0.006, effect.radiusMeters * 0.16), 8, 24);
  const material = new THREE.MeshBasicMaterial({
    color: effect.color,
    depthTest: effect.space !== "camera",
    depthWrite: false,
    transparent: true,
    opacity: effect.opacity
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = effect.id;
  mesh.position.set(...effect.position);
  mesh.frustumCulled = false;
  mesh.renderOrder = effect.space === "camera" ? 26 : 23;
  return mesh;
}

function applyCameraPose(
  camera: THREE.PerspectiveCamera,
  presentation: NetworkedPlaytestPresentation,
  cameraPosition: readonly [number, number, number]
): void {
  camera.position.set(...cameraPosition);
  camera.rotation.x = presentation.localCameraPose.pitchRadians;
  camera.rotation.y = presentation.localCameraPose.yawRadians;
  camera.rotation.z = 0;
}

function resizeRenderer(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);

  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function updateReadout(
  presentation: NetworkedPlaytestPresentation,
  appliedCameraPosition: readonly [number, number, number] = presentation.localCameraPose.position
): void {
  reviewStats = updateNetworkedPlaytestReviewStats(reviewStats, presentation);
  const nowMs = performance.now();
  const cameraPosition = appliedCameraPosition.map((value) => Number(value.toFixed(2))) as [
    number,
    number,
    number
  ];
  const renderSampleHealthy = isRenderablePixelSampleHealthy(latestRenderSample);
  const rawMotionContact = classifyNetworkedPlaytestMotionContact({
    currentServerPosition: presentation.serverPosition,
    forwardIntent: readForwardIntent(keys),
    hasMoveIntent: hasMovementIntent(keys),
    previousServerPosition: previousServerPositionForMotion,
    rightIntent: readRightIntent(keys),
    yawRadians: presentation.localCameraPose.yawRadians
  });
  previousServerPositionForMotion = presentation.serverPosition;
  const heldMotion = holdPlaytestMotionContact({
    raw: rawMotionContact,
    previous: lastMotionContact,
    lastMovingAtMs: lastMotionMovingAtMs,
    nowMs: performance.now()
  });
  lastMotionContact = heldMotion.contact;
  lastMotionMovingAtMs = heldMotion.lastMovingAtMs;
  const firstPersonShell = createFirstPersonShellPresentation({
    enabled: true,
    fireIntentActive: readFireIntentActive(performance.now()),
    lookPitchRadians: presentation.localCameraPose.pitchRadians,
    motionContact: lastMotionContact,
    nowMs
  });
  roundCombatPresentationState = updateRoundCombatPresentationState(roundCombatPresentationState, {
    damage: state.lastCombatDamage,
    deathTick: state.localDeathTick,
    lastCombatEventKind: state.lastCombatEventKind,
    lastCombatEventSequence: state.lastCombatEventSequence,
    lastCombatEventTick: state.lastCombatEventTick,
    lastFireAccepted: state.lastFireAccepted,
    lastFireHit: state.lastFireHit,
    lastFireResultSequence: state.lastFireResultSequence,
    lastFireTargetEntityId: state.lastFireTargetEntityId,
    lastFireTargetSessionId: state.lastFireTargetSessionId,
    lastRoundEventKind: state.lastRoundEventKind,
    lastRoundEventSequence: state.lastRoundEventSequence,
    lastRoundEventTick: state.lastRoundEventTick,
    lastRoundServerTick: state.lastRoundServerTick,
    localAlive: state.localAlive,
    localHealth: state.localHealth,
    localMaxHealth: state.localMaxHealth,
    localSessionId: presentation.localSessionId,
    nowMs,
    respawnEligibleTick: state.localRespawnEligibleTick,
    rosterEntries: state.matchRoster,
    roundId: state.roundId,
    roundOutcome: state.roundOutcome,
    roundPhase: state.roundPhase,
    roundResetReadyTick: state.roundResetReadyTick,
    roundWinnerSessionId: state.roundWinnerSessionId,
    sourceSessionId: state.lastCombatSourceSessionId,
    targetSessionId: state.lastCombatTargetSessionId
  });
  const scoreboard = createScoreboardPresentation({
    entries: state.matchStats,
    lastServerTick: state.lastMatchStatsServerTick,
    localSessionId: presentation.localSessionId,
    rosterEntries: state.matchRoster
  });
  const roster = createRosterPresentation({
    entries: state.matchRoster,
    lastServerTick: state.lastMatchRosterServerTick,
    localSessionId: presentation.localSessionId
  });

  statusEl.textContent = presentation.connectionStatus;
  statusEl.dataset.status = presentation.connectionStatus;
  updateMenuVisibility(presentation.connectionStatus);
  localEntityEl.textContent = formatNumber(presentation.localEntityId);
  serverPositionEl.textContent = formatVector(presentation.serverPosition);
  predictedPositionEl.textContent = formatVector(presentation.predictedPosition);
  predictionCorrectionEl.textContent = formatMeters(presentation.predictionCorrectionMagnitude);
  predictionCorrectionMaxEl.textContent = formatMeters(reviewStats.predictionCorrectionMaxMagnitude);
  motionContactEl.textContent = lastMotionContact;
  firstPersonShellEl.textContent = formatFirstPersonShellStatus(firstPersonShell);
  fireIntentEl.textContent = lastFireIntentSequence === undefined ? "-" : lastFireIntentSequence.toString();
  fireResultEl.textContent = formatFireResultPresentationStatus(fireResultPresentationState);
  fireHitEl.textContent = fireResultPresentationState.hitState;
  hitmarkerEl.dataset.active = fireResultPresentationState.hitmarkerActive ? "true" : "false";
  fireVisualSequenceEl.textContent =
    fireResultPresentationState.lastVisualizedFireSequence === undefined
      ? "-"
      : fireResultPresentationState.lastVisualizedFireSequence.toString();
  fireTracerCountEl.textContent = fireResultPresentationState.activeTracerCount.toString();
  fireExpiredCountEl.textContent = fireResultPresentationState.expiredEffectCount.toString();
  remoteCountEl.textContent = presentation.remoteEntityCount.toString();
  remoteModelCountEl.textContent = remotePresentationModelCount.toString();
  remoteHighlightEl.textContent = formatNumber(fireResultPresentationState.highlightedRemoteEntityId);
  remoteSourceTickEl.textContent = formatNumber(remotePresentationSourceTick);
  remoteFacingMarkerCountEl.textContent = remotePresentationFacingMarkerCount.toString();
  remoteTargetCenterCountEl.textContent = remotePresentationTargetCenterCount.toString();
  reconnectCountEl.textContent = reviewStats.reconnectCount.toString();
  lastErrorEl.textContent = reviewStats.lastError ?? "-";
  roundPhaseEl.textContent = roundCombatPresentationState.roundPhaseLabel;
  roundOutcomeEl.textContent = roundCombatPresentationState.roundOutcomeLabel;
  roundWinnerEl.textContent = roundCombatPresentationState.roundWinnerLabel;
  const matchBannerLabel = formatPlaytestMatchResult(
    state.matchOver,
    state.matchWinnerSessionId,
    state.matchRoster
  );
  const matchBannerActive = matchBannerLabel !== "-";
  matchBannerEl.textContent = matchBannerActive ? matchBannerLabel : "";
  matchBannerEl.dataset.active = matchBannerActive ? "true" : "false";
  // The match-over banner supersedes the per-round banner.
  const roundBannerActive = roundCombatPresentationState.roundBannerActive && !matchBannerActive;
  roundBannerEl.textContent = roundBannerActive ? roundCombatPresentationState.roundBannerLabel : "";
  roundBannerEl.dataset.active = roundBannerActive ? "true" : "false";
  roundTransitionEl.textContent = roundCombatPresentationState.roundTransitionLabel;
  roundTransitionEl.dataset.active = roundCombatPresentationState.roundTransitionActive ? "true" : "false";
  roundResetCueEl.textContent = roundCombatPresentationState.resetCueLabel;
  localHealthEl.textContent = roundCombatPresentationState.localHealthLabel;
  localLifeEl.textContent = roundCombatPresentationState.localLifeLabel;
  hudHealthEl.textContent = roundCombatPresentationState.localHealthLabel;
  hudLifeEl.textContent = roundCombatPresentationState.localLifeLabel;
  hudLifeEl.dataset.life =
    roundCombatPresentationState.localLifeLabel === "alive"
      ? "alive"
      : roundCombatPresentationState.localLifeLabel === "dead"
        ? "dead"
        : "unknown";
  hudStanceEl.textContent = formatPlaytestStance(presentation.localCrouched);
  hudStanceEl.dataset.crouched = presentation.localCrouched ? "true" : "false";
  hudRespawnEl.textContent =
    roundCombatPresentationState.respawnCueLabel === "-"
      ? ""
      : roundCombatPresentationState.respawnCueLabel;
  hudWeaponEl.textContent = formatPlaytestWeaponName(state.weaponProfileId);
  hudAmmoEl.textContent = formatPlaytestWeaponAmmo(
    state.weaponAmmoInMagazine,
    state.weaponMagazineSize,
    state.weaponReloading
  );
  localCombatEventEl.textContent = roundCombatPresentationState.localCombatEventLabel;
  localCombatCueEl.textContent = roundCombatPresentationState.localCombatCueLabel;
  localCombatCueEl.dataset.active = roundCombatPresentationState.localCombatCueActive ? "true" : "false";
  remoteCombatCueEl.textContent = roundCombatPresentationState.remoteCombatCueLabel;
  remoteCombatCueEl.dataset.active = roundCombatPresentationState.remoteCombatCueActive ? "true" : "false";
  renderScoreboard(scoreboard);
  renderRoster(roster);
  renderHealthEl.textContent = renderSampleHealthy ? "nonblank" : "pending";
  frameCountEl.textContent = frameCount.toString();
  matchOccupancyEl.textContent = formatPlaytestMatchOccupancy(state.connectedSlots, state.matchCapacity);
  cameraSourceEl.textContent = presentation.localCameraSource;
  lookEl.textContent = `${presentation.localCameraPose.yawRadians.toFixed(2)}, ${presentation.localCameraPose.pitchRadians.toFixed(2)}`;
  errorEl.textContent = presentation.error ?? "";
  disconnectButton.disabled = transport === undefined;
  connectButton.disabled = presentation.connectionStatus === "connecting";
  window.__BREACHLINE_PLAYTEST_STATE__ = {
    activeFireTracerCount: fireResultPresentationState.activeTracerCount,
    cameraPosition,
    connectionStatus: presentation.connectionStatus,
    error: presentation.error,
    fireResultExpiredEffectCount: fireResultPresentationState.expiredEffectCount,
    fireResultHighlightedRemoteEntityId: fireResultPresentationState.highlightedRemoteEntityId,
    fireResultHitState: fireResultPresentationState.hitState,
    fireResultHitmarkerActive: fireResultPresentationState.hitmarkerActive,
    fireResultPresentationStatus: formatFireResultPresentationStatus(fireResultPresentationState),
    fireResultVisualizedSequence: fireResultPresentationState.lastVisualizedFireSequence,
    frameCount,
    firstPersonShellActivity: firstPersonShell.activity,
    firstPersonShellAttachedToCamera,
    firstPersonShellPartCount: firstPersonShell.parts.length,
    firstPersonShellStatus: firstPersonShell.status,
    lastFireIntentSequence,
    localCameraSource: presentation.localCameraSource,
    localCombatCue: roundCombatPresentationState.localCombatCueLabel,
    localCombatEvent: roundCombatPresentationState.localCombatEventLabel,
    localCrouched: presentation.localCrouched,
    localHealth: roundCombatPresentationState.localHealthLabel,
    localLife: roundCombatPresentationState.localLifeLabel,
    localStance: formatPlaytestStance(presentation.localCrouched),
    localRespawnCue: roundCombatPresentationState.respawnCueLabel,
    localLookPitchRadians: presentation.localCameraPose.pitchRadians,
    localLookYawRadians: presentation.localCameraPose.yawRadians,
    localEntityId: presentation.localEntityId,
    mapId: presentation.mapId,
    mapRevision: presentation.mapRevision,
    matchOccupancy: formatPlaytestMatchOccupancy(state.connectedSlots, state.matchCapacity),
    motionContact: lastMotionContact,
    networkSimulationBaseLatencyMs: networkSimulationProfile.baseLatencyMs,
    networkSimulationDropRate: networkSimulationProfile.dropRate,
    networkSimulationJitterMs: networkSimulationProfile.jitterMs,
    networkSimulationProfileId: networkSimulationProfile.id,
    networkSimulationProfileLabel: networkSimulationProfile.label,
    predictedPosition: presentation.predictedPosition,
    predictionCorrectionMaxMagnitude: reviewStats.predictionCorrectionMaxMagnitude,
    predictionCorrectionMagnitude: presentation.predictionCorrectionMagnitude,
    reconnectCount: reviewStats.reconnectCount,
    remoteEntityCount: presentation.remoteEntityCount,
    remoteFacingMarkerCount: remotePresentationFacingMarkerCount,
    remoteHighlightedTargetId: fireResultPresentationState.highlightedRemoteEntityId,
    remoteInterpolationSourceTick: remotePresentationSourceTick,
    remoteModelCount: remotePresentationModelCount,
    remotePlaceholderCount: presentation.remotePlaceholders.length,
    remoteTargetCenterCount: remotePresentationTargetCenterCount,
    renderSample: latestRenderSample,
    renderSampleHealthy,
    remoteCombatCue: roundCombatPresentationState.remoteCombatCueLabel,
    remoteCombatCueActive: roundCombatPresentationState.remoteCombatCueActive,
    remoteCombatTargetEntityId: roundCombatPresentationState.remoteCombatTargetEntityId,
    resetCue: roundCombatPresentationState.resetCueLabel,
    roundOutcome: roundCombatPresentationState.roundOutcomeLabel,
    roundPhase: roundCombatPresentationState.roundPhaseLabel,
    roundPresentationTone: roundCombatPresentationState.presentationTone,
    roundTransition: roundCombatPresentationState.roundTransitionLabel,
    roundTransitionActive: roundCombatPresentationState.roundTransitionActive,
    roundWinner: roundCombatPresentationState.roundWinnerLabel,
    roundBanner: roundBannerActive ? roundCombatPresentationState.roundBannerLabel : "-",
    matchOver: state.matchOver,
    matchBanner: matchBannerActive ? matchBannerLabel : "-",
    scoreboardEntryCount: scoreboard.entryCount,
    scoreboardLastServerTick: scoreboard.lastServerTick,
    scoreboardLocalPosition: scoreboard.localPosition,
    scoreboardRows: scoreboard.rows.map((row) => ({
      callsign: row.callsign,
      deaths: row.deaths,
      isLocalSession: row.isLocalSession,
      kills: row.kills,
      position: row.position,
      sessionId: row.sessionId
    })),
    scoreboardSummary: scoreboard.summaryLabel,
    serverPosition: presentation.serverPosition,
    sessionId: presentation.localSessionId,
    rosterEntryCount: roster.entryCount,
    rosterLastServerTick: roster.lastServerTick,
    rosterLocalCallsign: roster.localCallsign,
    rosterRows: roster.rows.map((row) => ({
      callsign: row.callsign,
      isLocalSession: row.isLocalSession,
      sessionId: row.sessionId,
      slotIndex: row.slotIndex,
      weaponLabel: row.weaponLabel
    })),
    weaponAmmoInMagazine: state.weaponAmmoInMagazine,
    weaponMagazineSize: state.weaponMagazineSize,
    weaponProfileId: state.weaponProfileId,
    weaponReloading: state.weaponReloading,
    weaponNameLabel: formatPlaytestWeaponName(state.weaponProfileId),
    weaponAmmoLabel: formatPlaytestWeaponAmmo(
      state.weaponAmmoInMagazine,
      state.weaponMagazineSize,
      state.weaponReloading
    )
  };
}

function resetFireResultPresentation(): void {
  fireResultPresentationState = createInitialFireResultPresentationState();
  lastFireIntentSequence = undefined;
  lastFireIntentTimeMs = undefined;
}

function applyDiagnosticsVisibility(): void {
  readoutEl.dataset.visible = diagnosticsVisible ? "true" : "false";
  diagnosticsToggleEl.textContent = diagnosticsVisible ? "Hide diagnostics" : "Show diagnostics";
  diagnosticsToggleEl.setAttribute("aria-pressed", diagnosticsVisible ? "true" : "false");
}

function toggleDiagnostics(): void {
  diagnosticsVisible = !diagnosticsVisible;
  applyDiagnosticsVisibility();
}

function resetRoundCombatPresentation(): void {
  roundCombatPresentationState = createInitialRoundCombatPresentationState();
}

function renderScoreboard(scoreboard: ScoreboardPresentation): void {
  scoreboardSummaryEl.textContent = scoreboard.summaryLabel;
  scoreboardRowsEl.replaceChildren(
    ...scoreboard.rows.map((row) => {
      const rowEl = document.createElement("li");
      rowEl.className = "playtest-scoreboard-row";
      rowEl.dataset.local = row.isLocalSession ? "true" : "false";

      const nameEl = document.createElement("span");
      nameEl.className = "playtest-scoreboard-name";
      nameEl.textContent = `${row.position}. ${row.label}`;

      const tallyEl = document.createElement("span");
      tallyEl.className = "playtest-scoreboard-tally";
      tallyEl.textContent = `${row.kills} / ${row.deaths}`;

      rowEl.append(nameEl, tallyEl);
      return rowEl;
    })
  );
}

function renderRoster(roster: RosterPresentation): void {
  rosterSummaryEl.textContent = roster.summaryLabel;
  rosterRowsEl.replaceChildren(
    ...roster.rows.map((row) => {
      const rowEl = document.createElement("li");
      rowEl.className = "playtest-roster-row";
      rowEl.dataset.local = row.isLocalSession ? "true" : "false";

      const nameEl = document.createElement("span");
      nameEl.className = "playtest-roster-name";
      nameEl.textContent = `${row.slotIndex + 1}. ${row.label}`;

      const weaponEl = document.createElement("span");
      weaponEl.className = "playtest-roster-weapon";
      weaponEl.textContent = row.weaponLabel;

      rowEl.append(nameEl, weaponEl);
      return rowEl;
    })
  );
}

function readRenderSample(renderer: THREE.WebGLRenderer): ScenePixelSampleSummary {
  const gl = renderer.getContext();
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  return summarizeScenePixelSamples({
    backgroundColor: [17, 23, 25],
    height,
    maxSamples: 5000,
    pixels,
    width
  });
}

function updatePointerState(): void {
  pointerStateEl.textContent = document.pointerLockElement === canvas ? "captured" : "free";
}

function requestPointerLockForCanvas(): void {
  try {
    const pointerLockRequest = canvas.requestPointerLock();
    if (pointerLockRequest instanceof Promise) {
      void pointerLockRequest.catch(() => {
        updatePointerState();
      });
    }
  } catch {
    updatePointerState();
  }
}

function reportError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  errorEl.textContent = message;
  console.error(message);
}

function formatNumber(value: number | undefined): string {
  return value === undefined ? "-" : value.toString();
}

function formatVector(value: readonly [number, number, number] | undefined): string {
  return value === undefined ? "-" : value.map((entry) => entry.toFixed(2)).join(", ");
}

function formatMeters(value: number | undefined): string {
  return value === undefined ? "-" : `${value.toFixed(3)} m`;
}

function readFireIntentActive(nowMs: number): boolean {
  return lastFireIntentTimeMs !== undefined && nowMs - lastFireIntentTimeMs <= 180;
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

function requireCanvas(id: string): HTMLCanvasElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error(`Missing canvas #${id}`);
  }
  return element;
}

function isPlaytestInputKey(code: string): boolean {
  return (
    code === "KeyW" ||
    code === "KeyA" ||
    code === "KeyS" ||
    code === "KeyD" ||
    code === "ArrowUp" ||
    code === "ArrowLeft" ||
    code === "ArrowDown" ||
    code === "ArrowRight" ||
    code === "Space" ||
    code === "ControlLeft" ||
    code === "ControlRight" ||
    code === "KeyC"
  );
}

function hasMovementIntent(inputKeys: ReadonlySet<string>): boolean {
  return readForwardIntent(inputKeys) !== 0 || readRightIntent(inputKeys) !== 0;
}

function readForwardIntent(inputKeys: ReadonlySet<string>): number {
  return Number(inputKeys.has("KeyW") || inputKeys.has("ArrowUp")) -
    Number(inputKeys.has("KeyS") || inputKeys.has("ArrowDown"));
}

function readRightIntent(inputKeys: ReadonlySet<string>): number {
  return Number(inputKeys.has("KeyD") || inputKeys.has("ArrowRight")) -
    Number(inputKeys.has("KeyA") || inputKeys.has("ArrowLeft"));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeYaw(value: number): number {
  const twoPi = Math.PI * 2;
  const normalized = ((value + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return Object.is(normalized, -0) ? 0 : normalized;
}

window.addEventListener("beforeunload", () => {
  if (animationFrame !== undefined) {
    cancelAnimationFrame(animationFrame);
  }
  disconnectTimers();
  transport?.close();
});
