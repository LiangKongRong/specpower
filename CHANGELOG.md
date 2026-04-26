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

[Unreleased]: https://github.com/bstzyf/specpower/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/bstzyf/specpower/releases/tag/v0.1.0
