# Phase 6 implementation and operations plan

Status: in development; public pilot NO-GO. Keep scope to a small-office helpdesk.

## Ordered roadmap

| Stage | Deliverable / completion condition | Authorization |
| --- | --- | --- |
| 6.1 audit | Baseline, A/B/C decision, exact change/config/cost/test/rollback package | Repository audit complete; architecture implementation awaits owner |
| 6.2 automation | Synthetic replay/fresh-token handler regression added; existing 50-test baseline retained. Next: portable Worker tests and verification-only CI, bounded HTTP harness with explicit fixture gate | No new live fixtures now; persistent Auth/tickets/uploads require separate approval |
| 6.3 operations | Owner approves contact, retention, backup targets and monitoring procedure; restore drill proves recovery | Plan only; no scheduler, deletion, new service or alert messages |
| 6.4 pilot | Exact hosted acceptance and owner go/no-go, then 2–3 volunteers for one week | No onboarding/migration/DNS/cutover until explicit approval |

Do not start Phase 7. No inventory/assets, AI, native app, SaaS, dashboard redesign or new form dependency.

## Minimal operations runbook (proposed, owner to assign)

Primary IT owner: unassigned. Backup owner: unassigned. Approved support hours/contact: not supplied. Both owners must know provider access/recovery procedure; do not share an Admin account. Placeholder contact cannot serve a pilot. Configure a real phone/chat only after owner supplies approved details. Employees use that contact during outage and give the receipt number if available; no public follow-up portal exists.

During pilot check provider status, inbox and aggregate intake failures at start/end of each working day. Review quota usage daily during first week, weekly thereafter. Record only UTC/timezone-qualified timestamp, deployment version, stage, status class, duration and aggregate counts; no personal report data, IPs, tokens or signed URLs. Existing handler lacks stage logs; approved architecture work must add these before claiming rejection observability.

Proposed escalation: two consecutive 5xx/timeouts over ten minutes, a legitimate reporter blocked, unexpected Auth denial for active IT, or repeated upload/finalization failures prompts owner investigation and manual fallback. A 429 cluster warrants review; isolated bot rejections do not warrant constant alerts. At 70% of any daily/monthly provider allowance review projected use; at 85% notify owner through their approved channel and pause nonessential QA. Never auto-upgrade. Notification here is a future human procedure; no email/chat service or automation is configured. Foreground app polling is not closed-app delivery.

If intake fails: check provider status and recent sanitized errors, verify configuration without printing secrets, disable approved intake route if necessary, announce fallback through approved owner process, and avoid repeated retries/new UUIDs. Keep existing Admin available when safe. After recovery reconcile invisible draft reservations read-only before approving cleanup. Never interpret HTTP 400 alone as validation: current catch also maps dependency errors there.

## Retention and cleanup proposals — no deletion authorization

Candidate policy for review: private photos 30 days after ticket closure; ticket/history records 180 days after closure; abandoned unsubmitted drafts at least seven days old, inspected weekly. Open tickets and anything under a hold are excluded. These periods are proposals, subject to office records/privacy requirements. Retain deduplication reservation/tombstone for the agreed retry horizon; deleting it can recreate an already submitted request. Define that horizon and late-retry rejection before implementing cleanup.

Read-only inventory first: unsubmitted ticket age, referenced attachment paths, uploaded objects without a valid reservation, and closed ticket age. Separate failed drafts from orphan objects. Owner reviews an exact candidate list and backup manifest before any deletion. Storage objects must be removed through Storage API/UI, not SQL deletion of `storage.objects`. Use per-item results and retry-safe reconciliation; never bulk delete by prefix alone. Preserve ticket numbers/history and do not renumber sequence gaps. No scheduled cleanup job, RPC or data deletion added.

The two existing QA Auth users and ITC-1001/1002/1004 stay intact. Account deactivation does not revoke already issued signed URLs; password/session actions require separate scope. EXIF may contain private metadata; tell testers to crop sensitive content and avoid passwords/customer data. Full image decoding/metadata stripping is a separately reviewed security improvement.

## Backup and recovery proposal

Initial pilot target: RPO one working day; RTO four support hours, subject to owner acceptance. Daily encrypted database export during pilot and separate private Storage object backup, plus export before any approved migration/cutover. Store on an approved access-controlled destination separate from the project, with a checksum manifest mapping original object paths, sizes and hashes; keep seven daily and four weekly copies as a proposed backup retention. Backup retention must align with deletion policy and holds.

Database export must include business tables, constraints/RLS/grants/functions, private reservations and counters, sequence values and migration history as supported by the chosen export tool. Auth identities and signing/SMTP/runtime configuration need a separate documented supported export/reprovision strategy; do not assume a public schema dump preserves Auth or passwords. Secrets stay in a password manager, outside exports/repository. Record provider bucket limits/policies and configuration versions without secret values.

[Supabase backup documentation](https://supabase.com/docs/guides/platform/backups) is the reference for provider backup scope. Do not assume Free offers sufficient recoverability or that database backups restore Storage bytes. Before pilot, approve an isolated restore destination and perform a drill: restore schema/data, original object paths, profile/Auth ID relationships and sequence; compare counts/checksums; test Admin, anonymous rejection, private image access and lifecycle. Document measured RPO/RTO and missing components. No backup/export or restore has been performed in Phase 6.

On incident: preserve evidence/version, stop intake if writes are unsafe, choose an intact backup, restore to separately approved target, validate before routing traffic, then reconcile writes after backup manually. Never reset the existing project. Application rollback preserves DB/data and immutable reservations; additive migrations need forward-compatible review rather than destructive down migrations.

## One-site rollout proposal

Keep Phase 4 and Phase 5 staging projects/URLs unchanged until approved. Choose one primary hostname/project after evidence and contact approval; no DNS or URL change now. Prefer retaining the existing approved database if appropriate rather than a gratuitous data migration. If a new production project is needed, inventory both environments and their migration histories; preserve ticket IDs/numbers, Auth/profile identity relationships, FK/history links, private object paths and deduplication state. Do not combine environments by rerunning initial SQL or overwriting IDs. Storage bytes require explicit copy/checksum validation and private bucket policy recreation; signed links are regenerated, not migrated.

Before cutover: encrypted backup, change window, approved temporary write pause, final incremental reconciliation, record counts/sequence checks, auth/Turnstile/CSP/origin configuration review, and support/rollback owner. Rollback to old website while new writes exist risks lost or split reports: use manual fallback, retain both datasets and reconcile before switching. Never discard new reports to make rollback easier.

Once all gates pass and owner authorizes invitations, pilot two or three volunteers for one working week. Validate phone reporting plus IT acknowledge/remote/onsite/reply/resolve/close. Review failures and feedback daily. Success requires no unauthorized access or duplicates, reliable receipt/lifecycle/private images, working fallback and demonstrated restore. Security incident, unexplained lost ticket, privacy leak or repeated legitimate denial pauses pilot. Expansion needs owner sign-off; Phase 6 start itself grants none.
