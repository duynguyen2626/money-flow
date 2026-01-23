# Copilot Instructions for Money Flow 3

## Stack & Architecture
- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Shadcn UI
- **Database:** Supabase PostgreSQL with RLS enabled
- **State:** React Server Components (RSC) by default; mark client-only files with `'use client'` only for hooks/interactivity
- **Data Layer:** Service functions in `src/services/*` (business logic) → Server Actions in `src/actions/*` (API edge) → Server Components in `src/app/**` (rendering)

## Critical Business Logic
**Transactions are the single source of truth.** All financial data flows from the `transactions` table:
- **Debt:** Derived from `transactions` with `person_id` (not a separate "Debt Accounts" table)
- **Installments:** Flag `is_installment` on transaction_lines; do NOT double-count parent + children in totals
- **Refund Chain:** ENFORCE Parent → Void → Refund. Never edit/void a parent if children exist; delete children first
- **Duplicates:** Batch flows must dedupe on `transaction_date + amount + details`

## Data Access Patterns
- **Server Components/Actions:** `createClient()` from `src/lib/supabase/server.ts`
- **Client Components:** `createClient()` from `src/lib/supabase/client.ts`
- **Assume RLS is on.** Avoid `select('*')`; explicitly pick columns needed
- **Service layer:** Use `src/services/transaction.service.ts` for complex queries (e.g., `loadTransactions`, `createTransaction`, `updateTransaction`)
- **Refund account ID:** Retrieved from constants (`.agent/schema/refund_constants.ts` or hardcoded in migration)

## Server Actions Pattern
All mutations follow this strict pattern:
```typescript
export async function myAction(input: T): Promise<{ success: boolean; error?: string; data?: R }> {
  try {
    // Use service functions for business logic
    const result = await myService.doSomething(input)
    revalidatePath('/path') // REQUIRED after mutations
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
```
See: `src/actions/transaction-actions.ts`, `src/actions/account-actions.ts`, `src/actions/batch-actions.ts`

## Key Services & Their Purpose
- `transaction.service.ts` – Create, update, void, restore, refund transactions; split bills; load unified views
- `cashback.service.ts` – 3-tier policy resolution (category rule → level default → program default); cycle tracking
- `batch.service.ts` – Bulk transaction imports with deduplication
- `debt.service.ts` – Debt aggregation from transactions; person-specific debt queries
- `account.service.ts` – Account balance calculations, credit utilization, cycle stats
- `split-bill.service.ts` – Split bill row management and adjustment

## Cashback Engine (Critical)
**3-Tier Policy Resolution** (priority: category > level > program):
1. If `minSpendTarget` not met → return program default only
2. Match level by `minTotalSpend` → check for category rule in that level
3. If category rule NOT found in matched level → return program default (NOT level default)
4. If no level matches → return program default
- **Cycle accuracy:** Use `cycle.spent_amount` (historical cycle total), not `currentSpend` (current cycle)
- **Fiscal year grouping:** Cycles spanning months use start year (e.g., "2025-12" = Nov 20–Dec 19 → year 2025)
- **Min spend gate:** `minTotalSpend` values MUST match tier name (e.g., "≥15M" = 15000000)

See: `src/services/cashback/` and `.agent/CASHBACK_GUIDE_VI.md`

## UI/UX Strict Rules
- **Avatars/Thumbnails:** Square (`rounded-none`), NOT rounded. Size: `w-8 h-8` or `w-10 h-10` for tables
- **Transaction Table:** Merge "Account" + "People" columns into "**Accounts ➜ People**" (left|center|right); **row click does nothing**—only action menus/buttons trigger handlers
- **Cycle Badges:** Display ranges (e.g., "25.10 - 24.11"), not raw tags
- **Cashback Badges:** Show "Need to Spend" in yellow/amber if `minSpendTarget` unmet
- **Components:** Reuse Shadcn UI primitives (`src/components/ui/*`); see `unified-transaction-table.tsx`, `UnifiedTransactionsPage.tsx`

## Form & Validation
- **Framework:** react-hook-form + zod schemas
- **No `any` types.** Use shared types from `src/types/moneyflow.types.ts` and `database.types.ts`
- **Auto-category guard:** In edit mode, check `if (currentCategoryId) return;` before auto-assigning categories
- **Hook rules:** NO top-level early returns before hooks; place all guard logic inside useEffect/useMemo

## Development Workflow
| Task | Command |
|------|---------|
| **Install** | `pnpm install` |
| **Dev Server** | `pnpm dev` (http://localhost:3000) |
| **Build** | `pnpm build` |
| **Lint** | `pnpm lint` |
| **Lint Check** | `pnpm lint` (must pass before commit) |
| **Google Sheets Sync** | `pnpm sheet:people` / `pnpm sheet:batch` (or `:1/:2/:3` variants) |

**Pre-commit checklist:** Run `pnpm lint` and `pnpm build`—failures are blockers.

## Layout & Data Loading Pattern
1. **Server Component (RSC)** at `src/app/**/page.tsx` fetches data using service functions
2. **Pass data down** as props to client components
3. **Client Component** uses hooks only for UI interactions (filters, modals)
4. **Server Actions** handle mutations with proper error handling
5. **Revalidate** affected paths after mutations

Example: `src/app/transactions/page.tsx` loads via `getAccounts()`, `getUnifiedTransactions()`, passes to client component

## Integrations & External Workflows
- **Google Sheets:** People/Batch sync via Google Apps Script in `integrations/google-sheets/`. Run `pnpm sheet:people` before deploying sheet changes
- **Database:** Consolidated schema in `.agent/schema/full_schema_from_migrations.sql`; migrations archived in `.agent/schema/migrations_archive`

## Testing & Quality
- Framework: vitest + testing-library
- Avoid `console.log` in production paths
- Clean unused imports before commit
- RSC-friendly test patterns preferred

## Navigation & State Management
- **Tag Filtering:** `TagFilterProvider` wraps transaction UI (`src/app/transactions/page.tsx`)
- **Optimistic Updates:** Keep consistent between unified transaction table state and server action responses

## Essential Reading (In Order)
1. `.cursorrules` – Detailed coding standards
2. `README.md` – Project status, Phase 3 notes, UI refactor
3. `.agent/README.md` – Transaction Slide V2 architecture
4. `.cursorrules` section 4 & 6 – Business logic & cashback details
5. `.agent/CASHBACK_GUIDE_VI.md` – Complete cashback flow walkthrough

**Ask for clarification on avatar shapes, refund chains, or transaction integrity patterns if unclear.**
