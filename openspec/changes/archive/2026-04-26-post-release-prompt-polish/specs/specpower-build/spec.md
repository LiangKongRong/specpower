## ADDED Requirements

### Requirement: Portable Verify command guidance in Phase A
Phase A MUST generate `Verify:` lines that actually run in the target environment and behave the way the plan predicts. It MUST NOT generate runtime-version-dependent runner invocations that look portable but silently change behavior across language/runtime versions.

#### Scenario: Prefer project-declared test script
- **WHEN** the target project declares a test script in `package.json` / `pyproject.toml` / `Cargo.toml` / equivalent manifest (`npm test`, `pytest`, `cargo test`, etc.)
- **THEN** Phase A's generated `Verify:` line for that step SHALL invoke the declared script rather than an ad-hoc runner invocation, because the declared script is what the project's CI and the user's local environment actually run

#### Scenario: Explicit discovery when invoking runner directly
- **WHEN** the target project has no declared test script and Phase A must invoke the test runner directly
- **THEN** the generated `Verify:` line SHALL spell out what the runner discovers (e.g. `node --test 'test/*.test.js'` or `pytest path/to/test.py::test_name` rather than `node --test test/` or bare `pytest`), so the command is deterministic across runtime versions

#### Scenario: Rejection of runtime-version-dependent invocations
- **WHEN** Phase A reviews a drafted `Verify:` line that uses patterns known to be runtime-version-dependent (e.g. `node --test <directory>` without a glob, Python unittest auto-discovery without an explicit target)
- **THEN** Phase A SHALL rewrite the line to one of the deterministic forms above before finalizing tasks.md; this rule appears in the `No Placeholders` list as a plan-failure pattern

#### Scenario: Observable expected outcome
- **WHEN** Phase A writes any `Verify:` line
- **THEN** the expected outcome SHALL be anchored on observable output — exit code, a specific stdout/stderr line, or a file existence check — rather than vague phrasing like `Verify: passes`; `Verify: exit 0, stdout contains "15 pass 0 fail"` and `Verify: file dist/cli.js exists` are acceptable forms
