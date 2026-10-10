# Phase 3 evidence index

All files are generated from local QA or the live isolated Supabase test project. No production data or credential values are included. Screenshot masks conceal live profile information. `visual/` contains **demo** regression screenshots; `screenshots/` contains sanitized live/public-production-preview evidence. Phase 1/2 evidence is preserved.

| Evidence | Result |
|---|---|
| `install.txt` | PASSED npm ci; MSW postinstall remains an npm allow-scripts warning, existing worker verified by demo QA |
| `tests.txt` | PASSED 22 SQL/service/gateway/notification tests |
| `scoped-lint.txt` | PASSED ITCare scope including new hook/header |
| `full-lint.txt` | FAILED: inherited 13 errors / 3 warnings outside ITCare scope |
| `build.txt`, `build-scan.json` | PASSED TypeScript/build, no configured private QA/server values in compiled JS |
| `audit.json` | PASSED zero vulnerabilities |
| `schema-remote.json`, `schema-comparison.json` | PASSED matching migration/schema digests; no cloud history mutation |
| `live-auth.json` | PASSED IT browser login/error/refresh/logout |
| `live-data.json` | PASSED real SDK ticket/storage/auth/RLS negatives |
| `live-browser.json` | PASSED mobile-sized real employee/ownership/upload-failure/offline/image-decode flow |
| `live-workflow.json` | PASSED separate A/IT browser workflow, committed-request refresh and controlled expiry |
| `notification-qa.json` | PASSED in-app routing, read-state persistence, failure isolation and controlled denied permission |
| `foreground-notification-qa.json` | PASSED real browser Notification API and reload dedup; physical OS delivery NOT TESTED |
| `pwa-qa.json` | PASSED manifest/icons/worker/private-cache/offline; actual installation NOT TESTED |
| `visual/qa-results.json`, `visual/polish-results.json` | PASSED 13 checks, 42 reported screens plus auxiliary captures, no JS errors/overflow |
| `visual-comparison.json` | 48 screenshots compared to Phase 1; max differing pixels 2.047%; dynamic dates/content unmasked, not a pixel-perfect assertion |

Background Web Push BLOCKED; email DEFERRED; staging DEFERRED by user; physical Android/iPhone NOT TESTED. Follow `../PWA_STAGING_QA.md` for future deployment and remote acceptance.
