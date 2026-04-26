## MODIFIED Requirements

### Requirement: Brownfield project scanning via code-review-graph
The `specpower:scan` capability is **DEFERRED to v0.3** and not functional in v0.2.x. When implemented in v0.3, the system SHALL scan an existing codebase using code-review-graph for analysis and convert the results into an OpenSpec specs baseline. In v0.2.x the SKILL MUST NOT attempt to run `specpower scan` (the CLI subcommand does not exist); it MUST advertise the planned status and redirect the user to the v0.2.x workable alternative.

#### Scenario: Full project scan (v0.3 planned)
- **WHEN** v0.3 ships and the user runs `/specpower:scan` in a project directory
- **THEN** system SHALL invoke code-review-graph to analyze the codebase, convert the analysis output into `specpower/specs/` with one spec file per detected capability, generate `specpower/config.yaml` with project context, and create `specpower/SCAN_REPORT.md` summarizing findings

#### Scenario: Confidence-level tagging (v0.3 planned)
- **WHEN** v0.3 ships and the system generates spec requirements from code-review-graph output
- **THEN** each requirement SHALL be tagged with a confidence level: HIGH (test-backed or explicit behavior), MEDIUM (inferred from code, no tests), or LOW (speculative, needs human confirmation)

#### Scenario: v0.2.x deferred behavior
- **WHEN** a user running v0.2.x triggers `/specpower:scan`
- **THEN** the SKILL SHALL NOT attempt to invoke `specpower scan` (no such CLI subcommand exists in v0.2.x) and SHALL instead print a message stating that scan is planned for v0.3 and listing the v0.2.x alternative: run `/specpower:plan "<change description>"` directly, describing the existing behavior in the Q&A so plan generates a delta spec that doubles as an implicit first pass at the capability's baseline

### Requirement: Module-scoped incremental scanning
The `--module <name>` flag is **DEFERRED to v0.3** as part of the scan implementation. When v0.3 ships the system SHALL support scanning individual modules. In v0.2.x the SKILL MUST NOT attempt to run any `--module` variant; invoking any scan form falls under the deferred-behavior scenario of `Brownfield project scanning via code-review-graph` above.

#### Scenario: Single module scan (v0.3 planned)
- **WHEN** v0.3 ships and the user runs `/specpower:scan --module auth`
- **THEN** system SHALL scan only the specified module and generate/update its specs without affecting other module specs

#### Scenario: Parallel module scanning (v0.3 planned)
- **WHEN** v0.3 ships and the scan targets multiple modules in a large project
- **THEN** system SHALL use subagent parallel dispatch to scan modules concurrently

### Requirement: Scan output generation
Three outputs (`specpower/specs/`, `specpower/config.yaml`, `specpower/SCAN_REPORT.md`) are **DEFERRED to v0.3**. In v0.2.x the SKILL MUST NOT create any of them.

#### Scenario: v0.3 output contract (planned)
- **WHEN** v0.3 ships and a scan completes successfully
- **THEN** system SHALL write `specpower/specs/<capability>/spec.md` per detected capability, `specpower/config.yaml` with project context, and `specpower/SCAN_REPORT.md` summarizing findings including confidence distribution

#### Scenario: v0.2.x output silence
- **WHEN** a user running v0.2.x triggers `/specpower:scan`
- **THEN** the SKILL SHALL produce zero files on disk — no `SCAN_REPORT.md`, no new `specpower/specs/` entries, no `specpower/config.yaml` modifications

## ADDED Requirements

### Requirement: Planned-skill status advertisement
The SKILL MUST make its PLANNED status discoverable before attempting any execution, and MUST give the user a workable v0.2.x path so the spec-driven flow is not blocked by the missing capability.

#### Scenario: PLANNED marker in description
- **WHEN** a user browses available skills (IDE autocomplete, documentation, skill listing)
- **THEN** the specpower-scan skill's `description` frontmatter SHALL begin with the literal token `[PLANNED v0.3]` so the deferred status is visible at listing time, not only after invocation

#### Scenario: Redirect to v0.2.x alternative on invocation
- **WHEN** the user triggers `/specpower:scan` in v0.2.x
- **THEN** the SKILL SHALL respond with a single message containing: (a) the literal statement that `/specpower:scan` is planned for v0.3 and not implemented in v0.2.x, (b) the recommended v0.2.x workflow (run `specpower init` if not done, identify a capability to change, run `/specpower:plan "<change description>"` describing both existing behavior and the new change), and (c) no attempt to execute any `specpower scan` CLI command

#### Scenario: README documentation consistency
- **WHEN** a user reads `README.md` after installing v0.2.x
- **THEN** every mention of `/specpower:scan` in the README SHALL carry a `[规划中 · v0.3]` tag or equivalent explicit deferred-status marker, and `README.md` SHALL NOT contain any example workflow that instructs the user to invoke `/specpower:scan` as a live command
