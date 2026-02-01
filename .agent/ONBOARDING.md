# Money Flow 3 - Agent Onboarding Guide

> **Purpose**: This is the master onboarding document for any new AI agent or developer joining the Money Flow 3 project. Read this FIRST before starting any work.

---

## 🎯 Project Overview

**Name**: Money Flow 3  
**Type**: Personal Finance Management Application  
**Tech Stack**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Supabase (PostgreSQL)  
**Status**: Active Development (Phase 12)

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

#### `.agent/rules/sheet_sync_rules.md` - Google Sheets Integration
- Rules for syncing transactions with Google Sheets

### 2. **Architecture & Context**
Location: `.agent/context/`

Read these to understand the system architecture and business logic.

### 3. **Current Documentation**
Location: `.agent/`

- **`README.md`**: Project overview and quick start
- **`HANDOVER_PHASE_12.md`**: Latest handover from Phase 11 → Phase 12
- **`PHASE_12_PLAN.md`**: Current phase priorities (critical bugs)
- **`PHASE_13_PLAN.md`**: Future enhancements plan

---

## 🏗️ Project Structure

```
money-flow-3/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── accounts/           # Accounts management
│   │   ├── people/             # People/Debt management
│   │   ├── transactions/       # Transaction views
│   │   ├── services/           # Recurring services
│   │   ├── batch/              # Batch import
│   │   └── api/                # API routes
│   ├── components/             # React components
│   │   ├── ui/                 # Shadcn UI components
│   │   ├── accounts/           # Account-specific components
│   │   ├── people/             # People-specific components
│   │   ├── moneyflow/          # Transaction components
│   │   └── transaction/        # Transaction Slide V2
│   ├── actions/                # Server Actions
│   ├── services/               # Business logic layer
│   ├── lib/                    # Utilities, helpers, Supabase clients
│   └── types/                  # TypeScript types
├── .agent/                     # Documentation & guides
│   ├── rules/                  # Coding standards (READ FIRST)
│   ├── context/                # Architecture docs
│   ├── task/                   # Task breakdowns
│   ├── workflows/              # Common workflows
│   └── archive/                # Old documentation
└── supabase/
    └── migrations/             # Database migrations
```

---

## 🔑 Key Concepts

### 1. **Single Source of Truth: `transactions` Table**
- All financial data lives in the `transactions` table
- `final_price` is auto-calculated via database trigger (Amount + Cashback/Discount)
- `transaction_history` table stores snapshots when editing

### 2. **Transaction Types**
- **Income**: Money received
- **Expense**: Money spent
- **Transfer**: Move between accounts
- **Debt**: Money lent to others
- **Repayment**: Money received back from debts

### 3. **Refund Flow (V2)**
- **Flow**: Original (GD1) → Request (GD2) → Confirm (GD3)
- **Constraints**: DELETE must follow LIFO order (3 → 2 → 1)
- **Icons**: GD1=`Undo2`, GD2=`Clock`, GD3=`Check`

### 4. **Cashback Tracking**
- Credit cards have `cashback_config` with rules
- Tracks "Missing for Min Spend" and "Potential Cashback"
- Billing cycles calculated from `statement_day`

### 5. **People/Debts**
- Managed via `person_id` in `transactions` table
- NO virtual debt accounts (legacy approach)

### 6. **Unified Transaction Table**
- Component: `src/components/moneyflow/unified-transaction-table.tsx`
- **Single source of truth** for transaction display
- **Single Flow Mode**: For simple Income/Expense, shows only Type Badge + Category/Shop (no FROM/TO badges)
- **Multi-Flow Mode**: For Transfer/Debt, shows detailed flow with FROM/TO badges

---

## 🚀 Getting Started

### Step 1: Environment Setup
```bash
# Clone the repo (if not already)
git clone https://github.com/rei6868/money-flow-3.git
cd money-flow-3

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in Supabase credentials

# Run dev server
npm run dev
```

### Step 2: Read the Rules
1. Read `.agent/rules/rules.md` (coding standards)
2. Read `.agent/rules/ui_rules.md` (UI standards)
3. Read `.agent/rules/sheet_sync_rules.md` (if working on Sheets integration)

### Step 3: Understand Current State
1. Read `.agent/HANDOVER_PHASE_12.md` (latest handover)
2. Read `.agent/PHASE_12_PLAN.md` (current priorities)
3. Check `.agent/task/` for specific task breakdowns

### Step 4: Explore the Codebase
1. Start with `src/app/` to understand page structure
2. Check `src/components/moneyflow/unified-transaction-table.tsx` (core component)
3. Review `src/services/` for business logic
4. Check `src/types/` for type definitions

---

## 🧪 Development Workflow

### Before Starting Work
1. **Create a new branch**: `git checkout -b feature/your-feature-name`
2. **Read relevant docs**: Check `.agent/` for context
3. **Understand the task**: Review task breakdown in `.agent/task/`

### During Development
1. **Follow coding standards**: Reference `.agent/rules/`
2. **Use TypeScript**: NO `any` types
3. **Test as you go**: Use dev server (`npm run dev`)
4. **Commit often**: Use descriptive commit messages

### Before Committing
```bash
# Verify TypeScript (build will fail due to iCloud Drive EPERM, but syntax check works)
# Just ensure dev server runs without errors

# Check git status
git status

# Add changes
git add -A

# Commit with descriptive message
git commit -m "feat: your feature description"

# Push to remote
git push origin your-branch-name
```

### Quality Gates
- ✅ Dev server runs without errors
- ✅ No TypeScript errors in IDE
- ✅ Follows UI rules (square avatars, no monospace fonts, etc.)
- ✅ Server Actions have error handling
- ✅ Types are properly defined

---

## 🐛 Known Issues & Limitations

### iCloud Drive EPERM Error
- **Issue**: `npm run build` fails with EPERM error on `node_modules`
- **Cause**: Project is in iCloud Drive folder
- **Workaround**: Rely on dev server and TypeScript IDE checks
- **Status**: Known limitation, does not affect development

### Build Verification
- Cannot run `npm run build` due to iCloud issue
- Use `npm run dev` and IDE TypeScript errors instead
- CI/CD on GitHub Actions will verify builds

---

## 📖 Common Tasks

### Adding a New Transaction Type
1. Update `src/types/moneyflow.types.ts`
2. Modify `src/components/transaction/slide-v2/transaction-slide-v2.tsx`
3. Update `src/services/transaction.service.ts`
4. Test thoroughly

### Modifying the Transaction Table
1. **ALWAYS** edit `src/components/moneyflow/unified-transaction-table.tsx`
2. **NEVER** create custom Flow UI in detail pages
3. Follow "Single Flow" logic for simple transactions
4. Test on both main `/transactions` page and detail pages

### Adding a New Page
1. Create in `src/app/[page-name]/page.tsx`
2. Use React Server Components by default
3. Fetch data using Server Actions or direct Supabase calls
4. Follow existing page patterns

---

## 🎓 Learning Resources

### Internal Documentation
- `.agent/guide.md` - User guide for Transaction Slide V2
- `.agent/handover.md` - General handover guide
- `.agent/context/` - Architecture and domain logic

### External Resources
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Shadcn UI](https://ui.shadcn.com/)
- [Supabase Docs](https://supabase.com/docs)
- [React Hook Form](https://react-hook-form.com/)

---

## 🆘 Getting Help

### When Stuck
1. **Check documentation**: `.agent/` directory
2. **Review code comments**: Inline comments explain complex logic
3. **Check git history**: `git log` for context on recent changes
4. **Read handover docs**: `.agent/HANDOVER_PHASE_*.md`

### Common Questions
- **"Where is the transaction display logic?"** → `src/components/moneyflow/unified-transaction-table.tsx`
- **"How do I add a new field to transactions?"** → Update schema in `src/types/`, modify Slide V2, update service layer
- **"Why is build failing?"** → iCloud Drive EPERM issue (known limitation)
- **"What are the UI rules?"** → `.agent/rules/ui_rules.md`

---

## ✅ Checklist for New Agents

Before starting work, ensure you have:
- [ ] Read `.agent/rules/rules.md` (coding standards)
- [ ] Read `.agent/rules/ui_rules.md` (UI standards)
- [ ] Read `.agent/HANDOVER_PHASE_12.md` (current state)
- [ ] Read `.agent/PHASE_12_PLAN.md` (current priorities)
- [ ] Explored the codebase structure
- [ ] Set up dev environment (`npm run dev` works)
- [ ] Understand the "Single Source of Truth" concept
- [ ] Know where to find transaction display logic
- [ ] Understand the refund flow
- [ ] Created a new branch for your work

---

## 📝 Summary

**Money Flow 3** is a personal finance app built with Next.js 15, TypeScript, and Supabase. The core principle is **Single Source of Truth** - all financial data lives in the `transactions` table. The UI follows strict standards (square avatars, no monospace fonts, clean flow display). Always read the rules first, understand the current phase priorities, and follow the established patterns.

**Current Phase**: Phase 12 - Critical bug fixes (Category badges, Auto-transactions)  
**Next Phase**: Phase 13 - UI enhancements (People page, Batch page, Recent nav)

Good luck! 🚀

---

**Last Updated**: 2026-02-01  
**Version**: 12.0  
**Maintained By**: Money Flow 3 Team
