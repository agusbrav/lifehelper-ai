# TODO

Pending features, fixes, and improvements tracked by scope.
Format: `- [ ] **Feature Name**: description` — check off when done, delete when shipped.

---

## Budget

### Bugs
- [ ] **Installment Duplication**: Installments imported from the current month appear duplicated in the next month — investigate carry-forward logic for installments created via PDF import

### Table / UX
- [x] **Dates per Expense**: Allow tagging an expense with a specific date within the month
- [ ] **Sticky Headers**: Sticky column headers and filter/sort tags in the expense table — keep visible while scrolling
- [ ] **Simplified View**: Mobile-first condensed row layout with a toggle to switch to the full view
- [x] **PDF Import Button Placement**: Move import button to the monthly view instead of the config panel

### Analytics
- [ ] **Analytics Per-Card**: Spending totals and charge history per credit card
- [ ] **Analytics Dynamic Layout**: User can toggle which panels to show

### Data Ingestion
- [ ] **Receipt Import**: Share a photo or PDF of a payment receipt, parse with AI, preview before committing
- [ ] **WhatsApp Ingestion**: Nanoclaw agent receives forwarded receipts/transfers via WhatsApp, calls lifehelper API to add expenses
  - Requires: `POST /api/budget/expenses` with token-based auth (API key per user)

### Links & Tags
- [ ] **Custom Tags**: Tags alongside categories — e.g. link a food expense to a specific trip
- [ ] **Links Type Restriction**: Restrict which expense types can be linked (one-time expenses likely don't need it)
- [ ] **Cross-Module Links**: Link budget expenses to other modules (trip planner, shared expenses)

### Platform
- [ ] **Dashboard Summary**: Each pocket shows a summary card on the main dashboard; chat rail has module-aware context
- [ ] **Code Audit**: Audit and clean up dead or duplicated code across the budget module

---

## Module Interconnection

- [ ] **Linking Layer**: Design the cross-module linking layer — expenses referencing trips, tags referencing any module entity
- [ ] **Cross-Module Filter**: Filter budget view by external reference (e.g. "show only expenses tagged to Trip X")

---

## Future Modules

- [ ] **Investments**: Investment table to manage and track capital, investment and liquid assets
- [ ] **Trip Planner**: Trip planner pocket
- [ ] **Shared Expenses**: Shared expenses pocket
- [ ] **Shopping List**: Shopping list for day-to-day
- [ ] **Date/Plans**: Date and plans ideas with groups or girlfriend
- [ ] **Nutrition**: Recipe + weight + nutrition app, informed by the latest science

---

## Backlog (low priority / not yet scoped)

- (ideas go here before they get a scope)
