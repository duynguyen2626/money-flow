D:\Github\money-flow-3\.next\dev\server\chunks\ssr\node_modules_473cc24e._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed
src\app\accounts\[id]\page.tsx (28:50) @ AccountPage


  26 |
  27 | export default async function AccountPage({ params }: PageProps) {
> 28 |   const account = await getAccountDetails(params.id)
     |                                                  ^
  29 |
  30 |   if (!account) {
  31 |     return (
Call Stack
11

Show 9 ignore-listed frame(s)
AccountPage
src\app\accounts\[id]\page.tsx (28:50)
AccountPage
<anonymous>
1
2


D:\Github\money-flow-3\.next\dev\server\chunks\ssr\[root-of-the-server]__42cb2b01._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed
src\app\accounts\[id]\page.tsx (28:50) @ AccountPage


  26 |
  27 | export default async function AccountPage({ params }: PageProps) {
> 28 |   const account = await getAccountDetails(params.id)
     |                                                  ^
  29 |
  30 |   if (!account) {
  31 |     return (
Call Stack
11

Show 9 ignore-listed frame(s)
AccountPage
src\app\accounts\[id]\page.tsx (28:50)
AccountPage
<anonymous>
1
2

Console Error
Server


Error fetching account details: {}
src\services\account.service.ts (66:13) @ getAccountDetails


  64 |
  65 |   if (error || !data) {
> 66 |     console.error('Error fetching account details:', error)
     |             ^
  67 |     return null
  68 |   }
  69 |
Call Stack
12

Show 9 ignore-listed frame(s)
getAccountDetails
src\services\account.service.ts (66:13)
AccountPage
src\app\accounts\[id]\page.tsx (28:19)
AccountPage
<anonymous>