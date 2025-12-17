## Error Type
Console Error

## Error Message
Error calculating account stats: {}


    at getStatsForAccount (src\services\account.service.ts:94:13)
    at <anonymous> (src\services\account.service.ts:221:19)
    at Function.all (<anonymous>:1:21)
    at getAccounts (src\services\account.service.ts:220:20)
    at Function.all (<anonymous>:1:21)
    at TransactionsPage (src\app\transactions\page.tsx:13:69)
    at TransactionsPage (<anonymous>:null:null)

## Code Frame
  92 |
  93 |   if (error) {
> 94 |     console.error('Error calculating account stats:', error)
     |             ^
  95 |     return baseStats
  96 |   }
  97 |

Next.js version: 16.0.7 (Turbopack)
## Error Type
Console Error

## Error Message
Error fetching debt accounts for people: {}


    at getPeople (src\services\people.service.ts:189:13)
    at Function.all (<anonymous>:1:21)
    at TransactionsPage (src\app\transactions\page.tsx:13:69)
    at TransactionsPage (<anonymous>:null:null)

## Code Frame
  187 |
  188 |   if (debtError) {
> 189 |     console.error('Error fetching debt accounts for people:', debtError)
      |             ^
  190 |   }
  191 |
  192 |   if (subError) {

Next.js version: 16.0.7 (Turbopack)
