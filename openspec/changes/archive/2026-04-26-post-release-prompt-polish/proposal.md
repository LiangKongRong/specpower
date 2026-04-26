## Why

v0.2.0 发布后用真实 Claude Code 会话跑 notecli-v4 端到端测试（plan→refine→build→done + fix + snap 全流程），发现 3 个问题：

- **B1 (P0)**：`/specpower:scan` 自 v0.1.0 起就没有 CLI 子命令实现，但 README 和 skill 列表按"已提供"方式宣传。新用户在棕地场景触发会撞 unknown-command，10 个 skill 里有 1 个是空壳。
- **B2 (P3)**：Phase A 生成的 `Verify:` 行可能给出运行时版本敏感的命令（典型：`node --test test/` 在 Node.js 20 对目录自动发现行为不稳定）。Writing-plans rigor 对"命令要可执行"有要求但没下沉到跨 runtime 的稳健性层面。
- **B3 (P3)**：`/specpower:verify` Pass 2 regression 在 `specpower/specs/` 不存在时静默通过，greenfield 项目看起来正常，但 brownfield 项目若 baseline 被误删会被同样静默放过，丢失回归保护。

v0.2.1 / v0.2.2 两次 patch 已经把这 3 个问题直接在 commit 层面修掉了（0.2.1 修 B2+B3, 0.2.2 修 B1）。本 change 是 **post-hoc 留档**：把修复内容用 openspec change 形式回溯成 spec trail，让主 specs 反映当前的实际承诺（不再声称 scan 可用，verify Pass 2 明确 skip 语义，build Phase A 明确 portable Verify 要求）。

## What Changes

- **`/specpower:scan` 降级为 v0.3 规划中**：SKILL.md 重写为「PLANNED — not yet functional」，触发时告知用户 v0.3 计划 + 给出 v0.2.x 下的替代流程（直接进 `/specpower:plan` 描述已有行为 + 新变更）。主 specs 里 scan capability 的 SHALL-级 Requirement 改为"延后至 v0.3"，并新增描述 PLANNED-advertisement 行为的 Requirement
- **`/specpower:verify` Pass 2 规则加 baseline-aware**：主 specs 的 regression Scenario 改为"有 baseline 则对照检查；无 baseline 则明确输出 `skipped (no baseline)` 并在最终 report 原样呈现，不得折叠进 pass 小结"
- **`/specpower:build` Phase A 新增 Portable Verify 要求**：Phase A 生成的 `Verify:` 行必须用项目声明的 test script（`npm test`、`pytest`、`cargo test` 等）或显式写出 runner 的发现行为，禁止 runtime-version-dependent 调用
- README 5 处 scan 引用标「规划中 · v0.3」；tagline 从 "scan 建基线..." 改为 "plan 想清楚..."；"场景 2：接手已有项目" 改写为直链 plan→refine→build→done

## Capabilities

### New Capabilities

<!-- 无 -->

### Modified Capabilities

- `specpower-scan`: 从"可用 SHALL"降级为"PLANNED v0.3"；新增 PLANNED-skill advertisement 行为契约
- `specpower-verify`: Pass 2 regression 改为 baseline-aware，明确 `skipped (no baseline)` 的必备输出
- `specpower-build`: Phase A writing-plans rigor 新增 Portable Verify 要求，禁止 runtime-version-dependent 命令

## Impact

- **文件层面**：`skills/specpower-scan/SKILL.md`（已改）、`skills/specpower-verify/SKILL.md`（已改）、`prompts/build/phase-a-plan.md`（已改）、`README.md`（已改 5 处）、`CHANGELOG.md`（已加 0.2.1 / 0.2.2 段）、主 specs 3 个 capability（本 change archive 时合入）
- **行为层面**：CLI 无改动、schema.yaml 无改动、其他 7 个 skill 无改动、143 tests 全绿
- **发布层面**：已在 npm 发了 v0.2.1 和 v0.2.2；本 change 是 post-hoc 留档，不触发新发版
- **用户层面**：新用户从 v0.2.2 拿到的 README 不再误导，`/specpower:scan` 触发时会看到 PLANNED 提示而不是 unknown-command 错
