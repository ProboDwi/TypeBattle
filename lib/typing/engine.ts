import {
  calculateAccuracy,
  calculateProgress,
  calculateWpm,
} from "@/lib/typing/metrics";

export interface TypingState {
  content: string;
  currentCharacter: number;
  correctCharacters: number;
  incorrectKeystrokes: number;
  totalKeystrokes: number;
  errorCharacter: string | null;
  started: boolean;
  finished: boolean;
}

export type TypingAction =
  | { type: "START" }
  | { type: "TYPE"; character: string }
  | { type: "BACKSPACE" }
  | { type: "RESET"; content?: string }
  | {
      type: "RESTORE";
      content: string;
      currentCharacter: number;
      incorrectKeystrokes: number;
      totalKeystrokes: number;
    };

export function createTypingState(content: string): TypingState {
  return {
    content,
    currentCharacter: 0,
    correctCharacters: 0,
    incorrectKeystrokes: 0,
    totalKeystrokes: 0,
    errorCharacter: null,
    started: false,
    finished: false,
  };
}

export function typingReducer(
  state: TypingState,
  action: TypingAction,
): TypingState {
  switch (action.type) {
    case "START":
      return { ...state, started: true };
    case "TYPE": {
      if (
        !state.started ||
        state.finished ||
        state.errorCharacter ||
        !action.character
      )
        return state;
      const expected = state.content[state.currentCharacter];
      const totalKeystrokes = state.totalKeystrokes + 1;
      if (action.character !== expected) {
        return {
          ...state,
          totalKeystrokes,
          incorrectKeystrokes: state.incorrectKeystrokes + 1,
          errorCharacter: action.character,
        };
      }
      const currentCharacter = state.currentCharacter + 1;
      return {
        ...state,
        currentCharacter,
        correctCharacters: state.correctCharacters + 1,
        totalKeystrokes,
        finished: currentCharacter >= state.content.length,
      };
    }
    case "BACKSPACE":
      if (!state.started || state.finished || !state.errorCharacter)
        return state;
      return { ...state, errorCharacter: null };
    case "RESET":
      return createTypingState(action.content ?? state.content);
    case "RESTORE": {
      const currentCharacter = Math.min(
        Math.max(0, action.currentCharacter),
        action.content.length,
      );
      return {
        content: action.content,
        currentCharacter,
        correctCharacters: currentCharacter,
        incorrectKeystrokes: Math.max(0, action.incorrectKeystrokes),
        totalKeystrokes: Math.max(
          currentCharacter,
          action.totalKeystrokes,
          action.incorrectKeystrokes,
        ),
        errorCharacter: null,
        started: true,
        finished: currentCharacter >= action.content.length,
      };
    }
    default:
      return state;
  }
}

export function getTypingMetrics(state: TypingState, elapsedMs: number) {
  return {
    wpm: calculateWpm(state.correctCharacters, elapsedMs),
    accuracy: calculateAccuracy(
      state.totalKeystrokes - state.incorrectKeystrokes,
      state.totalKeystrokes,
    ),
    progress: calculateProgress(state.currentCharacter, state.content.length),
  };
}
