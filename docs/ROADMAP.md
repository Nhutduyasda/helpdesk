# Review gate and next phases

## Phase 6 — IN DEVELOPMENT — 2026-10-13

Phase 6.1 architecture C is conditionally approved for source/local work. [Feasibility checkpoint](phase-6/feasibility-report.md): same-origin Pages Functions is supported, but existing 5 MiB image handling exceeds the local sampled Free CPU budget. Production ingress implementation stops under owner condition A.6; local probe and verification-only CI are reviewable. No cloud deployment is proposed until this feasibility blocker is resolved.

Final bounded profiling measures ~130–152 ms at 3×5 MiB; Free is impractical with current safeguards. Decision B recommends evaluating Paid, while ~105 MiB backing-store snapshot and concurrency remain unproven. Any Paid-target implementation, hosted preview and purchase need separate review/approval.

The authorized final local round ended without production source edits: body buffering (~69 ms), multipart parsing (~20 ms) and per-file hashing (~49 ms total) dominate the maximum case. Validation passed 51 tests, scoped lint, TypeScript/build, project and isolated-tool audits, and the Phase 6 scanner. See the final checkpoint in `docs/phase-6/feasibility-report.md`; its CPU/memory figures supersede preliminary values. Next checkpoint is a separate approval for a Paid-target repository implementation and local concurrency profiling. Public pilot remains NO-GO.

Phase 6 starts on `codex/phase-6-operational-readiness` at verified Phase 5 SHA `8232ab0ede155fb9f73f4d5ff70ac4387ee17ac4`. See [Phase 6 audit and plan](phase-6/README.md). Architecture/operations/pilot planning and a synthetic replay regression are reviewable; security-ingress implementation and cloud changes await separate owner approval. Phase 4 and Phase 5 staging remain preserved; no main merge, deployment, migration, DNS change, paid upgrade, data deletion or invitations are authorized.

**Phase 5 public employee pilot remains NO-GO:** direct anonymous Supabase intake execution; missing genuine-token replay and fresh-token HTTP idempotency; unverified simultaneous admission and current signed-URL expired HTTP response; incomplete hosted mobile/desktop acceptance; unapproved backup/retention/recovery/contact procedures; Free-plan leaked-password limitation. Prior genuine submission, IT lifecycle and inactive/non-IT denial evidence do not close these gates. Retain ITC-1004 and both QA Auth identities until explicit cleanup permission. Phase 6 start is not Phase 5 security acceptance.

## Phase 4 current gate — 2026-10-12

Repository baseline and current read-only Supabase controls verified. Scanner/staging-QA portability fixes are scoped to the stacked Phase 4 branch. HTTPS staging and independent authenticated A/B/IT acceptance remain BLOCKED; physical-device cases are NOT TESTED. **NO-GO for employee pilot** until those and operational prerequisites pass. See `PHASE_4_STAGING_REPORT.md` and `PHASE_4_PILOT_CHECKLIST.md`. No background push feature, main merge, production deployment or real onboarding is authorized by this status.

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
