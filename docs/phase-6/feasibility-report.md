# Phase 6.1 feasibility checkpoint — STOP on Workers Free

2026-10-13, Asia/Saigon. Approved starting HEAD: `d15ef259fac071b3e4b75775c519fb6ff85d7039`, fetched and verified on Phase 6. Phase 5 remote stays `8232ab0ede155fb9f73f4d5ff70ac4387ee17ac4`. Owner condition A.6 requires stopping if the architecture is infeasible or unsafe on Free. **This checkpoint has not established Free feasibility: stop before implementing the production handler, frontend destination or cutover.**

## Pages Functions versus standalone Worker

Prefer a file-routed Pages Function `functions/api/intake.ts` on the existing isolated preview after separate approval. It runs in Workers runtime and offers same-origin `/api/intake` without a paid/custom domain or additional Worker project. Current deployment uses Wrangler `pages deploy dist`, not dashboard drag-and-drop: Wrangler supports Functions with Direct Upload; dashboard Direct Upload does not. The Functions source must be present when Wrangler builds the deployment; the current deploy job downloads only `dist`, so future packaging must explicitly compile and include the function artifact or supply reviewed source in that job. This source/deployment workflow change has not been made.

Advanced-mode `dist/_worker.js` is another supported packaging option, but must explicitly forward static requests to ASSETS and preserve SPA behavior and headers. File routing is smaller for one API. Keep `_routes.json` scoped to `/api/intake` so static assets do not unnecessarily invoke compute. Verify that custom response headers apply to Function responses; Pages `_headers` alone is not a substitute. A standalone Worker would add routing/cross-origin configuration and offers no escape from Free CPU limits. No paid domain needed for preferred Pages integration.

Sources: [Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/), [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/), [Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/). Functions share Workers limits/usage; a new Pages route is still a cloud change requiring approval.

## Real local runtime measurements

`scripts/phase6-feasibility.mjs` bundles the unchanged handler/validation into a **local-only probe**, then runs it on Miniflare 4.20260730.0 / workerd 1.20260730.1, compatibility date 2026-08-06, Node 24.19.0, Windows. It exercises Request/FormData/File/streams, SHA-256, body validation, orchestration and Response in actual workerd. Supabase RPC/Storage and Siteverify are **in-memory fakes**; no credentials, database, uploads or real provider HTTP. Fake Storage records only lengths, avoiding extra byte copies. Probe blocks external HTTP. Never deploy this probe.

Three sequential repetitions per case; maximum allowed ASCII name/location/description fields; signature-valid synthetic PNG byte arrays, not decoded photographs. This matches the current signature-only handler's CPU path. Three 5 MiB files plus multipart/text overhead (~15 MiB) are the largest supported attachment combination; 16 MiB is the body rejection ceiling, not an allowed fourth photo. Cold startup is included in the first case.

| Payload | Multipart bytes | Sampled active CPU ms (three runs) | Wall ms (three runs) | Post-request used JS heap MiB range | Post-request backing storage MiB range |
| --- | ---: | --- | --- | --- | --- |
| 0 images | 2,948 | 13.965 / 3.130 / 3.116 | 19.3 / 4.9 / 4.7 | 0.47–0.52 | 0.01–0.04 |
| 1 × 64 KiB | 68,622 | 0 / 1.218 / 2.979 | 5.7 / 5.6 / 4.7 | 0.57–0.66 | 0.30–0.83 |
| 3 × 64 KiB | 199,970 | 4.134 / 4.918 / 4.940 | 5.6 / 6.7 / 6.3 | 0.76–0.95 | 1.59–3.12 |
| 1 × 5 MiB | 5,245,966 | 48.874 / 49.725 / 45.926 | 54.5 / 59.0 / 50.4 | 1.98–5.05 | 20.76–55.78 |
| 3 × 5 MiB | 15,732,002 | 145.852 / 140.826 / 134.114 | 158.1 / 159.2 / 149.0 | 4.23–8.37 | 60.01–90.01 |

Raw results and per-function samples: [feasibility-results.json](feasibility-results.json). Inspector Profiler uses a 100 μs requested sampling interval, excludes idle/program/root nodes, and measures local active stacks, **not Cloudflare billed CPU**. Zero means no active sample captured, not zero work. Wall time is host-observed local dispatch+response, not CPU. Sampling/debugger and machine speed affect results. Runtime does not enforce hosted Free CPU, so successful responses do not prove Free compatibility.

Memory figures are inspector snapshots in one isolate with natural GC across repetitions; heap/backing storage are separate, not peak total isolate memory or per-request allocations. Native/SDK/network buffers and concurrent requests are not fully measured. They cannot certify the 128 MB budget. No concurrency/load test was run. The first fake Storage version retained Blob copies and inflated memory; final recorded run removes those copies.

[Current Workers limits](https://developers.cloudflare.com/workers/platform/limits/): Free 10 ms CPU/request, 128 MB/isolate, 50 subrequests, 100,000 requests/day. The maximum image case is roughly 13–15 times the CPU allowance in this local estimate; even one 5 MiB image is roughly five times. Final max-case samples attribute ~44 ms to digest alone and substantial additional work to reading/buffering. This is sufficient to withhold a Free feasibility claim, even though it is not hosted enforcement evidence. No production implementation will be forced based on local HTTP 200.

## Credential assessment

Existing `intake_precheck`, `prepare_public_ticket` and `finalize_public_ticket` execute privileges are service_role-only. Existing browser anon/authenticated grants cannot substitute. Private Storage orchestration needs privileged upload and duplicate-byte download; use a server-only SDK client. Existing server credential must never enter frontend, artifact/public variables or logs.

[Supabase API key documentation](https://supabase.com/docs/guides/getting-started/api-keys) confirms secret keys resolve to service_role and bypass RLS; dedicated secret-key naming/rotation does **not** narrow database permissions. Prefer an independently revocable secret key for a future Worker if authorized and compatible; this is still broad privileged access. No credential read/copied/generated/rotated here.

A genuinely narrower Postgres role would require explicit RPC grants, controlled role authentication and a Storage authorization design for exact reserved paths (including retries). A direct Postgres credential alone does not grant Storage API access. A signed-upload broker could keep broad secrets out of Worker, but changes trust/validation/idempotency and potentially grants or another origin execution path. These alternatives need a new reviewed design and separately approved grants/migrations/credentials. Do not weaken anon RLS or grant intake RPCs to browser roles to avoid the secret.

## Repository delivery and validation

Implemented **feasibility tooling and verification-only CI**, not a production intake endpoint. No shared handler extraction, Worker ingress, frontend mode, new server secrets, runtime logging, migration or deployment workflow change. Preserving Phase 5 unchanged is deliberate under the stop condition.

- Existing **51/51 tests PASS**, including mock replay/fresh-token retry, invalid/oversized body/image, deadline, SQL private grants/RLS, retry/lifecycle regressions. They remain simulated/PGlite evidence.
- Actual local workerd: 15 positive requests return expected receipt, exactly precheck/prepare/finalize calls and expected simulated upload count. This proves baseline Web API compatibility, not real SDK/network/private permissions or production Worker route/header/error contracts.
- Scoped app/Edge/probe lint PASS; probe `tsc -p scripts/phase6-probe-tsconfig.json` PASS; application TypeScript/production build PASS (inherited large-chunk advisory); scanner PASS 127 files / 99 JS; project npm audit PASS zero vulnerabilities.
- New verification-only workflow triggers Phase 6 pushes and PRs targeting Phase 5, with no deployment, cloud credentials or environment gates. Remote result must be recorded after push. Runtime benchmark is not part of CI installation for the tooling reason below.
- Full lint inherited 13 errors/3 warnings was documented in initial Phase 6; no unrelated frontend source changed in this checkpoint.
- Production Worker spoofed-header, timeout/recovery, actual Storage credential/HTTP, simultaneous admission, genuine replay and hosted tests remain **NOT IMPLEMENTED/NOT RUN**, because feasibility stopped production scope. Do not relabel inherited fake tests as Worker security acceptance.

Tooling limitation: isolated stable Miniflare audit reports three high findings (Miniflare transitively sharp and undici). These packages are in ignored `node_modules/.phase6-tools`, not application package.json/lockfile/distribution. Inputs are synthetic/local, external Worker HTTP is blocked; no real private data or secrets were processed. Do not approve a security exception for deployment. CI does not install this toolchain. Latest Miniflare 5 is alpha with a different API; initial alpha constructor attempts failed before runtime startup. Stable compatibility-date mismatch was corrected, then actual measurements passed. Before further runtime work, adopt a reviewed patched toolchain and repeat measurements. No automatic audit-fix or project dependency upgrade performed.

Reproduction (review local tooling advisories first): isolated install `npm install --prefix node_modules/.phase6-tools --no-audit --no-fund miniflare@4.20260730.0 esbuild@0.28.2`; run `node scripts/phase6-feasibility.mjs`. Uses localhost inspector port 9238; results overwrite only Phase 6 report. No live services.

## Cost, prerequisites and safe future cutover

Pages same-origin does not require a domain purchase. Free would be $0 incremental **only after measured optimization and safety review**, which this checkpoint does not satisfy. [Worker pricing](https://developers.cloudflare.com/workers/platform/pricing/) paid starts $5/month; for this office volume usage likely fits included allowances, subject to account-wide use, taxes and runtime verification. No paid-plan change is approved or made. Supabase/backups/retention costs remain separate.

Next decision before any cloud approval: authorize another local optimization feasibility round retaining three 5 MiB images, or explicitly choose a revised architecture/paid-budget evaluation. Streaming can reduce copies but cannot be assumed to bring full hashing and orchestration under 10 ms. Do not silently reduce attachment limits/UI, split uploads/change security contracts or buy a plan.

After a feasible implementation is reviewed, exact prerequisites are: approve its SHA and Pages Function packaging on a separate preview branch of the isolated project, Workers entitlement, preview-only server secret bindings, origin/departments/Turnstile hostname, Function response headers/CSP, sanitized log retention and any rate control. Pages preview environment secrets can affect multiple branches; review blast radius before binding. Preserve current `phase5-preview` deployment and Phase 4. Do not enable existing deployment gates.

Safe staging sequence: deploy separately approved candidate preview; smoke without persistence; obtain separate bounded fixture permission; verify actual HTTP/private Storage/Turnstile/retry/mobile/Admin; review metrics/cost; approve stable-preview switch only afterwards. Keep Edge active during development but label direct-origin blocker unresolved. Retire public Edge intake only with separate permission and tested no-fallback behavior; verify the old route no longer executes intake. Primary URL/pilot authorization remains separate.

Rollback before cutover: remove/disable only candidate route/deployment and restore reviewed static candidate as approved; current Phase 5 stays untouched. After an eventual stable cutover: disable intake and use approved manual contact, preserve all tickets/reservations/objects, revert to reviewed runtime version when safe. Never automatically restore direct public Edge intake after retirement or delete/migrate data. The present repository has made no cloud change to roll back.

**No cloud deployment approval requested yet: feasibility is blocked.** Owner decision is required on the next local/design/budget step before a safe exact-SHA cloud package can be proposed. Phase 6 remains IN PROGRESS; public pilot NO-GO.
