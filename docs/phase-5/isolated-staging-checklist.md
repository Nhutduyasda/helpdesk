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

The new `.github/workflows/itcare-phase5-preview.yml` is manual-only; neither pushes nor PRs deploy. It contains no Supabase migration, function deployment or Auth mutation.

Create a protected GitHub environment `itcare-phase5-preview` **before enabling dispatch**, with required reviewers, prevent self-review where supported, no administrator bypass, and deployment branch restriction to `codex/phase-5-passwordless-reporting`. Confirm your repository plan supports those protections; if not, leave the gate disabled and request an alternative approval process. Both preparation and deployment jobs use the environment.

Repository variable (non-secret gate): `ITCARE_PHASE5_DEPLOY_ENABLED=false` by default. Set to `true` only after resource/configuration approvals and environment protections are verified. This job-level gate must be repository-scoped; environment variables are not available until the job enters that environment.

Environment public variables:

| GitHub variable | Browser build value |
| --- | --- |
| `ITCARE_PHASE5_SUPABASE_URL` | `VITE_SUPABASE_URL`: approved isolated project HTTPS origin; Phase 4 ref is rejected |
| `ITCARE_PHASE5_SUPABASE_PUBLISHABLE_KEY` | `VITE_SUPABASE_PUBLISHABLE_KEY`: isolated project's public publishable key only |
| `ITCARE_PHASE5_DEPARTMENTS` | `VITE_ITCARE_DEPARTMENTS`: approved labels, identical to Edge list |
| `ITCARE_PHASE5_TURNSTILE_SITE_KEY` | `VITE_TURNSTILE_SITE_KEY`: isolated widget's public sitekey |

`VITE_ITCARE_DEMO` is fixed to `false`. The build guard rejects secret-like VITE names and requires the approved full commit SHA to equal the dispatched `GITHUB_SHA`. It rewrites **only built** `dist/_headers` to the isolated Supabase HTTP/WebSocket/image host, preserving no-store, private caching, Turnstile CSP and blocked geolocation. Checked-in Phase 4 header configuration is unchanged. Do not point an isolated preview at the Phase 4 backend.

Environment secrets used only in the deploy job: `ITCARE_PHASE5_CLOUDFLARE_ACCOUNT_ID` and `ITCARE_PHASE5_CLOUDFLARE_API_TOKEN`. Use minimal Pages permissions and preferably an isolated account; if the provider cannot scope to one project, record the account-level risk and rely on the reviewed fixed project name plus environment approvals. No Supabase privileged credentials are present in the workflow. Build jobs do not receive Cloudflare deployment credentials.

## 4. Explicit deployment authorization

Obtain explicit approval for the exact feature commit and isolated resource identities. Then, and only then:

1. Authorized operator applies the reviewed migration(s), provisions only approved synthetic test identity/data, configures Edge secrets/Turnstile, and deploys the one function. These are separately approved actions; the preview workflow cannot do them.
2. Dispatch `ITCare Phase 5 isolated preview (approval required)` **from the Phase 5 branch**, with `approved_commit` equal to the approved full SHA and `approval=DEPLOY_ISOLATED_PHASE5`.
3. Required environment reviewer inspects revision/resource configuration and approves the jobs. The workflow runs tests, scoped application/Edge lint, audit, build, isolated CSP rewrite and security scanner before saving the revision-specific artifact.
4. Before publishing, the workflow queries the Cloudflare API and requires project name `itcare-phase5-test` and production branch `phase5-production-disabled`. It uploads that artifact only to `phase5-preview`. Failure is a stop, not permission to change Phase 4 or remove a guard.

No workflow dispatch, live migration, Edge deployment, Pages deployment or Auth update has been performed during this preparation.

## 5. Real acceptance tests and rollback

- Unauthenticated reporter opens `/` or `/report`, requires name/department, submits description-only and image-only with genuine Turnstile, and sees reference only. Invalid files/oversize/slow streams/token failures create no reservation or admission charge. Repeated identical requests and response-loss retries yield one ticket even at capacity; content changes reject reuse. Test concurrent Edge instances and window transitions on real Postgres.
- Anonymous business table SELECT/INSERT/UPDATE/DELETE, intake/IT RPC execution and private Storage reads/download/signing fail. A guessed public reference never reveals ticket content. Inactive/non-IT identities cannot read internal comments/history or perform IT actions. Test forged session/client IP headers and missing/incorrect Origin; treat Origin as filtering only.
- Active test IT logs in at `/it/login`, receives the submitted ticket/notification, sees self-reported identity/location and authorized private photos, performs acknowledge → remote/onsite → resolve → close, and communicates directly with the reporter. Verify old synthetic authenticated records survive; no browser-derived role or forged profile elevates privilege.
- Verify deployed CSP, no-store, service-worker private-cache behavior, expired signed-photo URLs, mobile camera/gallery and desktop layout. Confirm Phase 4 URLs/backend/Auth remain unchanged.
- Record throughput, DB/Edge costs, failed verification and admitted reservations without logging tokens, photographs, names or raw IP. Review ten-new-ticket/hour capacity against actual small-office needs. Define approved cleanup/retention for abandoned private drafts and retry receipts.
- Rollback: disable the enable gate, disable the isolated public function and remove/revert only the isolated preview as approved. Keep migration history and ticket data; database rollback/cleanup requires separate approval. Phase 4 remains unaffected.

Recommendation: GO for code review/local regression testing. NO-GO for the public staging pilot until configuration approvals, deployment gates and real authenticated/unauthenticated acceptance evidence are complete. [Cloudflare preview branch reference](https://developers.cloudflare.com/pages/configuration/preview-deployments/).
