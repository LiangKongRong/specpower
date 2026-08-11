# Plan Phase: First-Iteration Test-Plan Draft

> 草拟 `test-plan.md`：从 delta specs 的每个 Scenario 派生 ≥1 Case（含正/负），自动分配稳定 id `T<n>`，token 前缀 = change 名。引用 Scenario 名，不复制 WHEN/THEN。

## Prerequisites
- `specpower/changes/<name>/specs/**/*.md` 已生成（Stage 3 完成）。
- `templates/test-plan.md` 脚手架存在。

## Process
1. 读 `specpower/changes/<name>/specs/**/*.md`，用 `requirement-blocks` 提取每个 delta Scenario（`#### Scenario:`）及其父 `### Requirement:` 与 `## Capability`（若 spec 有 capability 分节；否则按 spec 文件名派生）。
2. 每 Scenario 产出 ≥1 Case：
   - 优先 1 个 `[positive]`（含合法边界值若函数接受）。
   - 对允许失败的 Requirement（副作用/IO/状态/契约校验），≥1 个 `[negative]`（契约违反或异常输入）。
   - 参见 `prompts/reference/specpower/negative-testing-guide.md` 的正负区分；合法边界值（空集合/极值/大输入）若契约接受则为 `[positive]`，勿标负。
3. 分配 id `T1, T2, …`（按 Scenario 顺序），**不重编号**；token = `[<changeName>-Tn]`（change 名即 `specpower/changes/<name>` 的 `<name>`）。
4. 写 `specpower/changes/<name>/test-plan.md`，按 `templates/test-plan.md` 格式：`## Capability:` → `### Requirement: <req> → Scenario: <scen>` → `- **Case** Tn: <desc> [mark]` + 子项 `输入:`/`预期:`/`it():`/可选 `file:`。
5. 跑 `specpower validate specpower/changes/<name>/specs/<cap>/spec.md` 确认覆盖（每 Scenario ≥1 Case；缺负用例则补）。

## Non-testable change（无 delta Scenario）
若 delta specs 无 Scenario（纯重构/纯文档），`test-plan.md` **可选**——仅当要承载 baseline 回归 Case 时才建（引用 `specpower/specs/` 的 baseline scenario）；否则跳过，不建空文件。

## Output
`specpower/changes/<name>/test-plan.md`（first-iteration 草稿，`refine` 会迭代）。
