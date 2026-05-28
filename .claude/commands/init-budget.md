Load full context for the budget module so development can start without codebase exploration.

Read these files in order and then print a session brief:

1. `packages/modules/budget/manifest.ts` — module manifest (id, tools, accepted context)
2. `packages/modules/budget/prisma/schema.prisma` — data models (BudgetMonth, BudgetItem, Card, CategoryKeyword)
3. `packages/modules/budget/src/types.ts` — TypeScript types used across the module
4. `packages/modules/budget/src/actions.ts` — primary server actions (expense CRUD, month management)
5. `packages/modules/budget/src/card-actions.ts` — card management actions
6. `packages/modules/budget/src/category-keyword-actions.ts` — category keyword actions
7. `packages/modules/budget/src/analytics.ts` — analytics logic
8. `packages/modules/budget/src/chat-prompt.ts` — AI system prompt and context assembly
9. `packages/modules/budget/src/tools.ts` — AI tool implementations
10. `packages/modules/_integrations/src/index.ts` — active cross-module bridges (currently none)
11. `packages/modules/budget/TODO.md` — open bugs and planned features for the budget module

After reading, print a brief with these sections:

**Schema:** one line per model, fields that matter most for current work
**Server actions:** grouped by concern (expense, card, category, month), one line each
**AI tools:** list of registered tools and what they do
**Open TODOs:** copy the budget section from TODO.md verbatim
**Active integrations:** which modules currently bridge into budget (if any)
**Unstaged changes:** run `git diff --stat` and list any modified files so work context is clear
