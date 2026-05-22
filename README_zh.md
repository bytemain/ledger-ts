# ledger-ts 中文文档

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
