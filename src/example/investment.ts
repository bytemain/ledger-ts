import { dirname, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { EAccountType, Ledger, utils } from "../index.js";

const currencies = utils.createCurrencies({ defaultDate: "2024-01-01" }, [
  "USD",
  ["VOO", { metadata: { name: "Vanguard S&P 500 ETF" } }],
] as const);

const Assets = utils.buildAccountHierarchy(
  currencies.USD,
  EAccountType.Assets,
  {
    Bank: {
      Checking: utils.createAccountNodeConfig({ open: "2024-01-01" }),
    },
    Broker: {
      Cash: utils.createAccountNodeConfig({ open: "2024-01-01" }),
      VOO: utils.createAccountNodeConfig({
        open: "2024-01-01",
        currency: currencies.VOO,
      }),
    },
  }
);

const Income = utils.buildAccountHierarchy(
  currencies.USD,
  EAccountType.Income,
  {
    Broker: {
      Dividends: utils.createAccountNodeConfig({ open: "2024-01-01" }),
      CapitalGains: utils.createAccountNodeConfig({ open: "2024-01-01" }),
    },
  }
);

const Expenses = utils.buildAccountHierarchy(
  currencies.USD,
  EAccountType.Expenses,
  {
    Broker: {
      Fees: utils.createAccountNodeConfig({ open: "2024-01-01" }),
    },
  }
);

const ledger = new Ledger(
  [
    ...utils.flattenAccountHierarchy(Assets),
    ...utils.flattenAccountHierarchy(Income),
    ...utils.flattenAccountHierarchy(Expenses),
  ],
  Object.values(currencies)
);

ledger.option("operating_currency", "USD");
ledger.plugin("beancount.plugins.auto_accounts");

const { tr } = utils.transactionBuilder(ledger);

tr(
  "2024-01-05",
  "Move cash to broker",
  Assets.Broker.Cash.posting(5000),
  Assets.Bank.Checking.posting(-5000)
);

tr(
  "2024-01-08",
  "Buy VOO",
  Assets.Broker.VOO.posting(10).heldPrice(420, currencies.USD),
  Assets.Broker.Cash.posting(-4200)
);

ledger.price({
  type: "price",
  date: new Date("2024-03-31"),
  currency: currencies.VOO,
  amount: { value: 455, currency: currencies.USD },
});

tr(
  "2024-04-02",
  "VOO quarterly dividend",
  Assets.Broker.Cash.posting(18.4),
  Income.Broker.Dividends.posting(-18.4)
);

tr(
  "2024-05-10",
  "Sell part of VOO with automatic lot matching",
  Assets.Broker.Cash.posting(1814),
  Expenses.Broker.Fees.posting(6),
  Assets.Broker.VOO.posting(-4).heldAuto().asPrice(455, currencies.USD),
  Income.Broker.CapitalGains.posting(-140)
);

const output = utils.beanCount.serializationLedger(ledger);
const outputArgIndex = process.argv.indexOf("--output");

if (outputArgIndex >= 0) {
  const outputPath = process.argv[outputArgIndex + 1];
  if (!outputPath) {
    throw new Error("Missing file path after --output");
  }
  const resolvedOutputPath = resolve(outputPath);
  mkdirSync(dirname(resolvedOutputPath), { recursive: true });
  writeFileSync(resolvedOutputPath, output);
}

console.log(output);
