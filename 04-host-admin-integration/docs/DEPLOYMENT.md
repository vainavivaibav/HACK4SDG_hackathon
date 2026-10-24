# Deployment

No remote Git push or hosting deployment is performed by these files. Your team controls the repository and cloud accounts.

## Supabase

Selected project: `https://ytkdruokcyqnsxwmhzva.supabase.co`. This chat's Supabase connection was denied access. The owner must either grant the connected account project access or perform the setup below. No cloud tables or authentication settings were changed.

1. Choose a dedicated project and review/apply the backend migration.
2. Set Auth Site URL and allowed redirects to the deployed worker website. Configure confirmation and SMTP deliberately; test actual email delivery.
3. Verify the private `venue-documents` bucket, its allowed MIME types/size, and owner/admin access.
4. Confirm listings, reservations and venues are enabled in the Realtime publication. Subscribe two clients and check updates.
5. Sign up accounts; have the project owner grant the intended administrator role through SQL.
6. Use only the project URL and publishable key in apps. Store administrative secrets only in trusted tools or server environments.
7. Review operational limits, identity/abuse controls, account deletion procedures, backups, and a scheduled expiry cleanup before a public pilot.

## Worker website and host portal

Deploy them as two Next.js applications on a compatible Node.js host, for example Vercel. Configure the monorepo app root as `apps/web` or `apps/console` and install from the workspace root so shared packages resolve.

Build commands from the root:

```sh
npm ci
npm run build -w @hunger/web
npm run build -w @hunger/console
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on each deployment. Set the worker site's `NEXT_PUBLIC_CONSOLE_URL` to the deployed host portal and the console's `NEXT_PUBLIC_WORKER_URL` to the worker site. Public environment changes require rebuilding.

Use HTTPS for camera/location permissions. Test login/logout, venue approval, booking collisions and cross-client updates on the deployed applications. Do not deploy `backend/tests/local-stack.mjs`.

## Mobile

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Expo build environment. Configure final app identifiers in `app.json` before release. From `apps/mobile`, use a current EAS CLI and your team's Expo account to configure and build:

```sh
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile production
```

The preview Android profile produces an APK. iOS distribution requires Apple signing credentials and an appropriate developer account. EAS may incur account-specific costs; builds were not submitted here.

Install on physical Android and iOS devices. Test camera permission denial/manual check-in, foreground location denial/area selection, encrypted session restore, background/foreground refresh, QR scanning in venue lighting, accessibility and all three worker languages.

## Local verification without cloud credentials

`npm run test:e2e` owns temporary test servers and local fixture accounts. For manual integration exploration, run `npm run test:local-stack` and configure Next.js apps with the printed local URL `http://127.0.0.1:54329` and publishable test value `local-integration-test-only`. Use `NEXT_PUBLIC_DATA_MODE=sample` to show the local-test banner. Reuse ports 3000/3001 or 3100/3101; the adapter permits only these loopback origins and Expo preview ports.

Fixture accounts are `worker@hunger.test`, `second@hunger.test`, `host@hunger.test`, and `admin@hunger.test`, all with the deliberately public test password `HungerDemo123!`. They exist only in the disposable local adapter. Data disappears when that server stops. This is not production authentication, email delivery, Storage, or Realtime. Physical phones cannot reach a computer's loopback address; use a real Supabase project or full local Supabase with appropriate trusted network configuration for device testing.
