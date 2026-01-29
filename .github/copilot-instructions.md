# Copilot Instructions for Money Flow 3

## Stack & Architecture
- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Shadcn UI
- **Database:** Supabase PostgreSQL with RLS enabled
- **State:** React Server Components (RSC) by default; mark client-only files with `'use client'` only for hooks/interactivity
- **Data Layer:** Service functions in `src/services/*` (business logic) → Server Actions in `src/actions/*` (API edge) → Server Components in `src/app/**` (rendering)
- **Forms:** React Hook Form + Zod for validation

## Essential Services (23 files in src/services/)
| Service | Purpose | Key Functions |
|---------|---------|---|
| `transaction.service.ts` | Core CRUD, voiding, refunds, splits | `loadTransactions()`, `createTransaction()`, `updateTransaction()`, `voidTransaction()` |
| `cashback.service.ts` | 3-tier policy resolution, cycle tracking | `resolvePolicies()`, `upsertTransactionCashback()` |
| `account.service.ts` | Balance calculations, credit utilization | `getAccountWithBalance()`, `getAccountCycles()` |
| `debt.service.ts` | Debt aggregation from transactions | `calculatePersonDebt()`, `getDebtSummary()` |
| `batch.service.ts` | Bulk imports with deduplication | `processBatchImport()` |
| `split-bill.service.ts` | Split bill row management | N/A |
| `cashback-analytics.service.ts` | Cashback insights & reporting | N/A |

## Critical Business Logic
**Transactions are the single source of truth.** All financial data flows from the `transactions` table:
- **Debt:** Derived from transactions with `person_id` (not a separate "Debt Accounts" table). Calculate via `debt.service.ts`
- **Installments:** Use `is_installment` flag on transaction_lines; DO NOT double-count parent + children in balance calculations
- **Refund Chain:** ENFORCE **Parent → Void → Refund**. Never edit/void a parent if children exist; delete children first via `transaction.service.deleteTransaction()`
- **Duplicates:** Batch flows must dedupe on `transaction_date + amount + details` to prevent duplicate imports
- **Transaction Types:** `income | expense | transfer | debt | repayment` (see `transaction.service.ts:29`)

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

## Common Data Flow Patterns
**Transaction Creation Flow:**
```
Server Action (src/actions/transaction-actions.ts)
  → calculatePersistedCycleTag() → determineCashbackCycle
  → createTransaction() → transaction.service.ts
  → upsertTransactionCashback() → cashback.service.ts
  → revalidatePath('/transactions')
```

**Transaction Edit Flow:**
1. Load transaction via `getTransactionById()` → includes cashback entries + metadata
2. Check auto-category guard: `if (currentCategoryId) return;` before auto-assigning
3. Update via `updateTransaction()` which handles transaction_lines + cashback recalculation
4. Sync to Google Sheets if configured

**Debt Query Flow:**
1. Always aggregate from `transactions` table with `person_id` filter
2. Never query a separate "debt accounts" table—use `debt.service.ts` helpers
3. Use `calculatePersonDebt()` for individual summaries, `getDebtSummary()` for bulk queries

## Cashback Engine (Critical)
**3-Tier Policy Resolution** (priority: category rule → level default → program default):
1. **Min Spend Gate:** If `minSpendTarget` not met → return program default only, skip all levels
2. **Level Matching:** Match level by `minTotalSpend` threshold on historical cycle's `spent_amount`
3. **Category Rule Check:** If level matches, look for category rule in that level for the transaction's category
4. **Fallback Logic:** 
   - If **category rule NOT found in matched level** → return **program_default** (NOT level_default)
   - If **no level matches** → return **program_default**
- **Cycle Accuracy:** Use `cycle.spent_amount` (historical cycle total), not current cycle projection
- **Fiscal Year Grouping:** For statement cycles spanning months, use **start year** (e.g., cycle "2025-12" Nov 20–Dec 19 2025 = year 2025)
- **Metadata Storage:** Save in `cashback_entries.metadata: {policySource, rate, ruleMaxReward, levelId, categoryId, levelName}`
- **Account Config:** `cashback_config.program.levels[].minTotalSpend` MUST match tier name exactly (e.g., "≥15M" = 15000000)

**Key Files:** `src/services/cashback/policy-resolver.ts`, `.agent/CASHBACK_GUIDE_VI.md`

## UI/UX Strict Rules (Phase 74 - Jan 2026)
- **Image Shapes:** Accounts/Shops = `rounded-sm` (rounded square), Persons = `rounded-full`, standard size `w-8 h-8` or `w-10 h-10`
- **Transaction Table Grid Layout:**
  ```css
  grid-template-columns: 40px 80px 280px 480px 180px 200px 120px;
  /* Checkbox | Date | Details | Flow (Source➜Target) | Base Amount | Net Amount | Actions */
  ```
  - **Row click does nothing** — only Edit/Copy/History buttons and action menus trigger handlers
  - **Merge "Account" + "People"** into "**Accounts ➜ People**" column (Flow) with Source (Left) → Arrow (Center) → Target (Right)
- **Cycle Badges:** Display ranges (e.g., "25.10 - 24.11"), not raw tags
- **Cashback Badges:** Show "Need to Spend" in yellow/amber if `minSpendTarget` unmet; all badges are 24px height
- **Components:** Reuse Shadcn UI primitives; reference [unified-transaction-table.tsx](src/components/moneyflow/unified-transaction-table.tsx)

## Form & Validation
- **Framework:** react-hook-form + zod schemas
- **No `any` types.** Use shared types from `src/types/moneyflow.types.ts` and `database.types.ts`
- **Auto-category guard:** In edit mode, check `if (currentCategoryId) return;` before auto-assigning categories
- **Hook rules:** NO top-level early returns before hooks; place all guard logic inside useEffect/useMemo

## Development Workflow & Commands
| Task | Command | Notes |
|------|---------|-------|
| **Install** | `pnpm install` | Use pnpm (not npm) for lock file consistency |
| **Dev Server** | `pnpm dev` | Runs on http://localhost:3000 |
| **Build** | `pnpm build` | Required before deploy; catches type errors |
| **Lint** | `pnpm lint` | Must pass before commit; auto-fixes many issues |
| **Google Sheets Sync** | `pnpm sheet:people` or `pnpm sheet:batch` | Deploy sheet changes; run before committing  |
| **Variant Sync** | `pnpm sheet:people:1/2/3` or `pnpm sheet:batch:1/2/3` | Alternative prefixes for multi-env deploys |

**Pre-commit checklist:**
1. Run `pnpm lint` — must pass
2. Run `pnpm build` — must succeed
3. Do NOT commit if either fails

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

## Canonical Routes (V2-Only)
- **Accounts list (V2):** `/accounts` → `src/app/accounts/page.tsx`
- **Account details (V2):** `/accounts/[id]` → `src/app/accounts/[id]/page.tsx`
- **Legacy alias:** `/accounts/v2` and `/accounts/v2/[id]` must redirect to `/accounts` and `/accounts/[id]`
- **Transactions (V2):** `/transactions` → V2 unified table
- **Do NOT use:** legacy `/txn/add-v2` or any V1 add pages; use `AddTransactionDropdown` + `AddTransactionDialog`

## Anti-Confusion Guardrails
- Always link to account details via `/accounts/[id]` only.
- If you see `v1`/`v2` naming in components, prefer `src/components/**/v2/**` and App Router pages under `src/app`.
- For "Add Transaction" actions, always use `AddTransactionDropdown` from V2 and never hardcode URLs.

## Common Pitfalls & Solutions
| Issue | Cause | Fix |
|-------|-------|-----|
| **Double-count in balances** | Including both parent transaction + installment children | Use service layer which handles `is_installment` flag correctly |
| **Void fails silently** | Trying to void parent with linked children | Delete children first via `deleteTransaction()`, then void parent |
| **Cashback shows wrong rate** | Using `currentSpend` instead of historical `cycle.spent_amount` | Always use cycle's `.spent_amount` from account cycles table |
| **"Rendered fewer hooks than expected"** | Early return before hooks in component | Move guard logic into `useEffect`/`useMemo`, never before hook declarations |
| **Auto-category overwrites user selection** | Missing `if (currentCategoryId) return;` guard | Check guard condition before calling auto-assign in edit mode |
| **RLS permission denied** | Selecting columns user isn't authorized for | Use explicit column selection from `.cursorrules` section 3 |
| **Missing Google Sheets sync** | Forgot to run `pnpm sheet:people` | Run before deploying people sheet changes; required command |

## Essential Reading (In Order)
1. `.cursorrules` – Detailed coding standards
2. `README.md` – Project status, Phase 3 notes, UI refactor
3. `.agent/README.md` – Transaction Slide V2 architecture
4. `.cursorrules` section 4 & 6 – Business logic & cashback details
5. `.agent/CASHBACK_GUIDE_VI.md` – Complete cashback flow walkthrough

**Ask for clarification on avatar shapes, refund chains, or transaction integrity patterns if unclear.**
