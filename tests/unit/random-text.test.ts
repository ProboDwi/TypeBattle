import { describe, expect, it } from "vitest";
import { pickRandomAvoidingPrevious } from "@/lib/typing/random-text";

const texts = [
  { id: "first", title: "Pertama" },
  { id: "second", title: "Kedua" },
  { id: "third", title: "Ketiga" },
];

describe("pickRandomAvoidingPrevious", () => {
  it("removes the previous text while alternatives exist", () => {
    expect(pickRandomAvoidingPrevious(texts, "first", () => 0)?.id).toBe(
      "second",
    );
    expect(pickRandomAvoidingPrevious(texts, "second", () => 0.99)?.id).toBe(
      "third",
    );
  });

  it("does not repeat when no alternative exists", () => {
    expect(
      pickRandomAvoidingPrevious([{ id: "only" }], "only", () => 0),
    ).toBeNull();
  });

  it("returns null for an empty pool", () => {
    expect(pickRandomAvoidingPrevious([], "missing")).toBeNull();
  });
});
