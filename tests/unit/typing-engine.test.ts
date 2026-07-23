import { describe, expect, it } from "vitest";
import { createTypingState, typingReducer } from "@/lib/typing/engine";

describe("strict typing reducer", () => {
  it("ignores input before start", () =>
    expect(
      typingReducer(createTypingState("abc"), { type: "TYPE", character: "a" })
        .currentCharacter,
    ).toBe(0));
  it("advances on correct input", () => {
    const started = typingReducer(createTypingState("ab"), { type: "START" });
    const next = typingReducer(started, { type: "TYPE", character: "a" });
    expect(next.currentCharacter).toBe(1);
    expect(next.correctCharacters).toBe(1);
  });
  it("blocks progress after incorrect input until backspace", () => {
    let state = typingReducer(createTypingState("ab"), { type: "START" });
    state = typingReducer(state, { type: "TYPE", character: "x" });
    expect(state.currentCharacter).toBe(0);
    expect(state.incorrectKeystrokes).toBe(1);
    expect(
      typingReducer(state, { type: "TYPE", character: "a" }).currentCharacter,
    ).toBe(0);
    state = typingReducer(state, { type: "BACKSPACE" });
    state = typingReducer(state, { type: "TYPE", character: "a" });
    expect(state.currentCharacter).toBe(1);
  });
  it("marks the state finished after the final character", () => {
    let state = typingReducer(createTypingState("a"), { type: "START" });
    state = typingReducer(state, { type: "TYPE", character: "a" });
    expect(state.finished).toBe(true);
  });
  it("restores an authoritative race snapshot without moving backward", () => {
    const restored = typingReducer(createTypingState("lintasan"), {
      type: "RESTORE",
      content: "lintasan",
      currentCharacter: 4,
      incorrectKeystrokes: 2,
      totalKeystrokes: 6,
    });
    expect(restored).toMatchObject({
      currentCharacter: 4,
      correctCharacters: 4,
      incorrectKeystrokes: 2,
      totalKeystrokes: 6,
      started: true,
      finished: false,
    });
  });
});
