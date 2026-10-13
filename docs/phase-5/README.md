# Phase 5: passwordless incident intake

Starting commit: `529a6ee406889af64ac1d1ad39f6366993e58d8e` (fetched and verified against `origin/phase-4-staging-pilot-readiness`). Branch: `codex/phase-5-passwordless-reporting`. The PR targets Phase 4; no merge or deployment is authorized by this delivery.

## Architecture and routes

`/` and `/report` immediately show a public form. `/login` and `/employee/*` redirect to `/report`. The header links to `/it/login`; successful active IT login goes to `/it/inbox`. The existing IT gate, dashboard, inbox, employee management, history, notifications and acknowledge / remote / onsite / resolve / close workflow are retained. A non-IT login is rejected and its local session signed out.

The public form requires full name, a configured department, and a description OR an image. Optional location accepts a workstation, room, floor or equipment identifier. Camera/gallery selectors retain the original three-image, JPEG/PNG/WebP, 5 MiB/file limits. Errors preserve entered data; retry retains its request UUID. Changing content generates a new UUID. A receipt displays only the ticket reference; there is no public ticket lookup, list or detail route.

Browser → multipart `public-intake` Edge Function → server-verified Turnstile → server-only reservation RPC → immutable uploads to the existing private bucket → atomic finalization RPC → existing Admin inbox and submission notification.

The function has `verify_jwt=false` intentionally because employees have no session. It independently verifies the bot token, hostname and `incident-report` action. The service-role key exists only in the Edge runtime. CORS restricts exact configured origins but is not treated as authentication.

## Additive database change

Apply only `20261013023844_public_incident_intake.sql` to the verified Phase 4 schema, in one transaction. Never rerun the initial migration on an existing project.

- Add reporter name, department and optional location to tickets, with a constraint requiring identity when employee ownership is absent.
- Allow null employee, attachment uploader and event actor for public reports. Existing foreign keys remain and authenticated rows retain their owners. No synthetic employee accounts are created.
- Add private, RLS-enabled request reservations and rate counters. Neither anon nor authenticated can access these tables or execute intake RPCs.
- Restrict new RPC execution to service_role; SECURITY DEFINER functions use an empty search path. Reservation serialization uses a transaction advisory lock and a unique request ID. Hash mismatches reject changed-content retries; finalization locks the ticket and creates one submission event.
- Restrict comment/event SELECT policies to active IT. Replace update_ticket with the existing transaction and lifecycle validation plus an active IT check for all mutations, including comments. Old employee commenting/history access is intentionally retired. Existing ticket/attachment ownership reads and authenticated prepare/finalize behavior remain compatible.
- Keep all business RLS, anon privilege revocations, private bucket configuration and authenticated storage policies. Public drafts remain invisible to IT until finalization.

Live schema, policies, foreign keys, stored-function bodies and bucket settings were inspected through read-only catalog queries. The bucket remains private with a 5 MiB limit and the three allowed image MIME types. No live migration, ticket mutation or deployment was performed.

## Security findings and boundaries

The endpoint bounds the streamed body to 16 MiB even without Content-Length; enforces text limits, configured department membership, UUID format, three attachments, MIME and byte signatures; verifies bot tokens server-side before reservation; and never returns ticket content, object paths or signed read URLs. SQL independently validates reservation fields/manifests. Storage retries verify existing object SHA-256 rather than trusting a duplicate status. Finalization checks reserved object size and MIME. Private attachments remain readable only through existing authorized signed URLs (120 seconds).

Rate counters persist in Postgres across Edge instances: 100 attempts/hour globally and 10/hour per HMAC bucket, including invalid submissions. Counters expire after two hours. With no trusted IP header configured, all visitors share the conservative 10/hour bucket. Do not enable an IP header until the gateway's overwrite/anti-spoofing behavior is verified. The global cap still applies if an IP header can be spoofed. Thresholds may block a legitimate office sharing an IP; assess retry volume during the pilot. A determined attacker can exhaust the shared/global allowance, so upstream WAF and operational monitoring remain necessary for availability.

Names/departments/location are self-reported and unverified, explicitly labelled in the form and IT detail view. Turnstile verifies human/bot risk, not identity. Existing authenticated employee records remain readable by their authorized owners through the legacy API; public visitors have no such rights. Comments, history and IT mutations require active IT. No raw IP is stored. Image metadata may include sensitive EXIF; this implementation checks signatures, not full decoding, malware scanning or EXIF removal. Images render with normal img elements from private signed URLs; SVG is rejected.

Interrupted submissions can leave private drafts/uploads. They do not enter the inbox. Review retention and an approved server-side cleanup job before a sustained pilot; do not delete reservations casually because they preserve retry deduplication. The request UUID lives in the current form; response-loss retries within that form are deduplicated. A deliberately new form/reload receives a new UUID and can create a new report.

## Actual verification

- `npm test`: **41 passed**, including SQL RLS/privilege checks under anon, authenticated employee, active IT and service_role; public reservation/finalization; retries; image-only completeness; active IT lifecycle; historical ownership; bot rejection; bounded bodies; handler failures; notification recipients; private-cache/header assertions. The SQL fixture creates authenticated records under the initial schema before applying Phase 5 and compares all existing profile/ticket/attachment/event values before and after migration.
- `npm run lint:itcare` and `npx eslint supabase/functions/public-intake --max-warnings 0`: passed.
- `deno check supabase/functions/public-intake/index.ts`: passed against pinned supabase-js 2.117.3.
- `npm audit --audit-level=high`: zero vulnerabilities.
- `npm run build`: passed TypeScript and Vite. Existing large-chunk/plugin timing advisories remain.
- `node scripts/scan-build.mjs`: passed; see build-scan.json. Scanner also checks configured Turnstile/rate secrets, including incorrectly VITE-prefixed values.
- `scripts/phase5-browser-qa.cjs`: passed at 390 px and 1440 px; description-only, image-only, invalid file rejection, required fields, retry preservation, receipt, no horizontal overflow, Admin gate and obsolete routes. Bot/HTTP responses are synthetic; this is not live Supabase evidence. See browser-results.json and screenshots.
- Full `npm run lint`: **fails on 13 errors and 3 warnings in unchanged template blog/notes/ticket/header files**. Phase 5 scoped checks pass; repository-wide lint is not claimed clean.

Local SQL uses PGlite with mocked auth/storage catalog tables; HTTP tests inject a fake storage/database client and bot verifier. These prove application behavior and local SQL permissions, not the deployed Supabase gateway/storage/Turnstile configuration or concurrent multi-instance behavior. No real Phase 5 authenticated/unauthenticated end-to-end security test has run because the migration/function are not deployed.

## Exact deployment review plan — approval required

1. Confirm the target is the authorized staging Supabase project `agcoboeswdvnumzyrtbu`, recheck schema digest, migration history and RLS/grants, take an approved backup, and review the additive SQL diff above. Run it against an isolated Supabase test environment first, including actual private storage, concurrent reservations/retries and denied anon calls.
2. Approve applying only the new migration. Preserve the initial migration/history and all existing records. Run advisors and verify anon cannot SELECT/INSERT/UPDATE/DELETE business tables or call intake/IT RPCs; non-IT users cannot read comments/history or mutate tickets.
3. Configure an approved Turnstile widget for the exact staging hostname. Store `TURNSTILE_SECRET_KEY`, a random `INTAKE_RATE_SECRET`, `INTAKE_ORIGINS` (exact origins separated by |), and `INTAKE_DEPARTMENTS` (office-approved labels separated by |) in Edge secrets. Leave `INTAKE_TRUSTED_IP_HEADER` unset until trusted-proxy behavior is proven. Supabase supplies its server-only URL/service-role key. Never supply those secrets to a Vite/hosting build.
4. Approve deploying only `public-intake` with the committed JWT setting. Confirm missing/bad/expired/replayed tokens, incorrect hostname/action, oversized streams, invalid images, rate limits and all storage failure paths fail closed. Inspect function logs without recording submitted identity, image data, tokens or keys.
5. Build with public `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_ITCARE_DEPARTMENTS` matching the server list, and `VITE_TURNSTILE_SITE_KEY`. Run tests, scoped lint, audit, build and scanner again. The new CI workflow verifies only and has no deploy job.
6. Approve a separate Phase 5 Cloudflare preview URL; do not overwrite the current staging deployment. Verify deployed CSP supports Turnstile, geolocation is still blocked, Cache-Control is no-store, and service-worker caches contain no HTML, report payloads, Supabase data or private photos.
7. Run real unauthenticated and authenticated tests: submit text/image-only tickets with genuine bot validation, simulate response loss and concurrent retries, inspect denied business/Storage API access, log in as active IT, receive notification and read private photos, perform the full lifecycle, and confirm old records/owners remain intact. Test mobile camera/gallery and expired signed URLs. Save evidence and obtain pilot acceptance.

Until these steps have approval and real security evidence, **NO-GO for a live staging pilot or production readiness**. **GO for code review and isolated local testing**. Roll back frontend/function exposure by restoring Phase 4 build and disabling the intake function; keep the additive database changes/data and review any database rollback separately.

## Future location privacy

No GPS API or permission request is used in Phase 5. `public/_headers` retains `geolocation=()`. A later phase could offer an explicit, optional “share approximate location” action with clear purpose, coarse precision, limited retention and IT-only visibility. It would require a reviewed Permissions-Policy change and secure-context browser testing. Always retain manual location, and never collect GPS on page load or make it a condition of submission.

References checked: [Supabase public Edge Function authentication](https://supabase.com/docs/guides/functions/auth), [Cloudflare server-side Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), and the Supabase changelog. The October 12 TLS cipher deprecation applies in November; modern browser/Edge clients are required.
