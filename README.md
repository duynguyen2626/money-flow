This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
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
- Removed dependency on deprecated `transaction_lines` table.
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

## Current Status (Phase 7)
- People directory + detail UI refresh is in progress with per-cycle "Manage Sheet" support.
- Requires `person_cycle_sheets` table; apply migration `supabase/migrations/20251226193000_create_person_cycle_sheets.sql` to remove the PGRST205 warning and enable sheet storage.
- Sheet create/sync runs server-side via `POST /api/sheets/manage` (apps script must support `create_cycle_sheet` action).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
