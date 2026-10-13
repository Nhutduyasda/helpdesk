# ADR-006 — anonymous intake execution boundary

Status: architecture C conditionally approved for repository/local implementation, 2026-10-13. Owner requires Free feasibility before extensive changes. [Local feasibility](feasibility-report.md) fails to establish the 10 ms CPU budget at existing maximum images; production implementation stops. No architecture endpoint or cloud configuration implemented.

Final bounded profiling confirms ~130–152 ms inspector samples at max size. Recommend B, a separately approved Paid-target implementation; validate memory/concurrency and hosted SDK behavior first. No purchase, Worker secret, endpoint, or deployment authorization is implied.

## Threat and constraints

Fewer than ten employees; anonymous reporting with private images; authenticated IT administration. Preserve existing ticket RPCs, UI and data. CORS is a browser policy, not caller authentication. Solved Turnstile challenges do not prove employee identity. A request flood can consume gateway execution and shared office quota without creating a ticket. Auth, REST and Storage remain public provider services protected by Auth/RLS; protecting intake does not make all Supabase APIs private.

## Options

| Option | Bot/privacy and admission | HTTP/exhaustion/bypass | Cost and failure |
| --- | --- | --- | --- |
| A: existing Edge plus monitoring | Existing server Turnstile, private Storage, transactional admission retained | Direct anonymous execution remains; global precheck reaches DB. Monitoring observes rather than prevents exhaustion | $0 incremental at current free usage; quotas/provider pause can interrupt office; simplest rollback |
| B: Worker forwarding plus Edge transport authentication | Edge keeps verification, parsing, service credential and quota logic. Worker strips caller auth/forwarding headers and inserts server-only proof | Forged/missing proof rejected before body/DB work. Direct Supabase gateway/Edge still executes auth check; secret cannot remove gateway exposure. Provider upstream restriction would need separate verified support | Potential $0 or Worker $5/month; two execution layers, transport-key rotation and extra failure point |
| C: Worker executes intake; retire public Edge intake | Worker performs the same verification/validation/upload orchestration, calls existing service-only RPCs and private Storage | Removes this public anonymous Edge execution route after approved retirement. Cloudflare is the sole intake compute entry. Direct REST/RPC calls by anon remain denied; provider Auth/REST/Storage availability risk remains | Potential $0 or $5/month Worker; broad Supabase server credential moves into Worker; runtime portability and cutover risks |

**Recommend C**, subject to a local Worker compatibility/CPU measurement and an approved isolated rollout. It addresses the specific publicly callable intake function rather than adding a bypassable proxy. Existing Postgres atomic admission remains the authority; do not build a second database, queue, SaaS system or Durable Object just for this office. B is a lower-porting-effort fallback only if the owner explicitly accepts its residual direct gateway/Edge exhaustion risk. A is sufficient only for restricted synthetic QA, not an accepted pilot safeguard.

## Exact proposed code scope after approval

1. Add `workers/intake/src/index.ts`, typed environment and Wrangler config with no account IDs/secrets. Extract portable handler/validation into a shared server module, retaining all current behavior; keep the Edge adapter for staging until separate cutover authorization.
2. Add Worker POST `/api/intake` and OPTIONS route only; reject all other paths/methods. Fixed Supabase destination, no caller-controlled URL or redirect forwarding. Enforce approved origin, content type, streamed size and deadlines; no public read/list/signing endpoint. Ignore supplied auth/proxy headers. Trust Cloudflare runtime client address only inside Worker for approximate throttling; do not persist raw IP or send it to Supabase.
3. Add per-source coarse rate binding (candidate 20/minute, to measure against shared office NAT) ahead of database work. Retain global precheck and atomic 10/hour new admission. Rate binding is approximate, not a globally exact quota. Body/challenge validation stays server-side; preserve same UUID/hash and immutable upload behavior.
4. Update `src/services/itcare/public-intake.ts` to use the approved same-origin `/api/intake` route; leave Admin SDK endpoint unchanged. Update public config/CSP guard, environment examples and scanner private-value patterns for any new server credentials. No UI redesign or automatic direct-origin fallback.
5. Add sanitized stage/error codes and timings: method/body/bot/throttle/reserve/upload/finalize. Separate validation 4xx from dependency 503 without exposing internal messages. Never log request bodies, names, descriptions, files, tokens, credentials or signed URLs.
6. Add portable handler/Worker contract tests, timeout/limit/private-header regressions, and verification-only Phase 6 CI targeting Phase 5. No deploy job or deployment gate changes.
7. After separately approved isolated deployment and parity evidence, retire `public-intake` on the explicitly approved project through a reviewed removal/configuration step. Merely changing frontend URL is insufficient. Verify old route cannot execute intake, including forged Origin/header requests. Keep source/history and database records.

## Required configuration and secret handling

Owner must approve a Worker resource/route on an owned proxied hostname, its account/project, rate binding, logging retention and Turnstile allowed hostname. Current preview is a Pages-owned hostname; do not assume an arbitrary Worker can attach a same-origin route there. An approved separate isolated hostname/Pages integration is a prerequisite, not a DNS change made here. Supabase Phase 5 project remains `praluwpaundvwmifaije`; verify schema/grants/private bucket before connecting anything. Preserve Phase 4 separately.

Worker runtime needs fixed Supabase URL, approved origin/departments, Turnstile secret and server-only Supabase credential compatible with existing service_role-only RPC grants/Storage. Use provider secret storage, never VITE variables, Git, workflow output, browser config or chat. Existing service-role credential bypasses RLS across the project: minimize operator access, avoid runtime dependencies beyond pinned SDK, and review whether a dedicated narrower role is practicable before rollout. Do not pretend a broad service key is narrowly scoped. No key generated or copied here. B additionally requires a dedicated transport secret, checked before parsing, and safe overlap rotation; it must never be browser-visible.

## Cost and free-tier constraints

Planning estimate: 1–2 incidents/week (~10/month), up to three images each. At maximum file sizes this adds ~150 MiB/month before retention and backup; actual compression may be smaller. At this volume existing free allowances may suffice, but account-wide usage, CPU and abuse govern availability.

[Worker pricing](https://developers.cloudflare.com/workers/platform/pricing/) lists Free 100,000 requests/day and 10 ms CPU/invocation; paid subscription starts at $5/month. Multipart buffering and hashing up to 16 MiB must be measured; free feasibility is unproven. Rate/WAF rule entitlement must be checked in the chosen account; no paid WAF capability is assumed. Turnstile does not reserve capacity for staff. [Rate binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) counters are approximate; keep SQL admission exact.

[Supabase pricing](https://supabase.com/pricing) lists Free $0 and Pro starting $25/month with compute credits; multiple project compute, usage overages, domain, backup destination and tax can add cost. Estimated incremental ingress $0 if Free proves adequate, otherwise ~$5/month at small usage. Optional Supabase Pro plus paid Worker starts around $30/month for one included Micro, not a quote for all retained environments. No upgrade approved. Free leaked-password limitation remains an owner risk decision, not solved by ingress. Manual encrypted backups use existing approved storage if available; cost is otherwise unknown.

## Risks, acceptance and rollback

Worker secrets compromise could expose all server-authorized data; new trust location requires least privilege review. Slow uploads, provider outages, free CPU/daily limits and shared office NAT throttling can deny reports. Fail closed and show the approved manual contact; preserve UUID/content for fresh-token retry. No silent fallback to direct intake. Existing issued signed URLs remain capabilities until expiration; intake shielding does not revoke them.

Before approval to deploy: local regression/build/scan and measured maximum upload CPU/memory; real Siteverify replay; fresh-token lost-response retry; separate-connection reservation race; private Storage expiry; bearer-token RLS; mobile/desktop and IT lifecycle parity. Full procedure is in [acceptance checklist](acceptance-checklist.md). Use bounded synthetic cases and separately approved fixtures, never live quota exhaustion.

Rollback: disable only the new intake route and use manual contact; retain data, reservations, objects, schema and original staging resources. Redeploy last reviewed Worker version if safe. If Edge has been retired, restoring anonymous Edge requires separate authorization and reopens the known risk; never restore automatically. Admin can remain available independently. Record version/config, reconcile partial drafts read-only, and preserve idempotency records. No destructive migration rollback.

Approval requested: architecture C and the exact code scope above; separately specify permission for isolated Worker provisioning/secrets/route, exact-SHA deployment, Edge retirement and bounded persistent QA fixtures. No production migration, URL cutover, paid plan or staff invitation is bundled into approval.

## Final local feasibility decision — 2026-10-13

The owner authorized a bounded local profiling/optimization round. Final measurements in [feasibility report](feasibility-report.md) show about 130–152 ms sampled active CPU for three 5 MiB images, against Free's 10 ms limit; body buffering and mandatory SHA-256 dominate. Per the stop condition, optimization stopped without changing runtime intake code. Recommendation is **B: consider a Workers Paid target**, with no purchase or deployment authorized. Paid retains a 128 MiB isolate limit; max-case snapshots reached ~105 MiB backing storage, so peak and concurrency need local validation before cloud review. Secret-key operations still carry broad service_role/RLS-bypass authority. The next approval checkpoint is a scoped Paid-target repository implementation plus two-request local memory tests; hosted preview requires a later separate approval. Phase 6 remains IN PROGRESS and public pilot NO-GO.

Sources checked 2026-10-13: links above; [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) (five-minute single-use challenge; fresh challenge for retry); [Supabase changelog](https://supabase.com/changelog) (October 12 TLS deprecation, earliest removal November 10; verify supported pilot devices). Markdown changelog fetch was unsupported by web reader, so HTML changelog was reviewed. No relevant schema change implemented.
