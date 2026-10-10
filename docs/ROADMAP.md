# Review gate and next phases

## Phase 3 current state — 2026-10-10

Critical live Auth, persistent description/image submissions, separate IT workflow, ownership isolation, deactivation and signed-URL expiry pass against `itcare-dev`. The migration filename now matches verified cloud history without SQL or remote-history changes. In-app notifications, explicit foreground device opt-in, static-only PWA and offline feedback are implemented. See `PHASE_3_LIVE_QA.md`, `NOTIFICATION_ARCHITECTURE.md` and `PWA_STAGING_QA.md` for evidence and limits.

Staging is **DEFERRED by the user** pending hosting authorization. Physical Android/iPhone installation, camera/keyboard and lock-screen delivery are **NOT TESTED**. Background Web Push is **BLOCKED** on trusted sender, subscriptions, VAPID secrets and end-to-end verification. Email fallback is **DEFERRED** without an approved provider.

Recommended Phase 4: authorize Cloudflare staging; configure the actual Auth URLs; repeat live acceptance and remote headers/CSP/deep-link checks; verify physical Android/iPhone; then add and prove minimal trusted background push. Before a real pilot, configure actual IT contact, leaked-password protection, invitation/password-reset UX, retention/draft cleanup ownership and monitoring; review server-side binary validation and persistent-draft requirements.

No main merge, production deployment, paid plan or real onboarding occurred. AI diagnosis, React Native, SaaS, inventory and asset-management expansion remain deferred. Full template lint debt and inherited large bundles are documented separately.

## Historical Phase 1/2 planning

Phase 0: source and license audit. Phase 1: frontend implementation and visual/functional review only.

Before integration: approve employee photo workflow, Vietnamese labels, desktop fidelity, status actions, accessible states; resolve remaining QA items; configure real support contact; review inherited npm dependency vulnerabilities and lint baseline.

Phase 2 was explicitly requested. Its code now includes real Auth/profile checks, PostgreSQL migrations/RPC/RLS, private Storage reservations, signed URLs and Context/SWR service contracts. The frontend design is preserved; polling replaces an optional realtime dependency. Local SQL/service and visual checks are documented in `PHASE_2_QA_REPORT.md`. The user has no Supabase project yet and requested code and configuration guidance first. Cloud Auth/Storage/PostgREST and refresh-persistence acceptance remain open.

Before a pilot: create an isolated test project, apply the migration, disable signup, securely provision synthetic users and first IT, execute all cloud acceptance checks, assign draft cleanup/photo retention, configure actual IT contact, review signed-URL/token expiry behavior and determine whether trusted binary validation is required. Invitation/password-reset completion UI, scheduled cleanup, realtime, pagination at scale and monitoring remain follow-up work.

Phase 2 uses a reviewable feature branch/PR under the user's authorized Git workflow. Main is not merged and no deployment is performed. Stop for user review. Real employee onboarding, production, AI diagnosis, React Native, SaaS and asset management remain deferred.
