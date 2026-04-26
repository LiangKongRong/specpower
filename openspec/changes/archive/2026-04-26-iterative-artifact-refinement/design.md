## Context

specPower v0.1.0 已发布到 npm。当前三阶段工作流（plan → refine → build）采用**线性追加**模式，每阶段产出一种新 artifact：
- plan 产 proposal + specs（浅层 AI 猜测）
- refine 只产 design.md（不能修正上游 artifact）
- build Phase A 首次产 tasks.md（writing-plans 作用被稀释）

这违反了核心原则"每轮深度思考 + 多轮迭代"。本次重构改为**深度迭代精化**模式：plan 是"第一轮深度思考"产出全部 4 个 artifact，refine 是内部自动多轮循环的"攻击性深度审查"（至少 2 轮），build Phase A 基于稳定 artifact 用 writing-plans 严格重写。

设计受 OpenSpec opsx:propose（一次生成全 artifact）和 Superpowers brainstorming（9 步结构化流程）双重启发。

## Goals / Non-Goals

**Goals:**

- plan 阶段一次产出全部 4 个 artifact，每个都是实质的"第一轮深度思考"（不是占位骨架）
- refine 阶段是**内部自动多轮循环**的攻击性审查（至少 2 轮 + AI 语义收敛 + 不设上限）
- refine 真正整合 Superpowers brainstorming 9 步流程 + 4 个明确挑战行为（挑战假设 / 提新 options / 探边界 / 质疑 scope）
- refine 可更新任意 artifact（proposal/specs/design/tasks），更新前做**影响分析**让用户选范围
- build Phase A 用 writing-plans 严格规则**重写** tasks.md，允许分组重组（需用户确认），遇到 design 缺漏**回 refine**
- `.specpower.yaml` 加 `phase` 字段追踪阶段，archive 要求 `phase=built`（`--force` 例外）
- 保持 CLI、schema.yaml、artifact graph 不变（NOT BREAKING）

**Non-Goals:**

- 不引入新的 artifact 类型（仍是 proposal/specs/design/tasks）
- 不改 artifact graph 的 generates/requires 关系
- 不强制数量化门槛（"至少 N 个决策"）——质量由 prompt + 参考样本 + 用户审查共同保证
- 不做自动 commit（refine 更新文件后由用户 review + commit）
- 不处理多 change 并行场景（单 change 线性推进）

## Design Decisions

### Decision 1: plan 骨架的"厚度"——深度第一轮还是纯占位？

**Options considered:**

1. 纯占位版：design/tasks 只有标题 + "TBD，在 refine 填"
2. **深度思考第一轮版**：AI 基于 proposal+specs 做第一轮完整思考，产出实质内容
3. 完整版：plan 就把所有决策写完，refine 只微调

**Chosen:** 2 — 深度思考第一轮版

**Rationale:** 纯占位版（选项 1）用户看到文件无价值，跟没有文件一样；完整版（选项 3）把 refine 的价值掏空了。选项 2 符合"每轮都深度思考"的核心原则——plan 是第一轮深度，refine 是第二轮深度+用户对齐，不是"骨架 vs 填充"的关系，而是"v1 vs v2"的关系。

### Decision 2: plan 阶段的验收标准——量化门槛还是语义指引？

**Options considered:**

1. 严格量化：design 至少 2 个决策带 options、Risks ≥2、tasks 5-8 分组
2. **语义指引 + 用户审查**：prompt 强指令 + 引用已归档 design 作为参考样本 + HARD GATE 用户审查把关
3. 不设任何约束：信任 AI

**Chosen:** 2 — 语义指引 + 用户审查

**Rationale:** OpenSpec opsx:propose 的原版设计就是这种哲学——它没有"至少 N 个决策"这种门槛，靠的是清晰的 instruction + template + HARD GATE 用户审查。量化门槛（选项 1）会鼓励 AI 凑数（写 2 个敷衍的决策交差），把质量等同于数量。真正的质量应该由**语义上的深度指令**（"identify the real architectural decisions"）+ **参考样本**（archived `create-specpower-plugin/design.md`）+ **用户能说"这个 design 太空洞"打回重做**共同保证。

### Decision 3: refine 的轮数与收敛判据

**Options considered:**

1. 单次 invoke 单轮（现状）
2. 多次 invoke，每次一轮，用户决定再 invoke
3. **单次 invoke 内部自动多轮，至少 2 轮，AI 语义判断收敛，不设上限**
4. 单次 invoke 内循环，每轮用户确认是否继续

**Chosen:** 3

**Rationale:** 选项 1 违反"多轮迭代"原则。选项 2 用户负担重。选项 4 打断思考节奏。选项 3 信任 AI 判断力（与 Decision 2 一致的哲学），至少 2 轮的下限保证深度（防 AI 早停），不设上限让复杂变更能充分深挖。如果后期发现 AI 自判不靠谱（总 2 轮就停），可以后续加上限。

### Decision 4: refine 如何保证真的"深"——4 个挑战行为

**Options considered:**

1. 在 prompt 里用模糊语言（"think deeply"）
2. **要求 4 个明确行为（挑战假设 / 提新 options / 探边界 / 质疑 scope）每轮都做**
3. 拆成子阶段：子阶段 1 独立审查报告，子阶段 2 讨论改
4. 完全开放靠 brainstorming 9 步自然带出

**Chosen:** 2

**Rationale:** 模糊语言（选项 1）AI 容易敷衍。子阶段（选项 3）太机械。完全开放（选项 4）做得浅不浅靠运气。4 个明确行为（选项 2）给 AI 一个**可执行的深度清单**——它必须显式完成这 4 件事才能进入下一步。这 4 个行为是从用户自己的表达中提炼出来的，精准反映他对 refine 价值的期望。

### Decision 5: refine 级联影响怎么处理

**Options considered:**

1. AI 自动处理所有级联（不问用户）
2. AI 只改当前讨论到的文件，级联改等用户下轮明确提出
3. **AI 做影响分析 → 用户选择本轮范围（A 全做 / B 只主件 / C 推迟）**

**Chosen:** 3

**Rationale:** 自动全改（选项 1）是黑盒，用户可能没察觉改了多少，diff 爆炸。只改当前（选项 2）用户得多轮凑齐级联，低效且容易漏。影响分析 + 用户选择（选项 3）把**决策权**留给用户，AI 负责**提供完整信息**。这也契合 refine 的多轮循环机制——选 B/C 推迟的部分会在下一轮被 loop 捡回来。

### Decision 6: 讨论过程要不要留在 artifact 里

**Options considered:**

1. 不留，chat 过完消散
2. **写进 design.md 的 Decisions 段落**（每个决策带 options 对比 + rationale）
3. 分离存储到 decisions-log.md

**Chosen:** 2

**Rationale:** 不留（选项 1）失去可追溯性，后来人读 design 看不到"为什么选 X"。分离存储（选项 3）维护成本高，读者要两个文件。写进 Decisions 段落（选项 2）对齐我们已归档的 `create-specpower-plugin/design.md` 风格——那个 design 的每个决策都带 options 和 rationale，阅读性好，单一数据源。

### Decision 7: build Phase A 分组重组怎么处理

**Options considered:**

1. 硬性保留 plan/refine 的顶层分组
2. **允许重组，必须明确报告让用户选（接受 / 保留旧 / 手动调）**
3. 默默重组，git diff 自然反映

**Chosen:** 2

**Rationale:** 硬性保留（选项 1）丢失 writing-plans 可能发现的更好组织方式。默默重组（选项 3）让用户意外。明确报告 + 用户选择（选项 2）把"建议的改组"也视为一个需要用户参与的决策，和整个迭代精化哲学一致。

### Decision 8: build Phase A 发现 design 缺漏怎么办

**Options considered:**

1. 严格忠实 design，缺漏就忠实地留空
2. **检测到缺漏就停，回 refine 补决策（refine 可改任何 artifact）**
3. Phase A 自己补决策（快速但越权）

**Chosen:** 2

**Rationale:** 严格忠实（选项 1）会产出有洞的 tasks。自己补决策（选项 3）违反"决策属于 refine"的边界，用户没有参与讨论。回 refine（选项 2）最干净——承认 refine 不是一次性的，build 阶段可以触发新一轮 refine（可能 refine 会改 design/specs/proposal/tasks 任一），完成后再继续 Phase A。这是一个自然的**循环**，不是失败。

### Decision 9: 骨架/草稿的 marker 放在哪里

**Options considered:**

1. 文件内 HTML 注释（"<!-- Draft -->"）
2. 改措辞的内嵌注释（"Initial deep analysis"）
3. **放 `.specpower.yaml` 元数据 `phase` 字段**

**Chosen:** 3

**Rationale:** 文件内注释（选项 1/2）污染内容。放元数据（选项 3）文件本身纯净，系统能机械查询"这个 change 到哪个阶段了"，并能用在 CLI 门禁（archive 要求 phase=built）。附带好处：phase 字段天然服务于 `specpower change archive` 的合法性检查，防止用户跳过 refine/build 直接归档。

### Decision 10: refine 真正整合 Superpowers brainstorming

**Options considered:**

1. 挂名引用但不实质使用（现状）
2. **真正把 9 步流程作为 refine 每轮的骨架，在"检查已有"和"澄清问题"步骤注入 4 个挑战行为**
3. 自创流程不用 brainstorming

**Chosen:** 2

**Rationale:** specPower 的初衷就是整合 OpenSpec + Superpowers，挂名不整合违反项目承诺。自创流程（选项 3）丢失 Superpowers 已验证的方法论价值。真正整合（选项 2）让 refine 继承 brainstorming 9 步的节奏（examine → clarify → propose approaches → present → write → self-review → approve → next-step），同时通过 4 个挑战行为把"从零 brainstorming"适配到"挑战已有 artifact"的场景。实现上需要显著重写 `prompts/refine/brainstorm.md`（现在是"从零"版本）。

### Decision 11: 一次做完 vs 分小版本

**Options considered:**

1. **一次做完发 0.2.0**
2. 分三小版本（0.2.0 plan → 0.3.0 refine → 0.4.0 build）
3. next 分支并行开发

**Chosen:** 1

**Rationale:** 分小版本（选项 2）有中间状态不自洽的问题——比如 0.2.0 有 plan 骨架但 refine/build 不匹配新格式。next 分支（选项 3）增加维护成本。一次做完（选项 1）把新流程作为一个完整 delivery，测试和文档一次到位。工作量大但风险可控（都已经在 design.md 和 specs 里想清楚了）。

## Risks / Trade-offs

**[R1] plan 的"第一轮深度思考"可能偏离用户真实意图。** plan 只有 AI 基于 proposal 做思考，没有用户实时对齐。如果用户描述有歧义，AI 的深度思考方向可能跑偏。缓解：refine 第一轮的"挑战 plan 假设"行为会主动检查这个，用户有机会纠正方向。

**[R2] refine 多轮循环可能耗时过长。** 至少 2 轮 + 不设上限 + 每轮跑完 9 步 brainstorming + 4 个挑战行为，对复杂变更可能需要 30+ 分钟。缓解：(a) 每轮结束给用户清晰的进度汇报和"轮数 + 改了什么"，用户随时可打断；(b) 用户确认"可以收敛"的权重优先于 AI 判断；(c) 如后期用户反馈"太慢"，可以在 0.3.0 加可选的上限配置。

**[R3] build Phase A 回 refine 的循环可能卡住。** 如果 design 有多处缺漏，Phase A 频繁回 refine，用户在 refine/build 之间反复切换。缓解：Phase A 的缺漏报告必须**一次列出所有缺漏**（不是发现一个就停），让 refine 一轮把所有漏洞补齐。

**[R4] phase 字段破坏已归档变更的兼容性。** 老的 `.specpower.yaml` 没有 phase 字段，读取时可能报错。缓解：TypeScript 类型把 `phase` 定义为 optional，缺失时默认视为 `archived`（对归档目录里的文件）或 `plan`（对活跃目录里的文件）。`change status` 等命令自动兼容。

**[R5] Superpowers brainstorming 9 步原本是"从零"的，改造为"审查已有"可能语义不自然。** 比如"Step 1: Examine existing" 在 refine 语境下是"读 plan 产出"——这是自然的。但 "Step 4: Propose 2-3 approaches" 在已有 plan 决策的情况下是"对每个决策再提备选"——这是 refine 的核心挑战行为之一。缓解：重写 `prompts/refine/brainstorm.md` 时明确标注每个步骤在 refine 语境的含义，不让 AI 按"从零"模式跑。

## Migration Plan

- **0.1.0 → 0.2.0**：MINOR 升级。已在用 0.1.0 的项目升级后：
  - 活跃未归档的变更：建议完成当前阶段后归档（用 `--force` 如果 phase 字段缺失），然后新建 change 用新流程
  - 已归档的变更：不受影响（归档目录只读）
- **破坏性兼容**：`.specpower.yaml` 结构变更（加 phase 字段）——类型上是 optional，老文件缺失时按上下文推断（见 R4 缓解）

## Open Questions

- plan 阶段的 4 个 artifact 是否都要 HARD GATE？现在设计是 proposal 后有 gate，specs 后有 gate，design/tasks 连续生成不打断。refine 阶段有统一的用户审查。如果用户觉得 specs 生成完就想先讨论一下，需不需要允许跳出？当前决定不允许，refine 阶段可以讨论一切。
- `phase` 字段值是否还要更细？比如 `plan-proposal-done`、`plan-specs-done` 等。当前决定粗粒度（4 值）够用，后续有需要再细化。
- Phase A 回 refine 后，refine 是从"round 1"重新开始还是"续轮"？当前决定从 round 1 重新开始，因为回 refine 本身意味着有新的讨论起点（Phase A 发现的 gap）。
