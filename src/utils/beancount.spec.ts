import { expect, it } from "vitest";
import { Currency } from "../core/currency.js";
import { Account, EAccountType, Ledger } from "../index.js";
import { assertSnapshot } from "../tests/snapshot.js";
import { beanCount } from "./beancount.js";
import { mergeTransactions, transactionBuilder } from "./transaction.js";

it("test serializationBalances", () => {
  const CNY = Currency.create("2017-01-01", "CNY");
  const USD = Currency.create("2017-01-01", "USD");
  const account = new Account({
    namespace: ["Cash"],
    type: EAccountType.Assets,
    currencies: [CNY],
    openDate: new Date("2017-01-01"),
  });
  const OpenBalance = new Account({
    namespace: ["OpenBalance"],
    type: EAccountType.Equity,
    currencies: [CNY],
    openDate: new Date("2017-01-01"),
  });
  const ledger = new Ledger([account, OpenBalance], [CNY]);
  ledger.balance(account.balance("2017-01-07", 10));
  ledger.balance(account.balance("2017-01-06", 10).padAccount(OpenBalance));
  assertSnapshot(ledger, "balance");
});

it("serializes extended beancount directives and transaction annotations", () => {
  const USD = Currency.create("2024-01-01", "USD");
  const IBM = Currency.create("2024-01-01", "IBM");
  const cash = new Account({
    namespace: ["Cash"],
    type: EAccountType.Assets,
    currencies: [USD],
    openDate: new Date("2024-01-01"),
  });
  const stock = new Account({
    namespace: ["Broker", "IBM"],
    type: EAccountType.Assets,
    currencies: [IBM],
    openDate: new Date("2024-01-01"),
  });
  const fees = new Account({
    namespace: ["Fees"],
    type: EAccountType.Expenses,
    currencies: [USD],
    openDate: new Date("2024-01-01"),
  });
  const ledger = new Ledger([cash, stock, fees], [USD, IBM]);
  const { pending, trFactory } = transactionBuilder(ledger);

  ledger.option("operating_currency", "USD");
  ledger.plugin("beancount.plugins.auto_accounts");
  ledger.include("prices.bean");
  ledger.price({
    type: "price",
    date: new Date("2024-01-02"),
    currency: IBM,
    amount: {
      value: 100,
      currency: USD,
    },
  });
  ledger.note({
    type: "note",
    date: new Date("2024-01-03"),
    account: cash,
    comment: "Opened account",
  });
  ledger.document({
    type: "document",
    date: new Date("2024-01-04"),
    account: cash,
    path: "receipts/ibm.pdf",
  });

  pending(
    "2024-02-01",
    "Sell IBM",
    stock.posting(-10).heldAuto().asPrice(100, USD),
    cash.posting(1000)
  );

  const taggedTr = trFactory(
    mergeTransactions({ tags: ["tax"], links: ["receipt-2024-001"] })
  );
  taggedTr(
    "2024-02-02",
    "Tagged fee",
    fees.posting(10),
    cash.posting(-10)
  );

  const output = beanCount.serializationLedger(ledger);

  expect(output).toContain('option "operating_currency" "USD"');
  expect(output).toContain('plugin "beancount.plugins.auto_accounts"');
  expect(output).toContain('include "prices.bean"');
  expect(output).toMatch(/2024-01-02 price IBM\s+100 USD/);
  expect(output).toContain('2024-01-03 note Assets:Cash "Opened account"');
  expect(output).toContain(
    '2024-01-04 document Assets:Cash "receipts/ibm.pdf"'
  );
  expect(output).toContain('2024-02-01 ! "Sell IBM"');
  expect(output).toContain('-10 IBM {} @ 100 USD');
  expect(output).toContain(
    '2024-02-02 * "Tagged fee" #tax ^receipt-2024-001'
  );
});
