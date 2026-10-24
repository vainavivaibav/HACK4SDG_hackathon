# Synchronized release: hunger-2026-10-24-v4

This is one complete source release divided into four non-overlapping ZIPs. It replaces the earlier two UI-only update bundles. Do not mix files from the older bundles into this assembled release.

| Archive | Owner | Contents |
|---|---|---|
| `01-website.zip` | Tejas: website | Complete Next.js worker website and website handoff |
| `02-mobile-app.zip` | App teammate | Complete Expo mobile app and app handoff |
| `03-backend.zip` | Backend teammate | Supabase schema, initial migration, local database tests and client contract |
| `04-host-admin-integration.zip` | Integration teammate | Host/admin console, shared core/UI packages, root package and lockfile, tests, scripts and setup guides |

## Assemble once

1. Back up any newer team edits before replacing files.
2. Extract all four archives into the **same project root**. Move the contents out of any automatically created ZIP-name wrapper folder. The resulting root must contain `apps/`, `packages/`, `backend/` and `package.json`.
3. Run `npm ci` from that root, then `npm run check:integration`.
4. Copy the three example environment files as described in `MANUAL-SETUP.md`. Use the same Supabase project and publishable key for the website, app and console. Never place a secret/service-role key in any client.
5. Run `npm run dev`, `npm run dev:console`, and `npm run dev:mobile` in separate terminals.

The source directories intentionally depend on the shared workspace. A single ZIP is one teammate's module, not an independent standalone project. Backend rules and schemas are unchanged by the UI redesign; an already-migrated HUNGER project does not need the initial migration applied again.

## What is synchronized

- Website, native app and host/admin console use white panels on a blue-gray canvas, blue utility surfaces, a red primary accent and consistent form controls, badges, cards and branding.
- Native palette imports the shared `theme`; shared web CSS is checked against the same values.
- Website and app use the same EN/KN/HI presentation copy and identical compressed illustrative food images.
- All clients call the same shared `HungerApi`. Reservation capacity, expiry, one-active-token and single-serving rules remain in PostgreSQL.
- The lockfile matches all app manifests, including the mobile lint tools.
- `npm run check:integration` verifies colour values, locale copy, image hashes, environment examples, pinned dependencies, RPC definitions, schema/migration equality and release markers before packaging.
- The manifest records each source path and hash. Four ZIP ownership sets are disjoint.

## GitHub boundary

Preparing, extracting, checking, or running this release does not authorize GitHub operations. Do not commit, push, create branches or merge unless the user explicitly asks. Each owner remains responsible for reviewing and integrating their own module. No GitHub action was taken while preparing this release.

## Verification boundaries

Local PostgreSQL/browser tests do not verify hosted Supabase Auth, email delivery, Storage or Realtime. Configure and test the selected cloud project manually. Android/iOS exports are compiled bundles, not signed installers or physical-device checks. See `VALIDATION.md` and `SECURITY.md`.

Food photos are AI-generated illustrations and labelled in the clients. Prompts and saved asset filenames are documented in `apps/web/public/assets/UI-ASSETS.md`.

## Stitch reference integration

See `STITCH-REFERENCE.md` for the three supplied references and the implementation choices. Website details and tokens are full, reloadable routes. Native screens keep the app’s existing sheet interactions and now match the same cards, summaries, serving information, and token hierarchy. The backend schema and migration are unchanged.

The subsequent user-authorized GitHub branch synchronization is recorded in `BRANCH-SYNCHRONIZATION.md`; it leaves `main` unchanged.
