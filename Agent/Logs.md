1/5
Console Error
Server


Error fetching transaction lines: {}
src\services\account.service.ts (321:15) @ fetchTransactions


  319 |     let transactionIds: string[] = []
  320 |     if (lineQuery.error) {
> 321 |       console.error('Error fetching transaction lines:', {
      |               ^
  322 |         accountId,
  323 |         message: lineQuery.error.message ?? 'unknown error',
  324 |         code: lineQuery.error.code,
Call Stack
13

Show 9 ignore-listed frame(s)
fetchTransactions
src\services\account.service.ts (321:15)
Function.all
<anonymous>
PeopleDetailPage
src\app\people\[id]\page.tsx (38:9)
PeopleDetailPage
<anonymous>
2/5
Console Error
Server


Error fetching transactions via fallback: {}
src\services\account.service.ts (409:15) @ fetchTransactions


  407 |
  408 |     if (fallbackError) {
> 409 |       console.error('Error fetching transactions via fallback:', {
      |               ^
  410 |         accountId,
  411 |         message: fallbackError?.message ?? 'unknown error',
  412 |         code: fallbackError?.code,
Call Stack
13

Show 9 ignore-listed frame(s)
fetchTransactions
src\services\account.service.ts (409:15)
Function.all
<anonymous>
PeopleDetailPage
src\app\people\[id]\page.tsx (38:9)
PeopleDetailPage
<anonymous>

3/5
Console Error
Server


Error fetching transaction details for account: {}
src\services\account.service.ts (511:13) @ getAccountTransactionDetails


  509 |
  510 |   if (error) {
> 511 |     console.error('Error fetching transaction details for account:', {
      |             ^
  512 |       accountId,
  513 |       message: error?.message ?? 'unknown error',
  514 |       code: error?.code,
Call Stack
13

Show 9 ignore-listed frame(s)
getAccountTransactionDetails
src\services\account.service.ts (511:13)
Function.all
<anonymous>
AccountPage
src\app\accounts\[id]\page.tsx (74:50)
AccountPage
<anonymous>

4/5
 Error fetching transaction lines: {}
src\services\account.service.ts (321:15) @ fetchTransactions


  319 |     let transactionIds: string[] = []
  320 |     if (lineQuery.error) {
> 321 |       console.error('Error fetching transaction lines:', {
      |               ^
  322 |         accountId,
  323 |         message: lineQuery.error.message ?? 'unknown error',
  324 |         code: lineQuery.error.code,
Call Stack
13

Show 9 ignore-listed frame(s)
fetchTransactions
src\services\account.service.ts (321:15)
Function.all
<anonymous>
AccountPage
src\app\accounts\[id]\page.tsx (74:50)
AccountPage
<anonymous>
5/5
Error fetching transactions via fallback: {}
src\services\account.service.ts (409:15) @ fetchTransactions


  407 |
  408 |     if (fallbackError) {
> 409 |       console.error('Error fetching transactions via fallback:', {
      |               ^
  410 |         accountId,
  411 |         message: fallbackError?.message ?? 'unknown error',
  412 |         code: fallbackError?.code,
Call Stack
13

Show 9 ignore-listed frame(s)
fetchTransactions
src\services\account.service.ts (409:15)
Function.all
<anonymous>
AccountPage
src\app\accounts\[id]\page.tsx (74:50)
AccountPage
<anonymous>