# HUNGER

A full-stack hackathon project for connecting unserved surplus food at venues with nearby workers. Meals stay free. Collection and serving happen at the venue; this is not a food delivery service.

## Start here

Use Node.js 24 LTS and npm. Extract **all four team archives into the same repository root**, then:

```sh
npm ci
npm run dev
```

The worker website opens at http://localhost:3000. Without environment configuration it shows clearly labelled sample listings, with account and reservation actions disabled until a backend is connected.

In separate terminals:

```sh
npm run dev:console
npm run dev:mobile
```

The host/admin portal runs at http://localhost:3001. Expo prints a QR for opening the mobile app with a compatible Expo Go client or development build.

## Connect the real backend

Follow the [step-by-step manual setup guide](docs/MANUAL-SETUP.md) for the supplied project.

1. Use a dedicated HUNGER Supabase project. The repository contains no cloud credentials and does not modify any existing project automatically.
2. Apply the generated migration in `backend/supabase/migrations/` to the empty project. See [backend setup](backend/README.md).
3. Copy each app's `.env.example`: use `.env.local` for the Next.js apps and `.env` for Expo. Fill the same Supabase project URL and **publishable** key in all three. Never use a service-role/secret key in an app.
4. Restart apps after changing environment values. `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are compiled into client bundles.
5. Sign up worker, host, and administrator accounts. An authenticated database administrator must promote the intended admin account with the SQL described in the backend guide. Users cannot self-promote through the app or metadata.
6. Have a host submit a venue, an admin approve it, and the host post a current serving window. Then reserve and serve a meal.

The intended project is `https://ytkdruokcyqnsxwmhzva.supabase.co`. Its URL is prefilled in environment examples. The connected Supabase tool denied access to that project, so no cloud migration or configuration was performed. Cloud Auth, Storage and Realtime still require owner setup and verification.

## Four modules

| Teammate | Owned paths | Handoff |
|---|---|---|
| 1 - website | `apps/web/`, `handoff/01-website.md` | [Website](apps/web/README.md) |
| 2 - mobile | `apps/mobile/`, `handoff/02-mobile-app.md` | [Mobile](apps/mobile/README.md) |
| 3 - backend | `backend/`, `handoff/03-backend.md` | [Backend](backend/README.md) |
| 4 - integration | `apps/console/`, `packages/`, root configuration, `scripts/`, `integration/`, `docs/`, `legacy/`, `handoff/04-host-admin-integration.md` | [Team integration](docs/TEAM.md) |

The original React/Vite starter is preserved under `legacy/vite-starter/`. New apps use Next.js and Expo. The old root starter files may remain in a teammate's existing checkout after extracting ZIPs; the new root scripts do not use them. Review [integration instructions](docs/TEAM.md) before removing duplicates.

## Checks

```sh
npm run typecheck
npm test
npm run review:schema
npm run build
npm run export -w @hunger/mobile
npx playwright install chromium
npm run test:e2e
```

The database tests start a disposable real PostgreSQL instance. The browser tests use that database through a **loopback-only Supabase-compatible test adapter**, not hosted Supabase Auth/PostgREST. They do not prove cloud email delivery, Storage or Realtime behavior. The adapter refuses production mode and must never be deployed.

`npm run test:e2e` also tests the Expo web export, so export the mobile app first. Native Android/iOS bundles are compiled separately; physical-device camera, location and native OS behavior still require device testing.

## What works after backend setup

- Email/password signup, sign-in and sign-out through Supabase Auth.
- Worker profiles, up to three work areas, on-duty preference, English/Kannada/Hindi worker interface.
- Meal discovery, area/diet/serving-window filters, optional foreground location, distance filtering and external map directions.
- One active reservation per account, atomic capacity checks, 30-minute-or-window-end expiry, QR/backup token, cancellation and history.
- Host applications, consent, optional private document upload, administrator review, food listings, editing and closure.
- Web and mobile serving counters, QR scanning, backup entry, one-time redemption and portion accounting.
- Worker feedback and reports; administrator resolution, event summaries and audit records.
- Supabase Realtime subscriptions with periodic refresh as fallback.

On-duty is a saved preference. Background push, SMS, WhatsApp, phone OTP, payments and staff stipends are **not implemented**. No verification or payment is simulated as successful. Venue approval is a platform review decision, not regulatory certification.

## Deployment and verification

- [Deployment](docs/DEPLOYMENT.md)
- [Architecture and API contracts](docs/ARCHITECTURE.md)
- [Verification results and remaining checks](docs/VALIDATION.md)
- [Security notes](docs/SECURITY.md)

No commits or pushes were made on behalf of teammates. Each teammate should understand, test and commit their own assigned module.
