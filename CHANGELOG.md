# Changelog

本项目采用 [语义化版本](https://semver.org/lang/zh-CN/)，变更记录参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范。

格式：
- `Added` — 新增功能
- `Changed` — 已有功能的变更
- `Deprecated` — 将在未来版本移除的功能
- `Removed` — 本版本移除的功能
- `Fixed` — bug 修复
- `Security` — 安全相关修复

## [Unreleased]

_尚未发布的变更记录在此。发布时移到新的版本标题下。_

## [0.2.3-9] - 2026-09-21

### Added

- **30%/75% 覆盖契约**:`test-planning` baseline spec 升级——`[testable]` requirement 必须有 ≥1 `[negative]` scenario(结构性 error,替代关键字启发式);30% distinct-`branch:` 负向比例门禁(`low-negative-ratio`/`duplicate-branch`/`missing-branch-tag`);build Phase B B2b 跑 `specpower validate`;verify Pass 4 hard gate + Pass 5 75% branch gate。
- **`coverage-attribution` capability**:新 CLI `specpower coverage-attribution`——`--overall` 整体聚合 75% 门禁(适用 legacy 无标注项目)+ per-Scenario 归因(经 `covers:` 字段);支持 lcov(v8/istanbul)与 jacoco 解析。
- **`[testable]`/`[negative]`/`branch:`/`covers:` 标注体系**:spec/test-plan 显式标注,替代启发式判定;`branch:` distinct 计数防注水。
- **vitest 覆盖率门禁**:thresholds 调至 75,CI 跑 `test:cov`(ci.yml + release.yml)。
- **anti-water-injection**:`duplicate-branch` 报告共享 branch tag 的 Cases(注水痕迹)。

### Fixed

- **v8 lcov `0` 未命中分支**:v8 lcov 用 `0`(非 `-`)表示可达但未执行分支,parser 现把 `0` 与 `-` 都算未命中(原误报 100% 假 PASS)。
- **lcov/jacoco 截断完整性检查**:`parseLcovContent` 检 SF/end_of_record 计数;`parseJacocoContent` 检 `<class>` open/close 计数——截断报告抛错而非从部分数据假 PASS。
- **jacoco class-level vs method-level counter**:剥离 `<method>` 块后取 class-level 聚合 counter(原取第一个 method-level counter 严重低估)。
- **jacoco `sourcefilename` key**:标准 jacoco `<class sourcefilename="Foo.java">`(非 `filename=`),按 basename key + 逐属性解析(顺序无关)。
- **`validate <spec>` 多 capability test-plan dangling**:按 spec 路径推断 capability 过滤 Cases,空集 fallback + mismatch 警告。

### Changed

- **failure-admitting 判定脱离关键字启发式**:改为 `[testable]` 显式标注(opt-in)。
- **`missing-branch-tag` 为 warning**(向后兼容),`duplicate-branch`/`low-negative-ratio` 为 error。
- `coverage-attribution` CLI `--overall` 加 try/catch,与 per-Scenario 模式错误呈现一致。

### Known Limitations

- 30% floor 是 opt-in(需标 `[testable]`);未标注的可测 requirement 逃过(留给 `specpower-scan` v0.3)。
- 75% overall 是 floor 非 ceiling(低覆盖文件可被掩盖,`lowFiles` 揭示但不 FAIL);per-Scenario 是文件级归因(需 `covers:`,非 per-test)。
- jacoco per-Scenario `covers:` 须用 sourcefilename basename(全路径不匹配)。

## [0.2.2] - 2026-04-26

文档/skill 热修，显式标记 `/specpower:scan` 为 v0.3 规划中。NOT BREAKING。

### Fixed

- `/specpower:scan` CLI 子命令自 v0.1.0 起就未实现，却在 README 和 skill 列表里按"已提供"方式宣传，导致新用户在棕地场景执行 `/specpower:scan` 时撞 CLI unknown-command 错
- `skills/specpower-scan/SKILL.md` 重写为 "PLANNED v0.3 — not yet functional"：触发时不再尝试运行 `specpower scan`，而是显式提示用户「scan 规划在 v0.3」并给出 v0.2.x 下的替代流程（直接 `/specpower:plan` 描述已有行为 + 新变更）
- `README.md` 5 处 scan 引用全部加「规划中 · v0.3」标注：tagline、核心流程图、场景 2「接手已有项目」、命令速查表、故障排查段。场景 2 重写为推荐的 plan→refine→build→done 直链流程

### Notes

- CLI 行为、schema、其他 9 个 skill 全部无改动
- `code-review-graph` 仍保留在 optionalDependencies 里为 v0.3 占位；v0.2.x 无需安装

## [0.2.1] - 2026-04-26

Prompt 清晰度修补，端到端真实会话测试发现。NOT BREAKING，不改 CLI、不改 schema。

### Fixed

- `/specpower:build` Phase A 生成的 `Verify:` 行可能给出运行时版本敏感的命令（例如 `node --test test/` 在 Node.js 20 对目录自动发现行为不稳定）。`prompts/build/phase-a-plan.md` 新增 **Portable `Verify:` commands** 段，要求优先使用项目声明的 test script（`npm test`、`pytest`、`cargo test` 等），显式写出 runner 发现行为；同时在 No Placeholders 列表里明确禁止运行时版本敏感的 runner 调用
- `/specpower:verify` Pass 2 regression 在 `specpower/specs/` 不存在时静默通过，无法区分"greenfield 无基线"和"brownfield 基线被误删"。`skills/specpower-verify/SKILL.md` 新增 **Baseline-aware execution** 指引，强制报告 `Pass 2: skipped (no baseline — greenfield project or no archived changes yet)`，并在 Stage 3 Report 规则里明确 `skipped` 必须原样呈现，不得折叠进 pass 小结

## [0.2.0] - 2026-04-26

工作流深度迭代重构。plan 一次产出 4 artifact 的第一轮深度思考；refine 变为内部多轮攻击性审查（≥2 轮 + AI 语义收敛 + 4 个挑战行为 + Superpowers 9 步整合）；build Phase A 用 writing-plans 严格重写 tasks.md；新增 `.specpower.yaml` `phase` 字段追踪生命周期。NOT BREAKING。

### Changed

- `/specpower:plan` 改为一次产出全部 4 个 artifact（proposal + delta specs + design + tasks），每个都是实质的"第一轮深度思考"而非占位骨架
- `/specpower:refine` 改为**内部自动多轮循环**（至少 2 轮，AI 语义判断收敛，不设上限），每轮显式执行 4 个挑战行为（挑战假设 / 提新 options / 探边界 / 质疑 scope），整合 Superpowers brainstorming 9 步流程
- `/specpower:refine` 可更新任意 artifact（proposal / specs / design / tasks），更新前做影响分析让用户选择本轮范围（A 全做 / B 只主件 / C 推迟）
- `/specpower:build` Phase A 从"生成 tasks.md"改为"重写 tasks.md"——基于 refine 稳定后的 artifact，用 Superpowers writing-plans 严格规则精化。分组重组需用户确认；发现 design 缺漏即停并回 refine

### Added

- `.specpower.yaml` 新增 `phase` 字段（`plan` / `refined` / `built` / `archived`）追踪变更生命周期
- `specpower change phase <name>` CLI 子命令（读 / `--set <phase>` 写）
- `specpower change archive --force` 标志位，跳过 phase 守门
- 3 个新 prompt 文件：`prompts/plan/design-draft.md`、`prompts/plan/tasks-draft.md`、`prompts/refine/update-artifacts.md`
- 参考样本 `prompts/reference/specpower/example-design.md`（archived create-specpower-plugin 的 design.md），供 plan/refine 阶段质量对齐

### Compatibility

- **NOT BREAKING**：CLI 命令签名、artifact graph 关系、schema.yaml 均未改动
- 老版本（0.1.0）生成的 `.specpower.yaml` 文件没有 `phase` 字段，向后兼容：读为 `undefined`，`change archive` 会把它当作"非 built"而拒绝（可用 `--force` 跳过）
- 已归档的变更（`openspec/changes/archive/*`）不受影响

### Migration

- 0.1.0 → 0.2.0 为 MINOR 升级，无破坏性变更
- 活跃未归档的变更：建议完成当前阶段、`specpower change archive --force` 归档后，再用新流程新建变更
- 新变更自动走新流程（`specpower change new` 产出含 `phase: plan` 的 `.specpower.yaml`）

## [0.1.0] - 2026-04-26

首个公开版本。SpecPower 是一个 Claude Code 插件 + CLI 工具，统一 OpenSpec（需求规划）和 Superpowers（工程执行）两个框架。

### Added

**10 个 Claude Code 技能命令：**
- `/specpower:scan` — 棕地项目扫描，生成 specs 基线
- `/specpower:plan` — 需求规划（proposal + delta specs）
- `/specpower:refine` — 技术方案探讨（brainstorming + design.md）
- `/specpower:build` — 两阶段 TDD 构建（计划生成 + subagent 执行）
- `/specpower:review` — 代码审查（含 specs 回归检查）
- `/specpower:test` — 多层测试 + 验证
- `/specpower:verify` — 双重校验（delta specs + 主 specs 回归）
- `/specpower:done` — 归档 + specs 合并 + git 分支清理
- `/specpower:fix` — Bug 修复快速通道
- `/specpower:snap` — 事后补档（git diff 反推）

**CLI 命令：**
- `specpower init` — 初始化项目（生成目录、技能、prompts、自动追加 .gitignore）
- `specpower change new/status/archive` — 变更生命周期管理
- `specpower validate` — Spec 格式校验
- `specpower instructions` — 查看 artifact 创建指令

**核心能力（移植自 OpenSpec）：**
- Artifact 依赖图（Kahn 拓扑排序）
- Delta spec 合并（ADDED/MODIFIED/REMOVED/RENAMED）
- Spec 格式校验（WHEN/THEN scenario、4 级标题）
- 归档工作流（递归扫描子目录 delta specs）

**编排与执行（改写自 Superpowers）：**
- 渐进 prompt 加载（SKILL.md 编排器 + 按需 Read prompts）
- Hard gate 双重保障（SKILL.md 和 prompts 两层）
- brainstorming 9 步流程（多方案 + 推荐）
- TDD 红-绿-重构严格顺序
- 两阶段 subagent review（spec 合规 → 代码质量）
- 系统化调试（调查 → 模式 → 假设 → 实现）

**架构特性：**
- CLI 自动向上查找项目根（类似 git 找 `.git/`）
- init 幂等性 + 智能 .gitignore 追加
- 友好的 CLI 错误提示（无堆栈跟踪暴露）
- 零 AI 逻辑在 CLI 层（确定性与编排分离）

### Validation

发布时的质量基线：
- 119 个单元/集成测试全过
- 23 个测试文件覆盖 CLI / 核心运行时 / 集成路径
- 在真实项目（notecli）端到端验证了 5 个主要技能
- 零个已知的 Critical 或 Important 缺陷

[Unreleased]: https://github.com/bstzyf/specpower/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/bstzyf/specpower/releases/tag/v0.2.0
[0.1.0]: https://github.com/bstzyf/specpower/releases/tag/v0.1.0
