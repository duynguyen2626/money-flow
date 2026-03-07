## Error Type
Console Error

## Error Message
PocketBase request failed [400] /api/collections/cashback_cycles/records: {"data":{},"message":"Something went wrong while processing your request.","status":400}



    at pocketbaseRequest (src\services\pocketbase\server.ts:98:11)
    at getPocketBaseAccounts (src\services\pocketbase\account-details.service.ts:207:24)
    at getAccounts (src\services\account.service.ts:280:24)
    at Function.all (<anonymous>:1:21)
    at Home (src\app\page.tsx:34:56)
    at Home (<anonymous>:null:null)

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


    at getAccounts (src\services\account.service.ts:285:13)
    at Function.all (<anonymous>:1:21)
    at Home (src\app\page.tsx:34:56)
    at Home (<anonymous>:null:null)

## Code Frame
  283 |     }
  284 |   } catch (err) {
> 285 |     console.error('[DB:PB] accounts.list failed:', err)
      |             ^
  286 |   }
  287 |
  288 |   console.log('[DB:SB] accounts.select')

Next.js version: 16.0.10 (Turbopack)
## Error Type
Console Error

## Error Message
C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\[root-of-the-server]__7cfccef6._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed


    at getAccounts (src\services\account.service.ts:285:13)
    at Function.all (<anonymous>:1:21)
    at Home (src\app\page.tsx:34:56)
    at Home (<anonymous>:null:null)

## Code Frame
  283 |     }
  284 |   } catch (err) {
> 285 |     console.error('[DB:PB] accounts.list failed:', err)
      |             ^
  286 |   }
  287 |
  288 |   console.log('[DB:SB] accounts.select')

Next.js version: 16.0.10 (Turbopack)
