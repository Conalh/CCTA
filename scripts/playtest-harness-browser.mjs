async (page) => {
  const baseUrl = "__PLAYTEST_HARNESS_BASE_URL__";
  const networkProfileId = "__PLAYTEST_HARNESS_NETWORK_PROFILE__";
  const networkSeed = "__PLAYTEST_HARNESS_NETWORK_SEED__";
  const includeNetworkEvidence = __PLAYTEST_HARNESS_INCLUDE_NETWORK_EVIDENCE__;
  const context = page.context();
  const consoleErrors = [];
  const pageErrors = [];

  const attachErrorCapture = (targetPage, label) => {
    targetPage.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(`${label}: ${message.text()}`);
      }
    });
    targetPage.on("pageerror", (error) => {
      pageErrors.push(`${label}: ${error.message}`);
    });
  };

  const waitForPlaytestReady = async (targetPage) => {
    await targetPage.goto(buildPlaytestUrl(targetPage === page ? 0 : 1), { waitUntil: "domcontentloaded" });
    await targetPage.waitForFunction(
      () =>
        typeof window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__?.connect === "function" &&
        window.__BREACHLINE_PLAYTEST_STATE__ !== undefined,
      null,
      { timeout: 12000 }
    );
  };

  const connectPlaytest = async (targetPage) => {
    await targetPage.evaluate(() => window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.connect());
    await targetPage.waitForFunction(
      () => window.__BREACHLINE_PLAYTEST_STATE__?.connectionStatus === "accepted",
      null,
      { timeout: 12000 }
    );
  };

  const readPlaytestState = async (targetPage) =>
    targetPage.evaluate(() => window.__BREACHLINE_PLAYTEST_STATE__);

  const rosterColumn = (state, key) =>
    Array.isArray(state?.rosterRows) ? state.rosterRows.map((row) => row[key]) : [];

  const buildPlaytestUrl = (seedOffset) => {
    const params = [];
    if (networkProfileId.length > 0) {
      params.push(`networkProfile=${encodeURIComponent(networkProfileId)}`);
    }
    if (networkSeed.length > 0) {
      const parsedSeed = Number(networkSeed);
      if (Number.isInteger(parsedSeed) && parsedSeed > 0) {
        params.push(`networkSeed=${parsedSeed + seedOffset}`);
      }
    }
    const query = params.length === 0 ? "" : `?${params.join("&")}`;
    return `${baseUrl}/playtest.html${query}`;
  };

  const waitForPlaytestState = async (targetPage, predicate, timeout = 12000, arg = undefined) =>
    targetPage.waitForFunction(
      (payload) => {
        const state = window.__BREACHLINE_PLAYTEST_STATE__;
        return (
          state !== undefined &&
          Function("state", "arg", `return (${payload.predicateSource})(state, arg);`)(
            state,
            payload.arg
          )
        );
      },
      { predicateSource: predicate.toString(), arg },
      { timeout }
    );

  const sampleContactWhile = async (targetPage, drive, durationMs) => {
    const samples = [];
    await drive("down");
    const start = Date.now();
    while (Date.now() - start < durationMs) {
      await targetPage.waitForTimeout(120);
      const state = await readPlaytestState(targetPage);
      if (typeof state.motionContact === "string" && samples[samples.length - 1] !== state.motionContact) {
        samples.push(state.motionContact);
      }
    }
    await drive("up");
    return samples;
  };

  attachErrorCapture(page, "playtest-primary");
  await waitForPlaytestReady(page);

  const peerPage = await context.newPage();
  attachErrorCapture(peerPage, "playtest-peer");
  await waitForPlaytestReady(peerPage);

  await connectPlaytest(page);
  await connectPlaytest(peerPage);

  await waitForPlaytestState(
    page,
    (state) =>
      state.connectionStatus === "accepted" &&
      state.roundPhase === "active" &&
      state.renderSampleHealthy === true &&
      state.remoteModelCount > 0 &&
      state.remoteFacingMarkerCount > 0 &&
      state.remoteTargetCenterCount > 0 &&
      state.firstPersonShellPartCount > 0
  );
  await waitForPlaytestState(peerPage, (state) => state.connectionStatus === "accepted");

  await waitForPlaytestState(page, (state) => state.rosterEntryCount === 2);
  await waitForPlaytestState(peerPage, (state) => state.rosterEntryCount === 2);

  const initialPrimary = await readPlaytestState(page);
  const initialPeerRoster = await readPlaytestState(peerPage);
  const blockedSamples = await sampleContactWhile(
    page,
    async (phase) => {
      if (phase === "down") {
        await page.keyboard.down("KeyW");
      } else {
        await page.keyboard.up("KeyW");
      }
    },
    2100
  );
  const slidingSamples = await sampleContactWhile(
    page,
    async (phase) => {
      if (phase === "down") {
        await page.keyboard.down("KeyW");
        await page.keyboard.down("KeyD");
      } else {
        await page.keyboard.up("KeyD");
        await page.keyboard.up("KeyW");
      }
    },
    1600
  );
  const afterMovement = await readPlaytestState(page);
  const contactSamples = [...new Set([...blockedSamples, ...slidingSamples])];

  await page.evaluate(() => window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.fire());
  await waitForPlaytestState(
    page,
    (state) =>
      state.fireResultPresentationStatus === "accepted miss" &&
      state.fireResultHitState === "miss" &&
      state.activeFireTracerCount > 0,
    12000
  );
  const missState = await readPlaytestState(page);

  await page.waitForTimeout(250);
  const firstAim = await page.evaluate(() => window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.aimAtRemoteAndFire());
  if (firstAim === undefined || typeof firstAim.targetEntityId !== "number") {
    throw new Error("primary playtest client could not aim at a remote entity");
  }

  await waitForPlaytestState(
    page,
    (state, targetEntityId) =>
      state.fireResultPresentationStatus === "accepted hit" &&
      state.fireResultHitState === "hit" &&
      state.activeFireTracerCount > 0 &&
      state.remoteCombatCueActive === true &&
      state.remoteCombatTargetEntityId === targetEntityId,
    12000,
    firstAim.targetEntityId
  );
  const hitState = await readPlaytestState(page);

  await waitForPlaytestState(
    peerPage,
    (state) =>
      state.localHealth !== "100/100" &&
      state.localHealth !== "-" &&
      (state.localCombatEvent.includes("damage") || state.localCombatEvent.includes("death")),
    12000
  );
  const peerAfterFirstHit = await readPlaytestState(peerPage);

  let shotsAttempted = 1;
  let deathObserved = false;
  for (let i = 0; i < 6; i += 1) {
    const peerState = await readPlaytestState(peerPage);
    if (peerState.localLife === "dead" || peerState.localCombatEvent.includes("death")) {
      deathObserved = true;
      break;
    }

    await page.waitForTimeout(300);
    const followupAim = await page.evaluate(
      (targetEntityId) => window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.aimAtRemoteAndFire(targetEntityId),
      firstAim.targetEntityId
    );
    if (followupAim === undefined) {
      break;
    }
    shotsAttempted += 1;
  }

  try {
    await waitForPlaytestState(
      peerPage,
      (state) => state.localLife === "dead" || state.localCombatEvent.includes("death"),
      7000
    );
    deathObserved = true;
  } catch {
    deathObserved = false;
  }

  let roundTransitionObserved = false;
  try {
    await waitForPlaytestState(
      page,
      (state) =>
        state.roundOutcome !== "none" ||
        state.roundTransition !== "-" ||
        state.resetCue !== "-" ||
        state.roundPhase === "ended" ||
        state.roundPhase === "reset",
      12000
    );
    roundTransitionObserved = true;
  } catch {
    roundTransitionObserved = false;
  }

  // The match-stats scoreboard only populates once the server confirms a kill, so this
  // is observed only on the death path. Rows are labelled by joining the roster view state.
  let scoreboardObserved = false;
  try {
    await waitForPlaytestState(page, (state) => state.scoreboardEntryCount >= 1, 7000);
    scoreboardObserved = true;
  } catch {
    scoreboardObserved = false;
  }
  const scoreboardState = await readPlaytestState(page);
  const scoreboardRows = Array.isArray(scoreboardState.scoreboardRows)
    ? scoreboardState.scoreboardRows
    : [];
  const localScoreRow = scoreboardRows.find((row) => row.isLocalSession === true);

  // The server-owned round winner is set at elimination; the primary is the killer, so
  // its diagnostics-only winner label should resolve to its own roster callsign.
  let roundWinnerObserved = false;
  try {
    await waitForPlaytestState(
      page,
      (state) => typeof state.roundWinner === "string" && state.roundWinner !== "-",
      7000
    );
    roundWinnerObserved = true;
  } catch {
    roundWinnerObserved = false;
  }
  const roundWinnerState = await readPlaytestState(page);

  const primaryAfterCombat = await readPlaytestState(page);
  const peerAfterCombat = await readPlaytestState(peerPage);
  const browserErrorCount = consoleErrors.length + pageErrors.length;

  await page.evaluate(() => window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.disconnect());
  await page.waitForFunction(
    () => window.__BREACHLINE_PLAYTEST_STATE__?.connectionStatus === "closed",
    null,
    { timeout: 12000 }
  );
  const primaryAfterDisconnect = await readPlaytestState(page);
  await waitForPlaytestState(peerPage, (state) => state.rosterEntryCount === 1, 12000);
  const peerRosterAfterPrimaryDisconnect = await readPlaytestState(peerPage);
  let peerOccupancyAfterDisconnect = peerRosterAfterPrimaryDisconnect.matchOccupancy;
  try {
    await waitForPlaytestState(
      peerPage,
      (state) => typeof state.matchOccupancy === "string" && state.matchOccupancy.startsWith("1 /"),
      7000
    );
    peerOccupancyAfterDisconnect = (await readPlaytestState(peerPage)).matchOccupancy;
  } catch {
    // Keep the already-read occupancy; the summary reports it honestly.
  }
  await page.evaluate(() => window.__BREACHLINE_PLAYTEST_DIAGNOSTICS__.connect());
  await page.waitForFunction(
    () => window.__BREACHLINE_PLAYTEST_STATE__?.connectionStatus === "accepted",
    null,
    { timeout: 12000 }
  );
  await page.waitForTimeout(250);
  const primaryAfterReconnect = await readPlaytestState(page);
  const transientStateCleared =
    primaryAfterReconnect.activeFireTracerCount === 0 &&
    primaryAfterReconnect.fireResultPresentationStatus === "-" &&
    primaryAfterReconnect.fireResultHitState === "none" &&
    primaryAfterReconnect.remoteCombatCue === "-" &&
    primaryAfterReconnect.localCombatCue === "-";

  const diagnosticsPage = await context.newPage();
  attachErrorCapture(diagnosticsPage, "diagnostics");
  await diagnosticsPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await diagnosticsPage.click("#connect");
  await diagnosticsPage.waitForFunction(
    () => document.querySelector("#status")?.textContent === "accepted",
    null,
    { timeout: 12000 }
  );
  await diagnosticsPage.waitForFunction(
    () => Number(document.querySelector("#server-tick")?.textContent) > 0,
    null,
    { timeout: 12000 }
  );
  const diagnosticsState = await diagnosticsPage.evaluate(() => ({
    status: document.querySelector("#status")?.textContent,
    serverTick: document.querySelector("#server-tick")?.textContent
  }));

  const sandboxPage = await context.newPage();
  attachErrorCapture(sandboxPage, "sandbox");
  await sandboxPage.goto(`${baseUrl}/sandbox.html`, { waitUntil: "domcontentloaded" });
  await sandboxPage.waitForFunction(
    () =>
      window.__BREACHLINE_SANDBOX_STATE__?.renderSampleHealthy === true &&
      window.__BREACHLINE_SANDBOX_STATE__?.metadataValid === true,
    null,
    { timeout: 12000 }
  );
  const sandboxState = await sandboxPage.evaluate(() => window.__BREACHLINE_SANDBOX_STATE__);

  if (consoleErrors.length > 0 || pageErrors.length > 0) {
    throw new Error([...consoleErrors, ...pageErrors].join("\n"));
  }

  return {
    baseUrl,
    transport: "WebSocket fallback",
    clients: {
      connected: 2,
      primaryStatus: initialPrimary.connectionStatus,
      peerStatus: (await readPlaytestState(peerPage)).connectionStatus
    },
    roster: {
      primaryEntryCount: initialPrimary.rosterEntryCount,
      peerEntryCount: initialPeerRoster.rosterEntryCount,
      primaryLocalCallsign: initialPrimary.rosterLocalCallsign,
      peerLocalCallsign: initialPeerRoster.rosterLocalCallsign,
      distinctLocalCallsigns:
        typeof initialPrimary.rosterLocalCallsign === "string" &&
        typeof initialPeerRoster.rosterLocalCallsign === "string" &&
        initialPrimary.rosterLocalCallsign.length > 0 &&
        initialPeerRoster.rosterLocalCallsign.length > 0 &&
        initialPrimary.rosterLocalCallsign !== initialPeerRoster.rosterLocalCallsign,
      primaryCallsigns: rosterColumn(initialPrimary, "callsign"),
      peerCallsigns: rosterColumn(initialPeerRoster, "callsign"),
      primaryWeapons: rosterColumn(initialPrimary, "weaponLabel"),
      peerEntryCountAfterPrimaryDisconnect: peerRosterAfterPrimaryDisconnect.rosterEntryCount
    },
    occupancy: {
      bothConnected: initialPrimary.matchOccupancy,
      afterPrimaryDisconnect: peerOccupancyAfterDisconnect
    },
    scoreboard: {
      observed: scoreboardObserved,
      entryCount: scoreboardState.scoreboardEntryCount,
      localCallsign: localScoreRow?.callsign,
      allRowsResolved:
        scoreboardRows.length > 0 &&
        scoreboardRows.every(
          (row) => typeof row.callsign === "string" && row.callsign.length > 0
        ),
      rows: scoreboardRows.map((row) => ({
        callsign: row.callsign ?? null,
        deaths: row.deaths,
        isLocalSession: row.isLocalSession,
        kills: row.kills,
        sessionId: row.sessionId
      }))
    },
    roundWinner: {
      observed: roundWinnerObserved,
      label: roundWinnerState.roundWinner,
      localCallsign: initialPrimary.rosterLocalCallsign,
      matchesLocalCallsign:
        typeof roundWinnerState.roundWinner === "string" &&
        roundWinnerState.roundWinner === initialPrimary.rosterLocalCallsign
    },
    render: {
      primaryNonblank: initialPrimary.renderSampleHealthy,
      remoteModelCount: initialPrimary.remoteModelCount,
      remoteFacingMarkerCount: initialPrimary.remoteFacingMarkerCount,
      remoteTargetCenterCount: initialPrimary.remoteTargetCenterCount,
      firstPersonShellPartCount: initialPrimary.firstPersonShellPartCount
    },
    movement: {
      movedFrom: initialPrimary.serverPosition,
      movedTo: afterMovement.serverPosition,
      blockedObserved: contactSamples.includes("blocked"),
      slidingObserved: contactSamples.includes("sliding"),
      contactSamples
    },
    fire: {
      acceptedMiss: {
        status: missState.fireResultPresentationStatus,
        hitState: missState.fireResultHitState,
        activeTracerCount: missState.activeFireTracerCount
      },
      acceptedHit: {
        status: hitState.fireResultPresentationStatus,
        hitState: hitState.fireResultHitState,
        activeTracerCount: hitState.activeFireTracerCount,
        remoteCombatCue: hitState.remoteCombatCue,
        targetEntityId: hitState.remoteCombatTargetEntityId
      },
      shotsAttempted
    },
    combatRound: {
      healthAfterFirstHit: peerAfterFirstHit.localHealth,
      finalPeerHealth: peerAfterCombat.localHealth,
      finalPeerLife: peerAfterCombat.localLife,
      finalPeerCombatEvent: peerAfterCombat.localCombatEvent,
      deathObserved,
      roundTransitionObserved,
      primaryRoundPhase: primaryAfterCombat.roundPhase,
      primaryRoundOutcome: primaryAfterCombat.roundOutcome,
      primaryRoundTransition: primaryAfterCombat.roundTransition,
      primaryResetCue: primaryAfterCombat.resetCue
    },
    network: includeNetworkEvidence
      ? {
          profileId: initialPrimary.networkSimulationProfileId,
          profileLabel: initialPrimary.networkSimulationProfileLabel,
          baseLatencyMs: initialPrimary.networkSimulationBaseLatencyMs,
          jitterMs: initialPrimary.networkSimulationJitterMs,
          dropRate: initialPrimary.networkSimulationDropRate,
          correctionMaxMagnitude: primaryAfterCombat.predictionCorrectionMaxMagnitude ?? 0,
          remoteInterpolationStatus: `remote models ${primaryAfterCombat.remoteModelCount}, source tick ${primaryAfterCombat.remoteInterpolationSourceTick ?? "none"}`,
          fireResultObserved: hitState.fireResultPresentationStatus === "accepted hit" || missState.fireResultPresentationStatus === "accepted miss",
          roundResetObserved: primaryAfterCombat.resetCue !== "-" || primaryAfterCombat.roundTransition !== "-" || primaryAfterCombat.roundPhase === "ended" || primaryAfterCombat.roundPhase === "reset",
          consoleErrorCount: browserErrorCount
        }
      : undefined,
    reconnect: {
      beforeStatus: primaryAfterDisconnect.connectionStatus,
      afterStatus: primaryAfterReconnect.connectionStatus,
      transientStateCleared,
      reconnectCount: primaryAfterReconnect.reconnectCount
    },
    baselinePages: {
      diagnosticsStatus: diagnosticsState.status,
      diagnosticsServerTick: diagnosticsState.serverTick,
      sandboxRenderNonblank: sandboxState.renderSampleHealthy,
      sandboxMetadataValid: sandboxState.metadataValid
    },
    browser: {
      consoleErrors,
      pageErrors
    }
  };
}
