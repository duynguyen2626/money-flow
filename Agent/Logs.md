## Error Type
Console Error

## Error Message
Error fetching transactions for account: {}


    at fetchTransactions (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/services/account.service.ts:393:13)
    at Promise.all (<anonymous>:1:20)
    at RefundsPage (../../../../Mobile Documents/com~apple~CloudDocs/Github Nov25/money-flow-3/src/app/refunds/page.tsx:14:63)
    at RefundsPage (<anonymous>:null:null)

## Code Frame
  391 |
  392 |   if (error) {
> 393 |     console.error('Error fetching transactions for account:', {
      |             ^
  394 |       accountId,
  395 |       message: error?.message ?? 'unknown error',
  396 |       code: error?.code,

Next.js version: 16.0.7 (Turbopack)
