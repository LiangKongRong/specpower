# test-plan: <change-name>

<!-- Cases reference spec Scenarios by name (delta or baseline); do not copy WHEN/THEN.
     Every delta Scenario MUST have >=1 Case; every failure-admitting Requirement >=1 [negative].
     Case ids are stable and change-unique; test code embeds the token [<changeName>-<id>]. -->

## Capability: <capability>

### Requirement: <requirement name> → Scenario: <scenario name>

- **Case** T1: <one-line case description> [positive]
  - Input: <concrete input>
  - Expected: <expected outcome>
  - it(): <planned test name>
  - file: <optional: planned test file path>
  - covers: <optional: product source file(s) this test exercises, for per-Scenario branch coverage attribution in /specpower:verify Pass 5 (e.g. src/core/tools/adapters.ts)>

- **Case** T2: <one-line case description> [negative]
  - Input: <contract-violating input>
  - Expected: <error/rejection/degradation>
  - it(): <planned test name>
  - branch: <required for [negative] Cases: the product error branch this Case tests, e.g. validate-null-name / auth-reject / duplicate-device — a short stable id of the branch in the function-under-test. The negative-ratio floor counts DISTINCT branches, so two negative Cases sharing a `branch:` tag count once (blocks ratio padding). A reviewer cross-checks `branch:` against the actual code branches.>
  - covers: <optional: product source file(s) exercised; one per error branch ideally>
