import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createPlaytestHarnessSummary,
  extractPlaywrightJsonResult
} from "../scripts/playtest-harness-summary.mjs";

const completeEvidence = {
  baseUrl: "http://127.0.0.1:8787",
  transport: "WebSocket fallback",
  clients: {
    connected: 2,
    primaryStatus: "accepted",
    peerStatus: "accepted"
  },
  roster: {
    primaryEntryCount: 2,
    peerEntryCount: 2,
    primaryLocalCallsign: "Vesper",
    peerLocalCallsign: "Quill",
    distinctLocalCallsigns: true,
    primaryCallsigns: ["Vesper", "Quill"],
    peerCallsigns: ["Vesper", "Quill"],
    primaryWeapons: ["Halcyon", "Halcyon"],
    peerEntryCountAfterPrimaryDisconnect: 1
  },
  render: {
    primaryNonblank: true,
    remoteModelCount: 1,
    remoteFacingMarkerCount: 1,
    remoteTargetCenterCount: 1,
    firstPersonShellPartCount: 4
  },
  movement: {
    movedFrom: [0, 0, 0],
    movedTo: [0, 0, -1.2],
    blockedObserved: true,
    slidingObserved: true,
    contactSamples: ["moving", "blocked", "sliding"]
  },
  jump: {
    observed: true,
    peakY: 1.01
  },
  fire: {
    acceptedMiss: {
      status: "accepted miss",
      hitState: "miss",
      activeTracerCount: 1
    },
    acceptedHit: {
      status: "accepted hit",
      hitState: "hit",
      activeTracerCount: 1,
      remoteCombatCue: "remote hit entity 2",
      targetEntityId: 2
    }
  },
  combatRound: {
    healthAfterFirstHit: "75/100",
    finalPeerHealth: "0/100",
    finalPeerLife: "dead",
    finalPeerCombatEvent: "death by session 1",
    deathObserved: true,
    roundTransitionObserved: true,
    primaryRoundPhase: "ended",
    primaryRoundOutcome: "elimination",
    primaryRoundTransition: "active -> ended",
    primaryResetCue: "reset in 12 ticks"
  },
  occupancy: {
    bothConnected: "2 / 8",
    afterPrimaryDisconnect: "1 / 8"
  },
  scoreboard: {
    observed: true,
    entryCount: 2,
    localCallsign: "Vesper",
    allRowsResolved: true,
    rows: [
      { callsign: "Vesper", deaths: 0, isLocalSession: true, kills: 1, sessionId: 1 },
      { callsign: "Quill", deaths: 1, isLocalSession: false, kills: 0, sessionId: 2 }
    ]
  },
  roundWinner: {
    observed: true,
    label: "Vesper",
    localCallsign: "Vesper",
    matchesLocalCallsign: true
  },
  matchResult: {
    observed: true,
    matchOver: true,
    banner: "Vesper wins the match",
    localCallsign: "Vesper",
    bannerNamesLocal: true
  },
  reconnect: {
    beforeStatus: "closed",
    afterStatus: "accepted",
    transientStateCleared: true,
    reconnectCount: 1
  },
  baselinePages: {
    diagnosticsStatus: "accepted",
    diagnosticsServerTick: "240",
    sandboxRenderNonblank: true,
    sandboxMetadataValid: true
  },
  browser: {
    consoleErrors: [],
    pageErrors: []
  }
};

test("playtest harness summary reports local evidence and transport caveats", () => {
  const text = createPlaytestHarnessSummary(completeEvidence);

  assert.match(text, /Phase 34 Local Two-Player Playtest Harness/);
  assert.match(text, /http:\/\/127\.0\.0\.1:8787/);
  assert.match(text, /WebSocket fallback/);
  assert.match(text, /WebTransport remains pending\/unproven/);
  assert.match(text, /two clients: ok \(accepted, accepted\)/);
  assert.match(text, /roster: ok \(both see 2 \[Vesper, Quill\], weapons \[Halcyon\], local Vesper\/Quill, disconnect -> 1\)/);
  assert.match(text, /match occupancy: ok \(2 \/ 8, disconnect -> 1 \/ 8\)/);
  assert.match(text, /render: ok \(nonblank, remote models 1\)/);
  assert.match(text, /movement\/collision: ok \(moving -> blocked -> sliding\)/);
  assert.match(text, /jump: ok \(peak Y 1\.01\)/);
  assert.match(text, /accepted miss: ok \(accepted miss, miss, tracers 1\)/);
  assert.match(text, /accepted hit: ok \(accepted hit, target 2\)/);
  assert.match(text, /combat\/round: ok \(dead, ended, elimination, reset in 12 ticks\)/);
  assert.match(text, /round winner: ok \(Vesper\)/);
  assert.match(text, /match result: ok \(Vesper wins the match\)/);
  assert.match(text, /scoreboard callsigns: ok \(Vesper 1\/0, Quill 0\/1; local Vesper\)/);
  assert.match(text, /reconnect cleanup: ok \(closed -> accepted, transient cleared\)/);
  assert.match(text, /baseline pages: ok \(diagnostics accepted, sandbox nonblank\)/);
  assert.match(text, /browser console: ok \(0 errors\)/);
});

test("playtest harness summary keeps optional death or reset evidence honest", () => {
  const text = createPlaytestHarnessSummary({
    ...completeEvidence,
    combatRound: {
      ...completeEvidence.combatRound,
      deathObserved: false,
      roundTransitionObserved: false,
      finalPeerLife: "alive",
      primaryRoundPhase: "active",
      primaryRoundOutcome: "none"
    }
  });

  assert.match(text, /combat\/round: caveat \(death\/round transition not observed\)/);
  assert.doesNotMatch(text, /combat\/round: ok/);
});

test("playtest harness summary flags an incomplete server-owned roster", () => {
  const text = createPlaytestHarnessSummary({
    ...completeEvidence,
    roster: {
      ...completeEvidence.roster,
      peerEntryCount: 1,
      distinctLocalCallsigns: false,
      peerEntryCountAfterPrimaryDisconnect: 2
    }
  });

  assert.match(text, /roster: fail \(primary 2, peer 1, distinct false, disconnect -> 2\)/);
  assert.doesNotMatch(text, /roster: ok/);
});

test("playtest harness summary flags match occupancy that does not shrink on disconnect", () => {
  const text = createPlaytestHarnessSummary({
    ...completeEvidence,
    occupancy: {
      bothConnected: "2 / 8",
      afterPrimaryDisconnect: "2 / 8"
    }
  });

  assert.match(text, /match occupancy: caveat \(2 \/ 8, disconnect -> 2 \/ 8\)/);
  assert.doesNotMatch(text, /match occupancy: ok/);
});

test("playtest harness summary reports an honest match-result caveat when the match is not decided", () => {
  const text = createPlaytestHarnessSummary({
    ...completeEvidence,
    matchResult: {
      observed: false,
      matchOver: false,
      banner: "-",
      localCallsign: "Vesper",
      bannerNamesLocal: false
    }
  });

  assert.match(text, /match result: caveat \(match not decided\)/);
  assert.doesNotMatch(text, /match result: ok/);
});

test("playtest harness summary reports an honest round-winner caveat when none is observed", () => {
  const text = createPlaytestHarnessSummary({
    ...completeEvidence,
    roundWinner: {
      observed: false,
      label: "-",
      localCallsign: "Vesper",
      matchesLocalCallsign: false
    }
  });

  assert.match(text, /round winner: caveat \(no winner observed\)/);
  assert.doesNotMatch(text, /round winner: ok/);
});

test("playtest harness summary flags a round winner that is not the local callsign", () => {
  const text = createPlaytestHarnessSummary({
    ...completeEvidence,
    roundWinner: {
      observed: true,
      label: "session 2",
      localCallsign: "Vesper",
      matchesLocalCallsign: false
    }
  });

  assert.match(text, /round winner: caveat \(session 2; not the local callsign\)/);
});

test("playtest harness summary reports an honest scoreboard caveat when no kill is scored", () => {
  const text = createPlaytestHarnessSummary({
    ...completeEvidence,
    scoreboard: {
      observed: false,
      entryCount: 0,
      localCallsign: undefined,
      allRowsResolved: false,
      rows: []
    }
  });

  assert.match(text, /scoreboard callsigns: caveat \(no scored rows observed\)/);
  assert.doesNotMatch(text, /scoreboard callsigns: ok/);
});

test("playtest harness summary flags scoreboard rows that resolve no callsign", () => {
  const text = createPlaytestHarnessSummary({
    ...completeEvidence,
    scoreboard: {
      observed: true,
      entryCount: 2,
      localCallsign: "Vesper",
      allRowsResolved: false,
      rows: [
        { callsign: "Vesper", deaths: 0, isLocalSession: true, kills: 1, sessionId: 1 },
        { callsign: null, deaths: 1, isLocalSession: false, kills: 0, sessionId: 2 }
      ]
    }
  });

  assert.match(text, /scoreboard callsigns: caveat \(Vesper 1\/0, session 2 0\/1; some rows unresolved\)/);
});

test("playtest harness summary reports optional local network simulation evidence", () => {
  const text = createPlaytestHarnessSummary({
    ...completeEvidence,
    network: {
      profileId: "moderate-latency",
      profileLabel: "Moderate latency",
      baseLatencyMs: 100,
      jitterMs: 0,
      dropRate: 0,
      correctionMaxMagnitude: 0.125,
      remoteInterpolationStatus: "remote models 1, source tick 44",
      fireResultObserved: true,
      roundResetObserved: true,
      consoleErrorCount: 0
    }
  });

  assert.match(text, /Network profile: Moderate latency \(moderate-latency, latency 100ms, jitter 0ms, drop 0%\)/);
  assert.match(text, /network diagnostics: ok \(correction max 0\.125 m, remote models 1, source tick 44, fire observed, reset observed, console errors 0\)/);
});

test("extractPlaywrightJsonResult reads the JSON result block from playwright output", () => {
  const parsed = extractPlaywrightJsonResult(`noise
### Result
{"clients":{"connected":2},"browser":{"consoleErrors":[]}}
### Ran Playwright code
`);

  assert.equal(parsed.clients.connected, 2);
  assert.deepEqual(parsed.browser.consoleErrors, []);
});

test("extractPlaywrightJsonResult rejects missing or malformed result output", () => {
  assert.throws(() => extractPlaywrightJsonResult("no result"), /Playwright result block/);
  assert.throws(() => extractPlaywrightJsonResult("### Result\nnot-json\n### Ran"), /valid JSON/);
});

test("playtest harness command is exposed as an npm script", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(packageJson.scripts["playtest:harness"], "node scripts/playtest-harness.mjs");
  assert.equal(packageJson.scripts["playtest:harness:network"], "node scripts/playtest-network-harness.mjs");
});
