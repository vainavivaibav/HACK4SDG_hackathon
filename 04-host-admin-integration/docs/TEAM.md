# Four-person integration and Git handoff

The ZIP files contain normal source files with paths relative to the repository root. Extract all four into the **same root**, not four nested project folders. They have disjoint file ownership, checked by the packaging script.

## Ownership

1. Website: `apps/web/`, `handoff/01-website.md`.
2. Mobile: `apps/mobile/`, `handoff/02-mobile-app.md`.
3. Backend: `backend/`, `handoff/03-backend.md`.
4. Integration: `apps/console/`, `packages/`, `scripts/`, `integration/`, `docs/`, `legacy/`, root `package.json`, `package-lock.json`, `tsconfig.base.json`, `.gitignore`, `playwright.config.ts`, `README.md`, and `handoff/04-host-admin-integration.md`.

The integration teammate owns shared types, validation, translations, UI, root dependency versions and lockfile. Coordinate changes there rather than duplicating contracts in individual apps.

## Recommended sequence

1. Everyone pulls the same repository base and extracts all four archives locally.
2. Read the module README; run `npm ci` at the root. Configure a dedicated Supabase project as described in `backend/README.md`.
3. Each teammate reviews and tests their assigned module, makes any needed changes, then stages only their owned files.
4. Integrate the foundation/shared package changes, then backend, website, and mobile changes into a team integration branch. Test after all four are present. The lockfile intentionally describes the complete workspace, so partial extraction is not supported.
5. Run the full checks and the host → approval → listing → reservation → serving journey together.
6. Each person should commit and push using their own authenticated Git account. No fake authors, backdated commits, or automatically attributed contribution history is included.

Example staging commands (review `git status` first):

```sh
# Teammate 1
git add apps/web handoff/01-website.md
# Teammate 2
git add apps/mobile handoff/02-mobile-app.md
# Teammate 3
git add backend handoff/03-backend.md
# Teammate 4
git add apps/console packages scripts integration docs legacy handoff/04-host-admin-integration.md
git add package.json package-lock.json tsconfig.base.json .gitignore playwright.config.ts README.md
```

These are instructions, not commands that were executed for you. Choose your own branch and truthful commit message after reviewing the code.

## Starter preservation

The original Vite starter is copied under `legacy/vite-starter/`, including its original package/lockfile and assets. ZIP extraction cannot delete files already in your checkout. Old root `src/`, `public/`, `vite.config.js`, `eslint.config.js`, and `index.html` may therefore remain; the new workspace does not use them. Preserve any custom work before tidying them up. Do not stage old-file deletions unless your team has reviewed them.

## Repackage after edits

`npm run package:team` generates the four source ZIPs in `../output/hackathon/` and refreshes `docs/DELIVERY-MANIFEST.json`. It requires Python 3 only for ZIP creation. It excludes `.git`, dependencies, build outputs, caches, personal environment files and test artifacts. `.env.example` files remain included.
