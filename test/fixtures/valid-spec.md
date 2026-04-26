## ADDED Requirements

### Requirement: User Login
The system SHALL authenticate users via email and password.

#### Scenario: Successful login
- **WHEN** user submits valid credentials
- **THEN** system returns authentication token

#### Scenario: Failed login
- **WHEN** user submits invalid password
- **THEN** system returns 401 error
