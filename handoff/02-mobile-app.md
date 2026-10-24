# Mobile app handoff — hunger-2026-10-24-v3

Owner: mobile teammate. Paths: `apps/mobile/` and this handoff. Tejas owns the website, not the app.

This archive contains the complete Expo source module with the red-and-white interface matching the website and host console. It includes `App.tsx`, shared-theme-based local native styles, SVG icons, EN/KN/HI presentation copy, compressed illustrative food assets, Expo configuration and lint setup.

Use the other three matching release archives and install from the assembled root. `packages/core` supplies backend calls, validation, QR protocol, types and palette. Local `src/ui/` provides native rendering. Never replace backend availability with a local counter.

Checks: `npm run typecheck`, `npm run lint:mobile`, and `npm run export -w @hunger/mobile`. Test on physical Android and iOS, including camera/location denial, manual serving code, session restoration, accessibility, keyboard and translations. Exports are not signed app installers.

If you already have newer local work, compare/merge this source deliberately rather than overwriting it blindly. No GitHub action is authorized by receiving or extracting the archive; the app owner pushes only when explicitly instructed.
