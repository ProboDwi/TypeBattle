import { createRef } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TypingCapture } from "@/components/game/typing-capture";

afterEach(cleanup);

function renderCapture(active = true) {
  const onType = vi.fn();
  const onBackspace = vi.fn();
  const onBlockedInput = vi.fn();

  render(
    <div className="relative">
      <TypingCapture
        inputRef={createRef<HTMLTextAreaElement>()}
        active={active}
        label="Input uji"
        onType={onType}
        onBackspace={onBackspace}
        onBlockedInput={onBlockedInput}
      />
    </div>,
  );

  return {
    input: screen.getByLabelText("Input uji") as HTMLTextAreaElement,
    onType,
    onBackspace,
    onBlockedInput,
  };
}

describe("TypingCapture", () => {
  it("mengonsumsi input virtual keyboard lalu membersihkan textarea", () => {
    const { input, onType } = renderCapture();

    fireEvent.input(input, {
      target: { value: "a" },
      inputType: "insertText",
      data: "a",
    });

    expect(onType).toHaveBeenCalledWith("a");
    expect(input).toHaveValue("");
  });

  it("mengabaikan input sebelum permainan aktif", () => {
    const { input, onType } = renderCapture(false);

    fireEvent.input(input, {
      target: { value: "a" },
      inputType: "insertText",
      data: "a",
    });

    expect(onType).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });

  it("meneruskan Backspace dari keyboard fisik", () => {
    const { input, onBackspace } = renderCapture();

    fireEvent.keyDown(input, { key: "Backspace" });

    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it("meneruskan penghapusan dari keyboard virtual", () => {
    const { input, onBackspace } = renderCapture();

    fireEvent.input(input, {
      target: { value: "" },
      inputType: "deleteContentBackward",
    });

    expect(onBackspace).toHaveBeenCalledTimes(1);
  });

  it("menunggu komposisi mobile selesai sebelum mengetik", async () => {
    const { input, onType } = renderCapture();

    fireEvent.compositionStart(input);
    fireEvent.input(input, {
      target: { value: "ka" },
      inputType: "insertCompositionText",
      data: "ka",
      isComposing: true,
    });
    expect(onType).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input, { data: "ka" });

    await waitFor(() => expect(onType).toHaveBeenCalledWith("ka"));
    expect(input).toHaveValue("");
  });

  it("memblokir paste", () => {
    const { input, onType, onBlockedInput } = renderCapture();

    fireEvent.paste(input, {
      clipboardData: { getData: () => "tempel" },
    });

    expect(onType).not.toHaveBeenCalled();
    expect(onBlockedInput).toHaveBeenCalledWith("paste");
  });
});
