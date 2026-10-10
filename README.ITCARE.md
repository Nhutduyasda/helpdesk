# ITCare Phase 2 review

Built on Shadcn Dashboard React Free revision `386235c3199168fa743db593d7acf014a40f1ca1`. Original README and MIT LICENSE are retained. Phase 2 adds Supabase integration behind the existing UI. No live Supabase project was supplied; cloud acceptance is pending.

```powershell
npm ci
# Configure .env.local using .env.example and the setup guide first.
npm run dev -- --host 127.0.0.1 --port 5174
```

Open http://127.0.0.1:5174/login for employees or http://127.0.0.1:5174/it/login for IT. Real mode uses provisioned email/password accounts and database roles. Missing configuration shows an error. Development demo must be explicitly enabled with `VITE_ITCARE_DEMO=true`; production always uses the real provider. See the setup guide for test project provisioning and demo QA instructions.

Run `npm test`, `npm run lint:itcare`, `npm run build`, `npm audit`. Full `npm run lint` still exposes inherited template findings. Browser scripts use Microsoft Edge and bundled Playwright; set `PLAYWRIGHT_MODULE` to your installation if needed. Existing visual QA requires the development demo server. Set `QA_OUTPUT=docs/phase-2/screenshots` before `node scripts/visual-qa.cjs` to preserve the Phase 1 baseline. `scripts/production-qa.cjs` expects a production preview on port 5175 without Supabase configuration; `scripts/compare-visuals.cjs` compares the two screenshot folders. Do not run baseline-overwriting scripts without choosing a separate output directory.

- [Design audit](docs/DESIGN_AUDIT.md)
- [Screen inventory](docs/UI_SCREEN_INVENTORY.md)
- [Design specification](docs/UI_DESIGN_SPEC.md)
- [Visual QA report and screenshots](docs/VISUAL_QA_REPORT.md)
- [Roadmap and approval gate](docs/ROADMAP.md)
- [Supabase setup and first IT provisioning](docs/SUPABASE_ARCHITECTURE.md)
- [Schema](docs/DATABASE_SCHEMA.md)
- [Security and RLS](docs/SECURITY_RLS.md)
- [Phase 2 stabilization](docs/PHASE_2_STABILIZATION.md)
- [Phase 2 QA and live acceptance checklist](docs/PHASE_2_QA_REPORT.md)

Review the feature branch/PR and complete the live test-project acceptance checklist before a pilot. No production deployment or main merge is performed by Phase 2.
