# Architecture and contracts

```text
apps/web        Next.js worker website (:3000)
apps/mobile     Expo Android / iOS / web worker app + serving screen
apps/console    Next.js host and admin portal (:3001)
      |         shared API and contracts from packages/core
      v
Supabase Auth -> authenticated user ID
PostgREST     -> public invoker RPC wrappers -> private transaction functions
PostgreSQL    -> profiles / venues / listings / reservations / feedback / reports / activity
Storage       -> private venue-documents bucket
Realtime      -> listing / reservation / venue change subscriptions
```

`packages/ui` supplies reusable web components, account state, accessible dialogs, buttons, notices, language selection and the visual theme. `packages/core` supplies API calls, types, Zod validation, worker translations, geographic distance, QR encoding and expiry helpers. The mobile app uses the same core API with native session storage.

## Public RPC contract

| RPC | Parameters | Result |
|---|---|---|
| `reserve_meal` | `p_listing` UUID | Reservation |
| `cancel_reservation` | `p_reservation` UUID | Reservation |
| `serve_meal` | `p_listing` UUID, `p_token` string | Reservation or committed `{error}` |
| `refresh_expired` | none | void |
| `apply_venue` | `p_data` venue object | Venue |
| `save_listing` | `p_data` listing object, `p_id` UUID/null | Listing |
| `close_listing` | `p_listing` UUID | void |
| `review_venue` | `p_venue`, `p_approve`, `p_note` | void |
| `venue_document` | `p_venue` | private document path or null |
| `submit_feedback` | `p_reservation`, `p_rating`, `p_comment` | void |
| `report_listing` | `p_listing`, `p_reason` | void |
| `resolve_report` | `p_report`, `p_note` | void |

The core API unwraps both PostgREST errors and committed `{error}` results. No client may directly edit capacity counters, reservation status, verification or authorization roles.

## Reservation lifecycle

`active -> served | cancelled | expired`. Terminal tokens cannot be reused. Expiry is also derived from the clock in clients, so a token stops appearing active before a periodic cleanup runs. Closing a food listing expires its remaining active tokens.

Live available portions are total minus reserved minus served. Expired capacity is reconciled under lock before a claim. Reservation limits apply by authenticated account; email/password accounts do not enforce one-account-per-phone. Phone OTP and anti-abuse controls beyond account limits are future operational work.

QR format: `hunger:v1:<listing UUID>:<reservation UUID>`. The serving UI validates that the QR belongs to the selected event before sending the reservation UUID. Four-digit fallback codes are scoped to a listing and unique among its active reservations.

All stored times are timezone-aware UTC timestamps. Forms accept the host's local time and convert it before sending; clients format times in the chosen locale. Distances use the Haversine formula on venue coordinates and an explicitly requested foreground location.

## Boundaries

- Host approval requires an actual administrator review; it is not a certification claim.
- Private document links expire in 60 seconds.
- Preference saving does not send push/SMS/WhatsApp notifications.
- Browser integration runs use a protocol adapter for local tests; production uses Supabase directly.
- SDK/type checks and native bundle export do not replace real-device permission checks.
