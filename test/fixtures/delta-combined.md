## ADDED Requirements

### Requirement: Email Export
The system SHALL allow data export via email.

#### Scenario: Successful export
- **WHEN** user clicks export
- **THEN** system sends email with CSV

## MODIFIED Requirements

### Requirement: User Login
The system SHALL authenticate users via email, password, OR SSO.

#### Scenario: Successful login
- **WHEN** user submits valid credentials
- **THEN** system returns JWT token

#### Scenario: SSO login
- **WHEN** user authenticates via SSO provider
- **THEN** system returns JWT token

## REMOVED Requirements

### Requirement: Password Reset
**Reason**: Replaced by SSO-based recovery
**Migration**: Use SSO provider's password recovery

## RENAMED Requirements

FROM: User Logout
TO: Session Logout
