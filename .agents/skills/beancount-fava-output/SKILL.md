---
name: beancount-fava-output
description: 当用户需要把 ledger-ts 账本导出为 Beancount、接入 Fava、添加 Beancount option/plugin/include/price/note/document，或排查生成结果时使用。
---

# Beancount 与 Fava 输出

使用这个 skill 时，保持 ledger-ts 代码为主要账本来源，把 Beancount 作为可读、可校验、可接入工具链的输出格式。

## 输出前准备

1. 给账本设置必要的 Beancount 指令：
   - `ledger.option("operating_currency", "CNY")`
   - `ledger.plugin("beancount.plugins.auto_accounts")`
   - `ledger.include("prices.bean")`
2. 对证券、基金、加密货币等添加 `ledger.price(...)` 价格指令。
3. 对收据和备注使用 `ledger.document(...)` 与 `ledger.note(...)`。
4. 输出前执行 `ledger.validate()`。

## 序列化

```ts
ledger.validate();
const output = utils.beanCount.serializationLedger(ledger);
console.log(output);
```

如果要写入文件，先确保目标目录存在，再写入序列化结果。仓库示例里 `examples/investment.ts` 和 `examples/crypto.ts` 支持：

```bash
npm run example:investment -- --output tmp/fava/investment.bean
npm run example:crypto -- --output tmp/fava/crypto.bean
```

## Fava

- 命令行可运行 `npm run example:fava` 打开投资示例。
- 可运行 `npm run example:fava:crypto` 打开加密货币示例。
- 代码里可调用 `utils.startFava(ledger)`。
- `startFava` 会依次尝试 `fava`、`python3`、`python`；如果 Python 可用但缺少 Fava，会尝试通过 pip 安装。

## 排查生成结果

- 如果 Beancount 输出缺少账户，检查账户是否已加入 `new Ledger([...accounts], currencies)`。
- 如果币种不对，检查 `createAccountNodeConfig({ currency })` 或 `account.posting(value, currency)`。
- 如果交易不平衡，优先按币种分别合计 postings。
- 如果投资 lot 不符合预期，检查 `.heldPrice(...)`、`.heldCost(...)`、`.heldAuto()` 与 `.asPrice(...)`、`.asCost(...)` 的组合。
