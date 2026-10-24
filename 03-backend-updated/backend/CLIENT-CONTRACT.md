# Client contract — hunger-2026-10-24-v3

This backend bundle is paired with the website, Expo app, and host/admin integration archives from the same release. The UI redesign does not require a schema change. The existing reviewed schema and migration remain identical; do not reapply the initial migration to a populated HUNGER project just to update UI files.

## Shared integration

All clients import the same `HungerApi`, validation and data types from `packages/core`. Website and host/admin use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; mobile uses the corresponding `EXPO_PUBLIC_` names. Configure the same project and publishable key for all three.

- Discovery reads the `meal_feed` view. Availability comes from backend counters, not UI state.
- Booking uses `reserve_meal`; cancellation uses `cancel_reservation`; expiry reconciliation uses `refresh_expired`.
- Website, native QR, and host scanner all use the shared `hunger:v1:<listing_id>:<reservation_id>` format and listing-scoped four-digit fallback.
- Serving uses `serve_meal` and must confirm a `served` result. Repeated redemptions cannot decrement capacity twice.
- Venue onboarding, listing publication and administrator review use `apply_venue`, `save_listing`, `close_listing`, `review_venue`, and `venue_document`.
- Feedback and moderation use `submit_feedback`, `report_listing`, and `resolve_report`.
- RLS and backend ownership/role checks remain authoritative. UI visibility does not grant authorization.

There is no listing-photo database field in this version. Food images in the new interfaces are labelled illustrations. No fake image URLs, payment statuses, or verification claims are written to the database.

From the assembled root, `npm run check:integration` validates RPC names against this schema, schema/migration equality, shared project examples, client copy, assets and dependency versions. Run `npm test` and the browser journey before handing over the combined build. Cloud Auth, Storage, Realtime and physical devices still need target-environment verification.
