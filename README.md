# LifeHelper

A modular personal life management platform. Each mini-app (expenses, plans, shopping, etc.) is an independent module that can be shared with friends and family via link.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 15 (App Router) |
| Backend | Next.js API routes (Node/TypeScript) |
| Database | PostgreSQL + Prisma |
| AI | Anthropic SDK (module skills) |

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (local or Docker)

## Local Setup

```bash
# Install dependencies
pnpm install

# Copy env and fill in values
cp .env.example .env

# Run DB migrations
pnpm db:migrate

# Start all apps
pnpm dev
```

The web app runs at `http://localhost:3000`.

## Project Structure

```
apps/
  web/                  # Next.js shell - auth, dashboard, module routing
packages/
  core/                 # DB client, auth, context registry, skills runner
  ui/                   # Shared component library
  modules/
    _registry/          # Module manifest index
    expenses/           # (coming soon)
    plans/              # (coming soon)
    shopping/           # (coming soon)
```

## Adding a Module

1. Create `packages/modules/{id}/` with its own `package.json`, `.prisma` fragment, and manifest
2. Register it in `packages/modules/_registry/src/index.ts`
3. Run `pnpm merge-schemas && pnpm db:migrate`

See `docs/specs/PLATFORM-DESIGN.md` for the full architecture spec.
