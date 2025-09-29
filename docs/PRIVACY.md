# Privacy & Data Protection

This document summarizes the project's data protection, retention, export, deletion, and consent handling practices. It's intended to provide developers and operators with a clear, auditable policy and explain how the codebase supports user rights (data export, deletion, consent management).

## Goals

- Provide users with the ability to export their personal data on request.
- Allow users to request account deletion and support a confirmation workflow.
- Record and manage consent events for different processing purposes.
- Apply retention policies and safe deletion/anonymization where appropriate.
- Ensure exports are delivered securely and removed after a configurable retention window.

## Scope

Applies to all user-identifiable data stored in the service: `users`, `donor_profiles`, `volunteer_profiles`, `visitor_profiles`, `messages`, `help_requests`, `donations`, `documents`, audit logs, and related records.

## Data Models (code references)

- Consent: `internal/models/user_auth.go` - `Consent`
- DataExportRequest: `internal/models/user_auth.go` - `DataExportRequest`
- AccountDeletionRequest: `internal/models/user_auth.go` - `AccountDeletionRequest`
- Export file storage (temporary): `./exports/` (development placeholder)

## API Endpoints

The following authenticated endpoints are implemented in the backend and intended for use by the frontend:

- POST /api/v1/auth/export
  - Start a data export for the authenticated user. Creates a `DataExportRequest` and (currently) generates an export synchronously.
- GET /api/v1/auth/export/:id/status
  - Return status (`pending`, `processing`, `ready`, `failed`) and file path for a given export request.
- GET /api/v1/auth/export/:id/download
  - Download the export file (only when status is `ready`). Access restricted to the requesting user.
- POST /api/v1/auth/delete
  - Request account deletion. Creates an `AccountDeletionRequest` in `pending` status.
- POST /api/v1/auth/delete/:id/confirm
  - Confirm a pending deletion request. Marks request `confirmed` and schedules processing by background job.
- POST /api/v1/auth/consent
  - Update or create a consent record for the authenticated user.

All endpoints require authentication (`middleware.Auth()`) and reasonable rate limits are applied.

## Export process (current implementation)

- Current behavior (development): export is generated synchronously and written to `./exports/<file>`.
- Recommended production behavior:
  - Make exports asynchronous: enqueue a job and return `202 Accepted` with request id.
  - Store exports in a secure, access-controlled storage (e.g., S3 with pre-signed URLs or a private object store).
  - Generate a signed, time-limited download URL or notify user via email when export is ready.
  - Scan exported files for malware if they include attachments or user-submitted files prior to delivery.
  - Log export events (requested, generated, downloaded) for audit.

## Deletion process (recommended)

- The system records a deletion request and requires a confirmation step.
- A background worker should:
  - Verify confirmation tokens or admin approvals when necessary.
  - Execute deletion or anonymization according to data retention policy and legal requirements.
  - Preserve anonymized audit records where required (e.g., donation history for financial recordkeeping), or retain minimal records for compliance (e.g., tax/legal holds).
  - Delete/exported files and temporary artifacts related to the user.

## Retention policy (suggested defaults)

- Personal profile data: retain while account active; on deletion/anonymization remove PII.
- Payment/donation records: retain for 7 years (or local legal requirement) but anonymize PII.
- Message history and help requests: retain for 1–2 years depending on operational needs; allow user-requested export before deletion.
- Exports in storage: remove after 7 days by default.
- Consent records: retain until revoked + audit window (e.g., 2 years) for proof of consent.

## Consent management

- Consent records are stored in the `consents` table and contain:
  - `user_id`, `type` (purpose), `granted` flag, `granted_at`, `source`, `created_at`/`updated_at`.
- The frontend should expose clear UI to accept/revoke consent for defined purposes (marketing, data_processing, background_check).
- All consent changes should be auditable.

## Security considerations

- Exports must only be accessible to the requesting authenticated user.
- Use secure storage (S3 with encryption at rest and in transit, signed URLs, IAM rules).
- Ensure files are generated under a strict temporary directory and removed after expiration.
- Enforce rate-limiting and logging for export and deletion endpoints to prevent abuse.

## Operational notes for operators

- Migrate new models: `Consent`, `DataExportRequest`, `AccountDeletionRequest` are included in the migrations used by `internal/db/migrations.go`.
- Background job recommendations:
  - Add job(s) to `internal/jobs` to process exports and deletion requests.
  - Add scheduled cleanup job to remove expired export files.
- Monitoring & alerts:
  - Track job failures, export generation errors, and high volume of deletion requests.

## Implementation checklist (next steps)

- Make exports asynchronous and secure storage-backed.
- Implement background worker to process deletion requests and apply anonymization rules.
- Add notification (email) when export ready or deletion completed.
- Add unit/integration tests for export and deletion flows.
- Add admin tools for reviewing deletion requests and compliance holds.

## Contact and change log

- Document created: 2025-09-29
- Author: backend team

If you'd like, I can implement the background jobs and add a notification/email when exports are ready next. Please tell me which storage backend (local, S3, other) you'd prefer for production exports and I'll implement a basic version.