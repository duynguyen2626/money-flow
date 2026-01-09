# Money Flow 3.0

## 💰 Split Bill Architecture (Important for Devs/Agents)

### Data Model
- **Parent Transaction (Expense)**:
  - Records the **TOTAL** bill amount (e.g., 791k) to match Bank Statement.
  - `person_id`: `null`.
  - `metadata.is_split_bill`: `true`.
  - `metadata.my_share`: The actual personal expense amount (e.g., 395k).
  - `metadata.original_total_amount`: Same as Amount.

- **Child Transactions (Debt)**:
  - Linked to Parent via `metadata.parent_transaction_id`.
  - Represent money owed by others.
  - `type`: `debt` (Lending).
  - `metadata.skip_wallet_deduction`: `true` (Future proofing balance logic).

### 📊 Reporting Logic
When calculating "My Expense" in reports:
1. Check if `is_split_bill` is true.
2. If true, use `metadata.my_share` as the expense amount.
3. If false, use `amount`.

---

> [!IMPORTANT]
> **Handover Status (Sprint 5.1):**
> Current objective: Forcing Debt Account Auto-Selection in `TransactionForm.tsx`.
> **Blocker:** Không update được Receivable accounts (Auto-pick failed). The aggressive auto-selection logic is written but awaiting successful build to verify.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
# or
bun dev
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

## Recent Updates (Phase 75 - Services Redesign & Bot)

### 1. Services UI Overhaul
- **Desktop**: New table-based layout with "All Services" and individual service tabs.
- **Mobile**: Simplified list view.
- **Modal**: redesigned "Service Details" sheet:
    - 2-column layout (Settings | People).
    - People column height constrained to Settings height.
    - Improved button styling (Outline -> Color on Hover).
    - Fixed horizontal scroll issues (max-w-4xl).

### 2. Service Bot
- **Auto-Distribution**: Configurable "Run Day" and "Run Hour".
- **Bot Logic**: Timezone-aware (GMT+7) and idempotent checks to prevent double-charging.


## Google Apps Script Commands

Push scripts to Google Apps Script (requires `.env` or prompts for Script ID):

```bash
# Push People Management Script (google-scripts/people-manage)
pnpm run sheet:people

# Push Batch Management Script (google-scripts/batch-manage)
pnpm run sheet:batch
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Money Flow 3

## Debugging Cashback
If you encounter missing cycle data or incorrect caps in the Cashback Analysis view:
1. Open `src/components/moneyflow/cashback-analysis-view.tsx`.
2. Search for `<b>Debug:</b>` near line 317.
3. Uncomment the debug `div` block.
4. Refresh and check the Red Debug Box for internal state (Tag, Opts, Net, Cap).

## Recent Updates (Phase 6)

### 1. Schema Drift Cleanup
- Removed dependency on the deprecated transaction line table.
- Aligned codebase with actual Supabase schema (Flat Transaction Model).
- Simplified `transaction.service.ts` and `transaction-actions.ts`.

### 2. Mobile UI Refinement
- **New Mobile Transaction Row**: Extracted complex mobile rendering logic to `MobileTransactionRow.tsx`.
- **Improved Header**: 2-row layout for `FilterableTransactions` (Tabs/Filter + Search/Add).
- **Sticky Footer Component**: Fixed footer visibility and added "Rows per page" selector for mobile.
- **Refund Icons**: enhancing visibility with `RefreshCcw` icon and better placement.

### 3. Pagination Logic
- Refactored `UnifiedTransactionTable` to use props-driven pagination.
- Centralized state control in `filterable-transactions.tsx`.
- Resolved "double-pagination" issues.

## Current Status (Phase 9)
- Manage Sheet settings now persist in the cycle list and header UI.
- Apps Script supports bank row toggle + QR image placement in the summary area, shifting when the bank row is shown.
- Sheet push helper supports `pnpm run sheet:push:<n>` with profile status output.
- Requires `person_cycle_sheets` table; apply migration `supabase/migrations/20251226193000_create_person_cycle_sheets.sql` to remove the PGRST205 warning and enable sheet storage.
- Sheet create/sync runs server-side via `POST /api/sheets/manage` (apps script must support `create_cycle_sheet` action).


## Recent Updates (Phase 10 - Scope 4: Split Bill & Debt)

### Scope 4.1: Split Bill UX (Completed)
- **Edit Split Bill**: Full dialog to edit amounts, participants (add/remove), and metadata.
- **Copy Combined**: Robust "Canvas-based" generation of Bill + QR image.
    - Solved `lab()` color crash in `html2canvas`.
    - High-DPI rendering (2x scale) for sharp QR codes.
    - Large text typography for better readability.
- **Cleanup**: Removed legacy `[SplitBill]` prefixes.

### Scope 4.2: Consolidated Debt Repayment (Planned)
- **Problem**: Repaying multi-month debt requires multiple transactions.
- **Solution**: "Surplus Cascading" logic.
    - Overpay in current month -> Surplus automatically "fills" older debt months.
    - UI updates to show "Settled via Surplus".

## Quick Add Chatbot (Phase 2)
- Floating Quick Add chat widget appears on Dashboard, Transactions, and People detail pages only.
- Natural language wizard with follow-up questions; always requires review/confirm.
- People detail context auto-prefills the person/group so prompts can omit the name.
- Templates stored in `quick_add_templates` with normalized name keys (lowercase).
- Temp review after Submit Now routes to `/transactions/temp-<transaction_id>` (non-persistent; refresh/close loses context).
- Template save needs RLS policies applied: `supabase/migrations/20251231130000_add_quick_add_templates_policies.sql`.
- API endpoints:
  - `POST /api/ai/parse-transaction`
  - `GET/POST /api/ai/templates`
  - `POST /api/transactions/quick-add`
  - `POST /api/bot/slack`
  - `POST /api/bot/telegram`

## Recent Updates (Phase 8 - Google Sheets Sync)
- Added per-person, per-cycle sheet creation + sync via Apps Script (`sheetScript/`) with `ensureSheet` and `syncTransactions` actions.
- Manage Sheet UI now uses a dropdown popover, saves Script/Sheet links, and shows a sync completion modal.
- Sheet formatter applies banding, formulas, summary panel, bank info, shop icon mapping, and per-row borders on sync.
- Added `sheet:push` helper with `.env`-based script ID profiles and `--force` support for faster deploys.

## Recent Updates (Phase 9 - Manage Sheet Settings)
- Fixed stale sheet settings in the cycle list (settings now flow from `getPeople()`).
- Apps Script now clears/merges the bank row based on toggle state and positions QR images in a merged summary area.
- New `pnpm run sheet:push:<n>` shortcuts for faster Apps Script deploys.

## Recent Updates (Phase 4 - Batch & Account UI)
- **Batch Import**: Fixed duplicates, added `display_name`, `sheet_name`, `bank_type` to schema and UI.
- **Account UI**: Standardized `Create` and `Edit` dialogs with full-width inputs, consistent heights, and fixed layouts for Collateral/Secured toggle.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
