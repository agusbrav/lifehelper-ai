# TODO

Pending features, fixes, and improvements tracked by scope.
Format: `- [ ] description` — check off when done, delete when shipped.

---

## Budget

- [x] **Bug**: Resetting a past month does not remove all entries — also creates a ghost month entry in the accessible month list

- [x] Card management settings page (`/m/budget/settings`) — separate `Card` model, add/remove cards outside the monthly table
- [ ] Dates per expense — allow tagging an expense with a specific date within the month
- [ ] Custom tags alongside categories — e.g. link a food expense to a specific trip and filter by it
- [ ] Link budget expenses to other modules (trip planner, shared expenses)
- [ ] Audit and clean up any dead or duplicated code across the budget module
- [x] Hook AI prompts in the chat box to interact with the expenses table (add, edit, query expenses via natural language)
- [ ] Accept image and PDF inputs in the chat box — analyze them (e.g. receipts, bank statements) and extract expenses
- [ ] Show a preview of extracted expenses before committing them to the table
- [ ] Dashboard pocket summary view + chat context — each pocket shows a summary card on the main dashboard; chat rail on dashboard has module-aware context and tools (open module, create/remove pocket with confirmation). Spec pending.
- [x] USD currency support: currency field per expense (ARS default, USD for native cards); per-card USD-native setting (e.g. Amex)
- [x] Summary bar shows ARS total and USD total as separate values (no conversion)
- [ ] Analytics: dynamic layout where user can toggle which panels to show — gastos ARS por categoría, gastos USD, suscripciones total, etc.
- [ ] Analytics: per-card breakdown — spending totals and charge history per credit card
- [ ] Links: restrict which expense types can be linked — e.g. one-time expenses may not need linking, similar to how one-time expenses skip the inflation button
- [x] Consider removing paid/pending tracking — simplify to expense ledger + past statistics only; keep `paid` field in schema but hide the UI
- [x] Deleting a recurring or installment expense should propagate the deletion to future months
- [x] Card expand/collapse state should persist across month navigation and when returning to the current month
- [x] Card row order in the budget table should match the order defined in the Tarjetas settings tab (including sub-item ordering within each card)

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
