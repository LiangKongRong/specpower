## Why

specpower 的 TDD 流程缺一层"代码前先有自然语言用例"：`spec.md` 的 Scenario 是需求级行为意图（粗），测试代码的 `it()` 名是 TDD 执行时才写、散落在测试文件里。中间没有一份 per-change 的具体用例清单——review 时无法快速看到"本次要覆盖哪些用例、正/负分布、每个用例对应哪个 scenario"，也无法在 verify 阶段做 scenario→case→it 的覆盖校验。负测试纪律（`negative-testing-guide`）目前只靠 prompt 提醒，没有可校验的落地物。

## What Changes

- 新增第 5 个 change 产物 `test-plan.md`（与 `proposal.md` / `specs/` / `design.md` / `tasks.md` 并列），在**生成测试代码之前**生成。
- 内容：从 spec scenario **展开**的具体 NL 用例，每条含 正/负标记、输入/预期、计划中的 `it()` 名；**引用**（不复制）scenario，避免双真相源。
- 新增 `templates/test-plan.md` 脚手架（与现有 4 个模板并列）。
- 流程接入：plan Phase A 生成（first-iteration）→ refine 迭代 → build Phase B TDD 照它写 `it()` → verify 校验 scenario→case→it 覆盖 → done 归档（不合并进 baseline，同 proposal/design/tasks）。
- validator 加规则：每个 scenario 在 `test-plan.md` 有 ≥1 case 且至少 1 个 negative；正/负区分遵循 `negative-testing-guide`。
- 新增 `specpower rename-scenario` 命令：原子重命名 baseline Scenario 并同步所有在途+归档 test-plan 的引用，避免 baseline 回归引用随 spec 演化静默悬空。
- README / CONTRIBUTING 记录新产物与流程。

## Capabilities

### New Capabilities

- `test-planning`: 自然语言测试用例计划产物（`test-plan.md`）的格式、生成时机、生命周期与 scenario→case→it 覆盖校验。

### Modified Capabilities

（`specpower/specs/` 当前为空，故无既有 specpower spec 可"修改"。但本变更扩展了 `openspec/specs/` 中 `specpower-test` / `specpower-build` / `specpower-verify` / `specpower-done` 描述的既有流程——这些在 specpower 自有 spec 系统里将作为新 spec 一并建立，详见 specs 阶段。）

## Impact

- **新增产物**：`templates/test-plan.md`（脚手架）；运行时 `specpower/changes/<name>/test-plan.md`。
- **改 prompts**：`plan/proposal.md` 或 `plan/specs.md`（生成 test-plan）、`build/phase-a-plan.md` + `phase-b-execute.md`（TDD 消费 test-plan）、`verify` 相关（覆盖校验）、`done`（归档）。
- **改 skills**：`specpower-plan` / `specpower-build` / `specpower-verify` / `specpower-done` / `specpower-test` 的 `SKILL.md` 引用 test-plan。
- **改 src**：`core/validation/{validator,types,constants}.ts`（新增"scenario→case 覆盖 + 负用例"规则，解析 `test-plan.md`）；`core/specs-apply.ts`（test-plan 不合并、但纳入 change 生命周期与归档清单）；`cli/commands/{change-new,instructions,validate}.ts`（可选创建占位、artifact 指令、校验入口）。
- **文档**：README、CONTRIBUTING。
- **不破坏**：现有 4 产物流程不变；`test-plan.md` 是新增可选层——未提供时校验降级为 warn（不阻断既有 change）。
