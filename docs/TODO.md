# TODO

Pending features, fixes, and improvements tracked by scope.
Format: `- [ ] description` — check off when done, delete when shipped.

---

## Budget

- [x] **Bug**: Resetting a past month does not remove all entries — also creates a ghost month entry in the accessible month list

- [x] Card management settings page (`/m/budget/settings`) — separate `Card` model, add/remove cards outside the monthly table
- [x] Change expense type inline — click the type badge to cycle one-time → subscription → recurring; propagates correctly (becoming recurring: propagate forward; becoming one-time: remove from future months; subscription↔recurring: update future months)
- [x] Change category inline from the expense table — click the category cell to edit; datalist of known categories; "Sin categoría" shown when empty
- [ ] Smoother hover effect on expense table rows — current transition feels abrupt
- [ ] Dates per expense — allow tagging an expense with a specific date within the month
- [ ] Custom tags alongside categories — e.g. link a food expense to a specific trip and filter by it
- [ ] Link budget expenses to other modules (trip planner, shared expenses)
- [ ] Audit and clean up any dead or duplicated code across the budget module
- [x] Hook AI prompts in the chat box to interact with the expenses table (add, edit, query expenses via natural language)
- [ ] Receipt / ticket import — share a photo or PDF of a payment receipt, parse it with AI, and load the extracted expense(s) into the table with a preview step before confirming
- [ ] Show a preview of extracted expenses before committing them to the table
- [ ] Dashboard pocket summary view + chat context — each pocket shows a summary card on the main dashboard; chat rail on dashboard has module-aware context and tools (open module, create/remove pocket with confirmation). Spec pending.
- [x] USD currency support: currency field per expense (ARS default, USD for native cards); per-card USD-native setting (e.g. Amex)
- [x] Summary bar shows ARS total and USD total as separate values (no conversion)
- [ ] Sticky column headers and filter/sort tags in the expense table — keep them visible while scrolling down the list
- [ ] Analytics: dynamic layout where user can toggle which panels to show — gastos ARS por categoría, gastos USD, suscripciones total, etc.
- [ ] Analytics: per-card breakdown — spending totals and charge history per credit card
- [x] Categories: Category suggestion sometimes shows duplicated text. 
- [x] Categories: Filter badges above the expense table don't include newly created categories — only seed categories appear until a hard refresh
- [ ] Links: restrict which expense types can be linked — e.g. one-time expenses may not need linking, similar to how one-time expenses skip the inflation button
- [x] Consider removing paid/pending tracking — simplify to expense ledger + past statistics only; keep `paid` field in schema but hide the UI
- [x] Deleting a recurring or installment expense should propagate the deletion to future months
- [x] Card expand/collapse state should persist across month navigation and when returning to the current month
- [x] Card row order in the budget table should match the order defined in the Tarjetas settings tab (including sub-item ordering within each card)

### PDF Import

- [x] Loading animation while Claude analyzes the PDF — visual feedback that it's not frozen
- [ ] Re-evaluate import button placement — consider moving it to the monthly view instead of the config panel
- [x] Remove card deletion from the monthly view — should only go through the config panel (Tarjetas tab)
- [x] Warn when manually adding a charge to a card that already has a statement imported for that month
- [x] Persist type rules for imported transactions — keyword → itemType dictionary (like category keywords) so subscriptions/recurring are auto-detected on future imports
- [ ] Installments imported from the current month appear duplicated in the next month — investigate carry-forward logic for installments created via PDF import
- [x] Import preview total only shows ARS — needs to display ARS + USD separately for mixed-currency statements
- [x] Main budget table totals (card totals, column totals) only show ARS — needs to handle USD amounts separately throughout the table view

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
