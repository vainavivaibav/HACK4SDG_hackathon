Release: `hunger-2026-10-24-v4`. Assemble all four matching archives as described in `SYNCHRONIZED-RELEASE.md`.

# Manual setup for your HUNGER project

Target: **https://ytkdruokcyqnsxwmhzva.supabase.co**

The connected tool was denied access, so nothing was changed in this cloud project. These instructions are for its owner or an authorized project member.

## 1. Put all four modules together

Clone/pull your team's GitHub repository. Extract **all four ZIP files into that same repository root**. You should see `apps/web`, `apps/mobile`, `apps/console`, `packages`, and `backend` beside the root `package.json`.

Use Node.js 24 LTS. From the root:

```sh
npm ci
```

## 2. Create the database schema

Open the intended project in Supabase and inspect its Table Editor. This migration is for a project without existing HUNGER tables. If `profiles`, `venues`, `listings`, or `reservations` already exist, stop and reconcile that schema first rather than overwriting work.

In **SQL Editor**, create a new query. Paste the complete contents of:

`backend/supabase/migrations/20261024114248_hunger_platform.sql`

Run it once. It creates the app tables, RLS policies, protected transaction functions, auth profile trigger, private document bucket and Realtime publication entries. Do not repeatedly paste it after a successful run; future changes should use new migrations.

In the API settings, keep `public` available to the Data API. **Do not expose the `private` schema.**

## 3. Configure the app environment files

Find the project's **publishable API key** in its API settings. Use that public client key, never a service-role or secret key.

Copy:

| Copy from | Copy to |
|---|---|
| `apps/web/.env.example` | `apps/web/.env.local` |
| `apps/console/.env.example` | `apps/console/.env.local` |
| `apps/mobile/.env.example` | `apps/mobile/.env` |

The project URL is already filled in the examples. Add the publishable key to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in both websites and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in mobile.

Keep local worker/console URLs as `http://localhost:3000` and `http://localhost:3001`. These environment files are ignored by Git and excluded from ZIPs. Restart the apps after changing them.

## 4. Configure authentication

Enable the Email/password provider in Supabase Auth. Set the Auth Site URL to `http://localhost:3000` during desktop local development and configure allowed redirects accordingly. Use the deployed HTTPS website URL when deploying or testing confirmation links on phones.

If email confirmation is enabled, configure and test actual email delivery. A new account may need to confirm its email before signing in. The app reports this instead of pretending confirmation occurred. Phone OTP/SMS is not configured.

## 5. Start the applications

Run each command in a separate terminal at the repository root:

```sh
npm run dev
npm run dev:console
npm run dev:mobile
```

Worker website: **http://localhost:3000**

Host/admin portal: **http://localhost:3001**

Expo prints instructions for opening the Android/iOS app. A physical phone can reach the supplied cloud Supabase URL; it cannot reach your computer through a `localhost` URL.

## 6. Create an administrator

Sign up a real team administrator account in the app and complete confirmation if required. Then, as the project owner, run this query in Supabase SQL Editor after replacing the email:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL'
)
returning id, role;
```

Confirm exactly the intended account was updated. Sign out and back in on the console to refresh its role. No client-side form can grant administrator status.

## 7. Try the complete journey

Use separate browser profiles/private windows for administrator and host sessions:

1. Host signs in to the console and applies for a venue with consent, address and coordinates. A supporting document is optional.
2. Administrator opens **Venue review**, checks the application and records an approval note.
3. Host refreshes the console and chooses **Share food**. Select the approved venue, describe the meal and enter portions and times. Use a serving start at or before now, a future end, and a cooked time at or before serving starts.
4. Worker signs in to the worker website or mobile app and reserves that meal.
5. The worker receives a QR and a four-digit backup code.
6. Host opens **Serving counter**, selects the matching event, enters/scans the token, and confirms the meal was handed over.
7. Check the available/served counts and the worker's history. A second scan must fail. Try cancellation, window expiry, feedback and reporting too.

## 8. Verify cloud services before your presentation

Confirm Realtime is enabled for `listings`, `reservations`, and `venues`. Open two clients and check that booking and serving update the other client; periodic refresh is only a fallback.

Check that `venue-documents` is private. Upload a small PDF/JPEG/PNG from the venue form, then open it as the owning host and an administrator. Other users must not have access.

Check authentication, email confirmation, logout and permissions in the real project. The local automated test results do not establish these cloud settings.

## 9. Team push and device builds

Each teammate should review, understand and test their module, then stage only their owned paths using `TEAM.md`. No commits or pushes were made for you.

For signed Android/iOS installation packages, follow `DEPLOYMENT.md`. The ZIPs contain the Expo source; compiled bundle export is not a signed APK/IPA. Physical-device camera, location and session restore checks remain necessary.
