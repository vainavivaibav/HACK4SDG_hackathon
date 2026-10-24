# Teammate 3 - Backend

Own `backend/` and `handoff/03-backend.md`. The backend is Supabase Auth + PostgreSQL/RLS + RPC + private Storage + Realtime. `schema.sql` is the reviewed source; the generated migration contains the same schema.

## Install into a new dedicated Supabase project

The project's owner should review and apply the migration from `supabase/migrations/` in the Supabase SQL editor. It expects a project with no existing HUNGER tables. Do not apply it to an unrelated project. Alternatively, use the pinned CLI with `npx supabase --help`, link the intended project, and review `npx supabase db push --help` before deploying migrations. Never commit personal CLI tokens or database passwords.

Apply the migration before signing up app accounts. The auth trigger creates a worker profile; roles are not read from user-editable metadata.

After an intended administrator signs up, a database owner can promote that exact user:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
```

Replace the email deliberately. This operation is not available to app users. Re-sign in after promotion so the UI reloads the profile.

Enable Email/password Auth and configure the worker website as the Auth Site URL and redirect allowlist. When confirmation emails are enabled, configure a real SMTP provider and verify delivery. Mobile users confirm their email in a browser, then sign in in the app. No SMS/phone provider is configured.

The migration creates a private `venue-documents` bucket (5 MB, PDF/JPEG/PNG), owner-prefix insert/read policies, and admin document reads. It adds listings, reservations and venues to `supabase_realtime` when that publication exists. Verify those services in the target cloud project after migration.

## Rules enforced in the database

- Account row locks serialize simultaneous reservations by the same person.
- Deterministically ordered listing locks serialize capacity changes.
- A partial unique index allows one active reservation per account.
- Capacity constraints prevent reserved + served portions exceeding offered portions.
- Tokens expire at the earlier of 30 minutes and the serving window end.
- Expiry, cancellation, serving and event closure release capacity consistently.
- Check-in requires ownership of the listing venue or an administrator role.
- Token use is atomic; duplicate scans cannot serve twice.
- Backup-code attempts are bounded; errors return without rolling back the attempt record.
- Direct mutations to roles, counters, verification and reservation rows are denied to app roles.
- Every exposed table has RLS. Public RPC wrappers use invoker permissions; reviewed privileged implementations live in unexposed `private` with explicit identity/ownership checks.
- Workers can read only their own profile and reservation records; hosts can inspect reservations for their own serving events.

Active apps call `refresh_expired` periodically and on relevant mutations. A quiet deployment can temporarily show conservative capacity until the next authenticated refresh. Booking itself always reconciles expiry under the listing lock. For a production pilot, configure a scheduled, trusted expiry job after operational review.

## Tests

From the root: `npm test` and `npm run review:schema`. They run real temporary PostgreSQL instances without requiring Docker. They emulate only the Supabase auth schema needed for database policies.

`tests/local-stack.mjs` is a **test-only** HTTP adapter for browser integration. It has disposable test accounts and temporary data, listens only on loopback, has no cloud Storage or Realtime, and refuses production mode. Never deploy it or point real users at it.

For a full local Supabase installation with real Auth/Storage/Realtime, install Docker and use the initialized config in this directory with the Supabase CLI. Check CLI help before running `start`/`db reset`; resets destroy local data. The cloud project and native services still need verification after configuration.

Keep `schema.sql` and the initial migration aligned while it remains undeployed. Once deployed, create a new migration for future schema changes instead of rewriting history.

## Synchronized source release

Release `hunger-2026-10-24-v3` is matched to the redesigned clients. See `CLIENT-CONTRACT.md`. No new database migration is required for this UI release.
