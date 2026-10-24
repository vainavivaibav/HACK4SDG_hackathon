# Host/admin and integration handoff — hunger-2026-10-24-v4

Owner: integration teammate. Paths: `apps/console/`, `packages/`, root configuration and lockfile, `scripts/`, `integration/`, `docs/`, `legacy/`, and this handoff.

The host/admin portal now matches the website and app's red-and-white interface. Shared `theme` in `packages/core` controls the native palette; shared CSS uses matching values for both web apps. Shared APIs, validation, types, locale dictionaries, QR protocol, reservation rules and account sessions remain consistent.

Read `docs/TEAM.md` and `docs/MANUAL-SETUP.md`. Assemble all four archives into one root, run `npm ci`, `npm run check:integration`, `npm run typecheck`, `npm test`, `npm run build`, `npm run lint:mobile`, `npm run export -w @hunger/mobile`, and the browser journey. Review `docs/VALIDATION.md` for test boundaries and `docs/SECURITY.md` for toolchain advisories.

No automated GitHub activity. Do not commit/push, merge or create branches without explicit user instructions. Module owners review their files separately.

The v4 Stitch reference release adds a compact inventory summary and blue serving panels. The website uses reloadable meal/detail and reservation routes; the native app retains native sheets and hides extra filters behind its filter control. Backend booking rules and the shared token protocol are unchanged. See `docs/STITCH-REFERENCE.md`.
