# Money Flow 3 - Agent Context & Project State

**Last Updated:** February 17, 2026  
**Current Phase:** Phase 15 - Categories UI & Account Table Refinements

---

## 1. Project Overview

**Money Flow 3** is a Vietnamese personal finance app built with Next.js 16 (Turbopack), TypeScript, Tailwind CSS 4, Shadcn UI, and Supabase PostgreSQL.

**Core Mission:**
- Track credit card cashback earnings and sharing
- Manage shared bills and debt repayment
- Visualize financial data across accounts and time

**Users:** Single owner with multiple credit cards and shared expense tracking among people (lender/borrower relationships).

---

## 2. Stack & Architecture

### Framework & Build
- **Next.js 16.0.10** with Turbopack, App Router
- **TypeScript 5.9.3** with strict mode; `baseUrl: "."` and `@/*` path alias enabled
- **Tailwind CSS 4** with Shadcn UI components
- **Vitest + Testing Library** for tests

### Data Layer
- **Supabase PostgreSQL** with Row-Level Security (RLS) enabled
- **Database Types:** Auto-generated in `src/types/supabase.ts`
- **Migrations:** Archived in `.agent/schema/migrations_archive/`; full schema in `.agent/schema/full_schema_from_migrations.sql`

### State & Rendering
- **React Server Components (RSC)** by default
- **Mark client-only files** with `'use client'` only for hooks/interactivity
- **Data flow:** Service functions → Server Actions → Server Components
- **Refetch/Revalidate:** `revalidatePath()` after mutations

### Key Services
| File | Purpose |
|------|---------|
| `src/services/cashback.service.ts` | Year analytics, cycle tracking, give-away aggregation |
| `src/services/cashback/policy-resolver.ts` | 3-tier cashback policy resolution (category → level → program) |
| `src/services/transaction.service.ts` | Create, update, void, refund; split bills; unified queries |
| `src/services/debt.service.ts` | Debt aggregation from transactions |
| `src/services/account.service.ts` | Balance, credit utilization, cycle stats |
| `src/services/batch.service.ts` | Bulk imports with deduplication |

---

## 3. Critical Business Logic

### 3.1 Transactions as Source of Truth
**All financial data flows from the `transactions` table.**

- **Debt:** Derived from transactions with `person_id` (not a separate table)
- **Installments:** `is_installment` flag on transaction_lines; do NOT double-count parent + children
- **Refund Chain:** ENFORCE Parent → Void → Refund; never edit/void parent if children exist
- **Duplicates:** Batch imports dedupe on `transaction_date + amount + details`

### 3.2 Cashback Engine (3-Tier Policy Resolution)

**Priority: Category Rule > Level Default > Program Default**

```
IF minSpendTarget not met → return program default only
ELSE
  Match level by minTotalSpend
  IF category rule in matched level → return rule rate
  ELSE → return program default (NOT level default)
```

**Key Rules:**
- `minTotalSpend` values MUST match tier name (e.g., "≥15M" = 15,000,000 VND)
- Use `cycle.spent_amount` (historical), not `currentSpend` (active cycle)
- **Fiscal year grouping:** Cycles spanning months use start year (e.g., "2025-12" = Nov 20–Dec 19 → year 2025)
- If no level matches any spend tier → return program default

**Example (Vpbank Lady):**
```json
{
  "program": {
    "levels": [
      {
        "id": "lvl_premium",
        "name": "Premium Tier ≥15M",
        "minTotalSpend": 15000000,
        "defaultRate": 0.15,
        "rules": [
          {
            "id": "rule_1",
            "rate": 0.15,
            "maxReward": 300000,
            "categoryIds": ["aac49051-..."]
          }
        ]
      },
      {
        "id": "lvl_standard",
        "name": "Standard (<15M)",
        "minTotalSpend": 0,
        "defaultRate": 0.075,
        "rules": [...]
      }
    ],
    "defaultRate": 0.003
  }
}
```

---

## 4. Data Access Patterns

### Server Components/Actions
```typescript
import { createClient } from '@/lib/supabase/server'

const client = createClient()
const { data, error } = await client
  .from('transactions')
  .select('id, amount, details')  // Explicit columns, not '*'
  .eq('account_id', cardId)
```

### Client Components
```typescript
import { createClient } from '@/lib/supabase/client'
const client = createClient()
```

### Server Actions Pattern
```typescript
export async function myAction(input: T): Promise<{ success: boolean; error?: string; data?: R }> {
  try {
    const result = await myService.doSomething(input)
    revalidatePath('/affected/path')  // REQUIRED
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
```

---

## 5. Cashback Dashboard State (Phase 4.2)

### Recent Fixes
- ✅ **Derived Net Profit:** `bankBackYear - sharedYear - annualFeeYear` (not from stale DB field)
- ✅ **Give Away Totals:** Sum of monthly `totalGivenAway` (source of truth from volunteer transactions)
- ✅ **Advanced Rules Display:** Parsed `accounts.cashback_config` → tiered rules popover
- ✅ **Month Table UX:** Clickable cells (only with data) → detail modal with transactions
- ✅ **TypeScript Validation:** Excluded `.next/dev/types` from tsconfig include to prevent pre-push failures

### Components

**`src/app/cashback/page.tsx`** (Server Component)
- Fetches accounts with `cashback_config` and credit card summaries
- Parses `program.levels` → builds `tieredMap` (card ID → has advanced rules)
- Computes year summaries using `getCashbackProgress()`
- Attaches config to cards; passes to dashboard/matrix views
- Tabs: `detail` | `matrix` | `volunteer`

**`src/components/cashback/cashback-dashboard-v2.tsx`** (Client, View: Detail)
- **State:** `selectedCardId`, `detailModal`, `viewMode`, `searchQuery`, `redeemOpen`
- **Sidebar:** Searchable card list with Net Profit color-coded
- **Summary Table:** Rate (with advanced rules popover), Max/Cycle, Bank Back, Give Away, Annual Fee, Net Profit
- **Monthly Tables:** 6+6 breakdown; clickable Give Away cells → month detail modal
- **Advanced Rules Popover:** Renders tiers with category rules, min spend, caps

**`src/components/cashback/cashback-matrix-view.tsx`** (View: Matrix)
- All cards × months grid
- Derived net per row; overall total with derived formula
- Zero-data rows filtered out
- Clickable month cells → detail modal

**`src/components/cashback/cashback-volunteer-matrix-view.tsx`** (View: Volunteer)
- Volunteer transactions breakdown by account/person
- Monthly totals; grand total
- Clickable months → volunteer transaction modal

**`src/components/cashback/month-detail-modal.tsx`**
- Shows transactions for selected card/month
- Tabs for `card` (all give-aways) and `volunteer` (people breakdown)
- Clickable person rows (volunteer mode) → person detail page

### Types
**`src/types/cashback.types.ts`**
```typescript
type CashbackYearSummary = {
  cardId: string
  cardType?: string
  netProfit: number
  cashbackGivenYearTotal: number  // Total shared
  cashbackRedeemedYearTotal: number  // Bank back
  annualFeeYearTotal: number
  bankBackYearTotal?: number  // Derived in page.tsx
  sharedYearTotal?: number  // Derived in page.tsx
  months: CashbackMonthSummary[]
}

type CashbackMonthSummary = {
  month: number
  totalGivenAway: number  // Source of truth
  cashbackGiven: number  // Legacy
}
```

---

## 6. UI/UX Rules (Critical for Consistency)

### Avatars & Images
- **Square, NOT rounded:** Use `rounded-none`, not `rounded-full`
- **Sizes:** `w-8 h-8` for tables, `w-10 h-10` for expanded views

### Transaction Tables
- **"Accounts ➜ People" Column:** Merged header (left|center|right alignment)
- **Row click behavior:** Does NOTHING; only action menus/buttons trigger handlers

### Cycle Badges
- Display ranges: `"25.10 - 24.11"` (not raw tags)

### Cashback Badges
- Show **"Need to Spend"** in yellow/amber if `minSpendTarget` unmet

### Styling Patterns
- `bg-slate-50` for headers
- `text-muted-foreground` for labels
- `tabular-nums` for currency alignment
- `transition-colors` for hover states

### Colors
- **Bank Back (positive):** `text-green-700`
- **Give Away (shared):** `text-amber-600`
- **Annual Fee (debit):** `text-red-500`
- **Net Profit:** Green if ≥0, red if <0
- **Advanced Rules:** `text-purple-700` with `bg-purple-50`

---

## 7. Form & Validation

### Framework
- **react-hook-form + zod schemas**
- **No `any` types** (lint errors if present)

### Common Patterns
- **Auto-category guard:** Check `if (currentCategoryId) return;` before auto-assigning
- **Hook rules:** NO early returns before hooks; guard logic inside `useEffect`/`useMemo`

---

## 8. Development Workflow

| Task | Command |
|------|---------|
| **Install** | `pnpm install` |
| **Dev Server** | `pnpm dev` (http://localhost:3000) |
| **Build** | `pnpm build` |
| **Lint** | `pnpm lint` |
| **Build + Lint Check** | Both MUST pass before commit (pre-push hook validates TypeScript) |
| **Google Sheets Sync** | `pnpm sheet:people` / `pnpm sheet:batch` |

### Pre-Push Hook
- Runs `npx tsc --noEmit` (respects tsconfig.json `include`/`exclude`)
- Validates TypeScript before allowing push
- **Note:** `.next/dev/types` is EXCLUDED from validation

---

## 9. Common Gotchas & Patterns

### ❌ Mistakes to Avoid
1. **Editing stale cashback fields** → Use derived formula (bankBackYear - sharedYear - annualFeeYear)
2. **Double-counting installments** → Check `is_installment` flag; don't sum parent + children
3. **Editing parent transaction with refund children** → Delete children first, then parent
4. **Including `any` types** → Use strict types; lint will block commit
5. **Ignoring RLS** → Always assume row-level security is active; pick columns explicitly
6. **Fetching all accounts** → Leads to data leaks; use filters and `select()`

### ✅ Best Practices
1. **Service Layer First:** Complex queries belong in `src/services/*`
2. **Revalidate After Mutations:** Always call `revalidatePath()` after server actions
3. **Pass Parsed Config Down:** Attach `cashback_config` to card objects in parent; parse in children
4. **Type Everything:** Use `CashbackConfig`, `CashbackLevelConfig`, `CashbackRuleConfig` for popover logic
5. **Month Lookups:** Always fill missing months (1-12) in month table rendering
6. **Currency Formatting:** Use `new Intl.NumberFormat('vi-VN')` consistently

---

## 10. File Locations Reference

### Pages
- `/src/app/cashback/page.tsx` – Main cashback orchestrator
- `/src/app/accounts/page.tsx` – Account grid view
- `/src/app/accounts/v2/page.tsx` – Unified account table

### Components
- `/src/components/cashback/` – All cashback UI modules
- `/src/components/accounts/v2/` – Account card & table components
- `/src/components/transaction/slide-v2/` – Transaction form modules

### Services
- `/src/services/cashback.service.ts` – Year analytics, cycle stats
- `/src/services/cashback/policy-resolver.ts` – Policy resolution engine
- `/src/services/transaction.service.ts` – Transaction CRUD & complex queries

### Types
- `/src/types/cashback.types.ts` – Cashback data structures
- `/src/types/supabase.ts` – Auto-generated database types (do NOT edit)
- `/src/types/moneyflow.types.ts` – Shared app types

### Actions
- `/src/actions/cashback-actions.ts` – Cashback mutations
- `/src/actions/transaction-actions.ts` – Transaction mutations

---

## 11. Recent Changes (Phase 4.2 Summary)

### Code Changes
1. **Cashback Page:** Added tiered config parsing, derived net profit, matrix/volunteer tabs
2. **Dashboard V2:** Added search, advanced rules popover, derived net calculation, improved month tables
3. **Matrix View:** Derived net per row, zero-data filtering
4. **Volunteer View:** Account/person breakdown with modal
5. **Month Detail Modal:** Multi-tab (card/volunteer) transaction display
6. **tsconfig.json:** Added `baseUrl: "."` for path alias; excluded `.next/dev/types` from validation
7. **Policy Resolver:** Uses `totalGivenAway` sum for year totals consistency
8. **Account Table V2 Refinements (Feb 17):**
    - Implemented sorting by Balance (Available Credit for CCs).
    - Added "Intelligence Legend" for amount color-coding (Red > 100M, Orange 50-100M, Green < 50M).
    - Separated "Waiver Tracking" into its own dedicated quick stat unit.
    - Fixed sticky header scroll blurring and layering issues.
    - Added "Coverage" hover-card explanation for external credit exposure.
    - Enhanced search with a clear (X) trigger and added "Reset Sort" button.

### PR Status
- **Branch:** `feature/cashback-page-fix-v2`
- **Status:** Merged with origin/main; no conflicts
- **Includes:** UI polish, type tightening, advanced rules display, derived net logic

---

## 12. Next Steps & Open Tasks

### High Priority
- [ ] QA test Vpbank Lady advanced rules on live data
- [ ] Validate month detail modal transactions match engine outputs
- [ ] Test volunteer distribution accuracy across people
- [ ] Performance test with large transaction datasets

### Medium Priority
- [ ] Remove `redeemOpen` state if unused (currently defined but may be legacy)
- [ ] Consolidate month table styling across detail/matrix/volunteer views
- [ ] Add loading skeletons to month detail modal
- [ ] Document schema changes for future migrations

### Low Priority
- [ ] Repository-wide lint fixes (many `Unexpected any` warnings outside cashback scope)
- [ ] Deprecation warnings in next.config.ts (eslint key no longer supported)
- [ ] Refactor volunteer fetch to centralize transaction aggregation

---

## 13. Quick Command Reference

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Full build
pnpm lint                   # ESLint check
npx tsc --noEmit           # TypeScript validation (respects tsconfig)

# Git Workflow
git checkout -b feature/YOUR-FEATURE
git add .
git commit -m "feat: description"
git push -u origin feature/YOUR-FEATURE
# Opens PR → Merge after review & build passes

# Database
pnpm sheet:people          # Sync people from Google Sheets
pnpm sheet:batch           # Sync batch data from Google Sheets
```

---

## 14. Documentation References

**In Order of Importance:**
1. `.cursorrules` – Detailed coding standards & cashback business logic
2. `README.md` – Project status & Phase 4.2 notes
3. `.agent/README.md` – Transaction Slide V2 architecture
4. `.agent/CASHBACK_GUIDE_VI.md` – Complete cashback flow walkthrough (Vietnamese)
5. `docs/cashback-dashboard-testing.md` – QA checklist for dashboard features

---

## 15. Support & Escalation

**Ask for clarification on:**
- Avatar shape rules (square vs rounded)
- Refund chain logic (parent → void → refund)
- Transaction integrity patterns (dedupe, double-count issues)
- Cashback policy resolution edge cases
- Data access & RLS implications

**Before starting work:**
1. Read this document entirely
2. Check `.cursorrules` section 4 & 6 for business logic
3. Review related service files for existing patterns
4. Search codebase for similar implementations

---

**Happy coding! 🚀**
