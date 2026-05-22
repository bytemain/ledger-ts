import { spawnSync } from "node:child_process";
import { utils } from "../src/index.js";

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

utils.startFava(beanPath);

function isExampleName(value: string): value is ExampleName {
  return value in examples;
}

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}
