# LifeHelper - Implementation Plan

**Design spec:** [`docs/specs/PLATFORM-DESIGN.md`](specs/PLATFORM-DESIGN.md)

Keep this file updated as work progresses. Mark items `[x]` when done, add notes inline when decisions change.

---

## Phase 1 - Monorepo Foundation

- [ ] Initialize Turborepo + pnpm workspaces
- [ ] Configure `turbo.json` pipeline: `merge-schemas → prisma generate → build → dev`
- [ ] Scaffold `packages/core` (TypeScript config, Prisma client, base DB schema fragment)
- [ ] Scaffold `apps/web` (Next.js App Router, TypeScript, Tailwind)
- [ ] Scaffold `packages/ui` (shared component stubs: Button, Card, Sidebar, Modal)
- [ ] Scaffold `packages/modules/_registry` (empty manifest index)
- [ ] Set up `merge-schemas` script in `core`
- [ ] Add `next-intl` to `apps/web`; set up `messages/es.json` + `messages/en.json`; Spanish default
- [ ] Verify `pnpm dev` runs the full workspace

## Phase 2 - Auth

- [ ] Core schema: `users`, `sessions` tables
- [ ] `core/auth`: `hashPassword`, `verifyPassword` (bcrypt), `createSession`, `getSession`, `deleteSession`
- [ ] Next.js middleware: validate session cookie, redirect unauthenticated users
- [ ] `/register` page + API route
- [ ] `/login` page + API route
- [ ] `/logout` API route
- [ ] Basic session cookie (HttpOnly, Secure, SameSite=Strict)

## Phase 3 - Module Shell

- [ ] Core schema: `module_registry`, `user_modules` tables
- [ ] Dashboard page (`/dashboard`): renders enabled modules as cards with placeholder summaries
- [ ] Sidebar: avatar, enabled module list, `+` button, settings link, mobile collapse
- [ ] Module routing: `/m/[moduleId]/[...slug]` - reads registry, renders module pages
- [ ] Settings page (`/settings`): account details + enable/disable modules
- [ ] Shell reads module list from `_registry` index only (no direct module imports)

## Phase 4 - Inter-Module Context Registry

- [ ] Core schema: `module_context_cache` table (module_id, user_id, summary JSON, updated_at)
- [ ] `core/context-registry`: `registerSummary`, `getSummary`, TTL invalidation (default 60s)
- [ ] `ModuleManifest` TypeScript type (id, name, icon, exposesContext, consumesContext, interactionTier, skills)
- [ ] Tier 1: each module can push a summary on data change
- [ ] Registry enforces user has both modules enabled before sharing context

## Phase 5 - Sharing & Guest Access

- [ ] Core schema: `share_links`, `guests` tables
- [ ] Share link generation API: `POST /api/share` → returns token
- [ ] `/s/[token]` route: resolves token, renders module in guest layout
- [ ] Guest identity: check `localStorage` for `persistent_token`, reconcile with `guests` table on arrival
- [ ] Guest name prompt UI (shown on first visit via share link)
- [ ] Guest session scoping: middleware blocks guests from accessing anything outside their token's instance

## Phase 6 - Chat + Internal Tools (Claude API)

- [ ] Add Anthropic SDK to `packages/core`
- [ ] `core/chat-handler`: assembles context (module data + Context Registry summaries + module system prompt + tool definitions) → calls Claude API with function calling → executes tool calls → streams response
- [ ] `POST /api/chat/[moduleId]` route (streaming)
- [ ] Chat rail in shell: message input (text/voice/image), streamed response display, live pocket UI update after tool execution
- [ ] Guest access: pocket-scoped tools only (no cross-pocket context assembled for guests)

## Phase 7 - First Module

> **Decision pending:** choose which module to build first.
> Candidates: `expenses` (shared expense tracking), `plans` (map-based), `shopping` (shared lists).
> See [`docs/specs/modules/`](specs/modules/) for individual module specs.

- [ ] Choose first module
- [ ] Move its spec from `docs/specs/modules/` → `packages/modules/{id}/docs/spec.md`
- [ ] Scaffold module package: pages, API routes, `.prisma` fragment, manifest, skills
- [ ] Register module in `_registry`
- [ ] End-to-end test: create instance → share link → guest joins → skill runs

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-05-05 | Turborepo + pnpm over plain monorepo | Modules need true isolation; Turborepo handles caching and pipeline ordering cleanly |
| 2026-05-05 | Per-module `.prisma` fragments merged at build | Prevents modules from coupling to `core` schema; each module owns its own tables |
| 2026-05-05 | DB-backed Context Registry (not in-process) | Enables horizontal scaling on Render without re-architecture |
| 2026-05-05 | Guest `persistent_token` in localStorage | One person = one guest record across multiple share links |
| 2026-05-05 | Module specs co-located in `packages/modules/{id}/docs/` | Keeps module fully self-contained; spec moves with the code |
| 2026-05-05 | Module specs temporarily in `docs/specs/modules/` | Packages not yet scaffolded; move each spec when its package is created |
