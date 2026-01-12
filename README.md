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

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Run development server:
   ```bash
   pnpm dev
   ```
