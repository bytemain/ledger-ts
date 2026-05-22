import { expect, it } from "vitest";
import { Account } from "./account.js";
import { Currency } from "./currency.js";
import { Ledger } from "./ledger.js";
import { EAccountType } from "./type.js";

const USD = Currency.create("2024-01-01", "USD");

function createAccount(
  namespace: string[],
  type: EAccountType,
  openDate = "2024-01-01",
  closeDate?: string
) {
  return new Account({
    namespace,
    type,
    currencies: [USD],
    openDate: new Date(openDate),
    closeDate: closeDate ? new Date(closeDate) : undefined,
  });
}

it("validates balanced transactions", () => {
  const cash = createAccount(["Cash"], EAccountType.Assets);
  const food = createAccount(["Food"], EAccountType.Expenses);
  const ledger = new Ledger([cash, food], [USD]);

  ledger.transaction({
    type: "transaction",
    date: new Date("2024-01-02"),
    flag: "*",
    narration: "Lunch",
    postings: [food.posting(10), cash.posting(-10)],
  });

  expect(() => ledger.validate()).not.toThrow();
});

it("rejects unbalanced transactions", () => {
  const cash = createAccount(["Cash"], EAccountType.Assets);
  const food = createAccount(["Food"], EAccountType.Expenses);
  const ledger = new Ledger([cash, food], [USD]);

  ledger.transaction({
    type: "transaction",
    date: new Date("2024-01-02"),
    flag: "*",
    narration: "Unbalanced lunch",
    postings: [food.posting(10), cash.posting(-9)],
  });

  expect(() => ledger.validate()).toThrow(
    'Transaction "Unbalanced lunch" on 2024-01-02: postings do not balance for currency USD (sum = 1, tolerance = 0)'
  );
});

it("allows a single posting without amount to be inferred", () => {
  const cash = createAccount(["Cash"], EAccountType.Assets);
  const food = createAccount(["Food"], EAccountType.Expenses);
  const ledger = new Ledger([cash, food], [USD]);

  ledger.transaction({
    type: "transaction",
    date: new Date("2024-01-02"),
    flag: "*",
    narration: "Lunch",
    postings: [food.posting(10), cash.posting()],
  });

  expect(() => ledger.validate()).not.toThrow();
});

it("rejects multiple postings without amount", () => {
  const cash = createAccount(["Cash"], EAccountType.Assets);
  const food = createAccount(["Food"], EAccountType.Expenses);
  const ledger = new Ledger([cash, food], [USD]);

  ledger.transaction({
    type: "transaction",
    date: new Date("2024-01-02"),
    flag: "*",
    narration: "Ambiguous lunch",
    postings: [food.posting(), cash.posting()],
  });

  expect(() => ledger.validate()).toThrow(
    'Transaction "Ambiguous lunch" on 2024-01-02: only one posting can omit amount'
  );
});

it("supports tolerance when validating balance", () => {
  const cash = createAccount(["Cash"], EAccountType.Assets);
  const food = createAccount(["Food"], EAccountType.Expenses);
  const ledger = new Ledger([cash, food], [USD]);

  ledger.transaction({
    type: "transaction",
    date: new Date("2024-01-02"),
    flag: "*",
    narration: "Rounded lunch",
    postings: [food.posting(10), cash.posting(-9.999)],
  });

  expect(() => ledger.validate({ tolerance: 0.01 })).not.toThrow();
});

it("skips simple unit balance for price annotated postings", () => {
  const cash = createAccount(["Cash"], EAccountType.Assets);
  const stock = createAccount(["Broker", "IBM"], EAccountType.Assets);
  const ledger = new Ledger([cash, stock], [USD]);

  ledger.transaction({
    type: "transaction",
    date: new Date("2024-01-02"),
    flag: "*",
    narration: "Sell stock",
    postings: [stock.posting(-10).heldAuto().asPrice(100, USD), cash.posting(1000)],
  });

  expect(() => ledger.validate()).not.toThrow();
});

it("rejects transactions before account open date", () => {
  const cash = createAccount(["Cash"], EAccountType.Assets, "2024-01-03");
  const food = createAccount(["Food"], EAccountType.Expenses);
  const ledger = new Ledger([cash, food], [USD]);

  ledger.transaction({
    type: "transaction",
    date: new Date("2024-01-02"),
    flag: "*",
    narration: "Too early",
    postings: [food.posting(10), cash.posting(-10)],
  });

  expect(() => ledger.validate()).toThrow(
    'Transaction "Too early" on 2024-01-02: account "Assets:Cash" is not open until 2024-01-03'
  );
});

it("rejects transactions on or after account close date", () => {
  const cash = createAccount(
    ["Cash"],
    EAccountType.Assets,
    "2024-01-01",
    "2024-01-03"
  );
  const food = createAccount(["Food"], EAccountType.Expenses);
  const ledger = new Ledger([cash, food], [USD]);

  ledger.transaction({
    type: "transaction",
    date: new Date("2024-01-03"),
    flag: "*",
    narration: "Too late",
    postings: [food.posting(10), cash.posting(-10)],
  });

  expect(() => ledger.validate()).toThrow(
    'Transaction "Too late" on 2024-01-03: account "Assets:Cash" was closed on 2024-01-03'
  );
});

it("includes payee in validation errors", () => {
  const cash = createAccount(["Cash"], EAccountType.Assets);
  const food = createAccount(["Food"], EAccountType.Expenses);
  const ledger = new Ledger([cash, food], [USD]);

  ledger.transaction({
    type: "transaction",
    date: new Date("2024-01-02"),
    flag: "*",
    payee: "Cafe",
    narration: "Lunch",
    postings: [food.posting(10), cash.posting(-9)],
  });

  expect(() => ledger.validate()).toThrow(
    'Transaction "Cafe" "Lunch" on 2024-01-02: postings do not balance for currency USD (sum = 1, tolerance = 0)'
  );
});
