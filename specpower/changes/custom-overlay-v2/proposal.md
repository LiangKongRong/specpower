## Why

**为什么需要 custom 层**（背景）：specpower 的 review/coding 规则硬编码在 `prompts/review/code-review.md` / `prompts/shared/implementer-prompt.md` / `receiving-code-review.md`。不同公司/项目有自己的规则（coding standards、命名约束、禁用 API、review checklist），但**没有注入点**——用户只能 fork 源码 → 破坏升级。需要 project-level customization layer：两个目录（生成侧 `coding/`、检视侧 `review/`）作为 overlay（额外维度，不替换内置 checklist）。让公司/团队产出**统一定制版本**——团队做完 coding/review 规则后分发到各项目，贯彻团队意志；custom 目录是团队定制包的一部分，随 sync 刷新、不进 git（与 prompts/schemas/templates 同为包级可再生资产）。

**custom 叠加层实测的两处缺口：**

1. **custom 规则静默地到不了 subagent。** 守卫段告诉 subagent"若 `specpower/custom/...` 存在，读所有 .md"——subagent 把"若存在"当可选、跳过读取；且 `/specpower:build` Phase B（worktree 模式）里 `specpower/custom/` 物理缺失（被 gitignore、worktree 不含）。结果：custom 规则从不生效。
2. **无法复用项目既有文档。** custom 的 `.md` 不能引用项目既有文档（coding-style、ADR、架构图），只能复制粘贴，随之失同步。

**本变更如何修复：** 把 custom 规则的解析从"subagent 运行时自读"改为 **controller 内联文本**、加 `!include` 烘焙时展开，两处一并修复。**团队在包源 `specpower/custom/` 的 `.md` 里定义要加载的文件**，可用 `!include` 引用项目既有文档（如 `docs/coding-style.md`），消费项目 `init`/`sync` 时烘焙展开。

## What Changes

- **controller 内联（取代 subagent 自读）。** 4 个守卫段（`prompts/shared/implementer-prompt.md`、`code-reviewer-prompt.md`、`prompts/review/code-review.md`、`receiving-code-review.md`）改为 `[CONTROLLER: ...]` 占位符。controller 在 dispatch subagent **之前**读 custom 规则并粘贴进占位符——规则物理进入 subagent prompt 文本，必然被执行。符合 subagent-driven-development 的"provide full text，绝不让 subagent 自己读文件"。
- **`!include` 烘焙时展开。** custom 的 `.md` 可用整行 `!include <相对项目根>` 复用项目文档。展开在 `init`/`sync` 烘焙时做（确定性 TS，非 LLM），递归进行，配循环检测、深度上限、once 去重、沙箱 allowlist、大小/扩展名硬约束。target 缺失或越界降级为可见注释（不中断——首次 init 时 config.yaml 还是骨架、roots 未声明）；结构错误（循环/超限/坏扩展名/绝对路径/目录）抛错中断。
- **沙箱白名单默认含 `docs/`。** `include-roots` 默认为 `['specpower/', 'docs/']`——`specpower/` 恒允许，`docs/`（项目根/docs）默认允许，方便团队直接 `!include docs/coding-style.md` 复用项目文档而无需项目在 config 声明。项目可在 `specpower/config.yaml` 的 `custom.include-roots` 追加更多目录（如 `arch/`）。
- **worktree setup 跑 `specpower sync`。** `phase-b-worktree.md` setup 加一步：若 `specpower/config.yaml` 存在，在 worktree 内跑 `specpower sync`，重新生成 worktree 缺失的 gitignored 资产（`custom/`、`prompts/`、`schemas/`、`templates/`）。

## Capabilities

### New Capabilities
<!-- 无新 capability。本变更是对既有 custom 叠加层投递机制的修复与增强。 -->

### Modified Capabilities
- `customization-layer`：custom 规则的投递从"subagent 自读 + 存在性守卫"改为 **controller 内联进 `[CONTROLLER: ...]` 占位符**；新增 `!include` 烘焙时展开（递归、沙箱、硬约束）；`include-roots` 默认白名单增加 `docs/`；`copyCustom` 不变，烘焙紧随其后。
- `specpower-build`：dispatch implementer 前，controller 读 `specpower/custom/coding/` 顶层 `.md` 并内联进 implementer prompt；`phase-b-worktree` setup 跑 `specpower sync` 在 worktree 重新生成 gitignored 资产。
- `specpower-review`：dispatch reviewer 前，controller 读 `specpower/custom/review/` 顶层 `.md` 并内联进 reviewer prompt。

## Impact

- **新增代码**：`src/cli/commands/custom-bake.ts`（`bakeCustomIncludes`，`!include` 展开器）。
- **修改代码**：`src/cli/commands/init.ts`（`copyCustom` 后调烘焙；`buildConfigYaml` 加 `custom.include-roots` 注释）、`src/cli/commands/sync.ts`（`copyCustom` 后调烘焙）。`DEFAULT_INCLUDE_ROOTS` = `['specpower/', 'docs/']`。
- **prompts**：4 个守卫段 → 占位符；2 个 orchestration prompt（`phase-b-execute.md`、`phase-b-review.md`）→ controller 内联指示；`phase-b-worktree.md` → `specpower sync` 步骤。
- **文档**：`custom/README.md`（Includes 段）、`README.md`（"定制如何生效"更新）。
- **测试**：`test/cli/custom-bake.test.ts`（新）、`test/cli/prompts-custom-placeholder.test.ts`（新）、`test/cli/sync.test.ts`（worktree sync）、`test/core/tools/adapters.test.ts`（`specpower/custom/` 引用不被重写，已存在）。
- **不新增 CLI 命令**（烘焙复用 `init`/`sync`；worktree 复用 `specpower sync`）。
- **无 breaking change**：`specpower/custom/` 路径语义不变；无 `!include` 的 md 原样保留。
