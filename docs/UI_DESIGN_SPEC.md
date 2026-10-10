# ITCare frontend design specification

Source revision: `386235c3199168fa743db593d7acf014a40f1ca1`.

Use original Geist fonts, globals.css tokens, style-lyra, theme provider, UI primitives and full IT shell. IT-only logo/nav/header/footer changes are selected by route; original demo content is retained. Summary tiles copy source Tickets styling. Employee cards use the same borders and typography; form controls and actions have at least 44px touch heights, with larger report/submit actions.

Employee demo login accepts any nonempty username and password `demo123`, then selects synthetic Nguyễn Minh Anh. IT demo selects Võ Đức Minh. Credentials are examples only and never sent to a server. Session stores the selected synthetic identity in sessionStorage. Photo input supports camera capture or gallery: up to three JPEG/PNG/WebP images of at most 5 MB each; images preview as data URLs and can be removed. At least one photo or trimmed description is mandatory. Submission awaits MSW completion before confirmation. Failures preserve form content.

Statuses: Mới (New), Đã tiếp nhận (Acknowledged), Đang xử lý (In Progress), Chờ phản hồi (Waiting for User), Đã giải quyết (Resolved), Đã đóng (Closed). IT can change status, choose remote/on-site method, record resolution and reply. Employee sees only their requests and can reply. All timestamps display in Vietnam time. Six realistic synthetic incidents cover all statuses and four office departments. Attached seed image is an explicitly labeled printer illustration, not a production incident photo.

Data boundary: `src/api/itcare/data.ts` owns typed seed data and MSW handlers; `src/context/itcare` exposes SWR state and async create/update/login/toggle operations. Views consume context, not storage clients. Incident photos and ticket edits reside in worker memory and reset on page reload. Shared SWR cache keeps views synchronized during a running review session. No chat/realtime infrastructure.

Mock account toggles only change synthetic state. Contact view gives direct office contact guidance; actual phone number awaits configuration. Desktop history reuses existing table wrapper with its unused demo edit/delete controls hidden via an optional prop.
