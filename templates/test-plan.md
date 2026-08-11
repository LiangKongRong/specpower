# test-plan: <change-name>

<!-- Cases 引用 spec Scenario 名（delta 或 baseline），不复制 WHEN/THEN。
     每 delta Scenario ≥1 Case；每允许失败的 Requirement ≥1 [negative]。
     Case id 稳定、change 内唯一；测试代码嵌入 token [<changeName>-<id>]。 -->

## Capability: <capability>

### Requirement: <需求名> → Scenario: <scenario 名>

- **Case** T1: <一句话用例描述> [positive]
  - 输入: <具体输入>
  - 预期: <预期结果>
  - it(): <计划测试名>
  - file: <可选: 计划测试文件路径>

- **Case** T2: <一句话用例描述> [negative]
  - 输入: <违反契约的输入>
  - 预期: <报错/拒绝/降级>
  - it(): <计划测试名>
