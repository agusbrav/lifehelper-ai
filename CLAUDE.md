# lifehelper-ai — Claude Code Context

Personal life-management platform built as a modular monorepo. Each "pocket" is an isolated module that can optionally contribute data to other modules through a neutral integration layer.

---

## 1. Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript 6, Tailwind 4 |
| Packages | Turborepo + pnpm workspaces |
| Database | PostgreSQL + Prisma 6 (NOT 7 — v7 has a breaking schema change) |
| Auth | Custom JWT-like sessions via `@lifehelper/core` |
| AI | Anthropic SDK (`@lifehelper/core` skills-runner) |
| Node | v22 (`.nvmrc` at root and `apps/web`) |

---

## 2. Monorepo Layout

```
apps/web/                   Next.js app
packages/
  core/                     Shared: db (Prisma), auth, skills-runner
  ui/                       Shared React components
  modules/
    _registry/              Module manifest list (imports budget, etc.)
    _integrations/          Cross-module bridges — the ONLY place modules talk to each other
    budget/                 Monthly Budget pocket
    {future-module}/        Each new pocket lives here
scripts/
  merge-schemas.js          Merges per-module prisma fragments into core schema
```

---

## 3. Module Architecture (Open/Closed Principle)

**Core rule: existing modules are never modified when a new module is added.**

Every module exposes a `manifest.ts` (type inlined — never import from `_registry` to avoid circular deps). Cross-module data flow uses `ModuleBridge` in `_integrations`:

```
New module → registers bridge in packages/modules/_integrations/src/index.ts
Budget (or any target) calls resolveContributions() → receives contributions passively
```

- `_integrations` depends on nothing except its own types.
- Source modules do NOT import target modules.
- Target modules do NOT import source modules.
- Bridges are pure translation functions (no DB access).

**Adding a new module checklist:**
1. `packages/modules/{id}/` — schema fragment, src, manifest, vitest config
2. Add fragment path to `scripts/merge-schemas.js`
3. Run `pnpm merge-schemas && pnpm db:migrate`
4. Register in `packages/modules/_registry/src/index.ts`
5. If it contributes to another module, add a bridge in `_integrations/src/index.ts`

---

## 4. Database Rules

- Schema lives in `packages/core/prisma/schema.prisma` (merged at build time).
- Each module owns a fragment: `packages/modules/{id}/prisma/schema.prisma`.
- **Always run `pnpm merge-schemas` before `pnpm db:migrate`.**
- Commands (run from workspace root):
  ```
  pnpm merge-schemas          # merge module fragments into core schema
  pnpm db:generate            # prisma generate
  pnpm db:migrate             # prisma migrate dev
  pnpm db:studio              # prisma studio
  ```
- Prisma is pinned to **6.x**. Do not upgrade to 7.x without a dedicated migration (datasource url moved to prisma.config.ts in v7).
- `@prisma/client` must be in `apps/web` dependencies (not just `packages/core`) for `serverExternalPackages` to resolve the native binary.

---

## 5. Next.js Rules

- **Proxy, not middleware**: route guard lives in `apps/web/proxy.ts`, exports `proxy()` (Next.js 16 renamed middleware → proxy).
- `serverExternalPackages: ['@prisma/client', '.prisma/client']` must stay in `next.config.ts`.
- `transpilePackages` includes `@lifehelper/core`, `@lifehelper/ui`, `@lifehelper/registry`.
- Turbopack root is set to workspace root so cross-package imports resolve.
- Server Actions in `apps/web/app/(app)/m/{module}/actions.ts` — always `'use server'`.

---

## 6. Theming

- CSS custom properties only — never hardcode colors.
- Variables defined in `apps/web/app/globals.css`: `--bg`, `--fg`, `--accent`, `--accent-fg`, `--accent-muted`, `--muted-fg`, `--border`, `--card-bg`, `--sidebar-bg`.
- Dark/light theme toggled via `ThemeProvider` class on `<html>`.

---

## 7. Testing

- **Vitest only for pure logic** (analytics, carry-forward, type transforms).
- Never mock `db` in tests that hit real logic — mock at the module boundary.
- Test files live next to source: `src/__tests__/`.
- Run per-package: `cd packages/modules/budget && pnpm test`.
- Run all: `pnpm test` from workspace root (via Turbo).

---

## 8. Dev Workflow

```bash
# Start dev server (from apps/web or workspace root)
pnpm dev

# Type check all packages
pnpm type-check

# Run all tests
pnpm test
```

- Package manager: **pnpm only** — never use npm or yarn in this repo.
- After changing any package, the dev server hot-reloads via Turbopack (no restart needed for TS changes in workspace packages).

---

## 9. Commit Rules

- Human-style messages: short, accurate, no AI attribution.
- Never commit: `.env`, `docs/superpowers/`, `*.tsbuildinfo`, `.next/`, `node_modules/`.
- One logical change per commit. Bug fix = one commit, feature = one commit per meaningful unit.
- Before committing: verify `tsc --noEmit` passes and tests pass.
- Check for em dashes (`—`) in code and replace with regular dashes (`-`). Exception: migration SQL files are immutable.
- Push only after confirming no broken tests or type errors.

---

## 10. Security

- Read `.env` for context only — never print raw secret values.
- Session cookie is `httpOnly`, validated server-side via `getSession()` from `@lifehelper/core`.
- Never modify `proxy.ts` auth logic or session handling without re-testing the full auth flow.
- `SESSION_SECRET` must be a long random string in production.

---

## 11. Memory & Continuity

- Memory files: `/Users/agustinbravo/.claude/projects/-Users-agustinbravo-Personal-lifehelper-ai/memory/`
- Index: `MEMORY.md` in that directory.
- Load memory at session start to avoid re-briefing.
- Save new feedback/project decisions immediately after they're established.

---

## 13. Planning & Docs Conventions

- Implementation plans go in `docs/superpowers/plans/` — this folder is gitignored, never commit it.
- Design specs go in `docs/superpowers/specs/` — also gitignored.
- `docs/TODO.md` is the only planning artifact that IS committed — use it to track pending features/fixes by scope.
- Never create plans or specs outside `docs/superpowers/`.


## 12. Directory Navigation Guidelines:
- Before any file operation, confirm you are in the correct directory with `pwd`
- NEVER use `git reset --hard` or `git clean -fd` without explicit user confirmation
- Use absolute paths for critical operations
- NEVER use cd commands to change directories during interactions. This is a STRICT rule with NO exceptions. Instead:
  - Use relative or absolute paths directly in commands (e.g., ls ./subdirectory or grep pattern ./subdirectory/file.txt instead of cd ./subdirectory && ls or cd ./subdirectory && grep pattern file.txt)
  - If you need to run multiple commands in a specific directory, use subshells: (cd /path/to/dir && command1 && command2) which contain the directory change
  - When needing to reference multiple files in the same directory, use pattern matching: /path/to/dir/*.* instead of changing into that directory
  - NEVER combine cd with command execution using && or ; outside of a subshell
  - If a user explicitly requests you to use cd, explain this policy and suggest the alternatives above