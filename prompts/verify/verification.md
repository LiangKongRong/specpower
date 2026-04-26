> **HARD GATE**: No completion claims without fresh verification evidence. If you haven't run the verification command in this message, you cannot claim it passes.

<!-- SOURCE: skills/verification-before-completion/SKILL.md -->

# Verification Before Completion (Verify Variant)

## Overview

Claiming work is complete without verification is dishonesty, not efficiency. This variant adds scope creep detection on top of standard verification.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. SCOPE CHECK: Does the work match original requirements? (see below)
6. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Scope Creep Detection

**After verification passes, before claiming completion:**

1. **Re-read the original requirements** (spec, plan, or task description)
2. **List what was requested** vs. **what was built**
3. **Flag any of these:**
   - Features added that were not requested (YAGNI violation)
   - Refactoring beyond what the task required
   - "While I'm here" improvements unrelated to the task
   - Over-engineered solutions for simple requirements
   - Changes to files outside the task's scope
4. **If scope creep found:**
   - Report it explicitly: "Scope creep detected: [what was added beyond requirements]"
   - Recommend reverting the extra work unless the user explicitly approves it
   - Do NOT count extra work as part of task completion

**Scope creep checklist:**

| Signal | Action |
|--------|--------|
| Changed files not in the plan | Flag and explain why |
| Added features not in spec | Recommend removal |
| Refactored unrelated code | Recommend reverting |
| Over-engineered solution | Simplify to match requirements |
| "Nice to have" additions | Flag for user decision |

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |
| No scope creep | Diff matches plan scope | "I only changed what was needed" |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- **ANY wording implying success without having run verification**
- **Claiming completion without checking scope against requirements**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence does not equal evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter is not compiler |
| "Agent said success" | Verify independently |
| "The extra changes improve quality" | YAGNI unless user requested it |
| "It was a small addition" | Small additions compound into scope creep |
| "Partial check is enough" | Partial proves nothing |

## Key Patterns

**Tests:**
```
CORRECT: [Run test command] [See: 34/34 pass] "All tests pass"
WRONG:   "Should pass now" / "Looks correct"
```

**Requirements + Scope:**
```
CORRECT: Re-read plan -> Create checklist -> Verify each -> Check diff scope -> Report
WRONG:   "Tests pass, phase complete" (without scope check)
```

**Agent delegation:**
```
CORRECT: Agent reports success -> Check VCS diff -> Verify changes -> Check scope -> Report
WRONG:   Trust agent report
```

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

## The Bottom Line

**No shortcuts for verification. No tolerance for scope creep.**

Run the command. Read the output. Check the scope. THEN claim the result.

This is non-negotiable.
