Console Error
Server


C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\93926_51a4f394._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed
src\app\people\[id]\page.tsx (15:27) @ PeopleDetailPage


  13 |
  14 | export default async function PeopleDetailPage({ params }: { params: { id: string } }) {
> 15 |   const personId = params.id
     |                           ^
  16 |
  17 |   const [person, accounts, categories, people, shops, transactions] = await Promise.all([
  18 |     getPersonDetails(personId),
Call Stack
11

Show 9 ignore-listed frame(s)
PeopleDetailPage
src\app\people\[id]\page.tsx (15:27)
PeopleDetailPage
<anonymous>
1
2
2/3
Console Error
Server


C:\Users\nam.thanhnguyen\Github\money-flow-3\.next\dev\server\chunks\ssr\[root-of-the-server]__23aa1cd6._.js: Invalid source map. Only conformant source maps can be used to find the original code. Cause: Error: sourceMapURL could not be parsed
src\app\people\[id]\page.tsx (15:27) @ PeopleDetailPage


  13 |
  14 | export default async function PeopleDetailPage({ params }: { params: { id: string } }) {
> 15 |   const personId = params.id
     |                           ^
  16 |
  17 |   const [person, accounts, categories, people, shops, transactions] = await Promise.all([
  18 |     getPersonDetails(personId),
Call Stack
11

Show 9 ignore-listed frame(s)
PeopleDetailPage
src\app\people\[id]\page.tsx (15:27)
PeopleDetailPage
<anonymous>
3/3
Console Error
Server


Error fetching person details: {}
src\services\debt.service.ts (79:13) @ getPersonDetails


  77 |
  78 |   if (error) {
> 79 |     console.error('Error fetching person details:', error)
     |             ^
  80 |     return null
  81 |   }
  82 |
Call Stack
13

Show 9 ignore-listed frame(s)
getPersonDetails
src\services\debt.service.ts (79:13)
Function.all
<anonymous>
PeopleDetailPage
src\app\people\[id]\page.tsx (17:71)
PeopleDetailPage
<anonymous>