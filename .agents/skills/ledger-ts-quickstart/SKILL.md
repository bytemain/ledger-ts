---
name: ledger-ts-quickstart
description: 当用户想用 ledger-ts 新建、补全或评审个人记账脚本时使用。适用于初始化币种、账户树、Ledger、交易、校验以及导出 Beancount 的任务。
---

# ledger-ts 快速上手

使用这个 skill 时，优先用本仓库提供的 TypeScript API 生成账本，再输出 Beancount。

## 基本流程

1. 从 `@hamsterbase/ledger-ts` 导入 `EAccountType`、`Ledger`、`utils`。
2. 用 `utils.createCurrencies({ defaultDate }, [...])` 定义本位币和资产币种。
3. 用 `utils.buildAccountHierarchy(defaultCurrency, EAccountType.*, config)` 定义账户树。
4. 用 `utils.flattenAccountHierarchy(...)` 展平账户，传给 `new Ledger(accounts, currencies)`。
5. 用 `utils.transactionBuilder(ledger)` 里的 `tr`、`pending` 或 `trFactory` 追加交易。
6. 输出前调用 `ledger.validate()` 捕获不平衡交易、未开户账户、已关闭账户继续使用等问题。
7. 用 `utils.beanCount.serializationLedger(ledger)` 序列化为 Beancount。

## 最小模式

```ts
import { EAccountType, Ledger, utils } from "@hamsterbase/ledger-ts";

const currencies = utils.createCurrencies({ defaultDate: "2024-01-01" }, [
  "CNY",
] as const);

const Assets = utils.buildAccountHierarchy(
  currencies.CNY,
  EAccountType.Assets,
  {
    Bank: {
      Checking: utils.createAccountNodeConfig({ open: "2024-01-01" }),
    },
  }
);

const Expenses = utils.buildAccountHierarchy(
  currencies.CNY,
  EAccountType.Expenses,
  {
    Food: utils.createAccountNodeConfig({ open: "2024-01-01" }),
  }
);

const ledger = new Ledger(
  [
    ...utils.flattenAccountHierarchy(Assets),
    ...utils.flattenAccountHierarchy(Expenses),
  ],
  Object.values(currencies)
);

const { tr } = utils.transactionBuilder(ledger);

tr(
  "2024-01-02",
  "Lunch",
  Assets.Bank.Checking.posting(-35),
  Expenses.Food.posting(35)
);

ledger.validate();
console.log(utils.beanCount.serializationLedger(ledger));
```

## 在仓库内开发示例

- 仓库内示例从 `../src/index.js` 导入，发布后的使用者从 `@hamsterbase/ledger-ts` 导入。
- 可参考 `examples/beancount.ts`、`examples/investment.ts`、`examples/crypto.ts`。
- 验证命令：`npm run build` 和 `npm test`。

