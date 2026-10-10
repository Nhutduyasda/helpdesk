# ITCare visual and functional QA

Review date: 2026-10-10 (Vietnam). Source revision: `386235c3199168fa743db593d7acf014a40f1ca1`.

Local frontend preview: http://127.0.0.1:5174/ . Employee: /login . IT: /it/login . Any nonempty username, password `demo123`. This is a local Vite server, not a deployment. Start again with `npm run dev -- --host 127.0.0.1 --port 5174`.

## Validation results

- `npm ci`: passed using original lockfile. Added only the four missing ESLint development plugins afterward; no framework or UI-library upgrade.
- `npm run build`: passed (TypeScript and Vite). Full output: [build-results.txt](build-results.txt). Inherited Vite warnings: deprecated optimizeDeps.esbuildOptions and large unrelated demo chunks.
- `npm run lint`: runs after flat-config repair, but fails with **18 inherited errors and 3 inherited hook warnings**. Full output: [lint-results.txt](lint-results.txt). Findings are in original global fetchers, Blog/Notes/Ticket contexts/components/types, Search, and vite.config.ts. Original repository had an unusable ESLint 10/legacy-config combination and missing plugins. These original page implementations were not rewritten to mask failures.
- ESLint on all added ITCare code plus modified app/router/shell/table/theme files: **passed, zero warnings**. [itcare-lint-results.txt](itcare-lint-results.txt) is empty on success. Theme toggle's inherited `any` casts were replaced with native typed DOM methods; accessible name added.
- No upstream test script or unit-test suite is configured. Added browser acceptance scripts exercise actual React/MSW flows. `node scripts/visual-qa.cjs`: passed **13 check groups**, zero uncaught browser page errors. [qa-results.json](screenshots/qa-results.json), [qa-console.txt](qa-console.txt).
- Final visual polish regression script: `node scripts/visual-polish-qa.cjs`, results in [polish-results.json](screenshots/polish-results.json).

Browser: headless Microsoft Edge through bundled Playwright. `PLAYWRIGHT_MODULE` can point scripts to another Playwright installation. Initial sandbox browser/server networking attempts failed; rerunning the local server and browser with the needed host access succeeded. No screenshots were fabricated.

## Responsive and visual review

Rendered and inspected mobile **375×812**, **390×844**, tablet **768×1024**, desktop **1366×768**, **1440×900**. Main report records 42 rendered screenshot states with DOM width assertions; all show document width equal to viewport width. There are 48 PNGs including submission loading, failure, empty and viewport-only captures. IT tables scroll within their own container. Mobile IT detail stacks into one column. Mobile navigation sheet opens and closes with Escape; desktop sidebar collapses. Dark theme is functional.

Screenshots were visually opened and inspected. Earlier premature lazy-loading captures were replaced after waiting for content/fonts. Photo controls were changed from native English file labels to Vietnamese template buttons, confirmed through the real browser file chooser. Narrow mobile Submit has a separate viewport screenshot showing it above the bottom navigation. Mobile content can scroll beneath fixed navigation, with bottom padding allowing access to all content. Full-page screenshots show the fixed navigation at viewport height; use the viewport-only Submit captures to inspect the actual action placement.

Template comparison used the retained source-rendered Tickets and Boxed Login routes, captured at the same desktop size. The IT inbox reuses FullLayout, inset margins, original Sidebar/Header, NavCollapse, StyleAwareWrapper, dotted StyleDivider, ticket tile fills/borders, table primitives and Geist typography. Intentional differences: ITCare branding, localized labels, three relevant nav links, initials instead of synthetic portrait assets, employee/department columns, detail links instead of deletion, and status/department filters. Desktop summary labels are shorter and employee cells use the existing smaller Lyra text. No pixel-perfect claim or automated image-diff threshold is made.

Boxed Login retains the centered max-width card, accent background and template controls. OAuth/registration/recovery demo actions were removed from ITCare login; Vietnamese copy, larger form touch targets, demo guidance and role-switch link replace them. Employee portal uses compact header, cards and bottom nav with the same tokens; detail/history/result forms are new compositions, not inherited complete screens.

Final polish fixed the staff page's exposed wrapper background and collapsed wordmark overflow. Detail card boundaries use the template border token via rings without modifying shared Card primitives.

## Screen evidence

| Screen | Screenshot |
|---|---|
| M00 Employee login | [Login](screenshots/M00-login-390.png) |
| M01 Home | [Home 375](screenshots/M01-home-375x812.png) |
| M02 Report | [Report 375](screenshots/M02-report-375x812.png), [Submit viewport](screenshots/M02-submit-visible-375.png), [Photo preview](screenshots/M02-photo-preview.png) |
| M03 Result | [Confirmation](screenshots/M03-result-390.png) |
| M04 My requests | [Requests](screenshots/M04-requests-390.png), [Empty](screenshots/M04-empty.png), [Error](screenshots/M04-data-error.png) |
| M05 Details | [Photo details](screenshots/M05-details-photo-390.png) |
| D00 IT login | [IT login](screenshots/D00-login-1440.png) |
| D01 Inbox | [1440](screenshots/D01-inbox-1440.png), [1366](screenshots/D01-inbox-1366x768.png), [Dark](screenshots/D01-dark.png), [Mobile menu](screenshots/D01-mobile-sidebar-open.png) |
| D02 Detail | [Desktop](screenshots/D02-details-1440.png), [Mobile](screenshots/D02-details-375x812.png), [Resolved](screenshots/D02-resolved.png) |
| D03 History | [History](screenshots/D03-history-1440.png) |
| D04 Employees | [Employees](screenshots/D04-employees-1440.png) |
| Source reference | [Tickets](screenshots/reference-source-tickets-1440.png), [Boxed login](screenshots/reference-source-login-1440.png) |
| Representative states | [Login error](screenshots/M00-login-error.png), [Validation](screenshots/M02-validation-error.png), [Submitting](screenshots/M02-submission-loading.png), [Submission failure](screenshots/M02-submission-error.png), [Filtered empty inbox](screenshots/D01-empty-filter.png) |

## Functional checks

Mock employee/IT login; invalid password; logout; role guard; report validation; invalid attachment rejection; gallery file chooser; photo preview; photo-only and description-only submission; pending state before success; network failure preserves form; employee replies; employee detail ownership; IT acknowledgement, remote/on-site method, waiting/closed/resolved status; resolution text; IT replies; history status filter, pagination and CSV export; employee toggle; mobile menu and theme. Error and empty list states are produced through controlled browser fetch injection, not permanent application debug controls.

## Remaining limitations and review items

Physical iOS/Android camera permission and on-screen keyboard behavior have **not** been tested. Desktop browser viewport emulation confirms layout and 16px employee input text, not device behavior. Actual urgent-support phone number awaits company configuration. Seed attachment is a labeled synthetic illustration.

Worker data, images and mock account toggles reset on reload; sessionStorage stores synthetic identity only. Role checks are frontend mock behavior, not production access control. No cross-tab or durable storage, real-time chat, real remote session or backend exists. CSV is the inherited table export. The template's inherited npm audit reports 9 dependency vulnerabilities (1 moderate, 8 high), requiring review before pilot/integration.

Before Supabase: user approval of complete frontend, physical phone check, real contact configuration, and inherited lint/dependency cleanup. Integration boundaries are recorded in [ROADMAP.md](ROADMAP.md). **No Supabase/backend, production deployment, remote repository creation, commits or pushes performed. Stop at frontend design review.**
