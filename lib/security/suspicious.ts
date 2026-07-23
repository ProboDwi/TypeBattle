export interface IntegrityInput {
  correctCharacters: number;
  incorrectKeystrokes: number;
  totalKeystrokes: number;
  clientDurationMs: number;
  serverDurationMs: number;
  wpm: number;
  targetLength: number;
  focusLosses: number;
  pasted?: boolean;
  dropped?: boolean;
  sequenceRegressed?: boolean;
  progressBeforeStart?: boolean;
}

export function detectSuspiciousResult(input: IntegrityInput): string[] {
  const flags: string[] = [];
  if (input.pasted) flags.push("paste");
  if (input.dropped) flags.push("drop");
  if (input.correctCharacters > input.targetLength)
    flags.push("character_overflow");
  if (
    input.totalKeystrokes < input.correctCharacters ||
    input.incorrectKeystrokes > input.totalKeystrokes
  )
    flags.push("inconsistent_keystrokes");
  if (input.serverDurationMs < 3000 || input.wpm > 220)
    flags.push("implausible_speed");
  if (
    Math.abs(input.clientDurationMs - input.serverDurationMs) >
    Math.max(5000, input.serverDurationMs * 0.25)
  )
    flags.push("duration_mismatch");
  if (input.focusLosses > 12) flags.push("excessive_focus_loss");
  if (input.sequenceRegressed) flags.push("sequence_regressed");
  if (input.progressBeforeStart) flags.push("progress_before_start");
  return flags;
}
