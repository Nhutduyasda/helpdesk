# Review gate and next phases

Phase 0: source and license audit. Phase 1: frontend implementation and visual/functional review only.

Before integration: approve employee photo workflow, Vietnamese labels, desktop fidelity, status actions, accessible states; resolve remaining QA items; configure real support contact; review inherited npm dependency vulnerabilities and lint baseline.

Phase 2 was explicitly requested. Its code now includes real Auth/profile checks, PostgreSQL migrations/RPC/RLS, private Storage reservations, signed URLs and Context/SWR service contracts. The frontend design is preserved; polling replaces an optional realtime dependency. Local SQL/service and visual checks are documented in `PHASE_2_QA_REPORT.md`. The user has no Supabase project yet and requested code and configuration guidance first. Cloud Auth/Storage/PostgREST and refresh-persistence acceptance remain open.

Before a pilot: create an isolated test project, apply the migration, disable signup, securely provision synthetic users and first IT, execute all cloud acceptance checks, assign draft cleanup/photo retention, configure actual IT contact, review signed-URL/token expiry behavior and determine whether trusted binary validation is required. Invitation/password-reset completion UI, scheduled cleanup, realtime, pagination at scale and monitoring remain follow-up work.

Phase 2 uses a reviewable feature branch/PR under the user's authorized Git workflow. Main is not merged and no deployment is performed. Stop for user review. Real employee onboarding, production, AI diagnosis, React Native, SaaS and asset management remain deferred.
