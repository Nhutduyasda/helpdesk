# PWA and staging QA — 2026-10-10

## Current status

PWA local production preview: PASSED manifest, PNG dimensions, production service-worker activation/control, static-only cache, no MSW, and explicit offline navigation message. See `phase-3/pwa-qa.json`. Headless Edge reports `in-incognito` as an installability restriction; actual installation to a home screen is NOT TESTED, not a pass. Standalone manifest configuration is verified; standalone runtime on a physical phone is NOT TESTED.

Foreground browser Notification API: PASSED on production preview with an explicitly permission-granted test context. A real submitted event produced exactly one service-worker notification with the generic payload; reload did not redeliver it (`phase-3/foreground-notification-qa.json`). This verifies the browser API, not a physical phone lock screen or background push.

Live employee workflows were exercised at 390 × 844 and 375 × 812; notification routing includes 768 × 1024. Demo visual regression separately covers the approved Phase 1 layout at all three mobile/tablet sizes and desktop. Demo screenshots are not evidence of live API acceptance. See `phase-3/live-browser.json`, `phase-3/live-workflow.json`, `phase-3/notification-qa.json` and `phase-3/visual/`.

Physical Android/iPhone camera permission, camera capture, actual gallery, keyboard, installation, persistent installed session and background/closed notification delivery: **NOT TESTED / UNVERIFIED**. File-picker PNG selection, preview and upload were verified in a real desktop browser at mobile dimensions.

Staging deployment: **DEFERRED by user**. Hosting authorization was unavailable (no Cloudflare CLI/account configuration or matching connector; Vercel returned no teams/projects). The user selected “Hoàn thiện code và hướng dẫn deploy trước”. No deployment was created and no staging URL is claimed. HTTPS, actual remote response headers, remote deep links and Auth redirect configuration are NOT TESTED.

## Static PWA behavior

`public/manifest.webmanifest` identifies ITCare, starts at `/login`, uses `standalone`, and supplies 192/512 PNG icons plus a maskable icon. `index.html` declares manifest, theme color and Apple touch icon. The production entry registers `/itcare-sw.js`; development retains only the explicit demo MSW path.

The worker caches only a fixed manifest/icon list, hashed same-origin JS/CSS/woff2 assets and local fonts. It never caches HTML, Supabase REST/Auth/Storage, signed URLs, ticket data or incident images. Cache cleanup touches only previous `itcare-static-*` versions. Navigation uses the network and displays a clear 503 offline document when disconnected. No offline submission or background queue exists. An already-open report retains its in-memory description/photos when a network/upload operation fails; a full reload of an unsent form can lose that draft. Static-worker registration failure leaves the normal online app usable.

## Cloudflare Pages staging guide

The following commands are instructions for a future authorized deployment; they were **not executed** in this session. Wrangler `4.149.0` was resolved from npm on 2026-10-10. Read `--help` and current Cloudflare limits/terms before deployment. Do not buy a plan, accept a new paid subscription or promote to production automatically.

1. Open PowerShell at `E:\DevZone\Helpdesk\ITCare` and check out the reviewed Phase 3 commit. Run `npm ci`, `npm test`, `npm run lint:itcare` and `npm run build`.
2. Supply only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_ITCARE_DEMO=false` to the frontend build. A local `.env.local` can also contain non-VITE QA credentials; run `node scripts/scan-build.mjs` before uploading. Never upload `.env.local`, source credentials or service-role/VAPID keys. Upload only `dist`.
3. Sign into the intended Cloudflare account locally, confirm the account/project and authorization, then create a **staging-only** Pages project if it does not already exist. A Direct Upload project cannot later be converted to Git integration; decide this before creation.

```powershell
npx wrangler@4.149.0 --help
npx wrangler@4.149.0 login
npx wrangler@4.149.0 whoami
npx wrangler@4.149.0 pages project create --help
npx wrangler@4.149.0 pages project create itcare-staging --production-branch main
npx wrangler@4.149.0 pages deploy --help
npx wrangler@4.149.0 pages deploy dist --project-name itcare-staging --branch phase-3-notifications-staging
```

The deployment branch differs from the project's production branch, so the intended output is a preview. Confirm the exact URL/environment in CLI output; do not invent or assume a URL. Use the existing project instead of creating a duplicate if one is already configured. `main` in this repository remains Phase 1; do not connect or deploy that code accidentally. No Git production deployment or main merge is needed for direct upload.

4. Cloudflare Pages supplies SPA fallback when no top-level `404.html` exists; the build intentionally has no such file. Do not add a catch-all redirect that accidentally rewrites manifest, icons or JS to HTML. The existing `netlify.toml` remains available for a separately authorized Netlify deployment.
5. `public/_headers` is copied into `dist`. It declares CSP restricted to the test Supabase origin, no-referrer, nosniff, frame denial, restricted device permissions and no-store HTTP caching. This file is hosting configuration, not enforced by Vite preview. Check actual remote headers and browser console before marking them PASSED. Adjust the CSP Supabase origin if deploying a different test project. The SW still explicitly caches only approved public static assets.
6. In **itcare-dev** Supabase Dashboard → Authentication → URL Configuration, use the actual HTTPS staging origin as the Site URL if this environment should be the default redirect. Add the exact allowed callback/login paths needed by implemented Auth flows. Keep signup disabled. Current password login does not use an OAuth redirect; do not invent unsupported callback/reset routes or broad production wildcards.
7. At the actual URL, run login/logout/refresh, A/B API isolation, description and photo creation, separate IT workflow, notification polling, deep-link reload and CSP/headers checks. Configure `LIVE_QA_URL`, `NOTIFICATION_QA_URL`, `PWA_QA_URL` where the scripts support them; workflow/browser scripts currently default to localhost and must be adapted for remote runs. Record new staging evidence separately instead of reusing local PASS files.
8. On physical devices verify install, camera/gallery, keyboard, foreground notification permission and actual delivery. Background push remains BLOCKED until the trusted sender/subscriptions/VAPID configuration in `NOTIFICATION_ARCHITECTURE.md` is implemented and tested.

Primary references: [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [SPA serving](https://developers.cloudflare.com/pages/configuration/serving-pages/), [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/), [PWA installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
