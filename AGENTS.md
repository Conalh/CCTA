# Agent Instructions

This repository is in **Phase 1: Project Spine** for an original browser tactical FPS prototype. Future agents must preserve the foundation before expanding it.

## Scope Discipline

- Work only inside the requested milestone.
- Do not build gameplay unless the current task explicitly asks for that milestone.
- Do not add movement, weapons, maps, UI, matchmaking, prediction, interpolation, ranking, persistence, or art pipelines during Phase 1.
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
- `packages/shared` owns protocol constants, message shapes, and shared type contracts.
- `docs` owns focused design notes and validation expectations.

Do not move behavior across these boundaries without updating the architecture docs in the same change.
