# UX Design Spec

**Status:** Approved

---

## Naming Convention

The user-facing name for a module is **Pocket**. The underlying codebase uses `module` everywhere (routes, DB, registry). "Pocket" is a display-layer rename only.

| Code | UI |
|------|----|
| `module` | Pocket |
| `user_modules` | Your pockets |
| "add a module" | "add a pocket" |

---

## 1. Shell Structure

Three fixed regions:

```
+----------+------------------------------------+
|          |                                    |
| Sidebar  |   Content area                     |
|  (56px)  |   (dashboard or pocket view)       |
|          |                                    |
|          +------------------------------------+
|          |   Chat rail (collapsible)          |
+----------+------------------------------------+
```

**Sidebar** - always visible, collapses to icon-only on mobile:
- User avatar (top)
- Pocket icons - one per enabled pocket, active pocket highlighted
- "+" button (bottom) - triggers add-pocket flow via chat
- Settings icon + theme toggle (sun/moon icon)

**Content area** - full width/height minus sidebar. Renders the current page (dashboard or pocket view).

**Chat rail** - pinned to the bottom of the content area (not the full viewport). Collapsible via a small handle. Always present on every page. Context shifts automatically based on current page.

---

## 2. Chat System

### Context Awareness

One unified chat. Behavior shifts based on current page:

| Context | Chat behaviour |
|---------|---------------|
| Dashboard | Add/remove pockets, surface cross-pocket insights, answer questions across all data |
| Pocket view | Modify pocket data, run queries, answer pocket-specific questions |
| Guest view | Same UI, scoped to the shared instance only - restricted write actions |

### Input Modes

The chat input bar supports three entry points:

- **Text** - natural language ("add $50 dinner split with Ema")
- **Voice** - hold-to-record button; audio transcribed then processed as text
- **Image** - attach a photo (receipt, ticket, screenshot); Claude extracts structured data and shows a preview of what it will add before applying - user confirms or edits before the data is written

### Response Pattern

Commands that modify data apply immediately (live table/list update). The chat then responds with a brief contextual insight rather than a dry confirmation - e.g. *"Ema now owes you $25 total across 2 groups"*.

### Shortcuts

Short commands handled client-side before hitting the AI:

| Command | Action |
|---------|--------|
| `undo` | Reverses the last data-modifying action |

Shortcuts are surfaced progressively via tip cards. More can be added per pocket.

### Action Stack

Each data-modifying action is pushed to a per-session client-side stack. `undo` pops the last entry and calls a `DELETE /api/actions/last` endpoint (each module implements its own undo handler). Stack clears on page reload. Maximum depth: 20 actions.

---

## 3. Dashboard

### Layout

Responsive grid of pocket summary cards:
- 2 columns on desktop, 1 column on mobile
- Cards ordered by most recently used

### Pocket Summary Card

Each card shows:
- Pocket icon + name
- Tier 1 summary data (pocket-defined, e.g. net balance, pending items count)
- Subtle progress indicator or key stat where relevant
- "Open" link to `/m/{pocketId}`

### Empty State

First-time users see a welcome card. Chat rail prompts: *"What would you like to track? Try: add an expenses pocket"*. The "+" button in the sidebar triggers the same flow.

### Add Pocket Flow

Triggered by chat command or "+" button. Chat presents available pockets as a short inline list. Selecting one enables it, writes to `user_modules`, and adds its card to the dashboard immediately.

### Cross-Pocket Insight Strip

A single dismissible line above the card grid. Appears only when the user has 2+ pockets with combinable context. AI-generated, e.g.: *"You're net -$27 this month and have 2 plans coming up - want a budget-friendly suggestion?"*. Refreshed on dashboard load.

---

## 4. Pocket View

### Layout

```
+----------+------------------------------------+
|          |  Header (name, Share)             |
| Sidebar  +------------------------------------+
|          |  Pocket content (tables, views)   |
|          |                                   |
|          |  [Tip card - dismissible]         |
|          +------------------------------------+
|          |  Chat rail (pocket context)       |
+----------+------------------------------------+
```

### Pocket Header

- Pocket name (editable inline)
- Share button - generates share link for this pocket instance

### Content Area

Each pocket owns its own views (tables, lists, maps, etc.). Supports:
- **Manual inline editing** - click any cell/field to edit directly; all fields in tables and lists are editable in place
- **Chat-driven editing** - natural language commands update the same data ("add $50 dinner split with Ema", "rename Lucas to Luke")
- Both paths write to the same API - no divergence between chat and manual entry

### Tip Cards

- Appear contextually inside the content area (after first action, after specific gestures)
- Each tip is independently dismissible (stored in `localStorage`)
- Global "show tips" toggle in Settings hides all tips across all pockets
- Tips are pocket-defined - each pocket declares its own tip set in its manifest

---

## 5. Theme

Dark mode and light mode, toggled via the sidebar sun/moon icon.

- Implemented with Tailwind `dark:` classes + a `dark` class on `<html>`
- Preference stored in `localStorage` - persists across sessions
- System preference (`prefers-color-scheme`) used as the default on first visit
- No server-side involvement - purely client-side

---

## 5b. Language

Spanish (es) and English (en) supported. Spanish is the default.

- UI text, labels, chat responses, and error messages are translated
- Brand terms are never translated: **Pockets**, **LifeHelper**, pocket names the user creates (e.g. "Expenses")
- Locale preference stored in user profile (DB) for registered users; `localStorage` for guests
- No URL-based locale routing - locale is a user preference, not part of the path
- Chat responses: the user's locale is included in the Claude system prompt so AI replies match the selected language
- Translation files live in `apps/web/messages/{es,en}.json`, managed with `next-intl`

---

## 6. Guest View

Guests access a pocket via share link (`/s/{token}`). The shell is stripped down:

- No sidebar
- No dashboard
- Pocket content + chat rail only
- Chat scoped to the shared pocket instance - cannot reference other pockets
- Chat scoped to pocket-scoped tools only (no cross-pocket context assembled)
- No tips (guests see a clean experience)

---

## 7. Settings

Accessible via sidebar settings icon. Covers:

- Account details (email, password change)
- Pocket management (enable/disable pockets, reorder)
- **Tips** - global on/off toggle
- **Theme** - light/dark (mirrors sidebar toggle)
- **Language** - Spanish / English selector
- Notification preferences (deferred)
