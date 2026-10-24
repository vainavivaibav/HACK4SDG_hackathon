# Repository branch synchronization — 24 October 2026

This synchronization was explicitly requested by the user after the local v4 source release. The user confirmed that `main` must remain unchanged.

- `01-website` already contains the v4 worker website.
- `02-mobile-app` already contains the v4 mobile app. Its existing teammate commit is retained without an unnecessary replacement commit. Local editor/plugin configuration is not required app source.
- `03-backend` retains the existing v4 SQL and tests, moved out of `03-backend-updated/` into canonical root paths `backend/` and `handoff/03-backend.md`. No schema or hosted database changes are made.
- `04-host-admin-integration` contains the v4 console, shared theme/contracts, workspace manifests, checks and setup documentation at the repository root. The obsolete `04-host-admin-integration/` wrapper is removed after its contents are normalized. The initial Vite starter is preserved under `legacy/vite-starter/`.
- `integration/test-all-projects` combines the current module branches into one runnable workspace. The old `03-backend/` wrapper from its earlier integration is normalized as well.

Existing teammate commits and authorship remain in history. Synchronization commits use the requesting user's configured identity. No history rewriting or force pushes are needed. Each module branch still owns its documented paths; use the integration branch to run all clients together.

The delivery manifest describes the four canonical source modules. Generated builds, dependencies, personal environment files and local `.claude` configuration are excluded. `docs/VALIDATION.md` describes the local checks and their cloud/device limitations.
