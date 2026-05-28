# Guardrails

These rules are non-negotiable for the project.

## Original IP

- Build an original tactical FPS experiment.
- Do not copy names, maps, assets, weapon identities, factions, sound cues, UI layouts, economy flows, callouts, or presentation from existing games.
- Do not import copyrighted assets.
- Use placeholder names until an original art and design direction is written.

## Server Authority

- The server is authoritative for match state, simulation ticks, health, death, hit confirmation, round state, and scoring.
- The client may render, collect input, predict later, and interpolate later, but it must not own truth.
- Shared types describe protocol contracts only. They must not contain simulation authority or renderer logic.

## Scope Control

- Do not implement gameplay during Phase 1.
- Do not add speculative systems because they seem likely to be needed later.
- Do not rewrite project structure without a milestone that requires it.
- Do not do unrelated cleanup while touching nearby files.

## Dependencies

- Add dependencies carefully and document why they are needed.
- Prefer standard TypeScript and platform APIs until a real feature requires a library.
- Do not introduce a rendering engine, physics engine, ECS, networking abstraction, database, or asset pipeline during Phase 1.
- Lock dependency changes through package metadata and validate after installation.

## Validation Before Completion

- Run available validation before reporting completion.
- Report exact commands and results.
- If validation is blocked, report the blocker plainly and do not claim the blocked check passed.
- Documentation-only changes still require file inspection against the requested deliverables.

## Multiplayer Safety

- Design all future gameplay around hostile clients.
- Never trust client-reported hit results, health, death, score, position authority, or inventory state.
- Keep protocol versioning explicit from the first network proof.
