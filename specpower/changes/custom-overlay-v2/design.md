# Design — custom-overlay-v2

> First-iteration design. `/specpower:refine` will challenge these decisions across multiple rounds. A 阶段代码已实现并验证（16 测试通过），本设计记录决策 rationale 供 refine 深化。

## 1. Context

`customization-layer` change（phase=built，未归档）交付了 custom 叠加层：包根 `custom/{coding,review}/` 经 `copyCustom` 复制到项目 `specpower/custom/`（gitignored、sync 覆盖），4 个 prompt 注入"存在性守卫段"让 subagent 自读。实测暴露两处技术缺口：

- **subagent 不读**：守卫段"If `specpower/custom/...` exists, Read all .md"把读取责任丢给 subagent（LLM），subagent 把"if exists"当可选、跳过；且违反 `phase-b-execute.md` 自己的"Never: Make subagent read plan file (provide full text instead)"。
- **worktree 物理缺失**：`specpower/custom/`（及 `.claude/specpower/prompts/` 等）被 gitignore，git worktree 只含已跟踪文件，Phase B worktree 里 custom 根本不在。
- **不能复用项目文档**：custom `.md` 不能引用 `docs/coding-style.md`、ADR 等既有文档，只能复制粘贴。

A 阶段已实现修复（`src/cli/commands/custom-bake.ts` + 4 占位符 + init/sync 接入 + worktree sync），16 单测 + 端到端通过。本 change 将其 spec 化、并调整 `include-roots` 默认含 `docs/`。

技术约束：TypeScript CLI（commander + js-yaml）、vitest、prompts 是静态 md 文件（无运行时模板引擎）、custom 是项目 cwd 相对路径（tool-agnostic，不被 `rewritePromptRefs` 重写）。

## 2. Goals / Non-Goals

**Goals**
- custom 规则**必然**进 subagent prompt 文本（不靠 subagent 自觉读、不依赖 cwd/worktree）
- 支持 `!include` 复用项目既有文档（coding-style、ADR、架构图），不复制粘贴
- worktree 模式下 controller 能读到 prompt 与 custom（gitignored 资产可达）
- 不新增 CLI 命令（复用 `init`/`sync`）
- `!include` 展开确定性、可单元测试（TS，非 LLM）

**Non-Goals**
- 不加项目级叠加目录（如 `specpower/local/`）——项目级定制通过团队约定项目在某目录（如 `docs/rules/`）放规则 + `!include` 引用实现，递归展开进 prompt，不需单独目录
- 不扩展 `!include` 语法（不支持变量、条件、循环宏）——只整行 `!include <path>`
- 不在 user scope 分发 custom——custom 仍 project scope
- 不让 controller 运行时解析 `!include`——展开只在 init/sync 烘焙时做

## 3. Design Decisions

### D1: custom 投递机制 — sync 烘焙 custom 进 prompt 占位符

**Options considered:**
- (a) subagent 自读（原始）：守卫段"if exists, subagent read"。失败——subagent 跳过可选读 + worktree 缺失 + 违反 provide-full-text。
- (b) controller 内联占位符：controller dispatch 前读 custom 填占位符。规则进 prompt，但依赖 controller（LLM）遵守。
- (c) 新增 `specpower custom show` CLI 命令：最可测但增命令（否决）。
- (d) sync 烘焙 custom 进 prompt 占位符：sync 时读 custom（已 `!include` 烘焙）替换 prompt 文件副本的 `[CONTROLLER: ...]` 占位符为实际规则文本。controller/subagent 读 prompt 即得规则。无 LLM 依赖（确定性 TS）。

**Chosen:** (d) sync 烘焙 custom 进 prompt 占位符。

**Rationale:** 消除 controller 内联的 LLM 依赖（主路径确定性）——sync 读 `specpower/custom/{coding,review}/` 顶层 `.md`（字典序，已 `!include` 烘焙），替换对应 prompt 文件副本的 `[CONTROLLER: ...]` 占位符为实际规则文本，controller/subagent 读 prompt 文件即得规则，不靠 LLM 运行时填。符合 specpower"确定性优先、不靠 LLM 自觉"原则，比 (b) 的"controller 读+填"更可靠。

**映射**（sync 烘焙时，4 处）：
- `specpower/custom/coding/` → `prompts/shared/implementer-prompt.md` 的 `Project Coding Standards` 占位符、`prompts/shared/receiving-code-review.md` 的占位符
- `specpower/custom/review/` → `prompts/shared/code-reviewer-prompt.md` 的 `Custom Standards` 占位符、`prompts/review/code-review.md` 的 template 占位符

**代价**：sync 要硬编码 4 处映射；prompt 副本含项目 custom 内容（调试时 prompt 不"纯净"，看 prompt 会看到项目规则而非纯模板）；custom 改了要 sync 才进 prompt（但本来就要 sync 烘焙 `!include`，一致）。**约束（固化快照）**：sync 烘焙是时间点快照——sync 后若被 `!include` 引用的项目文档（如团队约定项目在 `docs/rules/` 放的项目级规则）发生变更，prompt 里仍是旧快照，系统不感知，需重新 `specpower sync` 才更新。项目级定制通过"团队约定项目目录 + `!include`"支持（不需单独目录），但其变更需 re-sync 才进 prompt，这是 (d) 确定性固化的固有约束。

**best-effort 兜底链（保留 D9 + D11）**：(d) 是确定性主路径，但若 sync 没跑/烘焙失败，D9（subagent 自检 prompt 含字面 `[CONTROLLER:` → 报告 DONE_WITH_CONCERNS）+ D11（controller 检测 custom `!include` 残留 → 警告 sync）双层兜底，把"sync 没跑/失败"暴露给用户。D9/D11 不删、不简化——即使主路径确定性，兜底仍保留以覆盖 sync 未执行/失败的场景。

### D2: `!include` 展开时机 — init/sync 烘焙（非运行时）

**Options considered:**
- (a) controller 运行时展开：dispatch 前解析 `!include`。不可测（LLM）、循环/沙箱/大小无法保证、worktree 仍需 custom 在。
- (b) init/sync 烘焙时展开（原地写回 `specpower/custom/`）：确定性 TS、可单测、worktree sync 后一致、controller/subagent 不感知 include。
- (c) 烘焙到独立副本目录：避免改原文件。但 controller 已读 `specpower/custom/`，多一层副本增加路径混乱。

**Chosen:** (b) init/sync 烘焙原地写回。

**Rationale:** `specpower/custom/` 是 gitignored 的可再生副本（sync 清空再拷），原地烘焙不破坏源（源是包根 `custom/`）。烘焙后 controller 读到的就是纯文本，无需感知 include。`copyCustom` 之后立即 `bakeCustomIncludes`，一次 sync 完成复制+烘焙。

### D3: include 路径基准 — 相对项目根

**Options considered:**
- (a) 相对 include 所在文件目录（C `#include` 惯例）：自包含。但 custom 在 `specpower/custom/coding/`，引项目根 `docs/` 要 `../../../docs/x.md`，写起来烦。
- (b) 相对项目根：`!include docs/coding-style.md`、`!include arch/adr-007.md` 最直观。custom 互引用 `specpower/custom/review/shared.md` 也稳定。worktree 里"项目根"= worktree 根，一致。

**Chosen:** (b) 相对项目根。

**Rationale:** 主场景是复用项目文档，相对项目根最直观、最短。custom 整体在 `specpower/custom/` 下，相对项目根路径稳定（custom 移动不影响）。绝对路径一律拒绝（不可移植、跨项目不一致）。

### D4: include 失败策略 — 全抛错中断

**Options considered:**
- (a) 全抛错中断：所有失败（target 缺失、越界、循环、超限、坏扩展名、绝对路径、目录）抛错中断 sync，报文件名+行号+原因。
- (b) 全降级：所有失败降级为注释。宽松，但掩盖配置错误。
- (c) 软+硬（缺失/越界降级注释，结构错误抛错）：曾选，但降级隐藏问题。

**Chosen:** (a) 全抛错中断。

**Rationale:** 显式报错优于隐藏问题。降级注释让 sync"成功"，用户不知道 custom 文档未生效（target 缺失/越界被静默跳过），后续 build/review 行为异常时要花大量时间回溯定位"为什么规则没起作用"——而问题其实在 sync 时就该暴露。一开始就抛错，用户立即知道哪个 `!include` 坏了（文件名+行号+原因），修复成本最低。这是 fail-fast 原则，与 specpower 一贯的"不静默"（占位符缺失写 `none`、build 前 `!include` 残留警告）一脉相承。default roots 已最宽（`specpower/+docs/+arch/+design/`），常见 include 不越界；越界/缺失是真错误（团队契约：消费项目应有被 include 的文档），抛错让契约违反显式。**trade-off**：消费项目缺文档时 sync 崩——但这正是要暴露的，不是要隐藏的。

### D5: include-roots 默认值 — `specpower/` + `docs/` + `arch/` + `design/`

**Options considered:**
- (a) 默认只 `specpower/`：项目用 `!include docs/x.md` 必须在 config 声明 docs/。多一步配置。
- (b) 默认 `specpower/` + `docs/`：团队直接 `!include docs/coding-style.md` 免声明。docs/ 是约定俗成的文档目录。
- (c) 默认 `specpower/` + `docs/` + `arch/` + `design/`：多含 arch/（ADR 常用）、design/（设计文档常用），覆盖最常见的项目文档目录名。
- (d) 默认含更多（wiki/、doc/ 等）：猜测性强，匹配不上真实布局反而误导。

**Chosen:** (c) 默认 `specpower/` + `docs/` + `arch/` + `design/`。

**Rationale:** docs/、arch/、design/ 是最常见的项目文档目录约定，默认含它们让团队复用项目文档"开箱即用"。这些目录不存在时 include 降级注释，不强求项目有；项目仍可在 config 追加/覆盖（如 `wiki/`）。比只 docs/ 覆盖更广，比猜更多目录（wiki/doc）更稳——前三个是最通用的。

### D6: worktree gitignored 资产缺失 — phase-b-worktree setup 跑 `specpower sync`

**Options considered:**
- (a) worktree setup 复制 custom/（+ prompts/）进 worktree：要写复制逻辑，且 prompts 问题独立于 custom。
- (b) worktree setup 跑 `specpower sync`（已有命令）：复用现有复制+烘焙，一次解决 prompts/schemas/templates/custom 全部 gitignored 资产。
- (c) 让 controller/subagent 用 `git rev-parse --git-common-dir/..` 读主项目根：每个 subagent 解析主项目根，脆弱。

**Chosen:** (b) worktree setup 跑 `specpower sync`。

**Rationale:** sync 已是现成的"复制 gitignored 资产到 cwd 项目"机制，worktree 里跑一次即把所有资产（含烘焙后的 custom）带进 worktree。不增命令、不增复制逻辑、inline/worktree 行为一致（都读 cwd 相对的 `specpower/custom/`）。守卫：仅当 `specpower/config.yaml` 存在 + `specpower` 在 PATH 时跑，否则静默跳过（非 specpower 项目或未装 CLI 不报错）。

### D7: 循环/菱形语义 — 循环检测栈 + per-top-level-file once 去重

**Options considered:**
- (a) 循环检测 + 每次展开（菱形/跨文件都重复）：简单。但规则文档重复内容。
- (b) 循环检测栈 + **全局** once 去重：曾选，但有 bug——`coding/01.md` 和 `review/01.md` 都 `!include` 同一 `shared.md` 时，coding 先展开（seen 记录），review 遇 shared 被 once 跳过 → **review/01.md 的 shared 内容为空**，reviewer 拿不到规则。once 的本意是单文件菱形去重，不是跨文件去重。
- (c) 循环检测栈 + **per-top-level-file** once 去重：每个 `specpower/custom/{coding,review}/*.md` 顶层文件独立展开（新建 seen/stack），`totalBytes` 全局。shared.md 在 coding/01 和 review/01 各展开一次（两处都完整）。once 仅在单文件菱形内生效（A→B,C; B,C→D，D 在 A 里只展开一次）。

**Chosen:** (c) per-top-level-file once 去重。

**Rationale:** once 的语义边界是"单次展开一棵 include 树"——每个顶层 custom md 是一棵独立的树，各自去重。跨文件/跨 kind 不去重：不同 prompt（implementer vs reviewer）各自需要完整规则，跨文件共享 seen 会导致后展开的文件缺失。`totalBytes` 仍全局（防总量爆）。**故意重复**场景：若团队想强调某规则，应直接在 md 里写内容或用不同文件名，而非 `!include` 同一文件两次（per-file once 会吞掉同一文件内的第二次）——文档（`custom/README.md`）说明此约定。

### D8: 大小/扩展名硬约束 — 限制

**Options considered:**
- (a) 不限：include 任意文件。风险——`!include package-lock.json`（MB）或二进制爆 prompt、secrets 进 prompt。
- (b) 限制：单文件 64KB、总 256KB、扩展名白名单 `.md/.txt/.yaml/.yml/.json`。

**Chosen:** (b) 限制。

**Rationale:** custom 是规则层（文本规则），不是代码/数据引用层。限制防爆 prompt、防二进制、防 secrets（`.env`/`.key` 不在白名单）。白名单优于黑名单（黑名单必漏）。

### D9: sync bake 未执行的兜底 — subagent 自检占位符残留

**Options considered:**
- (a) 无兜底：若 sync 没跑/烘焙 prompt 占位符失败，prompt 留字面 `[CONTROLLER:` 文本，subagent 行为未定义（可能当规则文本）。
- (b) subagent 自检占位符残留：占位符段加"若收到的 prompt 含字面 `[CONTROLLER:` 文本（sync bake missing），报告 DONE_WITH_CONCERNS"。让 subagent 把"sync 没烘焙"变显式 concern。
- (c) controller 预检占位符残留：与 D11 同款，重叠。

**Chosen:** (b) subagent 自检占位符残留。

**Rationale:** (d) 下主路径是 sync 确定性烘焙 prompt 占位符（D1），但若 sync 没跑/烘焙失败，prompt 留字面 `[CONTROLLER:`。D9 给 subagent 检测路径——若收到 prompt 含字面占位符，报告 DONE_WITH_CONCERNS（sync bake missing）。把"sync 没跑/失败"从静默变显式 concern，与"缺失写 none 而非静默"一脉相承。**风险**：D9 依赖 subagent（LLM）遵守"看到字面占位符则报告"指令，非 100% 必然；但这是 best-effort 兜底（主路径 D1 确定性，D9 兜底 sync 失败），与 D11（controller 检测 `!include` 残留）构成双层兜底（D9 subagent 层、D11 controller 层）。

### D10: worktree sync 不 stamp config — 语义"worktree sync 不改 config version"

**Options considered:**
- (a) 现状：worktree sync 正常 `stampVersionInConfig` → 改 worktree 的 `specpower/config.yaml` version 行 → 污染 worktree git diff（config.yaml 进 git）。
- (b) worktree sync 跳过 stamp：worktree 是临时实现环境，config version 应跟主项目，不需 stamp。
- (c) stamp 到 worktree-local 不进 git 的 config：多一个 config 副本，复杂。

**Chosen:** (b) worktree sync 跳过 stamp。

**Rationale:** worktree 是为 build Phase B 实现隔离的临时环境，其 `config.yaml` 是主项目 config 的 git 跟踪副本。sync 在 worktree 跑只为重新生成 gitignored 资产（prompts/custom 等），不该改 config 的 version 行（那会污染 worktree 的 git diff，与实现改动混在一起）。**实现路径（build Phase A 选一）**：(i) phase-b-worktree 跑 sync 后 `git checkout -- specpower/config.yaml` 还原 version 行；(ii) sync 加 `--no-stamp` flag，phase-b-worktree 调 `specpower sync --no-stamp`；(iii) sync 内检测 worktree（`git rev-parse --git-common-dir` 与 `--show-toplevel` 不一致）自动跳过 stamp。refine 先定语义"worktree sync 不 stamp config"。

### D11: custom 过期检测 — build 前检查 `!include` 残留

**Options considered:**
- (a) 现状：无检测。custom md 可能含上次烘焙的过期文本（团队改了包源 `!include` 但消费项目没 sync）。
- (b) build 前 controller 检查 `!include` 残留：若 `specpower/custom/` md 仍含 `!include` 字样（说明上次 sync 未烘焙/失败/未跑），controller 警告"run specpower sync"。
- (c) config stamp custom 烘焙版本，build 比对版本：重，多一个版本字段。

**Chosen:** (b) build 前检查 `!include` 残留。

**Rationale:** (d) 下主路径是 sync 烘焙（先 `!include` 烘焙 custom，再烘焙 custom 进 prompt 占位符），但若用户改了包源 custom 后没 sync 项目，controller build 前检测 `specpower/custom/` md 含 `!include` 残留（说明 custom `!include` 烘焙没跑/失败）→ 警告 run sync。D4 全抛错下，成功 sync 的 custom 无 `!include` 残留（失败则抛错中断，不产生降级注释），残留 = 未 sync，是明确信号。cheap 检查，把"忘了 sync"从静默（用过期烘焙文本）变可见。与 D9 构成双层兜底（D9 subagent 层检测 prompt 占位符残留、D11 controller 层检测 custom `!include` 残留）。

## 4. Risks / Trade-offs

- **sync 烘焙 4 处映射维护**：(d) sync 烘焙要硬编码 prompt-占位符 ↔ custom 映射（coding→`implementer-prompt.md`+`receiving-code-review.md`；review→`code-reviewer-prompt.md`+`code-review.md`）。新增/改名 prompt 占位符时映射要同步更新。缓解：映射集中在一处（`custom-bake.ts` 常量），测试覆盖 4 处。
- **烘焙在 sync，custom/项目文档变更需 re-sync（snapshot 约束）**：sync 烘焙是快照——团队改包源 `custom/` 的 `!include` 或项目被 include 的文档（如 `docs/rules/`）变更后，消费项目要 re-sync 才进 prompt。缓解：sync 是 specpower 标准刷新流程；`custom/README.md` 明确 snapshot 约束；D11 检测 `!include` 残留（sync 没跑/失败）兜底，D9 检测 prompt 占位符残留（sync bake 失败）兜底。
- **default include-roots 假设**：默认含 `specpower/+docs/+arch/+design/` 是约定，非所有项目用这些目录名。缓解：这些目录不存在时 `!include` 抛错（fail-fast，target missing），用户改 config 声明实际目录；非 default 目录由 config 声明。
- **`specpower/custom/` 与 prompt 副本烘焙改了 gitignored 副本**：烘焙写回 `specpower/custom/`（`!include` 展开）+ prompt 副本（占位符替换），都是 gitignored 可再生副本，不碰包根源。但若用户直接改项目 `specpower/custom/`（违背"项目不自写"）会被下次 sync 覆盖。缓解：文档强调 `specpower/custom/` 是镜像、`!include` 写在包源；项目级定制通过团队约定项目目录（如 `docs/rules/`）+ `!include` 而非写 `specpower/custom/`。

## 5. Migration Plan

非完全 greenfield——`customization-layer` change 已交付原始机制（subagent 自读），A 阶段已改为 controller 内联 + include（代码已实现）。本 change 是 spec 修订（让 specs 反映 controller 内联 + include 的既成事实）+ `include-roots` 默认加 `docs/` 的代码调整。

- 现有 `specpower/custom/` 无 `!include` 的项目：烘焙原样保留，无行为变化。
- `include-roots` 默认加 `docs/`：之前 config 未声明 roots 的项目，`!include docs/x.md` 从越界降级变为展开成功（若 docs/x.md 存在）。这是行为改进，不破坏。
- `customization-layer` change 的 delta specs 仍写"subagent 自读"，与本 change 冲突——归档顺序需先归档 `customization-layer`（原始），再归档 `custom-overlay-v2`（MODIFIED 改成 controller 内联），或废弃 `customization-layer` 合并到 `custom-overlay-v2`。`/specpower:done` 阶段决定。

## 6. Open Questions

- ~~归档顺序~~（已解决）：废弃 `customization-layer` change（artifacts 落后代码、phase=built 但脱节），`custom-overlay-v2` 的 3 个 specs 全部 ADDED（main 空，本 change 首个引入这些 capability），成为唯一 change。
- `include-roots` 默认是否还应含 `arch/` 等其它约定目录，还是只 `docs/`？当前定 `docs/`，refine 可讨论。
- D10 worktree-sync-不-stamp 的实现路径（git checkout 还原 / `--no-stamp` flag / 自动检测 worktree）defer 到 build Phase A。
