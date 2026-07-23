import { describe, expect, it } from "vitest";
import { signUpSchema } from "@/lib/validation/auth";
import { roomSettingsSchema } from "@/lib/validation/race";
import { typingTextSchema } from "@/lib/validation/admin";

describe("Zod input schemas", () => {
  it("normalizes and accepts a valid registration", () => {
    const result = signUpSchema.parse({
      email: "USER@example.com",
      username: "lane_7",
      displayName: "Lane",
      password: "password8",
      confirmPassword: "password8",
    });
    expect(result.email).toBe("user@example.com");
  });
  it("rejects invalid usernames and password confirmation", () =>
    expect(
      signUpSchema.safeParse({
        email: "x@example.com",
        username: "Lane!",
        displayName: "Lane",
        password: "password8",
        confirmPassword: "different",
      }).success,
    ).toBe(false));
  it("enforces room capacity", () =>
    expect(
      roomSettingsSchema.safeParse({
        name: "Room",
        maxPlayers: 9,
      }).success,
    ).toBe(false));
  it("enforces typing text length", () =>
    expect(
      typingTextSchema.safeParse({
        title: "Short",
        content: "too short",
        categoryId: "6f1b3bb3-5592-48fd-8737-10d234636a77",
        difficulty: "easy",
        status: "draft",
      }).success,
    ).toBe(false));
});
