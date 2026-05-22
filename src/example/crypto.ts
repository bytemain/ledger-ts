import { dirname, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { EAccountType, Ledger, utils } from "../index.js";

const currencies = utils.createCurrencies({ defaultDate: "2024-01-01" }, [
  "USD",
  ["USDT", { metadata: { name: "Tether USD" } }],
  ["BTC", { metadata: { name: "Bitcoin" } }],
] as const);

const Assets = utils.buildAccountHierarchy(
  currencies.USD,
  EAccountType.Assets,
  {
    Bank: {
      Checking: utils.createAccountNodeConfig({ open: "2024-01-01" }),
    },
    Exchange: {
      USDT: utils.createAccountNodeConfig({
        open: "2024-01-01",
        currency: currencies.USDT,
      }),
      BTC: utils.createAccountNodeConfig({
        open: "2024-01-01",
        currency: currencies.BTC,
      }),
    },
  }
);

const Expenses = utils.buildAccountHierarchy(
  currencies.USD,
  EAccountType.Expenses,
  {
    Exchange: {
      Fees: utils.createAccountNodeConfig({
        open: "2024-01-01",
        currency: currencies.USDT,
      }),
    },
  }
);

const Income = utils.buildAccountHierarchy(
  currencies.USD,
  EAccountType.Income,
  {
    Exchange: {
      TradingPnL: utils.createAccountNodeConfig({
        open: "2024-01-01",
        currency: currencies.USDT,
      }),
    },
  }
);

const ledger = new Ledger(
  [
    ...utils.flattenAccountHierarchy(Assets),
    ...utils.flattenAccountHierarchy(Expenses),
    ...utils.flattenAccountHierarchy(Income),
  ],
  Object.values(currencies)
);

ledger.option("operating_currency", "USD");
ledger.plugin("beancount.plugins.auto_accounts");

ledger.price({
  type: "price",
  date: new Date("2024-01-01"),
  currency: currencies.USDT,
  amount: { value: 1, currency: currencies.USD },
});

const { tr } = utils.transactionBuilder(ledger);

tr(
  "2024-02-01",
  "Deposit USDT to exchange",
  Assets.Exchange.USDT.posting(1000).asPrice(1, currencies.USD),
  Assets.Bank.Checking.posting(-1000)
);

tr(
  "2024-02-03",
  "Buy BTC with USDT",
  Assets.Exchange.BTC.posting(0.02).heldPrice(45000, currencies.USDT),
  Assets.Exchange.USDT.posting(-900)
);

tr(
  "2024-02-03",
  "Exchange trading fee",
  Expenses.Exchange.Fees.posting(2),
  Assets.Exchange.USDT.posting(-2)
);

ledger.price({
  type: "price",
  date: new Date("2024-03-01"),
  currency: currencies.BTC,
  amount: { value: 52000, currency: currencies.USD },
});

tr(
  "2024-03-10",
  "Sell BTC with automatic lot matching",
  Assets.Exchange.USDT.posting(258),
  Assets.Exchange.BTC.posting(-0.005).heldAuto().asPrice(
    52000,
    currencies.USDT
  ),
  Income.Exchange.TradingPnL.posting(-33)
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
