> **HARD GATE — READ THIS FIRST.** Generate substantive first-iteration tasks. Not placeholders. Not "TBD". Not empty group headers. Each group gets real tasks with concrete verbs. Build Phase A will later rewrite this to writing-plans precision (exact paths, code blocks, bite-sized steps) — but you are producing the first honest pass at "what needs to happen," not a skeleton for someone else to fill.

# Plan Phase: First-Iteration Tasks Draft

## Purpose

Generate a substantive first-iteration `tasks.md` that maps the change into coarse, concrete work items. This is **v1 of the task plan** — Build Phase A will use writing-plans to produce v2 (with exact file paths, code snippets, and bite-sized test-first steps). Your job here is to outline the real work so refine can challenge it and Build Phase A can refine it into executable form.

## Inputs You Must Read

- `specpower/changes/<change-name>/proposal.md` — establishes scope and capabilities
- `specpower/changes/<change-name>/specs/<capability>/spec.md` — delta specs define behavior
- `specpower/changes/<change-name>/design.md` — design decisions that drive the tasks
- `templates/tasks.md` (if it exists in the specPower install) — the tasks template scaffold

## Top-of-File Marker (Required)

The generated `tasks.md` file **must begin** with this HTML comment as its first line (this is content you inject into the output file, not part of this prompt):

```
<!-- Plan-phase first-iteration tasks. Will be rewritten to writing-plans precision in /specpower:build Phase A. -->
```

This marker tells future readers (and the Build Phase A prompt) that this document is coarse-grained by design and will be rewritten to a stricter format later.

## Structure Rules

1. **3 to 8 task groups** at the top level
   - Each group uses `## N. <Group Name>` as its header (where N is a positive integer starting at 1)
   - Group names are capability- or layer-oriented, not generic ("Core artifact management" — not "Phase 1")

2. **Each group contains 2 to 6 concrete checkbox items**
   - Format: `- [ ] N.M <动作短语>` where N is the group number and M is the item index within the group
   - Mixed Chinese and English is acceptable (project convention); pick the language the action verb flows in

3. **Items are concrete actions, not topics**
   - "实现 searchNotes 纯函数" (good — specific function)
   - "添加 CLI --verbose 标志并接入 logger" (good — specific change)
   - "处理搜索逻辑" (bad — vague topic, not an action)
   - "handle searching" (bad — same problem in English)
   - "完善测试" (bad — improvement verb without a subject)

4. **Each item should be a coherent unit of work** — roughly the size that Build Phase A will later expand into a handful of bite-sized TDD steps. If an item feels like it's really 5 unrelated actions, split it.

## Grouping Guidance

Let the change characteristics drive the grouping. Two common strategies — pick whichever fits better, or mix them deliberately:

- **By capability**: each spec capability becomes a group. Good when the change introduces parallel capabilities with clean seams between them.
  - Example: `## 1. notes-search capability`, `## 2. notes-export capability`
- **By implementation layer**: data → service → API → CLI → docs. Good when the change touches many layers of one feature.
  - Example: `## 1. Schema and migrations`, `## 2. Repository layer`, `## 3. Service layer`, `## 4. CLI wiring`, `## 5. Tests and verification`

If the change has both parallel capabilities and deep layering, a two-level grouping is fine (groups by capability, items implicitly ordered layer-by-layer inside each group).

## Example — Good Granularity

Below is a short worked example for a hypothetical "add search to notes CLI" change. Study the **granularity and verb concreteness**, not the specific content.

```markdown
<!-- Plan-phase first-iteration tasks. Will be rewritten to writing-plans precision in /specpower:build Phase A. -->

# notes-search Implementation Tasks

## 1. 搜索核心逻辑

- [ ] 1.1 实现 searchNotes 纯函数（输入: notes[], query; 输出: 匹配列表）
- [ ] 1.2 实现 fuzzy-match 评分算法并暴露 scoreNote(note, query)
- [ ] 1.3 为 searchNotes 和 scoreNote 写单元测试（覆盖空 query、空 notes、多匹配排序）

## 2. 持久化层接入

- [ ] 2.1 在 NoteRepository 上增加 listAllForSearch 方法（不分页）
- [ ] 2.2 更新 InMemoryNoteRepository 的测试夹具提供搜索样本数据

## 3. CLI 命令

- [ ] 3.1 新增 `notes search <query>` 子命令并接入 commander 路由
- [ ] 3.2 实现 search 命令的输出格式（按分数降序，截断正文到 80 字符）
- [ ] 3.3 为 CLI 命令写集成测试（调用子命令，断言输出）

## 4. 文档与样例

- [ ] 4.1 在 README 的 Usage 段落增加 search 示例
- [ ] 4.2 在 specpower/specs/notes-search/spec.md 对齐最终命令形态
```

Note how each item names a specific artifact or action (`searchNotes` function, `NoteRepository.listAllForSearch` method, `notes search <query>` command) rather than a fuzzy area ("handle searching", "improve CLI"). That level of concreteness is the target.

## What This Draft Is NOT

- It is **not** the writing-plans format. Build Phase A does that rewrite with exact file paths, code blocks, and `Write test → Run test → Implement → Run test → Commit` per step. Do not pre-write those here — you don't yet have the design detail to do it well, and duplicating effort wastes the refine pass.
- It is **not** a skeleton to be filled in. Every item should reflect a real action you'd expect to perform.
- It is **not** a design document. If you find yourself writing "decide whether to use X or Y" as a task, that's a design decision that belongs in `design.md`. Move it there.

## Coverage Check

After drafting, skim your task list against the design and specs:

- Is every capability in the delta specs represented by at least one task?
- Does every design decision that requires implementation work have tasks backing it?
- Are tests called out as explicit items (they should be — even at this granularity)?
- Is documentation covered if the design introduces user-facing changes?

If a capability or design decision has **no tasks**, either add them or note in `design.md` that this part is out-of-scope / handled by the existing code. Silent gaps are the failure mode to avoid.

## Save and Proceed

Save the document to:

```
specpower/changes/<change-name>/tasks.md
```

**Do NOT ask the user to confirm this draft at this stage.** The orchestrating SKILL will present all plan-phase artifacts together at the end of the plan phase. Refine will challenge and restructure; Build Phase A will rewrite to precision. Your job is to hand off a substantive first pass.

## Remember

- Substantive, not placeholder
- 3 to 8 groups, 2 to 6 items each
- Concrete verbs on concrete subjects
- Top-of-file marker comment is mandatory
- Writing-plans precision comes in Build Phase A — do not pre-write it here
