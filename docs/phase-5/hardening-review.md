# Phase 5 focused hardening review

Continued from fetched Phase 5 HEAD `7598db86631f1b91d4d35d3e0ffd16149888dc65`, on the same feature branch and draft PR #5. No deployment, live migration, Auth change or production action was performed.

## Availability finding and smallest scoped fix

Previously, every allowed-origin POST charged the shared 10-attempt/hour bucket before parsing and Turnstile verification. A script could set a permitted Origin (CORS does not authenticate non-browser callers), send ten malformed/forged-token requests, and deny the office further submissions. Rotating a client-controlled IP header could also manipulate the bucket if an operator enabled the old configurable header without proving gateway trust. Network retries spent capacity again.

The additive `20261013031245_intake_availability_hardening.sql` retires service access to the old limiter. The new service-only `intake_precheck()` has two fixed global buckets: 120 requests/minute and 1,000/hour. Counts saturate above the thresholds to avoid integer overflow; no attacker-generated bucket identities are accepted. The handler ignores every IP header and no longer needs an IP secret. This coarse cap protects parsing/bot-verification/storage resources; it is not the office ticket allowance.

Cheap method/origin/content-type/declared-size checks run before parsing. Actual streamed size remains bounded independently of Content-Length, and a 30-second body deadline cancels stalled streams. Fields, bot success, exact hostname, action and images are validated server-side before reservation. The existing server-only reservation RPC now charges **10 NEW reservations/hour** atomically with creation. A shared counter row lock serializes admission for different request IDs; the existing request advisory lock and hash prevent duplicate retries and changed-content reuse. Errors roll back admission increments. Existing matching reservations are checked before the quota and can finish/replay their receipt even when new admission is exhausted. Rate responses use 429 plus Retry-After; database/limiter failures fail closed.

No anonymous or authenticated caller can execute either intake RPC or the retired limiter, read private quota data, or acquire ticket/attachment access. The service key remains Edge-only. The migration does not alter business data, existing ownership, RLS, IT lifecycle or Auth users. Local SQL tests apply initial schema → first Phase 5 migration → hardening migration and compare existing records across the changes.

**Residual availability risk:** a flood can still exhaust the coarse global ingress limit, consume gateway/database resources before it is rejected, or use genuine solved challenges to reserve ten tickets. Failed uploads leave charged drafts, but matching retries incur no extra admission charge. These fixed-window limits allow boundary bursts and are conservative office defaults. This is a material improvement over ten unauthenticated calls exhausting the office allowance; it is not a DDoS guarantee. Before an Internet pilot, verify upstream gateway/WAF source-based throttling and cost controls using a transport-verified client address. Cloudflare controls on the Pages website alone do not protect a directly reachable Supabase function URL. A proxy that can be bypassed is insufficient. Do not “solve” this by trusting X-Forwarded-For or CF-Connecting-IP in the function. Any new protected ingress/proxy infrastructure needs separate approval.

## Anonymous follow-up: direct IT contact

There is no public follow-up portal. The ticket number is a receipt/reference, never a bearer credential. The reporter cannot use it to fetch descriptions, comments, photographs, status or history. No automatic support update is delivered to an anonymous reporter; the existing submission notification is for authenticated IT.

For this small office:

1. Employee submits their name, department and optional workstation/location, and saves the ticket reference.
2. IT receives the ticket in `/it/inbox`, identifies the person using the established office directory or colleagues, and contacts them in person or through an existing approved internal phone/chat channel. No contact directory is exposed by this application.
3. Because the form's identity is self-reported, IT confirms the person's identity and device before remote access or disclosing sensitive information.
4. IT acknowledges the ticket, communicates arrangements directly, performs remote/onsite support, and records contact attempts, employee responses and decisions as internal comments. `waiting_for_user` means IT is waiting on direct contact, not on a website reply.
5. IT confirms resolution directly with the employee, then resolves/closes the ticket using the existing workflow. If the employee needs a status update, they contact IT directly and quote their reference.

No public lookup, email integration, GPS collection or new account system was implemented. New isolated-project test IT accounts may be provisioned only under the explicit staging setup approval; existing Phase 4 users remain untouched.

## Verification and staging boundary

49 local tests pass, covering the new malformed/bot/spoofed-request matrix, server-only grants, ingress limits/reset, admission rollback, capacity rejection and retries at capacity, body deadline/cancellation, preview configuration isolation and existing ticket/security/lifecycle regressions. Scoped application and Edge lint, Deno type-check, audit (zero vulnerabilities), build and distributable scanner are run for this revision. Historical browser screenshots use mock responses and are not new deployed security evidence.

See [the exact isolated staging checklist](isolated-staging-checklist.md). GO for review/local testing; NO-GO for public staging pilot until the listed setup/deployment approvals and real security tests are complete.
