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

`npm test` applies the exact migration to PGlite PostgreSQL with independent synthetic identities, roles, auth UID function and simulated Storage catalog. This verifies SQL grants/RLS/RPC behavior. It does **not** itself exercise Supabase Auth, PostgREST, Storage HTTP upload/signing or JWT validation.

## Phase 3 live verification

Real Auth, PostgREST, Storage upload/signing and ownership-negative checks now pass separately: see `PHASE_3_LIVE_QA.md` and `phase-3/live-data.json`. B cannot read A tickets, replies, events, attachment metadata or generate a signed URL. Anonymous REST/RPC and employee role/status escalation are denied. IT deactivation immediately blocks existing B JWT business/RPC/Storage access; B is restored afterward. Signed URLs were fetched successfully and rejected after expiry. Public signup is disabled. Browser expired-session testing is controlled, not a natural provider lifetime test.

Notifications use the same RLS-constrained gateway and active profile. No new public writes or service-role browser credentials were introduced. Notification preferences retain only IDs in per-user bounded localStorage; ticket content is excluded. The production worker caches public static assets only. Already-issued signed URLs remain bearer capabilities until expiry; account deactivation cannot revoke a URL already shared outside the app.

Remote security advisors on 2026-10-10 retain two warning categories:

- Four authenticated-callable `SECURITY DEFINER` RPCs: intentional transactional endpoints with empty search paths, explicit active/role/owner checks and anon execute revoked. Local and live negative tests validate these guards; the warning remains recorded. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Leaked-password protection remains disabled: an Auth configuration follow-up before a real pilot. No unrelated Auth settings were changed for notifications. [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Staging HTTPS/remote CSP and physical-device security are NOT TESTED. Server-side binary validation, cleanup/retention ownership and actual support contact remain pilot prerequisites.
