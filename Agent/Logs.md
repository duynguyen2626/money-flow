## Error Type
Runtime ReferenceError

## Error Message
refundId is not defined


    at renderCell (src/components/moneyflow/unified-transaction-table.tsx:1484:67)
    at <unknown> (src/components/moneyflow/unified-transaction-table.tsx:1587:26)
    at Array.map (<anonymous>:null:null)
    at <unknown> (src/components/moneyflow/unified-transaction-table.tsx:1555:37)
    at Array.map (<anonymous>:null:null)
    at UnifiedTransactionTable (src/components/moneyflow/unified-transaction-table.tsx:809:36)

## Code Frame
  1482 |                     }
  1483 |
> 1484 |                     const isCopiedRefund = copiedId === `refund-${refundId}-${txn.id}`;
       |                                                                   ^
  1485 |
  1486 |                     return (
  1487 |                       <div className="flex items-center gap-1.5 min-w-[120px]">

Next.js version: 16.0.7 (Turbopack)
