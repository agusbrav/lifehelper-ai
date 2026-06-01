# Budget Module TODO

Pending features, fixes, and improvements for the budget module.
Format: `- [ ] **Feature Name**: description` — check off when done, delete when shipped.

---

## Bugs

- [x] **Installment Duplication**: Fixed. Re-import minted new installmentGroupIds and only cleared the current month, so forward copies duplicated. Now purged before recreating (`purgeForwardInstallments`). Existing duplicate rows also cleaned from the DB.
- [ ] **Installment Under-Propagation**: Card-child installments do not carry into months created AFTER their import. `getOrCreateMonth` -> `computeCarryItems` skips card children, so only `propagateToNextMonth` pushes them, and only into months that already exist at import time. Later-opened months miss the installment.

---

## Table / UX

- [x] **Dates per Expense**: Allow tagging an expense with a specific date within the month
- [ ] **Sticky Headers**: Sticky column headers and filter/sort tags in the expense table — keep visible while scrolling
- [ ] **Simplified View**: Mobile-first condensed row layout with a toggle to switch to the full view
- [x] **PDF Import Button Placement**: Move import button to the monthly view instead of the config panel

---

## Analytics

- [ ] **Analytics Per-Card**: Spending totals and charge history per credit card
- [ ] **Analytics Dynamic Layout**: User can toggle which panels to show

---

## Data Ingestion

- [ ] **Receipt Import**: Share a photo or PDF of a payment receipt, parse with AI, preview before committing
- [ ] **WhatsApp Ingestion**: Nanoclaw agent receives forwarded receipts/transfers via WhatsApp, calls lifehelper API to add expenses
  - Requires: `POST /api/budget/expenses` with token-based auth (API key per user)

---

## Links & Tags

- [ ] **Custom Tags**: Tags alongside categories — e.g. link a food expense to a specific trip
- [ ] **Links Type Restriction**: Restrict which expense types can be linked (one-time expenses likely don't need it)
- [ ] **Cross-Module Links**: Link budget expenses to other modules (trip planner, shared expenses)

---

## Platform

- [ ] **Dashboard Summary**: Budget shows a summary card on the main dashboard; chat rail has budget-aware context
- [ ] **Code Audit**: Audit and clean up dead or duplicated code across the budget module
