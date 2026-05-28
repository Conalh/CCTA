import type { ClientInputMessage } from "@breachline/shared";

export type InputPipelineConfig = Readonly<{
  sessionId: number;
}>;

export type InputPipelineSnapshot = Readonly<{
  sessionId: number;
  lastAcceptedInputSequence: number;
  droppedInputCount: number;
}>;

export type InputAccepted = InputPipelineSnapshot &
  Readonly<{
    accepted: true;
  }>;

export type InputDropped = InputPipelineSnapshot &
  Readonly<{
    accepted: false;
    reason: "stale-sequence" | "invalid-values";
  }>;

export type InputRecordResult = InputAccepted | InputDropped;

export type InputPipeline = Readonly<{
  record(message: ClientInputMessage): InputRecordResult;
  snapshot(): InputPipelineSnapshot;
  acceptedSequences(): readonly number[];
}>;

export function createInputPipeline(config: InputPipelineConfig): InputPipeline {
  const sessionId = readPositiveUint32(config.sessionId, "sessionId");
  const acceptedSequences: number[] = [];
  let lastAcceptedInputSequence = 0;
  let droppedInputCount = 0;

  function record(message: ClientInputMessage): InputRecordResult {
    if (!isValidSequence(message.sequence)) {
      droppedInputCount += 1;
      return {
        ...snapshot(),
        accepted: false,
        reason: "invalid-values"
      };
    }

    if (message.sequence <= lastAcceptedInputSequence) {
      droppedInputCount += 1;
      return {
        ...snapshot(),
        accepted: false,
        reason: "stale-sequence"
      };
    }

    if (!hasValidValues(message)) {
      droppedInputCount += 1;
      return {
        ...snapshot(),
        accepted: false,
        reason: "invalid-values"
      };
    }

    lastAcceptedInputSequence = message.sequence;
    acceptedSequences.push(message.sequence);

    return {
      ...snapshot(),
      accepted: true
    };
  }

  function snapshot(): InputPipelineSnapshot {
    return {
      sessionId,
      lastAcceptedInputSequence,
      droppedInputCount
    };
  }

  return {
    record,
    snapshot,
    acceptedSequences: () => acceptedSequences
  };
}

function isValidSequence(sequence: number): boolean {
  return Number.isInteger(sequence) && sequence >= 0 && sequence <= 0xffffffff;
}

function hasValidValues(message: ClientInputMessage): boolean {
  return (
    Number.isFinite(message.clientTimeMs) &&
    Number.isInteger(message.buttons) &&
    message.buttons >= 0 &&
    message.buttons <= 0xffffffff &&
    Number.isFinite(message.yaw) &&
    Number.isFinite(message.pitch)
  );
}

function readPositiveUint32(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 0xffffffff) {
    throw new Error(`${field} must be a positive unsigned 32-bit integer, got ${value}.`);
  }
  return value;
}
