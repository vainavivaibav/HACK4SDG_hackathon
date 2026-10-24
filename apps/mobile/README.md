# Teammate 2 - Mobile app

Own `apps/mobile/` and `handoff/02-mobile-app.md`. Expo/React Native/TypeScript app targeting Android, iOS and web. Shared API, validation, locales and types come from `@hunger/core`.

After extracting all modules, run `npm ci` from the root. Copy this directory's `.env.example` to `.env`; set the same Supabase URL and publishable key used by the websites. Restart Metro after environment changes. Run `npm run dev:mobile` at the root.

Screens: discovery and details, signup/sign-in, profile and work areas, reservation history, QR token/countdown, cancellation, feedback/reporting, and a serving counter for host/admin accounts. Native sessions use chunked encrypted SecureStore; web preview uses browser storage. Only foreground location is requested.

Check native permissions on physical devices. QR scanning is user-initiated and offers manual fallback. No background location or notification delivery is enabled. Sample mode cannot make real bookings.

```sh
npx tsc -p apps/mobile --noEmit
npm run export -w @hunger/mobile
```

The export compiles Android/iOS bundles and a browser build. It is not a signed APK/IPA. See the deployment guide for EAS builds and required Android/iOS signing accounts. Replace `org.hunger.community` with the team's final package/bundle identifier before store release.

Requires teammate 4's workspace/core package and teammate 3's backend. Native camera, location, SecureStore and app lifecycle must be checked on actual devices before claiming device validation.
