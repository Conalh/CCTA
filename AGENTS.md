# Agent Instructions

This repository is an original browser tactical FPS prototype, built as a server-authoritative spine one verifiable milestone at a time. The current milestone is tracked in [ROADMAP.md](ROADMAP.md) — read it first rather than assuming a phase number from this file. Future agents must preserve the proven spine before expanding it.

## Scope Discipline

- Work only inside the requested milestone.
- Do not build gameplay or add systems ahead of the milestone that calls for them. Several subsystems already exist as deliberately narrow prototypes — movement, prediction, interpolation, hitscan, and placeholder combat/loadout/round flow. Do not expand them into real gameplay, a gameplay HUD, matchmaking, ranking, persistence, or art pipelines unless the current task explicitly asks for that milestone.
- Do not perform unrelated cleanup, dependency swaps, formatting churn, or speculative rewrites.
- Read the relevant docs before editing code.

## Original IP Rule

This project must stay original. Do not copy or closely imitate existing shooter names, map names, layouts, factions, weapon names, sounds, UI, logo treatment, scoreboard presentation, buy flows, callouts, or other recognizable presentation details.

When in doubt, make the concept more generic, more abstract, or more distinct.

## Validation Expectations

- Run the narrowest command that proves your change.
- Prefer `npm run typecheck` for TypeScript boundary changes.
- Use `npm run validate` for the current repository-level validation script.
- If a command cannot run, report the exact command, the failure, and what inspection was performed instead.
- Never claim tests, builds, or checks passed unless the command actually ran and exited successfully.

## Required Reading By Task

- Project purpose and setup: [README.md](README.md)
- Hard rules: [GUARDRAILS.md](GUARDRAILS.md)
- System boundaries: [ARCHITECTURE_SPINE.md](ARCHITECTURE_SPINE.md)
- Coding rules: [CODING_STANDARDS.md](CODING_STANDARDS.md)
- Milestone order: [ROADMAP.md](ROADMAP.md)
- Networking decisions: [docs/NETWORKING_MODEL.md](docs/NETWORKING_MODEL.md)
- Gameplay limits: [docs/GAMEPLAY_CONTRACT.md](docs/GAMEPLAY_CONTRACT.md)
- Validation reporting: [docs/VALIDATION.md](docs/VALIDATION.md)

## Ownership Boundaries

- `apps/client` owns browser-facing runtime and renderer integration.
- `apps/server` owns authoritative simulation and transport sessions.
- `apps/registry` owns the optional, self-hostable match-discovery service (HTTP). Discovery only — it never owns or relays gameplay truth.
- `packages/shared` owns protocol constants, message shapes, and shared type contracts.
- `docs` owns focused design notes and validation expectations.

Do not move behavior across these boundaries without updating the architecture docs in the same change.
