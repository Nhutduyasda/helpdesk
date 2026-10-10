# Notification architecture

## Delivered scope

In-app notifications: PASSED against real Supabase. An active IT user receives a submitted-ticket event. An active owner receives an IT reply or resolved event. Minor method/status changes do not generate noise. B cannot receive A notifications. Notifications display only a generic label and ticket number; neither images, signed URLs, descriptions, replies nor employee names enter notification payloads.

The existing immutable `ticket_events.id` is the notification identity; no schema migration was needed. The app polls the existing gateway through SWR every five seconds while visible, and revalidates on focus/reconnect. Business screens also refresh every five seconds. This is explicitly **foreground polling**, not Web Push. Browser background throttling and closed apps are outside this channel's guarantee.

`notificationItems` builds recipients from RLS-filtered tickets/events and the active current profile. Employees cannot read IT profiles. The existing RPC permits only the owner or IT to append a ticket update; excluding the owner as actor identifies IT-originated updates without broadening profile RLS. If new event producers/roles are added, review this invariant before changing notification routing. Direct table writes are revoked. Inactive accounts get no event list and no new notifications.

The bell lists up to 50 relevant events. Read/seen IDs and opt-in preferences are stored per user in localStorage (bounded to 500 IDs per key); ticket content is never stored there. Reading one item or all items updates unread state. Initial historical fetch does not produce OS notification bursts. Stable event tags and seen IDs prevent polling/reload repeats. Preferences are local to a browser, not synchronized across devices; OS tags also replace matching notifications within the browser profile.

## Foreground device notifications

Implemented as explicit opt-in “Bật thông báo khi đang mở app”. Browser permission is requested only on that action. Unsupported/denied permission retains the in-app channel. The production static service worker calls `showNotification`; development desktop falls back to `Notification`. Clicking focuses an existing app window or opens login. The payload is always generic: `ITCare` / `Có cập nhật hỗ trợ mới. Mở ITCare để xem.` No ticket content or signed image URL goes to the lock screen.

Delivery success/failure logs contain only a generic outcome, never credentials, user details or payload content. A failure displays an in-app fallback and never participates in ticket creation/finalization transactions. Notification-fetch failure was injected and the committed ticket was confirmed to remain in Supabase. See `phase-3/notification-qa.json` and `phase-3/foreground-notification-qa.json` for distinct in-app/browser-API evidence. Physical lock-screen delivery is NOT TESTED.

## Background push — BLOCKED / not implemented

No push subscription, push handler, VAPID private key or trusted sender is configured. Closing/backgrounding the app is **not** supported delivery. Do not treat five-second polling or service-worker registration as proof of push.

Minimal follow-up setup:

1. Deploy HTTPS staging and establish the actual browser/device target.
2. Generate VAPID public/private keys using a maintained Web Push library; store only the public key in frontend configuration and the private key in Supabase Edge Function secrets.
3. Add a small additive `push_subscriptions` table with owner-only RLS and no anonymous reads. Record endpoints/keys through an authenticated function that verifies the active profile; validate endpoint HTTPS origins and size limits.
4. Use a trusted server sender with server-side role/owner checks. A durable event-delivery key `(event_id, subscription_id)` prevents retries from sending twice; process only committed submitted/replied/resolved events.
5. Store generic delivery outcomes, expire stale subscriptions on 404/410, retry transient failures with a bounded policy, and recheck active authorization at delivery time.
6. Add a `push` handler for generic payloads and same-origin notification click handling. Verify actual background/closed delivery on physical Android, and an installed supported iOS web app where available.

Supabase MCP has no secret-management capability in this session. Never expose an admin key or private VAPID key through `VITE_` variables. A reviewed additive migration plus trusted sender and end-to-end delivery evidence are required before marking push PASSED.

Email fallback: DEFERRED. No approved email provider or application-email credentials were supplied. Auth email configuration was not repurposed for ticket notifications.

Standards: [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [service-worker notifications](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification). Platform support and permissions must be checked on the actual device.
