## MODIFIED Requirements

### Requirement: User Login
The system SHALL authenticate users via email, password, OR SSO.

#### Scenario: Successful login
- **WHEN** user submits valid credentials
- **THEN** system returns JWT token

#### Scenario: SSO login
- **WHEN** user authenticates via SSO provider
- **THEN** system returns JWT token
