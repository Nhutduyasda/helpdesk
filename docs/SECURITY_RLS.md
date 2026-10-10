# Authorization and attachments

All five business tables enable RLS. Authenticated clients receive SELECT only; direct INSERT/UPDATE/DELETE, role changes and event edits are denied by grants as well as policies. Anonymous clients have no business table/RPC access. Definer helpers/RPCs use an empty search path, fully qualified objects and explicit execution grants. `itcare_private` must not be an exposed API schema.

| Actor | Profiles | Submitted tickets/comments/events | Drafts | Mutations |
|---|---|---|---|---|
| Anonymous | None | None | None | None |
| Inactive authenticated | Own profile to explain lockout | None | None | None |
| Active employee | Own profile | Own ticket only | Own only | Create/finalize own; reply to own open ticket |
| Active IT | All profiles | All submitted tickets | Own only | IT fields on submitted open tickets; replies; existing employee active flag |

Roles and active flags are database records. Profile creation ignores metadata privilege requests. Business policies consult current database active status on every new operation, so deactivation applies to an existing session. Frontend route checks provide UX only.

`incident-photos` is private with JPEG/PNG/WebP MIME allowlist and a 5 MiB per-object cap. RPC permits at most three reservations per ticket. Random UUID paths are reserved before upload; storage INSERT requires the exact reservation, current owner, active profile and unsubmitted draft. There is no browser overwrite/delete policy. Storage SELECT requires authorized ticket access. Images are displayed using short-lived signed URLs; URLs are bearer capabilities until expiry and are not persisted in tickets or logged.

The service checks MIME, basic image signatures and sizes, hashes the bytes and stores only metadata. Finalization checks Storage object metadata. Basic signature validation is not malware scanning, full decoding or a server-side content hash comparison; a malicious direct client can bypass browser validation. Bucket restrictions and RLS still constrain ownership/type/size, but stronger binary validation needs a trusted worker before a sensitive production pilot.

Uploads and database operations cannot share a distributed transaction. This implementation explicitly stages drafts and only reports success after transactional finalization. Retry reuses request UUID and random reservations; object conflicts are accepted only for retry and finalization still checks metadata. Abandoned drafts/objects require the administrator cleanup procedure in `SUPABASE_ARCHITECTURE.md`. No automatic delete job is claimed.

Duplicate standard uploads can return 400 or 409; only duplicate-object messages are accepted, not other errors with those status codes. See [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads). Gateway tests cover both duplicates and rejected permission/MIME/conflict errors.

`npm test` applies the exact migration to PGlite PostgreSQL with independent synthetic identities, roles, auth UID function and simulated Storage catalog. This verifies SQL grants/RLS/RPC behavior. It does **not** exercise Supabase Auth, PostgREST, Storage HTTP upload/signing or JWT validation. Those live checks remain required.
