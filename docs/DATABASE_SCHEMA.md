# Database schema

Migration: `supabase/migrations/20261010075402_itcare_initial.sql`. Apply once to a new empty test project. Existing `itcare-dev` already has this verified migration; do not rerun it. The Phase 2 filename was reconciled without SQL/cloud-history changes (see `MIGRATION_HISTORY.md`). Use a subsequent additive migration for future schema changes.

| Table | Identity and relationships | Meaning |
|---|---|---|
| profiles | UUID PK/FK auth.users | Trusted name, department, employee/it role, active flag; new users inactive |
| tickets | UUID PK; employee_id → profiles; unique (employee_id, request_id) | Database-generated ITC number, description, status, method, result, submission timestamps, attachment manifest |
| ticket_attachments | UUID PK; ticket_id → tickets; uploaded_by → profiles | Private random object path, MIME, bytes, order, readiness; no base64/URL stored |
| ticket_comments | UUID PK; ticket_id → tickets; author_id → profiles | Authorized message and server timestamp |
| ticket_events | UUID PK; ticket_id → tickets; actor_id → profiles | Append-only actor, event, server time, payload; unique ticket/actor/operation UUID |

Ticket numbers use a PostgreSQL sequence, protected by uniqueness, rather than client timestamps or `max()+1`. Sequence gaps are normal. Status enum: `new`, `acknowledged`, `in_progress`, `waiting_for_user`, `resolved`, `closed`. Method enum: `remote`, `onsite`. The UI maps these to existing Vietnamese labels.

`prepare_ticket` serializes identical user/request UUIDs with a transaction advisory lock, validates description/manifest and reserves up to three immutable object paths. Changing content with the same UUID fails. `finalize_ticket` locks the ticket, verifies object existence and stored size/MIME, marks attachments ready and writes the submission event in one transaction. Already finalized retries return the same ticket.

`update_ticket` checks the trusted actor and privileges, locks the submitted ticket, validates the operation UUID and payload, and writes changes/comments/audit event together. Repeating a completed operation returns safely; reusing its UUID for another payload fails. Resolution text is required to resolve; closing requires resolved status; closed tickets reject changes and replies. All status editing requires active IT. Employees may only reply to their own submitted, open tickets. Browser input cannot select an actor, owner, number or event timestamp.

`set_employee_active` lets active IT set an existing employee's active flag; it cannot modify IT roles/accounts. Role assignment and initial user creation remain trusted administrator operations.
