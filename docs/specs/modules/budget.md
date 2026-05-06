# Module Spec — Monthly Budget

**Status:** Approved  
**Module ID:** `budget`  
**Pocket name:** Monthly Budget

---

## Purpose

A personal monthly expense tracker focused on tracking recurring costs (rent, credit cards, insurance, subscriptions) and one-off expenses. Primary goal is marking bills as paid each month and understanding spending trends over time. Secondary goal is planning — seeing your total committed spend before the month starts.

Designed with Argentine economy in mind: prices change frequently, rent can increase every 3 months, inflation is a first-class concern in the analytics layer.

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **BudgetMonth** | A calendar month anchor for one user. Holds the month/year and an optional compacted summary for history archiving. |
| **BudgetItem** | One expense row in a month. Can be a top-level item or a sub-item under a parent (e.g. charges inside a credit card bill). |
| **Recurring item** | An item marked `recurring: true`. Auto-copied when a new month is opened — name, category, and the previous month's amount are carried forward as a suggestion. The user can accept or update the amount before paying. |
| **Card group** | A top-level item (e.g. "Credit Card Visa") that acts as a collapsible parent. Sub-items (Netflix, Spotify) live under it via `parentId`. |
| **Installment** | An expense split across N monthly payments (cuotas). Carries forward automatically each month, incrementing the installment counter, until the final payment. Can live as a sub-item under a credit card or as a standalone top-level item. |
| **One-off** | An item added manually for a single month. Not carried forward. |

---

## DB Schema (fragment)

```prisma
model BudgetMonth {
  id               String       @id @default(cuid())
  userId           String
  year             Int
  month            Int          // 1–12
  compacted        Boolean      @default(false)
  compactedSummary Json?        // category totals + averages, raw data kept
  createdAt        DateTime     @default(now())
  user             User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  items            BudgetItem[]

  @@unique([userId, year, month])
  @@map("budget_months")
}

model BudgetItem {
  id             String       @id @default(cuid())
  monthId        String
  userId         String       // denormalized for fast ownership checks — always === month.userId
  parentId       String?      // null = top-level; set = sub-item under a card group
  name           String
  category       String?
  amount         Int?         // cents; null for new one-offs; pre-filled from previous month for recurring items
  amountCarried  Boolean      @default(false)  // true when amount was auto-copied from previous month, cleared once user edits it
  paid           Boolean      @default(false)  // only meaningful when parentId is null
  paidAt         DateTime?
  recurring        Boolean      @default(false)
  installmentTotal  Int?         // null = not an installment. Set to total number of payments (e.g. 12)
  installmentNumber Int?         // which payment this row represents (1-based, e.g. 3 = "3 of 12")
  installmentGroupId String?     // shared cuid linking all installment rows for the same purchase across months
  notes          String?
  linkedPocketId String?      // reserved for cross-pocket linking (v2)
  createdAt      DateTime     @default(now())
  month          BudgetMonth  @relation(fields: [monthId], references: [id], onDelete: Cascade)
  parent         BudgetItem?  @relation("SubItems", fields: [parentId], references: [id])
  children       BudgetItem[] @relation("SubItems")

  @@map("budget_items")
}
```

**Key constraints:**
- `paid` is only read/written on rows where `parentId IS NULL`. Sub-items inherit their parent's paid status in the UI — they have no paid toggle.
- `amount` is pre-filled from the previous month for recurring items (`amountCarried: true`). One-offs start as null. The user edits the amount if it changed; editing clears `amountCarried` to `false`.
- `amountCarried` drives a subtle UI indicator ("suggested from last month") on recurring rows where the user hasn't confirmed the amount yet. Useful for catching rent increases or variable bills.
- Installment items are implicitly recurring — `installmentTotal` being set means the item will carry forward. On each new month copy, `installmentNumber` is incremented. When `installmentNumber === installmentTotal`, the item is copied one final time and then never carried again (last payment).
- `installmentGroupId` is a cuid generated at creation time and shared across all monthly copies of the same purchase. Used to aggregate remaining payments and total committed spend in analytics.
- Display format for installments: `"Phone (3/12)"` — name + current/total in parentheses.
- `userId` is denormalized on `BudgetItem` so every ownership check is a single-field query — no join to `BudgetMonth` required.

---

## New Month Flow

When a user opens a month that has no `BudgetMonth` record yet:

1. Create the `BudgetMonth` row.
2. Find the most recent previous month that has items.
3. Copy all top-level items where `recurring = true` or `installmentTotal IS NOT NULL` (name, category, flags, and **previous month's amount**). Set `amountCarried: true` on each copied row.
4. For installment items: increment `installmentNumber` on the copy. If the source row's `installmentNumber === installmentTotal`, this is the final payment — copy it once more (the last payment) and do not set it up to carry again (set `installmentTotal: null` on the copy so it won't recur).
5. For each copied parent item that had children meeting the above criteria, copy those children too (linked to the new parent copy), also with `amountCarried: true` and installment counters incremented as above.
6. One-off items (`recurring = false` and no `installmentTotal`) are never carried forward.
7. When the user edits an amount on a carried row, `amountCarried` is set to `false` — the indicator clears and the new value is treated as confirmed.

---

## Views

### Monthly Table (main)

- **Month navigator** at top: `← Apr | May 2025 | Jun →`
- **Summary bar**: Paid total (green) · Pending total (orange) · Grand total
- **Table columns**: Expense · Category · Amount · Paid
- **Credit card rows** are collapsible (▾/▸). Sub-items show `—` in the Paid column.
- **Amount entry**: click the amount cell to type the value. Carried amounts (pre-filled from last month) show with a subtle `↩` indicator — clicking to edit clears the indicator. New one-off rows start empty and show `—` in muted italic.
- **Paid toggle**: checkbox per top-level row only.
- **`+ Add expense`** row at the bottom for one-offs.

### Analytics Tab

All analytics are computed from raw `BudgetItem` data across all months.

**Per-month view:**
- Spend by category — bar chart
- Paid vs pending breakdown

**Trend view:**
- Total monthly spend over time — line chart
- 3-month rolling average (current + prior 2 months)
- 6-month rolling average

**Inflation & savings insights:**
- Per recurring item: amount this month vs 3 months ago (absolute + %)
  - e.g. "Rent: $1,600 (+14% vs 3 months ago)"
- Per category: average spend this month vs 3-month and 6-month averages
  - e.g. "Finance: $950 this month · avg $880 last 3mo · avg $820 last 6mo"
- Savings callout: categories where this month is below the 3-month average
- Growth callout: categories where this month is more than 10% above the 6-month average

**Installment overview:**
- Active installment plans: name, amount/month, payments remaining, total remaining spend
  - e.g. "Phone — $100/mo · 9 of 12 remaining · $900 left"
- Total monthly installment load: sum of all active installment amounts this month
- Installments completing soon: plans with ≤ 2 payments remaining

**History compaction (deferred action, data kept):**
A future UI action can compute and store a yearly aggregate into `compactedSummary` JSON (per-category totals, monthly averages, inflation deltas) and set `compacted = true`. Raw `BudgetItem` rows are **not deleted** — data is always preserved. Compacted months show a "summarized" badge in the navigator but remain fully readable.

---

## Internal Tools (Claude Tool Definitions)

| Tool | Scope | Description |
|------|-------|-------------|
| `add_expense` | Pocket | Add a top-level item or a sub-item under a named card group. Optionally mark as recurring. |
| `add_installment` | Pocket | Add an installment purchase: name, amount per payment, total number of payments, optional card group. Creates the first month's row and sets up the carry-forward chain. |
| `set_amount` | Pocket | Set or update the amount on an existing item by name or id. |
| `mark_paid` | Pocket | Mark a top-level item as paid. Optionally set amount at the same time. |
| `add_month` | Pocket | Open a new month (creates the BudgetMonth and copies recurring items). |
| `get_summary` | Pocket | Return a plain-language breakdown of the current month: paid, pending, total, notable items. |
| `get_inflation_report` | Pocket | Describe how recurring costs have changed over the last 3 or 6 months, with per-item and per-category deltas. |

---

## Security

### In-scope protections (implemented at build time)

- **userId on every query** — all `BudgetMonth` and `BudgetItem` queries include `userId: session.user.id`. Direct ID lookups are never done without this filter.
- **Denormalized userId on BudgetItem** — avoids join-based ownership checks; simplifies and hardens every route.
- **Ownership helper** — a utility in `packages/core` verifies that a `monthId` or `itemId` belongs to the current user before any mutation. Returns 403 if not.
- **Server-only data access** — no client-side DB queries. All data flows through Next.js API routes / server actions.

### ⚠️ Scaling warning — DATABASE_URL exposure

The current security model assumes the PostgreSQL instance is not publicly reachable, or that credentials are never leaked. This is acceptable for a personal/private deployment but **must be hardened before any public launch**:

1. **IP allowlist (critical):** On Render (or any cloud provider), restrict PostgreSQL connections to your web service's outbound IPs only. A leaked `DATABASE_URL` is harmless if the attacker's IP is not on the allowlist.

2. **SSL required:** Add `?sslmode=require` to `DATABASE_URL` in production. Prevents credential sniffing in transit.

3. **Least-privilege DB user:** The app DB user should have `SELECT`, `INSERT`, `UPDATE`, `DELETE` only — no `DROP`, `ALTER`, `CREATE`, or access to `pg_catalog`. Create a dedicated role; do not use the superuser.

4. **Secret rotation plan:** If `DATABASE_URL` is ever leaked, rotate the password immediately in the cloud console and update the environment variable. Old credentials become useless.

5. **Row-level security (RLS) — for public scale:** PostgreSQL supports RLS policies that enforce ownership at the DB engine level, independent of application code. At public scale, enabling RLS on `budget_months` and `budget_items` adds a second enforcement layer even if application code has a bug. Not needed for private use; evaluate before public launch.

---

## Architecture

```
packages/modules/budget/
  prisma/
    schema.prisma          ← DB fragment, merged at build via merge-schemas
  manifest.ts              ← module registration (id, name, icon, tools, systemPrompt)
  src/
    actions.ts             ← server actions: CRUD for BudgetMonth + BudgetItem
    analytics.ts           ← aggregation: rolling averages, inflation deltas, category trends
    ownership.ts           ← assertOwnsMonth(userId, monthId), assertOwnsItem(userId, itemId)

apps/web/app/(app)/m/budget/
  page.tsx                 ← monthly table view (default: current month)
  analytics/
    page.tsx               ← analytics tab (or route segment)
```

The shell (`apps/web`) imports only `packages/modules/_registry`. The budget module is registered there with one line. No budget-specific code lives in the shell.

---

## Context Exposed (Tier 1 Summary)

```ts
type BudgetSummary = {
  currentMonth: { year: number; month: number }
  totalPaid: number          // cents
  totalPending: number       // cents
  topCategories: {
    category: string
    amount: number           // cents, current month
    avg3mo: number           // cents, 3-month rolling average
    change3moPct: number     // % change vs 3-month average
  }[]
  inflationAlerts: {
    name: string             // recurring item name
    changePct: number        // % change vs 3 months ago
  }[]
}
```

---

## Deferred to v2

- **Cross-pocket linking** — `linkedPocketId` on `BudgetItem` reserved. A flight expense linked to a trip pocket; a shared dinner linked to the shared expenses pocket.
- **Compact action UI** — button to compute and store `compactedSummary`. Raw data is always kept.
- **Multi-currency** — single currency per user in v1.
- **Budget targets** — set a monthly cap per category and track against it.
- **Receipt/photo attachment** on expense items.
- **Row-level security (RLS)** — enforce at DB level for public launch.
