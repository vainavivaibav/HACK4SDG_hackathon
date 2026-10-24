# Security and remaining deployment checks

## Implemented controls

- RLS on every exposed table; private profile/reservation records scoped to their owner, event host, or administrator as appropriate.
- Authorization roles stored in protected database columns. Signup metadata cannot promote accounts.
- Column-level profile update grants exclude `role` and `id`.
- Reviewed transaction functions check identity and ownership, set an empty search path, and use schema-qualified relations. Public wrappers are invokers; unsafe default function grants are revoked.
- Row locks, unique indexes and capacity constraints protect reservations and one-time serving.
- Token expiry uses wall-clock checks after locks. Four-digit codes are event-scoped and check-in attempts are limited.
- Client applications use only publishable keys. Native refresh tokens use encrypted SecureStore.
- Verification documents are private, size/type limited, owner-prefixed, and accessed through short-lived signed links.
- No cloud secrets, generated personal environment files, dependency folders, or Git metadata belong in the ZIPs.

## Dependency audit

The installation audit reports high-severity advisories in the Expo CLI development/signing dependency chain (`node-forge` and the CLI's Zod 3 dependency, propagated through Expo packages). The app's own shared validation uses pinned Zod 4.6.7. A blanket major-version override would risk breaking Expo's CLI; it was not applied or presented as a fix. Review `npm audit` and current Expo releases before running signing/release workflows. These are real unresolved toolchain advisories, not a claim that the deployed worker website exposes those CLI packages.

## Required target-project checks

Hosted Supabase Auth, confirmation email delivery, Storage access policies, Realtime delivery, recovery/deletion behavior, production rate limits, and native permission behavior must be verified after the target project is supplied. Automated local tests do not substitute for these checks.

The local HTTP test adapter has known fixture credentials, a process-random signing key, disposable data, and loopback-only binding. It is intentionally unsuitable for hosting and explicitly rejects production mode.

Venue approval records an administrator's platform decision. This software does not certify food safety or regulatory compliance. Hosts remain responsible for operating an appropriate on-site service.
