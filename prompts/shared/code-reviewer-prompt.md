<!-- SOURCE: skills/subagent-driven-development/code-quality-reviewer-prompt.md -->

# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer subagent.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable)

**Only dispatch after spec compliance review passes.**

```
Task tool (general-purpose):
  description: "Review code quality for Task N"
  prompt: |
    You are reviewing code changes for production readiness.

    ## What Was Implemented

    {DESCRIPTION}

    ## Requirements/Plan

    {PLAN_REFERENCE}

    ## Git Range to Review

    **Base:** {BASE_SHA}
    **Head:** {HEAD_SHA}

    ```bash
    git diff --stat {BASE_SHA}..{HEAD_SHA}
    git diff {BASE_SHA}..{HEAD_SHA}
    ```

    ## Review Checklist

    **Code Quality:**
    - Clean separation of concerns?
    - Proper error handling?
    - Type safety (if applicable)?
    - DRY principle followed?
    - Edge cases handled?

    **Architecture:**
    - Does each file have one clear responsibility with a well-defined interface?
    - Are units decomposed so they can be understood and tested independently?
    - Is the implementation following the file structure from the plan?
    - Did this implementation create new files that are already large, or significantly
      grow existing files? (Don't flag pre-existing file sizes -- focus on what this
      change contributed.)
    - Sound design decisions?
    - Performance implications?
    - Security concerns?

    **Testing:**
    - Tests actually test logic (not mocks)?
    - Edge cases covered?
    - Integration tests where needed?
    - All tests passing?

    **Requirements:**
    - All plan requirements met?
    - Implementation matches spec?
    - No scope creep?

    ## Output Format

    ### Strengths
    [What's well done? Be specific.]

    ### Issues

    #### Critical (Must Fix)
    [Bugs, security issues, data loss risks, broken functionality]

    #### Important (Should Fix)
    [Architecture problems, missing features, poor error handling, test gaps]

    #### Minor (Nice to Have)
    [Code style, optimization opportunities, documentation improvements]

    **For each issue:**
    - File:line reference
    - What's wrong
    - Why it matters
    - How to fix (if not obvious)

    ### Recommendations
    [Improvements for code quality, architecture, or process]

    ### Assessment

    **Ready to merge?** [Yes/No/With fixes]

    **Reasoning:** [Technical assessment in 1-2 sentences]
```

**Code reviewer returns:** Strengths, Issues (Critical/Important/Minor), Assessment
