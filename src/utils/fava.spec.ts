import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestLedger } from "../tests/create-test-ledger.js";

const { spawnSync } = vi.hoisted(() => ({
  spawnSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  spawnSync,
}));

import { startFava } from "./fava.js";

describe("startFava", () => {
  beforeEach(() => {
    spawnSync.mockReset();
  });

  it("starts Fava with the fava command when it is available", () => {
    spawnSync.mockReturnValue({ status: 0 });

    startFava("book.bean", { stdio: "ignore" });

    expect(spawnSync).toHaveBeenCalledWith("fava", ["--version"], {
      stdio: "ignore",
    });
    expect(spawnSync).toHaveBeenCalledWith("fava", ["book.bean"], {
      stdio: "ignore",
    });
  });

  it("falls back to Python and installs Fava when needed", () => {
    spawnSync.mockImplementation((command, args) => {
      if (command === "fava") return { status: 1 };
      if (command === "python3" && args[0] === "--version") {
        return { status: 0 };
      }
      if (
        command === "python3" &&
        args[1] === "fava" &&
        args[2] === "--version"
      ) {
        return { status: 1 };
      }
      return { status: 0 };
    });

    startFava("book.bean", { stdio: "ignore" });

    expect(spawnSync).toHaveBeenCalledWith(
      "python3",
      ["-m", "pip", "install", "--user", "fava"],
      { stdio: "ignore" }
    );
    expect(spawnSync).toHaveBeenCalledWith(
      "python3",
      ["-m", "fava", "book.bean"],
      { stdio: "ignore" }
    );
  });

  it("writes ledger input before starting Fava", () => {
    const outputPath = join(tmpdir(), `ledger-ts-fava-${Date.now()}.bean`);
    spawnSync.mockReturnValue({ status: 0 });

    try {
      startFava(createTestLedger().ledger, { outputPath, stdio: "ignore" });

      expect(existsSync(outputPath)).toBe(true);
      expect(spawnSync).toHaveBeenCalledWith("fava", [outputPath], {
        stdio: "ignore",
      });
    } finally {
      rmSync(outputPath, { force: true });
    }
  });
});
