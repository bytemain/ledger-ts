# ledger-ts

ledger-ts is a double-entry accounting tool written in TypeScript. Its goal is to use TypeScript for writing personal financial records and then generate formats required by other accounting tools.

Currently, it only supports the beancount format. Therefore, it is recommended to learn beancount's syntax and rules before using it.

## Background

When using beancount for accounting on a daily basis, I encountered some troubles. For instance, code completion is weak and bill reuse completely depends on copy and pasting.

So, I created ledger-ts. To put it in an analogy, ledger-ts is a more advanced accounting language that can be "compiled" (executed) into beancount, which serves as the underlying "assembly language."

## Advantages

- Allows the use of any IDE to write records enjoying strong code completion.
- Supports using the powerful TypeScript type system to check the correctness of records.
- Freely use TypeScript to write auxiliary functions to generate records.
- Can output records to formats required by other accounting tools.

## Installation

```bash
npm install @hamsterbase/ledger-ts
```

## Example

```ts
import { EAccountType, Ledger, utils } from "@hamsterbase/ledger-ts";

// setup currencies
const currencies = utils.createCurrencies(
  {
    defaultDate: "2021-01-01",
  },
  ["USD", "IBM"] as const
);

// setup accounts
const assets = utils.buildAccountHierarchy(
  currencies.USD,
  EAccountType.Assets,
  {
    US: {
      ETrade: {
        Cash: utils.createAccountNodeConfig({
          open: "2017-01-01",
        }),
        IBM: utils.createAccountNodeConfig({
          open: "2017-01-01",
          currency: currencies.IBM,
        }),
      },
    },
  }
);

// create a ledger and add accounts, currencies
const ledger = new Ledger(
  [utils.flattenAccountHierarchy(assets)].flat(),
  Object.values(currencies)
);
const { tr } = utils.transactionBuilder(ledger);

// add a transaction
tr(
  "2024-02-16",
  "Buying some IBM",
  assets.US.ETrade.IBM.posting(100).heldPrice(160, currencies.USD),
  assets.US.ETrade.Cash.posting(-16000)
);

// output the ledger
console.log(utils.beanCount.serializationLedger(ledger));
```

```
2021-01-01 commodity USD

2021-01-01 commodity IBM

2017-01-01 open Assets:US:ETrade:Cash USD

2017-01-01 open Assets:US:ETrade:IBM IBM

2024-02-16 * "Buying some IBM"
  Assets:US:ETrade:IBM 100 IBM { 160 USD }
  Assets:US:ETrade:Cash -16000 USD
```


## Beancount feature guide

ledger-ts is designed to let you write records with TypeScript APIs while still producing readable Beancount output. The examples below show each ledger-ts feature next to the raw Beancount syntax it generates, so you can compare it with normal `.bean` files.

### Directives

| Beancount feature | ledger-ts API | Raw Beancount output |
| --- | --- | --- |
| Option | `ledger.option("operating_currency", "USD")` | `option "operating_currency" "USD"` |
| Plugin | `ledger.plugin("beancount.plugins.auto_accounts")` | `plugin "beancount.plugins.auto_accounts"` |
| Include | `ledger.include("prices.bean")` | `include "prices.bean"` |
| Commodity metadata | `new Currency({ date: new Date("2024-01-01"), symbol: "BTC", metadata: { name: "Bitcoin" } })` | `2024-01-01 commodity BTC` plus indented metadata |
| Price | `ledger.price({ type: "price", date, currency: BTC, amount: { value: 50000, currency: USD } })` | `2024-01-01 price BTC 50000 USD` |
| Note | `ledger.note({ type: "note", date, account, comment: "Opened account" })` | `2024-01-01 note Assets:Bank "Opened account"` |
| Document | `ledger.document({ type: "document", date, account, path: "receipts/a.pdf" })` | `2024-01-01 document Assets:Bank "receipts/a.pdf"` |

```ts
ledger.option("operating_currency", "USD");
ledger.plugin("beancount.plugins.auto_accounts");
ledger.include("prices.bean");

ledger.price({
  type: "price",
  date: new Date("2024-01-01"),
  currency: currencies.BTC,
  amount: { value: 50000, currency: currencies.USD },
});
```

```beancount
option "operating_currency" "USD"
plugin "beancount.plugins.auto_accounts"
include "prices.bean"

2024-01-01 price BTC 50000 USD
```

### Transactions, flags, tags, and links

Confirmed transactions use `*` by default. Pending transactions can be written with the `pending` helper. Tags and links are represented as arrays and are serialized after the narration.

```ts
const { tr, pending, trFactory } = utils.transactionBuilder(ledger);

tr(
  "2024-02-16",
  "Buying some IBM",
  assets.US.ETrade.IBM.posting(100).heldPrice(160, currencies.USD),
  assets.US.ETrade.Cash.posting(-16000)
);

pending(
  "2024-02-17",
  "Pending bank transfer",
  assets.US.ETrade.Cash.posting(100),
  assets.Transfer.posting(-100)
);

const taxTr = trFactory(
  utils.mergeTransactions({ tags: ["tax"], links: ["receipt-2024-001"] })
);

taxTr(
  "2024-02-18",
  "Tax payment",
  expenses.Tax.posting(100),
  assets.US.ETrade.Cash.posting(-100)
);
```

```beancount
2024-02-16 * "Buying some IBM"
  Assets:US:ETrade:IBM    100 IBM { 160 USD }
  Assets:US:ETrade:Cash   -16000 USD

2024-02-17 ! "Pending bank transfer"
  Assets:US:ETrade:Cash   100 USD
  Assets:Transfer        -100 USD

2024-02-18 * "Tax payment" #tax ^receipt-2024-001
  Expenses:Tax            100 USD
  Assets:US:ETrade:Cash  -100 USD
```

### Cost, price, and lot syntax

ledger-ts supports the common Beancount posting annotations used for currency conversion and investment lots.

| ledger-ts | Raw Beancount meaning |
| --- | --- |
| `.heldPrice(160, USD)` | `100 IBM { 160 USD }` unit cost / lot price |
| `.heldCost(16000, USD)` | `100 IBM { # 16000 USD }` total lot cost |
| `.heldAuto()` | `100 IBM {}` let Beancount match an existing lot |
| `.asPrice(160, USD)` | `100 IBM @ 160 USD` per-unit conversion price |
| `.asCost(16000, USD)` | `100 IBM @@ 16000 USD` total conversion cost |

```ts
tr(
  "2024-03-01",
  "Sell IBM with automatic lot matching",
  assets.US.ETrade.IBM.posting(-10).heldAuto().asPrice(180, currencies.USD),
  assets.US.ETrade.Cash.posting(1800)
);
```

```beancount
2024-03-01 * "Sell IBM with automatic lot matching"
  Assets:US:ETrade:Cash   1800 USD
  Assets:US:ETrade:IBM     -10 IBM {} @ 180 USD
```

### Validation

`ledger.validate()` performs lightweight checks before serialization:

- every transaction must balance to zero per currency;
- each posting account must be open on the transaction date;
- accounts with a `closeDate` cannot be used on or after that date.

```ts
ledger.validate();
console.log(utils.beanCount.serializationLedger(ledger));
```

This does not replace Beancount's own validation. It is intended to catch common mistakes earlier while writing TypeScript.

## Beancount 功能指南（中文）

ledger-ts 让你可以用 TypeScript API 编写账本，同时仍然生成可读的 Beancount 文本。下面的示例把 ledger-ts 写法和原始 Beancount 语法放在一起，方便你和普通 `.bean` 文件进行对比。

### 指令

| Beancount 功能 | ledger-ts API | 原始 Beancount 输出 |
| --- | --- | --- |
| Option | `ledger.option("operating_currency", "USD")` | `option "operating_currency" "USD"` |
| Plugin | `ledger.plugin("beancount.plugins.auto_accounts")` | `plugin "beancount.plugins.auto_accounts"` |
| Include | `ledger.include("prices.bean")` | `include "prices.bean"` |
| Commodity metadata | `new Currency({ date: new Date("2024-01-01"), symbol: "BTC", metadata: { name: "Bitcoin" } })` | `2024-01-01 commodity BTC` 加缩进 metadata |
| Price | `ledger.price({ type: "price", date, currency: BTC, amount: { value: 50000, currency: USD } })` | `2024-01-01 price BTC 50000 USD` |
| Note | `ledger.note({ type: "note", date, account, comment: "Opened account" })` | `2024-01-01 note Assets:Bank "Opened account"` |
| Document | `ledger.document({ type: "document", date, account, path: "receipts/a.pdf" })` | `2024-01-01 document Assets:Bank "receipts/a.pdf"` |

```ts
ledger.option("operating_currency", "USD");
ledger.plugin("beancount.plugins.auto_accounts");
ledger.include("prices.bean");

ledger.price({
  type: "price",
  date: new Date("2024-01-01"),
  currency: currencies.BTC,
  amount: { value: 50000, currency: currencies.USD },
});
```

```beancount
option "operating_currency" "USD"
plugin "beancount.plugins.auto_accounts"
include "prices.bean"

2024-01-01 price BTC 50000 USD
```

### 交易、状态、标签和链接

普通交易默认使用 `*`。如果要输出待确认交易，可以使用 `pending`。Tags 和 links 使用数组表示，并会序列化到交易标题行末尾。

```ts
const { tr, pending, trFactory } = utils.transactionBuilder(ledger);

tr(
  "2024-02-16",
  "Buying some IBM",
  assets.US.ETrade.IBM.posting(100).heldPrice(160, currencies.USD),
  assets.US.ETrade.Cash.posting(-16000)
);

pending(
  "2024-02-17",
  "Pending bank transfer",
  assets.US.ETrade.Cash.posting(100),
  assets.Transfer.posting(-100)
);

const taxTr = trFactory(
  utils.mergeTransactions({ tags: ["tax"], links: ["receipt-2024-001"] })
);

taxTr(
  "2024-02-18",
  "Tax payment",
  expenses.Tax.posting(100),
  assets.US.ETrade.Cash.posting(-100)
);
```

```beancount
2024-02-16 * "Buying some IBM"
  Assets:US:ETrade:IBM    100 IBM { 160 USD }
  Assets:US:ETrade:Cash   -16000 USD

2024-02-17 ! "Pending bank transfer"
  Assets:US:ETrade:Cash   100 USD
  Assets:Transfer        -100 USD

2024-02-18 * "Tax payment" #tax ^receipt-2024-001
  Expenses:Tax            100 USD
  Assets:US:ETrade:Cash  -100 USD
```

### 成本、价格和 lot 语法

ledger-ts 支持 Beancount 中常用的外汇换算和投资 lot 标注语法。

| ledger-ts | 原始 Beancount 含义 |
| --- | --- |
| `.heldPrice(160, USD)` | `100 IBM { 160 USD }` 单位持仓成本 / lot price |
| `.heldCost(16000, USD)` | `100 IBM { # 16000 USD }` 总持仓成本 |
| `.heldAuto()` | `100 IBM {}` 让 Beancount 自动匹配已有 lot |
| `.asPrice(160, USD)` | `100 IBM @ 160 USD` 按单位价格换算 |
| `.asCost(16000, USD)` | `100 IBM @@ 16000 USD` 按总价换算 |

```ts
tr(
  "2024-03-01",
  "Sell IBM with automatic lot matching",
  assets.US.ETrade.IBM.posting(-10).heldAuto().asPrice(180, currencies.USD),
  assets.US.ETrade.Cash.posting(1800)
);
```

```beancount
2024-03-01 * "Sell IBM with automatic lot matching"
  Assets:US:ETrade:Cash   1800 USD
  Assets:US:ETrade:IBM     -10 IBM {} @ 180 USD
```

### 校验

`ledger.validate()` 会在序列化前执行轻量校验：

- 每笔交易在每种货币下都必须平衡；
- 每个 posting 使用的账户必须已经在交易日期开户；
- 如果账户设置了 `closeDate`，则不能在关闭日当天或之后继续使用。

```ts
ledger.validate();
console.log(utils.beanCount.serializationLedger(ledger));
```

这不能替代 Beancount 自身的校验，只是用于在编写 TypeScript 时更早发现常见错误。

## License

MIT
