# Phase 2 QA and review gate

Starting repository: `https://github.com/Nhutduyasda/helpdesk`, main `0b439d3cf5493840eeb79c97ba1c027932e5701d`. Feature branch: `phase-2-supabase-integration`. The user explicitly has no Supabase project yet and requested code/configuration guidance first.

## Implemented

Official SDK email/password login, persistent sessions and trusted active profiles; protected route restoration/logout; separate SWR user caches; typed gateway/service contracts; polling/retry; five-table migration, immutable owner/audit grants and RLS; private Storage reservations and signed URLs; idempotent ticket creation and mutations; transactional finalization/comments/history; closed-ticket restrictions. UI layouts and original Phase 1 screenshot files were preserved. Setup, first IT provisioning, synthetic accounts, retention/reset and limitations are documented.

## Tested successfully locally

- Clean install, TypeScript/Vite production build and scoped ESLint. Full lint still has 13 inherited errors and 3 warnings (baseline 18 errors/3 warnings). Raw logs: `phase-2/`.
- `npm audit`: zero vulnerabilities after targeted same-major updates; baseline nine. Large bundle warning remains.
- `npm test`: 20 tests pass. SQL migration executes on PGlite PostgreSQL; direct grants, RLS, RPCs, transactions and upload-service/gateway contracts pass. This environment has no Docker, Supabase CLI or live project. The auth/storage schemas and roles in these tests are simulated, not Supabase cloud services.
- Existing visual QA: 13 check groups, 42 reported screenshots plus auxiliary states, zero JavaScript errors, no page-level horizontal overflow. Sizes: 375×812, 390×844, 768×1024, 1366×768, 1440×900. Data mode is explicitly development demo; this verifies UI behavior, not real backend persistence.
- Existing visual polish script also passes sidebar icon/wordmark, dark mode and detail-card checks at four sizes. Its separate evidence is in `phase-2/polish` so the original baseline and main screenshot comparison are unchanged.
- Compared 48 matching Phase 1/2 PNGs by RGB difference threshold 16. 33 comparisons have no changed pixels by that threshold; 14 have small differences up to 2.183% including generated timestamps, synthetic source content and active states. One failure-state screenshot has different height from a changed error message. Actual employee detail screenshots were inspected side by side: layout/font/cards/photo/navigation remain consistent, with timestamp changes. No pixel-perfect parity claim. `phase-2/visual-comparison.json` contains per-screen metrics.
- Production preview checks: missing config displays disabled login; forged demo session cannot access IT/employee routes; no MSW registration/mock requests; compiled JS lacks demo credentials/session shortcut and secret-key patterns. The SDK's literal secret-key prefix is not an actual credential. No actual project keys exist in this workspace.

## Security matrix

| Case | Local evidence | Live acceptance still needed |
|---|---|---|
| A | Employee A cannot select B's draft or submitted ticket | Repeat through Supabase REST with A's JWT |
| B | Storage object RLS rejects guessed paths/cross-owner reads/uploads | Storage upload and signed-URL HTTP requests with A/B/IT |
| C | Employee direct status update denied; RPC requires IT | REST/RPC attempts with real employee session |
| D | Direct role edit denied; metadata cannot create active IT | Auth user creation/profile REST attempts |
| E | Inactive/existing deactivated identity sees no business rows/objects; mutations denied | Retained real JWT, token refresh, signed URL expiry |
| F | IT reads submitted tickets and processes transactionally | IT browser receives/acknowledges/resolves employee ticket |
| G | Anonymous SELECT and RPC denied | Publishable-key-only REST/Storage HTTP requests |
| H | Same request/operation UUIDs do not duplicate; changed payload denied | Double-click, concurrent HTTP requests, network retry after commit |
| I | Upload error prevents finalize; missing/wrong object metadata rolls back | Interrupt actual Storage upload, retry, inspect orphan cleanup |
| J | Direct event modification/delete denied | Real employee REST attempt |
| K | SQL records persist across queries; demo browser refresh is not real persistence evidence | Reload/browser restart after successful real Auth/ticket/reply/update |
| L | Production build scanner passes; only public config allowed | Repeat artifact scan after configuring test deployment |
| M | Comments/history obey ownership; actors assigned by server | Real independent A/B/IT sessions |
| N | Production ignores forged demo identity; no demo module/credentials/MSW | Configured real-data login/session navigation |

## Implemented but unverified on Supabase

Auth password login and token/session restoration, PostgREST composite RPC response shape, actual Storage metadata/upload/error/signing behavior, deployment redirects and realtime user interactions with persistent data. Local PostgreSQL/service tests cannot certify these interfaces. An inactive account should receive a clear error; invalid/expired sessions should return to login, never mock data. Validate this with the official live SDK before a pilot.

## External setup and acceptance gate

Create a disposable test project; disable signup; apply migration; configure the public URL/key; securely create independent A/B/IT/inactive users. Follow `SUPABASE_ARCHITECTURE.md`. Then run two separate browser sessions: A sends description-only and photo-only tickets; IT sees them, acknowledges, replies, selects remote/onsite, resolves with result and closes; A sees result after refresh and browser restart; B cannot retrieve A's records/photos/history through direct APIs. Test missing config, bad password, inactive/expired auth, failed upload/network, successful retry, logout and employee deactivation. Inspect database rows/events and bucket objects after each case. Assign retention/cleanup responsibility and verify credentials never reach committed logs or screenshots.

## Deferred

Invitation/password-reset completion screens, scheduled abandoned-draft cleanup, trusted full binary validation/scanning, load/concurrency stress, server pagination/monitoring, realtime, actual support contact values. Existing signed URLs last up to 120 seconds; token logout revocation follows Supabase expiry semantics. No production deployment, main merge, real onboarding or next phase was performed.

## Changed areas

`src/context/itcare`, `src/services/itcare`, `src/integrations/supabase`, `src/api/itcare/domain.ts`, existing business views/router/bootstrap/sidebar/fetcher, package/lock/Vite config, MSW worker, `supabase/`, `.env.example`, tests, QA scripts and Phase 2 documents/evidence. Review the feature branch diff for the full file list. Phase 1 baseline remains in `docs/screenshots`.
