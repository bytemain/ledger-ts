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

- [x] 增强 `ledger.validate()`：支持单条 posting 自动补平、容差、更多 Beancount 校验规则
- [x] 增强 metadata：覆盖更多 directive 和 transaction/posting 场景
- [ ] 增强 lot 能力：支持日期、标签、merge/reduce 等更完整 lot 语法
- [ ] 增强排序策略：让不同 directive 的输出顺序更接近大型 `.bean` 文件的维护习惯
- [x] 增强错误信息：为校验错误附带更稳定的定位信息，方便在生成账本时追踪来源
- [ ] 增加更完整的端到端示例：覆盖投资买入、卖出、分红、费用、价格更新和 include 拆分

## 优化方案

结合两篇文章中提到的真实 Beancount 使用方式，ledger-ts 后续不应该只补单个语法点，而应该按“格式兼容 → 投资/加密资产场景 → 工程化编译体验 → 数据导入与分析”的路径推进。

### 总体目标

- 让 ledger-ts 能覆盖常见个人账本、投资账本、加密资产账本的核心 Beancount 表达能力；
- 保持 TypeScript API 的类型安全和 IDE 补全优势；
- 让生成的 `.bean` 文件更接近长期维护的大型 Beancount 项目结构；
- 在不替代 Beancount/Fava 的前提下，提供更早的本地校验和更顺滑的编译体验。

### P0：已完成的基础兼容补齐

这一阶段解决“Beancount 常见语法无法表达”的问题，已经在当前 PR 中完成：

- `price` 指令序列化；
- `option`、`plugin`、`include` 指令；
- `note`、`document` 指令；
- transaction `*` / `!` 状态；
- transaction tags / links；
- `.heldAuto()` 对应 `{}` 自动 lot 匹配；
- `ledger.validate()` 的基础平衡和账户日期校验；
- 中英文 Beancount 功能指南和对应测试。

验收标准：

- README 中能找到 ledger-ts API 与 `.bean` 语法的对照；
- 新增语法都有测试覆盖；
- `npm run build` 和 `npx vitest run` 通过。

### P1：Beancount 兼容性加固

目标是让生成结果在更多真实账本中直接可用，优先处理语法正确性、校验准确性和输出结构。

建议事项：

- 完善 `validate()`：
  - [x] 支持一条空金额 posting 的自动补平校验；
  - [x] 对金额比较增加可配置容差；
  - [x] 区分普通金额、`@`、`@@`、`{}`、`{ # }` 场景下的校验边界；
  - [x] 输出包含 transaction 日期、payee、narration、account 的稳定错误信息。
- 完善 directive 支持：
  - [x] 增加 `event`、`custom`；
  - [x] 为 `option` 支持多值场景，例如多条 `operating_currency`；
  - 确认 `plugin`、`include`、`option` 的输出顺序可配置。
- 完善 metadata：
  - [x] 明确 commodity、account、transaction、posting、price、note、document 的 metadata 序列化规则；
  - [x] 补充字符串、数字、布尔、日期等常见值类型的格式策略。
- 校正已有边界：
  - `pad` 是否需要作为独立 directive 暴露；
  - [x] close 指令日期应使用账户关闭日期；
  - 多货币 balance 的声明和示例。

验收标准：

- 覆盖常见 Beancount directive 的序列化测试；
- 校验错误可以定位到具体交易和账户；
- 生成文本可被 Beancount 官方工具接受。

### P2：投资与加密资产场景增强

目标是覆盖文章中频繁出现的股票、基金、数字货币、交易所账户和价格追踪场景。

建议事项：

- 增强 lot API：
  - 支持 lot 日期、label、merge/reduce 等更完整语法；
  - 支持 booking method 相关配置的便捷 API；
  - 提供 FIFO/LIFO 场景的示例。
- 增强价格数据：
  - 提供批量 `price` 导入 API；
  - 提供按 commodity 生成价格文件的工具；
  - 为自动价格获取所需 metadata 提供类型化配置。
- 增强投资交易模板：
  - 买入、卖出、分红、手续费、转仓、币币交易；
  - 交易所账户与银行卡账户之间的充值、提现、结算；
  - 价格更新和持仓变动的端到端示例。

验收标准：

- 能用示例覆盖“买入 → 持有 → 更新价格 → 卖出 → 自动 lot 匹配”的完整链路；
- 能表达数字货币交易所常见的充值、提现、交易和手续费；
- 复杂 posting 标注有独立单元测试和快照测试。

### P3：多文件输出和编译体验

目标是把 ledger-ts 从“库”增强为更像 TypeScript 到 Beancount 的编译工具，适合长期维护大型账本。

建议事项：

- 多文件输出：
  - 支持按账户、年份、directive 类型拆分输出；
  - 自动生成主文件和 `include`；
  - 保证跨文件排序和引用稳定。
- CLI：
  - 提供 `ledger-ts build`；
  - 支持指定入口 TypeScript 文件、输出目录、主 `.bean` 文件名；
  - 提供 `--check` 只校验不写文件。
- Watch 模式：
  - 文件变更后增量重新生成；
  - 输出错误位置和构建摘要。
- 示例项目：
  - 提供推荐目录结构；
  - 提供最小可运行账本模板；
  - 提供 CI 中执行 build/check 的示例。

验收标准：

- 用户不需要手写 Node.js 脚本即可生成 `.bean`；
- 多文件输出可稳定重复生成；
- watch 模式能反馈编译和校验错误。

### P4：Importer 框架

目标是支持用户把银行、券商、交易所、支付平台数据转换成 ledger-ts 交易，而不是只手写账本。

建议事项：

- 定义统一 importer 接口：
  - 输入原始记录；
  - 输出标准化中间交易；
  - 再映射为 ledger-ts transaction。
- 提供去重策略：
  - 基于日期、金额、账户、外部流水号生成稳定 ID；
  - 支持 dry-run 预览。
- 提供适配器示例：
  - CSV 银行账单；
  - 支付平台账单；
  - 加密货币交易所流水。
- 提供人工确认流程：
  - 未匹配账户、未知币种、异常手续费单独输出；
  - 支持用户补规则后重跑。

验收标准：

- 可以通过一个 CSV 示例生成 ledger-ts 交易；
- 同一份输入重复导入不会生成重复交易；
- 异常记录有明确报告。

### P5：轻量查询和报表能力

目标不是重写 Beancount/Fava，而是提供写账阶段常用的快速检查能力。

建议事项：

- 提供基础余额计算：
  - 按账户、币种、日期区间汇总；
  - 支持包含/排除子账户。
- 提供 transaction filter API：
  - 按账户、币种、tag、link、payee、narration、日期筛选；
  - 支持 group/aggregate 的轻量统计。
- 提供与 BQL 对齐的概念文档：
  - 标明 ledger-ts 查询能力边界；
  - 建议复杂报表继续使用 Beancount/Fava。

验收标准：

- 能在测试中计算账户余额和期间收支；
- 查询 API 不影响序列化模型；
- 文档明确说明和 Beancount/Fava 的职责边界。

### 推荐推进顺序

1. 先做 P1，保证当前新增 Beancount 语法更稳定、更标准；
2. 再做 P2，因为投资/加密资产是两篇文章中最能体现 Beancount 价值的场景；
3. 然后做 P3，把 ledger-ts 从库升级为可直接落地的编译工作流；
4. P4 和 P5 可以并行探索，但应保持插件化，避免把核心库做重。

### 不建议立即做的事项

- 完整 Beancount parser：复杂度高，容易偏离当前“生成器/编译器”定位；
- 完整 BQL 引擎：应优先复用 Beancount/Fava 的生态能力；
- 强绑定某个银行或交易所 importer：应先设计通用 importer 接口，再做示例适配器；
- 在核心模型中引入文件系统副作用：多文件输出和 CLI 应放在独立工具层，核心 `Ledger` 保持纯内存模型。

## 当前边界

- `ledger.validate()` 是轻量校验，不替代 Beancount 官方校验器；
- 当前交易平衡按 posting 原始金额币种求和，不推导 price/cost 后的换算结果；
- 当前新增 API 主要覆盖常见语法，仍未覆盖 Beancount 全部 directive；
- 文档示例用于说明 API 映射关系，不作为完整个人账本模板。
