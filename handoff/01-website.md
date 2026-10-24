# Website handoff — hunger-2026-10-24-v3

Owner: Tejas, website only. Paths: `apps/web/` and this handoff. The app belongs to the mobile teammate.

This is the full worker website module, including the synchronized red-and-white UI, search and filters, meal cards, mobile navigation, details, QR/token display, profile and reservation history. Use the matching three other release archives for shared packages, root setup, backend and console. Extract into the repository root, not a nested `01-website` folder.

Start with `apps/web/README.md` and `docs/MANUAL-SETUP.md`. Build from the assembled root with `npm run build -w @hunger/web`. Verify filters, mobile layout, account forms, reservations, cancellation, QR expiry, reports, feedback and language selection against the same Supabase project as the app and console.

Source release preparation does not authorize GitHub activity. Commit, push, branch creation, merges or other GitHub actions require the user's explicit instruction. When authorized, select only this module's owned paths.
