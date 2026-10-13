# Phase 6 — operational readiness and pilot safeguards

Assessment: 2026-10-13 (Asia/Saigon). **IN PROGRESS; repository work ready for review. Public employee pilot remains NO-GO.**

Phase 6.1 update: architecture C was conditionally approved for repository/local work. The [feasibility checkpoint](feasibility-report.md) confirms Pages same-origin routing and actual local workerd compatibility, but maximum image CPU is substantially above Workers Free's 10 ms budget. Per owner condition A.6, production ingress/frontend implementation stops pending a new feasibility/design decision. Only local measurement tooling and verification-only Phase 6 CI were added; no cloud changes.

Final bounded round used audit-clean Miniflare 5, instrumented per-stage timing, and kept all existing limits. The remaining Free gap is over 120 ms for 3×5 MiB; recommendation B is to evaluate a Paid implementation, subject to memory/concurrency validation. No cloud or Paid plan change.

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

Initial delivery implemented documentation and a synthetic handler regression. Phase 6.1 adds the local-only feasibility probe and verification-only CI. Production ingress implementation stops on the documented Free feasibility condition. No credentials, deployments, cloud settings, persistent fixtures, migrations, cleanup, DNS changes, invitations or paid upgrades are authorized by this work. Phase 4 and Phase 5 staging stay intact. PR base must be Phase 5; neither branch merges into main.

Final bounded optimization concludes **Decision B**: Workers Free is not practical at the unchanged three-image/5 MiB limits; recommend a separately approved Paid-target repository candidate, first adding local two-request max-memory tests. This is not approval to purchase Paid, provision, bind secrets, deploy, activate intake or create persistent fixtures. Any later hosted preview requires a new exact-SHA approval after local implementation review. See the final checkpoint section in `feasibility-report.md` for authoritative measurements; earlier preliminary estimates in this README/report are superseded.
