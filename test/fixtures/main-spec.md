### Requirement: User Login
The system SHALL authenticate users via email and password.

#### Scenario: Successful login
- **WHEN** user submits valid credentials
- **THEN** system returns authentication token

### Requirement: User Logout
The system SHALL invalidate the session on logout.

#### Scenario: Successful logout
- **WHEN** user clicks logout
- **THEN** session is invalidated

### Requirement: Password Reset
The system SHALL allow password reset via email.

#### Scenario: Reset email sent
- **WHEN** user requests password reset
- **THEN** system sends reset email
