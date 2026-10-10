# Phase 3 live Supabase QA — 2026-10-10

Baseline: Phase 2 commit `e28ee50efbd69b2e1b83a24ab88b925e958c9ef7`; branch `phase-3-notifications-staging`. Project `itcare-dev` (`agcoboeswdvnumzyrtbu`). Tests use real publishable-key SDK requests and independent real Auth sessions. A/B are user-created synthetic employees, not impersonated identities. Their passwords and the IT credentials remain only in ignored `.env.local` with no `VITE_` prefix. Public signup was disabled by the user and verified through Auth settings.

## Acceptance gate

PASSED: critical authentication, storage, persistence and authorization. Notification implementation began only after the live data and browser workflow tests passed.

| Flow | Result | Evidence |
|---|---|---|
| Invalid password, IT login, role/profile, refresh, logout and protected route | PASSED | `phase-3/live-auth.json` |
| A/B/IT real login and active roles | PASSED | `phase-3/live-data.json` |
| Description submission; concurrent same request ID produces one ticket | PASSED | `phase-3/live-data.json` |
| Real PNG upload to private bucket; verified finalization | PASSED | `phase-3/live-data.json` |
| Separate IT browser: acknowledge, reply, remote method, resolution; A sees after refresh | PASSED | `phase-3/live-workflow.json` |
| B direct REST cannot read A ticket, comments, events, metadata or generate image URL | PASSED | `phase-3/live-data.json` |
| B direct UI cannot open A detail | PASSED | `phase-3/live-browser.json` |
| Anonymous RPC/REST denied; employee role/status escalation denied | PASSED | `phase-3/live-data.json` |
| Existing B JWT loses business/RPC/storage access when deactivated; restored afterward | PASSED | `phase-3/live-data.json` |
| Closed ticket rejects changes; IT reply operation ID deduplicates | PASSED | `phase-3/live-data.json` |
| Signed URL works, then fails after its expiry | PASSED | `phase-3/live-data.json` |
| Invalid type and image over 5 MiB rejected in browser | PASSED | `phase-3/live-browser.json` |
| Offline submit retains current description and selected photo | PASSED | `phase-3/live-browser.json` |
| Controlled interrupted upload, then real successful retry and refresh persistence | PASSED | `phase-3/live-browser.json` |
| Refresh while response is pending after server commit recovers exactly one ticket | PASSED | `phase-3/live-workflow.json` |
| Expired local session with invalid refresh token redirects to login | PASSED (controlled expiry case) | `phase-3/live-workflow.json` |

The session-expiry test changes the local test session to expired and uses a rejected refresh token. Waiting for a full natural provider token lifetime is NOT TESTED. Refresh-before-commit recovery of an unsent form is NOT TESTED; there is no persistent offline draft or offline queue. In-memory form values survive network/upload errors, but a full reload or logout can discard an unsent draft. A request committed before reload remains in “Yêu cầu của tôi”; check that list before creating a new request after an ambiguous network result.

Synthetic tickets are deliberately retained as QA evidence, including records from earlier failed test assertions. They contain only descriptions prefixed `PHASE3 QA` and the generated ITCare icon. No production onboarding, reset, deletion or main merge occurred. Tests that temporarily deactivate B restore it in `finally`.

## Repeat locally

Start the real app at port 5174 with `VITE_ITCARE_DEMO=false`. Add the six `ITCARE_TEST_*_EMAIL/PASSWORD` variables from `.env.example` to ignored `.env.local`. Run from the application root:

```powershell
node scripts/live-auth-qa.cjs
node --experimental-strip-types scripts/live-data-qa.mjs
node scripts/live-browser-qa.cjs
node scripts/live-workflow-qa.cjs
node scripts/notification-qa.cjs
```

Playwright scripts use installed Microsoft Edge and the bundled Playwright runtime; override `PLAYWRIGHT_MODULE` where supported or adjust its local path for a different workstation. Re-running creates additional synthetic tickets. Browser fault injection is explicitly reported as controlled; database reads, writes, uploads and ownership checks use the live Supabase API.
