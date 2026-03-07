# Money Flow 3 - Agent Onboarding Guide

> **Purpose**: This is the master onboarding document for any new AI agent or developer joining the Money Flow 3 project. Read this FIRST before starting any work.

---

## 🎯 Project Overview

**Name**: Money Flow 3  
**Type**: Personal Finance Management Application  
**Tech Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI, PocketBase (Primary), Supabase (Legacy)  
**Status**: Phase 17 - PocketBase Integration & Data Stabilization

### What is Money Flow 3?
A comprehensive personal finance app for tracking:
- **Transactions** (Income, Expense, Transfer, Debt, Repayment)
- **Accounts** (Bank accounts, credit cards, wallets)
- **People** (Debt tracking with individuals)
- **Services** (Recurring subscriptions like Netflix, Spotify)
- **Cashback** (Credit card rewards tracking)
- **Installments** (Payment plans)
- **Batch Processing** (Import transactions from Excel/CSV)

---

## 📚 Essential Reading (In Order)

### 1. **Rules & Standards** (MUST READ FIRST)
Location: `.agent/rules/`

#### `.agent/rules/rules.md` - Core Coding Standards
- **Type Safety**: NO `any` types. Use defined types from `src/types/` or `database.types.ts`
- **Server Actions**: Use for mutations. Always call `revalidatePath` after updates
- **Error Handling**: Wrap Server Actions in try-catch. Return `{ success: boolean, error?: string, data?: T }`
- **RSC First**: Default to React Server Components. Use `'use client'` only when needed
- **Supabase**: Use `createClient` from `src/lib/supabase/server.ts` for Server Components/Actions

#### `.agent/rules/ui_rules.md` - UI/UX Standards (STRICT)
- **Square Avatars**: Images in dropdowns/lists MUST use `rounded-none`
- **No Monospace Fonts**: Never use `font-mono` for UI text (only code blocks)
- **No Cropped Images**: Documentation images must be full, uncropped
- **Flow Column**: Use `UnifiedTransactionTable` as single source of truth

---

## 🏗️ Project Structure

```
money-flow-3/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # React components
│   ├── actions/                # Server Actions
│   ├── services/               # Business logic layer
│   ├── lib/                    # Utilities, Supabase clients
│   └── types/                  # TypeScript types
├── .agent/                     # Documentation & guides
│   ├── prompts/                # Agent prompts
│   ├── rules/                  # Coding standards
│   └── archive/                # Old documentation
└── supabase/migrations/        # Database migrations
```

---

## 🔑 Key Concepts

### 1. **Single Source of Truth: `transactions` Table**
- All financial data lives in the `transactions` table
- `final_price` is auto-calculated via database trigger
- `transaction_history` stores snapshots when editing

### 2. **Transaction Types**
- **Income**: Money received
- **Expense**: Money spent
- **Transfer**: Move between accounts
- **Debt**: Money lent to others
- **Repayment**: Money received back

### 3. **Unified Transaction Table**
- Component: `src/components/moneyflow/unified-transaction-table.tsx`
- **Single source of truth** for transaction display
- **Single Flow Mode**: Simple Income/Expense shows Type Badge + Category/Shop
- **Multi-Flow Mode**: Transfer/Debt shows detailed flow with FROM/TO badges

---

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev
```

### Quick Initialization (DYNAMIC PROMPTS)
When starting a new session or task, use these templates:
1. **`.agent/prompts/MASTER_CONTEXT_LOAD.md`**: Run this first to load all project context.
2. **`.agent/prompts/TASK_TEMPLATE.md`**: Fill this out to define your specific task.

### Essential Reading
1. `.agent/rules/rules.md` (coding standards)
2. `.agent/rules/ui_rules.md` (UI standards)
3. `.agent/workflows/cashback-config-guide.md` (Card configurations)
4. `.agent/AGENT_CONTEXT.md` (Current project state)

---

## 🐛 Known Issues

### iCloud Drive EPERM Error
- `npm run build` fails with EPERM error
- **Workaround**: Use dev server and TypeScript IDE checks

---

## 📖 Common Tasks

### Modifying Transaction Table
1. **ALWAYS** edit `src/components/moneyflow/unified-transaction-table.tsx`
2. **NEVER** create custom Flow UI in detail pages
3. Follow "Single Flow" logic for simple transactions

---

### 4. **Accounts & Cashback Refinement (Phase 16)**
- **Focus**: Cycle logic stabilization, unified configuration UI, and enhanced batch processing.
- **Reference**: `.agent/prompts/HANDOVER_ACCOUNTS_CASHBACK.md`

---

**Last Updated**: 2026-02-23  
**Maintained By**: Money Flow 3 Team

