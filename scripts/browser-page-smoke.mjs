import assert from "node:assert/strict";

import { startTransportLoopServer } from "../apps/server/dist/index.js";

const server = await startTransportLoopServer({
  host: "127.0.0.1",
  port: 0,
  serveClient: true,
  tickRateHz: 20
});

try {
  assert.notEqual(server.clientUrl, undefined);
  const page = await fetch(server.clientUrl);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /id="status"/);
  assert.match(html, /id="rtt-current"/);
  assert.match(html, /id="tick-rate"/);
  assert.match(html, /id="snapshot-rate"/);
  assert.match(html, /id="uptime"/);
  assert.match(html, /id="last-disconnect"/);
  assert.match(html, /id="telemetry-overall"/);
  assert.match(html, /id="telemetry-readiness"/);
  assert.match(html, /id="telemetry-summary"/);
  assert.match(html, /id="match-id"/);
  assert.match(html, /id="session-id"/);
  assert.match(html, /id="slot-index"/);
  assert.match(html, /id="match-capacity"/);
  assert.match(html, /id="connected-slots"/);
  assert.match(html, /id="match-rejection"/);
  assert.match(html, /id="last-input-sent"/);
  assert.match(html, /id="last-input-ack"/);
  assert.match(html, /id="input-drops"/);
  assert.match(html, /id="input-send-rate"/);
  assert.match(html, /id="last-fire-sent"/);
  assert.match(html, /id="last-fire-result"/);
  assert.match(html, /id="fire-send-rate"/);
  assert.match(html, /id="fire-result-tick"/);
  assert.match(html, /id="fire-accepted"/);
  assert.match(html, /id="fire-hit"/);
  assert.match(html, /id="fire-target-entity"/);
  assert.match(html, /id="fire-target-session"/);
  assert.match(html, /id="fire-distance"/);
  assert.match(html, /id="fire-reject-reason"/);
  assert.match(html, /id="combat-entity"/);
  assert.match(html, /id="combat-health"/);
  assert.match(html, /id="combat-alive"/);
  assert.match(html, /id="combat-death-tick"/);
  assert.match(html, /id="combat-respawn-tick"/);
  assert.match(html, /id="combat-event"/);
  assert.match(html, /id="combat-event-tick"/);
  assert.match(html, /id="combat-event-sequence"/);
  assert.match(html, /id="combat-source-session"/);
  assert.match(html, /id="combat-target-session"/);
  assert.match(html, /id="combat-damage"/);
  assert.match(html, /id="loadout-profile"/);
  assert.match(html, /id="loadout-status"/);
  assert.match(html, /id="loadout-reject-reason"/);
  assert.match(html, /id="loadout-sequence"/);
  assert.match(html, /id="round-id"/);
  assert.match(html, /id="round-phase"/);
  assert.match(html, /id="round-outcome"/);
  assert.match(html, /id="round-winner"/);
  assert.match(html, /id="round-phase-started"/);
  assert.match(html, /id="round-phase-ends"/);
  assert.match(html, /id="round-reset-ready"/);
  assert.match(html, /id="round-event"/);
  assert.match(html, /id="round-event-tick"/);
  assert.match(html, /id="round-event-sequence"/);
  assert.match(html, /id="round-server-tick"/);
  assert.match(html, /id="world-id"/);
  assert.match(html, /id="world-entity-count"/);
  assert.match(html, /id="world-snapshot-tick"/);
  assert.match(html, /id="local-entity-id"/);
  assert.match(html, /id="local-entity-position"/);
  assert.match(html, /id="local-entity-yaw"/);
  assert.match(html, /id="predicted-position"/);
  assert.match(html, /id="predicted-yaw"/);
  assert.match(html, /id="prediction-correction"/);
  assert.match(html, /id="prediction-pending-inputs"/);
  assert.match(html, /id="prediction-replay-count"/);
  assert.match(html, /id="prediction-snapshot-tick"/);
  assert.match(html, /id="remote-entity-count"/);
  assert.match(html, /id="remote-buffered-snapshots"/);
  assert.match(html, /id="remote-interpolation-delay"/);
  assert.match(html, /id="remote-interpolation-tick"/);
  assert.match(html, /id="remote-interpolation-time"/);
  assert.match(html, /id="remote-entity-id"/);
  assert.match(html, /id="remote-entity-position"/);
  assert.match(html, /id="remote-entity-yaw"/);
  assert.match(html, /apps\/client\/dist\/browser\/main\.js/);

  const mainModule = await fetch(`${server.clientUrl}/apps/client/dist/browser/main.js`);
  const mainSource = await mainModule.text();
  assert.equal(mainModule.status, 200);
  assert.match(mainSource, /connectBrowserWebSocketFallback/);
  assert.match(mainSource, /createClientFireIntent/);
  assert.match(mainSource, /createClientLoadoutSelect/);
  assert.match(mainSource, /COMBAT_EVENT_KIND/);
  assert.match(mainSource, /LOADOUT_STATUS/);
  assert.match(mainSource, /ROUND_PHASE/);
  assert.match(mainSource, /createDeveloperTelemetrySummary/);

  const sharedModule = await fetch(`${server.clientUrl}/packages/shared/dist/index.js`);
  assert.equal(sharedModule.status, 200);

  // The browser transport must not call crypto.randomUUID: it is unavailable in a
  // non-secure context (a LAN peer on plain http), so the id is built safely instead.
  const browserTransportModule = await fetch(
    `${server.clientUrl}/apps/client/dist/browser/transport/websocket-browser.js`
  );
  const browserTransportSource = await browserTransportModule.text();
  assert.equal(browserTransportModule.status, 200);
  assert.match(browserTransportSource, /createRandomId/);
  assert.doesNotMatch(browserTransportSource, /crypto\.randomUUID/);

  const sandboxPage = await fetch(`${server.clientUrl}/sandbox.html`);
  const sandboxHtml = await sandboxPage.text();
  assert.equal(sandboxPage.status, 200);
  assert.match(sandboxHtml, /id="sandbox-canvas"/);
  assert.match(sandboxHtml, /id="sandbox-render-health"/);
  assert.match(sandboxHtml, /id="sandbox-map-id"/);
  assert.match(sandboxHtml, /id="sandbox-map-revision"/);
  assert.match(sandboxHtml, /id="sandbox-primitive-count"/);
  assert.match(sandboxHtml, /id="sandbox-spawn-count"/);
  assert.match(sandboxHtml, /id="sandbox-camera-mode"/);
  assert.match(sandboxHtml, /id="sandbox-eye-height"/);
  assert.match(sandboxHtml, /id="sandbox-player-camera-pose"/);
  assert.match(sandboxHtml, /id="sandbox-metadata-valid"/);
  assert.match(sandboxHtml, /id="sandbox-private-asset-controls"/);
  assert.match(sandboxHtml, /data-asset-category="arena-kit"/);
  assert.match(sandboxHtml, /data-asset-category="industrial-dressing"/);
  assert.match(sandboxHtml, /data-asset-category="cover-training-props"/);
  assert.match(sandboxHtml, /data-asset-category="characters-firstperson"/);
  assert.match(sandboxHtml, /data-asset-category="equipment-placeholder"/);
  assert.match(sandboxHtml, /id="sandbox-private-asset-preset-controls"/);
  assert.match(sandboxHtml, /data-asset-preset="scale-check"/);
  assert.match(sandboxHtml, /data-asset-preset="arena-dressing"/);
  assert.match(sandboxHtml, /data-asset-preset="equipment-check"/);
  assert.match(sandboxHtml, /id="sandbox-arena-dressing-toggle"/);
  assert.match(sandboxHtml, /id="sandbox-arena-dressing-plan"/);
  assert.match(sandboxHtml, /id="sandbox-arena-dressing-count"/);
  assert.match(sandboxHtml, /id="sandbox-arena-dressing-assets"/);
  assert.match(sandboxHtml, /id="sandbox-arena-dressing-failed"/);
  assert.match(sandboxHtml, /id="sandbox-private-asset-category"/);
  assert.match(sandboxHtml, /id="sandbox-private-asset-mode"/);
  assert.match(sandboxHtml, /id="sandbox-private-asset-preset"/);
  assert.match(sandboxHtml, /id="sandbox-private-assets"/);
  assert.match(sandboxHtml, /id="sandbox-private-assets-failed"/);
  assert.match(sandboxHtml, /apps\/client\/dist\/sandbox\/main\.js/);
  assert.match(sandboxHtml, /packages\/shared\/dist\/index\.js/);
  assert.match(sandboxHtml, /node_modules\/three\/build\/three\.module\.js/);
  assert.match(sandboxHtml, /node_modules\/three\/examples\/jsm\//);

  const sandboxModule = await fetch(`${server.clientUrl}/apps/client/dist/sandbox/main.js`);
  const sandboxSource = await sandboxModule.text();
  assert.equal(sandboxModule.status, 200);
  assert.match(sandboxSource, /createGreyboxLayout/);
  assert.match(sandboxSource, /getGreyboxLayoutMetadata/);
  assert.match(sandboxSource, /derivePlayerCameraPose/);
  assert.match(sandboxSource, /GLTFLoader/);
  assert.match(sandboxSource, /createSandboxPrototypeAssetPreviewPlan/);
  assert.match(sandboxSource, /createSandboxPrototypeAssetPresetPreviewPlan/);
  assert.match(sandboxSource, /createSandboxArenaDressingPreviewPlan/);
  assert.match(sandboxSource, /validateSandboxArenaDressingPlan/);
  assert.match(sandboxSource, /validateSandboxPrototypeAssetManifest/);

  const threeModule = await fetch(`${server.clientUrl}/node_modules/three/build/three.module.js`);
  await threeModule.text();
  assert.equal(threeModule.status, 200);

  const gltfLoaderModule = await fetch(`${server.clientUrl}/node_modules/three/examples/jsm/loaders/GLTFLoader.js`);
  await gltfLoaderModule.text();
  assert.equal(gltfLoaderModule.status, 200);

  const playtestPage = await fetch(`${server.clientUrl}/playtest.html`);
  const playtestHtml = await playtestPage.text();
  assert.equal(playtestPage.status, 200);
  assert.match(playtestHtml, /id="playtest-canvas"/);
  assert.match(playtestHtml, /id="playtest-crosshair"/);
  assert.match(playtestHtml, /id="playtest-hitmarker"/);
  assert.match(playtestHtml, /id="playtest-diagnostics-toggle"/);
  // The developer diagnostics readout ships hidden by default so the playtest reads as a game.
  assert.match(playtestHtml, /id="playtest-readout"[^>]*data-visible="false"/);
  assert.match(playtestHtml, /id="playtest-status"/);
  assert.match(playtestHtml, /id="playtest-server-url"/);
  assert.match(playtestHtml, /id="playtest-connect"/);
  assert.match(playtestHtml, /id="playtest-disconnect"/);
  assert.match(playtestHtml, /id="playtest-local-entity"/);
  assert.match(playtestHtml, /id="playtest-server-position"/);
  assert.match(playtestHtml, /id="playtest-predicted-position"/);
  assert.match(playtestHtml, /id="playtest-prediction-correction"/);
  assert.match(playtestHtml, /id="playtest-prediction-correction-max"/);
  assert.match(playtestHtml, /id="playtest-motion-contact"/);
  assert.match(playtestHtml, /id="playtest-first-person-shell"/);
  assert.match(playtestHtml, /id="playtest-fire-intent"/);
  assert.match(playtestHtml, /id="playtest-fire-result"/);
  assert.match(playtestHtml, /id="playtest-fire-hit"/);
  assert.match(playtestHtml, /id="playtest-fire-visual-sequence"/);
  assert.match(playtestHtml, /id="playtest-fire-tracers"/);
  assert.match(playtestHtml, /id="playtest-fire-expired"/);
  assert.match(playtestHtml, /id="playtest-remote-count"/);
  assert.match(playtestHtml, /id="playtest-remote-models"/);
  assert.match(playtestHtml, /id="playtest-remote-highlight"/);
  assert.match(playtestHtml, /id="playtest-remote-source-tick"/);
  assert.match(playtestHtml, /id="playtest-remote-facing-markers"/);
  assert.match(playtestHtml, /id="playtest-remote-target-centers"/);
  assert.match(playtestHtml, /id="playtest-reconnect-count"/);
  assert.match(playtestHtml, /id="playtest-last-error"/);
  assert.match(playtestHtml, /id="playtest-round-phase"/);
  assert.match(playtestHtml, /id="playtest-round-outcome"/);
  assert.match(playtestHtml, /id="playtest-round-winner"/);
  assert.match(playtestHtml, /id="playtest-round-banner"/);
  assert.match(playtestHtml, /id="playtest-match-banner"/);
  assert.match(playtestHtml, /id="playtest-round-transition"/);
  assert.match(playtestHtml, /id="playtest-round-reset-cue"/);
  assert.match(playtestHtml, /id="playtest-local-health"/);
  assert.match(playtestHtml, /id="playtest-local-life"/);
  assert.match(playtestHtml, /id="playtest-hud-health"/);
  assert.match(playtestHtml, /id="playtest-hud-life"/);
  assert.match(playtestHtml, /id="playtest-hud-weapon"/);
  assert.match(playtestHtml, /id="playtest-hud-ammo"/);
  assert.match(playtestHtml, /id="playtest-hud-respawn"/);
  assert.match(playtestHtml, /id="playtest-combat-event"/);
  assert.match(playtestHtml, /id="playtest-combat-cue"/);
  assert.match(playtestHtml, /id="playtest-remote-combat"/);
  assert.match(playtestHtml, /id="playtest-render-health"/);
  assert.match(playtestHtml, /id="playtest-match-occupancy"/);
  assert.match(playtestHtml, /id="playtest-look"/);
  assert.match(playtestHtml, /id="playtest-scoreboard-summary"/);
  assert.match(playtestHtml, /id="playtest-scoreboard-rows"/);
  assert.match(playtestHtml, /id="playtest-roster-summary"/);
  assert.match(playtestHtml, /id="playtest-roster-rows"/);
  assert.match(playtestHtml, /id="playtest-error"/);
  // Main-menu server browser ships visible by default so the page opens on the menu.
  assert.match(playtestHtml, /id="playtest-menu"[^>]*data-visible="true"/);
  assert.match(playtestHtml, /id="playtest-menu-build"/);
  assert.match(playtestHtml, /data-panel="servers"/);
  assert.match(playtestHtml, /data-panel="settings"/);
  assert.match(playtestHtml, /data-panel="controls"/);
  assert.match(playtestHtml, /data-tab="internet"/);
  assert.match(playtestHtml, /data-tab="recent"/);
  assert.match(playtestHtml, /data-tab="favorites"/);
  assert.match(playtestHtml, /data-sort="players"/);
  assert.match(playtestHtml, /id="playtest-registry-url"/);
  assert.match(playtestHtml, /id="playtest-registry-refresh"/);
  assert.match(playtestHtml, /id="playtest-server-list"/);
  assert.match(playtestHtml, /id="playtest-menu-status"/);
  assert.match(playtestHtml, /id="playtest-manual-join"/);
  assert.match(playtestHtml, /id="playtest-menu-connect"/);
  assert.match(playtestHtml, /id="playtest-setting-sensitivity"/);
  assert.match(playtestHtml, /id="playtest-setting-fov"/);
  assert.match(playtestHtml, /apps\/client\/dist\/playtest\/main\.js/);
  assert.match(playtestHtml, /packages\/shared\/dist\/index\.js/);
  assert.match(playtestHtml, /node_modules\/three\/build\/three\.module\.js/);

  const playtestModule = await fetch(`${server.clientUrl}/apps/client/dist/playtest/main.js`);
  const playtestSource = await playtestModule.text();
  assert.equal(playtestModule.status, 200);
  assert.match(playtestSource, /connectBrowserWebSocketFallback/);
  assert.match(playtestSource, /createNetworkedPlaytestPresentation/);
  assert.match(playtestSource, /createNetworkedPlaytestInputMessage/);
  assert.match(playtestSource, /createFirstPersonShellPresentation/);
  assert.match(playtestSource, /updateFireResultPresentationState/);
  assert.match(playtestSource, /createClientFireIntent/);
  assert.match(playtestSource, /createClientWeaponReload/);
  assert.match(playtestSource, /fireResultExpiredEffectCount/);
  assert.match(playtestSource, /__BREACHLINE_PLAYTEST_DIAGNOSTICS__/);
  assert.match(playtestSource, /deriveNetworkedPlaytestAimAtRemote/);
  assert.match(playtestSource, /createRemotePlayerPresentationModels/);
  assert.match(playtestSource, /updateRoundCombatPresentationState/);
  assert.match(playtestSource, /setFromUnitVectors/);
  assert.match(playtestSource, /classifyNetworkedPlaytestMotionContact/);
  assert.match(playtestSource, /updateNetworkedPlaytestReviewStats/);
  assert.match(playtestSource, /createGreyboxLayout/);
  assert.match(playtestSource, /createScoreboardPresentation/);
  assert.match(playtestSource, /createRosterPresentation/);
  assert.match(playtestSource, /buildServerBrowserEntries/);
  assert.match(playtestSource, /fetchRegistryMatches/);
  assert.doesNotMatch(playtestSource, /new WebSocket/);

  const serverBrowserModule = await fetch(`${server.clientUrl}/apps/client/dist/playtest/server-browser.js`);
  const serverBrowserSource = await serverBrowserModule.text();
  assert.equal(serverBrowserModule.status, 200);
  assert.match(serverBrowserSource, /buildServerBrowserEntries/);
  assert.match(serverBrowserSource, /sortServerBrowserEntries/);
  assert.match(serverBrowserSource, /parseManualJoinTarget/);
  assert.match(serverBrowserSource, /fetchRegistryMatches/);

  const playtestStateModule = await fetch(`${server.clientUrl}/apps/client/dist/playtest/playtest-state.js`);
  const playtestStateSource = await playtestStateModule.text();
  assert.equal(playtestStateModule.status, 200);
  assert.match(playtestStateSource, /derivePlayerCameraPose/);
  assert.match(playtestStateSource, /CLIENT_INPUT_BUTTONS/);
  assert.match(playtestStateSource, /formatPlaytestRoundPhase/);
  assert.match(playtestStateSource, /formatPlaytestMatchOccupancy/);
  assert.match(playtestStateSource, /formatPlaytestWeaponAmmo/);
  assert.match(playtestStateSource, /formatPlaytestMatchResult/);
  assert.match(playtestStateSource, /createInitialNetworkedPlaytestReviewStats/);
  assert.match(playtestStateSource, /classifyNetworkedPlaytestMotionContact/);

  const firstPersonShellModule = await fetch(`${server.clientUrl}/apps/client/dist/playtest/first-person-shell.js`);
  const firstPersonShellSource = await firstPersonShellModule.text();
  assert.equal(firstPersonShellModule.status, 200);
  assert.match(firstPersonShellSource, /createFirstPersonShellPresentation/);
  assert.match(firstPersonShellSource, /formatFirstPersonShellStatus/);

  const remotePlayerPresentationModule = await fetch(`${server.clientUrl}/apps/client/dist/playtest/remote-player-presentation.js`);
  const remotePlayerPresentationSource = await remotePlayerPresentationModule.text();
  assert.equal(remotePlayerPresentationModule.status, 200);
  assert.match(remotePlayerPresentationSource, /createRemotePlayerPresentationModels/);
  assert.match(remotePlayerPresentationSource, /REMOTE_PLAYER_PRESENTATION_HEIGHT_METERS/);

  const roundCombatPresentationModule = await fetch(`${server.clientUrl}/apps/client/dist/playtest/round-combat-presentation.js`);
  const roundCombatPresentationSource = await roundCombatPresentationModule.text();
  assert.equal(roundCombatPresentationModule.status, 200);
  assert.match(roundCombatPresentationSource, /updateRoundCombatPresentationState/);
  assert.match(roundCombatPresentationSource, /ROUND_COMBAT_PRESENTATION_CUE_DURATION_MS/);

  const fireResultPresentationModule = await fetch(`${server.clientUrl}/apps/client/dist/playtest/fire-result-presentation.js`);
  const fireResultPresentationSource = await fireResultPresentationModule.text();
  assert.equal(fireResultPresentationModule.status, 200);
  assert.match(fireResultPresentationSource, /updateFireResultPresentationState/);
  assert.match(fireResultPresentationSource, /formatFireResultPresentationStatus/);
  assert.match(fireResultPresentationSource, /FIRE_RESULT_TRACER_DURATION_MS/);
  assert.match(fireResultPresentationSource, /expiredEffectCount/);

  console.log(`browser page smoke passed at ${server.clientUrl}`);
} finally {
  await server.close();
}
