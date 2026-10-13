# Phase 6 — operational readiness and pilot safeguards

Assessment: 2026-10-13 (Asia/Saigon). **IN PROGRESS; repository work ready for review. Public employee pilot remains NO-GO.**

Remote heads verified with `git ls-remote` after fetch: Phase 5 and Phase 6 both `8232ab0ede155fb9f73f4d5ff70ac4387ee17ac4`; main `0b439d3cf5493840eeb79c97ba1c027932e5701d`. Work branch: `codex/phase-6-operational-readiness`. Initial local checkout was Phase 5 at the same SHA. Existing uncommitted Phase 5 QA reports/images were preserved and excluded from this delivery. They are audit inputs, not new Phase 6 verification.

## Baseline audit

Reviewed AGENTS.md, CLAUDE.md, ROADMAP, Supabase architecture/RLS, Phase 4 staging/pilot records, Phase 5 README/hardening/security/acceptance reports, intake handler/validation/config, migrations, gateway/public service, tests and verification/deployment workflows. The older template documentation's mock-only description is superseded by actual ITCare code: a client SPA plus real Supabase Auth/Postgres/Storage/Edge services. No UI redesign is needed.

| Area | Repository finding | Evidence boundary |
| --- | --- | --- |
| Anonymous intake | Browser sends multipart directly to `public-intake`; JWT verification disabled intentionally | Direct-origin OPTIONS 204 is recorded in Phase 5; no new hosted probes here |
| Validation | 16 MiB streamed body, 30 s read deadline, 10 s Siteverify deadline; three 5 MiB JPEG/PNG/WebP signatures | Signature check is not full decoding, EXIF removal or malware detection |
| Bot defense | Server checks success boolean, action and exact origin hostname before reservation | One genuine challenge succeeded historically; consumed-token HTTP replay remains unverified |
| Limits | SQL precheck 120/minute and 1,000/hour; admission 10 new reservations/hour | Global limits can deny legitimate office traffic; DB is touched before bot verification |
| Idempotency | Request lock/hash; atomic admission; immutable upload hash check; finalization locks ticket | Matching retry still needs a fresh valid challenge. Reload creates a new UUID. Multi-session race remains unproven |
| Authorization | Private intake tables; service-only RPC grants; active IT checks; private bucket; signed reads 120 s | SQL role evidence differs from bearer-token REST evidence; old employee-owned rows retain legacy reads |
| Reliability | Partial failures retain invisible drafts; catch collapses most failures to HTTP 400 | Owner cannot reliably distinguish validation vs infrastructure failure from status alone |
| Browser | Keyed ticket details isolate draft state and pending operations | Synthetic responsive checks pass historically; exact hosted mobile/desktop acceptance remains open |
| Operations | No approved retention/backup owner, contact or restore drill; foreground polling only | No background alert delivery, automatic cleanup or production recovery claim |
| CI | Phase 5 verifier triggers on Phase 5 pushes / Phase 4 PR base | Phase 6 stacked PR does not automatically receive that workflow; local validation required until scoped CI reviewed |

The most recent Phase 5 acceptance report supersedes older isolated QA statements: ticket draft bug is fixed; ITC-1004 is closed; inactive IT and employee Auth logins were denied. Preserve test users `4a74b235-d8a2-4bfb-8a6b-038c9a2f390c` and `a9a659c9-2739-4f7a-8033-68ba1cc7f7a3`. Never delete these or existing tickets without permission.

## Delivery and gates

- [Implementation and operations plan](implementation-plan.md)
- [Security decision and approval package](security-decision.md)
- [Acceptance checklist and evidence levels](acceptance-checklist.md)
- [Local validation results](validation-report.md)

Only documentation and a synthetic handler regression are implemented. No ingress architecture, credentials, deployments, cloud settings, persistent fixtures, migrations, cleanup, DNS changes, invitations or paid upgrades are authorized by this work. Phase 4 and Phase 5 staging stay intact. PR base must be Phase 5; neither branch merges into main.

Next checkpoint: owner reviews the proposed architecture, scope, cost, risks and rollback in the security decision. Architecture implementation stops pending approval. Approval to code is distinct from approval to provision/deploy and to create live fixtures.
