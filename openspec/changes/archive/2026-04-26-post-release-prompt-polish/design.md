## Context

v0.2.0 发了 iterative-artifact-refinement 工作流重构后，做了一次**真实 Claude Code 会话端到端测试**（notecli-v4 fixture，10 个测试阶段 T0-T10 覆盖 plan/refine/build/review/test/verify/done/反向破坏场景/fix/snap）。这不是单元测试，而是从 npm 全新装 `specpower@0.2.0` 后，在真实 session 里按 SKILL.md 真实执行每一步、验证每个输出、记录所有摩擦点。

测试产出的核心价值是暴露了 3 个 v0.2.0 本身的单测无法发现的问题——它们都是"**SKILL 承诺 vs 实际行为**"之间的裂缝，只有真跑才能看到。

- B1：SKILL 列 10 个命令，1 个是空壳（scan）
- B2：Phase A prompt 生成的 Verify 行在真实 Node 20 环境里跑起来要额外改
- B3：verify Pass 2 对 greenfield 看起来没问题，但对 brownfield baseline 误删会静默

v0.2.1（B2+B3）和 v0.2.2（B1）两次 patch 已发 npm，commit 历史清晰。本 change 是**post-hoc 形式化**——把这些修复的设计理由留在 openspec trail 里，让主 specs 变成可信的"当前真实承诺"，而不是 v0.2.0 那份"混了没实现承诺"的版本。

## Goals / Non-Goals

**Goals:**

- 把 v0.2.1/v0.2.2 的修复内容沉淀到主 specs，让 `specpower-scan` / `specpower-verify` / `specpower-build` 的 Requirement 反映实际 v0.2.2 的承诺
- 显式降级 `specpower-scan` 的状态：从 "SHALL 扫描生成 baseline" 改为 "PLANNED v0.3 + 替代流程 advertisement"
- 为 `specpower-verify` Pass 2 建立 baseline-aware 契约，防止将来类似的静默放过 bug
- 为 `specpower-build` Phase A 增加 Portable Verify 要求，把"命令要可执行"从隐含规则升级为显式 Requirement
- 把 `post-release → 真实测试 → patch → 留档` 这套流程走一遍示范，证明 specpower 自身的工具链可以处理它自己的 post-release 维护

**Non-Goals:**

- 不重新实现 `specpower:scan`（那是 v0.3 的 change）
- 不改 CLI 代码（纯 prompt/文档/spec 层修补）
- 不改 schema.yaml、artifact graph、phase 状态机
- 不改其他 7 个 skill 的行为
- 不扩大 B2 的 Portable Verify 到其他语言的深度指引（只给 Node.js 和 pytest 两个示例，其他由用户按原则自推）

## Design Decisions

### D1: scan 的四个处置选项里为什么选 A（标规划中）

**Options considered:**

1. **A — 标规划中 v0.3**：SKILL 重写为 PLANNED 状态，触发时给替代流程指引；README 5 处加「规划中 · v0.3」标签
2. B — 做 stub CLI：`specpower scan` 出一个"列源文件 + 写空 SCAN_REPORT.md"的占位实现，让 SKILL 流程表面上跑完不撞墙
3. C — 真正实现 scan：扫描代码 + 推断 capability 边界 + 生成 specs 基线（4-8h 工作量）
4. D — 砍掉 scan：从 README / SKILL / 主 specs 里删除，承认这条 capability 本不该在 v0.1.0 就 ship

**Chosen:** A

**Rationale:** 
- 选项 B（stub）欺骗性更强——用户以为功能可用，实际产出没价值，等发现时比现在更失望；且 stub 会污染 archived change 的 delta specs baseline
- 选项 C（真正实现）超出本次 post-release 修复的 scope，应归 v0.3 change，独立规划
- 选项 D（砍掉）把既有 optional dependency `code-review-graph` 的清理动作也卷入，且 "planned for v0.3" 本身是正当的路线图信号
- 选项 A 的代价最小（纯 SKILL + README 文字改动），诚实呈现现状，给 v0.3 保留实现空间。同时 SKILL 在 PLANNED 状态里给的"替代流程"（直接进 plan 描述已有行为）实际可用，用户棕地场景不至于完全卡住

### D2: Portable Verify 指南放 prompt 层还是 SKILL 层

**Options considered:**

1. 放在 `skills/specpower-build/SKILL.md` 的 Phase A section
2. 放在 `prompts/build/phase-a-plan.md` 的 writing-plans rigor section
3. 抽出独立 `prompts/shared/portable-verify.md`，build/fix/snap 都引用

**Chosen:** 2

**Rationale:** SKILL 层只描述"如何编排"，prompt 层描述"如何执行"。Portable Verify 是执行细节（什么样的命令是合格的 Verify），属于 prompt 层。选项 3（共享 prompt）目前只 build Phase A 真在生成 Verify 行，fix 和 snap 的 TDD 步骤更依赖 Superpowers 的 tdd.md，暂不需要共享抽象——YAGNI。

### D3: Baseline-aware 规则放 SKILL 层还是 prompt 层

**Options considered:**

1. 放在 `skills/specpower-verify/SKILL.md` 的 Stage 2 Pass 2 描述
2. 放在 `prompts/verify/verification.md`
3. 两层都写，形成 defense in depth

**Chosen:** 1

**Rationale:** 看了现有 `prompts/verify/verification.md` 发现它是从 Superpowers 移植过来的通用"完成前必须验证"原则文档，不描述 specpower 特有的三-pass 协议。三-pass 本身就是 SKILL 层的协议，baseline-aware 规则是该协议的一部分，放 SKILL 最自然。选项 3 会让规则散布在两个文件里，维护时容易一个改一个漏。

### D4: 3 个修复打包成 1 个 change vs 3 个独立 change

**Options considered:**

1. **一个 post-release-prompt-polish change 包 3 个修复**
2. 分 B1 / B2B3 / B3 三个 change
3. 分 v0.2.1-patch 和 v0.2.2-patch 两个 change

**Chosen:** 1

**Rationale:** 这 3 个修复的共同性强过差异：
- 全部是真实端到端测试 T0-T10 发现的
- 全部是 prompt/文档/SKILL 文本层改动，零 CLI/schema/code
- 时间上都在 v0.2.0 发布后的同一轮 "post-release hardening"
- 合并成 1 个 change 在 openspec trail 里更清楚地呈现"测试 → 修复 → 留档"这条故事线

选项 2/3 会把同一个"发现-修复"闭环拆散，archive trail 里看起来是 3 次独立修补，丢失上下文。

### D5: Retroactive（先实现后留档）vs Prospective（先走 plan→build→done 再实现）

**Options considered:**

1. **Retroactive**：实现已经在 v0.2.1/v0.2.2 发了，本 change 用 snap-style 补 proposal/design/tasks/spec，tasks 全标 [x]
2. Prospective 回放：把代码 revert，重跑 plan→refine→build→done 一遍

**Chosen:** 1

**Rationale:** 选项 2 的代价（revert 发过的 npm 版本 / 重跑流程 / 重新 commit）远高于收益（一个"正确走流程"的演示）。而且这 3 个修复在发 patch 前就已经有充分上下文（端到端测试的 B1-B3 报告本身就是 de facto proposal），走 Retroactive 留档是诚实的——它承认"我们发现问题→快速 patch→再补 spec"这个真实路径，而不是粉饰成"我们从头规划好的"。

### D6: 要不要同时更新 scan 主 spec 里的 3 个已有 Requirement

**Options considered:**

1. 全部 MODIFIED：把"Brownfield project scanning via code-review-graph" / "Module-scoped incremental scanning" / "Scan output generation" 都降级为 "v0.3 planned"
2. 只 MODIFIED 第一个（核心 scanning），后两个保持原样作为 v0.3 的 expected behavior
3. REMOVE 所有 3 个，然后 ADD 一个新的 "PLANNED advertisement" Requirement

**Chosen:** 1

**Rationale:** 现在这 3 个 Requirement 全都在对用户说谎（system SHALL 扫描 / SHALL 分模块 / SHALL 产三个输出——没一个是真的在 v0.2.x 里 SHALL 发生的）。改都改，把每个的 WHEN/THEN 调成"在 v0.3 实现时"或"SKILL 在 PLANNED 状态下的替代行为"。选项 2（只改一个）会在 spec 里留下两个还在说谎的 Requirement。选项 3（REMOVE+ADD）丢失 v0.3 实现时的设计参考。

## Risks / Trade-offs

**[R1] v0.3 真做 scan 时要再起一个 change 反向迁移回"SHALL 实现"。** 本次把 scan Requirements 降级为 PLANNED 是诚实的，但 v0.3 要再开 change 把它升回 "SHALL scan"。*缓解：* 这正是 openspec 流程的常态——每个 change 对 baseline 做 delta，降级 + 升级都是合法 delta 操作；本 change 在 Requirement 里保留了 v0.3 planned behavior 的线索，方便未来 change 查阅。

**[R2] 打包成一个 change 让 archive diff 变大。** 3 个修复合并成一个 MODIFIED-heavy 的 delta，archive 时合入主 specs 的 diff 比单个修复大。*缓解：* 本来 D4 已经权衡过，共同性强过差异；archive diff 的可读性靠 proposal / design.md 的分节叙事来保证，不靠 delta spec 大小。

**[R3] 真实端到端测试方法没有沉淀为规范流程。** 本次发现 3 个 bug 靠的是一次一次性的"sim user"操作，如果没有人做类似测试，下次 release 类似 bug 还会漏。*缓解：* 这是 follow-up 问题，不在本 change scope 里；合适的方式是 v0.3 里加一个 `/specpower:e2e` skill 或一份 RELEASE-TESTING.md 模板。本 change 只做已发现 bug 的修复留档。

## Migration Plan

N/A — post-hoc 留档，无用户侧迁移动作。已在使用 v0.2.1/v0.2.2 的用户已经拿到修复后的 SKILL 和 README，本 change 只改 openspec trail，不改发布物。

## Open Questions

- 是否在本 change 里同时更新 `optionalDependencies.code-review-graph` 的 README 段落措辞？——**判断：已包含**在 B1 的 5 处 README 修改里（L419 故障排查段）。
- 是否给未来的 end-to-end 回放测试方法开一个 follow-up change？——**判断：不在本 change scope**；作为 v0.3 规划时的议题。
