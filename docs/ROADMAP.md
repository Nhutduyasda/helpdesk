# Review gate and next phases

Phase 0: source and license audit. Phase 1: frontend implementation and visual/functional review only.

Before integration: approve employee photo workflow, Vietnamese labels, desktop fidelity, status actions, accessible states; resolve remaining QA items; configure real support contact; review inherited npm dependency vulnerabilities and lint baseline.

Phase 2 boundaries (requires explicit approval): replace mock operations behind context/service contracts with Supabase authentication, PostgreSQL tickets/employees/replies/status history, scoped storage attachments and optional realtime. Define authorization/RLS and photo retention before implementation. Replace demo login and sessionStorage identity. Preserve component layouts. No schema, migration, SDK, backend or storage integration has been implemented.

Pilot, production deployment and React Native are postponed. Stop at frontend review. No deployment, remote repository creation, commits or pushes are part of this work.
