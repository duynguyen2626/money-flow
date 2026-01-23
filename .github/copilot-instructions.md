# Copilot Instructions for Money Flow 3

- Stack: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Shadcn UI, Supabase Postgres. Default to React Server Components; mark client-only files with `'use client'` only when hooks/interactivity are required.
- Data access: Use Supabase clients from src/lib/supabase/server.ts (RSC/server actions) and src/lib/supabase/client.ts (client comps). Assume RLS on; avoid select('*'); pick columns explicitly.
- Server actions: Follow pattern `{ success: boolean, error?: string, data?: T }` wrapped in try/catch. Revalidate paths after mutations. See actions in src/actions/* and usage in src/app/transactions/page.tsx.
- Core domain: transactions table is the single source of truth. Debt is derived from transactions with person_id—do not create/query legacy "Debt Accounts". Installments hang off transaction_lines/is_installment; do not double count parent + installments in totals.
- Refund integrity: enforce Parent -> Void -> Refund chain. Never edit/void a parent if children exist; delete children first. Refund pending account comes from constants/refunds.
- Duplicate protection: batch flows must dedupe on transaction_date + amount + details.
- UI rules (strict):
  - Avatars/thumbnails are square (rounded-none) for account/person/item tables, size w-8/h-8 or w-10/h-10.
  - Transaction table: merge "Account" + "People" into "Accounts ➜ People" with left/center/right alignment; row click does nothing—only explicit action buttons/menus trigger handlers.
  - Cycle tags display ranges (e.g., 25.10 - 24.11); cashback "Need to Spend" badge uses yellow/amber if min spend unmet.
  - Use Shadcn primitives in src/components/ui; reuse existing table components. See src/components/moneyflow/unified-transaction-table.tsx and src/components/transactions/UnifiedTransactionsPage.tsx.
- Forms/validation: use react-hook-form + zod schemas. Keep type safety (no `any`); use shared types from src/types/moneyflow.types.ts and database.types.ts.
- Layout/data loading: pages under src/app/** prefer RSC; fetch data in the page (e.g., getAccounts/getUnifiedTransactions in src/app/transactions/page.tsx) and pass into client components.
- Styling: Tailwind-first; lean on utility classes + Shadcn variants. Follow ongoing UI refactor notes in .agent/context/ui_standards.md and README.md.
- Integrations: Google Sheets push scripts via `pnpm sheet:people` or `pnpm sheet:batch` (variants :1/:2/:3 for different prefixes) before deploying sheet changes.
- Database migrations: historical migrations archived in .agent/schema/migrations_archive; consolidated schema in .agent/schema/full_schema_from_migrations.sql.
- Dev workflow: `pnpm install`, `pnpm dev` for local. Run `pnpm lint` and `pnpm build` before commit; failures are blockers.
- Testing: vitest + testing-library available; prefer RSC-friendly patterns. Avoid console.log in production paths; clean unused imports.
- Navigation/context: TagFilterProvider wraps transactions UI (src/app/transactions/page.tsx). Keep optimistic update paths consistent with state handling in unified transaction table.
- Docs to read first: .cursorrules (coding standards), README.md (project status/rules), .agent/README.md (txn slide v2), supabase/migrations/README.md (migration policy).

Ask for clarification if a required pattern is missing or conflicting, especially around avatar shape rules and transaction/refund integrity.
