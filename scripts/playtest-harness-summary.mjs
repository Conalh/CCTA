export function createPlaytestHarnessSummary(evidence) {
  const lines = [
    "# Phase 34 Local Two-Player Playtest Harness",
    "",
    `Target: ${readText(evidence.baseUrl, "unknown")}`,
    `Transport: ${readText(evidence.transport, "WebSocket fallback")} (WebTransport remains pending/unproven)`,
    ...formatNetworkProfileLines(evidence.network),
    "",
    "Evidence:",
    `- two clients: ${formatClientStatus(evidence.clients)}`,
    `- roster: ${formatRosterStatus(evidence.roster)}`,
    `- match occupancy: ${formatOccupancyStatus(evidence.occupancy)}`,
    `- render: ${formatRenderStatus(evidence.render)}`,
    `- movement/collision: ${formatMovementStatus(evidence.movement)}`,
    `- jump: ${formatJumpStatus(evidence.jump)}`,
    `- accepted miss: ${formatMissStatus(evidence.fire?.acceptedMiss)}`,
    `- accepted hit: ${formatHitStatus(evidence.fire?.acceptedHit)}`,
    `- combat/round: ${formatCombatRoundStatus(evidence.combatRound)}`,
    `- round winner: ${formatRoundWinnerStatus(evidence.roundWinner)}`,
    `- match result: ${formatMatchResultStatus(evidence.matchResult)}`,
    `- scoreboard callsigns: ${formatScoreboardCallsignStatus(evidence.scoreboard)}`,
    ...formatNetworkDiagnosticsLines(evidence.network),
    `- reconnect cleanup: ${formatReconnectStatus(evidence.reconnect)}`,
    `- baseline pages: ${formatBaselineStatus(evidence.baselinePages)}`,
    `- browser console: ${formatBrowserStatus(evidence.browser)}`
  ];

  return `${lines.join("\n")}\n`;
}

export function extractPlaywrightJsonResult(output) {
  const match = output.match(/### Result\s*\r?\n([\s\S]*?)(?:\r?\n### Ran Playwright code|\r?\n### Ran\b|$)/);
  if (match === null) {
    throw new Error("Playwright result block was not found.");
  }

  try {
    return JSON.parse(match[1].trim());
  } catch (error) {
    throw new Error(`Playwright result block was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function formatClientStatus(clients) {
  if (clients?.connected === 2 && clients.primaryStatus === "accepted" && clients.peerStatus === "accepted") {
    return `ok (${clients.primaryStatus}, ${clients.peerStatus})`;
  }

  return `fail (${readText(clients?.primaryStatus, "missing")}, ${readText(clients?.peerStatus, "missing")})`;
}

function formatRosterStatus(roster) {
  const callsigns = Array.isArray(roster?.primaryCallsigns) ? roster.primaryCallsigns.join(", ") : "";
  const weapons = Array.isArray(roster?.primaryWeapons)
    ? [...new Set(roster.primaryWeapons)].join(", ")
    : "";
  if (
    roster?.primaryEntryCount === 2 &&
    roster.peerEntryCount === 2 &&
    roster.distinctLocalCallsigns === true &&
    roster.peerEntryCountAfterPrimaryDisconnect === 1
  ) {
    return `ok (both see 2 [${callsigns}], weapons [${weapons}], local ${readText(roster.primaryLocalCallsign, "?")}/${readText(roster.peerLocalCallsign, "?")}, disconnect -> ${roster.peerEntryCountAfterPrimaryDisconnect})`;
  }

  return `fail (primary ${readNumber(roster?.primaryEntryCount)}, peer ${readNumber(roster?.peerEntryCount)}, distinct ${readBoolean(roster?.distinctLocalCallsigns)}, disconnect -> ${readNumber(roster?.peerEntryCountAfterPrimaryDisconnect)})`;
}

function formatOccupancyStatus(occupancy) {
  const both = readText(occupancy?.bothConnected, "-");
  const after = readText(occupancy?.afterPrimaryDisconnect, "-");
  if (/^2 \/ \d+$/.test(both) && /^1 \/ \d+$/.test(after)) {
    return `ok (${both}, disconnect -> ${after})`;
  }

  return `caveat (${both}, disconnect -> ${after})`;
}

function formatRenderStatus(render) {
  if (render?.primaryNonblank === true && readNumber(render.remoteModelCount) > 0) {
    return `ok (nonblank, remote models ${render.remoteModelCount})`;
  }

  return `fail (nonblank ${readBoolean(render?.primaryNonblank)}, remote models ${readNumber(render?.remoteModelCount)})`;
}

function formatMovementStatus(movement) {
  const samples = Array.isArray(movement?.contactSamples) ? movement.contactSamples.join(" -> ") : "none";
  if (movement?.blockedObserved === true && movement?.slidingObserved === true) {
    return `ok (${samples})`;
  }

  return `caveat (${samples})`;
}

function formatJumpStatus(jump) {
  const peak = readNumber(jump?.peakY);
  if (jump?.observed === true && peak > 0.3) {
    return `ok (peak Y ${peak.toFixed(2)})`;
  }

  return "caveat (jump arc not observed)";
}

function formatMissStatus(miss) {
  if (miss?.status === "accepted miss" && miss.hitState === "miss" && readNumber(miss.activeTracerCount) > 0) {
    return `ok (${miss.status}, ${miss.hitState}, tracers ${miss.activeTracerCount})`;
  }

  return `fail (${readText(miss?.status, "missing")}, ${readText(miss?.hitState, "missing")})`;
}

function formatHitStatus(hit) {
  if (hit?.status === "accepted hit" && hit.hitState === "hit" && readNumber(hit.targetEntityId) > 0) {
    return `ok (${hit.status}, target ${hit.targetEntityId})`;
  }

  return `fail (${readText(hit?.status, "missing")}, ${readText(hit?.hitState, "missing")})`;
}

function formatCombatRoundStatus(combatRound) {
  if (combatRound?.deathObserved === true && combatRound.roundTransitionObserved === true) {
    const resetCue = readText(combatRound.primaryResetCue, "");
    const resetSuffix = resetCue.length === 0 || resetCue === "-" ? "" : `, ${resetCue}`;
    return `ok (${readText(combatRound.finalPeerLife, "unknown")}, ${readText(combatRound.primaryRoundPhase, "unknown")}, ${readText(combatRound.primaryRoundOutcome, "unknown")}${resetSuffix})`;
  }

  return "caveat (death/round transition not observed)";
}

function formatMatchResultStatus(matchResult) {
  const banner = readText(matchResult?.banner, "-");

  if (matchResult?.observed === true && matchResult.matchOver === true && matchResult.bannerNamesLocal === true) {
    return `ok (${banner})`;
  }

  if (matchResult?.observed === true && matchResult.matchOver === true) {
    return `caveat (${banner}; winner not the local callsign)`;
  }

  return "caveat (match not decided)";
}

function formatRoundWinnerStatus(roundWinner) {
  const label = readText(roundWinner?.label, "-");

  if (roundWinner?.observed === true && roundWinner.matchesLocalCallsign === true) {
    return `ok (${label})`;
  }

  if (roundWinner?.observed === true && label !== "-") {
    return `caveat (${label}; not the local callsign)`;
  }

  return "caveat (no winner observed)";
}

function formatScoreboardCallsignStatus(scoreboard) {
  const rows = Array.isArray(scoreboard?.rows) ? scoreboard.rows : [];
  const detail = rows
    .map((row) => `${readText(row.callsign, `session ${row.sessionId}`)} ${readNumber(row.kills)}/${readNumber(row.deaths)}`)
    .join(", ");
  const localCallsign = readText(scoreboard?.localCallsign, "");

  if (
    scoreboard?.observed === true &&
    rows.length > 0 &&
    scoreboard.allRowsResolved === true &&
    localCallsign.length > 0
  ) {
    return `ok (${detail}; local ${localCallsign})`;
  }

  if (scoreboard?.observed === true && rows.length > 0) {
    return `caveat (${detail}; some rows unresolved)`;
  }

  return "caveat (no scored rows observed)";
}

function formatNetworkProfileLines(network) {
  if (network === undefined) {
    return [];
  }

  return [
    `Network profile: ${readText(network.profileLabel, "unknown")} (${readText(network.profileId, "unknown")}, latency ${readNumber(network.baseLatencyMs)}ms, jitter ${readNumber(network.jitterMs)}ms, drop ${formatPercent(network.dropRate)})`
  ];
}

function formatNetworkDiagnosticsLines(network) {
  if (network === undefined) {
    return [];
  }

  const fire = network.fireResultObserved === true ? "fire observed" : "fire missing";
  const reset = network.roundResetObserved === true ? "reset observed" : "reset missing";
  const consoleErrorCount = readNumber(network.consoleErrorCount);
  const status = network.fireResultObserved === true && consoleErrorCount === 0 ? "ok" : "caveat";
  return [
    `- network diagnostics: ${status} (correction max ${formatMeters(network.correctionMaxMagnitude)}, ${readText(network.remoteInterpolationStatus, "remote unknown")}, ${fire}, ${reset}, console errors ${consoleErrorCount})`
  ];
}

function formatReconnectStatus(reconnect) {
  if (reconnect?.beforeStatus === "closed" && reconnect.afterStatus === "accepted" && reconnect.transientStateCleared === true) {
    return `ok (${reconnect.beforeStatus} -> ${reconnect.afterStatus}, transient cleared)`;
  }

  return `fail (${readText(reconnect?.beforeStatus, "missing")} -> ${readText(reconnect?.afterStatus, "missing")})`;
}

function formatBaselineStatus(baselinePages) {
  if (baselinePages?.diagnosticsStatus === "accepted" && baselinePages.sandboxRenderNonblank === true) {
    return `ok (diagnostics ${baselinePages.diagnosticsStatus}, sandbox nonblank)`;
  }

  return `fail (diagnostics ${readText(baselinePages?.diagnosticsStatus, "missing")}, sandbox ${readBoolean(baselinePages?.sandboxRenderNonblank)})`;
}

function formatBrowserStatus(browser) {
  const consoleErrors = Array.isArray(browser?.consoleErrors) ? browser.consoleErrors : [];
  const pageErrors = Array.isArray(browser?.pageErrors) ? browser.pageErrors : [];
  const errorCount = consoleErrors.length + pageErrors.length;
  if (errorCount === 0) {
    return "ok (0 errors)";
  }

  return `fail (${errorCount} errors)`;
}

function readText(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(value) {
  return value === true ? "true" : "false";
}

function formatPercent(value) {
  return `${Number((readNumber(value) * 100).toFixed(2))}%`;
}

function formatMeters(value) {
  return `${readNumber(value).toFixed(3)} m`;
}
