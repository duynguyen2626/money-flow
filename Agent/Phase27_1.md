Runtime Error


`Tooltip` must be used within `TooltipProvider`
src/components/moneyflow/unified-transaction-table.tsx (859:25) @ renderCell


  857 |                   if (txn.type === 'transfer' || txn.type === 'debt' || txn.type === 'repayment') {
  858 |                       return (
> 859 |                         <Tooltip>
      |                         ^
  860 |                           <TooltipTrigger asChild>
  861 |                             <div className="flex items-center gap-2 cursor-help">
  862 |                               {sourceIcon}
Call Stack
21

Show 13 ignore-listed frame(s)
renderCell
src/components/moneyflow/unified-transaction-table.tsx (859:25)
<unknown>
src/components/moneyflow/unified-transaction-table.tsx (994:22)
Array.map
<anonymous>
<unknown>
src/components/moneyflow/unified-transaction-table.tsx (986:35)
Array.map
<anonymous>
UnifiedTransactionTable
src/components/moneyflow/unified-transaction-table.tsx (634:34)
FilterableTransactions
src/components/moneyflow/filterable-transactions.tsx (538:17)
TransactionsPage
src\app\transactions\page.tsx (32:11)