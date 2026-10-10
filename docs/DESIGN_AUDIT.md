# ITCare template audit

Source: https://github.com/shadcndashboard/shadcndashboard

Exact revision: `386235c3199168fa743db593d7acf014a40f1ca1`.

Reviewed README.md, AGENTS.md, LICENSE, package.json, Router.tsx, FullLayout.tsx, globals.css, ticket list/filter/create form, ticket context and MSW data, boxed login, profile routes, sidebar/header and data-table wrapper before composing ITCare views.

## License

MIT license retained unchanged. README also requests a visible link to https://shadcndashboard.dev/; both ITCare layouts and login include this attribution. No upstream changes, remote creation, commits or pushes performed.

## Available screens and reusable components

Modern dashboard, Blog list/details/create/edit/manage, Notes, Tickets list/create, profile, tables, forms, icons, boxed login/register/password recovery/two-step, maintenance and error screens exist. Sidebar has numerous paid/external demo links, not implemented screens. FullLayout combines inset sidebar, header, content container and footer; blank layout serves authentication.

Reuse: Card, Button, Badge, Avatar, Input, Label, Textarea, Base UI Select/Dropdown/Dialog, Table, TanStack DataTable, SidebarProvider/SidebarInset, NavCollapse, LightDark and ThemeProvider. ITCare uses the full original shell and a scoped navigation configuration. Unrelated demo pages remain unchanged.

## Tokens and responsive source findings

Local Geist and Geist Mono variable fonts; original `style-lyra` class; semantic OKLCH light/dark tokens for primary/background/card/muted/border/chart colors. Preserve the existing square Lyra primitives and template ticket summary tiles, border treatment, spacing and status tints. Global radius token is 8px, with Lyra component overrides. No second library or font introduced.

Sidebar uses Base UI sheet on mobile and desktop collapse/hover behavior. FullLayout uses padded inset panels and constrained container. Ticket list has local horizontal scrolling; original summary grid uses one/two/four columns. Employee portal replaces desktop navigation with compact header and bottom navigation, uses the same primitives with larger touch targets and 16px form text.

## Verified gaps

Public Tickets demo text fetched on 2026-10-10 shows all four counters at zero and “No Tickets available.” This is a public demo observation, not proof of the cause. Source contains synthetic ticket records and MSW handlers. Source create form requires both title and description, includes agent assignment, has no file input, and navigates immediately after calling addTicket without awaiting it. Router has no ticket-detail route. Login is a presentational form; no real authentication/backend exists.

Missing ITCare screens: mobile home/report/result/my requests/details and contact view; desktop detail/history/minimal staff management. Existing tickets support fewer statuses than ITCare requires.

## Technical risks

Original ESLint uses legacy config but locked ESLint 10 expects flat config; referenced plugins are not listed in package.json. Original context contains `any` and hooks warnings. npm ci reports 9 inherited dependency vulnerabilities (1 moderate, 8 high); no blind dependency upgrades performed. MSW state resets on reload; this is acceptable only for mock review. Camera capture behavior requires physical phone testing. No confidential data or real employee images used.
