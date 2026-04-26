<!-- Retroactive change. All tasks marked [x] because the work is already shipped in v0.2.1 and v0.2.2. This tasks.md exists so openspec status reports the change as complete; the real implementation record is the git log and CHANGELOG. -->

# post-release-prompt-polish Implementation Tasks

## 1. B2 — Portable Verify commands (shipped in v0.2.1)

- [x] 1.1 在 `prompts/build/phase-a-plan.md` 新增 "Portable `Verify:` commands" section，明确优先用项目声明的 test script（`npm test`/`pytest`/`cargo test`），runner 直接调用时要显式写出发现行为
- [x] 1.2 "No Placeholders (expanded)" list 新增一条：禁止 runtime-version-dependent runner 调用
- [x] 1.3 CHANGELOG.md 加 0.2.1 段记录本项修复
- [x] 1.4 npm release v0.2.1 + GitHub Release（commit `7b7247f`）

## 2. B3 — verify Pass 2 baseline-aware (shipped in v0.2.1)

- [x] 2.1 `skills/specpower-verify/SKILL.md` Prerequisites 改写：main specs 从 "MUST exist" 变 "OPTIONAL; if absent Pass 2 explicitly skipped"
- [x] 2.2 Stage 2 Pass 2 加 "Baseline-aware execution" 分支：baseline 存在则正常检查，不存在则输出 `Pass 2: skipped (no baseline — greenfield project or no archived changes yet)`
- [x] 2.3 Stage 3 Report 加规则：`skipped` 必须原样呈现，不得折叠进 pass 小结
- [x] 2.4 CHANGELOG.md 0.2.1 段合并记录
- [x] 2.5 与 1.4 同一 npm release（commit `7b7247f`）

## 3. B1 — scan 降级为 PLANNED v0.3 (shipped in v0.2.2)

- [x] 3.1 `skills/specpower-scan/SKILL.md` 重写为 "PLANNED v0.3 — not yet functional"：front-matter description 加 `[PLANNED v0.3]` 标签；SKILL body 指导 Claude 在触发时不要运行不存在的 `specpower scan`，而是给用户替代流程指引
- [x] 3.2 SKILL 保留 "Planned design (v0.3)" 段作为未来 v0.3 change 的参考
- [x] 3.3 README.md L8 tagline 去掉 "scan 建基线"（改为 "plan 想清楚..."）
- [x] 3.4 README.md L117 核心流程图标 "[规划中 · v0.3] ...当前请直接用 /specpower:plan"
- [x] 3.5 README.md L203 场景 2「接手已有项目」改写为直链 plan→refine→build→done（不再引导用户触发 scan）
- [x] 3.6 README.md L248 命令速查表格给 `/specpower:scan` 行加 "**[规划中 · v0.3]**" 并说明触发时 skill 会提示替代方案
- [x] 3.7 README.md L419 "code-review-graph 安装失败" 段改写：说明依赖是 v0.3 占位，v0.2.x 无需安装
- [x] 3.8 CHANGELOG.md 加 0.2.2 段
- [x] 3.9 npm release v0.2.2 + GitHub Release（commit `c58214b`）

## 4. 主 specs delta（本 change archive 时合入）

- [x] 4.1 写 `specs/specpower-scan/spec.md` delta：3 条既有 Requirement 全 MODIFIED 为 "PLANNED v0.3 behavior"，ADDED 一条 "Planned-skill advertisement"
- [x] 4.2 写 `specs/specpower-verify/spec.md` delta：MODIFIED "Dual validation" 的 Main specs regression Scenario 为 baseline-aware；ADDED "Baseline-aware Pass 2 execution" Requirement
- [x] 4.3 写 `specs/specpower-build/spec.md` delta：ADDED "Portable Verify command guidance in Phase A" Requirement
- [x] 4.4 `specpower validate` 每个 delta spec 文件 → exit 0

## 5. 归档

- [ ] 5.1 `openspec archive post-release-prompt-polish --yes` 合入主 specs 并移动 change 目录到 archive/YYYY-MM-DD-post-release-prompt-polish/
- [ ] 5.2 git commit 归档结果到 main
- [ ] 5.3 git push origin main

> Tasks 1-4 勾选表示**已在 git 历史里落地**（v0.2.1 commit `7b7247f` 和 v0.2.2 commit `c58214b` + 本 change 目录的 delta specs）。Task 5 由运行 `/opsx:archive` 时完成。
