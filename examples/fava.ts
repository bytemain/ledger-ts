import { spawnSync } from "node:child_process";

const examples = {
  investment: "tmp/fava/investment.bean",
  crypto: "tmp/fava/crypto.bean",
} as const;

type ExampleName = keyof typeof examples;

const requestedExample = process.argv[2] ?? "investment";

if (!isExampleName(requestedExample)) {
  throw new Error(
    `Unknown Fava example "${requestedExample}". Expected one of: ${Object.keys(
      examples
    ).join(", ")}`
  );
}

const beanPath = examples[requestedExample];

runCommand("npm", [
  "run",
  `example:${requestedExample}`,
  "--",
  "--output",
  beanPath,
]);

runFava(beanPath);

function isExampleName(value: string): value is ExampleName {
  return value in examples;
}

function runFava(beanPath: string) {
  if (commandWorks("fava", ["--version"])) {
    runCommand("fava", [beanPath]);
    return;
  }

  const pythonCommand = ["python3", "python"].find((command) =>
    commandWorks(command, ["--version"])
  );

  if (!pythonCommand) {
    throw new Error(
      "Fava is not available and neither python3 nor python was found. Install Fava or Python, then run this command again."
    );
  }

  if (!commandWorks(pythonCommand, ["-m", "fava", "--version"])) {
    if (!commandWorks(pythonCommand, ["-m", "pip", "--version"])) {
      throw new Error(
        `${pythonCommand} is available, but pip is not. Install pip or Fava, then run this command again.`
      );
    }

    runCommand(pythonCommand, ["-m", "pip", "install", "--user", "fava"]);
  }

  runCommand(pythonCommand, ["-m", "fava", beanPath]);
}

function commandWorks(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  return result.status === 0;
}

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}
