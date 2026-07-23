import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoots = ["app", "components"];
const sourceExtension = /\.(?:ts|tsx|js|jsx)$/;
const nativeDialogCall = /\b(?:window\s*\.\s*)?(?:alert|confirm|prompt)\s*\(/;

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? collectSourceFiles(path)
      : sourceExtension.test(entry.name)
        ? [path]
        : [];
  });
}

describe("browser dialog contract", () => {
  it("uses styled application dialogs instead of native blocking dialogs", () => {
    const violations = sourceRoots
      .flatMap(collectSourceFiles)
      .filter((file) => nativeDialogCall.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect(violations).toEqual([]);
  });
});
