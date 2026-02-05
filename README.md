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

## Current Status: Phase 15 (Feb 2026)

**Focus**: AI Intelligence & Voice (Gemini Integration)

### Phase 13 Updates (Current)
- **Batch Detail UI Redesign**:
  - ✅ Icon-based toolbar with individual tooltips (Send to Sheet, AI Import, Add Item, More Actions)
  - ✅ Step 1 (Fund) & Step 2 (Match Source) now show full text labels with icons
  - ✅ Hamburger menu moved after Add Item button for better UX
  - ✅ Compact header: removed brackets, bold badges, source account grouped
  
- **Batch Item Editing**:
  - ✅ Fixed `bank_code` schema error (excluded from batch_items update)
  - ✅ "Edit Info" button now properly shows AccountSlideV2 for target account editing
  - ✅ Auto-fill logic preserved for receiver, card name, and note
  
- **Error Handling**:
  - ✅ Added proper try-catch to all batch actions
  - ✅ Consistent response format: `{ success, error, data }`
  - ✅ User-friendly error messages via toast notifications
  
- **Network & Type Safety**:
  - ✅ Fixed ReferenceError (missing Wallet import in dashboard)
  - ✅ Fixed network errors from unhandled promise rejections
  - ✅ Updated action signatures to accept batchId for correct revalidation

### Previous Phase 12 Updates
- **Account Details Flow UI**: Implemented "Single Flow" mode for simple Income/Expense transactions
  - Removed redundant self-reference badges (e.g., "FROM Msb Online" for Cashback)
  - Display Category/Shop instead of generic "Unknown"
  - Cleaner UI with no duplicate directional badges
- **Bug Fixes**: 
  - Fixed People Details URL parameter issue
  - Fixed Account Edit Form data loading (fresh fetch strategy)
  - Fixed TypeScript errors in Single Flow mode

---

## 📚 Documentation

### For New Developers/Agents
- **Start Here**: [GEMINI.md](./GEMINI.md) - Quick context for Gemini CLI
- **Full Onboarding**: [.agent/prompts/onboarding.md](./.agent/prompts/onboarding.md) - Complete onboarding guide
- **Start Prompts**: [.agent/prompts/start_prompts.md](./.agent/prompts/start_prompts.md) - Dynamic templates for new chat sessions

### Rules & Standards
- **Coding Standards**: [.agent/rules/rules.md](./.agent/rules/rules.md)
- **UI Standards**: [.agent/rules/ui_rules.md](./.agent/rules/ui_rules.md) (STRICT)

### Current Work
- **Phase 14 Handover**: [.agent/HANDOVER_PHASE_14.md](./.agent/HANDOVER_PHASE_14.md)
- **Phase 15 Plan**: [.agent/PHASE_15_PLAN.md](./.agent/PHASE_15_PLAN.md)

---


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

### Planned: Phase 10 (Accounts Enhancements)
- **MCC Column**: Display MCC per account/transaction context.
- **Annual Fee Waiver Target**: Compute “target met” based on credit card spend rules.
- **Category Filter**: Add category dropdown to Accounts filters.

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
