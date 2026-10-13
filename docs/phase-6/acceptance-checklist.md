# Acceptance checklist — evidence must match the claim

All unchecked items remain blockers; previous local passes never substitute for real deployed HTTP. Record commit, function/Worker version, environment/project, timestamp, sanitized expected/actual results and fixture IDs. No raw HAR, bearer tokens, Siteverify tokens, signed URLs or personal content in Git. Transient replay capabilities may be kept in memory only by an approved harness, then discarded.

## Evidence levels and current state

| Case | Existing evidence | Required next evidence |
| --- | --- | --- |
| Turnstile success | Phase 5 genuine challenge produced ITC-1004 | Real successful token reused once over HTTP, rejection and unchanged reservation/ticket counts |
| Replay and fresh retry | Phase 6 handler regression uses fake one-use verifier and gateway | Fresh genuine token + same UUID/content returns same receipt, one ticket/event/attachment set |
| Admission | PGlite and sequential live rollback-only SQL | Independent PostgreSQL sessions for race; bounded hosted HTTP race separately |
| Signed expiry | Phase 3 historical HTTP; Phase 5 historical authorized image render | Phase 5 current signed URL 200 before expiry and denied HTTP after 120 s plus clock margin |
| RLS/Auth | Local SQL and Phase 5 real inactive/non-IT logins; direct SQL role checks | Browser-issued JWT REST/RPC/Storage negatives and active IT positives |
| Lifecycle | Historical hosted ITC-1004 closed, one reply/six events | Repeat only with separately approved synthetic report and exact candidate |
| Navigation | Actual component synthetic-context browser and historical hosted pending navigation | Exact candidate unsaved/pending A→B→A desktop and mobile |
| Layout | Historical synthetic 390/1440 checks; latest hosted ~800 px | Hosted 390/1440 screenshots plus physical camera/keyboard |

## Repository automation

- [ ] `npm test`, scoped app/Edge lint, TypeScript/production build, audit and distributable secret scan pass on candidate. Full lint debt reported separately.
- [ ] Run `npm run test:details` and `scripts/phase5-browser-qa.cjs` with existing documented Playwright runtime; label backend/challenge mocks. Do not fabricate hosted evidence from local screenshots.
- [ ] After architecture approval, add Worker adapter parity, no-fallback/header-spoof, body/dependency timeout and sanitized logging regressions; add verification-only Phase 6 CI. No deploy trigger.
- [ ] HTTP harness defaults to disabled; requires explicit project/URL/fixture allowlist and owner-approved budget. Abort on unexpected environment, real employee data, excessive retries or quota rejection; no load generator.

## Bounded real HTTP protocol — requires fixture approval

Ask approval for a maximum of four new synthetic reports, at most one small PNG upload, and no new Auth users unless existing approved identities cannot be securely reused. Owner/operator supplies credentials through approved local secret handling; never paste them. Separate cleanup approval afterwards; do not delete automatically. Existing closed QA tickets can provide read-only/lifecycle-navigation reference only; do not reopen/mutate them without approval.

- [ ] Replay: obtain a genuine user-completed challenge in approved browser, send one synthetic description report, replay consumed token once. Expect rejection before reservation, unchanged count. Record HTTP status and stage result, no token. This case consumes one new admission only.
- [ ] Lost response: deliberately discard successful response locally, obtain fresh challenge, resend identical UUID/fields/bytes. Expect same receipt and exactly one submitted ticket/event; image version uses one approved upload. Changed content with same UUID must fail. Same consumed token fails even when UUID matches.
- [ ] Concurrent same-ID: two requests with separate genuine tokens and identical UUID/content, released together. Expect one ticket/reservation/event/object set and identical successful receipts or documented safe retry of a transient failure. This is not two new admissions.
- [ ] Admission race: on a disposable approved local PostgreSQL environment, seed synthetic quota to nine and race two independent connections with different UUIDs. Exactly one commits; loser rolls back; matching retry at capacity succeeds. Local single-connection PGlite is insufficient. For hosted HTTP use an explicitly approved isolated capacity window/fixture configuration; do not seed or exhaust the live office quota. Hosted final-slot proof remains blocked until that setup is approved.
- [ ] Expiry: active IT creates a fresh 120-second signed read for approved existing synthetic object. Fetch once successfully, wait beyond expiry plus five-second margin without refreshing URL, fetch same capability with cache bypass, record denied HTTP and no image bytes. Provider-specific status recorded rather than assumed. Never log the URL. Interruptible wait; no quota flood.
- [ ] Authorization: anonymous and real bearer tokens for inactive IT/active employee deny public business data/private reads/service-only RPCs/IT mutation. Active IT succeeds. Known object/row IDs used for negative tests; JWTs remain memory-only. Direct profile updates cannot promote role. Deactivation existing-session test needs approval before changing any profile.
- [ ] Lifecycle: one approved new report transitions through acknowledge, remote/onsite, internal reply, resolve, close; verify actor, status, operation UUID deduplication and immutable history. Illegal transition and unauthorized mutation denied. No real ticket changes.

## Hosted browser and ingress acceptance

- [ ] 390×844 and 1440×900: report, error/receipt, login, inbox/details; no horizontal overflow, keyboard/submit visibility, up to three files, required fields, image-only/text-only and upload failure recovery.
- [ ] Real Android/iPhone camera/gallery and network-loss recovery; deep-link refresh/back/forward; no private report/images in Cache Storage or persistent public caches.
- [ ] Ticket A→B→A clears unsaved reply/resolution; deferred A completion cannot update B draft/error/pending flag; same-ticket refresh preserves draft. Repeat with real controlled pending save only after mutation approval.
- [ ] Approved contact displayed and fallback tested; self-reported identity is clearly unverified; public receipt exposes no ticket details/read capability.
- [ ] Chosen ingress rejects method/path/header tricks and oversize/stalled streams; spoofed forwarded IP cannot bypass rate control. Record rejection layer, not only status.
- [ ] C cutover: old Supabase intake route cannot execute POST intake after retirement. For B, missing/forged transport proof rejects before body/DB, and residual gateway execution is explicitly accepted. Never claim proxy hides origin.
- [ ] Owner approves backup/retention, named IT/backup owner, quota procedure, credential policy and restore drill. Leaked-password protection limitation remains recorded; password-manager control is an exception requiring owner acceptance, not equivalent provider enforcement.

Final gate: all required current-environment evidence reviewed; owner signs pilot approval with exact SHA/config/version, approved exceptions, participants and fallback. **Public pilot NO-GO until then.**
