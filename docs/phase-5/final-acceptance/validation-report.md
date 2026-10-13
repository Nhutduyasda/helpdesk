# Phase 5 final fix and security acceptance — 2026-10-13

Starting local and fetched feature SHA: `e572233d640671070a26be9a78096822ff05bd6e`. Branch: `codex/phase-5-passwordless-reporting`. PR #5 was inspected, attached to this chat, and remains draft/unmerged. The ending SHA is the commit containing this report, recorded explicitly in PR #5 and the delivery message. Existing deployed preview remains the starting SHA until fresh exact-SHA approval.

## Draft isolation fix

`Details` was reused across route parameter changes. Its reply/resolution state, error, pending flag, lock and retry-operation ref survived ticket navigation. A pending promise could also finish after navigation and clear or alter the next ticket's form. `Details` now renders a private `TicketDetails` child keyed by route ID. React resets all local state/refs synchronously on identity change and keeps the same instance on data refresh for that ID. A previously submitted operation continues for its captured ticket ID; it is not cancelled or reassigned, and its completion updates only the unmounted old form. Authorization, service calls and lifecycle rules are unchanged.

`npm run test:details` runs the actual React component in Chromium/Edge against a synthetic context. Set `PLAYWRIGHT_MODULE` to an installed Playwright module on other machines; no dependency was added. Checks: unsaved reply and resolution survive same-ticket refresh; A→B→A clears both drafts; blank B resolution cannot submit; A success cannot clear B's reply or unlock B's pending operation; B failure retains its draft and same-ticket retry UUID; late B failure cannot set A's error; fresh A gets a fresh operation UUID; navigation clears prior errors. Passed. This is automated browser regression, separate from the 50 node tests and deployed evidence. See `details-browser.json` and `scripts/phase5-details-qa.mjs`.

## Validation results

| Check | Result and scope |
|---|---|
| `npm test` | 50/50 passed; local PGlite, fake HTTP/storage/verifier and source/gate checks |
| `npm run test:details` | Passed actual Details browser regression with deferred operations; synthetic backend |
| `npm run lint:itcare` | Passed with zero warnings |
| Edge ESLint | Passed: `npx eslint supabase/functions/public-intake --max-warnings 0` |
| QA script ESLint | Passed on the two changed browser scripts |
| Edge type-check | Passed: official npm Deno 2.9.6, `deno check supabase/functions/public-intake/index.ts` |
| `npm audit --audit-level=high` | Passed, zero vulnerabilities; registry access required execution outside sandbox |
| `npm run build` | Passed TypeScript/Vite; existing large-chunk advisory remains; local build lacked real public configuration |
| Build scanner | Passed 127 files/99 JS files; no privileged key/secret patterns; see `build-scan.json` |
| Public browser regression | Passed 390px/1440px, text/image-only, invalid files, required fields, same-UUID retry, Admin redirect, legacy redirects and overflow; synthetic Turnstile and intake HTTP responses |
| Full `npm run lint` | Failed: unchanged template files, 13 errors/3 warnings, matching previous report; repository-wide lint is not clean |
| `git diff --check` | Passed |

Local browser launches required execution outside Windows sandbox. Initial harness module-resolution failures and localhost isolation were corrected before the passing runs. Screenshots and results from this run are kept here; prior Phase 5 artifacts were preserved. The local production build is not an isolated deployment artifact: the protected prepare job must validate actual public config, scope CSP, rebuild and rescan after authorization.

## Real isolated backend acceptance

The user approved two synthetic test identities, then selected database-level tests only when the Supabase dashboard was signed out. Tests inserted only transaction-scoped Auth/profile fixtures with no passwords, switched PostgreSQL roles and JWT claims, asserted denial, and rolled back. No persistent Auth users or employee records were created; no session sign-in was simulated or claimed. Existing active IT profile was never changed. SQL scripts are recorded here for review, not migration or automatic execution.

| Required case | Actual coverage and remaining gap |
|---|---|
| Successfully consumed Turnstile token replay | **Unverified live.** Local verifier rejection tests pass; documentation says tokens are single-use, but neither substitutes for genuine replay evidence |
| Same request UUID with fresh genuine token | **Partial.** Live database reservation/finalization retries return the same result and one submission event, including at capacity. Fresh-token HTTP retry remains unverified |
| Simultaneous identical/different requests near quota | **Partial.** One bounded live transaction sets its own uncommitted quota row to 9, reserves the tenth slot, retries without another admission, rejects a different request and asserts count stays 10. Entire transaction rolled back. Sequential proof only; no simultaneous Edge/multi-session proof, stress or persisted quota exhaustion |
| Expired signed image URL | **Unverified.** Existing 120-second signing implementation is not expiry evidence |
| Anonymous private attachment access | **Passed live database boundary.** `anon` cannot see the existing private storage object; bucket private. Prior deployed QA also recorded denied public HTTP download. Authenticated signed-capability expiry remains separate |
| Inactive/non-IT Admin data and IT mutations | **Passed live RLS/RPC boundary.** Inactive IT and active employee cannot see public report tickets, attachments, comments/events or perform ticket/account mutations. Active employee can read only its own profile, not the Admin list. Real Auth sessions/browser identities remain unverified |
| Admin permission via RLS | **Passed live database role tests.** Queries run under `authenticated` with synthetic claims, not frontend navigation. Existing policies use active profile checks; no user-metadata authorization was introduced |
| Public reporting/Admin lifecycle after fix | **Partial.** Fixed local browser/public mocks pass. Live DB reserve/finalize/acknowledge/remote/reply/wait/resolve/close and closed-write denial pass in a rolled-back transaction. New deployed UI + genuine Turnstile end-to-end awaits approval |

Cleanup verified: 2 existing tickets, 1 profile/active IT, zero synthetic identities/reservations, original `verified:hour` count 2. PostgreSQL ticket-number sequences are not transactional: the rolled-back synthetic reservation may advance numbering by one; no sequence was reset. No uploads, live HTTP public reports, migrations, resets or Edge deployments occurred in these tests.

Live advisors: leaked-password protection disabled; 2 informational deny-all private-table findings; 4 authenticated security-definer RPC warnings. See [security assessment](security-assessment.md) for interpretation, provider pricing, proposed ingress design and residual risks. Current organization is Free; leaked-password protection requires Pro, starting at $25/month plus applicable project/usage costs. Basic TOTP is available on Free but is not implemented/enforced by this app. No upgrade or Auth change was made.

## Deployment checkpoint

Read-only authenticated GitHub API verified: `ITCARE_PHASE5_DEPLOY_ENABLED=false`; `ITCARE_PHASE5_APPROVED_SHA` and `ITCARE_PHASE5_DEPLOY_APPROVAL` absent. `itcare-phase5-preview` requires owner review, self-review prevention off (intentional solo-owner arrangement), with one allowed branch `codex/phase-5-preview-request`. Both workflow jobs retain exact-event-SHA guards. No variables or request ref were changed.

After explicit owner approval of the **new full feature SHA**:

1. Fetch and verify feature HEAD and request-ref ancestry; recheck environment reviewers and branch policy. Do not force-push. A normal feature push runs verification only.
2. Create fresh repository approval variables: `ITCARE_PHASE5_APPROVED_SHA=<new full SHA>`, `ITCARE_PHASE5_DEPLOY_APPROVAL=DEPLOY_ISOLATED_PHASE5`, then `ITCARE_PHASE5_DEPLOY_ENABLED=true`. Never reuse prior approval values. This step is not authorized yet.
3. Push only the approved commit to the approved request ref: `git push origin <new full SHA>:refs/heads/codex/phase-5-preview-request`. If not a fast-forward, stop and review ancestry.
4. Require normal `itcare-phase5-preview` environment reviews for prepare/deploy. Workflow builds the approved SHA, validates isolated public configuration/CSP, verifies the separate Pages project's disabled production branch, and publishes only `phase5-preview` on `itcare-phase5-test`.
5. Regardless of attempt outcome, set enable flag false and remove both approval variables. Record run ID, commit, artifact digest, reviews and preview result. Run bounded new-deployment UI/security acceptance; failure/retry needs fresh explicit approval.

This UI-only redeployment needs no migrations or Edge deployment. Any ingress resource/secret/Edge deployment or paid plan requires separate approval. Main, Phase 4, original ITCare URL and existing Supabase resources remain unchanged.

Decision: **GO for continued controlled synthetic staging QA**, with fresh approval required before deploying the fix. **NO-GO for completed security acceptance/public employee pilot** until live token replay/fresh-token retry/concurrency/signed-expiry/session tests and direct-endpoint upstream abuse protection are proven. The present deployed UI still contains the draft bug.
