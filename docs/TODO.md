# TODO

Global platform and architecture items. Module-specific work lives in each module's own TODO.
Format: `- [ ] **Feature Name**: description` — check off when done, delete when shipped.

---

## Module Status

| Module | TODO | Notes |
|--------|------|-------|
| `budget` | [packages/modules/budget/TODO.md](../packages/modules/budget/TODO.md) | Active |

---

## Architecture

- [ ] **Dashboard Summary**: Each pocket shows a summary card on the main dashboard; chat rail has module-aware context
- [ ] **Linking Layer**: Design the cross-module linking layer — expenses referencing trips, tags referencing any module entity
- [ ] **Cross-Module Filter**: Filter any module view by external reference (e.g. "show only expenses tagged to Trip X")

---

## Platform

- [ ] **Auth Session Lifetime + Test**: `packages/core/src/__tests__/auth.test.ts` fails because `SESSION_MS` in `packages/core/src/auth.ts` was raised from 7 days to 365 days (session-restore / mobile WIP) without updating the test's expected window. Deferred on purpose: when the auth/session flow is reworked, decide the intended session lifetime, then update or rethink the test expectation and re-run the full `@lifehelper/core` suite.

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
