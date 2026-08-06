# AGENTS.md

## Cursor Cloud specific instructions

HealthProof is a pnpm monorepo. The **primary product** is the Next.js clinical app in
`apps/frontend/healthproof-frontend`. Standard scripts live in each `package.json` and setup
is documented in `README.md`; only the non-obvious caveats are captured here.

### Services

| Service | Path | Required? | Run (dev) |
|---------|------|-----------|-----------|
| Frontend (Next.js 16) | `apps/frontend/healthproof-frontend` | Primary | `pnpm dev` → http://localhost:3000 |
| Backend (NestJS) | `apps/backend` | Optional | needs Postgres + `DATABASE_URL`; see caveat below |
| Smart contracts (Hardhat) | `infra/avalanche/contracts` | Optional / infra | not in the pnpm workspace; see caveat below |

- The pnpm workspace only contains `apps/frontend/healthproof-frontend` and `apps/backend`
  (see `pnpm-workspace.yaml`). Root `pnpm install` installs both. Node 22 / pnpm 10 are used.
- Lint (`pnpm lint`, Biome) and tests (`pnpm test`, Vitest, 38 tests) run from the frontend dir.
  Note: `pnpm lint` currently reports pre-existing errors — do not assume a clean baseline.

### Frontend env / secrets (important gotcha)

- Env goes in `apps/frontend/healthproof-frontend/.env` (gitignored). There is **no `.env.example`**
  in the repo despite the README; the full var list is in `README.md` and `src/lib/env.ts`
  (contract addresses and Hygieia RPC already have working defaults there).
- **A valid `NEXT_PUBLIC_PRIVY_APP_ID` is mandatory to render any UI.** With it empty/invalid,
  `PrivyProvider` throws at init and **every `/[locale]` page returns HTTP 500** (the fallback
  `PrivyErrorBoundary` also crashes on a next-intl `{{origin}}` message). The dev server itself
  still starts and compiles fine — the 500 is purely the missing Privy app id.
- Full document flows additionally need Supabase (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_KEY`, `NEXT_SUPABASE_SECRET_KEY`) and Pinata (`PINATA_JWT_SECRET`).
- Core client-side crypto (ECDH P-256 + AES-GCM in `src/services/encryption`) needs no secrets
  and runs under Node's Web Crypto — it is fully covered by `pnpm test`.

### Backend caveat (optional)

`apps/backend` `main.ts` defaults to `PORT=3000`, which collides with the frontend, but the
frontend expects the backend at `http://localhost:3001`. Run it as `PORT=3001 pnpm start:dev`
after `pnpm db:generate` + `pnpm db:push` against a Postgres `DATABASE_URL`.

### Contracts caveat (optional / infra)

`infra/avalanche/contracts` is NOT part of the pnpm workspace, so install it standalone:
`pnpm install --ignore-workspace --shamefully-hoist` (the `--shamefully-hoist` is required so
Hardhat can resolve the `@openzeppelin/contracts` peer dependency). Heads up: the committed deps
pin OpenZeppelin 5.6.1 (pragma `^0.8.24`) while `hardhat.config.ts` pins solc `0.8.22`, so
`hardhat compile` currently fails out of the box — a pre-existing version mismatch, not an env issue.

### Lockfile note

The committed root `pnpm-lock.yaml` is slightly out of sync with the `pnpm.overrides` in root
`package.json`, so `pnpm install` re-applies the overrides and marks the lockfile as modified.
This is harmless; you can leave or discard that change.
