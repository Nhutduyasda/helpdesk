# Isolated Phase 5 staging: exact approval and setup checklist

This checklist prepares deployment; it does not authorize or execute it. Preserve the existing Phase 4 Pages deployment, Supabase project `agcoboeswdvnumzyrtbu`, Auth users, secrets and workflows. PR #5 remains a draft against Phase 4. Nothing here starts Phase 6.

## 1. Approve isolated resources and migration scope

- Approve a dedicated Supabase test project, its owner/budget/region and project ref; record the approved ref and URL. Prefer isolation rather than copying real staff information or changing the Phase 4 project. If a separate project is infeasible, stop for an explicit alternative approval; the preview workflow deliberately rejects the Phase 4 URL.
- Approve a separate direct-upload Cloudflare Pages project named `itcare-phase5-test`, with production branch `phase5-production-disabled`. Deploy only branch `phase5-preview`, never a production deployment or the existing `itcare-staging` project. Do not enable an automatic Git integration that bypasses this workflow.
- Approve synthetic data and an active test IT identity in the isolated project. Use the existing IT authorization pattern; disable public signup. Existing Auth users must not be edited, activated, reset or copied with credentials. Creating the new test identity is a separate privileged setup action, not part of the Pages workflow.
- Review migrations and backups before any application. For a **new empty isolated database only**, apply `20261010075402_itcare_initial.sql` once, then `20261013023844_public_incident_intake.sql`, then `20261013031245_intake_availability_hardening.sql`. For an existing verified Phase 4 schema, apply only the two Phase 5 migrations in order; never rerun initial schema or reset the database. For an existing Phase 5 schema, apply only the hardening migration. Verify migration history and schema first; never infer it from a project name.
- Local compatibility evidence: pre-migration authenticated profiles, tickets, attachments and events retain their values and foreign-key ownership; IT-only comments/history/mutations are intentionally enforced; public reporter/actor IDs may be null; intake counters/receipts remain private. Verify these on real isolated Postgres/Storage, including simultaneous different/identical requests, before public testing. Inspect advisors, RLS, function grants and private bucket metadata after the approved migrations. Keep all data synthetic.

## 2. Approve and configure bot protection / Edge runtime

- Approve a separate managed Turnstile widget for the stable preview hostname `phase5-preview.itcare-phase5-test.pages.dev` (or a separately approved test domain). Permit only the intended hostname(s); no broad “any hostname” setting. The browser action is `incident-report`; the server must verify success, matching hostname and matching action. Use the stable branch alias, not arbitrary hashed preview URLs. If the actual alias changes, update both widget hostnames and exact allowed origins before testing.
- Frontend sitekey is public; widget secret is server-only. Genuine tokens are single-use and expire after five minutes: every reporter retry requires a fresh challenge. Test missing, forged, expired, replayed and wrong-host/action tokens with real Siteverify. Dummy testing keys are for unit/browser fixtures only and cannot establish staging security readiness. [Turnstile validation reference](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
- Approve deploying only `public-intake` in the isolated Supabase project, with the committed `verify_jwt=false` setting. Review the handler's independent bot checks before disabling platform JWT verification. Deploy it only after the compatible migrations exist. Do not deploy other functions or change Phase 4 Auth settings.
- Configure only in Supabase Edge secrets: `TURNSTILE_SECRET_KEY`; `INTAKE_ORIGINS=https://phase5-preview.itcare-phase5-test.pages.dev` (exact approved origin(s), separated by `|`); `INTAKE_DEPARTMENTS` (office-approved list separated by `|`). Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the Edge runtime. No service-role key, bot secret, database password or management token belongs in GitHub public variables or any VITE-prefixed variable.
- `INTAKE_RATE_SECRET` and `INTAKE_TRUSTED_IP_HEADER` are retired and unused by the hardened handler. Do not configure IP-header trust. No client IP is collected or passed to Siteverify.
- Approve and verify upstream abuse protection for the **function endpoint**, using gateway-proven addresses and cost/traffic monitoring. Pages-site WAF rules alone are insufficient for the direct Supabase endpoint. Record whether the approved setup actually prevents direct bypass; otherwise keep the test invite-only and NO-GO for a public Internet pilot pending an approved solution. Prove that invalid traffic cannot consume the verified reservation allowance; test both coarse limits and successful retries at capacity. Threshold tuning requires review, not a client setting.

## 3. Prepare GitHub gates and public build configuration

GitHub requires `workflow_dispatch` workflows on the default branch; this repo is public and its default branch is `main` (read-only metadata verified). The former branch-only manual dispatch recipe was not reliable. `gh workflow run --ref` or REST dispatch is not a supported way around registration. No workflow or application code is being added to main. See [GitHub manual-run documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

The revised `.github/workflows/itcare-phase5-preview.yml` uses only `push` to the dedicated request branch `codex/phase-5-preview-request`. GitHub runs push workflows present in the pushed revision without a default-branch merge ([push documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#push)). This is **operator-initiated and approval-gated, not literally workflow_dispatch/manual-only**. Ordinary feature pushes, PRs, tags, main and Phase 4 pushes cannot trigger this preview. The request branch has not been created or pushed in this task.

Create/verify the GitHub environment `itcare-phase5-preview` before enabling requests. Use **Selected branches and tags**, permitting only the branch `codex/phase-5-preview-request`, not a tag or wildcard. Restrict who can push/update that request ref; disallow force pushes and deletion except through a separately approved recovery process. Disable administrator bypass. Both preparation and deployment jobs reference the environment; its secrets are released only after applicable approval.

**Solo-owner configuration:** list the owner as required reviewer and leave **Prevent self-review OFF**. Otherwise the owner who pushes the request cannot approve it and there is no other eligible reviewer: a deadlock. This gives an intentional human checkpoint, not independent/two-person review. When another trusted reviewer is available, use that reviewer and enable prevention of self-review. Do not bypass a stuck approval or invent a second account. Reviewer availability depends on repository visibility/plan; this repo is public, but actual environment protections and reviewer settings have not been changed or verified through the API. If the settings cannot support this arrangement, keep deployment disabled and use the separately approved local-operator fallback below. [GitHub environment rules](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

Three **repository-scoped** public gates (environment vars cannot satisfy the pre-environment job condition):

- `ITCARE_PHASE5_DEPLOY_ENABLED=false` by default.
- `ITCARE_PHASE5_APPROVED_SHA` empty by default; when approved, the full 40-character Phase 5 commit SHA.
- `ITCARE_PHASE5_DEPLOY_APPROVAL` empty by default; when approved, `DEPLOY_ISOLATED_PHASE5`.

The job requires all three, the exact request ref, a non-deletion push event and approved SHA equal to event SHA. Checkout pins that immutable event SHA with persisted Git credentials disabled; git HEAD is checked again against approval. A missing gate, wrong SHA/ref or other event skips preparation and therefore publishing. Configuration, test, audit, build, scanner or project verification failures stop the pipeline. Preparation receives no deployment token; only deployment requests write-deployment permission. No migrations, Edge or Auth operations occur in this workflow.

Environment public variables:

| GitHub variable | Browser build value |
| --- | --- |
| `ITCARE_PHASE5_SUPABASE_URL` | `VITE_SUPABASE_URL`: approved isolated project HTTPS origin; Phase 4 ref is rejected |
| `ITCARE_PHASE5_SUPABASE_PUBLISHABLE_KEY` | `VITE_SUPABASE_PUBLISHABLE_KEY`: isolated project's public publishable key only |
| `ITCARE_PHASE5_DEPARTMENTS` | `VITE_ITCARE_DEPARTMENTS`: approved labels, identical to Edge list |
| `ITCARE_PHASE5_TURNSTILE_SITE_KEY` | `VITE_TURNSTILE_SITE_KEY`: isolated widget's public sitekey |

`VITE_ITCARE_DEMO` is fixed to `false`. The build guard rejects secret-like VITE names and requires the approved full commit SHA to equal the pushed `GITHUB_SHA`. It rewrites **only built** `dist/_headers` to the isolated Supabase HTTP/WebSocket/image host, preserving no-store, private caching, Turnstile CSP and blocked geolocation. Checked-in Phase 4 header configuration is unchanged. Do not point an isolated preview at the Phase 4 backend.

Environment secrets used only in the deploy job: `ITCARE_PHASE5_CLOUDFLARE_ACCOUNT_ID` and `ITCARE_PHASE5_CLOUDFLARE_API_TOKEN`. Use minimal Pages permissions and preferably an isolated account; if the provider cannot scope to one project, record the account-level risk and rely on the reviewed fixed project name plus environment approvals. No Supabase privileged credentials are present in the workflow. Build jobs do not receive Cloudflare deployment credentials.

## 4. Explicit deployment authorization

Obtain explicit approval for the **new reviewed commit that includes this workflow fix**, plus isolated resource identities. The previous `da6c83a...` revision still contains the broken dispatch recipe; do not approve it for the revised route. Then, and only then:

1. Authorized operator performs only separately approved isolated migration/test-identity/Edge/Turnstile setup from sections 1–2. These actions are outside the Pages workflow.
2. Confirm environment reviewers/solo-owner self-review setting, selected request-branch policy, request-ref write restrictions, public variables and deploy-job-only secrets. Confirm the separate Pages project and production-branch setting.
3. Record human approval of the full feature SHA in PR #5 or the approved change record. Set the approved-SHA and confirmation repository variables, then enable the gate. No secret credentials go in those variables.
4. From an authenticated operator checkout, fetch the Phase 5 feature branch and inspect the exact approved commit/workflow. For the first request, use a new request ref (never an empty “approval commit,” which would change the SHA):

   ```powershell
   git fetch origin codex/phase-5-passwordless-reporting
   if ($LASTEXITCODE -ne 0) { throw 'Fetch failed' }
   $phase5ApprovedSha = '<approved full SHA including the workflow fix>'
   git cat-file -e "$phase5ApprovedSha^{commit}"
   if ($LASTEXITCODE -ne 0) { throw 'Approved commit unavailable' }
   git merge-base --is-ancestor $phase5ApprovedSha FETCH_HEAD
   if ($LASTEXITCODE -ne 0) { throw 'Commit is not from the fetched Phase 5 history' }
   # Stop if either check fails; review this exact commit before the next command.
   git push origin "${phase5ApprovedSha}:refs/heads/codex/phase-5-preview-request"
   ```

   Use operator SSH/credential-manager credentials, not a workflow GITHUB_TOKEN (GitHub can suppress recursively generated push runs). If the ref already exists at the same SHA, a no-op push creates no run: do not force-push, delete/recreate it, or make an empty commit to evade the gate. A failed existing request may be explicitly re-approved and its exact run rerun, which retains the original SHA/ref; otherwise stop and review a new request/update. Only fast-forward updates to a newly approved SHA are allowed for later attempts.
5. In Actions, inspect the run SHA and ref, then approve each pending `itcare-phase5-preview` job. A solo owner explicitly approves their own request only with self-review prevention OFF. Do not use “bypass protection.” Tests/lint/audit/build/scanner and isolated configuration guard must succeed; inspect the revision-specific artifact before approving publication. Publishing rechecks the dedicated Pages project and its non-preview production branch, and deploys only the tested artifact to `phase5-preview`.
6. Immediately after the attempt, set the enable gate back to false and clear approved-SHA/confirmation variables. Record run ID, SHA, environment approvals, artifact digest and resulting preview URL or failure. A retry requires a fresh explicit approval; GitHub reruns retain SHA/ref and cannot be used to substitute another revision.

No request ref push, workflow run, setting change, live migration, Edge deployment, Pages publication or Auth update was performed during this preparation.

### Secure local-operator fallback (when literal manual-only execution is required)

The branch-only workflow cannot offer a supported Run workflow button under the no-main-change constraint. The request-ref method above is the smallest GitHub-hosted alternative. If literal manual-only execution or unavailable environment protections are requirements, obtain separate approval for this local procedure; it does not inherit GitHub Environment enforcement and must not be presented as equivalent independent review.

- Use a **fresh detached worktree** at the reviewed full Phase 5 SHA (`git worktree add --detach <new review directory> <approved SHA>`), verify `git rev-parse HEAD`, and require a clean tracked/untracked working tree before and after the build. Stop on any mismatch or unexpected generated source change. Do not build from a moving branch or an existing dirty checkout.
- Set only the approved public VITE variables from the table, `VITE_ITCARE_DEMO=false`, `APPROVED_COMMIT=<approved SHA>`, and `GITHUB_SHA` from the actual checked-out git HEAD. Keep deployment credentials and all Supabase secrets out of the build environment. Run `node scripts/phase5-preview-config.mjs validate`, `npm ci`, `npm test`, application/Edge scoped lint, `npm audit --audit-level=high`, `npm run build`, `node scripts/phase5-preview-config.mjs headers`, then the build scanner. All exits must be successful.
- Preserve a SHA-256 manifest of every distributable file outside `dist`, with the commit SHA, public configuration, command results and dependency lockfile hash. Review that artifact and record explicit permission to publish **that exact manifest**. Re-hash before upload and stop if any file was added/removed/changed. Do not rebuild after approval; a changed artifact needs another review. Prefer the tested revision-specific Actions artifact when available, checking its artifact digest plus file manifest.
- Only after artifact approval, load a minimal Cloudflare token in the operator's publish-only session. With the reviewed Wrangler version installed, verify its supported flags via `wrangler pages deploy --help`. Read the Cloudflare Pages project API and require name `itcare-phase5-test`, production branch `phase5-production-disabled` and the approved account. Stop on any error/mismatch; never create a project implicitly or fall back to production/default project settings.
- Execute the reviewed equivalent of `wrangler pages deploy <verified artifact directory> --project-name=itcare-phase5-test --branch=phase5-preview --commit-hash=<approved SHA>` only after that separate authorization. Save publication evidence, revoke/remove local token access and run the acceptance checks below. No service-role credentials are needed for Pages publication. Supabase setup remains separately approved.

## 5. Real acceptance tests and rollback

- Unauthenticated reporter opens `/` or `/report`, requires name/department, submits description-only and image-only with genuine Turnstile, and sees reference only. Invalid files/oversize/slow streams/token failures create no reservation or admission charge. Repeated identical requests and response-loss retries yield one ticket even at capacity; content changes reject reuse. Test concurrent Edge instances and window transitions on real Postgres.
- Anonymous business table SELECT/INSERT/UPDATE/DELETE, intake/IT RPC execution and private Storage reads/download/signing fail. A guessed public reference never reveals ticket content. Inactive/non-IT identities cannot read internal comments/history or perform IT actions. Test forged session/client IP headers and missing/incorrect Origin; treat Origin as filtering only.
- Active test IT logs in at `/it/login`, receives the submitted ticket/notification, sees self-reported identity/location and authorized private photos, performs acknowledge → remote/onsite → resolve → close, and communicates directly with the reporter. Verify old synthetic authenticated records survive; no browser-derived role or forged profile elevates privilege.
- Verify deployed CSP, no-store, service-worker private-cache behavior, expired signed-photo URLs, mobile camera/gallery and desktop layout. Confirm Phase 4 URLs/backend/Auth remain unchanged.
- Record throughput, DB/Edge costs, failed verification and admitted reservations without logging tokens, photographs, names or raw IP. Review ten-new-ticket/hour capacity against actual small-office needs. Define approved cleanup/retention for abandoned private drafts and retry receipts.
- Rollback: disable the enable gate, disable the isolated public function and remove/revert only the isolated preview as approved. Keep migration history and ticket data; database rollback/cleanup requires separate approval. Phase 4 remains unaffected.

Recommendation: GO for code review/local regression testing. NO-GO for the public staging pilot until configuration approvals, deployment gates and real authenticated/unauthenticated acceptance evidence are complete. [Cloudflare preview branch reference](https://developers.cloudflare.com/pages/configuration/preview-deployments/).

## Workflow readiness validation (2026-10-13)

Fetched Phase 5 and confirmed HEAD/FETCH_HEAD both equal expected `da6c83a958982d3f9cd5a59bbb506456d4417d9c` before edits. Read-only GitHub metadata confirmed default branch `main` and public visibility. Actionlint 1.7.12 (official archive SHA-256 verified) passes the revised YAML, contexts, permissions and expression syntax; ShellCheck was unavailable and disabled, so no ShellCheck pass is claimed. YAML/guard regression tests check both jobs against missing gates, wrong events/refs/SHA and deletion; checkout pinning, secret separation, permissions and artifact dependency are also checked. `npm test`: 50 passed; scoped ITCare lint passed; git diff whitespace check passed. No application or database code changed, so build/audit results from the prior hardening revision remain historical evidence rather than a newly claimed run. Actual GitHub Environment settings and a hosted request run still require approved operator verification; no deployment run was triggered to test them.
