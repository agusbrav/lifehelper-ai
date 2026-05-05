# LifeHelper Platform - Design Spec

**Date:** 2026-05-05  
**Status:** Approved

---

## Overview

LifeHelper is a modular web platform for managing personal life mini-apps (modules). Initially built for personal use, designed to grow to a small circle of friends/family, and architected to scale to a public product without major rework. Each module (expenses, plans, shopping lists, etc.) is self-contained but can share context with other modules at configurable tiers.

---

## 1. Repository Structure

**Turborepo monorepo with pnpm workspaces.**

```
lifehelper-ai/
├── apps/
│   └── web/                        # Next.js shell (auth, dashboard, module routing)
├── packages/
│   ├── core/                       # Auth logic, DB client, shared types, context registry, skills runner, merge-schemas script
│   ├── ui/                         # Shared component library (buttons, cards, layouts)
│   └── modules/
│       ├── _registry/              # Module manifest index - single place to register modules
│       ├── expenses/               # Shared expense tracking module
│       ├── plans/                  # Date/friend plan ideas with maps
│       └── shopping/               # Shared shopping lists
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Key principles:**
- `apps/web` is the only deployable artifact. It reads the module registry and renders modules inside a consistent shell - it never imports individual modules directly.
- `packages/core` owns the DB client, session management, context registry, and shared TypeScript types. Modules do not talk to the DB directly; they go through `core`.
- `packages/ui` holds shared visual components so all modules look consistent without duplicating code.
- Each module under `packages/modules/*` is self-contained: its own pages, API route handlers, DB schema fragment, and context provider.

---

## 2. Data Layer & Auth

### Database: PostgreSQL + Prisma

Prisma is the ORM. Rather than a single monolithic `schema.prisma` in `core`, each module package owns its own `.prisma` schema fragment. A `merge-schemas` script (registered in `turbo.json`) concatenates all fragments into a final `schema.prisma` at build time. This keeps modules truly self-contained - adding a module never requires touching `core`.

```
turbo.json pipeline:
  merge-schemas → prisma generate → build
```

### Core schema tables

| Table | Purpose |
|-------|---------|
| `users` | id, email, hashed_password, created_at |
| `sessions` | Server-side session store (cookie-based auth, no JWTs) |
| `module_registry` | Available modules: id, name, version |
| `user_modules` | Which modules a user has enabled |
| `share_links` | token, module_id, instance_id, permissions (JSON), expires_at |
| `guests` | Guest identity: id, name, persistent_token, linked share_link |
| `module_context_cache` | Serialized module summaries with TTL (backs the Context Registry) |

Each module's `.prisma` fragment adds its own domain tables (e.g. `expense_groups`, `expense_items` for the expenses module).

### Auth flow

Email + password via `bcrypt`. On login a server-side session is created and a `HttpOnly` cookie is set. Next.js middleware validates the session cookie on every request and redirects unauthenticated users. Guest access bypasses auth but is strictly scoped to the shared module instance the guest arrived via.

---

## 3. Module System

### Module Manifest

Every module exports a typed manifest that declares its identity, what context it exposes, what it consumes, what tier of interaction it supports, and the skills it offers to the user:

```ts
// packages/modules/expenses/manifest.ts
export const manifest = {
  id: 'expenses',
  name: 'Expenses',
  icon: 'receipt',
  exposesContext: true,
  consumesContext: ['plans'],
  interactionTier: 2,
  skills: [
    {
      id: 'summarize-spending',
      name: 'Summarize my spending',
      description: 'Get a breakdown of where money went this month',
      consumesContext: [],          // uses only own module data
    },
    {
      id: 'budget-plan',
      name: 'Suggest a budget-friendly plan',
      description: 'Uses your expenses + upcoming plans to suggest a budget',
      consumesContext: ['plans'],   // pulls Tier 1 summary from plans module
    },
  ],
} satisfies ModuleManifest
```

Modules are registered by adding their manifest to `packages/modules/_registry/index.ts`. The shell (`apps/web`) imports only this registry - never individual modules directly. Adding a new module = create the package + one line in the registry index.

### Inter-Module Context Tiers

| Tier | Name | Behavior |
|------|------|----------|
| 1 | **Summary** | Module exposes a typed read-only snapshot of its current state (e.g. `{ total_owed, top_categories }`). Other modules can read this. |
| 2 | **Suggestions** | Module reads another module's summary and generates ideas. Natural integration point for AI (Claude API). |
| 3 | **Interaction** | Module can invoke typed action handlers declared by another module (e.g. plans module adds a dinner to an expense group). |

### Context Registry

Lives in `packages/core`. Backed by the `module_context_cache` DB table (serialized JSON, refreshed on a configurable TTL - default 60s). This makes summaries available across multiple server instances without in-process state, enabling horizontal scaling on Render.

The registry enforces that the requesting user has both the source and consuming modules enabled before returning any context. Tier 3 interactions go through typed action handlers declared in each module's manifest.

A `suggestions` service in `core` can pull summaries from multiple modules and send them to Claude to generate cross-module insights when a Tier 2 relationship exists.

### Module Skills

Skills are user-triggered AI actions declared in a module's manifest. They are distinct from automatic Tier 2 suggestions - the user explicitly invokes a skill and gets a streamed response.

**Execution flow:**
1. User clicks a skill in the module UI (rendered from the manifest's `skills` array)
2. Shell calls `POST /api/skills/{moduleId}/{skillId}` with optional user input
3. The skill handler in `core` assembles context: module-specific data from DB + summaries from any `consumesContext` modules via the Context Registry
4. The assembled context is sent to Claude API; the response is streamed back to the UI

**Skill scopes:**
- **Module-scoped** - skill only uses data from its own module (`consumesContext: []`)
- **Cross-module** - skill declares `consumesContext` and receives Tier 1 summaries from those modules before calling Claude

**UI surface:** Each module page has a "Skills" panel (collapsible). Skills are listed by name with a short description. Selecting one opens an inline chat-like interface showing the streamed response and optionally accepting a free-text prompt from the user.

**Guest access to skills:** Guests can use skills scoped to the shared instance they have access to. Cross-module skills are not available to guests (they have no other modules enabled).

---

## 4. Sharing & Guest Access

### Share Links

A **module instance** is a specific shared entity within a module - e.g. one expense group ("Trip to Barcelona"), one shopping list ("Weekly groceries"), one plan ("Friday dinner ideas"). Each module instance has a unique id and belongs to one owner.

Each shareable module instance generates a unique link:

```
https://app.com/s/{token}
```

The token resolves via the `share_links` table. Links have an optional `expires_at` (null = never expires) and a `permissions` JSON column (reserved for per-link, per-action permission grants - not implemented in iteration 1, deferred).

### Guest Identity

Guests arriving via a share link are prompted for a name only. A persistent token is stored in `localStorage` on the guest's device. On arrival, the app checks for an existing `persistent_token` and reconciles it with the `guests` table - ensuring one person maps to one guest record even if they receive multiple share links over time.

Guest capabilities:
- View and interact with the specific shared module instance
- Be named as a participant (e.g. member of an expense group)

Guest restrictions:
- Cannot access any other module, user data, or dashboard
- Cannot create their own modules
- Cannot follow other share links under a different identity without clearing their token

**Deferred:** Upgrading a guest account to a full user account (guest claims their identity on registration). Tracked for iteration 2.

**Deferred:** Per-link granular permissions (e.g. read-only vs. edit vs. admin per module action). The `permissions` column is in place; the enforcement logic is deferred.

---

## 5. Web Shell & Navigation

### Routing

| Path | Handler |
|------|---------|
| `/login`, `/register` | Auth pages |
| `/dashboard` | Module cards with Tier 1 summary previews |
| `/m/{moduleId}/*` | Module pages rendered inside the full shell |
| `/s/{token}` | Shared instance - resolves token, renders module in minimal guest layout |
| `/settings` | Account details, enabled modules management |

### Shell Layout

- **Sidebar:** User avatar, list of enabled modules (icon + name), `+` button to enable new modules, settings link. Collapses to icon-only on mobile.
- **Module area:** Full-width content area. Each module owns its page tree under `/m/{moduleId}`.
- **Guest layout:** Minimal - module content only, no sidebar, no access to other modules.

### Module Registration in the Shell

`apps/web` imports `packages/modules/_registry` at startup. The registry provides: route definitions, sidebar entries, and context manifests. The shell renders whatever the registry declares - no module-specific code in the shell itself.

---

## 6. Tech Stack Summary

| Layer | Choice |
|-------|--------|
| Monorepo tooling | Turborepo + pnpm workspaces |
| Frontend | Next.js (App Router) |
| Backend | Next.js API routes (Node/TypeScript) |
| Database | PostgreSQL |
| ORM | Prisma (with per-module schema fragments, merged at build) |
| Auth | bcrypt + server-side sessions + HttpOnly cookies |
| AI | Claude API (Anthropic SDK) - module skills + cross-module suggestions |
| Deployment (local) | `pnpm dev` via Turborepo |
| Deployment (cloud) | Render (single web service + managed PostgreSQL) |

---

## 7. Out of Scope for Iteration 1

- Guest-to-user account upgrade
- Per-link granular share permissions (column is reserved, enforcement deferred)
- Automatic Tier 2 suggestions surfaced without user action (skills cover the user-triggered equivalent)
- Dynamic/runtime module loading
- Mobile app
- Email notifications
