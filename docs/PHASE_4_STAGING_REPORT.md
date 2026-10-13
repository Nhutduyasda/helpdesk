# Phase 4 — staging integration and pilot readiness

Assessment date: 2026-10-12. **NO-GO for an employee pilot at present.** Repository validation and read-only Supabase review are complete; HTTPS staging and critical authenticated staging authorization remain blocked. Phase 4 is not finished.

## 1. Repository and exact baseline

Repository: `Nhutduyasda/helpdesk`. Starting revision: `4717a63d6ead9d803128bbc88a646339d893c312`, branch `phase-3-final-completion`. Working branch: `phase-4-staging-pilot-readiness`, targeting the immediate Phase 3 final branch. Git ancestry checks confirm Phase 2 and Phase 3 are present. No cherry-picks, rebuild, main changes, merges, force-pushes, database migrations or production deployments.

## 2. Fresh GitHub PR inspection

| PR | Base → head | Exact head | State | Changed files | Mergeability |
|---|---|---|---|---:|---|
| #1 | main → phase-2-supabase-integration | e28ee50efbd69b2e1b83a24ab88b925e958c9ef7 | Open draft | 112 | Mergeable |
| #2 | phase-2-supabase-integration → phase-3-notifications-staging | 064479beab2d87335e3e4137f6af2130f11d5ed6 | Open draft | 121 | Mergeable |
| #3 | phase-3-notifications-staging → phase-3-final-completion | 4717a63d6ead9d803128bbc88a646339d893c312 | Open draft | 2 | Mergeable |

GitHub Actions run [38041043979](https://github.com/Nhutduyasda/helpdesk/actions/runs/38041043979) for PR #3 completed successfully. Install/tests/scoped lint/audit/build/scanner/artifact steps passed. Deployment configuration verification and preview deployment were SKIPPED. GitHub returned no PR-triggered workflow runs for the #1/#2 HEADs and no commit-status entries for any of the three; an empty status list is not a CI pass. Changed filenames were fetched for all three PRs. Existing PRs were left untouched.

## 3. Confirmed existing implementation

Source and SQL review confirm React/Vite/TypeScript UI, real email/password Auth with persisted/refreshing SDK sessions, trusted active database profiles, gateway/service abstraction, own-ticket access, IT-only transactional mutations, immutable events, description/private-image submissions, retry deduplication, remote/on-site method, replies, resolution and closure. In-app notifications use RLS-filtered events, per-browser read/seen IDs and visible-app polling; device notifications are explicit opt-in and generic. The production PWA caches approved static assets only. Production excludes the demo provider.

These are implementation findings plus current local SQL/service tests. Authenticated cloud/UI acceptance in Phase 3 is historical evidence, not a repeated Phase 4 pass. Background Web Push, email delivery, reset/invitation completion UI, automatic attachment cleanup and offline ticket queues are not implemented.

## 4. Actual validation in this run

| Check | Actual result | Evidence |
|---|---|---|
| npm ci | PASS, 568 packages installed | Current terminal result; locked dependencies unchanged |
| Baseline npm test | PASS, 22/22 | Current baseline terminal result |
| Final npm test | PASS, 28/28 | [tests.txt](phase-4/tests.txt) |
| npm run lint:itcare | PASS | [scoped-lint.txt](phase-4/scoped-lint.txt) |
| npm audit --audit-level=high | PASS, 0 vulnerabilities | [audit.txt](phase-4/audit.txt) |
| npm run build | PASS, TypeScript + configured production Vite build | [build.txt](phase-4/build.txt) |
| node scripts/scan-build.mjs | PASS, 129 files / 101 JS | [build-scan.json](phase-4/build-scan.json) |
| Full npm run lint | FAIL, inherited 13 errors + 3 warnings | Blog/notes/context/Search/types modules; same Phase 3 debt |
| YAML syntax and job dependency | PASS | Python YAML parser; deploy needs verify |
| Local SPA paths, manifest/icon dimensions | PASS | [local-pwa-http.json](phase-4/local-pwa-http.json) |
| Worker no-private-cache and offline feedback | PASS in Node VM only | Same local report; not browser SW installation |
| Current Supabase public HTTP negatives | PASS | [supabase-public-http.json](phase-4/supabase-public-http.json) |
| HTTPS staging/browser A/B/IT/PWA acceptance | BLOCKED / NOT TESTED | No authorized Cloudflare access or verified staging URL; no test login credentials |

Build retains inherited >500 kB chunk warnings. The Chromium binary is absent and its download returned invalid/truncated archives; no current browser run or screenshot is claimed. Local HTTP/VM results do not prove remote HTTPS/CSP or physical installation.

## 5. Current Supabase review and security

Authorized project identity confirmed: `itcare-dev`, `agcoboeswdvnumzyrtbu`, ap-southeast-1, ACTIVE_HEALTHY, PostgreSQL 17.11. Live migration history contains only `20261010075402_itcare_initial`. Current columns/constraints/functions/policies/enums digests match the committed verified Phase 3 digests exactly. Five public business tables and Storage objects have RLS. Authenticated table grants are SELECT only; anonymous business grants are absent. RPCs have empty search paths and explicit authenticated grants; private helpers are not exposed through PostgREST (`PGRST106`). The private bucket retains 5 MiB and JPEG/PNG/WebP restrictions.

Current public Auth settings show signup disabled, email login enabled and anonymous login disabled. All five anonymous REST reads return 401. RPC negatives use valid argument signatures; see the HTTP evidence for actual status/code. The account-management connector does not expose full Auth Site URL/redirect configuration here, so those remain unverified. No users, roles, data, history or settings were changed. Only public build configuration was retrieved; no privileged keys were requested.

Current catalog/advisor findings are summarized in [supabase-review.json](phase-4/supabase-review.json). The live-auth runner was attempted with separate Phase 4 output and stopped at configuration because IT credentials are absent ([blocked result](phase-4/blocked/live-auth.json)); this is not a failing application login test.

| Severity | Finding / status | Treatment |
|---|---|---|
| High — fixed build gate | Original scanner accepted a synthetic legacy service_role JWT and scanned only top-level JS | Recursive all-file scan, privileged JWT/private-value rejection, four regression tests. This was a scanner bypass, not evidence of a real leaked key. |
| High — release gate | Current deployed A/B ownership and IT-only authorization not repeated | Block pilot until independent authenticated staging browser/API tests pass. Local SQL negatives and cloud policy inspection are insufficient substitutes. |
| Medium — open | Trusted server-side binary decoding/hash validation absent; direct clients bypass browser checks | Preserve existing controls. Restrict trial data to non-sensitive synthetic content; approve safeguards before sensitive real uploads. |
| Medium — open | Supabase advisor: leaked-password protection disabled | Review [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); do not accept a paid upgrade automatically. |
| Medium — controlled | Four authenticated SECURITY DEFINER RPC advisor warnings | Intentional guarded transactional API; roles/ownership/active checks tested locally, current grants/search paths inspected. Do not indiscriminately revoke working RPCs. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). |
| Medium — operational | Retention, separate Storage backup, recovery drill and real IT contact not established | Assign owners before onboarding; use pilot checklist. |
| Low / design limit | Signed URLs are 120-second bearer capabilities; notification read state is browser-local | Explain privacy limits; never share signed links. SW excludes private requests; no claim of revoking issued URLs on deactivation. |

No critical vulnerability or actual credential leak was confirmed by the checks performed. Full-lint debt is tracked separately, not disguised as a security fix. Natural full token expiry, authenticated session restoration and active-user revocation on staging remain unverified this run.

## 6. Scoped changes

- `.github/workflows/itcare-phase3-staging.yml`: Phase 4 PR/push validation; restricted dispatch on the two allowed feature refs; existing test-project/project-preview/deploy-enabled gates retained. No main deployment or PR-event deployment.
- `scripts/scan-build.mjs`, `tests/build-scan.test.mjs`: confirmed scanner bypass fix and safe regression coverage; separate configurable scan-report destination.
- `scripts/qa-runtime.cjs`, `tests/qa-runtime.test.mjs`: portable browser lookup/options and separate QA output directory.
- Existing `live-auth`, `live-browser`, `live-data`, `live-workflow`, `notification`, `foreground-notification`, `pwa` QA scripts: configurable staging URL/output/browser; sensitive browser call-log text is omitted from shareable failure reports. Syntax checked; authenticated execution blocked.
- This report, pilot checklist, Phase 4 evidence and roadmap/readme links. No UI, business service/provider, schema, migration or dependency changes.

Delivery commit and new draft PR are recorded in the GitHub delivery response. Existing Phase 3 evidence files are preserved.

## 7. Staging status and exact external setup

**Staging URL: none. No deployment was performed or verified.** Cloudflare credentials are absent from this environment; plugin discovery found no available Cloudflare integration. GitHub tools do not expose repository secret/variable configuration or workflow dispatch. Existing CI skipped the configuration/deploy gates; this does not prove credentials were configured. Do not invent a Pages URL.

Required setup, using existing resources wherever present:

1. Authorize the intended Cloudflare account. Locate the existing `itcare-staging` Pages project; do not create a duplicate. Confirm it is staging-only and its production branch differs from `itcare-preview`. If no project exists, create only an approved free Direct Upload project (production branch e.g. main); do not deploy repository main.
2. GitHub Actions variables: `ITCARE_SUPABASE_URL=https://agcoboeswdvnumzyrtbu.supabase.co`, matching public `ITCARE_SUPABASE_PUBLISHABLE_KEY`, and `ITCARE_STAGING_DEPLOY_ENABLED=true` only after authorization/project isolation are confirmed. Secrets: `CLOUDFLARE_ACCOUNT_ID`, account-scoped Pages-edit `CLOUDFLARE_API_TOKEN`. Never paste private values in chat or commit them.
3. Trigger a new push on `phase-4-staging-pilot-readiness` after configuration is ready. Dispatch is restricted to the safe feature refs, but GitHub may not offer it until the workflow exists on the default branch; do not merge main to enable dispatch. The verify job must pass before the existing preview-only deployment. Capture the actual deployment URL/output; do not use a guessed branch URL.
4. Review exact staging Auth Site URL/allowed redirects in itcare-dev, keep signup disabled and do not add unsupported reset/OAuth routes or broad production wildcards. Email/password login does not itself require an OAuth callback.
5. Supply the existing synthetic A/B/IT login credentials securely in an ignored local environment as `ITCARE_TEST_A_EMAIL/PASSWORD`, `ITCARE_TEST_B_EMAIL/PASSWORD`, `ITCARE_TEST_IT_EMAIL/PASSWORD`. Do not reset existing users or share credentials here. A browser runner with Playwright/Chromium (or Windows Edge) is also required.
6. Set `QA_OUTPUT=docs/phase-4/staging`, `LIVE_QA_URL=<actual HTTPS origin>`, `NOTIFICATION_QA_URL`, `PWA_QA_URL`, `FOREGROUND_QA_URL` to that origin. Set `PLAYWRIGHT_MODULE` to an installed module if not automatically resolved; `QA_BROWSER_CHANNEL=msedge` is supported. Run existing scripts sequentially, including live-data, live-auth, live-browser, live-workflow, notification, foreground-notification and pwa QA. These scripts create synthetic test tickets and live-data briefly deactivates/restores synthetic B; never use real employee credentials.
7. Separately verify actual HTTPS/CSP/security headers, hashed assets against the reviewed build, direct ticket-route refresh, all employee/IT workflow steps including closure/history, notification read/unread isolation and sensitive cache exclusion. Record real browser evidence; do not substitute local or historical PASS reports.

## 8. Remaining acceptance and pilot decision

Not tested this run: deployed A/B/IT login/logout/persistence, description/photo ticket workflows, remote/on-site/reply/resolution/closure/history, cross-owner attachments and IT mutation denial, in-app read/unread behavior, foreground OS delivery, HTTPS/security headers/CSP and remote deep links. Physical Android/iPhone camera, keyboard, installation and installed sessions need human devices. Background push remains unsupported and is not added in this phase.

Use [the small-office pilot checklist](PHASE_4_PILOT_CHECKLIST.md) for secure provisioning, contact/fallback, phone reporting, remote consent, retention, backup/recovery and physical-device gates. Do not onboard staff yet.

**Final decision: NO-GO for pilot release now; repository candidate ready for staging review.** Reconsider only after verified HTTPS staging, critical independent authenticated acceptance, operational owners/contact and required physical-device checks. Stop before production, company onboarding and any main merge.
