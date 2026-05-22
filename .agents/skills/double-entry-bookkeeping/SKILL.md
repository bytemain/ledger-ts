---
name: double-entry-bookkeeping
description: 当用户要求设计、检查或修复记账规则、复式记账分录、账户分类、余额校验、应收应付或收入费用处理时使用。重点保证每笔交易在每种币种下借贷平衡。
---

# 复式记账建模

使用这个 skill 时，把业务事件转换成清晰、可验证的复式记账交易。

## 账户分类

- `Assets`：现金、银行、券商、加密货币、应收款、预付资产。
- `Liabilities`：信用卡、贷款、应付款、递延收入。
- `Income`：工资、利息、分红、资本利得、退款收益。
- `Expenses`：餐饮、交通、手续费、税费、损失、摊销费用。
- `Equity`：期初权益、所有者投入、留存收益。

## 分录规则

1. 每笔交易的 postings 必须按币种合计为 0。
2. 资产增加为正数，资产减少为负数。
3. 费用增加通常为正数，收入增加通常为负数。
4. 负债增加通常为负数，负债减少通常为正数。
5. 跨币种交易要显式使用 `.asPrice(...)` 或 `.asCost(...)` 标注换算价格。
6. 投资或库存 lot 要使用 `.heldPrice(...)`、`.heldCost(...)` 或 `.heldAuto()`。
7. 不确定、待清算的流水可先用 `pending(...)` 输出 `!` 状态。

## ledger-ts 检查点

- 账户开户日必须早于或等于交易日。
- 已关闭账户不能在关闭日当天或之后继续入账。
- 对每个待输出账本调用 `ledger.validate()`。
- 需要复用标签、链接或默认元数据时，用 `utils.transactionBuilder(ledger).trFactory(...)` 和 `utils.mergeTransactions(...)`。

## 常见场景

- 日常消费：`Assets:Bank` 减少，`Expenses:*` 增加。
- 工资收入：`Assets:Bank` 增加，`Income:Salary` 增加（金额为负）。
- 信用卡消费：`Liabilities:CreditCard` 增加（金额为负），`Expenses:*` 增加。
- 还信用卡：`Assets:Bank` 减少，`Liabilities:CreditCard` 减少（金额为正）。
- 预付费用：先入 `Assets:Prepaid`，之后用 `utils.prepaid(...)` 分期转入费用。
- 待结算项目：先把带 `settle` metadata 的 posting 转入结算账户，再用 `utils.settle(...)` 生成结算交易。
