"use client";

import { useRef, type RefObject } from "react";

interface TypingCaptureProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  active: boolean;
  label: string;
  autoFocus?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
  onType: (value: string) => void;
  onBackspace: () => void;
  onBlockedInput?: (kind: string) => void;
}

function isBlockedInsert(inputType: string) {
  return (
    inputType === "insertFromPaste" ||
    inputType === "insertFromDrop" ||
    inputType === "insertFromYank"
  );
}

/**
 * A real, full-size textarea is kept over the rendered target text so a direct
 * tap can open mobile keyboards. Its value is consumed and cleared after each
 * input event; the visible characters remain owned by the typing reducer.
 */
export function TypingCapture({
  inputRef,
  active,
  label,
  autoFocus = false,
  className = "absolute inset-0 z-[1] h-full w-full resize-none overflow-hidden bg-transparent text-transparent caret-transparent outline-none",
  id,
  placeholder,
  onType,
  onBackspace,
  onBlockedInput,
}: TypingCaptureProps) {
  const composingRef = useRef(false);

  function consumeValue(target: HTMLTextAreaElement) {
    const value = target.value;
    target.value = "";
    return value;
  }

  return (
    <textarea
      ref={inputRef}
      id={id}
      defaultValue=""
      data-typing-capture
      className={className}
      aria-label={label}
      autoFocus={autoFocus}
      placeholder={placeholder}
      autoCapitalize="none"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      inputMode="text"
      onKeyDown={(event) => {
        if (event.key !== "Backspace") return;
        event.preventDefault();
        if (active) onBackspace();
      }}
      onBeforeInput={(event) => {
        const native = event.nativeEvent as InputEvent;
        const inputType = native.inputType ?? "";
        if (!active) {
          event.preventDefault();
          event.currentTarget.value = "";
          return;
        }
        if (inputType.startsWith("delete")) {
          event.preventDefault();
          onBackspace();
          return;
        }
        if (isBlockedInsert(inputType)) {
          event.preventDefault();
          event.currentTarget.value = "";
          onBlockedInput?.(inputType);
        }
      }}
      onInput={(event) => {
        const native = event.nativeEvent as InputEvent;
        const inputType = native.inputType ?? "";
        if (composingRef.current || native.isComposing) return;

        const value = consumeValue(event.currentTarget);
        if (!active) return;
        if (inputType.startsWith("delete")) {
          onBackspace();
          return;
        }
        if (!value) return;
        if (isBlockedInsert(inputType)) {
          onBlockedInput?.(inputType);
          return;
        }
        if (inputType.startsWith("insert") || !inputType) {
          onType(value);
        } else {
          onBlockedInput?.(inputType);
        }
      }}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(event) => {
        composingRef.current = false;
        const target = event.currentTarget;

        // Modern browsers emit one final input event after compositionend.
        // The microtask is a fallback for mobile keyboards that do not.
        queueMicrotask(() => {
          const value = consumeValue(target);
          if (active && value) onType(value);
        });
      }}
      onPaste={(event) => {
        event.preventDefault();
        event.currentTarget.value = "";
        onBlockedInput?.("paste");
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.currentTarget.value = "";
        onBlockedInput?.("drop");
      }}
    />
  );
}
