## Error Type
Console Error

## Error Message
PocketBase request failed [400] /api/collections/transactions/records: {"data":{},"message":"Something went wrong while processing your request.","status":400}



    at pocketbaseRequest (src\services\pocketbase\server.ts:98:11)
    at loadPocketBaseTransactions (src\services\pocketbase\account-details.service.ts:540:20)
    at loadTransactions (src\services\transaction.service.ts:507:20)
    at Function.all (<anonymous>:1:21)
    at TransactionsPage (src\app\transactions\page.tsx:18:69)
    at TransactionsPage (<anonymous>:null:null)

## Code Frame
   96 |   if (!response.ok) {
   97 |     const text = await response.text()
>  98 |     throw new Error(`PocketBase request failed [${response.status}] ${path}: ${text}`)
      |           ^
   99 |   }
  100 |
  101 |   if (response.status === 204) {

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\[root-of-the-server]__d285ef3f._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed


    at loadTransactions (src\services\transaction.service.ts:512:13)
    at Function.all (<anonymous>:1:21)
    at TransactionsPage (src\app\transactions\page.tsx:18:69)
    at TransactionsPage (<anonymous>:null:null)

## Code Frame
  510 |     }
  511 |   } catch (err) {
> 512 |     console.error('[DB:PB] transactions.list failed:', err)
      |             ^
  513 |   }
  514 |
  515 |   console.log('[DB:SB] transactions.select', options)

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\[root-of-the-server]__971dc319._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed


    at loadTransactions (src\services\transaction.service.ts:512:13)
    at Function.all (<anonymous>:1:21)
    at TransactionsPage (src\app\transactions\page.tsx:18:69)
    at TransactionsPage (<anonymous>:null:null)

## Code Frame
  510 |     }
  511 |   } catch (err) {
> 512 |     console.error('[DB:PB] transactions.list failed:', err)
      |             ^
  513 |   }
  514 |
  515 |   console.log('[DB:SB] transactions.select', options)

Next.js version: 16.0.10 (Turbopack)
