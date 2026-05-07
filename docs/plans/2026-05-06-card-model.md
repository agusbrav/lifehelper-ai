# Card Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace card-as-BudgetItem carry-forward with a first-class `Card` model owned at the user level, managed via a dedicated settings page.

**Architecture:** A new `Card` table holds the user's credit cards as permanent profile data. `getOrCreateMonth` syncs `Card` records into each month on every access (idempotent upsert), replacing the previous approach of copying card items through carry-forward. Carry-forward is updated to skip `isCard = true` items entirely. A settings page at `/m/budget/settings` provides the only UI for adding and removing cards.

**Tech Stack:** Prisma 6, Next.js 16 App Router, Vitest, pnpm monorepo, TypeScript 6.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `packages/modules/budget/prisma/schema.prisma` |
| Modify (auto) | `packages/core/prisma/schema.prisma` |
| Create | `packages/modules/budget/src/card-actions.ts` |
| Create | `packages/modules/budget/src/__tests__/card-actions.test.ts` |
| Modify | `packages/modules/budget/src/month-logic.ts` |
| Modify | `packages/modules/budget/src/__tests__/month-logic.test.ts` |
| Modify | `packages/modules/budget/src/actions.ts` |
| Modify | `packages/modules/budget/src/__tests__/actions.test.ts` |
| Modify | `packages/modules/budget/src/index.ts` |
| Create | `scripts/migrate-cards.ts` |
| Create | `apps/web/app/(app)/m/budget/settings/page.tsx` |
| Create | `apps/web/app/(app)/m/budget/settings/actions.ts` |
| Modify | `apps/web/app/(app)/m/budget/page.tsx` |
| Modify | `docs/TODO.md` |

---

## Task 1: Add `Card` model to schema

**Files:**
- Modify: `packages/modules/budget/prisma/schema.prisma`

- [ ] **Step 1: Add model to budget schema fragment**

Append to the end of `packages/modules/budget/prisma/schema.prisma`:

```prisma
model Card {
  id        String   @id @default(cuid())
  userId    String
  name      String
  category  String?
  createdAt DateTime @default(now())

  @@unique([userId, name])
  @@index([userId])
  @@map("cards")
}
```

- [ ] **Step 2: Merge and migrate**

```bash
pnpm merge-schemas
pnpm db:migrate
# When prompted for migration name: add_card_model
```

Expected: migration succeeds, `cards` table created.

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm db:generate
```

Verify `db.card` is now available: open `packages/core/prisma/schema.prisma` and confirm the `Card` model block is present.

- [ ] **Step 4: Commit**

```bash
git add packages/modules/budget/prisma/schema.prisma packages/core/prisma/schema.prisma
git add packages/core/prisma/migrations/
git commit -m "schema: add Card model for user-level card management"
```

---

## Task 2: Card actions (pure logic layer)

**Files:**
- Create: `packages/modules/budget/src/card-actions.ts`
- Create: `packages/modules/budget/src/__tests__/card-actions.test.ts`
- Modify: `packages/modules/budget/src/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/modules/budget/src/__tests__/card-actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@lifehelper/core', () => ({
  db: {
    card: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { getCardsForUser, addCard, removeCard } from '../card-actions'
import { db } from '@lifehelper/core'

const mockDb = db as unknown as {
  card: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => vi.clearAllMocks())

describe('getCardsForUser', () => {
  it('returns cards ordered by createdAt', async () => {
    const cards = [
      { id: 'c1', userId: 'u1', name: 'Visa', category: 'tarjeta', createdAt: new Date() },
    ]
    mockDb.card.findMany.mockResolvedValue(cards)
    const result = await getCardsForUser('u1')
    expect(result).toEqual(cards)
    expect(mockDb.card.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'asc' },
    })
  })
})

describe('addCard', () => {
  it('creates a card with the given name and category', async () => {
    const card = { id: 'c1', userId: 'u1', name: 'Visa', category: 'tarjeta', createdAt: new Date() }
    mockDb.card.create.mockResolvedValue(card)
    const result = await addCard({ userId: 'u1', name: 'Visa', category: 'tarjeta' })
    expect(result).toEqual(card)
    expect(mockDb.card.create).toHaveBeenCalledWith({
      data: { userId: 'u1', name: 'Visa', category: 'tarjeta' },
    })
  })

  it('creates a card with null category when omitted', async () => {
    const card = { id: 'c1', userId: 'u1', name: 'Visa', category: null, createdAt: new Date() }
    mockDb.card.create.mockResolvedValue(card)
    await addCard({ userId: 'u1', name: 'Visa' })
    expect(mockDb.card.create).toHaveBeenCalledWith({
      data: { userId: 'u1', name: 'Visa', category: null },
    })
  })
})

describe('removeCard', () => {
  it('deletes the card by id after verifying ownership', async () => {
    mockDb.card.findUnique.mockResolvedValue({ id: 'c1', userId: 'u1', name: 'Visa', category: null, createdAt: new Date() })
    mockDb.card.delete.mockResolvedValue({})
    await removeCard({ userId: 'u1', cardId: 'c1' })
    expect(mockDb.card.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })

  it('throws if the card does not belong to the user', async () => {
    mockDb.card.findUnique.mockResolvedValue({ id: 'c1', userId: 'other', name: 'Visa', category: null, createdAt: new Date() })
    await expect(removeCard({ userId: 'u1', cardId: 'c1' })).rejects.toThrow('Forbidden')
  })

  it('throws if the card does not exist', async () => {
    mockDb.card.findUnique.mockResolvedValue(null)
    await expect(removeCard({ userId: 'u1', cardId: 'c1' })).rejects.toThrow('Forbidden')
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
(cd packages/modules/budget && pnpm test --reporter=verbose 2>&1 | grep -A3 "card-actions")
```

Expected: `card-actions.test.ts` fails with "Cannot find module '../card-actions'".

- [ ] **Step 3: Implement card-actions.ts**

Create `packages/modules/budget/src/card-actions.ts`:

```typescript
import { db } from '@lifehelper/core'

export type CardRecord = {
  id: string
  userId: string
  name: string
  category: string | null
  createdAt: Date
}

export async function getCardsForUser(userId: string): Promise<CardRecord[]> {
  return db.card.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function addCard(input: { userId: string; name: string; category?: string }): Promise<CardRecord> {
  return db.card.create({
    data: {
      userId: input.userId,
      name: input.name,
      category: input.category ?? null,
    },
  })
}

export async function removeCard(input: { userId: string; cardId: string }): Promise<void> {
  const card = await db.card.findUnique({ where: { id: input.cardId } })
  if (!card || card.userId !== input.userId) throw new Error('Forbidden')
  await db.card.delete({ where: { id: input.cardId } })
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
(cd packages/modules/budget && pnpm test --reporter=verbose 2>&1 | grep -E "card-actions|PASS|FAIL")
```

Expected: all 5 card-actions tests pass.

- [ ] **Step 5: Export from index.ts**

Add to `packages/modules/budget/src/index.ts`:

```typescript
export * from './card-actions'
```

- [ ] **Step 6: Commit**

```bash
git add packages/modules/budget/src/card-actions.ts \
        packages/modules/budget/src/__tests__/card-actions.test.ts \
        packages/modules/budget/src/index.ts
git commit -m "budget: add Card actions - getCardsForUser, addCard, removeCard"
```

---

## Task 3: Exclude cards from carry-forward; sync from Card table

**Files:**
- Modify: `packages/modules/budget/src/month-logic.ts`
- Modify: `packages/modules/budget/src/__tests__/month-logic.test.ts`
- Modify: `packages/modules/budget/src/actions.ts`
- Modify: `packages/modules/budget/src/__tests__/actions.test.ts`

### 3a — month-logic.ts

- [ ] **Step 1: Write failing test for card exclusion**

Add to `packages/modules/budget/src/__tests__/month-logic.test.ts` (append inside the `describe` block):

```typescript
  it('does not carry an isCard item (cards come from Card table)', () => {
    const card: SourceItem = {
      name: 'Visa',
      category: 'tarjeta',
      amount: null,
      recurring: true,
      itemType: 'recurring',
      isCard: true,
      installmentTotal: null,
      installmentNumber: null,
      installmentGroupId: null,
      children: [],
    }
    const result = computeCarryItems([card])
    expect(result).toHaveLength(0)
  })
```

Also fix the existing `base` fixture — it's missing `isCard` which the type requires. Update:

```typescript
const base: SourceItem = {
  name: 'Rent',
  category: 'Housing',
  amount: 120000,
  recurring: true,
  itemType: 'recurring',
  isCard: false,          // add this
  installmentTotal: null,
  installmentNumber: null,
  installmentGroupId: null,
  children: [],
}
```

- [ ] **Step 2: Run tests — expect new test to fail**

```bash
(cd packages/modules/budget && pnpm test --reporter=verbose 2>&1 | grep -E "month-logic|does not carry an isCard")
```

Expected: "does not carry an isCard item" FAILS.

- [ ] **Step 3: Update shouldCarry to exclude cards**

In `packages/modules/budget/src/month-logic.ts`, update `shouldCarry`:

```typescript
function shouldCarry(item: SourceItem, gap: number): boolean {
  if (item.isCard) return false
  if (item.recurring) return true
  if (item.installmentTotal !== null && item.installmentNumber !== null) {
    if (gap === 1) return true
    return item.installmentNumber + gap <= item.installmentTotal
  }
  return false
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
(cd packages/modules/budget && pnpm test --reporter=verbose 2>&1 | grep -E "month-logic|PASS|FAIL")
```

Expected: all month-logic tests pass.

### 3b — actions.ts (sync cards on month access)

- [ ] **Step 5: Write failing test for card sync**

Add to `packages/modules/budget/src/__tests__/actions.test.ts`. First update the `vi.mock('@lifehelper/core')` block to include `card`:

```typescript
vi.mock('@lifehelper/core', () => ({
  db: {
    budgetMonth: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    budgetItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    card: {
      findMany: vi.fn(),
    },
  },
}))
```

Then add a test (place it in the `getOrCreateMonth` describe block or add one):

```typescript
describe('getOrCreateMonth — card sync', () => {
  it('creates a BudgetItem for each Card not yet in the month', async () => {
    const month = { id: 'm1', userId: 'u1', year: 2025, month: 5, compacted: false, compactedSummary: null, createdAt: new Date(), items: [] }
    mockDb.budgetMonth.findUnique
      .mockResolvedValueOnce({ ...month, items: [] })   // existing month found
      .mockResolvedValueOnce({ ...month, items: [] })   // re-fetch at end
    mockDb.card.findMany.mockResolvedValue([
      { id: 'card1', userId: 'u1', name: 'Visa', category: 'tarjeta', createdAt: new Date() },
    ])
    mockDb.budgetItem.findFirst.mockResolvedValue(null)  // card not yet in month
    mockDb.budgetItem.create.mockResolvedValue({})

    await getOrCreateMonth('u1', 2025, 5)

    expect(mockDb.budgetItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Visa', isCard: true, recurring: true }) })
    )
  })

  it('does not duplicate a Card already present in the month', async () => {
    const month = { id: 'm1', userId: 'u1', year: 2025, month: 5, compacted: false, compactedSummary: null, createdAt: new Date(), items: [] }
    mockDb.budgetMonth.findUnique
      .mockResolvedValueOnce({ ...month, items: [] })
      .mockResolvedValueOnce({ ...month, items: [] })
    mockDb.card.findMany.mockResolvedValue([
      { id: 'card1', userId: 'u1', name: 'Visa', category: 'tarjeta', createdAt: new Date() },
    ])
    mockDb.budgetItem.findFirst.mockResolvedValue({ id: 'item1' })  // already exists

    await getOrCreateMonth('u1', 2025, 5)

    expect(mockDb.budgetItem.create).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run tests — expect new tests to fail**

```bash
(cd packages/modules/budget && pnpm test --reporter=verbose 2>&1 | grep -E "card sync|PASS|FAIL")
```

- [ ] **Step 7: Add syncCardsToMonth helper and wire into getOrCreateMonth**

In `packages/modules/budget/src/actions.ts`, add this helper before `getOrCreateMonth`:

```typescript
async function syncCardsToMonth(userId: string, monthId: string): Promise<void> {
  const cards = await db.card.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  for (const card of cards) {
    const exists = await db.budgetItem.findFirst({
      where: { monthId, userId, isCard: true, name: card.name },
    })
    if (exists) continue
    await db.budgetItem.create({
      data: {
        monthId,
        userId,
        name: card.name,
        category: card.category,
        amount: null,
        recurring: true,
        itemType: 'recurring',
        isCard: true,
      },
    })
  }
}
```

Then in `getOrCreateMonth`, update the block that handles an existing month:

```typescript
  if (existing) {
    await syncCardsToMonth(userId, existing.id)
    return db.budgetMonth.findUnique({
      where: { userId_year_month: { userId, year, month } },
      include: {
        items: {
          where: { parentId: null },
          include: { children: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    })
  }
```

And at the end of `getOrCreateMonth` (before the final `return`), add a card sync for newly created months:

```typescript
  await syncCardsToMonth(userId, newMonth.id)

  return db.budgetMonth.findUnique({
    where: { id: newMonth.id },
    ...
  })
```

The full updated `getOrCreateMonth` opening block:

```typescript
export async function getOrCreateMonth(userId: string, year: number, month: number) {
  const existing = await db.budgetMonth.findUnique({
    where: { userId_year_month: { userId, year, month } },
    include: {
      items: {
        where: { parentId: null },
        include: { children: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
  })
  if (existing) {
    await syncCardsToMonth(userId, existing.id)
    return db.budgetMonth.findUnique({
      where: { userId_year_month: { userId, year, month } },
      include: {
        items: {
          where: { parentId: null },
          include: { children: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
      },
    })
  }
  // ... rest unchanged until just before the final return:
  await syncCardsToMonth(userId, newMonth.id)
  return db.budgetMonth.findUnique({ ... })
}
```

- [ ] **Step 8: Run all budget tests — expect all pass**

```bash
(cd packages/modules/budget && pnpm test --reporter=verbose 2>&1 | tail -20)
```

- [ ] **Step 9: Type-check**

```bash
(cd apps/web && npx tsc --noEmit 2>&1)
```

Expected: no output (clean).

- [ ] **Step 10: Commit**

```bash
git add packages/modules/budget/src/month-logic.ts \
        packages/modules/budget/src/actions.ts \
        packages/modules/budget/src/__tests__/month-logic.test.ts \
        packages/modules/budget/src/__tests__/actions.test.ts
git commit -m "budget: carry-forward excludes cards; sync cards from Card table on month open"
```

---

## Task 4: Data migration — populate Card table from existing BudgetItems

**Files:**
- Create: `scripts/migrate-cards.ts`

This is a one-time script. It reads all distinct `isCard = true` BudgetItem names per user and creates the corresponding `Card` records (skipping duplicates via upsert).

- [ ] **Step 1: Create migration script**

Create `scripts/migrate-cards.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const cardItems = await db.budgetItem.findMany({
    where: { isCard: true, parentId: null },
    select: { userId: true, name: true, category: true },
    distinct: ['userId', 'name'],
  })

  console.log(`Found ${cardItems.length} unique card(s) to migrate.`)

  for (const item of cardItems) {
    await db.card.upsert({
      where: { userId_name: { userId: item.userId, name: item.name } },
      update: {},
      create: { userId: item.userId, name: item.name, category: item.category },
    })
    console.log(`  Migrated: ${item.name} (user ${item.userId})`)
  }

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
```

- [ ] **Step 2: Run the migration**

```bash
npx tsx scripts/migrate-cards.ts
```

Expected output lists each card found and "Done." with no errors.

- [ ] **Step 3: Verify in Prisma Studio**

```bash
pnpm db:studio
```

Open the `cards` table and confirm the records match the existing credit card names.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-cards.ts
git commit -m "script: migrate existing isCard BudgetItems to Card table"
```

---

## Task 5: Settings page

**Files:**
- Create: `apps/web/app/(app)/m/budget/settings/actions.ts`
- Create: `apps/web/app/(app)/m/budget/settings/page.tsx`

- [ ] **Step 1: Create server actions**

Create `apps/web/app/(app)/m/budget/settings/actions.ts`:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getSession } from '@lifehelper/core'
import { addCard, removeCard } from '@lifehelper/budget'

async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) throw new Error('Unauthorized')
  return session.user.id
}

export async function addCardAction(formData: FormData) {
  const userId = await getUserId()
  const name = (formData.get('name') as string).trim()
  const category = (formData.get('category') as string)?.trim() || undefined
  await addCard({ userId, name, category })
  revalidatePath('/m/budget/settings')
  revalidatePath('/m/budget')
}

export async function removeCardAction(cardId: string) {
  const userId = await getUserId()
  await removeCard({ userId, cardId })
  revalidatePath('/m/budget/settings')
  revalidatePath('/m/budget')
}
```

- [ ] **Step 2: Create settings page**

Create `apps/web/app/(app)/m/budget/settings/page.tsx`:

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@lifehelper/core'
import { getCardsForUser } from '@lifehelper/budget'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { addCardAction, removeCardAction } from './actions'

export default async function BudgetSettingsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const session = token ? await getSession(token) : null
  if (!session) redirect('/login')

  const [cards, t] = await Promise.all([
    getCardsForUser(session.user.id),
    getTranslations('budget'),
  ])

  const inputCls = 'rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-[var(--fg)] px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[var(--accent)] min-w-0'

  return (
    <div className="p-4 sm:p-6 w-full max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/m/budget" className="text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors">
          ← {t('backToBudget')}
        </Link>
      </div>

      <h1 className="text-lg font-semibold text-[var(--fg)] mb-1">{t('settingsTitle')}</h1>
      <p className="text-sm text-[var(--muted-fg)] mb-6">{t('settingsCardHint')}</p>

      {/* Card list */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden mb-6">
        {cards.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-fg)]">{t('noCards')}</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <tbody>
              {cards.map(card => (
                <tr key={card.id} className="border-t border-[var(--border)] first:border-t-0 group">
                  <td className="py-3 pl-4 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                      <span className="font-medium text-[var(--fg)]">{card.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[var(--muted-fg)] capitalize text-sm">
                    {card.category ?? ''}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <form action={removeCardAction.bind(null, card.id)}>
                      <button
                        type="submit"
                        onClick={e => {
                          if (!window.confirm(`${t('removeCardConfirm', { name: card.name })}`)) e.preventDefault()
                        }}
                        className="text-xs text-[var(--muted-fg)] hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {t('delete')}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add card form */}
      <h2 className="text-sm font-medium text-[var(--muted-fg)] uppercase tracking-wide mb-3">{t('addCard')}</h2>
      <form action={addCardAction} className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          placeholder={t('cardName')}
          className={`${inputCls} flex-[2_1_10rem]`}
        />
        <input
          name="category"
          placeholder={t('category')}
          className={`${inputCls} flex-[1_1_7rem]`}
        />
        <button
          type="submit"
          className="bg-[var(--accent)] text-[var(--accent-fg)] rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
        >
          {t('add')}
        </button>
      </form>
      <p className="mt-3 text-xs text-[var(--muted-fg)]">{t('settingsRemoveHint')}</p>
    </div>
  )
}
```

- [ ] **Step 3: Add translation keys**

Add to `apps/web/messages/en.json` inside the `"budget"` object:

```json
"backToBudget": "Budget",
"settingsTitle": "Cards",
"settingsCardHint": "Cards appear in every month and carry forward automatically.",
"settingsRemoveHint": "Removing a card stops it from appearing in new months. Existing month data is preserved.",
"noCards": "No cards configured.",
"addCard": "Add card",
"cardName": "Card name",
"removeCardConfirm": "Remove \"{name}\"? It will stop appearing in new months."
```

Add the same keys to `apps/web/messages/es.json`:

```json
"backToBudget": "Presupuesto",
"settingsTitle": "Tarjetas",
"settingsCardHint": "Las tarjetas aparecen en todos los meses y se propagan automáticamente.",
"settingsRemoveHint": "Eliminar una tarjeta evita que aparezca en nuevos meses. El historial existente no se modifica.",
"noCards": "No hay tarjetas configuradas.",
"addCard": "Agregar tarjeta",
"cardName": "Nombre de la tarjeta",
"removeCardConfirm": "¿Eliminar \"{name}\"? Dejará de aparecer en nuevos meses."
```

- [ ] **Step 4: Type-check**

```bash
(cd apps/web && npx tsc --noEmit 2>&1)
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(app\)/m/budget/settings/ \
        apps/web/messages/en.json \
        apps/web/messages/es.json
git commit -m "budget: settings page for card management"
```

---

## Task 6: Navigation link from budget page

**Files:**
- Modify: `apps/web/app/(app)/m/budget/page.tsx`
- Modify: `docs/TODO.md`

- [ ] **Step 1: Add settings link to budget page header**

In `apps/web/app/(app)/m/budget/page.tsx`, update the header actions block to add a settings link. Locate the line with `<Link href="/m/budget/analytics"` and add a settings link next to it:

```typescript
<Link
  href="/m/budget/settings"
  className="text-sm text-[var(--muted-fg)] hover:text-[var(--fg)] transition-colors whitespace-nowrap"
>
  {t('settingsLink')}
</Link>
```

Add the translation key to `en.json`: `"settingsLink": "Cards"` and `es.json`: `"settingsLink": "Tarjetas"`.

- [ ] **Step 2: Verify in browser**

```bash
pnpm dev
```

1. Open `http://localhost:3000/m/budget`.
2. Click "Tarjetas" / "Cards" link — should navigate to `/m/budget/settings`.
3. Existing cards should appear in the list.
4. Add a new card — verify it appears in the table when navigating back to budget.
5. Remove a card — confirm it stops appearing in new months (navigate to next month to verify).

- [ ] **Step 3: Mark TODO.md done**

In `docs/TODO.md`, check off:

```markdown
- [x] Card management settings page (`/m/budget/settings`) — separate `Card` model, add/remove cards outside the monthly table
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(app\)/m/budget/page.tsx \
        apps/web/messages/en.json \
        apps/web/messages/es.json \
        docs/TODO.md
git commit -m "budget: add Cards nav link to budget header"
```

---

## Self-Review

**Spec coverage:**
- Card model with unique constraint per user ✓ (Task 1)
- `getCardsForUser`, `addCard`, `removeCard` ✓ (Task 2)
- Carry-forward excludes `isCard = true` ✓ (Task 3a)
- Month open syncs cards from `Card` table idempotently ✓ (Task 3b)
- Data migration for existing card items ✓ (Task 4)
- Settings page: list, add, remove ✓ (Task 5)
- Navigation from budget page ✓ (Task 6)
- Translation keys in both locales ✓ (Tasks 5, 6)

**Placeholder scan:** None found.

**Type consistency:**
- `CardRecord` defined in `card-actions.ts`, used in settings page via `getCardsForUser` return type ✓
- `syncCardsToMonth` is internal to `actions.ts`, not exported ✓
- `removeCardAction.bind(null, card.id)` — `card.id` is `string`, matches `removeCard({ cardId: string })` ✓
