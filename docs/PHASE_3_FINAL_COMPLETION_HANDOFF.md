# ITCare Phase 3 — staging handoff and final gate

Baseline: `phase-3-notifications-staging` commit `064479beab2d87335e3e4137f6af2130f11d5ed6`. This isolated branch adds CI/deployment preparation only; no business UI, Auth, SQL/RLS, storage, notification feature code or production settings are modified.

## What was completed
- A GitHub Actions workflow builds a **staging candidate**, runs `npm ci`, `npm test`, `npm run lint:itcare`, `npm audit --audit-level=high`, `npm run build`, and `node scripts/scan-build.mjs`. It uploads only the built `dist` artifact with a seven-day retention.
- Deployment is **disabled by default**. It requires explicit repo variable `ITCARE_STAGING_DEPLOY_ENABLED=true`, the exact authorized test Supabase URL, a project publishable key, and two Cloudflare account secrets.
- The optional deployment stage verifies an **already existing** Cloudflare Pages project named `itcare-staging`, checks that `itcare-preview` is not that project's production branch, and uploads only the tested build to its preview branch.
- This workflow deliberately does **not** create a Cloudflare account/project, migrate Supabase, promote production, merge branches, sign up employees, or configure paid services.

## User-owned external setup required before deployment
1. Choose/authorize the desired **Cloudflare account and Pages project** for staging. Account connection is not currently available to the assistant. In the Cloudflare dashboard, create a Direct Upload Pages project `itcare-staging` whose production branch is *not* `itcare-preview` (for example `main`). Review current provider terms/quotas before creating resources. Note: Direct Upload projects cannot subsequently be converted into Git-integrated projects.
2. On GitHub → repository → Settings → Secrets and variables → Actions, add repository **variables** `ITCARE_SUPABASE_URL=https://agcoboeswdvnumzyrtbu.supabase.co`, `ITCARE_SUPABASE_PUBLISHABLE_KEY` (the matching **public** `sb_publishable_...` key from Supabase dashboard) and `ITCARE_STAGING_DEPLOY_ENABLED=true` only when deployment is approved and ready.
3. Add repository **secrets** `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` limited to Pages edit for the chosen account. Never commit these values or send them in chat. The publishable key is browser-visible by design, but **secret/service-role** keys must never appear in `VITE_` variables.
4. Push a fresh commit on `phase-3-final-completion` to trigger gated deployment after prerequisites are met; otherwise CI tests/builds only. Do not deploy `main` because it still represents Phase 1.
5. Record the **actual** preview URL from GitHub Actions and add its exact HTTPS origin and appropriate Auth redirect patterns in Supabase `itcare-dev`. Do not invent or use wildcard production redirects.
6. After staging deploy, rerun real A/B/IT browser acceptance (login/session, description/photo upload, reply/resolve, private attachments, RLS negatives, deep-link refresh, notification, CSP/security headers). Review `docs/PWA_STAGING_QA.md` for tests and Cloudflare Pages specifics.
7. Use a physical Android phone and, if available, an iPhone to verify real camera/gallery capture, PWA home-screen installation, on-screen keyboard, session persistence and notification permissions. Report each unsupported/unverified case precisely.

## Explicitly NOT completed
- No external Pages staging site was provisioned/deployed; no URL is claimed.
- Background/closed-browser Web Push is **not** implemented: the existing Phase 3 app only supports in-app notifications and opt-in notifications while visible. Web Push requires a separately reviewed trusted sender, subscription table, VAPID private key stored server-side, and device delivery tests. See `docs/NOTIFICATION_ARCHITECTURE.md`.
- Real-device QA requires the user's hardware.
- Supabase Security Advisor currently reports intentional callable SECURITY DEFINER RPC findings and a leaked-password protection warning; these are not automatically remediated. Never revoke RPC access indiscriminately.

## QA and merge gate
This branch is preparatory infrastructure, not Phase 3 completion. The GitHub Actions workflow run is required to independently validate it. Until staging and device tests pass, retain **NO-GO** for production, company onboarding and full Phase 3 lock. Review PR before merging; do not auto-merge into `main`.
