# Phase 2 stabilization

Starting main: `0b439d3cf5493840eeb79c97ba1c027932e5701d`, repository `https://github.com/Nhutduyasda/helpdesk`. Work is isolated on `phase-2-supabase-integration`; Phase 1 screenshots/documents remain the baseline.

Baseline `npm ci` succeeded after stopping an old Vite process that locked native dependencies. Baseline build passed. Full ESLint baseline: 18 errors and 3 warnings. Audit baseline: 8 high and 1 moderate vulnerability, involving Tiptap, ProseMirror, React Router and transitive parsers/build tools.

Targeted same-major package updates were applied without `audit fix --force` or framework replacement. Lockfile resolves the patched packages; final audit is recorded in `phase-2/final-audit.json`. Supabase SDK and development-only PGlite test runtime were added. The MSW worker was regenerated to match its installed package, removing the version mismatch warning.

Global fetcher payloads use `unknown` instead of `any`. Removed an obsolete Vite dependency optimization option for JS files (this repo has no JS source requiring it). Link-rendered Base UI Buttons now declare `nativeButton=false`. Existing browser QA selectors were adapted to their accessibility behavior while retaining actual navigation assertions.

Full ESLint still reports **13 errors and 3 warnings** in inherited blog/notes/types/context/header code. These remain outside Phase 2 rather than causing unrelated template rewrites. `npm run lint:itcare` checks the business UI, Context, service, Supabase boundary, route/bootstrap, global fetcher and Vite config with zero allowed warnings. See raw baseline/final lint logs. The build retains an inherited large-chunk warning; this is not a security/audit failure.

Visiting the legacy source-reference tickets page in development also produces an inherited nested-button console warning. It is outside the production ITCare routes. The visual report's zero errors refers to JavaScript exceptions, not absence of all source-template console warnings.

No real keys or passwords were supplied. Only URL/publishable-key placeholders are documented. Production disables demo regardless of the development flag and displays a configuration error rather than seeded data when missing Supabase settings.

Clean install also reports npm's pending install-script approval for MSW's postinstall script. Its worker was regenerated explicitly with `npx msw init public --save`; install-script approval policy was not broadened for this change.
