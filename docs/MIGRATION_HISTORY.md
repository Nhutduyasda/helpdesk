# Verified migration history reconciliation

Phase 3 started on `phase-2-supabase-integration` at `e28ee50efbd69b2e1b83a24ab88b925e958c9ef7`. Main remained Phase 1 at `0b439d3`. Work continues on `phase-3-notifications-staging`.

Project `agcoboeswdvnumzyrtbu` recorded version `20261010075402`, name `itcare_initial`. The committed original filename was `202610100001_itcare.sql`. The cloud migration was not rerun.

Before reconciliation, the deployed tables/columns/defaults/checks/FKs/unique constraints, 10 function bodies, RLS policies, enum values, execution grants, empty function search paths and private bucket settings were inspected. A local PostgreSQL instance running the exact original SQL produced matching digests for columns, constraints, function bodies, policies and enums (`scripts/compare-schema.mjs`, `schema-digest.sql`, `docs/phase-3/schema-comparison.json`). NOT NULL is compared via columns because newer local PostgreSQL also records NOT NULL constraints separately from the cloud's PostgreSQL 17 catalog.

The repository file was renamed **without changing its SQL** to `20261010075402_itcare_initial.sql`, matching the verified deployed history. No cloud history rows were inserted/deleted/marked applied. No table was recreated, reset or deleted. Phase 2's original filename remains available in Git history and its historical QA documents.

Any later schema change must be a new additive migration after this version. Do not run the initial SQL on this existing project. Inspect migration status before using CLI push, and do not run a cloud reset. Existing migration reconciliation is separate from any notification schema addition.
