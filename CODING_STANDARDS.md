# Coding Standards

These standards keep the prototype small, testable, and safe for multiple agents.

## TypeScript

- Use strict TypeScript.
- Prefer explicit exported types for public package boundaries.
- Use `Readonly` object shapes for protocol messages and immutable contracts.
- Keep files focused. Split modules when a file starts mixing unrelated concerns.
- Avoid `any`. If an unknown value crosses a boundary, parse or narrow it.
- Do not suppress compiler errors without a short explanation and a follow-up issue or milestone note.

## Naming

- Use original project language.
- Do not use names from existing shooter franchises for factions, maps, weapons, modes, UI, or callouts.
- Use clear technical names for infrastructure: `ServerTick`, `ClientInput`, `ReliableControlMessage`, `ProtocolVersion`.
- Use placeholder names when design is undecided.

## Module Boundaries

- `apps/client`: browser runtime, input capture, renderer integration, client network adapter.
- `apps/server`: transport sessions, authoritative simulation loop, validation, replication.
- `packages/shared`: protocol and type contracts only.
- `docs`: design records and validation instructions.

Client modules may import `packages/shared`. Server modules may import `packages/shared`. Shared modules must not import from either app.

## Testing And Validation

- Run `npm run typecheck` after TypeScript changes.
- Run `npm run validate` before reporting milestone completion.
- Add targeted tests when behavior exists to test.
- Do not create empty tests just to claim coverage.
- If a command cannot run, report the exact command and failure.

## Logging

- Server logs should be structured enough to support multiplayer debugging.
- Log connection lifecycle, protocol mismatches, validation rejects, tick-loop health, and snapshot cadence.
- Do not log secrets, tokens, or full raw binary payloads by default.
- Client logs should be gated behind development/debug controls once UI work exists.

## Error Handling

- Treat all client network input as untrusted.
- Validate protocol version and message kind before reading payload-specific fields.
- Prefer explicit result objects or thrown errors at module boundaries, not silent failure.
- Transport errors should be reported with enough context to reproduce connection setup issues.

## Binary Protocol Rules

- Keep protocol versioning explicit.
- Define byte order before binary serialization is introduced.
- Document every field in binary packets before implementation.
- Use reliable streams for ordered control data.
- Use datagrams only for data that can be dropped or superseded.
- Never add binary parsing through ad hoc offsets without tests once packets exist.

## Real-Time Loop Guidance

- The authoritative server loop must be fixed-rate.
- Keep simulation ticks independent from render frames.
- Do not put blocking I/O inside the tick loop.
- Collect inputs before the tick, simulate once, then publish snapshots.
- Add latency/loss simulation as a transport test layer, not as gameplay logic.
- Prefer deterministic, inspectable data flow over clever abstractions.
