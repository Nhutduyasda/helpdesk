# ITCare Phase 3 review

Phase 4 staging review is in progress on a separate stacked branch. See [current results and external blockers](docs/PHASE_4_STAGING_REPORT.md) and [pilot checklist](docs/PHASE_4_PILOT_CHECKLIST.md). No HTTPS staging or employee pilot is approved by the repository-only checks.

Built on Shadcn Dashboard React Free revision `386235c3199168fa743db593d7acf014a40f1ca1`. Original template README content, MIT license and attribution are retained. Phase 3 starts from Phase 2 commit `e28ee50efbd69b2e1b83a24ab88b925e958c9ef7`, on `phase-3-notifications-staging`. The live test project is `itcare-dev` (`agcoboeswdvnumzyrtbu`). Main remains Phase 1.

Critical live acceptance passes: IT/A/B login, persistent description and private-image tickets, separate IT browser workflow, refresh/logout, ownership-negative API/UI checks, immediate deactivation, closed tickets and signed-URL expiry. In-app notifications and foreground browser Notification API are verified. Background/closed-app push is BLOCKED; physical phone delivery and installation are NOT TESTED. Staging deployment is DEFERRED by the user; code and Cloudflare deployment instructions are complete without a claimed staging URL.

- [Phase 3 live evidence](docs/PHASE_3_LIVE_QA.md)
- [Notification architecture and push requirements](docs/NOTIFICATION_ARCHITECTURE.md)
- [PWA results and staging deployment guide](docs/PWA_STAGING_QA.md)
- [Verified migration history](docs/MIGRATION_HISTORY.md)

The initial migration was renamed to `supabase/migrations/20261010075402_itcare_initial.sql` after verifying matching schema/function/policy digests. SQL content and remote history were not changed. Do not rerun the initial SQL on this existing project.

```powershell
npm ci
# Configure .env.local using .env.example and the setup guide first.
npm run dev -- --host 127.0.0.1 --port 5174
```

Open http://127.0.0.1:5174/login for employees or http://127.0.0.1:5174/it/login for IT. Real mode uses provisioned email/password accounts and database roles. Missing configuration shows an error. Development demo must be explicitly enabled with `VITE_ITCARE_DEMO=true`; production always uses the real provider. See the setup guide for test project provisioning and demo QA instructions.

Run `npm test`, `npm run lint:itcare`, `npm run build`, `npm audit` and `node scripts/scan-build.mjs`. Verified: clean install, 22 tests, scoped lint, build and zero audit vulnerabilities. Full lint still reports 13 inherited errors and 3 warnings. Browser scripts use Microsoft Edge and bundled Playwright. Existing visual QA requires an explicitly enabled development demo server: use `QA_BASE_URL=http://127.0.0.1:5176` and `QA_OUTPUT=docs/phase-3/visual`. Set `QA_COMPARE_DIRECTORY` and `QA_RESULT_FILE` for Phase 3 comparisons. Phase 1/2 screenshots are preserved. `scripts/production-qa.cjs` is historical Phase 2 missing-config QA; the current configured production checks are `scripts/pwa-qa.cjs`, `scripts/scan-build.mjs` and `scripts/foreground-notification-qa.cjs`.

Live tests require the six non-VITE `ITCARE_TEST_*_EMAIL/PASSWORD` variables in ignored `.env.local`. Never upload these, service-role keys, VAPID private keys or hosting tokens. Only the publishable URL/key and `VITE_ITCARE_DEMO=false` belong in a frontend build. The production service worker caches static assets only and displays explicit offline feedback. In-memory form content survives network/upload failure; full reload of an unsent draft is not persisted.

- [Design audit](docs/DESIGN_AUDIT.md)
- [Screen inventory](docs/UI_SCREEN_INVENTORY.md)
- [Design specification](docs/UI_DESIGN_SPEC.md)
- [Visual QA report and screenshots](docs/VISUAL_QA_REPORT.md)
- [Roadmap and approval gate](docs/ROADMAP.md)
- [Supabase setup and first IT provisioning](docs/SUPABASE_ARCHITECTURE.md)
- [Schema](docs/DATABASE_SCHEMA.md)
- [Security and RLS](docs/SECURITY_RLS.md)
- [Phase 2 stabilization](docs/PHASE_2_STABILIZATION.md)
- [Phase 2 QA and live acceptance checklist](docs/PHASE_2_QA_REPORT.md)

Review the Phase 3 Draft PR and the actual evidence/limitations before approving staging or pilot work. No production deployment, main merge, paid plan or real employee onboarding was performed. Recommended Phase 4: authorized HTTPS staging, physical-device QA, then trusted background push and pilot prerequisites listed in `docs/ROADMAP.md`.
