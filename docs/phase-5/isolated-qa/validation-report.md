# Isolated Phase 5 deployment validation — 2026-10-13

Follow-up fix/security review: [final acceptance report](../final-acceptance/validation-report.md). The source fix has local browser coverage and additional live database acceptance; this historical deployed-SHA report remains evidence for the existing preview. The fix has not been deployed.

Reviewed and deployed source: `e572233d640671070a26be9a78096822ff05bd6e`.

Run: https://github.com/Nhutduyasda/helpdesk/actions/runs/38354361322

Both prepare and deploy succeeded following normal environment approvals. Tests (50), scoped application/Edge lint, audit, build, isolated configuration/CSP guard and scanner passed. Artifact digest: `sha256:e018abd248ea1bb6fa64d69f851de8391a7ddb31c44c9fc022276ac1df0d4639`.

Actual deployment: https://bcd783d1.itcare-phase5-test.pages.dev

Approved stable hostname: https://phase5-preview.itcare-phase5-test.pages.dev

Supabase: `praluwpaundvwmifaije`; `public-intake` ACTIVE version 1, JWT verification intentionally disabled. No migrations, Edge deployments or Auth changes were performed. Widget public site-key mismatch was corrected; the owner confirmed secret rotation and Supabase secret update without disclosing the secret.

## Verified real acceptance evidence

- `/` and `/report` open the anonymous form; `/it/login` accepted the existing test IT identity.
- Genuine Turnstile and description-only submission produced `ITC-1001`; image-only submission produced `ITC-1002`. SQL confirmed submitted anonymous records (`employee_id=null`) and exactly one private PNG attachment.
- Active IT saw both reports, self-reported identity, department, optional location and authorized image. Image loaded successfully.
- `ITC-1002`: new → acknowledged → remote/in_progress → internal reply → resolved → closed. UI history and SQL events/comment confirmed each saved operation.
- `ITC-1001`: onsite/in_progress → waiting_for_user. Inbox and notifications showed the reports and correct final states.
- Missing name, empty description/image, unsupported file, 5 MiB + 1 byte upload and four-photo selection were rejected in the real form. Submission disabled controls while pending; database contains exactly two tickets. This is not a concurrent/replayed successful-request proof.
- Anonymous public Storage download returned HTTP 400. Bucket is private, limit 5 MiB, JPEG/PNG/WebP. Preflight anonymous table/privileged RPC probes denied access; invalid Turnstile requests created no tickets or admission reservations. Exact-origin CORS allowed approved origin and denied unrelated origin.
- Mobile public/Admin content width 375px and desktop public width 1425px had no horizontal document overflow. Camera input requests environment capture; real hardware camera was not exercised. Temporary viewport overrides reset.
- Deployed HTTP response is no-store, CSP allows only isolated Supabase plus Turnstile, frame ancestors denied, nosniff/no-referrer/noindex present. Published service worker matches reviewed static-only cache logic after normalizing checkout line endings. Admin console had no warnings/errors; Turnstile's iframe emitted opaque NaN diagnostics while challenges/submissions succeeded.

## Remaining issues and unproven cases

1. Verified UI issue: resolution draft text survives navigation from a resolved ticket to another ticket. It is not automatically saved, but the next ticket can be resolved with the previous draft. `Desktop.tsx` Details holds resolution state without resetting on ticket identity changes. No fix/deployment of a different commit was authorized by the exact-SHA checkpoint.
2. Genuine successful-token replay, simultaneous duplicate/response-loss retry at capacity, expired signed URL, inactive/non-IT browser session, real camera and runtime Cache Storage inspection remain unverified. Local regression tests are separate evidence, not substitutes for those live tests. No transient challenge/session/signing tokens were intentionally collected for replay.
3. Direct Supabase endpoint upstream abuse protection remains unproven; shared ingress quotas can affect availability. No public employee pilot.
4. Supabase leaked-password protection remains disabled. Other advisor findings were reviewed as intentional private-table deny-all and guarded security-definer RPCs.

## Closed gates and preserved baseline

`ITCARE_PHASE5_DEPLOY_ENABLED=false`; approved SHA and approval-string repository variables removed. Environment and isolated resources retained. A subsequent deployment requires new explicit exact-commit authorization and normal environment approvals.

Main remains `0b439d3cf5493840eeb79c97ba1c027932e5701d`; Phase 4 branch remains `529a6ee406889af64ac1d1ad39f6366993e58d8e`. Phase 4 Pages remains `fb5dcad6-805b-4903-90c0-c8c740ee24b4`, preview branch `itcare-preview`, with no production deployment. PR #5 remains draft and unmerged. No production or Phase 6 work.

Decision: **NO-GO — REMAINING ISSUES** for completed acceptance sign-off. Approved synthetic preview remains available for controlled QA; this does not approve a public pilot.
