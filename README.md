# Money Flow 3

Money Flow 3 is a comprehensive personal finance application focused on transaction management, debt tracking, and spending analytics.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Shadcn UI
- **Database:** Supabase (PostgreSQL)
- **State/Data:** React Server Components, Server Actions

## Core Features

- **Transactions:** Income, Expense, Transfer, Debt, Repayment tracking.
- **Accounts:** Management of bank accounts, wallets, credit cards.
- **People:** Debt and shared expense tracking associated with people.
- **Cashback:** Advanced cashback calculation and tracking.
- **Services:** Subscription management.

## Current Status: UI Refactor (Jan 2026)
We are currently refactoring the core UI components to ensure strict consistency.
- **Transaction Table**: Moved to a fixed-width CSS Grid layout.
- **Image Rendering**: Strict rules for Shapes (Person=Circle, Shop=Rounded Square, Account=Original).
- **Badges**: Standardized size (24px) and positioning.
See `.agent/context/ui_standards.md` for detailed specs.

## Project Structure

- `src/app`: Page routes and layouts.
- `src/components`: UI components (moneyflow, people, etc).
- `src/lib`: Utilities and helpers.
- `src/actions`: Server actions for data mutation.
- `src/types`: TypeScript definitions.

## Recently Updated (Sprint 7)

### 1. Refund Logic Overhaul
- **Smart Account Recommendation**: The "Confirm Refund" dialog now intelligently fetches and recommends the original source account of the transaction, even if it wasn't initially loaded in the filtered list.
- **Robust Data Handling**: Fixed issues where transactions on hidden/duplicate accounts ("Test Card" vs "Card Test") caused UI failures.
- **RLS & Ownership**: Strengthened RLS policies and ownership checks for `created_by` to ensure transactions are always visible to their owners.

## Getting Started

First, install dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```

## 🚨 Development Rules (Critical)

Before committing any code, you **MUST** run the following commands to ensure quality:

```bash
# 1. Check for linting errors
npm run lint

# 2. Verify build succeeds
npm run build
```

**Do not commit if either of these fails.**
