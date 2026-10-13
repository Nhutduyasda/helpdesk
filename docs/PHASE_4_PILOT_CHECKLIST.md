# Small-office pilot checklist — not an onboarding authorization

Scope: fewer than 10 staff, approximately 1–2 incidents/week. Start with 2–3 volunteer testers only after the staging acceptance gates pass. No actual employees were provisioned or invited in Phase 4.

## Before inviting anyone

- [ ] IT owner and backup owner are named; actual phone/chat contact and working hours are configured and tested. Current placeholder contact must not be presented as real support.
- [ ] Verified HTTPS preview serves the reviewed Phase 4 candidate, with correct Supabase test project, security headers, CSP, assets and direct route refresh.
- [ ] Independent synthetic A/B/IT sessions pass all staging acceptance checks, including B accessing A's known ticket/image URL and employee attempts at IT-only RPCs.
- [ ] Keep public/anonymous signup disabled. IT provisions individual accounts through the approved Supabase admin process; verify the intended database role and active flag. Never trust user-editable metadata for IT privileges.
- [ ] Deliver initial credentials privately through an agreed secure channel; use unique strong passwords and a password manager. Do not share an IT account. Agree a manual password-reset/support procedure because reset/invitation completion UI is not implemented. No invitations are sent automatically.
- [ ] Enable leaked-password protection if available within the approved free plan, or document an agreed password control. Do not upgrade/pay automatically.
- [ ] IT checks requests manually during support hours. In-app polling requires an open app; foreground device opt-in is optional. Background/closed-app Web Push and email delivery are unavailable.

## Employee instructions

- [ ] Bookmark the actual HTTPS URL. Report a short description and optionally up to 3 JPEG/PNG/WebP images, each at most 5 MiB. Wait for a confirmed ticket number; reload and check the ticket before retrying after a doubtful submission.
- [ ] Do not include passwords, access tokens, salary/customer records or confidential documents in descriptions/photos. Crop unrelated screen content. Initial pilot permits non-sensitive synthetic examples only until attachment safeguards and retention are approved.
- [ ] If the computer cannot start, open the helpdesk on a phone over an available network and photograph the device/error. Never promise offline submission; an unsent draft can be lost on full refresh/logout.
- [ ] Remote support requires explicit employee consent at the time of assistance. Share temporary UltraViewer access privately with the verified IT person, remain present, and disconnect after completion. Never put remote-control passwords in a ticket. On-site assistance remains available; no silent remote access exists.
- [ ] Check the ticket for IT replies/status, then confirm the result. Sensitive data and signed image links must not be forwarded.

## Operational responsibilities

- [ ] Assign an attachment/draft cleanup owner and an approved retention period before real uploads; review deletion against records requirements. Signed URLs are bearer access for up to 120 seconds and cannot be individually revoked by deactivating an account. No automated cleanup or trusted image-decoding/malware validation is claimed.
- [ ] Assign backup/recovery responsibility: encrypted database export plus a separate private Storage backup, documented access controls and agreed recovery targets. Do not assume a free plan supplies sufficient backups. Perform a restore drill into a separate authorized test environment; never reset the existing project.
- [ ] If ITCare is unavailable, use the named IT phone/chat fallback and record the request later. Never repeatedly upload company data to an unverified replacement URL.
- [ ] Review tickets/failures daily during the pilot; collect brief employee feedback after one week. Expand only after unresolved access/security issues are addressed.

## Physical device participation — all NOT TESTED in this run

- [ ] Android: actual camera/gallery permission, photo capture/upload, keyboard/submit visibility, installation, installed login/session refresh, logout and foreground notification consent/delivery.
- [ ] iPhone: Safari camera/gallery, keyboard, Add to Home Screen and installed session behavior; record unsupported notification cases accurately.
- [ ] Both: Wi-Fi/mobile-data loss, offline message, reconnection and deep-link refresh. Verify no private images/data in Cache Storage.
- [ ] Lock-screen/background/closed-app push remains UNSUPPORTED, not a pending pass for existing foreground polling.

Final pilot approval: owner ______ ; backup owner ______ ; date ______ ; remaining exceptions ______.
