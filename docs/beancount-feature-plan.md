# Beancount 特性实现路径与后续计划

本文档沉淀本轮 Beancount 能力扩展的分析、实现路径、已完成计划和后续可继续推进的事项。

## 背景

ledger-ts 的定位是用 TypeScript API 编写账本，再序列化为 Beancount 文本。本轮扩展重点补齐常见 Beancount 工作流：

- 文件级指令：`option`、`plugin`、`include`
- 投资和价格：`price`、持仓 lot、自动 lot 匹配
- 账户事件：`note`、`document`
- 交易标记：`*`、`!`、tags、links
- 写账前校验：交易平衡、账户 open/close 日期
- 英文和中文语法对照文档

## 实现路径

### 1. 扩展核心类型

在核心类型层补充 Beancount 概念，使后续 API 和序列化都有明确结构：

- `TTransactionFlag` 收敛为 `"*"` 和 `"!"`
- `ITransaction` 增加 `tags`、`links`
- 新增 `IPrice`、`INote`、`IDocument`
- `IPostingsPrice` 增加 `auto`，表示 Beancount 的 `{}` 自动 lot 匹配
- `ILedger` 增加 `options`、`plugins`、`includes`、`prices`、`notes`、`documents`

### 2. 扩展 Ledger API

在 `Ledger` 上新增轻量写入方法，保持和现有 `transaction()`、`balance()` 类似的使用方式：

- `ledger.option(key, value)`
- `ledger.plugin(plugin)`
- `ledger.include(file)`
- `ledger.price(price)`
- `ledger.note(note)`
- `ledger.document(document)`
- `ledger.validate()`

`validate()` 当前做两类本地校验：

- 每笔交易按币种汇总后必须平衡为 0；
- posting 使用的账户必须已经开户，且不能在关闭日当天或之后继续使用。

### 3. 扩展交易构造工具

交易构造器继续沿用 `transactionBuilder(ledger)` 的模式：

- 默认 `tr()` 输出 `*`
- 新增 `pending()` 输出 `!`
- `trFactory()` 可配合 `mergeTransactions()` 注入 tags、links 等通用字段
- `pendingFlag()` 可作为事务处理器复用

### 4. 扩展 Posting 标注

在 `Postings` 上新增：

- `.heldAuto()` 输出 `{}`，交给 Beancount 自动匹配已有 lot

并继续复用已有标注：

- `.heldPrice()` 输出 `{ price currency }`
- `.heldCost()` 输出 `{ # cost currency }`
- `.asPrice()` 输出 `@ price currency`
- `.asCost()` 输出 `@@ cost currency`

### 5. 扩展 Beancount 序列化

序列化层按 Beancount 文本结构输出：

- 文件级指令输出在 commodity/account 之前；
- `price`、`note`、`document` 独立排序输出；
- transaction 标题行追加 `#tag` 和 `^link`；
- posting 支持 `{}`、`@`、`@@` 等投资标注。

### 6. 补充测试和文档

测试覆盖：

- option/plugin/include/price/note/document 序列化；
- pending transaction、tags、links；
- `.heldAuto()`；
- `ledger.validate()` 的平衡、未平衡、账户开户和关闭日期校验。

文档覆盖：

- `README.md`：英文 Beancount 功能指南；
- `README_zh.md`：中文 Beancount 功能指南；
- ledger-ts API 与原始 `.bean` 语法的对照示例。

## 已完成计划

- [x] 增加常见 Beancount 指令的数据结构和 Ledger API
- [x] 支持 price、note、document 序列化
- [x] 支持 transaction `!` 状态、tags、links
- [x] 支持 `.heldAuto()` 自动 lot 匹配
- [x] 增加 `ledger.validate()` 的基础本地校验
- [x] 增加新特性的测试用例
- [x] 增加英文 Beancount 功能指南
- [x] 将中文功能指南放入 `README_zh.md`

## 后续计划

- [ ] 增强 `ledger.validate()`：支持单条 posting 自动补平、容差、更多 Beancount 校验规则
- [ ] 增强 metadata：覆盖更多 directive 和 transaction/posting 场景
- [ ] 增强 lot 能力：支持日期、标签、merge/reduce 等更完整 lot 语法
- [ ] 增强排序策略：让不同 directive 的输出顺序更接近大型 `.bean` 文件的维护习惯
- [ ] 增强错误信息：为校验错误附带更稳定的定位信息，方便在生成账本时追踪来源
- [ ] 增加更完整的端到端示例：覆盖投资买入、卖出、分红、费用、价格更新和 include 拆分

## 当前边界

- `ledger.validate()` 是轻量校验，不替代 Beancount 官方校验器；
- 当前交易平衡按 posting 原始金额币种求和，不推导 price/cost 后的换算结果；
- 当前新增 API 主要覆盖常见语法，仍未覆盖 Beancount 全部 directive；
- 文档示例用于说明 API 映射关系，不作为完整个人账本模板。
