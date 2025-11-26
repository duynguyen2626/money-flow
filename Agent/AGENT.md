AGENT TASK: EMERGENCY UI FIXES (PEOPLE PAGE & TABLE)

Context:
The Refactor caused severe UI regressions:

Missing Actions: "Add Debt" and "Settle" buttons are missing from the People Header.

Ugly Table: Shop Name dominates the Note column. Images (Category/Account) are missing.

Wrong Default: Debt transactions default to "Adjustment" instead of "Lending".

Objective:
Restore the UI polish and fix the data mapping bugs.

1. Frontend: Fix PeopleDetailPage (src/app/people/[id]/page.tsx)

A. Restore Header Actions

Location: Inside the Header Card (next to Balance or Name).

Design: Two clear buttons (Icon + Text or Tooltip).

🔴 Add Debt: Icon Plus. Variant destructive (or outline red).

🟢 Settle: Icon Check. Variant default (green).

Function: Ensure they open TransactionForm with the correct tabs (debt_lending / debt_repayment).

B. Fix Debt Cards

Ensure the Debt Cycle Cards are visible and compact.

2. Frontend: Polish UnifiedTransactionTable (src/components/moneyflow/unified-transaction-table.tsx)

A. Fix Note/Shop Column

Current: Shop Name (Big) - Note (Small).

Fix: Note (Big/Bold) - Shop Name (Small/Gray/Under).

<div className="flex flex-col">
   <span className="font-medium text-gray-900">{row.note || 'No Note'}</span>
   {row.shop_name && (
     <span className="flex items-center gap-1 text-xs text-gray-500">
       <img src={row.shop_logo} className="w-4 h-4 object-contain"/> 
       {row.shop_name}
     </span>
   )}
</div>


B. Fix Images (Category & Account)

Bug: Images are not showing.

Check: Inspect row.category.image_url and row.source_account.logo_url.

Fallback: If URL is missing, render the Emoji icon or a default lucide icon. Don't render broken image tag.

3. Logic: Fix Defaults (src/components/moneyflow/transaction-form.tsx)

Action: Update useEffect for default values.

Logic:

IF Tab == debt_lending:

Set Category = "Lending" (ID: ...89 from SQL).

Do NOT use "Adjustment".

IF Tab == debt_repayment:

Set Category = "Debt Repayment" (...96).

4. Execution Steps

Page: Move Action Buttons to People Header.

Table: Swap Note/Shop priority and fix image rendering.

Form: Hardcode the correct Category IDs for Debt tabs.

Verify: Run build.