import { spawnSync, type StdioOptions } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ILedger } from "../core/type.js";
import { beanCount } from "./beancount.js";

export type FavaInput = ILedger | string;

export interface FavaOptions {
  outputPath?: string;
  install?: boolean;
  stdio?: StdioOptions;
}

export function startFava(input: FavaInput, options: FavaOptions = {}) {
  const beanPath =
    typeof input === "string"
      ? input
      : writeLedger(input, options.outputPath ?? "tmp/fava/ledger.bean");

  if (commandWorks("fava", ["--version"])) {
    runCommand("fava", [beanPath], options.stdio);
    return;
  }

  const pythonCommand = ["python3", "python"].find((command) =>
    commandWorks(command, ["--version"])
  );

  if (!pythonCommand) {
    throw new Error(
      "Fava is not available and neither python3 nor python was found. Install Fava or Python, then try again."
    );
  }

  if (!commandWorks(pythonCommand, ["-m", "fava", "--version"])) {
    if (options.install === false) {
      throw new Error(
        `Fava is not installed for ${pythonCommand}. Install Fava, or call startFava with install enabled.`
      );
    }

    if (!commandWorks(pythonCommand, ["-m", "pip", "--version"])) {
      throw new Error(
        `${pythonCommand} is available, but pip is not. Install pip or Fava, then try again.`
      );
    }

    runCommand(
      pythonCommand,
      ["-m", "pip", "install", "--user", "fava"],
      options.stdio
    );
  }

  runCommand(pythonCommand, ["-m", "fava", beanPath], options.stdio);
}

function writeLedger(ledger: ILedger, outputPath: string) {
  const resolvedOutputPath = resolve(outputPath);
  mkdirSync(dirname(resolvedOutputPath), { recursive: true });
  writeFileSync(resolvedOutputPath, beanCount.serializationLedger(ledger));
  return resolvedOutputPath;
}

function commandWorks(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
  });

  return result.status === 0;
}

function runCommand(
  command: string,
  args: string[],
  stdio: StdioOptions = "inherit"
) {
  const result = spawnSync(command, args, {
    stdio,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}
