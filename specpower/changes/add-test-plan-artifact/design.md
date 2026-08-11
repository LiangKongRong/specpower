# Design: test-plan-artifact（测试用例计划产物）

> 初稿设计。`/specpower:refine` 会据此挑战假设、探边界。

## 1. 背景

当前 specpower 的 TDD 管线有两处 NL 测试意图落点：

- `spec.md` 的 `#### Scenario` 块——需求级行为意图（WHEN/THEN），由 `core/validation/validator.ts` 校验、`core/parsers/requirement-blocks.ts` 解析。
- 测试代码的 `it()`/`test()` 名——由 `build` Phase B 的 implementer subagent 在 TDD 时写，散落在项目测试文件。

二者之间没有产物。后果：reviewer 无法快速看到"本次要覆盖哪些用例、正负分布、每个用例对应哪个 `it()`"；`verify` 无法机器化校验"每个 Scenario 都成了测试"；负测试纪律（`prompts/reference/specpower/negative-testing-guide.md`）仅靠 prompt 提醒，无强制落地物。

本变更新增 per-change 的 `test-plan.md`——一个可解析的 NL 用例清单，在 `plan` 生成、`refine` 迭代、`build` Phase B 消费、`verify` 覆盖校验、`done` 归档。它嵌入既有 4 产物 change 目录（proposal/specs/design/tasks），并复用既有校验基建（validator + requirement-blocks 解析器 + validation commit 引入的负场景规则）。

约束：TypeScript/ESM、tsc、vitest；markdown 可解析的 spec 格式（CLI 解析精确的标题结构）；与早于此能力的既有变更向后兼容。

## 2. 目标 / 非目标

**目标**
- 机器可解析的 `test-plan.md`：Case 按名引用 spec Scenario，带 `[positive]`/`[negative]` 标记、输入/预期、稳定 `id:`、计划 `it()` 名。
- `plan` 生成（初稿）；`refine` 迭代；`build` Phase B 作为 TDD 用例清单消费；`verify` 交叉校验 Case→`it()` 覆盖；`done` 归档（不合并 baseline）。
- `validate` 强制：每 Scenario 有 ≥1 Case；每允许失败的 Requirement 有 ≥1 negative Case；orphan/重复/悬空引用拒绝。
- 向后兼容：无 `test-plan.md` 的既有变更降级为 warning，不报错。

**非目标**
- 自动**语义**判定"一个 `[negative]` Case 是否真契约违反 vs 合法边界误标"——需人/语义 review（refine + review）。validator 只管结构，不管语义（见 R1）。
- 生成测试**代码**——`test-plan.md` 是 NL；`build` Phase B 写代码。
- 集成测试 runner 或覆盖率**指标**——`verify` 做按 id 的 Case→`it()` 匹配，不做行覆盖率聚合。
- v1 扩展到非 markdown spec 格式或非 JS/TS 测试框架（`[Tn]` 扫描与 AST 跨框架，但 v1 默认 JS/TS 的 `it`/`test`）。

## 3. 设计决策

### D1：`test-plan.md` 作为 per-change 的并列产物
**选项**
- (a) 并列文件 `changes/<name>/test-plan.md`——选定。
- (b) `spec.md` 内的 `## Test Cases` 节。
- (c) `tasks.md` 内的 `## Acceptance Tests` 节。

**选定**：(a)。
**理由**：`spec.md` 是经校验的需求契约，格式固定且与解析器耦合（`### Requirement`/`#### Scenario`）——把具体用例贴上去会撑爆契约、风险解析器耦合。`tasks.md` 是实现步骤，非用例意图。独立产物有自己可解析的格式 + 自己的生命周期（归档、不合并），不扭曲既有两者。符合既有 4 产物模式（每产物 = 一个抽象层）。

### D2：Case 按名引用 Scenario（不复制）
**选项**
- (a) 按 Scenario 名引用——选定。
- (b) 把 Scenario 的 WHEN/THEN 复制进 Case。
- (c) 合成的稳定 scenario id。

**选定**：(a)。
**理由**：spec 是行为意图的唯一来源；复制 WHEN/THEN 进 Case 会造成两份在 `refine` 下漂移。Scenario 名已是 `spec.md` 里人稳的标识符。合成 id 增加编写成本、此规模无收益。按名引用让 validator 能在校验时抓悬空引用（D4/R3）。

### D3：结构化 markdown 用例格式 + 独立解析器
**选项**
- (a) 结构化 markdown 列表（Capability > Requirement > Scenario 引用块 > Case 条目带字段）——选定。
- (b) 每 Case 一段 YAML frontmatter。
- (c) markdown 表格。

**选定**：(a)。
**理由**：契合 specpower 既有的可解析 markdown 风格——`core/parsers/requirement-blocks.ts` 已提取 `### Requirement`/`#### Scenario`；新增 `core/parsers/test-plan-parser.ts` 同样提取 Case 块、复用 markdown-parser 工具。YAML-per-Case 在 plan/refine 流程里编写更重；表格撑不起多字段用例。**Case 形态（R1 精化）**：每 Case 带稳定、变更唯一 `id:`（如 `T1`，与 `it()` 名无关——见 D5）、Scenario 引用（delta 或 baseline——见 D7）、`[positive]`/`[negative]` 标记、输入、预期、计划 `it()` 名、可选 `file:`（计划测试文件路径）。一 change 一份 `test-plan.md`，按 `## Capability: <cap>` 分节。精确字段语法在实现阶段定（待定问题 Q1）。

### D4：覆盖严格度——默认 warn、`--strict` 升级
**选项**
- (a) 可测试变更缺 `test-plan.md` → warning；`--strict` → error——选定。
- (b) 缺失即 hard error。
- (c) 静默跳过（不查）。

**选定**：(a)。
**理由**：早于此能力的变更无 `test-plan.md`；(b) 会追溯性判它们无效、破坏既有在途变更的 `done`/`validate`。(c) 无强制力。(a) 推动新变更、同时留 `--strict` 给 CI/`done` 门控。结构性违规（orphan Case、未覆盖 Scenario、缺负用例）是 hard error——只有**文件缺失**是 warn/strict 可升级条件，因为缺失属向后兼容情形。

### D5：`verify` 的 Case↔测试链接——稳定 Case id + 两步校验
**选项**
- (a) 按 `it()` 名字符串匹配（regex 扫）——*拒*：名漂移（改名、参数化/生成名、框架措辞）→ 高假阴性。
- (b) 名匹配 + 可选 `file:` 字段——*拒*：仍名耦合；降低但不消除漂移。
- (c) 不做 Case→`it()` 匹配（只 Case→Scenario 结构覆盖）——*拒*：丢"每用例成测试"信号。
- (d) 纯 AST / 框架适配器——*拒*：跨框架 AST 脆 + 重依赖，且无稳定链接锚点。
- (e) **稳定 Case id + 两步校验**——选定（R2 精化）。

**选定**：(e)。
**设计**：每 Case 带稳定、变更内唯一 `id:`（如 `T1`/`C-003`），**与 `it()` 名无关**。**id 嵌入约定（R2 定，R4 精化）**：测试代码嵌的 token **全局唯一**、带 change 前缀——`[<changeName>-<id>]`，如 `[add-test-plan-artifact-T3]`；`plan` 从 change 名自动派生前缀，作者不手写。`verify` Step1 扫**本 change 的前缀 token**（非裸 `[Tn]`）。**为何全局唯一（R4）**：若仅 change 内唯一，多 change 并存时 A/B 都有 `[T1]`，Step1 命中彼此、分不清，且 A 未实现而 B 实现时会误报"A 的 T1 已覆盖"→ 漏报缺失；Step2 按 token 定位测试同样歧义。带 change 前缀的 token 一举解决。**id 稳定性（R2 定）**：id 一经分配即稳定——`plan` 自动分配，`refine` 增/并/改 Case 时不应重编号（类比保持 Scenario 名稳定；change 前缀亦稳定，因 change 名不变）。`verify` 两步：
- **Step1——不漏/无覆盖（廉、可靠）**：每 Case 的**前缀 token**必须出现在测试套件（扫 `[<changeName>-Tn]`）；缺失 → 失败并指出该 case。可靠，因 token 全局唯一、不漂移。
- **Step2——AST 语义（深、分阶段、尽力）**：按前缀 token 定位该 Case 的测试，AST 解析，**尽力**校验断言匹配 plan 的输入/预期。**R2 软化**：NL 输入/预期 ↔ 代码断言本身是语义匹配（如 `expect(x).toThrow('name required')` 算不算匹配预期"throw EINVAL 'name required'"？）——非全可自动；Step2 报 **warning 带置信/缺口**（非硬过/不过）。**分阶段**：v1 出 Step1（可靠）+ Step2 尽力 warn；v2 按 AST 框架深化 Step2。
**理由**：稳定 id 把用例身份与测试命名解耦——杀死 (a)/(b) 的名漂移假阴性；**R4 的 change 前缀**把 token 从"change 内唯一"升到"全局唯一"，杀死跨 change 撞号与误报。Step1 廉价给出可靠的不漏信号（扫前缀 token、无 AST）。Step2（AST）给出用户想要的"测试匹配 plan"语义校验，分阶段使 v1 单出 Step1 即可。(e) 是 (a) 的廉价、(b) 的精确、(c) 的"该简处简"、(d) 的深度的合成——避开了各自的致命短板。
**待定**：token 精确语法（`<changeName>-Tn` vs `<changeName>/Tn` vs `Tn@<changeName>`）与 v2 Step2 支持的 AST 框架——见待定问题 Q1/Q3。（"带 change 前缀、全局唯一"与 id 稳定性已定。）

### D6：新增解析器模块 + 扩展 validator；specs-apply 归档
**选项**
- (a) 新增 `core/parsers/test-plan-parser.ts`；`validator.ts` 加覆盖阶段；`specs-apply.ts` 加 `test-plan.md` 进归档集（不合并）——选定。
- (b) 把 Case 解析折进 `requirement-blocks.ts`。
- (c) 外部 linter 包。

**选定**：(a)。
**理由**：`test-plan.md` 结构不同于 spec requirement-blocks；独立解析器让 `requirement-blocks.ts` 保持聚焦、可测。`validator.ts` 已有负场景基建（validation commit），可扩展 Case 覆盖规则。`specs-apply.ts` 已管 change→baseline 合并/归档管线，把 `test-plan.md` 加进归档集（显式不加进合并集）是正确最小集成。

### D7：回归范围——delta + baseline scenario 引用
**选项**
- (a) 仅 delta scenario（新/改行为）——*拒*：被触及既有代码的回归无覆盖。
- (b) delta + baseline 回归（Case 可引 baseline scenario）——选定。
- (c) delta + 自由"回归笔记"区（不耦合 scenario）——*拒*：无结构、不可机器校验。

**选定**：(b)。
**理由**：被触及既有代码的回归是 test-plan 能承载的最高价值自动信号。耦合 baseline `specpower/specs/` 可接受，因 baseline 即契约。覆盖规则仍只对 delta（每 delta Scenario ≥1 Case），但 Case 可额外引 baseline Scenario 做回归；validator 对 delta 与 baseline 双向解析 Case→Scenario 引用。

### D8：`specpower rename-scenario`——baseline Scenario 原子重命名 + 跨 test-plan 同步
**选项**
- (a) 命令式原子重命名：`specpower rename-scenario <cap> <old> <new>` 改 baseline spec 的 Scenario 名 + 扫描所有 test-plan（在途 + 归档）引用旧名者并同步——选定。
- (b) 不提供命令、仅 `validate` 标悬空——*拒*：归档 test-plan 不跑 `validate`，悬空静默失效（D7 的回归引用会腐烂）。
- (c) `done`/`sync` 时隐式检测——*拒*：隐式、不可控、发现太晚。

**选定**：(a)。
**理由**：D7 让 Case 可引 baseline scenario 做回归；若后续 change 重命名 baseline Scenario，已归档 + 在途的 test-plan 里那些引用会悬空（R3 只覆盖了 delta scenario 漂移，未覆盖 baseline）。没有原子重命名，回归引用会随 baseline 演化静默失效——D7 的价值就被掏空。(a) 把"改 baseline spec 名"与"同步所有 test-plan 引用"做成一个原子操作，是 D7 不腐烂的必要前提。属本 change 的紧耦合部分（不拆）。
**实现要点**：`--dry-run` 预览受影响文件 + 确认门控 + 依赖 git 可回滚（见 R6）。

### D5 补充：Step2 最小可检项 + change 名唯一 + id 持续（R5 定）
- **Step2 最小可检项**：Step2 校验"前缀 token 的 `it()` 存在 + AST 可解析 + 调用被测函数 + 触及 Case 的输入"；**不判语义等同**（如不判"断言的预期措辞等同 plan 的预期"）。无法满足最小项 → warn（非 fail）。这是 R2 软化后的明确边界。
- **change 名全局唯一**：`change new` 应拒绝已被用过的名（含 `archive/` 内）；token 前缀 `<changeName>-` 依赖此保证全局唯一（R4）。归档旧 change 的测试仍在代码库，若新 change 复用同名 → token 撞号、verify 误报。
- **id 持续性**：`plan`/`refine` 重生成 `test-plan.md` 时**应读旧文件、保留既有 id**、仅给新 Case 分配；避免重生成导致旧 token 失配（R2 的"id 稳定"在重生成路径上也成立）。

## 4. 风险 / 取舍

- **R1——自动误分类检测弱（R1 已收口）**。validator 只强制**结构**（每 Case 有标记；每允许失败的 Requirement ≥1 `[negative]`；每 Case 有 `id:`）；它**不判**一个 `[negative]` Case 是否真契约违反 vs 合法边界误标——那是语义。**处置**：validator 只结构；误分类是 `refine`/review 责任。spec 的"误标 negative 被拒"scenario 软化为 review 检查项（不自动拒）。注：D5 Step2（AST）**能**自动校验"测试断言匹配 plan 输入/预期"——那是另一个、可检的命题（测试匹配 plan），非"分类正确性"。
- **R2——`verify` 名匹配假阴性（D5 已解）**。杀掉名匹配的名漂移问题的是 D5 的稳定 Case `id:`：Step1 按 id 链接（不漂移），不按名。残留：Step2 AST 无法解析（框架缺口）→ warning（分阶段，v1）。**缓解**：v1 出 Step1（可靠）；Step2 尽力 warn。
- **R3——Scenario 名漂移（R5 扩到 baseline）**。`refine` 改 delta Scenario 名 → Case 引用悬空（`validate` 拒，已覆盖）；**baseline** Scenario 被后续 change 重命名 → 归档/在途 test-plan 的 baseline 回归引用悬空。**缓解**：D8 `rename-scenario` 原子改名 + 跨 test-plan 同步，覆盖 delta 与 baseline 两类漂移；`refine` 后跑 `validate` 仍是推荐流程。
- **R4——prompt/skill 面扩散**。触及 plan/build/verify/done/test 的 prompt + skill 是一片宽、易不一致的改动。**缓解**：各 prompt 对 test-plan 的引用最小且措辞一致；一个解析器供所有消费；一条集成测试跑全生命周期。
- **R5——采纳摩擦**。作者现在要在写代码前先写 Case（带稳定 id + change 前缀 token），多一步。**缓解**：`plan` 从 Scenario 生成初稿（带自动分配 id + 派生前缀 token），降低编写成本；默认 warn 路径（D4）意味着这步是鼓励、非阻断，直到 CI 开 `--strict`。
- **R6——`rename-scenario` 是跨文件破坏性操作**。改名 + 扫改所有 test-plan（含归档）一旦出错影响面大。**缓解**：`--dry-run` 预览受影响文件清单、确认门控、依赖 git 可回滚、改后跑 `validate` 确认无悬空引用。

## 5. 迁移方案

绿地能力——无数据迁移。既有在途变更（早于此能力）无 `test-plan.md`；依 D4 在 `validate`/`verify` 降级为 warning，不阻断 `done`（除非配 `--strict`/`--force` 门控）。无需改 config 文件。

## 6. 待定问题

- **Q1——精确 Case 块语法**：输入/预期的分隔（缩进子项 vs 行内）；计划 `it()` 名是否必填（倾向是，次于 `id:`）。`id:` 字段已**定必填**（D5）；`file:` 可选。在 `templates/test-plan.md` 草拟。
- **Q2——`change new` 行为**：`specpower change new` 该不该建 `test-plan.md` 占位，还是只在 `plan` Stage 5 建（同 `design.md`/`tasks.md`）？倾向 Stage 5。
- **Q3——v2 Step2 的 AST 框架**：v2 支持哪些框架（vitest/jest 先；python/go 后）。v1 出 Step1（`[Tn]` token 扫）+ Step2 尽力 warn。（id 嵌入约定 `[Tn]`-嵌名 与 id 稳定性规则 已在 R2 定。）
- **Q4——`fix` 快轨**：`fix` skill 自动归档——该不该要求 `test-plan.md`（哪怕单条回归计划），还是豁免？
- **Q5——误分类处理（R1 已收口）**：已决——validator 只结构；误分类留 review/refine；spec"误标 negative 被拒"软化为 review 检查项。（不再 open。）
