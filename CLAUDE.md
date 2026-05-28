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
- **Always run `pnpm merge-schemas` before any schema operation.**
- Commands (run from workspace root):
  ```
  pnpm merge-schemas          # merge module fragments into core schema
  pnpm db:generate            # prisma generate
  pnpm db:migrate             # prisma migrate dev
  pnpm db:studio              # prisma studio
  npx prisma db push --schema packages/core/prisma/schema.prisma   # push without migration history (dev only)
  ```
- **Double-merge prevention**: `merge-schemas` is idempotent — it strips any previously merged fragments before appending, so running it multiple times is safe. No manual restore step needed.
- **Migration history drift**: This project has used `db push` for some schema changes, which bypasses migration history. If `pnpm db:migrate` fails with "drift detected", use `npx prisma db push --schema packages/core/prisma/schema.prisma` instead — it syncs the DB to the current schema without caring about migration history. Only use this in dev.
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

- Human-style messages: short, accurate.
- Never commit: `.env`, `docs/superpowers/`, `*.tsbuildinfo`, `.next/`, `node_modules/`.
- One logical change per commit. Bug fix = one commit, feature = one commit per meaningful unit.
- Check for em dashes (`—`) in code and replace with regular dashes (`-`). Exception: migration SQL files are immutable.
- Push only after confirming no broken tests or type errors.

**Pre-commit gate — all four steps required, no exceptions:**
1. `pnpm type-check` — TypeScript must be clean across all packages (runs `turbo type-check`). For a single package use `pnpm --filter <name> exec pnpm type-check` (e.g. `pnpm --filter web exec pnpm type-check`). Both are in the allowed-tools list and require no approval.
2. `pnpm test` — full Vitest suite must pass.
3. `pnpm db:generate` — required whenever any `.prisma` file was touched; regenerates the client so runtime field access matches the schema.
4. **Manual browser test** — start the dev server, exercise the golden path for whatever changed, and verify no regressions in adjacent features. Unit tests passing is not sufficient; browser confirmation is mandatory.

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

## 12. Directory Navigation Guidelines:
- Before any file operation, confirm you are in the correct directory with `pwd`
- NEVER use `git reset --hard` or `git clean -fd` without explicit user confirmation
- Use absolute paths for critical operations
- NEVER use cd commands to change directories during interactions. This is a STRICT rule with NO exceptions. Instead:
  - Use relative or absolute paths directly in commands (e.g., ls ./subdirectory or grep pattern ./subdirectory/file.txt instead of cd ./subdirectory && ls or cd ./subdirectory && grep pattern file.txt)
  - For pnpm commands in a specific package, use `pnpm --filter <name> exec pnpm <command>` (e.g. `pnpm --filter web exec pnpm type-check`) — this avoids subshell approval prompts and is in the allowed-tools list
  - When needing to reference multiple files in the same directory, use pattern matching: /path/to/dir/*.* instead of changing into that directory
  - If a user explicitly requests you to use cd, explain this policy and suggest the alternatives above

---

## 13. Planning & Docs Conventions

- Implementation plans go in `docs/superpowers/plans/` — this folder is gitignored, never commit it.
- Design specs go in `docs/superpowers/specs/` — also gitignored.
- `docs/TODO.md` is the only planning artifact that IS committed — use it to track pending features/fixes by scope.
- Never create plans or specs outside `docs/superpowers/`.

---

## 14. Fix Propagation — similar systems stay in sync

When a bug or logic issue is fixed in one place, always check whether an analogous pattern exists elsewhere and apply the same fix there too. Common examples:
- Navigation floor/ceiling logic shared between the budget page and analytics page.
- Auth checks or redirect guards duplicated across route layouts.
- Error handling patterns shared across multiple server actions.

After every fix, ask: *"Is there another page, component, or action that uses the same pattern?"* If yes, fix it in the same commit. Document the parallel in the commit message so future reviewers understand why two files changed together.

---

## 15. UI Design Principles

### Responsiveness — always dynamic, never fixed
- Never use fixed pixel heights on containers that hold variable content. Use `h-[Xpx] max-h-[85dvh]` when a stable size is needed so the panel shrinks gracefully on small screens and high zoom.
- Prefer `dvh`/`svh` over `vh` for viewport-relative units — they account for mobile browser chrome (address bar show/hide).
- Modals and panels must scroll their content internally (`overflow-y-auto` on the content area) rather than growing unbounded.
- Width constraints use `max-w-*` not `w-*` so they shrink on narrow viewports.

### Minimalism — less is more
- Every UI element must earn its place. If something is rarely used or situational, put it behind a tab, collapse, or secondary action — not in the primary view.
- Default state should be clean. Controls, labels, and actions appear on hover or inside panels when appropriate.
- Avoid decorative elements that don't carry information.

### Information architecture — related things together, unrelated things apart
- Before adding any new control, setting, or action, ask: *where does this conceptually belong?* If it doesn't belong in the current view, find or create the right tab/section.
- Tabs separate orthogonal concerns (e.g. General / Tarjetas / Categorías). Do not add a setting to a tab it doesn't belong to just because it's convenient.
- When a feature request comes in, explicitly reason about placement before writing any code. If the right home isn't obvious, ask before implementing.

---

## 16. Current Module State

Quick reference for session ramp-up. Keep this table updated whenever a module ships or a new one is scaffolded.

| Module | Status | Package | Key entry points |
|--------|--------|---------|-----------------|
| `budget` | Active | `packages/modules/budget` | `src/actions.ts`, `src/types.ts`, `src/analytics.ts`, `src/chat-prompt.ts`, `prisma/schema.prisma`, `manifest.ts` |

**Active integrations:** none yet (bridges stub in `packages/modules/_integrations/src/index.ts`)

**Planned modules (from `docs/TODO.md`):** Investments, Trip Planner, Shared Expenses, Shopping List, Date/Plans, Nutrition

### TODO convention

- **Module TODOs** live at `packages/modules/{id}/TODO.md` — scoped to that module only.
- **Global TODO** lives at `docs/TODO.md` — architecture, cross-module concerns, and future module ideas. Contains a Module Status table linking to each module's TODO.
- Never put module-specific items in `docs/TODO.md` or global items in a module TODO.

### Session start convention

When starting work on a specific module, run `/project:init-{module}` before touching any code. Each command reads the module's key files and prints a context brief so exploration is unnecessary.

Available init commands:
- `/project:init-budget` — loads full budget module context

When a new module is scaffolded, create `.claude/commands/init-{module}.md` as part of the module checklist (step 1 in §3 above).

### Adding a new module: updated checklist

1. `packages/modules/{id}/` — schema fragment, src, manifest, vitest config, `TODO.md`
2. **`.claude/commands/init-{id}.md`** — module init command (see existing `init-budget.md` as template)
3. Add fragment path to `scripts/merge-schemas.js`
4. Run `pnpm merge-schemas && pnpm db:migrate`
5. Register in `packages/modules/_registry/src/index.ts`
6. If it contributes to another module, add a bridge in `_integrations/src/index.ts`
7. Add a row to the Current Module State table above and to the Module Status table in `docs/TODO.md`