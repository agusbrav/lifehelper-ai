# TODO

Pending features, fixes, and improvements tracked by scope.
Format: `- [ ] **Feature Name**: description` — check off when done, delete when shipped.

---

## Budget

- [x] **Bug - Month Reset**: Resetting a past month does not remove all entries — also creates a ghost month entry in the accessible month list

- [x] **Card Management**: Settings page (`/m/budget/settings`) — separate `Card` model, add/remove cards outside the monthly table
- [x] **Inline Type Change**: Click the type badge to cycle one-time → subscription → recurring; propagates correctly (becoming recurring: propagate forward; becoming one-time: remove from future months; subscription↔recurring: update future months)
- [x] **Inline Category Edit**: Click the category cell to edit; datalist of known categories; "Sin categoría" shown when empty
- [x] **Row Hover Effect**: Smoother hover effect on expense table rows — current transition feels abrupt
- [ ] **Dates per Expense**: Allow tagging an expense with a specific date within the month
- [ ] **Custom Tags**: Tags alongside categories — e.g. link a food expense to a specific trip and filter by it
- [ ] **Cross-Module Links**: Link budget expenses to other modules (trip planner, shared expenses)
- [ ] **Code Audit**: Audit and clean up any dead or duplicated code across the budget module
- [x] **Chat AI**: Hook AI prompts in the chat box to interact with the expenses table (add, edit, query expenses via natural language)
- [ ] **Receipt Import**: Share a photo or PDF of a payment receipt, parse it with AI, and load the extracted expense(s) into the table with a preview step before confirming
- [ ] **WhatsApp Ingestion**: Nanoclaw agent connected to WhatsApp receives forwarded transfer confirmations and payment receipts, parses them with AI, and calls the lifehelper API to add expenses to the active monthly budget; confirmation reply flow via WhatsApp
  - Requires: expose a `POST /api/budget/expenses` route in this app with token-based auth (API key per user) so the external agent can write expenses without a session cookie
- [ ] **Import Preview**: Show a preview of extracted expenses before committing them to the table
- [ ] **Dashboard Summary**: Each pocket shows a summary card on the main dashboard; chat rail on dashboard has module-aware context and tools (open module, create/remove pocket with confirmation). Spec pending.
- [x] **USD Support**: Currency field per expense (ARS default, USD for native cards); per-card USD-native setting (e.g. Amex)
- [x] **Dual Currency Totals**: Summary bar shows ARS total and USD total as separate values (no conversion)
- [ ] **Sticky Headers**: Sticky column headers and filter/sort tags in the expense table — keep them visible while scrolling down the list
- [ ] **Simplified View**: Mobile-first simplified view (fewer columns, condensed rows) with a toggle to switch to the full advanced view; applies to desktop too
- [ ] **Analytics Dynamic Layout**: User can toggle which panels to show — gastos ARS por categoría, gastos USD, suscripciones total, etc.
- [ ] **Analytics Per-Card**: Spending totals and charge history per credit card
- [x] **Category Suggestion Bug**: Category suggestion sometimes shows duplicated text
- [x] **Category Filter Bug**: Filter badges above the expense table don't include newly created categories — only seed categories appear until a hard refresh
- [ ] **Links Type Restriction**: Restrict which expense types can be linked — e.g. one-time expenses may not need linking, similar to how one-time expenses skip the inflation button
- [x] **Paid/Pending Removal**: Simplify to expense ledger + past statistics only; keep `paid` field in schema but hide the UI
- [x] **Recurring Delete Propagation**: Deleting a recurring or installment expense should propagate the deletion to future months
- [x] **Card Collapse Persistence**: Card expand/collapse state should persist across month navigation and when returning to the current month
- [x] **Card Row Order**: Card row order in the budget table should match the order defined in the Tarjetas settings tab (including sub-item ordering within each card)

### PDF Import

- [x] **PDF Import Loading**: Loading animation while Claude analyzes the PDF — visual feedback that it's not frozen
- [ ] **PDF Import Button Placement**: Re-evaluate import button placement — consider moving it to the monthly view instead of the config panel
- [x] **PDF Import Card Deletion**: Remove card deletion from the monthly view — should only go through the config panel (Tarjetas tab)
- [x] **PDF Import Duplicate Warning**: Warn when manually adding a charge to a card that already has a statement imported for that month
- [x] **PDF Import Type Rules**: Persist type rules for imported transactions — keyword → itemType dictionary so subscriptions/recurring are auto-detected on future imports
- [ ] **PDF Import Installment Duplication Bug**: Installments imported from the current month appear duplicated in the next month — investigate carry-forward logic for installments created via PDF import
- [x] **PDF Import ARS/USD Totals**: Import preview total and main budget table totals handle USD amounts separately throughout

---

## Module Interconnection

- [ ] **Linking Layer**: Design the cross-module linking layer — expenses referencing trips, tags referencing any module entity
- [ ] **Cross-Module Filter**: Filter budget view by external reference (e.g. "show only expenses tagged to Trip X")

---

## Infrastructure

- [ ] (nothing pending)

---

## Future Modules

- [ ] **Trip Planner**: Trip planner pocket
- [ ] **Shared Expenses**: Shared expenses pocket
- [ ] **Date/Plans**: Date and plans ideas with groups or girlfriend
- [ ] **Shopping List**: Shopping list for day-to-day
- [ ] **Investments**: Investment table to manage and track capital, investment and liquid assets
- [ ] **Nutrition**: Recipe + weight + nutrition app, informed by the latest science

---

## Backlog (low priority / not yet scoped)

- (ideas go here before they get a scope)
