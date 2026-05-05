# Module Spec - Expenses

> **Location note:** Temporary location. Move to `packages/modules/expenses/docs/spec.md` when package is scaffolded.

**Status:** Approved

---

## Purpose

Shared expense tracking across recurring or one-off friend groups. Users create expense groups, log expenses with flexible per-expense splits, and the module calculates who owes what. Groups are shareable via link; participants join as registered users or guests.

**UI Direction:** Clean, balance-first layout. The primary view surfaces who owes what and settlement suggestions upfront rather than burying them under a transaction list. Simple, fast expense entry is the priority.

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Group** | A named expense-sharing space (e.g. "March flat expenses", "Trip to Mendoza"). One user owns it; others join. This is the shareable module instance. |
| **Member** | A participant in a group - either a registered user or a named guest. Members are suggested from previous groups to reduce re-entry friction. |
| **Expense** | An amount paid by one member, split among a chosen subset of members with custom amounts. |
| **Gathering** | An optional named sub-event within a group (e.g. "Saturday BBQ") with a defined participant subset. Expenses can be tagged to a gathering. |
| **Balance** | The net amount owed between each pair of members, derived from all expenses in a group. |
| **Cross-group net** | A read-only view of the net balance between two registered users across all their shared groups. |

---

## Features - v1 Scope

### Groups
- [ ] Create, rename, and archive groups
- [ ] Groups have an optional `mode` field (`standard` | `pool`) - only `standard` active in v1; `pool` reserved for v2
- [ ] Time-window filter on expenses: this month, last month, custom range (does not reset balances - purely a view filter)

### Members
- [ ] Add members to a group by name
- [ ] When adding a member, suggest names from previous groups (registered users auto-linked by account; guests suggested by name - user confirms match)
- [ ] Members can join a group themselves via share link (guest or registered)
- [ ] Exclude a specific member from a gathering even if they belong to the main group

### Expenses
- [ ] Log an expense: description, amount (cents), date, payer, participant subset + split amounts
- [ ] Split is per-expense: any subset of group members, any breakdown that sums to the total
- [ ] Optional category tag (free text, e.g. "alcohol", "food", "transport") - used for filtering and future auto-exclusion rules
- [ ] Optional gathering tag - links the expense to a named sub-event
- [ ] Edit and delete expenses

### Gatherings
- [ ] Create a named gathering within a group with a defined participant subset
- [ ] Expenses tagged to a gathering inherit that subset as the default split (overridable per expense)

### Balances & Settlement
- [ ] Per-group balance view: who owes whom and how much, with simplified settlement suggestions (minimum transactions to clear all debts)
- [ ] Mark a balance as settled (records settlement, zeroes the balance between those two members)
- [ ] Cross-group net view: for registered users, shows net balance across all active (non-archived) groups - read-only, settlement still happens per-group

### Sharing
- [ ] Generate share link for a group (resolves to `/s/{token}`)
- [ ] Guests prompted for name on arrival; persistent guest token reconciled across links (one person = one guest record)
- [ ] Guests can: view group balances, log expenses, join gatherings
- [ ] Guests cannot: access other groups, see cross-group net, use cross-module skills

---

## DB Schema (fragment)

```prisma
model ExpenseGroup {
  id        String   @id @default(cuid())
  name      String
  ownerId   String
  mode      String   @default("standard") // "standard" | "pool" (pool deferred)
  createdAt DateTime @default(now())
  archivedAt DateTime?
  members   GroupMember[]
  expenses  Expense[]
  gatherings Gathering[]
}

model GroupMember {
  id        String  @id @default(cuid())
  groupId   String
  userId    String? // null if guest
  guestId   String? // null if registered user
  name      String  // display name
  group     ExpenseGroup  @relation(fields: [groupId], references: [id])
  paidExpenses    Expense[]     @relation("Payer")
  expenseSplits   ExpenseSplit[]
}

model Gathering {
  id        String  @id @default(cuid())
  groupId   String
  name      String
  memberIds String[] // GroupMember ids in this gathering
  group     ExpenseGroup @relation(fields: [groupId], references: [id])
  expenses  Expense[]
}

model Expense {
  id          String   @id @default(cuid())
  groupId     String
  gatheringId String?
  payerId     String   // GroupMember id
  amount      Int      // stored in cents
  description String
  category    String?  // free text tag
  date        DateTime
  group       ExpenseGroup  @relation(fields: [groupId], references: [id])
  gathering   Gathering?    @relation(fields: [gatheringId], references: [id])
  payer       GroupMember   @relation("Payer", fields: [payerId], references: [id])
  splits      ExpenseSplit[]
}

model ExpenseSplit {
  id        String  @id @default(cuid())
  expenseId String
  memberId  String  // GroupMember id
  amount    Int     // cents owed by this member for this expense
  expense   Expense     @relation(fields: [expenseId], references: [id])
  member    GroupMember @relation(fields: [memberId], references: [id])
}

model Settlement {
  id         String   @id @default(cuid())
  groupId    String
  fromId     String   // GroupMember id
  toId       String   // GroupMember id
  amount     Int      // cents settled
  settledAt  DateTime @default(now())
}
```

---

## Context Exposed - Tier 1 Summary

```ts
type ExpensesSummary = {
  totalGroups: number
  activeGroups: {
    id: string
    name: string
    myBalance: number        // cents, negative = I owe, positive = I'm owed
    memberCount: number
  }[]
  totalOwedToMe: number      // cents, across all groups
  totalIOwe: number          // cents, across all groups
}
```

---

## Skills

| Skill | Scope | Description |
|-------|-------|-------------|
| `who-owes-what` | Module-only | Plain-language settlement summary for a group: who pays whom and how much to clear all debts |
| `spending-summary` | Module-only | Breakdown of group or personal expenses by category and time period |
| `cross-group-net` | Module-only | Explains net balances across all groups between you and each person |
| `budget-friendly-plan` | Cross-module (`plans`) | Given current balances, suggests a plan option that fits the group's budget situation |

---

## Deferred to v2

- **Pool mode** - members commit a fixed recurring contribution; expenses drawn from the pool. `mode` field already reserved on `ExpenseGroup`.
- **Auto-exclusion rules** - define once that a member never splits a given category (e.g. alcohol); applied automatically on new expenses. Per-expense manual selection covers this in v1.
- **Multi-currency** - single currency per group in v1.
- **Receipt photo upload**
- **Guest-to-user account upgrade** - guest claims their history when they register.

