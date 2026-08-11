# test-plan: with-plan

## Capability: cap

### Requirement: tool resolution → Scenario: unknown tool id throws

- **Case** T1: resolve nonexistent id throws [negative]
  - 输入: resolveTool('nope')
  - 预期: throw /UnknownTool/
  - it(): throws on unknown tool id
