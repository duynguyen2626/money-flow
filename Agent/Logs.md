Terminal
 ○ Compiling /transactions ...
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_3515b189._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed
 ⨯ Error: `Tooltip` must be used within `TooltipProvider`
    at useContext2 (C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_3515b189._.js:11361:19)   
    at Tooltip (C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_3515b189._.js:15828:29) {     
  digest: '3204686871'
}
 GET /transactions 500 in 19.3s (compile: 16.8s, render: 2.5s)
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_3515b189._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed
 ⨯ Error: `Tooltip` must be used within `TooltipProvider`
    at useContext2 (C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_3515b189._.js:11361:19)   
    at Tooltip (C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_3515b189._.js:15828:29) {     
  digest: '3204686871'
}
 GET /transactions 500 in 755ms (compile: 19ms, render: 736ms)



Console:

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