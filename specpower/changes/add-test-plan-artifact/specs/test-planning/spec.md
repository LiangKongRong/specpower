## ADDED Requirements

### Requirement: test-plan 产物生成
specpower plan 应当在变更的 delta specs 含至少一个 Scenario（即引入或修改可测试行为）时生成 `specpower/changes/<change-name>/test-plan.md`。当 delta specs 无 Scenario 时，`test-plan.md` 为**可选**——可仅承载 baseline 回归 Case（例如动了既有代码但未改 spec 的纯重构）；纯文档/配置变更（无 Scenario 且未动代码）不应创建。该文件应在 plan 流程中与 `proposal.md`、delta `specs/`、`design.md`、`tasks.md` 一并生成，作为 `refine` 后续迭代的初稿。

#### Scenario: 可测试变更（delta scenario）必建 test-plan
- **WHEN** plan 生成的变更其 delta specs 含至少一个 Scenario
- **THEN** 变更目录下 `test-plan.md` 在 plan 完成前存在

#### Scenario: 无 delta scenario 的变更可选承载 baseline 回归 test-plan
- **WHEN** plan 生成的变更其 delta specs 无 Scenario 但动到了既有代码（如纯重构）
- **THEN** 可选生成 `test-plan.md`，仅含 baseline 回归 Case；其缺失不报 warning（delta 覆盖规则此时空满足）

#### Scenario: 纯文档/配置变更不建 test-plan
- **WHEN** plan 生成的变更无 Scenario 且未动代码（纯文档、仅配置、纯重命名）
- **THEN** 不创建 `test-plan.md`，工具不应要求其存在

#### Scenario: delta-scenario 变更缺失 test-plan 时报告（missing）
- **WHEN** 变更的 delta specs 含 Scenario 但在 validate/verify 时无 `test-plan.md`
- **THEN** 工具报告 warning 指出该变更（非 error，以兼容早于此能力的既有变更）

### Requirement: test-plan Case 格式
`test-plan.md` 的每个条目（"Case"）应当机器可解析，且：携带稳定、变更内唯一的 `id:`（如 `T1`，与 `it()` 名无关）；按名引用恰好一个 spec Scenario（delta Scenario 或 baseline 回归 Scenario）；声明 `[positive]`/`[negative]` 分类；陈述输入与预期结果；提出 `it()` 测试名。测试代码嵌入的 token 应当**全局唯一**——带 change 前缀 `<changeName>-<id>`（如 `[add-test-plan-artifact-T3]`），以免多 change 并存时同号 token 撞号、verify 无法分清。Case 应按名引用 Scenario 而非复制其 `WHEN`/`THEN` 正文，使 spec 保持行为意图的唯一来源。

#### Scenario: 合法 Case
- **WHEN** 编写一个 Case
- **THEN** 它携带稳定唯一 `id:`、按名引用 Scenario、带 `[positive]`/`[negative]` 标记、含输入与预期、提出 `it()` 名

#### Scenario: 无稳定 id 的 Case 被拒（reject）
- **WHEN** 一个 Case 无 `id:`（或变更内 id 重复）
- **THEN** 校验失败并报错指出该 Case

#### Scenario: Case id 稳定且永不重编号
- **WHEN** `refine` 跨轮新增/合并/编辑 Case，或 `plan`/`refine` 重生成 `test-plan.md`
- **THEN** 既有 Case `id:` 不应被重编号或重用；合并的 Case 保留其原始 id 之一；重生成时应读旧文件保留既有 id、仅给新 Case 分配；change 前缀稳定（change 名不变）

#### Scenario: 嵌入 token 全局唯一、带 change 前缀
- **WHEN** 多个 change 并存、各自有 Case `T1`
- **THEN** 测试代码嵌入的 token 为 `<changeName>-T1`（各自不同），verify 能区分各 change 的用例、不撞号、不误报

#### Scenario: change 名全局唯一（含归档）保证前缀不撞
- **WHEN** `specpower change new <name>` 的名已被用（在途或在 `archive/` 内）
- **THEN** 创建被拒绝并提示改名，以保证 `<changeName>-` 前缀全局唯一、归档旧 change 的测试不与新 change 撞号

#### Scenario: 无 scenario 引用的 Case 被拒（reject）
- **WHEN** 一个 Case 未引用任何 spec Scenario
- **THEN** 校验失败并报错指出该 orphan Case

#### Scenario: Case 可引用 baseline scenario 作为回归
- **WHEN** 一个 Case 引用的 Scenario 存在于 `specpower/specs/`（baseline）而非 delta specs
- **THEN** 该 Case 作为回归 Case 被接受（覆盖规则仍只对 delta Scenario 生效）

#### Scenario: 引用不存在 scenario 的 Case 被拒（reject）
- **WHEN** 一个 Case 引用的 Scenario 名在 delta specs 与 `specpower/specs/` 中均不存在
- **THEN** 校验失败并报错指出该 Case 与缺失的 Scenario

#### Scenario: 变更内重复 it() 名被拒（duplicate）
- **WHEN** 同一变更内两个 Case 提出相同 `it()` 名
- **THEN** 校验失败并报错指出重复项

### Requirement: scenario→Case 覆盖
变更 delta specs 中的每个 Scenario 应当在 `test-plan.md` 中有至少一个 Case。每个允许失败的 Requirement（有副作用、IO、状态或契约校验的行为）应当有至少一个覆盖契约违反或异常输入/前置条件的 negative Case，依 `prompts/reference/specpower/negative-testing-guide.md` 的正负区分。契约接受的合法边界值（空集合、极值、大输入）应当归为 `[positive]`，不应标 `[negative]`。

#### Scenario: 全覆盖变更校验通过
- **WHEN** 每个 Scenario 有至少一个 Case 且每个允许失败的 Requirement 有至少一个 negative Case
- **THEN** 校验通过，无覆盖错误

#### Scenario: 未覆盖 scenario 校验失败（fail）
- **WHEN** 一个 Scenario 在 `test-plan.md` 中无 Case
- **THEN** 校验失败并报错指出未覆盖的 Scenario

#### Scenario: 允许失败的 Requirement 缺负用例则校验失败（missing）
- **WHEN** 一个 Requirement 允许失败（副作用/IO/状态/契约校验）但无 negative Case
- **THEN** 校验失败并报错指出该 Requirement 与缺失的负向维度

#### Scenario: 误标 negative 的边界 Case（wrong）作为 review 项不自动拒
- **WHEN** 一个 Case 标了 `[negative]` 但其输入是契约内的合法边界值（如函数接受空集合为合法输入）
- **THEN** 校验器不应自动拒绝（它不判分类语义）；误分类作为 `refine`/review 检查项标记，而非校验错误

### Requirement: test-plan 生命周期
`test-plan.md` 应当在 `specpower done` 时随变更归档，且不应合并进 baseline `specpower/specs/`。它应在 `refine` 中可迭代（增/并/改 Case 同时保留 Scenario 引用与 `id:` 稳定），并作为用例清单被 `build` Phase B（TDD）消费、被 `verify` 交叉校验。

#### Scenario: done 归档但不合并
- **WHEN** `specpower done` 归档一个已完成变更
- **THEN** `test-plan.md` 进入变更归档，不合并进 `specpower/specs/`

#### Scenario: refine 迭代 Case
- **WHEN** `specpower refine` 运行于含 `test-plan.md` 的变更
- **THEN** refine 可跨轮新增/合并/编辑 Case，保留每个 Case 的 Scenario 引用与 `id:` 稳定

#### Scenario: rename-scenario 原子重命名 baseline scenario 并同步引用
- **WHEN** 运行 `specpower rename-scenario <cap> <old> <new>`
- **THEN** baseline `specpower/specs/<cap>/spec.md` 的 Scenario 名被改，且所有在途 + 归档的 `test-plan.md` 中引用旧名的 Case 被同步改为新名；操作支持 `--dry-run` 预览受影响文件、需确认、依赖 git 可回滚

#### Scenario: 归档 test-plan 的 baseline 引用不静默悬空
- **WHEN** 一个 baseline Scenario 被重命名且存在归档 test-plan 引用旧名
- **THEN** `rename-scenario` 同步更新该归档 test-plan 的引用；若无同步，引用不应静默失效（拒绝裸改 baseline spec 名而不经 `rename-scenario`）

#### Scenario: build Phase B 以嵌 id 的 it() 消费 Case
- **WHEN** `specpower build` Phase B 对含 `test-plan.md` 的变更执行 TDD
- **THEN** 每个 Case 驱动一个 `it()` 测试，其名嵌入**带 change 前缀的全局唯一 token**（如 `it('throws on unknown [add-test-plan-artifact-T3]', …)`），按 Case 计划名命名；`[negative]` Case 产出复现契约违反的测试

#### Scenario: verify 执行两步覆盖校验
- **WHEN** `specpower verify` 运行于已 build 的变更
- **THEN** Step1 扫描测试套件中每个 Case 的**前缀 token**（`<changeName>-Tn`），缺失则失败（fail）并指出该 Case（不漏、跨 change 不误报）；Step2 按前缀 token 定位该 Case 测试，AST 校验**最小可检项**——该 `it()` 存在、可解析、调用被测函数、触及 Case 的输入；不判语义等同；无法满足最小项时报告 warning 带缺口（分阶段；v1 尽力）

#### Scenario: 可测试变更无 test-plan 时归档被阻
- **WHEN** `specpower done` 被要求归档一个有 Scenario（delta）但缺 `test-plan.md` 的变更
- **THEN** 归档被阻断并报错指出该变更（除非传 `--force`）

### Requirement: 校验集成
`specpower validate` 在校验一个属于含 `test-plan.md` 的变更目录的 spec 文件时，应当解析 `test-plan.md` 并强制上述 scenario→Case 覆盖与负用例规则。当 spec 属于缺 `test-plan.md` 的可测试变更时，校验应当发 warning（非 error）；在 `--strict` 下，该 warning 应当升级为 error。

#### Scenario: 合规 test-plan 校验通过
- **WHEN** `specpower validate <spec>` 运行于一个 spec，其变更目录的 `test-plan.md` 覆盖所有 Scenario 且含所需负用例
- **THEN** 校验返回 valid，零错误零 warning

#### Scenario: 覆盖缺口校验失败（fail）
- **WHEN** `specpower validate <spec>` 运行且某 Scenario 在变更的 `test-plan.md` 中无 Case
- **THEN** 校验返回 invalid 并报错指出未覆盖的 Scenario

#### Scenario: strict 模式升级缺失文件 warning
- **WHEN** `specpower validate --strict` 运行于属于缺 `test-plan.md` 的可测试变更的 spec
- **THEN** 缺失文件情形作为 error 而非 warning 报告
