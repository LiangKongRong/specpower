<!-- Plan-phase first-iteration tasks. Will be rewritten to writing-plans precision in /specpower:build Phase A. -->

# add-test-plan-artifact Implementation Tasks

## 1. 模板与产物格式

- [ ] 1.1 新增 `templates/test-plan.md` 脚手架：Capability > Requirement > Scenario 引用块 > Case 条目，字段含 `id:`、`[positive]`/`[negative]`、输入、预期、计划 `it()` 名、可选 `file:`
- [ ] 1.2 更新 change 产物清单说明（proposal/specs/design/tasks/**test-plan**），文档化并列关系与"引用而非复制 Scenario"；文档化嵌入 token 约定 `[<changeName>-<id>]`

## 2. test-plan 解析器

- [ ] 2.1 新增 `src/core/parsers/test-plan-parser.ts`：从 `test-plan.md` 提取 Case（`id:`、scenarioRef、mark、input、expected、itName、可选 `file:`），复用 `markdown-parser` 工具
- [ ] 2.2 暴露 `listCases(testPlanPath)` 与 `listCasesByScenario(specPath, testPlanPath)`，供 validator/verify 复用
- [ ] 2.3 为解析器写单元测试：正/负解析、缺字段、缺/重复 `id:`、orphan Case、重复 `it()` 名、引用不存在 Scenario（delta + baseline 双向解析）

## 3. validator 覆盖校验

- [ ] 3.1 在 `core/validation/types.ts` 扩展结果类型，携带 test-plan 覆盖问题（uncovered-scenario / missing-negative / orphan-case / duplicate-id / duplicate-it-name / dangling-ref）
- [ ] 3.2 在 `validator.ts` 增加覆盖阶段：每 delta Scenario ≥1 Case、每 failure-admitting Requirement ≥1 `[negative]` Case、Case `id:` 必填且唯一、orphan/重复/悬空引用 → error；Scenario 引用对 delta + baseline 双向解析
- [ ] 3.3 在 `validator.ts` 增加"文件缺失"分支：testable change 无 `test-plan.md` → warning；`--strict` → error
- [ ] 3.4 为覆盖校验写测试：合规通过、未覆盖 Scenario、缺负用例、缺/重复 `id:`、orphan、重复 `it()` 名、baseline 引用、`--strict` 升级缺失文件

## 4. 流程生命周期接入

- [ ] 4.1 `plan` prompt（`plan/specs.md` 或新增 `plan/test-plan-draft.md`）+ `specpower-plan` SKILL：Stage 5 生成 `test-plan.md`（first-iteration，从 Scenario 草拟 Case，自动分配稳定 `id:`——不重编号；派生**带 change 前缀的全局唯一嵌入 token** `<changeName>-<id>`）
- [ ] 4.2 `refine` prompt（`refine/update-artifacts.md`）+ `specpower-refine` SKILL：迭代 Case（增/并/改，保留 scenario 引用与 `id:` 稳定——不重编号、不重用；change 前缀不变）
- [ ] 4.3 `build` prompts（`build/phase-a-plan.md` + `phase-b-execute.md`）+ `specpower-build` SKILL：Phase B 照 Case 写 `it()`，嵌入带 change 前缀的全局唯一 token `[<changeName>-Tn]`（`[negative]` Case 复现契约违反）
- [ ] 4.4 `verify` prompt + `specpower-verify` SKILL：两步校验——Step1 扫测试套件查每 Case 的**前缀 token**是否齐全（缺→fail，跨 change 不误报）；Step2 按前缀 token 定位 + AST best-effort 校验断言匹配（无法匹配→warn 带置信/缺口，v1）
- [ ] 4.5 `done` prompt + `specpower-done` SKILL + `specs-apply.ts`：归档 `test-plan.md`（不合并 baseline）；delta-scenario change 无 test-plan 时阻断归档（除非 `--force`）
- [ ] 4.6 CLI：`change-new` 可选创建占位 + **拒绝重名（含归档）保证前缀全局唯一**、`instructions` 增加 test-plan artifact 支持、`validate` 接入覆盖校验入口

## 5. rename-scenario 命令（D8）

- [ ] 5.1 新增 `specpower rename-scenario <cap> <old> <new>`：原子改 baseline `specpower/specs/<cap>/spec.md` 的 Scenario 名
- [ ] 5.2 扫描所有在途 + 归档 `test-plan.md`，把引用旧名的 Case 同步改新名（`--dry-run` 预览受影响文件清单 + 确认门控 + git 可回滚）
- [ ] 5.3 为 rename-scenario 写测试：原子改名+同步、`--dry-run`、归档 test-plan 同步、无同步时拒绝裸改 baseline 名

## 6. 测试与文档

- [ ] 5.1 端到端集成测试：plan→refine→build→verify→done 全链路 `test-plan.md` 流转 + 覆盖校验 + 归档不合并
- [ ] 5.2 `README` + `CONTRIBUTING` 记录 `test-plan.md` 产物、流程、`--strict` 行为
- [ ] 5.3 在 baseline specs（`specpower/specs/test-planning/spec.md`，done 后合并）对齐最终形态
