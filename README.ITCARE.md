# ITCare frontend review

Frontend only, built on Shadcn Dashboard React Free revision `386235c3199168fa743db593d7acf014a40f1ca1`. Original README and MIT LICENSE are retained.

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Open http://127.0.0.1:5174/login for employees or http://127.0.0.1:5174/it/login for IT. Enter any nonempty username and password `demo123`. Synthetic identities and incident data only. Mock edits and images reset on reload. No Supabase or real authentication.

`npm run build` passes. `npm run lint` exposes inherited template findings; see the report for the exact baseline and passing ITCare-scoped check. Browser scripts use Microsoft Edge and bundled Playwright; set `PLAYWRIGHT_MODULE` to your Playwright installation if needed, then run `node scripts/visual-qa.cjs` and `node scripts/visual-polish-qa.cjs` with the Vite server running.

- [Design audit](docs/DESIGN_AUDIT.md)
- [Screen inventory](docs/UI_SCREEN_INVENTORY.md)
- [Design specification](docs/UI_DESIGN_SPEC.md)
- [Visual QA report and screenshots](docs/VISUAL_QA_REPORT.md)
- [Roadmap and approval gate](docs/ROADMAP.md)

Review the complete frontend before approving Supabase integration or pilot work. No production deployment or remote repository changes have been performed.
