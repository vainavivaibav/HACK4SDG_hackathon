# Backend handoff — hunger-2026-10-24-v3

Owner: backend teammate. Paths: `backend/` and this handoff.

This complete backend module is paired with the new website/mobile/console interface. See `CLIENT-CONTRACT.md`. No schema migration is needed solely for the UI redesign. Reviewed schema and initial migration are kept identical, and clients use the same shared API and QR format.

Review `README.md` before deploying. Test database concurrency, expiry, ownership, RLS, duplicate serving and role boundaries. Configure real Supabase Auth/Storage/Realtime manually; never deploy the loopback-only test adapter. Do not reapply the initial migration to an existing populated HUNGER schema. Never commit credentials.

No GitHub action is authorized by this handoff. The backend owner reviews and pushes only when explicitly instructed.
