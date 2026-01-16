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

## Recently Updated (Jan 2026)

### Phase 3: Batch UI & Installments
- **Smart Installment Modal**: New dialog to pay installments directly from Batch items. Auto-calculates remaining balance and periods.
- **Batch Workflow**: Added numbered badges (1: Fund, 2: Match) to guide users through the batch funding process.
- **UI Refinements**: Improved clone loading state, fixed "Rendering" bugs, and standardized bank icon mapping (`MBB`/`VIB`).
- **CI/CD**: Relaxed lint rules to ensure smoother Vercel deployments while maintaining code quality locally.

### Planned: Phase 4 (Accounts Refactor)
- **Filter Tabs**: Redesigning into Credit / Account / Savings / Debt.
- **Card Design**: Modernizing account cards with better image handling and visual hierarchy.
- **Sorting**: Priority on Due Date and Spend Need.

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
# 2. Verify build succeeds
npm run build
```

## Google Apps Script

To deploy changes to the People Management Sheet script:

```bash
npm run sheet:people
# or
pnpm push sheet people
```

**Do not commit if either of these fails.**
