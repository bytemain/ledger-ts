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
    'Transaction "Unbalanced lunch" on 2024-01-02: postings do not balance for currency USD (sum = 1)'
  );
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
