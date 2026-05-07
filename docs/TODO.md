# TODO

Pending features, fixes, and improvements tracked by scope.
Format: `- [ ] description` — check off when done, delete when shipped.

---

## Budget

- [x] Card management settings page (`/m/budget/settings`) — separate `Card` model, add/remove cards outside the monthly table
- [ ] Dates per expense — allow tagging an expense with a specific date within the month
- [ ] Custom tags alongside categories — e.g. link a food expense to a specific trip and filter by it
- [ ] Link budget expenses to other modules (trip planner, shared expenses)
- [ ] Audit and clean up any dead or duplicated code across the budget module
- [ ] Hook AI prompts in the chat box to interact with the expenses table (add, edit, query expenses via natural language)
- [ ] Accept image and PDF inputs in the chat box — analyze them (e.g. receipts, bank statements) and extract expenses
- [ ] Show a preview of extracted expenses before committing them to the table
- [ ] USD currency support: currency field per expense (ARS default, USD for native cards); per-card USD-native setting (e.g. Amex)
- [ ] Summary bar shows ARS total and USD total as separate values (no conversion)
- [ ] Analytics: dynamic layout where user can toggle which panels to show — gastos ARS por categoría, gastos USD, suscripciones total, etc.

---

## Module Interconnection

- [ ] Design the cross-module linking layer — expenses referencing trips, tags referencing any module entity
- [ ] Filter budget view by external reference (e.g. "show only expenses tagged to Trip X")

---

## Infrastructure

- [ ] (nothing pending)

---

## Future Modules

- [ ] Trip planner pocket
- [ ] Shared expenses pocket
- [ ] Date/plans ideas with groups or girlfriend
- [ ] Shopping list for day-to-day
- [ ] Investment table to manage and track capital, investment and liquid assets
- [ ] Recipe + weight + nutrition app, informed by the latest science

---

## Backlog (low priority / not yet scoped)

- (ideas go here before they get a scope)
