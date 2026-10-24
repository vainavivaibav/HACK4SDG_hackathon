# Teammate 1 - Worker website

Own `apps/web/` and `handoff/01-website.md`. This is a Next.js/TypeScript app with shared components from `@hunger/ui` and shared contracts/API/locales from `@hunger/core`.

Extract all modules and run `npm ci` at the repository root. Copy `.env.example` to `.env.local` in this directory and add the Supabase URL/publishable key and host portal URL. Run `npm run dev` from the root, or `npm run dev -w @hunger/web`.

Routes: `/` discovery, `/meal/[id]` full meal details, `/reservation/[id]` full private reservation token, `/meals` reservation history, and `/profile` preferences. Detail and token URLs survive reload; tokens are shown only for the signed-in owner and only active tokens display a QR/code. There is deliberately no Features marketing route or SDG numbered branding.

Review: filters, dietary labels, local-time serving windows, location denial, empty/error states, account forms, reservation failure messages, cancellation, QR countdown, profile persistence, language selection, feedback and reports. Check keyboard operation and phone widths. Production check: `npm run build -w @hunger/web`.

Reservation mutations call the shared API, never a local capacity counter. Do not implement booking rules in components. Surface backend errors; a listing may become unavailable between display and booking.

Requires teammate 4's root workspace, core and UI packages, and teammate 3's migrated backend. Keep shared contract changes coordinated through teammate 4.
